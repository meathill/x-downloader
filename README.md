# x-downloader

一个面向个人部署的 X（Twitter）视频下载系统，采用“控制面 + 执行面”分离架构：
- 控制面：Cloudflare Worker（Next.js + OpenNext）
- 执行面：Mac mini 上运行的下载 worker（yt-dlp + ffmpeg）

## 当前架构

1. 用户在 Web UI 提交下载任务。
2. Web API 校验请求后写入 D1，并发送消息到 Cloudflare Queue。
3. Mac mini worker 通过 Queue Pull API 拉取任务，执行下载/转码并上传到 R2。
4. worker 通过内部回调接口写回任务状态（`start` / `complete`，HMAC 签名）。
5. Web UI 从 D1 展示任务列表，下载链接跳转到 R2。

## Monorepo 目录

- `packages/cli`：命令行下载工具（本地直接执行）。
- `packages/web`：Next.js Web UI + API（部署到 Cloudflare Worker）。
- `packages/worker`：执行 worker（部署到 Mac mini，支持容器化）。

## 前置条件

- Node.js >= 24
- pnpm >= 10
- Mac 执行端安装 `yt-dlp`、`ffmpeg`（容器镜像内已包含）

## 本地开发

### 1) 安装依赖

```bash
pnpm install
```

### 2) 启动 Web（Next 本地模式）

```bash
pnpm dev:web
```

### 3) 启动 Web（Cloudflare/OpenNext 模式）

```bash
pnpm dev:web:cf
```

### 4) 启动执行 worker

```bash
pnpm start:worker
# 只处理一轮消息：
pnpm start:worker:once
```

## 测试与构建

```bash
# 全量测试（cli + web + worker）
pnpm test

# Cloudflare 构建产物（.open-next/worker.js）
pnpm build:web

# 仅 Next 构建（不做 OpenNext 打包）
pnpm build:web:next
```

## Web API（核心）

- `POST /api/download`：创建任务并入队。
- `GET /api/downloads`：查询任务列表。
- `DELETE /api/downloads/:id`：删除任务（非 running）。
- `GET /api/downloads/:id/file`：跳转到 R2 下载链接。
- `GET /api/health`：探活检查（D1/Queue/内部签名配置）。

内部接口（仅 worker 调用）：
- `POST /api/internal/jobs/:id/start`
- `POST /api/internal/jobs/:id/complete`

## 配置概览

Web（Cloudflare 绑定，见 `packages/web/wrangler.jsonc`）：
- `DB`（D1）
- `DOWNLOAD_QUEUE`（Queue producer）
- `JOB_FILES`（R2，可选，用于删除对象）
- `XDOWN_INTERNAL_SECRET`（必须，与 worker 一致）
- `XDOWN_R2_PUBLIC_URL`（建议）

worker（Mac mini 环境变量）：
- `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_QUEUE_ID`
- `XDOWN_WEB_BASE_URL`, `XDOWN_INTERNAL_SECRET`
- `XDOWN_R2_BUCKET`, `XDOWN_R2_ACCESS_KEY_ID`, `XDOWN_R2_SECRET_ACCESS_KEY`
- `XDOWN_R2_ENDPOINT` 或 `XDOWN_R2_ACCOUNT_ID`
- 可选：`XDOWN_R2_PUBLIC_URL`, `XDOWN_R2_PREFIX`, `XDOWN_WORKER_ID`, `XDOWN_WORK_DIR`

完整部署步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
