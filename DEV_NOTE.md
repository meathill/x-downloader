# 开发备注

- 当前下载逻辑依赖本地 `yt-dlp`，本项目不负责解析 X 页面。
- X 平台规则变化较快，如下载失败优先检查 `yt-dlp` 是否需要更新。
- 输出路径默认使用 `~/Downloads/%(title)s.%(ext)s` 模板，用户可用 `--filename` 覆盖。
- 默认格式为 `bestvideo*+bestaudio/best`，需要 `ffmpeg`，未安装时会提示并退出。
- Web UI 使用 Next.js + Tailwind CSS v4 + COSS UI（shadcn CLI 生成组件）。
- Web UI 下载任务通过 SQLite 队列串行执行，数据库默认在 `packages/web/data/x-downloader.db`。
