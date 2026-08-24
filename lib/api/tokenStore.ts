import { rememberAwareAuthStorage } from './authStorage';

// Everything the client needs to authenticate a request and know when to
// refresh, kept under one storage key rather than three -- there is never a
// reason to read or write one field without the others.
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

const TOKENS_KEY = 'previously.session';

// A synchronous, in-memory mirror of what's in rememberAwareAuthStorage.
// Every authenticated request reads this rather than awaiting AsyncStorage,
// which would otherwise add a round trip to every single call. loadTokens()
// primes it once at startup; saveTokens/clearTokens keep it in sync after.
let cached: StoredTokens | null = null;

export async function loadTokens(): Promise<StoredTokens | null> {
  const raw = await rememberAwareAuthStorage.getItem(TOKENS_KEY);
  cached = raw ? (JSON.parse(raw) as StoredTokens) : null;
  return cached;
}

export function currentTokens(): StoredTokens | null {
  return cached;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  cached = tokens;
  await rememberAwareAuthStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  cached = null;
  await rememberAwareAuthStorage.removeItem(TOKENS_KEY);
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Dependency-free base64url decode (no atob/Buffer assumed available across
// Hermes/web) -- same call the codebase already made for avatar generation
// rather than pulling in a package for a few lines of math.
function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of normalized) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

// Reads the `sub` claim straight out of the token, no signature check --
// purely for "is this me" UI decisions (e.g. "added by me" in a shared
// list). The server independently verifies the signature on every request,
// so nothing security-relevant depends on this being tamper-proof. Standard
// claims only (sub is a GUID), so the byte-per-char decode is safe.
export function decodeUserId(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(base64UrlDecode(payload)) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}
