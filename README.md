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

## 注意事项
- 该工具只负责组装与执行下载命令，实际解析与下载由 `yt-dlp` 完成。
- 默认输出目录为 `~/Downloads`，默认格式为 `bestvideo*+bestaudio/best`（最高质量，需要 `ffmpeg`）。
- 若本机未安装 `ffmpeg`，默认模式会提示安装并停止执行，你也可以用 `-f best` 跳过。
- 如需下载受限内容，请自行准备 `cookies` 文件并通过 `--cookies` 传入。
