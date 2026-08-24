import { API_BASE_URL } from './config';
import { clearTokens, currentTokens, saveTokens, StoredTokens } from './tokenStore';
import i18n from '../i18n';

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  /** The server's `error` code from a domain failure (409/404 bodies), when present. */
  code?: string;
  /** Field -> messages, from a 400 ValidationProblem body. */
  fieldErrors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; fieldErrors?: Record<string, string[]> },
  ) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.fieldErrors = options?.fieldErrors;
  }
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/**
 * Notified when a refresh attempt fails after a 401 -- the one signal the
 * client layer sends "upward". `auth.store.ts` subscribes in `initialize()`
 * to clear its own state; this module never imports the store itself, so
 * there's no import cycle between the two.
 */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

let refreshInFlight: Promise<StoredTokens | null> | null = null;

async function tryRefresh(): Promise<StoredTokens | null> {
  if (refreshInFlight) return refreshInFlight;

  const tokens = currentTokens();
  if (!tokens?.refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        accessToken: string;
        expiresAt: string;
        refreshToken: string;
      };
      const next: StoredTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiresAt: data.expiresAt,
      };
      await saveTokens(next);
      return next;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Returns a token good enough to use right now, refreshing first if the
 * stored one is at or near its 15-minute expiry. Used by the SignalR
 * connection (which needs a valid token *before* it can connect, unlike a
 * REST call that can react to a 401 after the fact).
 */
export async function ensureValidToken(): Promise<string | null> {
  const tokens = currentTokens();
  if (!tokens) return null;

  const expiresAt = new Date(tokens.accessTokenExpiresAt).getTime();
  const skewMs = 30_000;
  if (Number.isFinite(expiresAt) && expiresAt - skewMs > Date.now()) {
    return tokens.accessToken;
  }

  const refreshed = await tryRefresh();
  return refreshed?.accessToken ?? null;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (response.ok) return data as T;

  if (response.status === 429) {
    throw new ApiError(429, 'Too many requests. Try again in a few minutes.');
  }

  if (data && typeof data === 'object') {
    const body = data as { error?: unknown; message?: unknown; title?: unknown; errors?: unknown };

    // Domain failure: {"error": "invalid_code", "message": "..."}.
    if (typeof body.error === 'string') {
      throw new ApiError(response.status, String(body.message ?? body.error), {
        code: body.error,
      });
    }

    // ASP.NET ValidationProblem: {"title": "...", "errors": {"field": ["..."]}}.
    if (body.errors && typeof body.errors === 'object') {
      throw new ApiError(
        response.status,
        typeof body.title === 'string' ? body.title : 'Validation failed.',
        { fieldErrors: body.errors as Record<string, string[]> },
      );
    }

    if (typeof body.message === 'string') {
      throw new ApiError(response.status, body.message);
    }
  }

  throw new ApiError(response.status, `Request failed with status ${response.status}.`);
}

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function send<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query);
  const tokens = currentTokens();
  const hadToken = Boolean(tokens?.accessToken);

  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (hadToken) headers.authorization = `Bearer ${tokens!.accessToken}`;

  const init: RequestInit = {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  };

  let response: Response;
  try {
    response = await fetchWithTimeout(url, init);
  } catch (error) {
    throw isTimeout(error) ? new ApiError(0, i18n.t('common.requestTimedOut')) : error;
  }

  // A 401 only means "the access token is stale" when one was actually sent
  // -- an anonymous call (login, register, ...) failing with 401 is a plain
  // domain failure (invalid_credentials), not a session that needs refreshing.
  if (response.status === 401 && hadToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.authorization = `Bearer ${refreshed.accessToken}`;
      response = await fetchWithTimeout(url, { ...init, headers });
    } else {
      await clearTokens();
      sessionExpiredListeners.forEach((listener) => listener());
    }
  }

  return parseResponse<T>(response);
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => send<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: RequestOptions['query']) =>
    send<T>('POST', path, { body, query }),
  put: <T>(path: string, body?: unknown, query?: RequestOptions['query']) =>
    send<T>('PUT', path, { body, query }),
  delete: <T>(path: string, body?: unknown, query?: RequestOptions['query']) =>
    send<T>('DELETE', path, { body, query }),
};
