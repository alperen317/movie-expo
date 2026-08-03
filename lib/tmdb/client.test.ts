import { tmdbFetch } from './client';

jest.mock('./config', () => ({
  TMDB_BASE_URL: 'https://api.themoviedb.org/3',
  TMDB_ACCESS_TOKEN: 'test-token',
}));

jest.mock('../i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key, language: 'en' },
}));

function ok(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

function failure(status: number, retryAfter?: string): Response {
  return {
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: (name: string) => (name === 'retry-after' ? (retryAfter ?? null) : null) },
    json: async () => ({}),
  } as unknown as Response;
}

// Rejects only once the timeout fires and aborts the signal, standing in for a
// connection that accepts the request and then goes quiet.
function hang(_url: string, init: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('tmdbFetch', () => {
  it('returns the parsed body and sends the auth header and active language', async () => {
    fetchMock.mockResolvedValue(ok({ id: 1 }));

    await expect(tmdbFetch('/movie/1')).resolves.toEqual({ id: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/movie/1');
    expect(url).toContain('language=en-US');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('keeps an explicit language param over the UI language', async () => {
    fetchMock.mockResolvedValue(ok({}));

    await tmdbFetch('/movie/1', { language: 'de-DE' });

    expect(fetchMock.mock.calls[0][0]).toContain('language=de-DE');
  });

  it('retries a 500 once and resolves with the second response', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(failure(500)).mockResolvedValueOnce(ok({ id: 2 }));

    const promise = tmdbFetch('/movie/2');
    await jest.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toEqual({ id: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('waits out a 429 Retry-After before retrying', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(failure(429, '2')).mockResolvedValueOnce(ok({ id: 3 }));

    const promise = tmdbFetch('/movie/3');

    await jest.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1_000);
    await expect(promise).resolves.toEqual({ id: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 404', async () => {
    fetchMock.mockResolvedValue(failure(404));

    await expect(tmdbFetch('/movie/404')).rejects.toThrow('TMDB request failed: 404');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a network failure and rethrows it when the retry fails too', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    const promise = tmdbFetch('/movie/5');
    const assertion = expect(promise).rejects.toThrow('Network request failed');
    await jest.advanceTimersByTimeAsync(600);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts a hanging request and reports it as a timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(hang);

    const promise = tmdbFetch('/movie/6');
    const assertion = expect(promise).rejects.toThrow('common.requestTimedOut');

    // First deadline, the retry delay, then the second deadline.
    await jest.advanceTimersByTimeAsync(10_000);
    await jest.advanceTimersByTimeAsync(600);
    await jest.advanceTimersByTimeAsync(10_000);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('tmdbFetch caching', () => {
  // Every path below is unique across the whole file: the cache is a module
  // singleton that outlives individual tests, so a reused path would read a
  // stale entry left by an earlier test instead of exercising this one.

  it('serves a repeat request for the same URL from cache', async () => {
    fetchMock.mockResolvedValue(ok({ id: 100 }));

    await tmdbFetch('/movie/100');
    await expect(tmdbFetch('/movie/100')).resolves.toEqual({ id: 100 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent requests for the same URL into a single fetch', async () => {
    fetchMock.mockResolvedValue(ok({ id: 101 }));

    const [a, b] = await Promise.all([tmdbFetch('/movie/101'), tmdbFetch('/movie/101')]);

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once the cache entry expires', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue(ok({ id: 102 }));

    await tmdbFetch('/movie/102');
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);
    await tmdbFetch('/movie/102');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never caches a failed request', async () => {
    fetchMock.mockResolvedValueOnce(failure(404)).mockResolvedValueOnce(ok({ id: 103 }));

    await expect(tmdbFetch('/movie/103')).rejects.toThrow();
    await expect(tmdbFetch('/movie/103')).resolves.toEqual({ id: 103 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keys the cache by the full URL, not just the path', async () => {
    fetchMock.mockResolvedValueOnce(ok({ page: 1 })).mockResolvedValueOnce(ok({ page: 2 }));

    await expect(tmdbFetch('/movie/104', { page: '1' })).resolves.toEqual({ page: 1 });
    await expect(tmdbFetch('/movie/104', { page: '2' })).resolves.toEqual({ page: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
