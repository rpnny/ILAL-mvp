# ILAL 文档总导航

本页是当前文档的统一入口，优先指向 Monorepo 新结构。

## 一、快速上手

- 项目概览：`README.md`
- 快速入口：`START_HERE.md`
- SDK 入门：`packages/sdk/README.md`
- **📋 项目整理报告**：`docs/PROJECT_ORGANIZATION.md`
- **🌐 前端已启动**：`FRONTEND_READY.md` → http://localhost:3003
- **🧪 功能测试计划**：`docs/testing/FUNCTIONAL_TEST_PLAN.md`
- **✅ 功能测试结果**：`docs/testing/FUNCTIONAL_TEST_RESULTS_2026-02-16.md`
- **🌐 端到端测试结果**：`docs/testing/E2E_TEST_RESULTS_2026-02-16.md`
- **👥 用户体验报告**：`docs/USER_EXPERIENCE_REPORT.md`
- **📝 功能测试清单**：`docs/testing/FUNCTIONAL_TEST_CHECKLIST.md`
- **💡 用户体验测试计划**：`docs/testing/USER_EXPERIENCE_TEST_PLAN.md`
- **🎨 前端策略建议**：`docs/FRONTEND_STRATEGY.md`

## 二、核心技术文档

- 架构设计：`docs/guides/ARCHITECTURE.md`
- 部署指南：`docs/guides/DEPLOYMENT.md`
- SaaS 架构：`docs/guides/saas/SAAS_ARCHITECTURE.md`
- SaaS 快速开始：`docs/guides/saas/SAAS_QUICKSTART.md`
- SaaS 实施总结：`docs/guides/saas/SAAS_IMPLEMENTATION_COMPLETE.md`
- SaaS 中文总结：`docs/guides/saas/SAAS_实施总结_中文.md`
- 数据库（Supabase）：`docs/guides/setup/Supabase配置指南.md`
- 数据库（PostgreSQL）：`docs/guides/setup/PostgreSQL安装指南.md`
- 数据库（Supabase 连接字符串）：`docs/guides/setup/如何获取Supabase连接字符串.md`
- 数据库（PostgreSQL 适配结果）：`docs/guides/setup/PostgreSQL修复完成.md`
- 测试报告：`docs/testing/TEST_REPORT.md`

## 三、模块文档

- SDK：`packages/sdk/README.md`
- Web Demo：`apps/web-demo/README.md`
- API（SaaS & Verifier Relay）：`apps/api/docs/API.md`
- Landing：`landing/README.md`
- Subgraph：`subgraph/README.md`（若不存在请参考 `subgraph/package.json` scripts）

## 四、业务与对外材料

- Outreach 指南：`docs/outreach/OUTREACH_GUIDE.md`
- Outreach 索引：`docs/outreach/OUTREACH_MATERIALS_INDEX.md`
- Executive Brief：`docs/outreach/ILAL_EXECUTIVE_BRIEF.md`

## 五、历史归档

- 归档总览：`docs/archives/README.md`
- 历史报告索引：`docs/reports/REPORTS_INDEX.md`

## 六、路径规范（重要）

项目当前以 Monorepo 为准：

- `packages/`：SDK、合约、电路
- `apps/`：Web Demo、API
- `scripts/`：诊断与系统测试

旧路径（`frontend/`, `contracts/`, `circuits/`, `relay/`）仅作历史参考，不再作为主入口。
