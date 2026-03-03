import type { WorkerConfig } from './config';

export type QueueMessageEnvelope = {
  id: string;
  leaseId: string;
  attempts: number;
  body: unknown;
};

type PullMessageRaw = {
  id?: string;
  lease_id?: string;
  attempts?: number;
  body?: unknown;
};

type CloudflareResponse<T> = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: T;
};

export class QueueClient {
  readonly #baseUrl: string;
  readonly #token: string;

  constructor(private readonly config: WorkerConfig) {
    this.#baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/queues/${config.queueId}/messages`;
    this.#token = config.cloudflareApiToken;
  }

  async pull(): Promise<QueueMessageEnvelope[]> {
    const response = await fetch(`${this.#baseUrl}/pull`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        visibility_timeout: this.config.pullVisibilityTimeout,
        batch_size: this.config.pullBatchSize,
      }),
    });

    if (!response.ok) {
      throw new Error(`拉取队列失败：HTTP ${response.status}`);
    }

    const json = (await response.json()) as CloudflareResponse<
      | {
          messages?: PullMessageRaw[];
        }
      | PullMessageRaw[]
    >;

    if (!json.success) {
      throw new Error(`拉取队列失败：${formatApiErrors(json.errors)}`);
    }

    const rows = readMessages(json.result);
    const parsed: QueueMessageEnvelope[] = [];

    for (const row of rows) {
      const id = row.id;
      const leaseId = row.lease_id;
      if (!id || !leaseId) {
        continue;
      }

      parsed.push({
        id,
        leaseId,
        attempts: typeof row.attempts === 'number' ? row.attempts : 0,
        body: decodeQueueBody(row.body),
      });
    }

    return parsed;
  }

  async ack(message: QueueMessageEnvelope): Promise<void> {
    const response = await fetch(`${this.#baseUrl}/ack`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        acks: [
          {
            id: message.id,
            lease_id: message.leaseId,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`确认消息失败：HTTP ${response.status}`);
    }

    const json = (await response.json()) as CloudflareResponse<unknown>;
    if (!json.success) {
      throw new Error(`确认消息失败：${formatApiErrors(json.errors)}`);
    }
  }

  private createHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.#token}`,
      'Content-Type': 'application/json',
    };
  }
}

function readMessages(
  value:
    | {
        messages?: PullMessageRaw[];
      }
    | PullMessageRaw[]
    | undefined,
): PullMessageRaw[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value.messages)) {
    return value.messages;
  }

  return [];
}

function decodeQueueBody(value: unknown): unknown {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const directJson = parseJson(trimmed);
  if (directJson !== null) {
    return directJson;
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    const decodedJson = parseJson(decoded);
    return decodedJson ?? decoded;
  } catch {
    return trimmed;
  }
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatApiErrors(errors: Array<{ message?: string }> | undefined): string {
  if (!errors || errors.length === 0) {
    return '未知错误';
  }

  return errors.map((error) => error.message ?? '未知错误').join('; ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
