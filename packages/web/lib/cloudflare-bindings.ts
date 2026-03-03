export type D1RunMeta = {
  changes?: number;
};

export type D1RunResult = {
  success: boolean;
  meta?: D1RunMeta;
};

export type D1PreparedStatement = {
  bind(...values: Array<string | number | null>): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<D1RunResult>;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

export type QueueBinding<Message> = {
  send(body: Message): Promise<void>;
};

export type R2BucketBinding = {
  delete(key: string): Promise<void>;
};

export type CloudflareBindings = {
  DB?: D1Database;
  DOWNLOAD_QUEUE?: QueueBinding<unknown>;
  JOB_FILES?: R2BucketBinding;
  XDOWN_INTERNAL_SECRET?: string;
  XDOWN_R2_PUBLIC_URL?: string;
};

type OpenNextContextModule = {
  getCloudflareContext?: (options?: { async?: boolean }) =>
    | {
        env?: CloudflareBindings;
      }
    | Promise<{
        env?: CloudflareBindings;
      }>;
};

export async function getCloudflareBindings(): Promise<CloudflareBindings> {
  const injected = readInjectedBindings();
  if (injected) {
    return injected;
  }

  const fromOpenNext = await readFromOpenNext();
  if (fromOpenNext) {
    return fromOpenNext;
  }

  return readFromProcessEnv();
}

export async function getD1Database(): Promise<D1Database | null> {
  const bindings = await getCloudflareBindings();
  return bindings.DB ?? null;
}

export async function getDownloadQueueBinding<Message>(): Promise<QueueBinding<Message> | null> {
  const bindings = await getCloudflareBindings();
  return (bindings.DOWNLOAD_QUEUE as QueueBinding<Message> | undefined) ?? null;
}

export async function getJobFilesBucketBinding(): Promise<R2BucketBinding | null> {
  const bindings = await getCloudflareBindings();
  return bindings.JOB_FILES ?? null;
}

export async function getInternalCallbackSecret(): Promise<string | null> {
  const bindings = await getCloudflareBindings();
  const value = bindings.XDOWN_INTERNAL_SECRET;
  return normalizeOptionalString(value);
}

export async function getR2PublicUrl(): Promise<string | null> {
  const bindings = await getCloudflareBindings();
  const value = bindings.XDOWN_R2_PUBLIC_URL;
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.replace(/\/+$/, '');
}

async function readFromOpenNext(): Promise<CloudflareBindings | null> {
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier);') as (
      specifier: string,
    ) => Promise<OpenNextContextModule>;

    const module = await dynamicImport('@opennextjs/cloudflare');
    if (!module?.getCloudflareContext) {
      return null;
    }

    const context = await module.getCloudflareContext({ async: true });
    if (!context?.env) {
      return null;
    }

    return context.env;
  } catch {
    return null;
  }
}

function readInjectedBindings(): CloudflareBindings | null {
  const scope = globalThis as {
    __xDownBindings?: CloudflareBindings;
  };

  return scope.__xDownBindings ?? null;
}

function readFromProcessEnv(): CloudflareBindings {
  const internalSecret = normalizeOptionalString(process.env.XDOWN_INTERNAL_SECRET) ?? undefined;
  const r2PublicUrl = normalizeOptionalString(process.env.XDOWN_R2_PUBLIC_URL) ?? undefined;

  return {
    XDOWN_INTERNAL_SECRET: internalSecret,
    XDOWN_R2_PUBLIC_URL: r2PublicUrl,
  };
}

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
