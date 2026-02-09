# 测试指南

## 运行测试
```bash
pnpm test
# 或只跑 CLI：
pnpm --filter x-downloader test
```

## 说明
- 使用 Node.js 内建测试框架（`node --test`）。
- 测试覆盖参数解析与下载命令构建逻辑（位于 `packages/cli/tests`）。
