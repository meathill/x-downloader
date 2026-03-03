import { getCloudflareContext } from '@opennextjs/cloudflare';
import { jsonNoStore } from '../../../../../../lib/http';
import { parseJobCompletePayload } from '../../../../../../lib/internal-payload';
import { readInternalAuthHeaders, verifyPayloadSignature } from '../../../../../../lib/internal-auth';
import { completeJob, findJobById } from '../../../../../../lib/jobs-repository';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id: idParam } = await context.params;
  const id = Number.parseInt(idParam, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return jsonNoStore({ ok: false, message: '任务 ID 不正确。' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const secret = env.XDOWN_INTERNAL_SECRET;
  if (!secret) {
    return jsonNoStore({ ok: false, message: '服务未配置内部签名密钥。' }, { status: 503 });
  }

  const rawBody = await request.text();
  const verifyResult = await verifyPayloadSignature(secret, readInternalAuthHeaders(request), rawBody);

  if (!verifyResult.ok) {
    return jsonNoStore({ ok: false, message: verifyResult.message }, { status: verifyResult.status });
  }

  const parsed = parseJson(rawBody);
  const payload = parseJobCompletePayload(parsed);
  if (!payload) {
    return jsonNoStore({ ok: false, message: '回调数据格式不正确。' }, { status: 400 });
  }

  const db = env.DB;
  if (!db) {
    return jsonNoStore({ ok: false, message: '服务未配置 D1。' }, { status: 503 });
  }

  const job = await findJobById(db, id);
  if (!job) {
    return jsonNoStore({ ok: false, message: '任务不存在。' }, { status: 404 });
  }

  if (job.status === 'canceled') {
    return jsonNoStore({ ok: false, message: '任务已取消，不接受回调。' }, { status: 409 });
  }

  if (job.status === 'done' && payload.success) {
    return jsonNoStore({ ok: true, message: '任务已完成（幂等回调）。', task: { id, status: 'done' } });
  }

  const finishedAt = payload.finishedAt ?? Date.now();
  const updated = await completeJob(db, {
    id,
    workerId: payload.workerId,
    success: payload.success,
    error: payload.error,
    logExcerpt: payload.logExcerpt,
    r2Key: payload.r2Key,
    r2Url: payload.r2Url,
    finishedAt,
  });

  if (!updated) {
    return jsonNoStore(
      {
        ok: false,
        message: '任务状态已变化，未能完成写回。',
      },
      { status: 409 },
    );
  }

  return jsonNoStore(
    {
      ok: true,
      message: payload.success ? '任务已标记为完成。' : '任务已标记为失败。',
      task: {
        id,
        status: payload.success ? 'done' : 'failed',
        finishedAt,
      },
    },
    { status: 200 },
  );
}

function parseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}
