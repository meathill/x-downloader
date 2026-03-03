import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config';
import { downloadFromX } from './downloader';
import { parseJobMessage } from './job-message';
import { QueueClient, type QueueMessageEnvelope } from './queue-client';
import { R2Uploader } from './r2';
import { WebCallbackClient } from './web-callback';

async function main(): Promise<void> {
  const config = loadConfig();
  const queue = new QueueClient(config);
  const uploader = new R2Uploader(config);
  const callback = new WebCallbackClient(config);
  const once = process.argv.includes('--once');

  console.log(`[worker] 启动，workerId=${config.workerId}，once=${once}`);

  while (true) {
    const messages = await queue.pull();

    if (messages.length === 0) {
      if (once) {
        console.log('[worker] 无待处理消息，退出。');
        return;
      }

      await sleep(config.pollIntervalMs);
      continue;
    }

    for (const message of messages) {
      try {
        await processMessage(message, {
          queue,
          uploader,
          callback,
          outputDir: config.outputDir,
          workerId: config.workerId,
        });
      } catch (error) {
        const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
        console.error(`[worker] 消息 ${message.id} 处理异常，将等待队列重试。\\n${detail}`);
      }
    }

    if (once) {
      return;
    }
  }
}

type ProcessDependencies = {
  queue: QueueClient;
  uploader: R2Uploader;
  callback: WebCallbackClient;
  outputDir: string;
  workerId: string;
};

async function processMessage(message: QueueMessageEnvelope, dependencies: ProcessDependencies): Promise<void> {
  const payload = parseJobMessage(message.body);
  if (!payload) {
    console.warn('[worker] 非法消息，直接 ack', message.id);
    await dependencies.queue.ack(message);
    return;
  }

  let hasStarted = false;
  let logs: string[] = [];

  try {
    const startAt = Date.now();
    const startResponse = await dependencies.callback.notifyStart(payload.jobId, {
      workerId: dependencies.workerId,
      startedAt: startAt,
    });

    if (startResponse.status === 404 || startResponse.status === 409) {
      console.warn(`[worker] 任务 ${payload.jobId} 不可执行（${startResponse.status}），直接 ack`);
      await dependencies.queue.ack(message);
      return;
    }

    if (!startResponse.ok) {
      throw new Error(`开始回调失败：HTTP ${startResponse.status}`);
    }

    hasStarted = true;

    const download = await downloadFromX(payload, dependencies.outputDir);
    logs = download.logs;
    const upload = await dependencies.uploader.upload(download.outputPath);

    await safeRemoveFile(download.outputPath);

    const completeResponse = await dependencies.callback.notifyComplete(payload.jobId, {
      workerId: dependencies.workerId,
      success: true,
      finishedAt: Date.now(),
      logExcerpt: truncateLogs(logs),
      r2Key: upload.key,
      r2Url: upload.url,
    });

    if (!completeResponse.ok) {
      throw new Error(`完成回调失败：HTTP ${completeResponse.status}`);
    }

    await dependencies.queue.ack(message);
    console.log(`[worker] 任务 ${payload.jobId} 处理完成`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    console.error(`[worker] 任务 ${payload.jobId} 失败: ${detail}`);

    if (!hasStarted) {
      throw error;
    }

    const completeResponse = await dependencies.callback.notifyComplete(payload.jobId, {
      workerId: dependencies.workerId,
      success: false,
      finishedAt: Date.now(),
      error: detail,
      logExcerpt: truncateLogs(logs),
    });

    if (!completeResponse.ok) {
      throw new Error(`失败回调写回失败：HTTP ${completeResponse.status}`);
    }

    await dependencies.queue.ack(message);
  }
}

function truncateLogs(logs: string[], limit = 12000): string | undefined {
  if (logs.length === 0) {
    return undefined;
  }

  const joined = logs.join('');
  if (joined.length <= limit) {
    return joined;
  }

  return joined.slice(joined.length - limit);
}

async function safeRemoveFile(filePath: string): Promise<void> {
  try {
    const resolved = path.resolve(filePath);
    await fs.unlink(resolved);
  } catch {
    // 文件删除失败不影响主流程
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

await main().catch((error) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(detail);
  process.exitCode = 1;
});
