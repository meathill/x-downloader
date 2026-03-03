# 测试指南

## 1. 全量测试

```bash
pnpm test
```

包含：
- `packages/cli`：参数解析、命令构建
- `packages/web`：请求校验、签名校验、健康检查、消息解析
- `packages/worker`：配置解析、队列消息解析

## 2. 分包测试

```bash
pnpm --filter x-downloader test
pnpm --filter x-downloader-web test
pnpm --filter x-downloader-worker test
```

## 3. 构建验证

Cloudflare 发布前至少跑一次：

```bash
# 仅 Next 构建
pnpm --filter x-downloader-web build

# OpenNext Cloudflare 构建
pnpm --filter x-downloader-web build:cf
```

## 4. 部署后冒烟

```bash
curl -i https://<web-domain>/api/health
curl -i https://<web-domain>/api/downloads?limit=1
curl -i -X POST https://<web-domain>/api/download \
  -H 'content-type: application/json' \
  -d '{"url":"https://x.com/user/status/123"}'
```

验收要点：
- `/api/health` 返回 `200`，且 `d1`/`queue`/`internal_secret` 为 `pass`。
- 任务可从 `queued` 进入 `running`，最终变为 `done` 或 `failed`。
- 动态 API 含 `Cache-Control: no-store`，避免 CDN 误缓存。
