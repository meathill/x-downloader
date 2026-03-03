const NO_STORE_VALUE = 'no-store, max-age=0';

export function applyNoStoreHeaders(headers: Headers): void {
  headers.set('Cache-Control', NO_STORE_VALUE);
  headers.set('Pragma', 'no-cache');
}

export function createNoStoreHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  applyNoStoreHeaders(headers);
  return headers;
}

export function jsonNoStore(body: unknown, init: ResponseInit = {}): Response {
  const headers = createNoStoreHeaders(init.headers);
  return Response.json(body, { ...init, headers });
}
