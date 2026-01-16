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

## 使用方法
```bash
# 直接运行
node src/cli.ts https://x.com/user/status/123

# 指定输出目录与文件名
node src/cli.ts https://x.com/user/status/123 -o ./videos -n demo.mp4

# 列出可用格式
node src/cli.ts https://x.com/user/status/123 -F
```

## 注意事项
- 该工具只负责组装与执行下载命令，实际解析与下载由 `yt-dlp` 完成。
- 默认输出目录为 `~/Downloads`，默认格式为 `best`（最高质量单文件）。
- 如需更高质量（分离音视频）可手动指定 `-f bestvideo*+bestaudio/best`，此时需要本地 `ffmpeg`。
- 如需下载受限内容，请自行准备 `cookies` 文件并通过 `--cookies` 传入。
