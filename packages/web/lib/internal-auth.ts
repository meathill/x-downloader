const SIGNATURE_VERSION_PREFIX = 'v1=';
const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000;

export type InternalAuthHeaders = {
  timestamp: string | null;
  signature: string | null;
};

export type VerificationResult = { ok: true } | { ok: false; message: string; status: number };

export async function signPayload(secret: string, timestamp: string, payload: string): Promise<string> {
  const material = `${timestamp}.${payload}`;
  const bytes = await hmacSha256(secret, material);
  return `${SIGNATURE_VERSION_PREFIX}${toHex(bytes)}`;
}

export async function verifyPayloadSignature(
  secret: string,
  headers: InternalAuthHeaders,
  payload: string,
  nowMs = Date.now(),
  maxSkewMs = DEFAULT_MAX_SKEW_MS,
): Promise<VerificationResult> {
  const timestamp = parseTimestamp(headers.timestamp);
  if (timestamp === null) {
    return { ok: false, message: '缺少或非法的时间戳。', status: 401 };
  }

  const signature = headers.signature;
  if (!signature || !signature.startsWith(SIGNATURE_VERSION_PREFIX)) {
    return { ok: false, message: '缺少或非法的签名。', status: 401 };
  }

  if (Math.abs(nowMs - timestamp) > maxSkewMs) {
    return { ok: false, message: '签名已过期。', status: 401 };
  }

  const expected = await signPayload(secret, headers.timestamp!, payload);
  const matched = timingSafeEqual(expected, signature);
  if (!matched) {
    return { ok: false, message: '签名校验失败。', status: 401 };
  }

  return { ok: true };
}

export function readInternalAuthHeaders(request: Request): InternalAuthHeaders {
  return {
    timestamp: request.headers.get('x-xdown-timestamp'),
    signature: request.headers.get('x-xdown-signature'),
  };
}

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function hmacSha256(secret: string, value: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return new Uint8Array(signature);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }

  return diff === 0;
}
