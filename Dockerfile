# 兼容保留：默认构建执行 worker 镜像
# 等价于 `docker build -f packages/worker/Dockerfile .`

FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/worker/package.json ./packages/worker/

RUN pnpm install --filter x-downloader-worker... --frozen-lockfile

FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    yt-dlp \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/worker/node_modules ./packages/worker/node_modules
COPY packages/worker ./packages/worker

CMD ["node", "packages/worker/src/main.ts"]
