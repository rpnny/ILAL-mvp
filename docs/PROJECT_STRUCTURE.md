# ILAL 项目文件结构说明

**最后更新**: 2026-02-16

---

## 📁 项目根目录

### 核心文档（保留在根目录）

```
/
├── README.md                    # 项目主要说明（英文）
├── README_CN.md                 # 项目说明（中文）
├── START_HERE.md                # 快速开始指南
├── CONTRIBUTING.md              # 贡献指南
├── SECURITY.md                  # 安全政策
└── LICENSE                      # 开源协议
```

### 配置文件

```
/
├── .env                         # 环境变量（不提交）
├── .env.example                 # 环境变量模板
├── .env.production.example      # 生产环境模板
├── package.json                 # 根 package.json
├── pnpm-workspace.yaml          # pnpm 工作空间配置
└── tsconfig.base.json           # TypeScript 基础配置
```

---

## 📚 文档目录 (docs/)

### 文档组织结构

```
docs/
├── INDEX.md                     # 文档索引
├── PROJECT_ORGANIZATION.md      # 项目组织说明
├── PROJECT_STRUCTURE.md         # 项目结构说明（本文件）
├── REFACTOR_SUMMARY.md          # 重构总结
├── STATUS.md                    # 项目状态
│
├── archives/                    # 历史文档归档
│   └── chinese-legacy-docs/    # 旧版中文文档
│
├── deployment/                  # 部署相关文档
│   └── DEPLOYMENT_READY.md      # 部署就绪说明
│
├── frontend/                    # 前端文档
│   ├── FRONTEND_READY.md        # 前端就绪状态
│   ├── FRONTEND_STATUS.md       # 前端状态
│   └── FRONTEND_STRATEGY.md     # 前端策略
│
├── guides/                      # 使用指南
│   ├── ARCHITECTURE.md          # 架构说明
│   ├── DEPLOYMENT.md            # 部署指南
│   ├── saas/                    # SaaS 相关指南
│   └── setup/                   # 设置指南
│
├── reports/                     # 各类报告
│   ├── performance/             # 性能分析报告
│   │   └── PERFORMANCE_COST_ANALYSIS.md
│   ├── summaries/               # 总结报告
│   │   └── CUSTOMER_EXPERIENCE_SUMMARY.md
│   ├── REPORTS_INDEX.md         # 报告索引
│   └── REPORTS_INDEX_EN.md      # 报告索引（英文）
│
├── testing/                     # 测试文档
│   ├── reports-2026-02-16/      # 2026-02-16 测试报告
│   │   ├── BIG_DEMO_REPORT_2026-02-16.md
│   │   ├── COMPLETE_TEST_SUMMARY_2026-02-16.md
│   │   ├── TEST_SUCCESS_SUMMARY.md
│   │   ├── TRUTHFUL_MOCK_THEATER_REPORT.md
│   │   └── TASKS_COMPLETED_2026-02-16.md
│   ├── E2E_TEST_RESULTS_2026-02-16.md
│   ├── FUNCTIONAL_TEST_CHECKLIST.md
│   ├── FUNCTIONAL_TEST_PLAN.md
│   └── FUNCTIONAL_TEST_RESULTS_2026-02-16.md
│
├── outreach/                    # 对外材料
│   ├── COMPETITIVE_ANALYSIS_CN.md
│   └── COMPETITIVE_ONEPAGER_EN.md
│
└── user-guide/                  # 用户指南
    └── (待添加)
```

---

## 🗂️ 代码目录

### Monorepo 结构

```
/
├── packages/                    # 核心包
│   ├── sdk/                     # TypeScript SDK
│   ├── contracts/               # Solidity 智能合约
│   └── circuits/                # ZK 电路
│
├── apps/                        # 应用
│   ├── web-demo/                # Web 演示应用
│   └── api/                     # API 服务
│
└── scripts/                     # 脚本工具
    ├── deployment/              # 部署脚本
    │   ├── complete-deployment.sh
    │   ├── deploy-all.sh
    │   └── deploy-subgraph-interactive.sh
    ├── setup/                   # 设置脚本
    │   ├── install-postgresql.sh
    │   ├── install-with-password.sh
    │   ├── setup-bot-interactive.sh
    │   └── setup-for-test.sh
    ├── system-test/             # 系统测试脚本
    │   ├── mock-theater.ts
    │   ├── check-balances.ts
    │   └── analyze-performance.ts
    ├── quick-start.sh           # 快速启动
    └── test-all-features.sh     # 完整测试
```

