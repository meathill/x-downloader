import assert from 'node:assert/strict';
import test from 'node:test';
import { signPayload, verifyPayloadSignature } from '../lib/internal-auth.ts';

const SECRET = '0123456789abcdef';
const TIMESTAMP = '1760000000000';
const BODY = JSON.stringify({ id: 123, status: 'running' });

test('verifyPayloadSignature: 正确签名可以通过', async () => {
  const signature = await signPayload(SECRET, TIMESTAMP, BODY);

  const result = await verifyPayloadSignature(
    SECRET,
    {
      timestamp: TIMESTAMP,
      signature,
    },
    BODY,
    Number.parseInt(TIMESTAMP, 10),
  );

  assert.deepEqual(result, { ok: true });
});

test('verifyPayloadSignature: 签名错误会被拒绝', async () => {
  const result = await verifyPayloadSignature(
    SECRET,
    {
      timestamp: TIMESTAMP,
      signature: 'v1=deadbeef',
    },
    BODY,
    Number.parseInt(TIMESTAMP, 10),
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('期望签名校验失败');
  }
  assert.equal(result.status, 401);
});

test('verifyPayloadSignature: 过期签名会被拒绝', async () => {
  const signature = await signPayload(SECRET, TIMESTAMP, BODY);

  const result = await verifyPayloadSignature(
    SECRET,
    {
      timestamp: TIMESTAMP,
      signature,
    },
    BODY,
    Number.parseInt(TIMESTAMP, 10) + 10 * 60 * 1000,
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('期望签名过期');
  }
  assert.equal(result.status, 401);
});
