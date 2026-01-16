# 开发备注

- 当前下载逻辑依赖本地 `yt-dlp`，本项目不负责解析 X 页面。
- X 平台规则变化较快，如下载失败优先检查 `yt-dlp` 是否需要更新。
- 输出路径默认使用 `~/Downloads/%(title)s.%(ext)s` 模板，用户可用 `--filename` 覆盖。
- 默认格式为 `best`，如果需要分离音视频的最高质量，请使用 `-f bestvideo*+bestaudio/best`。
