import assert from 'node:assert/strict';
import test from 'node:test';
import { JOB_MESSAGE_VERSION, parseJobMessage } from '../src/job-message.ts';

test('parseJobMessage: 合法消息返回结构化结果', () => {
  const parsed = parseJobMessage({
    version: JOB_MESSAGE_VERSION,
    jobId: 1,
    requestId: 'req-1',
    url: 'https://x.com/user/status/1',
    createdAt: 100,
  });

  assert.ok(parsed);
  assert.equal(parsed?.jobId, 1);
});

test('parseJobMessage: 非法消息返回 null', () => {
  const parsed = parseJobMessage({
    version: 999,
    jobId: '1',
    requestId: 1,
    url: '',
    createdAt: 0,
  });

  assert.equal(parsed, null);
});
