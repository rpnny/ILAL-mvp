# ILAL（中文说明）

中文入口文档。英文主文档请看 `README.md`。

## 当前结构（Monorepo）

项目已统一到新目录：

- `packages/sdk`
- `packages/contracts`
- `packages/circuits`
- `apps/web-demo`
- `apps/api`
- `scripts`
- `docs`

旧目录（如 `frontend/`, `contracts/`, `circuits/`, `relay/`）仅作历史参考，不再作为主开发入口。

## 快速开始

```bash
cd /Users/ronny/Desktop/ilal
pnpm install
pnpm build
pnpm dev
```

## 推荐阅读顺序

1. `START_HERE.md`
2. `docs/INDEX.md`
3. `packages/sdk/README.md`
4. `docs/guides/ARCHITECTURE.md`
5. `docs/guides/DEPLOYMENT.md`

## 维护策略

- 对外与协作入口：`README.md`
- 中文快速入口：`README_CN.md`（本文件）
- 历史文档：`docs/archives/`
