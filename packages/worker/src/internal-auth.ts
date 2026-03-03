const PREFIX = 'v1=';

export async function signPayload(secret: string, payload: string, timestamp: string): Promise<string> {
  const value = `${timestamp}.${payload}`;
  const bytes = await hmacSha256(secret, value);
  return `${PREFIX}${toHex(bytes)}`;
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
