import type { QueueBinding } from './cloudflare-bindings';
import { createJobMessage, type DownloadJobMessage } from './job-message';
import type { DownloadJob } from './jobs-repository';

export async function enqueueJob(
  queue: QueueBinding<DownloadJobMessage>,
  job: DownloadJob,
): Promise<DownloadJobMessage> {
  const message = createJobMessage(job);
  await queue.send(message);
  return message;
}
