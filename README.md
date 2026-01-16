# x-downloader

X（原 Twitter）视频下载命令行工具，默认通过本地 `yt-dlp` 执行下载。

## 前置条件
- Node.js >= 24
- 已安装 `yt-dlp` 并可在终端中直接执行

## 全局安装
```bash
# 在仓库目录执行
pnpm link --global

# 之后即可直接使用命令
x-downloader https://x.com/user/status/123
```

## 发布与安装（npm）
```bash
# 发布（需要先登录 npm 并确保包名可用）
pnpm publish --access public

# 用户侧全局安装
pnpm add -g x-downloader
```

## Skill 使用说明
如果你希望把它当作“技能说明”来使用，可以直接复用以下流程：
- 适用场景：在本仓库内使用或修改 x-downloader CLI，或排查 `yt-dlp` 相关问题。
- 默认行为：输出到 `~/Downloads`，格式为 `bestvideo*+bestaudio/best`（最高质量，需要 `ffmpeg`）。
- 修改入口：参数解析在 `src/args.ts`；下载命令构建在 `src/yt-dlp.ts`；帮助信息在 `src/help.ts`。
- 测试与文档：更新功能后运行 `node --test`，同步更新 `README.md`、`TESTING.md`、`DEV_NOTE.md`。

## 使用方法
```bash
# 直接运行
node src/cli.ts https://x.com/user/status/123

# 指定输出目录与文件名
node src/cli.ts https://x.com/user/status/123 -o ./videos -n demo.mp4

# 列出可用格式
node src/cli.ts https://x.com/user/status/123 -F
```

## Web UI
Web UI 位于 `web/`，基于 Next.js + TailwindCSS v4，并已接入 COSS UI 组件库，适合部署到服务器上供自己使用。

```bash
cd web
pnpm install
pnpm dev
```

生产环境构建与启动：

```bash
pnpm build
pnpm start
```

注意：服务器上需安装 `yt-dlp` 与 `ffmpeg`，并确保命令可用。
如遇到 `better-sqlite3` 的构建脚本被 pnpm 拒绝，请先执行 `pnpm approve-builds` 再重新安装。

### COSS UI 组件
本项目已通过 shadcn CLI 安装 COSS UI 组件与颜色 tokens，文件位于 `web/components/ui`。如需更新，可在 `web/` 目录执行：

```bash
pnpm dlx shadcn@latest add @coss/ui @coss/colors-neutral
```

### 任务队列与去重
Web UI 使用 SQLite 记录任务，默认只允许同一条链接下载一次：
- 新任务会写入 `web/data/x-downloader.db` 并排队执行（同一时间只处理一个任务）。
- 如果链接已下载或正在队列中，会直接提示并拒绝重复入队。
- 任何一次 API 请求都会触发队列消费，直到队列清空。
- 下载记录支持在 Web UI 中查看与删除，删除会同时移除已下载文件。
- 已完成任务可通过 `/api/downloads/:id/file` 直接下载文件（Web UI 内提供下载按钮）。

可选环境变量：
- `X_DOWNLOADER_DATA_DIR`：指定数据库目录（默认 `web/data`）。
- `X_DOWNLOADER_DB_PATH`：指定数据库文件路径（优先级更高）。
- `X_DOWNLOADER_OUTPUT_DIR`：指定下载输出目录（默认 `~/Downloads`）。

## 注意事项
- 该工具只负责组装与执行下载命令，实际解析与下载由 `yt-dlp` 完成。
- 默认输出目录为 `~/Downloads`，默认格式为 `bestvideo*+bestaudio/best`（最高质量，需要 `ffmpeg`）。
- 若本机未安装 `ffmpeg`，默认模式会提示安装并停止执行，你也可以用 `-f best` 跳过。
- 如需下载受限内容，请自行准备 `cookies` 文件并通过 `--cookies` 传入。
