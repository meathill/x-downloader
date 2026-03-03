export type JobStartPayload = {
  workerId: string;
  startedAt?: number;
};

export type JobCompletePayload = {
  workerId?: string;
  success: boolean;
  finishedAt?: number;
  error?: string;
  logExcerpt?: string;
  r2Key?: string;
  r2Url?: string;
};

export function parseJobStartPayload(value: unknown): JobStartPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.workerId !== 'string' || value.workerId.trim().length === 0) {
    return null;
  }

  if (value.startedAt !== undefined && !isFinitePositiveNumber(value.startedAt)) {
    return null;
  }

  return {
    workerId: value.workerId.trim(),
    startedAt: value.startedAt,
  };
}

export function parseJobCompletePayload(value: unknown): JobCompletePayload | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.success !== 'boolean') {
    return null;
  }

  if (value.workerId !== undefined && typeof value.workerId !== 'string') {
    return null;
  }

  if (value.finishedAt !== undefined && !isFinitePositiveNumber(value.finishedAt)) {
    return null;
  }

  if (value.error !== undefined && typeof value.error !== 'string') {
    return null;
  }

  if (value.logExcerpt !== undefined && typeof value.logExcerpt !== 'string') {
    return null;
  }

  if (value.r2Key !== undefined && typeof value.r2Key !== 'string') {
    return null;
  }

  if (value.r2Url !== undefined && typeof value.r2Url !== 'string') {
    return null;
  }

  return {
    workerId: value.workerId?.trim() || undefined,
    success: value.success,
    finishedAt: value.finishedAt,
    error: value.error,
    logExcerpt: value.logExcerpt,
    r2Key: value.r2Key,
    r2Url: value.r2Url,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
