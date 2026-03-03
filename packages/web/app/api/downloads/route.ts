import { getD1Database } from '../../../lib/cloudflare-bindings';
import { jsonNoStore } from '../../../lib/http';
import { listJobs } from '../../../lib/jobs-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const db = await getD1Database();
  if (!db) {
    return jsonNoStore({ ok: false, message: '服务未配置 D1。' }, { status: 503 });
  }

  const url = new URL(request.url);
  const limit = normalizeLimit(url.searchParams.get('limit'));
  const items = await listJobs(db, limit);

  return jsonNoStore({ ok: true, items }, { status: 200 });
}

function normalizeLimit(value: string | null): number {
  if (!value) {
    return 50;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 200);
}
