import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import type { WorkerConfig } from './config';

export type UploadedObject = {
  key: string;
  url: string;
};

export class R2Uploader {
  readonly #client: S3Client;

  constructor(private readonly config: WorkerConfig) {
    this.#client = new S3Client({
      region: 'auto',
      endpoint: config.r2Endpoint,
      credentials: {
        accessKeyId: config.r2AccessKeyId,
        secretAccessKey: config.r2SecretAccessKey,
      },
    });
  }

  async upload(filePath: string): Promise<UploadedObject> {
    await assertFileExists(filePath);

    const filename = path.basename(filePath);
    const key = buildObjectKey(filename, this.config.r2KeyPrefix);

    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.config.r2Bucket,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: 'application/octet-stream',
        ContentDisposition: buildContentDisposition(filename),
      }),
    );

    const url = buildPublicUrl(this.config.r2PublicUrl, key);
    return { key, url };
  }
}

function buildObjectKey(filename: string, prefix?: string): string {
  const safeName = normalizeFilename(filename);
  const day = new Date().toISOString().slice(0, 10);
  const suffix = `${crypto.randomUUID()}-${safeName}`;
  const parts = ['x-downloader', day, suffix];

  if (prefix) {
    parts.unshift(prefix);
  }

  return parts.join('/');
}

function normalizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base.length > 0 ? base : 'download';
}

function buildPublicUrl(base: string | undefined, key: string): string {
  if (!base) {
    return key;
  }

  const encoded = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${base.replace(/\/+$/, '')}/${encoded}`;
}

async function assertFileExists(filePath: string): Promise<void> {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error('待上传文件不存在。');
  }
}

function buildContentDisposition(filename: string): string {
  const safeFilename = filename.replace(/"/g, '');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${safeFilename}"; filename*=UTF-8''${encoded}`;
}
