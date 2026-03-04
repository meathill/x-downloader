import { getCloudflareContext } from '@opennextjs/cloudflare';
import { auth } from '@/lib/auth';

export const GET = async (request: Request) => {
  const { env } = getCloudflareContext();
  return auth(env.DB).handler(request);
};

export const POST = async (request: Request) => {
  const { env } = getCloudflareContext();
  return auth(env.DB).handler(request);
};
