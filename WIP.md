# WIP

## 当前任务（2026-03-02）
- [x] 盘点 Zeabur + Cloudflare CDN 部署缺口并形成检查清单
- [x] 增加可用于平台探活的健康检查接口（`/api/health`）
- [x] 为动态 API 增加防缓存响应头，避免 CDN 误缓存
- [x] 增加 Web 端关键单元测试并纳入 `pnpm test`
- [x] 更新 `DEPLOYMENT.md`，补齐 Zeabur + Cloudflare 实操步骤与验收清单

## 当前任务（2026-03-02 架构重构）
- [x] Web 迁移到 Cloudflare Worker（OpenNext）并接入 D1
- [x] API 从“本地执行下载”改为“入队 + 状态查询”
- [x] 新增 Mac mini 执行 worker（拉队列、下载/转码、上传 R2、回调）
- [x] 引入队列回调鉴权（HMAC）并补充必要测试
- [x] 更新 README / DEPLOYMENT / TESTING 到新架构

## 目标
- 做一个可用的 X 视频下载命令行工具（优先支持单条推文链接）
- 默认最高质量、默认下载到 Downloads、可全局安装、封装为 Skill
- 增加可部署的 Web UI（Next.js + Tailwind + COSS UI 风格）

## 任务拆解
- [x] 明确 CLI 交互（参数、输出、错误码）
- [x] 初始化项目结构与脚本
- [x] 实现下载器执行层（优先调用本地 yt-dlp）
- [x] 增加测试（参数解析、命令构建、错误处理）
- [x] 补齐文档（README/TESTING/DEV_NOTE）
- [x] 调整默认行为（最高质量、Downloads）
- [x] 增加全局安装说明并验证命令可用
- [x] 补充 Skill 使用说明到 README
- [x] 默认使用最高质量格式并增加 ffmpeg 检测提示
- [x] 更新 Skill 目录内容（skills/x-downloader-cli）
- [x] 初始化 Web UI 目录与基础页面
- [x] 实现下载 API（调用 yt-dlp）
- [x] 完善部署说明与使用文档
- [x] Web UI 升级 Tailwind v4 并接入 COSS UI
- [x] Web UI 使用 SQLite 任务队列并避免重复下载
- [x] Web UI 下载列表与删除（同时删除文件）
- [x] Web API 提供下载文件直链
- [x] Web UI 增加下载按钮
- [x] 文档补充下载方式说明
- [x] CLI 代码迁移到 `packages/cli` 并同步更新脚本与文档
- [x] Web 端支持上传到 R2 并通过下载链接访问
- [x] 提供 Docker 打包与部署说明（Cloudflare Containers）

## 待确认
- [ ] 是否接受依赖外部工具（yt-dlp）
- [ ] 仅支持公开视频还是也要处理登录/私密内容
