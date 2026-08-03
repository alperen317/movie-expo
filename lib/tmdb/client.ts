import { TMDB_ACCESS_TOKEN, TMDB_BASE_URL } from './config';
import i18n from '../i18n';

// A request that never settles is worse than one that fails: the caller's
// spinner spins forever with no way to retry. Cap it, then give the request one
// more chance -- flaky mobile connections and TMDB's occasional 5xx/429 are
// both usually gone by the next attempt.
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 600;
// TMDB's Retry-After is in seconds and can be long; waiting it out would look
// identical to a hang, so anything past this falls back to the fixed delay.
const MAX_RETRY_AFTER_MS = 5_000;

// TMDB expects an ISO 639-1 (optionally region-qualified) language tag. Map the
// app's active UI language to it so titles, overviews, genre names, and
// biographies come back in the same language as the rest of the UI. TMDB falls
// back to English automatically for any field that lacks a translation.
function activeTmdbLanguage(): string {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The only abort this module issues is its own timeout, so an AbortError here
// always means the deadline passed rather than a caller cancelling.
function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

// 429 is a rate limit and 5xx is TMDB having a bad moment; both are worth one
// retry. A 4xx is a bug in the request and would fail identically every time.
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryDelayFor(response: Response): number {
  const header = response.headers.get('retry-after');
  const seconds = header ? Number(header) : Number.NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return RETRY_DELAY_MS;
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  if (!TMDB_ACCESS_TOKEN) {
    throw new Error(
      'Missing EXPO_PUBLIC_TMDB_ACCESS_TOKEN. Add it to your .env file and restart Expo.',
    );
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  // Default to the active language; an explicit `language` in params still wins.
  url.searchParams.set('language', activeTmdbLanguage());
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));

  // Loops until it returns or throws; every path out of the body is terminal on
  // the last attempt.
  for (let attempt = 1; ; attempt++) {
    const isLastAttempt = attempt >= MAX_ATTEMPTS;
    let response: Response;

    try {
      response = await fetchWithTimeout(url.toString());
    } catch (error) {
      if (isLastAttempt) {
        // Screens render these messages verbatim, so the timeout gets a
        // localized one rather than the platform's "Aborted".
        throw isTimeout(error) ? new Error(i18n.t('common.requestTimedOut')) : error;
      }
      await delay(RETRY_DELAY_MS);
      continue;
    }

    if (response.ok) return response.json() as Promise<T>;

    if (isRetryableStatus(response.status) && !isLastAttempt) {
      await delay(retryDelayFor(response));
      continue;
    }

    throw new Error(`TMDB request failed: ${response.status} ${response.statusText}`);
  }
}
