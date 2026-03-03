import os from 'node:os';
import path from 'node:path';

export type WorkerConfig = {
  cloudflareApiToken: string;
  cloudflareAccountId: string;
  queueId: string;
  pullBatchSize: number;
  pullVisibilityTimeout: number;
  pollIntervalMs: number;
  webBaseUrl: string;
  internalSecret: string;
  workerId: string;
  outputDir: string;
  r2Bucket: string;
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2PublicUrl?: string;
  r2KeyPrefix?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const cloudflareApiToken = readRequired(env, 'CF_API_TOKEN');
  const cloudflareAccountId = readRequired(env, 'CF_ACCOUNT_ID');
  const queueId = readRequired(env, 'CF_QUEUE_ID');
  const webBaseUrl = readRequired(env, 'XDOWN_WEB_BASE_URL');
  const internalSecret = readRequired(env, 'XDOWN_INTERNAL_SECRET');

  const r2Bucket = readRequired(env, 'XDOWN_R2_BUCKET');
  const r2AccessKeyId = readRequired(env, 'XDOWN_R2_ACCESS_KEY_ID');
  const r2SecretAccessKey = readRequired(env, 'XDOWN_R2_SECRET_ACCESS_KEY');
  const r2Endpoint = resolveR2Endpoint(env);

  const outputDir = readOptional(env, 'XDOWN_WORK_DIR') ?? path.join(os.tmpdir(), 'x-downloader');
  const workerId = readOptional(env, 'XDOWN_WORKER_ID') ?? `${os.hostname()}-${process.pid}`;

  return {
    cloudflareApiToken,
    cloudflareAccountId,
    queueId,
    pullBatchSize: parseIntWithDefault(readOptional(env, 'XDOWN_PULL_BATCH_SIZE'), 1, 1, 10),
    pullVisibilityTimeout: parseIntWithDefault(readOptional(env, 'XDOWN_PULL_VISIBILITY_TIMEOUT'), 300, 30, 600),
    pollIntervalMs: parseIntWithDefault(readOptional(env, 'XDOWN_POLL_INTERVAL_MS'), 2000, 500, 60_000),
    webBaseUrl: normalizeUrl(webBaseUrl),
    internalSecret,
    workerId,
    outputDir,
    r2Bucket,
    r2Endpoint,
    r2AccessKeyId,
    r2SecretAccessKey,
    r2PublicUrl: normalizeOptionalUrl(readOptional(env, 'NEXT_PUBLIC_FILE_PUBLIC_URL')),
    r2KeyPrefix: normalizeOptionalPrefix(readOptional(env, 'XDOWN_R2_PREFIX')),
  };
}

function resolveR2Endpoint(env: NodeJS.ProcessEnv): string {
  const direct = normalizeOptionalUrl(readOptional(env, 'XDOWN_R2_ENDPOINT'));
  if (direct) {
    return direct;
  }

  const accountId = readOptional(env, 'XDOWN_R2_ACCOUNT_ID') ?? readOptional(env, 'CF_ACCOUNT_ID');
  if (!accountId) {
    throw new Error('缺少 XDOWN_R2_ENDPOINT 或 XDOWN_R2_ACCOUNT_ID。');
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function readRequired(env: NodeJS.ProcessEnv, key: string): string {
  const value = readOptional(env, key);
  if (!value) {
    throw new Error(`缺少环境变量 ${key}`);
  }

  return value;
}

function readOptional(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseIntWithDefault(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeOptionalUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return normalizeUrl(value);
}

function normalizeOptionalPrefix(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/^\/+/, '').replace(/\/+$/, '') || undefined;
}
