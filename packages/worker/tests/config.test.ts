import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.ts';

const BASE_ENV: NodeJS.ProcessEnv = {
  CF_API_TOKEN: 'token',
  CF_ACCOUNT_ID: 'account',
  CF_QUEUE_ID: 'queue',
  XDOWN_WEB_BASE_URL: 'https://example.com',
  XDOWN_INTERNAL_SECRET: '0123456789abcdef',
  XDOWN_R2_BUCKET: 'bucket',
  XDOWN_R2_ACCESS_KEY_ID: 'key',
  XDOWN_R2_SECRET_ACCESS_KEY: 'secret',
  XDOWN_R2_ACCOUNT_ID: 'account',
};

test('loadConfig: 基础环境变量可解析', () => {
  const config = loadConfig(BASE_ENV);
  assert.equal(config.queueId, 'queue');
  assert.equal(config.r2Endpoint, 'https://account.r2.cloudflarestorage.com');
  assert.equal(config.webBaseUrl, 'https://example.com');
});

test('loadConfig: 缺少必填变量时抛错', () => {
  assert.throws(() => {
    loadConfig({ ...BASE_ENV, CF_API_TOKEN: undefined });
  }, /CF_API_TOKEN/);
});
