import assert from 'node:assert/strict';
import test from 'node:test';
import { createJobMessage, parseJobMessage, JOB_MESSAGE_VERSION } from '../lib/job-message.ts';

test('createJobMessage: 生成版本化消息', () => {
  const message = createJobMessage({
    id: 7,
    request_id: 'req-1',
    url: 'https://x.com/user/status/1',
    filename: 'demo.mp4',
    format: 'best',
    status: 'queued',
    created_at: 100,
    updated_at: 100,
    started_at: null,
    finished_at: null,
    error: null,
    log_excerpt: null,
    r2_key: null,
    r2_url: null,
    worker_id: null,
  });

  assert.equal(message.version, JOB_MESSAGE_VERSION);
  assert.equal(message.jobId, 7);
  assert.equal(message.requestId, 'req-1');
});

test('parseJobMessage: 合法消息可解析', () => {
  const parsed = parseJobMessage({
    version: JOB_MESSAGE_VERSION,
    jobId: 9,
    requestId: 'req-2',
    url: 'https://x.com/user/status/2',
    filename: 'demo.mp4',
    createdAt: 101,
  });

  assert.ok(parsed);
  assert.equal(parsed?.jobId, 9);
});

test('parseJobMessage: 非法消息返回 null', () => {
  assert.equal(
    parseJobMessage({
      version: JOB_MESSAGE_VERSION,
      jobId: 0,
      requestId: '',
      url: '',
      createdAt: 0,
    }),
    null,
  );
});
