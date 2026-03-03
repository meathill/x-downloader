import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDownloadRequest } from '../lib/download-request.ts';

test('normalizeDownloadRequest: 接受 x.com 链接并裁剪参数', () => {
  const result = normalizeDownloadRequest({
    url: '  https://x.com/user/status/123  ',
    filename: '  demo.mp4  ',
    format: '  best  ',
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail(result.message);
  }

  assert.equal(result.value.url, 'https://x.com/user/status/123');
  assert.equal(result.value.filename, 'demo.mp4');
  assert.equal(result.value.format, 'best');
});

test('normalizeDownloadRequest: 拒绝空链接', () => {
  const result = normalizeDownloadRequest({ url: '   ' });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('期望校验失败');
  }

  assert.equal(result.message, '请输入视频链接。');
});

test('normalizeDownloadRequest: 拒绝非 http(s) 链接', () => {
  const result = normalizeDownloadRequest({ url: 'ftp://x.com/user/status/123' });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('期望校验失败');
  }

  assert.equal(result.message, '链接格式不正确，请使用 http(s) 开头的链接。');
});

test('normalizeDownloadRequest: 拒绝非白名单域名', () => {
  const result = normalizeDownloadRequest({ url: 'https://example.com/video' });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('期望校验失败');
  }

  assert.equal(result.message, '仅支持 x.com 或 twitter.com 的链接。');
});

test('normalizeDownloadRequest: 拒绝包含路径的文件名', () => {
  const result = normalizeDownloadRequest({
    url: 'https://x.com/user/status/123',
    filename: '../secret.mp4',
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('期望校验失败');
  }

  assert.equal(result.message, '文件名不能包含路径。');
});

test('normalizeDownloadRequest: 拒绝空格式', () => {
  const result = normalizeDownloadRequest({
    url: 'https://x.com/user/status/123',
    format: '   ',
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('期望校验失败');
  }

  assert.equal(result.message, '格式不能为空。');
});
