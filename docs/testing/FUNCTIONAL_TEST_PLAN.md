# ILAL 功能测试计划

## 📋 测试概览

本文档提供 ILAL 基础设施的系统化功能测试方案。

**测试日期**: 2026-02-16  
**测试范围**: 核心功能验证（非生产环境部署测试）

## 🎯 测试目标

验证 ILAL 基础设施的以下核心功能：

1. ✅ **智能合约**: 核心逻辑正确性（Registry、SessionManager、ComplianceHook）
2. ✅ **ZK 电路**: 证明生成和验证流程
3. ✅ **SDK**: API 接口和类型安全
4. ✅ **API 服务**: SaaS 功能和数据库集成
5. ✅ **集成测试**: 端到端流程验证

## 📊 测试层级

### Level 1: 单元测试（Unit Tests）
**目的**: 验证各组件独立功能  
**工具**: Foundry (合约), Vitest (SDK)  
**运行时间**: ~2-5 分钟

### Level 2: 集成测试（Integration Tests）
**目的**: 验证组件间交互  
**工具**: Foundry (E2E.t.sol, PlonkIntegration.t.sol)  
**运行时间**: ~5-15 分钟

### Level 3: 系统测试（System Tests）
**目的**: 验证完整业务流程  
**工具**: scripts/system-test/mock-theater.ts  
**运行时间**: ~10-30 分钟  
**需要**: 本地节点 + 已部署合约

## 🧪 测试清单

### 1️⃣ 智能合约测试

#### 1.1 单元测试
```bash
cd packages/contracts
forge test --match-path "test/unit/*.sol" -vv
```

**测试文件**:
- ✅ `Registry.t.sol` - 注册表管理
- ✅ `SessionManager.t.sol` - Session 生命周期
- ✅ `EIP712Verifier.t.sol` - 签名验证
- ✅ `ComplianceHook.t.sol` - Hook 逻辑

**预期结果**: 所有单元测试通过

#### 1.2 集成测试
```bash
cd packages/contracts
forge test --match-path "test/integration/*.sol" -vv
```

**测试文件**:
- ✅ `E2E.t.sol` - 端到端流程（Mock Proof）
- ✅ `PlonkIntegration.t.sol` - PLONK 验证器集成
- ✅ `FullFlow.t.sol` - 完整交易流程
- ✅ `SwapRouterTest.t.sol` - 路由器测试

**预期结果**: 集成测试通过（可能需要 RPC）

#### 1.3 压力测试（可选）
```bash
cd packages/contracts
forge test --match-path "test/hell/*.sol" -vvv
```

**注意**: Hell Mode 测试较慢，仅在性能优化时运行

---

### 2️⃣ SDK 测试

```bash
cd packages/sdk
pnpm test
```

**测试覆盖**:
- ✅ 类型定义
- ✅ 合约接口
- ✅ 工具函数
- ✅ 错误处理

**预期结果**: Vitest 测试套件通过

---

### 3️⃣ ZK 电路验证

#### 3.1 编译电路
```bash
cd packages/circuits
pnpm run compile
```

**预期输出**:
- `build/compliance.r1cs`
- `build/compliance.wasm`
- `build/compliance_js/`

#### 3.2 生成测试证明
```bash
cd packages/circuits
pnpm run generate-proof
```

**预期结果**: 生成 proof.json 和 public.json

---

### 4️⃣ API 服务测试

#### 4.1 配置检查
```bash
cd apps/api
cp .env.example .env
# 编辑 .env 填写必要配置
pnpm run db:generate
```

#### 4.2 启动服务（可选）
```bash
cd apps/api
pnpm run dev
```

**检查点**:
- ✅ 服务启动在 `http://localhost:3001`
- ✅ 数据库连接成功
- ✅ Prisma 客户端生成

**手动测试 API**:
```bash
# 健康检查
curl http://localhost:3001/health

# 注册用户
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

### 5️⃣ 系统集成测试（需要部署）

⚠️ **前置条件**:
- 本地 Anvil 节点运行
- 合约已部署
- 配置文件正确

```bash
cd scripts/system-test
cp mock-theater-config.example.env mock-theater-config.env
# 编辑配置文件
./run-theater.sh
```

**测试流程**:
1. 部署合约
2. 初始化池子
3. 生成 ZK Proof
4. 激活 Session
5. 执行 Swap
6. 添加流动性

---

## 📈 测试报告模板

### 测试执行记录

| 测试项 | 状态 | 通过/总数 | 耗时 | 备注 |
|--------|------|-----------|------|------|
| 合约单元测试 | ⏳ | - / - | - | - |
| 合约集成测试 | ⏳ | - / - | - | - |
| SDK 测试 | ⏳ | - / - | - | - |
| ZK 电路编译 | ⏳ | - / - | - | - |
| API 服务启动 | ⏳ | - / - | - | - |
| 系统集成测试 | ⏳ | - / - | - | - |

### 测试环境

- **操作系统**: macOS 25.2.0
- **Node 版本**: (待检查)
- **Foundry 版本**: (待检查)
- **PNPM 版本**: 8.15.0

---

## 🚨 常见问题

### 1. Foundry 测试失败
- **问题**: RPC 连接错误
- **解决**: 检查 `.env` 中的 RPC URL 或使用 `--fork-url`

### 2. SDK 测试失败
- **问题**: 类型错误
- **解决**: 运行 `pnpm install` 确保依赖安装

### 3. ZK 电路编译失败
- **问题**: circom 未安装
- **解决**: 参考 `packages/circuits/README.md` 安装 circom

### 4. API 服务启动失败
- **问题**: 数据库连接错误
- **解决**: 检查 `DATABASE_URL` 配置，确保 PostgreSQL/Supabase 可访问

---

## ✅ 快速验证（5 分钟）

如果时间有限，运行以下核心测试：

```bash
# 1. 合约核心单元测试
cd packages/contracts && forge test --match-path "test/unit/Registry.t.sol" -vv

# 2. SDK 类型检查
cd packages/sdk && pnpm run type-check

# 3. API 配置验证
cd apps/api && pnpm run db:generate

# 4. ZK 电路存在性检查
ls packages/circuits/build/
```

---

## 📝 测试结果记录位置

将测试结果保存至:
- `docs/testing/TEST_RESULTS_[DATE].md`

---

**创建日期**: 2026-02-16  
**维护者**: ILAL 团队  
**版本**: 1.0
