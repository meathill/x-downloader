# 开发备注

- 架构已切换为“控制面/执行面”分离：
  - 控制面在 `packages/web`（Cloudflare Worker）
  - 执行面在 `packages/worker`（Mac mini）
- Web 不再执行下载任务，只做：入队、状态管理、下载链接跳转。
- 任务状态写回必须走内部回调，并且必须使用 HMAC（`XDOWN_INTERNAL_SECRET`）。
- OpenNext Cloudflare 构建依赖 workspace 根锁文件；子包锁文件会导致构建异常。
- worker 采用 Queue Pull 模式，支持后续横向扩展多个执行节点。
- 当前任务表结构定义在 `packages/web/migrations/0001_init_jobs.sql`。
