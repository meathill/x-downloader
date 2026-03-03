import { getD1Database, getInternalCallbackSecret } from '../../../../../../lib/cloudflare-bindings';
import { jsonNoStore } from '../../../../../../lib/http';
import { parseJobStartPayload } from '../../../../../../lib/internal-payload';
import { readInternalAuthHeaders, verifyPayloadSignature } from '../../../../../../lib/internal-auth';
import { findJobById, markJobRunning } from '../../../../../../lib/jobs-repository';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id: idParam } = await context.params;
  const id = Number.parseInt(idParam, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return jsonNoStore({ ok: false, message: '任务 ID 不正确。' }, { status: 400 });
  }

  const secret = await getInternalCallbackSecret();
  if (!secret) {
    return jsonNoStore({ ok: false, message: '服务未配置内部签名密钥。' }, { status: 503 });
  }

  const rawBody = await request.text();
  const verifyResult = await verifyPayloadSignature(secret, readInternalAuthHeaders(request), rawBody);

  if (!verifyResult.ok) {
    return jsonNoStore({ ok: false, message: verifyResult.message }, { status: verifyResult.status });
  }

  const parsed = parseJson(rawBody);
  const payload = parseJobStartPayload(parsed);
  if (!payload) {
    return jsonNoStore({ ok: false, message: '回调数据格式不正确。' }, { status: 400 });
  }

  const db = await getD1Database();
  if (!db) {
    return jsonNoStore({ ok: false, message: '服务未配置 D1。' }, { status: 503 });
  }

  const job = await findJobById(db, id);
  if (!job) {
    return jsonNoStore({ ok: false, message: '任务不存在。' }, { status: 404 });
  }

  if (job.status === 'running') {
    return jsonNoStore({ ok: true, message: '任务已在运行中。', task: { id: job.id, status: job.status } });
  }

  if (job.status !== 'queued') {
    return jsonNoStore(
      {
        ok: false,
        message: `任务当前状态为 ${job.status}，不能进入 running。`,
      },
      { status: 409 },
    );
  }

  const startedAt = payload.startedAt ?? Date.now();
  const marked = await markJobRunning(db, id, payload.workerId, startedAt);
  if (!marked) {
    return jsonNoStore(
      {
        ok: false,
        message: '任务状态已变化，请重试。',
      },
      { status: 409 },
    );
  }

  return jsonNoStore(
    {
      ok: true,
      message: '任务已更新为 running。',
      task: { id, status: 'running', workerId: payload.workerId, startedAt },
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
