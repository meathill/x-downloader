import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJobCompletePayload, parseJobStartPayload } from '../lib/internal-payload.ts';

test('parseJobStartPayload: 合法数据通过', () => {
  const payload = parseJobStartPayload({ workerId: 'worker-1', startedAt: 123 });
  assert.ok(payload);
  assert.equal(payload?.workerId, 'worker-1');
});

test('parseJobStartPayload: 缺少 workerId 时失败', () => {
  const payload = parseJobStartPayload({ startedAt: 123 });
  assert.equal(payload, null);
});

test('parseJobCompletePayload: success=true 且包含 r2 信息', () => {
  const payload = parseJobCompletePayload({
    success: true,
    workerId: 'worker-2',
    finishedAt: 123,
    r2Key: 'x/a.mp4',
    r2Url: 'https://files.example.com/x/a.mp4',
  });

  assert.ok(payload);
  assert.equal(payload?.success, true);
  assert.equal(payload?.workerId, 'worker-2');
});

test('parseJobCompletePayload: 非法类型返回 null', () => {
  const payload = parseJobCompletePayload({ success: 'yes' });
  assert.equal(payload, null);
});