---

## 🔧 Scripts 目录说明

### deployment/ - 部署脚本

| 文件 | 用途 |
|------|------|
| `complete-deployment.sh` | 完整部署流程 |
| `deploy-all.sh` | 部署所有组件 |
| `deploy-subgraph-interactive.sh` | 交互式部署 Subgraph |

### setup/ - 设置脚本

| 文件 | 用途 |
|------|------|
| `install-postgresql.sh` | 安装 PostgreSQL |
| `install-with-password.sh` | 带密码安装 |
| `setup-bot-interactive.sh` | 设置 Bot |
| `setup-for-test.sh` | 测试环境设置 |

### system-test/ - 系统测试

| 文件 | 用途 |
|------|------|
| `mock-theater.ts` | Mock Theater 演示脚本 |
| `check-balances.ts` | 检查账户余额 |
| `analyze-performance.ts` | 性能分析 |

### 根级脚本

| 文件 | 用途 |
|------|------|
| `quick-start.sh` | 快速启动项目 |
| `test-all-features.sh` | 运行所有功能测试 |

---

## 📦 Packages 说明

### packages/sdk

TypeScript SDK，提供与 ILAL 协议交互的接口。

```
packages/sdk/
├── src/
│   ├── client.ts              # 主客户端
│   ├── modules/               # 功能模块
│   │   ├── session.ts         # Session 管理
│   │   ├── swap.ts            # Swap 交易
│   │   ├── liquidity.ts       # 流动性管理
│   │   ├── zkproof.ts         # ZK 证明
│   │   └── eas.ts             # EAS 集成
│   └── utils/                 # 工具函数
├── tests/                     # 单元测试（29个测试）
└── README.md                  # SDK 文档
```

### packages/contracts

Solidity 智能合约，基于 Uniswap V4 Hooks。

```
packages/contracts/
├── src/
│   ├── core/                  # 核心合约
│   │   ├── ComplianceHook.sol
│   │   ├── SessionManager.sol
│   │   ├── Registry.sol
│   │   └── PlonkVerifier.sol
│   ├── helpers/               # 辅助合约
│   └── interfaces/            # 接口定义
├── test/                      # 测试（57个测试通过）
├── script/                    # 部署脚本
└── deployments/               # 部署记录
    └── 84532-plonk.json      # Base Sepolia 部署
```

### packages/circuits

ZK 电路，使用 Circom 和 SnarkJS。

```
packages/circuits/
├── compliance.circom          # 合规验证电路
├── scripts/                   # 编译和证明脚本
└── keys/                      # 验证密钥
```

---

## 🌐 Apps 说明

### apps/web-demo

Next.js Web 演示应用。

```
apps/web-demo/
├── app/                       # Next.js App Router
│   ├── page.tsx               # 首页
│   ├── trade/                 # 交易页面
│   └── liquidity/             # 流动性页面
├── components/                # React 组件
├── hooks/                     # 自定义 Hooks
└── lib/                       # 工具库
```

### apps/api

Express.js API 服务（SaaS 后端）。

```
apps/api/
├── src/
│   ├── routes/                # API 路由
│   ├── services/              # 业务逻辑
│   ├── middleware/            # 中间件
│   └── prisma/                # 数据库 ORM
└── README.md                  # API 文档
```

---

## 🗄️ 其他目录

### bot/

Discord/Telegram Bot 相关代码。

### subgraph/

The Graph Subgraph 定义和部署配置。

### deployments/

部署配置和记录。

### devops/

DevOps 相关配置（CI/CD、Docker等）。

### landing/

Landing Page 静态网站。

### frontend/

旧版前端（已迁移到 apps/web-demo）。

---

## 📋 文件命名规范

### 文档文件

- 使用 **大写 + 下划线**：`PROJECT_STRUCTURE.md`
- 日期格式：`YYYY-MM-DD`，如 `REPORT_2026-02-16.md`
- 语言后缀：`_CN.md`（中文）、`_EN.md`（英文）

### 代码文件

