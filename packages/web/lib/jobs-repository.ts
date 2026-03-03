import type { D1Database, D1RunResult } from './cloudflare-bindings';

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

export type DownloadJob = {
  id: number;
  request_id: string;
  url: string;
  filename: string | null;
  format: string | null;
  status: JobStatus;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  finished_at: number | null;
  error: string | null;
  log_excerpt: string | null;
  r2_key: string | null;
  r2_url: string | null;
  worker_id: string | null;
};

export type NewJobInput = {
  requestId: string;
  url: string;
  filename?: string;
  format?: string;
  now: number;
};

export type CompletionInput = {
  id: number;
  workerId?: string;
  success: boolean;
  error?: string;
  finishedAt: number;
  logExcerpt?: string;
  r2Key?: string;
  r2Url?: string;
};

export async function findJobById(db: D1Database, id: number): Promise<DownloadJob | null> {
  return await db
    .prepare(
      `SELECT id, request_id, url, filename, format, status, created_at, updated_at, started_at, finished_at,
              error, log_excerpt, r2_key, r2_url, worker_id
       FROM jobs
       WHERE id = ?`,
    )
    .bind(id)
    .first<DownloadJob>();
}

export async function findLatestJobByUrl(db: D1Database, url: string): Promise<DownloadJob | null> {
  return await db
    .prepare(
      `SELECT id, request_id, url, filename, format, status, created_at, updated_at, started_at, finished_at,
              error, log_excerpt, r2_key, r2_url, worker_id
       FROM jobs
       WHERE url = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(url)
    .first<DownloadJob>();
}

export async function listJobs(db: D1Database, limit: number): Promise<DownloadJob[]> {
  const result = await db
    .prepare(
      `SELECT id, request_id, url, filename, format, status, created_at, updated_at, started_at, finished_at,
              error, log_excerpt, r2_key, r2_url, worker_id
       FROM jobs
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<DownloadJob>();

  return result.results;
}

export async function createQueuedJob(db: D1Database, input: NewJobInput): Promise<DownloadJob> {
  await db
    .prepare(
      `INSERT INTO jobs (
        request_id,
        url,
        filename,
        format,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'queued', ?, ?)`,
    )
    .bind(input.requestId, input.url, input.filename ?? null, input.format ?? null, input.now, input.now)
    .run();

  return await requireJobByRequestId(db, input.requestId);
}

export async function requeueFailedJob(
  db: D1Database,
  id: number,
  input: Omit<NewJobInput, 'requestId' | 'url'>,
): Promise<DownloadJob | null> {
  const result = await db
    .prepare(
      `UPDATE jobs
       SET status = 'queued',
           filename = ?,
           format = ?,
           updated_at = ?,
           started_at = NULL,
           finished_at = NULL,
           error = NULL,
           log_excerpt = NULL,
           r2_key = NULL,
           r2_url = NULL,
           worker_id = NULL
       WHERE id = ? AND status = 'failed'`,
    )
    .bind(input.filename ?? null, input.format ?? null, input.now, id)
    .run();

  if (readChangeCount(result) === 0) {
    return null;
  }

  return await findJobById(db, id);
}

export async function markJobEnqueueFailed(
  db: D1Database,
  id: number,
  errorMessage: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE jobs
       SET status = 'failed',
           error = ?,
           finished_at = ?,
           updated_at = ?
       WHERE id = ? AND status = 'queued'`,
    )
    .bind(errorMessage, now, now, id)
    .run();
}

export async function markJobRunning(
  db: D1Database,
  id: number,
  workerId: string,
  startedAt: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE jobs
       SET status = 'running',
           worker_id = ?,
           started_at = ?,
           updated_at = ?
       WHERE id = ? AND status = 'queued'`,
    )
    .bind(workerId, startedAt, startedAt, id)
    .run();

  return readChangeCount(result) > 0;
}

export async function completeJob(db: D1Database, input: CompletionInput): Promise<boolean> {
  const nextStatus: JobStatus = input.success ? 'done' : 'failed';

  const result = await db
    .prepare(
      `UPDATE jobs
       SET status = ?,
           worker_id = COALESCE(?, worker_id),
           finished_at = ?,
           updated_at = ?,
           error = ?,
           log_excerpt = ?,
           r2_key = ?,
           r2_url = ?
       WHERE id = ?
         AND status IN ('queued', 'running')`,
    )
    .bind(
      nextStatus,
      input.workerId ?? null,
      input.finishedAt,
      input.finishedAt,
      input.success ? null : normalizeOptionalText(input.error),
      normalizeOptionalText(input.logExcerpt),
      input.success ? normalizeOptionalText(input.r2Key) : null,
      input.success ? normalizeOptionalText(input.r2Url) : null,
      input.id,
    )
    .run();

  return readChangeCount(result) > 0;
}

export async function deleteJob(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare('DELETE FROM jobs WHERE id = ?').bind(id).run();
  return readChangeCount(result) > 0;
}

async function requireJobByRequestId(db: D1Database, requestId: string): Promise<DownloadJob> {
  const job = await db
    .prepare(
      `SELECT id, request_id, url, filename, format, status, created_at, updated_at, started_at, finished_at,
              error, log_excerpt, r2_key, r2_url, worker_id
       FROM jobs
       WHERE request_id = ?`,
    )
    .bind(requestId)
    .first<DownloadJob>();

  if (!job) {
    throw new Error('任务写入成功，但读取任务失败。请重试。');
  }

  return job;
}

function readChangeCount(result: D1RunResult): number {
  if (!result.meta) {
    return result.success ? 1 : 0;
  }

  return typeof result.meta.changes === 'number' ? result.meta.changes : 0;
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
