import { getCloudflareContext } from '@opennextjs/cloudflare';
import { normalizeDownloadRequest } from '../../../lib/download-request';
import { jsonNoStore } from '../../../lib/http';
import { createJobMessage, type DownloadJobMessage } from '../../../lib/job-message';
import {
  createQueuedJob,
  findLatestJobByUrl,
  markJobEnqueueFailed,
  requeueFailedJob,
  type DownloadJob,
} from '../../../lib/jobs-repository';
import { enqueueJob } from '../../../lib/queue-producer';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return jsonNoStore({ ok: true, message: 'x-downloader api' }, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return jsonNoStore({ ok: false, message: '请求体不正确。' }, { status: 400 });
  }

  const normalized = normalizeDownloadRequest({
    url: typeof body.url === 'string' ? body.url : '',
    filename: typeof body.filename === 'string' ? body.filename : undefined,
    format: typeof body.format === 'string' ? body.format : undefined,
  });

  if (!normalized.ok) {
    return jsonNoStore({ ok: false, message: normalized.message }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const db = env.DB;
  if (!db) {
    return jsonNoStore({ ok: false, message: '服务未配置 D1。' }, { status: 503 });
  }

  const queue = env.DOWNLOAD_QUEUE;
  if (!queue) {
    return jsonNoStore({ ok: false, message: '服务未配置 DOWNLOAD_QUEUE。' }, { status: 503 });
  }

  const now = Date.now();
  const existing = await findLatestJobByUrl(db, normalized.value.url);

  const job = await prepareJob(db, existing, {
    url: normalized.value.url,
    filename: normalized.value.filename,
    format: normalized.value.format,
    now,
  });

  if (!job.accepted) {
    return jsonNoStore(
      {
        ok: true,
        accepted: false,
        message: job.message,
        task: { id: job.job.id, status: job.job.status },
      },
      { status: 200 },
    );
  }

  try {
    await enqueueJob(queue, job.job);
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    await markJobEnqueueFailed(db, job.job.id, `入队失败：${detail}`, Date.now());

    return jsonNoStore(
      {
        ok: false,
        accepted: false,
        message: '任务写入成功但入队失败，请稍后重试。',
        task: { id: job.job.id, status: 'failed' },
      },
      { status: 503 },
    );
  }

  const message = createJobMessage(job.job);

  return jsonNoStore(
    {
      ok: true,
      accepted: true,
      message: job.message,
      task: {
        id: job.job.id,
        status: job.job.status,
        requestId: job.job.request_id,
        queueMessageVersion: message.version,
      },
    },
    { status: 200 },
  );
}

type PreparedResult = {
  accepted: boolean;
  message: string;
  job: DownloadJob;
};

type PrepareInput = {
  url: string;
  filename?: string;
  format?: string;
  now: number;
};

async function prepareJob(db: D1Database, existing: DownloadJob | null, input: PrepareInput): Promise<PreparedResult> {
  if (!existing) {
    const created = await createQueuedJob(db, {
      requestId: crypto.randomUUID(),
      url: input.url,
      filename: input.filename,
      format: input.format,
      now: input.now,
    });

    return {
      accepted: true,
      message: '任务已入队，将由执行 worker 处理。',
      job: created,
    };
  }

  if (existing.status === 'failed') {
    const retried = await requeueFailedJob(db, existing.id, {
      filename: input.filename,
      format: input.format,
      now: input.now,
    });

    if (retried) {
      return {
        accepted: true,
        message: '失败任务已重新入队。',
        job: retried,
      };
    }
  }

  if (existing.status === 'done') {
    return {
      accepted: false,
      message: '该链接已处理完成，如需重跑请先删除任务记录。',
      job: existing,
    };
  }

  if (existing.status === 'running') {
    return {
      accepted: false,
      message: '该链接正在处理中。',
      job: existing,
    };
  }

  return {
    accepted: false,
    message: '该链接已在队列中。',
    job: existing,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