- TypeScript/JavaScript：**小写 + 连字符**，如 `mock-theater.ts`
- React 组件：**PascalCase**，如 `SessionStatus.tsx`
- Solidity：**PascalCase**，如 `ComplianceHook.sol`

### 脚本文件

- Shell 脚本：**小写 + 连字符 + .sh**，如 `deploy-all.sh`
- TypeScript 脚本：**小写 + 连字符 + .ts**，如 `check-balances.ts`

---

## 🔍 查找文件

### 常用文档快速索引

| 需求 | 文件位置 |
|------|---------|
| 快速开始 | `START_HERE.md` |
| 项目架构 | `docs/guides/ARCHITECTURE.md` |
| 部署指南 | `docs/guides/DEPLOYMENT.md` |
| 测试报告 | `docs/testing/` |
| 性能分析 | `docs/reports/performance/` |
| SDK 文档 | `packages/sdk/README.md` |
| API 文档 | `apps/api/README.md` |

### 常用命令

```bash
# 查看所有文档
find docs/ -name "*.md" -type f

# 查看测试报告
ls docs/testing/reports-2026-02-16/

# 运行快速启动
./scripts/quick-start.sh

# 运行完整测试
./scripts/test-all-features.sh
```

---

## 🎯 文件整理原则

### 1. **保持根目录简洁**
   - 只保留核心文档（README、LICENSE等）
   - 配置文件放在根目录
   - 其他文档移到 docs/

### 2. **文档按类型分类**
   - 测试报告 → `docs/testing/`
   - 性能分析 → `docs/reports/performance/`
   - 用户指南 → `docs/user-guide/`
   - 部署文档 → `docs/deployment/`

### 3. **脚本按功能分类**
   - 部署脚本 → `scripts/deployment/`
   - 设置脚本 → `scripts/setup/`
   - 测试脚本 → `scripts/system-test/`

### 4. **代码按 Monorepo 组织**
   - 可复用包 → `packages/`
   - 应用程序 → `apps/`
   - 辅助工具 → `scripts/`

---

## 📝 维护建议

### 新增文档时

1. **确定文档类型**（测试/指南/报告）
2. **放入对应目录**
3. **更新索引文件**（`docs/INDEX.md`）
4. **遵循命名规范**

### 新增脚本时

1. **确定脚本功能**（部署/设置/测试）
2. **放入对应目录**
3. **添加注释说明**
4. **更新本文档**

### 定期清理

- 每月检查过时文档
- 归档旧版本到 `docs/archives/`
- 删除未使用的脚本

---

## ✅ 整理记录

### 2026-02-16 整理

**移动的文件**:

测试报告（5个）→ `docs/testing/reports-2026-02-16/`:
- `BIG_DEMO_REPORT_2026-02-16.md`
- `COMPLETE_TEST_SUMMARY_2026-02-16.md`
- `TEST_SUCCESS_SUMMARY.md`
- `TRUTHFUL_MOCK_THEATER_REPORT.md`
- `TASKS_COMPLETED_2026-02-16.md`

性能报告（1个）→ `docs/reports/performance/`:
- `PERFORMANCE_COST_ANALYSIS.md`

用户体验（1个）→ `docs/reports/summaries/`:
- `CUSTOMER_EXPERIENCE_SUMMARY.md`

部署文档（1个）→ `docs/deployment/`:
- `DEPLOYMENT_READY.md`

前端文档（2个）→ `docs/frontend/`:
- `FRONTEND_READY.md`
- `FRONTEND_STATUS.md`

部署脚本（3个）→ `scripts/deployment/`:
- `complete-deployment.sh`
- `deploy-all.sh`
- `deploy-subgraph-interactive.sh`

设置脚本（4个）→ `scripts/setup/`:
- `install-postgresql.sh`
- `install-with-password.sh`
- `setup-bot-interactive.sh`
- `setup-for-test.sh`

通用脚本（2个）→ `scripts/`:
- `quick-start.sh`
- `test-all-features.sh`

**结果**:
- ✅ 根目录从 15+ 个 .md 文件减少到 6 个核心文档
- ✅ 根目录从 10+ 个脚本减少到 0 个
- ✅ 文档和脚本都有了清晰的分类
- ✅ 项目结构更加专业和易于维护

---

**文档版本**: v1.0  
**创建时间**: 2026-02-16  
**维护者**: ILAL Team
