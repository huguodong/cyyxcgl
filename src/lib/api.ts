function resolveUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(resolveUrl(url), {
    credentials: 'same-origin',
    ...options,
  });
}

export function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (
    input: RequestInfo | URL,
    init: RequestInit = {}
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isApiCall = url.startsWith('/api/') || url.startsWith('./api/');

    if (!isApiCall) {
      return originalFetch(input, init);
    }

    const resolvedInput: RequestInfo | URL =
      typeof input === 'string'
        ? resolveUrl(input)
        : input instanceof URL
          ? new URL(resolveUrl(input.href))
          : new Request(resolveUrl(input.url), input);

    return originalFetch(resolvedInput, {
      credentials: 'same-origin',
      ...init,
    });
  };
}
