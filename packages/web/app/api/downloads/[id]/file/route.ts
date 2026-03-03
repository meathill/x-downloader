import { getCloudflareContext } from '@opennextjs/cloudflare';
import { applyNoStoreHeaders, jsonNoStore } from '../../../../../lib/http';
import { findJobById } from '../../../../../lib/jobs-repository';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id: idParam } = await context.params;
  const id = Number.parseInt(idParam, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return jsonNoStore({ ok: false, message: '任务 ID 不正确。' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const db = env.DB;
  if (!db) {
    return jsonNoStore({ ok: false, message: '服务未配置 D1。' }, { status: 503 });
  }

  const job = await findJobById(db, id);
  if (!job) {
    return jsonNoStore({ ok: false, message: '任务不存在。' }, { status: 404 });
  }

  if (job.status !== 'done') {
    return jsonNoStore({ ok: false, message: '任务未完成，无法下载。' }, { status: 409 });
  }

  const redirectUrl = await resolveDownloadUrl(job.r2_url, job.r2_key);
  if (!redirectUrl) {
    return jsonNoStore({ ok: false, message: '任务未记录可下载地址。' }, { status: 404 });
  }

  const response = Response.redirect(redirectUrl, 302);
  applyNoStoreHeaders(response.headers);
  return response;
}

async function resolveDownloadUrl(storedUrl: string | null, key: string | null): Promise<string | null> {
  if (storedUrl) {
    return storedUrl;
  }

  if (!key) {
    return null;
  }

  const { env } = getCloudflareContext();
  const publicBase = env.NEXT_PUBLIC_FILE_PUBLIC_URL;
  if (!publicBase) {
    return null;
  }

  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${publicBase}/${encodedKey}`;
}
