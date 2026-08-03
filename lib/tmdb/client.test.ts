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
