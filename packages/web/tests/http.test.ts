import assert from 'node:assert/strict';
import test from 'node:test';
import { applyNoStoreHeaders, jsonNoStore } from '../lib/http.ts';

test('applyNoStoreHeaders: 写入 no-store 响应头', () => {
  const headers = new Headers();
  applyNoStoreHeaders(headers);

  assert.equal(headers.get('Cache-Control'), 'no-store, max-age=0');
  assert.equal(headers.get('Pragma'), 'no-cache');
});

test('jsonNoStore: 返回 no-store JSON 响应', async () => {
  const response = jsonNoStore({ ok: true }, { status: 201 });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('Cache-Control'), 'no-store, max-age=0');
  assert.equal(response.headers.get('Pragma'), 'no-cache');
  assert.deepEqual(await response.json(), { ok: true });
});
