# ILAL 快速入口

这个文件只保留最短上手路径。更完整文档请看 `docs/INDEX.md`。

---

## 1) 项目初始化（Monorepo）

```bash
cd ~/Desktop/ilal
pnpm install
pnpm build
```

---

## 2) 本地开发（推荐顺序）

### 启动 Web Demo
```bash
cd apps/web-demo
npm run dev
```

### 启动 API（可选，但推荐）
```bash
cd apps/api
cp .env.example .env
npm run dev
```

### 启动 Bot（可选）
```bash
cd bot
npm run dev
```

---

## 3) 部署与系统测试

### 一键部署引导
```bash
cd ~/Desktop/ilal
./complete-deployment.sh
```

### 系统测试（Mock Theater）
```bash
cd scripts/system-test
./run-theater.sh
```

---

## 4) 先读哪些文档

- 总导航：`docs/INDEX.md`
- SDK 文档：`packages/sdk/README.md`
- 架构说明：`docs/guides/ARCHITECTURE.md`
- 部署指南：`docs/guides/DEPLOYMENT.md`

---

## 说明

项目正在从旧目录结构迁移到 Monorepo 结构：

- 旧：`frontend/`, `contracts/`, `circuits/`, `relay/`
- 新：`apps/*`, `packages/*`

请优先使用新路径进行开发和脚本执行。
