export const JOB_MESSAGE_VERSION = 1;

export type DownloadJobMessage = {
  version: typeof JOB_MESSAGE_VERSION;
  jobId: number;
  requestId: string;
  url: string;
  filename?: string;
  format?: string;
  createdAt: number;
};

export function parseJobMessage(value: unknown): DownloadJobMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== JOB_MESSAGE_VERSION) {
    return null;
  }

  if (typeof value.jobId !== 'number' || !Number.isInteger(value.jobId) || value.jobId <= 0) {
    return null;
  }

  if (typeof value.requestId !== 'string' || value.requestId.trim().length === 0) {
    return null;
  }

  if (typeof value.url !== 'string' || value.url.trim().length === 0) {
    return null;
  }

  if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt) || value.createdAt <= 0) {
    return null;
  }

  if (value.filename !== undefined && typeof value.filename !== 'string') {
    return null;
  }

  if (value.format !== undefined && typeof value.format !== 'string') {
    return null;
  }

  return {
    version: JOB_MESSAGE_VERSION,
    jobId: value.jobId,
    requestId: value.requestId,
    url: value.url,
    filename: value.filename,
    format: value.format,
    createdAt: value.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
