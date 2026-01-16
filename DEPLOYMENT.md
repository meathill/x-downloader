# 部署指南

本项目可发布为 npm 包，发布前请确认包名可用并已登录 npm。

```bash
pnpm publish --access public
```

发布后用户可通过以下方式全局安装：

```bash
pnpm add -g x-downloader
```

## Web UI 部署
Web UI 位于 `web/`，为 Next.js 应用，部署前确保服务器已安装 `yt-dlp` 与 `ffmpeg`。

```bash
cd web
pnpm install
pnpm build
pnpm start
```

若需要使用反向代理（Nginx/Caddy），请将请求转发到 `next start` 的端口。

如遇到 `better-sqlite3` 的构建脚本被 pnpm 拒绝，请先执行 `pnpm approve-builds` 再重新安装。

### 队列与存储
- 任务队列使用 SQLite，默认数据库路径为 `web/data/x-downloader.db`。
- 部署时请确保 `web/data` 可写并持久化。
- 当前为单进程队列设计，如需多实例部署请加分布式锁或改用集中式队列。
- 可用环境变量：`X_DOWNLOADER_DATA_DIR` 或 `X_DOWNLOADER_DB_PATH`。
- 可用环境变量：`X_DOWNLOADER_OUTPUT_DIR` 可指定下载输出目录。
