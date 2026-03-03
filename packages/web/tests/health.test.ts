import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHealthReport } from '../lib/health.ts';

const FIXED_DATE = new Date('2026-03-02T12:00:00.000Z');

test('buildHealthReport: 关键绑定齐全时返回 ok=true', async () => {
  const report = await buildHealthReport({
    now: () => FIXED_DATE,
    getBindings: async () => ({
      DB: {
        prepare: () => ({
          bind: () => {
            throw new Error('测试桩不会调用 bind');
          },
          first: async () => ({ ok: 1 }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      },
      DOWNLOAD_QUEUE: {
        send: async () => undefined,
      },
      XDOWN_INTERNAL_SECRET: '0123456789abcdef',
      XDOWN_R2_PUBLIC_URL: 'https://files.example.com',
    }),
  });

  assert.equal(report.ok, true);
  assert.equal(report.timestamp, FIXED_DATE.toISOString());
  assert.equal(report.checks.length, 4);
  assert.equal(
    report.checks.every((check) => check.status === 'pass'),
    true,
  );
});

test('buildHealthReport: 缺少 D1 时返回失败', async () => {
  const report = await buildHealthReport({
    getBindings: async () => ({
      DOWNLOAD_QUEUE: {
        send: async () => undefined,
      },
      XDOWN_INTERNAL_SECRET: '0123456789abcdef',
    }),
  });

  assert.equal(report.ok, false);
  const d1 = report.checks.find((check) => check.name === 'd1');
  assert.ok(d1);
  assert.equal(d1.status, 'fail');
});

test('buildHealthReport: 缺少回调密钥时返回失败', async () => {
  const report = await buildHealthReport({
    getBindings: async () => ({
      DB: {
        prepare: () => ({
          bind: () => {
            throw new Error('测试桩不会调用 bind');
          },
          first: async () => ({ ok: 1 }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      },
      DOWNLOAD_QUEUE: {
        send: async () => undefined,
      },
    }),
  });

  assert.equal(report.ok, false);
  const secretCheck = report.checks.find((check) => check.name === 'internal_secret');
  assert.ok(secretCheck);
  assert.equal(secretCheck.status, 'fail');
});

test('buildHealthReport: 未配置 R2 公网地址时返回 warn 但整体可用', async () => {
  const report = await buildHealthReport({
    getBindings: async () => ({
      DB: {
        prepare: () => ({
          bind: () => {
            throw new Error('测试桩不会调用 bind');
          },
          first: async () => ({ ok: 1 }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      },
      DOWNLOAD_QUEUE: {
        send: async () => undefined,
      },
      XDOWN_INTERNAL_SECRET: '0123456789abcdef',
    }),
  });

  assert.equal(report.ok, true);
  const r2Check = report.checks.find((check) => check.name === 'r2_public_url');
  assert.ok(r2Check);
  assert.equal(r2Check.status, 'warn');
});
