# ILAL 文档索引

> Institutional Liquidity Access Layer - 项目文档中心

## 目录结构

```
docs/
├── README.md              ← 你在这里
├── guides/                ← 使用指南 & 技术决策
├── deployment/            ← 部署文档 & 检查清单
├── reports/               ← 开发进度 & 状态报告
└── testing/               ← 测试报告 & 系统测试结果
```

---

## 📖 guides/ — 使用指南

| 文件 | 说明 |
|------|------|
| [SETUP.md](guides/SETUP.md) | 开发环境搭建指南 |
| [USER_GUIDE.md](guides/USER_GUIDE.md) | 用户使用手册 |
| [QUICK_START_GUIDE.md](guides/QUICK_START_GUIDE.md) | 快速入门 |
| [TESTING_QUICK_START.md](guides/TESTING_QUICK_START.md) | 测试快速入门 |
| [UI_TEST_CHECKLIST.md](guides/UI_TEST_CHECKLIST.md) | UI 测试清单 |
| [DECISIONS.md](guides/DECISIONS.md) | 技术架构决策记录 |
| [ZK_INTEGRATION_PLAN.md](guides/ZK_INTEGRATION_PLAN.md) | ZK 证明集成方案 |
| [NEXT_STEPS.md](guides/NEXT_STEPS.md) | 后续开发计划 |

## 🚀 deployment/ — 部署文档

| 文件 | 说明 |
|------|------|
| [DEPLOYMENT.md](deployment/DEPLOYMENT.md) | 部署总览 |
| [DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md) | 部署检查清单 |
| [PRE_DEPLOYMENT_CHECKLIST.md](deployment/PRE_DEPLOYMENT_CHECKLIST.md) | 部署前检查 |
| [DEPLOYMENT_PROGRESS.md](deployment/DEPLOYMENT_PROGRESS.md) | 部署进度 |
| [DEPLOYMENT_STATUS.md](deployment/DEPLOYMENT_STATUS.md) | 部署状态 |
| [DEPLOYMENT_SUCCESS.md](deployment/DEPLOYMENT_SUCCESS.md) | 部署成功记录 |
| [DEPLOYMENT_UPDATE_20260211.md](deployment/DEPLOYMENT_UPDATE_20260211.md) | 2026-02-11 部署更新 |
| [BASE_SEPOLIA_DEPLOYMENT_SUCCESS.md](deployment/BASE_SEPOLIA_DEPLOYMENT_SUCCESS.md) | Base Sepolia 部署成功 |
| [READY_TO_DEPLOY.md](deployment/READY_TO_DEPLOY.md) | 部署就绪确认 |
| [DAY10_DEPLOYMENT_COMPLETE.md](deployment/DAY10_DEPLOYMENT_COMPLETE.md) | Day10 部署完成 |

## 📊 reports/ — 开发进度报告

| 文件 | 说明 |
|------|------|
| [PROJECT_COMPLETION_REPORT.md](reports/PROJECT_COMPLETION_REPORT.md) | 项目完成报告 |
| [FINAL_STATUS_REPORT.md](reports/FINAL_STATUS_REPORT.md) | 最终状态报告 |
| [FINAL_SUMMARY_20260211.md](reports/FINAL_SUMMARY_20260211.md) | 2026-02-11 最终总结 |
| [PRODUCTION_READY_STATUS.md](reports/PRODUCTION_READY_STATUS.md) | 生产就绪状态 |
| [IMPLEMENTATION_SUMMARY.md](reports/IMPLEMENTATION_SUMMARY.md) | 实现总结 |
| [PROGRESS_REPORT.md](reports/PROGRESS_REPORT.md) | 进度报告 |
| [PROGRESS_REPORT_20260211.md](reports/PROGRESS_REPORT_20260211.md) | 2026-02-11 进度报告 |
| [PROGRESS_SUMMARY.md](reports/PROGRESS_SUMMARY.md) | 进度摘要 |
| [今日完成总结.md](reports/今日完成总结.md) | 今日完成总结 |
| *更多...* | DAY9/DAY11 进度, STATUS, SUMMARY 等 |

## 🧪 testing/ — 测试报告

| 文件 | 说明 |
|------|------|
| [ILAL_Test_Report_Latest.html](testing/ILAL_Test_Report_Latest.html) | **最新系统测试报告 (HTML)** |
| [TEST_REPORT.md](testing/TEST_REPORT.md) | 测试总报告 |
| [TEST_RESULTS_SUMMARY.md](testing/TEST_RESULTS_SUMMARY.md) | 测试结果汇总 |
| [COMPLETE_TEST_INDEX.md](testing/COMPLETE_TEST_INDEX.md) | 完整测试索引 |
| [E2E_TEST_COMPLETE.md](testing/E2E_TEST_COMPLETE.md) | E2E 测试完成 |
| [E2E_TESTS_SUCCESS.md](testing/E2E_TESTS_SUCCESS.md) | E2E 测试成功 |
| [HELL_MODE_TESTING.md](testing/HELL_MODE_TESTING.md) | 极限压力测试 |
| [ZK_PROOF_FIXED.md](testing/ZK_PROOF_FIXED.md) | ZK 证明修复记录 |

---

## 根目录保留文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目主 README |
| `README_CN.md` | 中文 README |
| `ARCHITECTURE.md` | 系统架构文档 |

---

*运行系统测试并生成最新 HTML 报告:*

```bash
cd scripts/system-test && npx tsx index.ts
```
