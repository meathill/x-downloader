import { getCloudflareContext } from '@opennextjs/cloudflare';
import { jsonNoStore } from '../../../../lib/http';
import { deleteJob, findJobById } from '../../../../lib/jobs-repository';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
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

  if (job.status === 'running') {
    return jsonNoStore({ ok: false, message: '任务正在处理中，无法删除。' }, { status: 409 });
  }

  let r2Deleted = false;
  if (job.r2_key) {
    const bucket = env.JOB_FILES;
    if (bucket) {
      try {
        await bucket.delete(job.r2_key);
        r2Deleted = true;
      } catch (error) {
        const detail = error instanceof Error ? error.message : '未知错误';
        return jsonNoStore(
          {
            ok: false,
            message: `删除 R2 对象失败：${detail}`,
          },
          { status: 502 },
        );
      }
    }
  }

  const removed = await deleteJob(db, id);
  if (!removed) {
    return jsonNoStore({ ok: false, message: '任务已被其他请求处理。' }, { status: 409 });
  }

  return jsonNoStore(
    {
      ok: true,
      message: r2Deleted ? '任务记录与 R2 对象已删除。' : '任务记录已删除。',
      r2Deleted,
    },
    { status: 200 },
  );
}
