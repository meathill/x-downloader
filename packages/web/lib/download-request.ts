import path from 'node:path';

export type DownloadRequest = {
  url: string;
  filename?: string;
  format?: string;
};

export type NormalizedDownloadRequest = {
  url: string;
  filename?: string;
  format?: string;
};

type ValidationResult = { ok: true; value: NormalizedDownloadRequest } | { ok: false; message: string };

const ALLOWED_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'm.twitter.com',
  't.co',
]);

export function normalizeDownloadRequest(request: DownloadRequest): ValidationResult {
  const url = request.url.trim();
  if (url.length === 0) {
    return { ok: false, message: '请输入视频链接。' };
  }

  const parsedUrl = parseUrl(url);
  if (!parsedUrl) {
    return { ok: false, message: '链接格式不正确，请使用 http(s) 开头的链接。' };
  }

  if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    return { ok: false, message: '仅支持 x.com 或 twitter.com 的链接。' };
  }

  if (request.filename) {
    const filename = request.filename.trim();
    if (filename.length === 0) {
      return { ok: false, message: '文件名不能为空。' };
    }

    if (path.basename(filename) !== filename) {
      return { ok: false, message: '文件名不能包含路径。' };
    }
  }

  if (request.format !== undefined && request.format.trim().length === 0) {
    return { ok: false, message: '格式不能为空。' };
  }

  return {
    ok: true,
    value: {
      url,
      filename: request.filename ? request.filename.trim() : undefined,
      format: request.format ? request.format.trim() : undefined,
    },
  };
}

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
