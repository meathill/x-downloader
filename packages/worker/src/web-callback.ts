import type { WorkerConfig } from './config';
import { signPayload } from './internal-auth';

export type StartPayload = {
  workerId: string;
  startedAt: number;
};

export type CompletePayload = {
  workerId: string;
  success: boolean;
  finishedAt: number;
  error?: string;
  logExcerpt?: string;
  r2Key?: string;
  r2Url?: string;
};

export class WebCallbackClient {
  constructor(private readonly config: WorkerConfig) {}

  async notifyStart(jobId: number, payload: StartPayload): Promise<Response> {
    return await this.post(`/api/internal/jobs/${jobId}/start`, payload);
  }

  async notifyComplete(jobId: number, payload: CompletePayload): Promise<Response> {
    return await this.post(`/api/internal/jobs/${jobId}/complete`, payload);
  }

  private async post(path: string, payload: object): Promise<Response> {
    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const signature = await signPayload(this.config.internalSecret, body, timestamp);

    return await fetch(`${this.config.webBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-xdown-timestamp': timestamp,
        'x-xdown-signature': signature,
      },
      body,
    });
  }
}
