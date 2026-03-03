# 部署指南

本文档描述当前推荐的生产架构：
- Web 控制面：Cloudflare Worker（Next.js + OpenNext + D1）
- 执行面：Mac mini worker（拉取 Cloudflare Queue，下载/转码/上传）

## 1. 架构与职责

- Web（`packages/web`）
  - 接收任务、写入 D1、发送队列消息
  - 展示任务状态、提供下载跳转
  - 通过 HMAC 验证内部回调
- Worker（`packages/worker`）
  - 从 Cloudflare Queue 拉取消息
  - 执行 `yt-dlp` + `ffmpeg`
  - 上传到 R2
  - 回调 `/api/internal/jobs/:id/start|complete`

## 2. Cloudflare 侧准备

### 2.1 创建 D1 / Queue / R2

建议资源命名：
- D1：`x-downloader`
- Queue：`x-downloader-jobs`
- R2 Bucket：`x-downloader-files`

`packages/web/wrangler.jsonc` 中已给出绑定占位，至少要替换：
- `d1_databases[0].database_id`
- `r2_buckets[0].bucket_name`（及 preview bucket）

### 2.2 应用 D1 迁移

```bash
pnpm --filter x-downloader-web migrate:d1
# 本地调试可用
pnpm --filter x-downloader-web migrate:d1:local
```

迁移文件：`packages/web/migrations/0001_init_jobs.sql`。

## 3. 部署 Web（Cloudflare Worker）

### 3.1 配置密钥与变量

必须：
- `XDOWN_INTERNAL_SECRET`：内部回调签名密钥（建议 >= 32 字符）

建议：
- `NEXT_PUBLIC_FILE_PUBLIC_URL`：R2 公网域名（用于下载跳转）

示例：

```bash
cd packages/web
wrangler secret put XDOWN_INTERNAL_SECRET
```

### 3.2 构建并部署

```bash
pnpm --filter x-downloader-web build:cf
pnpm --filter x-downloader-web deploy
```

部署成功后会得到 Worker 访问域名（可绑定自定义域名并接入 Cloudflare CDN）。

## 4. 部署执行 worker（Mac mini）

## 4.1 运行方式 A：直接运行 Node 进程

```bash
pnpm start:worker
```

### 4.2 运行方式 B：Docker

仓库提供 worker 容器镜像定义：
- `packages/worker/Dockerfile`

构建：

```bash
docker build -f packages/worker/Dockerfile -t x-downloader-worker .
```

运行：

```bash
docker run --rm \
  -e CF_API_TOKEN=... \
  -e CF_ACCOUNT_ID=... \
  -e CF_QUEUE_ID=... \
  -e XDOWN_WEB_BASE_URL=https://your-web-domain.com \
  -e XDOWN_INTERNAL_SECRET=... \
  -e XDOWN_R2_BUCKET=... \
  -e XDOWN_R2_ACCESS_KEY_ID=... \
  -e XDOWN_R2_SECRET_ACCESS_KEY=... \
  -e XDOWN_R2_ACCOUNT_ID=... \
  -e NEXT_PUBLIC_FILE_PUBLIC_URL=https://files.example.com \
  x-downloader-worker
```

## 4.3 worker 必填环境变量

Cloudflare Queue Pull：
- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`
- `CF_QUEUE_ID`

Web 回调：
- `XDOWN_WEB_BASE_URL`
- `XDOWN_INTERNAL_SECRET`（必须与 Web 端一致）

R2 上传：
- `XDOWN_R2_BUCKET`
- `XDOWN_R2_ACCESS_KEY_ID`
- `XDOWN_R2_SECRET_ACCESS_KEY`
- `XDOWN_R2_ENDPOINT` 或 `XDOWN_R2_ACCOUNT_ID`

可选调优：
- `NEXT_PUBLIC_FILE_PUBLIC_URL`
- `XDOWN_R2_PREFIX`
- `XDOWN_WORKER_ID`
- `XDOWN_WORK_DIR`
- `XDOWN_PULL_BATCH_SIZE`（默认 1）
- `XDOWN_PULL_VISIBILITY_TIMEOUT`（默认 300 秒）
- `XDOWN_POLL_INTERVAL_MS`（默认 2000 ms）

## 5. 验收清单

### 5.1 健康检查

```bash
curl -i https://<web-domain>/api/health
```

预期：`200`，且 `d1` / `queue` / `internal_secret` 为 `pass`。

### 5.2 入队测试

```bash
curl -i -X POST https://<web-domain>/api/download \
  -H 'content-type: application/json' \
  -d '{"url":"https://x.com/user/status/123"}'
```

预期：返回 `accepted: true`，任务状态 `queued`。

### 5.3 回写与下载测试

```bash
curl -i "https://<web-domain>/api/downloads?limit=5"
```

预期：任务状态从 `queued` -> `running` -> `done`/`failed`，成功任务可访问：
- `GET /api/downloads/:id/file`

## 6. 常见问题

- `build:cf` 失败并提示找不到模块：
  - 检查是否误保留子包锁文件（如 `packages/web/pnpm-lock.yaml`），workspace 下只保留根锁文件。
- `/api/health` 返回 `internal_secret` 失败：
  - Web 未设置 `XDOWN_INTERNAL_SECRET`。
- worker 回调 401：
  - Web 与 worker 的 `XDOWN_INTERNAL_SECRET` 不一致，或本机时钟漂移过大。
- 任务长期停留 `queued`：
  - worker 未启动、`CF_API_TOKEN` 权限不足、或 `CF_QUEUE_ID` 填错。
