# WIP

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

## 待确认
- [ ] 是否接受依赖外部工具（yt-dlp）
- [ ] 仅支持公开视频还是也要处理登录/私密内容
