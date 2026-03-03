import { getCloudflareBindings, type D1Database } from './cloudflare-bindings.ts';

export type HealthStatus = 'pass' | 'warn' | 'fail';

export type HealthCheck = {
  name: string;
  status: HealthStatus;
  message: string;
};

export type HealthReport = {
  ok: boolean;
  timestamp: string;
  checks: HealthCheck[];
};

export type HealthDependencies = {
  now?: () => Date;
  getBindings?: typeof getCloudflareBindings;
};

export async function buildHealthReport(dependencies: HealthDependencies = {}): Promise<HealthReport> {
  const now = dependencies.now ? dependencies.now() : new Date();
  const loadBindings = dependencies.getBindings ?? getCloudflareBindings;
  const bindings = await loadBindings();

  const checks: HealthCheck[] = [];
  checks.push(await checkD1(bindings.DB));
  checks.push(checkQueue(Boolean(bindings.DOWNLOAD_QUEUE)));
  checks.push(checkInternalSecret(bindings.XDOWN_INTERNAL_SECRET));
  checks.push(checkR2PublicUrl(bindings.XDOWN_R2_PUBLIC_URL));

  return {
    ok: checks.every((check) => check.status !== 'fail'),
    timestamp: now.toISOString(),
    checks,
  };
}

async function checkD1(db: D1Database | undefined): Promise<HealthCheck> {
  if (!db) {
    return {
      name: 'd1',
      status: 'fail',
      message: '未绑定 D1（DB）。',
    };
  }

  try {
    await db.prepare('SELECT 1 AS ok').first();
    return {
      name: 'd1',
      status: 'pass',
      message: 'D1 可用。',
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    return {
      name: 'd1',
      status: 'fail',
      message: `D1 检查失败：${detail}`,
    };
  }
}

function checkQueue(hasQueue: boolean): HealthCheck {
  return {
    name: 'queue',
    status: hasQueue ? 'pass' : 'fail',
    message: hasQueue ? 'DOWNLOAD_QUEUE 已绑定。' : '未绑定 DOWNLOAD_QUEUE。',
  };
}

function checkInternalSecret(secret: string | undefined): HealthCheck {
  const valid = typeof secret === 'string' && secret.trim().length >= 16;
  return {
    name: 'internal_secret',
    status: valid ? 'pass' : 'fail',
    message: valid ? '内部回调签名密钥已配置。' : 'XDOWN_INTERNAL_SECRET 未配置或长度不足（至少 16 字符）。',
  };
}

function checkR2PublicUrl(value: string | undefined): HealthCheck {
  const valid = typeof value === 'string' && value.trim().length > 0;
  return {
    name: 'r2_public_url',
    status: valid ? 'pass' : 'warn',
    message: valid ? '已配置 R2 公网地址。' : '未配置 XDOWN_R2_PUBLIC_URL，将依赖任务回调中的 r2Url。',
  };
}
