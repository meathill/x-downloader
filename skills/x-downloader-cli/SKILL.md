---
name: x-downloader-cli
description: Build, modify, or use the x-downloader command-line tool for downloading X (Twitter) videos, especially when working in the x-downloader repo to adjust defaults, add CLI options, or troubleshoot yt-dlp execution.
---

# X Downloader CLI

## Overview
使用这个技能来操作或扩展 x-downloader 命令行工具。它通过 `yt-dlp` 下载 X 视频，运行在 Node.js >= 24（可直接执行 `.ts`），默认输出到 `~/Downloads`，默认格式为 `bestvideo*+bestaudio/best`（需要 `ffmpeg`）。

## Quick Start
- 使用 `node src/cli.ts <链接>` 直接运行。
- 需要全局命令时，在仓库目录执行 `pnpm link --global`，然后用 `x-downloader <链接>` 或 `xdown <链接>`。
- 已发布 npm 包时，可使用 `pnpm add -g x-downloader` 全局安装。

## 默认行为与常用选项
- 默认输出目录：`~/Downloads`。
- 默认格式：`bestvideo*+bestaudio/best`（最高质量，需要 `ffmpeg`）。
- 列出格式：`-F`。
- 指定格式：`-f <format>`。
- 受限内容：使用 `--cookies <file>` 传入 cookies。
- 其他可用参数参考 `src/help.ts`。

## 扩展/修改工作流
- 先阅读仓库内 `AGENTS.md` 并遵循其中流程（WIP、测试、文档）。
- 修改参数解析：编辑 `src/args.ts`。
- 修改下载命令构建：编辑 `src/yt-dlp.ts`。
- 修改帮助信息：编辑 `src/help.ts`。
- 补充测试：编辑 `tests/*.test.ts`，运行 `node --test`。
- 更新文档：同步修改 `README.md`、`TESTING.md`、`DEV_NOTE.md`。

## 常见问题排查
- 提示找不到 `yt-dlp`：确认已安装并可在终端直接执行。
- 提示缺少 `ffmpeg`：默认最高质量需要 `ffmpeg`，请先安装或用 `-f best` 跳过。
