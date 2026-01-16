import type { DownloadRequest, DownloadResult } from "./download";
import { downloadVideo, normalizeDownloadRequest } from "./download";
import { getDatabase, type DownloadStatus } from "./db";

export type QueueResult = {
  accepted: boolean;
  message: string;
  taskId?: number;
  status?: DownloadStatus;
  httpStatus: number;
};

export function enqueueDownload(request: DownloadRequest): QueueResult {
  const normalized = normalizeDownloadRequest(request);
  if (!normalized.ok) {
    return { accepted: false, message: normalized.message, httpStatus: 400 };
  }

  const db = getDatabase();
  const now = Date.now();
  const existing = db
    .prepare("SELECT id, status FROM downloads WHERE url = ?")
    .get(normalized.value.url) as { id: number; status: DownloadStatus } | undefined;

  if (!existing) {
    const result = db
      .prepare(
        "INSERT INTO downloads (url, filename, format, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        normalized.value.url,
        normalized.value.filename ?? null,
        normalized.value.format ?? null,
        "queued",
        now,
        now
      );

    return {
      accepted: true,
      message: "任务已入队，将依次下载。",
      taskId: Number(result.lastInsertRowid),
      status: "queued",
      httpStatus: 200
    };
  }

  if (existing.status === "failed") {
    db.prepare(
      "UPDATE downloads SET status = ?, filename = ?, format = ?, output_path = NULL, updated_at = ?, error = NULL, logs = NULL WHERE id = ?"
    ).run(
      "queued",
      normalized.value.filename ?? null,
      normalized.value.format ?? null,
      now,
      existing.id
    );

    return {
      accepted: true,
      message: "任务已重新入队。",
      taskId: existing.id,
      status: "queued",
      httpStatus: 200
    };
  }

  const message =
    existing.status === "done"
      ? "该链接已下载过，如需重新下载请清理记录。"
      : "该链接已在队列中。";

  return {
    accepted: false,
    message,
    taskId: existing.id,
    status: existing.status,
    httpStatus: 200
  };
}

export function startQueueProcessing(): void {
  const state = getQueueState();
  if (state.running) {
    state.pending = true;
    return;
  }

  state.running = true;
  state.pending = false;
  state.current = runQueue().finally(() => {
    state.running = false;
    state.current = undefined;
    if (state.pending) {
      queueMicrotask(() => {
        startQueueProcessing();
      });
    }
  });
}

type QueueState = {
  running: boolean;
  current?: Promise<void>;
  pending: boolean;
};

function getQueueState(): QueueState {
  const globalStore = globalThis as { __xDownloaderQueue?: QueueState };
  if (!globalStore.__xDownloaderQueue) {
    globalStore.__xDownloaderQueue = { running: false, pending: false };
  }
  return globalStore.__xDownloaderQueue;
}

async function runQueue(): Promise<void> {
  while (true) {
    const task = takeNextTask();
    if (!task) {
      return;
    }

    const result = await safeDownload({
      url: task.url,
      filename: task.filename ?? undefined,
      format: task.format ?? undefined
    });

    finalizeTask(task.id, result);
  }
}

type StoredTask = {
  id: number;
  url: string;
  filename: string | null;
  format: string | null;
};

function takeNextTask(): StoredTask | null {
  const db = getDatabase();
  const now = Date.now();

  return db.transaction(() => {
    const task = db
      .prepare("SELECT id, url, filename, format FROM downloads WHERE status = 'queued' ORDER BY created_at LIMIT 1")
      .get() as StoredTask | undefined;

    if (!task) {
      return null;
    }

    const updated = db
      .prepare("UPDATE downloads SET status = ?, started_at = ?, updated_at = ? WHERE id = ? AND status = 'queued'")
      .run("running", now, now, task.id);

    if (updated.changes === 0) {
      return null;
    }

    return task;
  })();
}

function finalizeTask(taskId: number, result: DownloadResult): void {
  const db = getDatabase();
  const now = Date.now();
  const logs = truncateLogs(result.logs);
  const outputPath = result.ok ? result.outputPath ?? null : null;

  db.prepare(
    "UPDATE downloads SET status = ?, finished_at = ?, updated_at = ?, error = ?, logs = ?, output_path = ? WHERE id = ?"
  ).run(
    result.ok ? "done" : "failed",
    now,
    now,
    result.ok ? null : result.message,
    logs,
    outputPath,
    taskId
  );
}

async function safeDownload(request: DownloadRequest): Promise<DownloadResult> {
  try {
    return await downloadVideo(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "下载过程中发生未知错误。";
    return { ok: false, message, logs: [] };
  }
}

function truncateLogs(logs: string[], limit = 12000): string | null {
  if (logs.length === 0) {
    return null;
  }

  const joined = logs.join("");
  if (joined.length <= limit) {
    return joined;
  }

  return joined.slice(joined.length - limit);
}
