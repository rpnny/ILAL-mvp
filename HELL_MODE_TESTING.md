# 🔥 ILAL "地狱级"测试清单

## 测试执行指南

**在上线前，所有测试必须打钩通过 ✅。任何一项失败，绝对不能上线。**

---

## 1️⃣ 核心逻辑单元测试 (Unit Testing) - 基础防线

> 在 Foundry 中运行：`forge test -vvv`

### Hook 准入测试 (The Gatekeeper)

- [x] **白名单通过**: 已验证用户 (Session 有效) 调用 Swap，交易成功
  - ✅ 实现：`test_BeforeSwap_Allowed()`
  - 📁 文件：`contracts/test/unit/ComplianceHook.t.sol`

- [x] **黑名单拦截**: 未验证用户调用 Swap，交易 Revert
  - ✅ 实现：`testFail_BeforeSwap_NotVerified()`
  - 📁 文件：`contracts/test/unit/ComplianceHook.t.sol`

- [x] **过期拦截**: Session 过期 (25h 后) 调用 Swap，交易 Revert
  - ✅ 实现：`test_E2E_CompleteUserJourney()` 步骤 4-5
  - 📁 文件：`contracts/test/integration/E2E.t.sol`

- [ ] **伪造拦截**: 错误的 hookData (签名/地址不对)，Hook 拦截
  - ⚠️ **需补充**：测试错误 EIP-712 签名
  - 📝 见下方：`test_Hell_FakeSignature()`

### 流动性测试 (Liquidity)

- [x] **添加流动性**: 未验证用户 addLiquidity 失败
  - ✅ 实现：`testFail_BeforeAddLiquidity_NotVerified()`
  - 📁 文件：`contracts/test/unit/ComplianceHook.t.sol`

- [ ] **移除流动性（紧急模式）**: 紧急暂停时，验证用户仍可移除流动性
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_EmergencyWithdrawal()`

- [ ] **NFT 转让**: 尝试转账 LP NFT，必须失败
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_NFTTransferBlocked()`

### Registry 权限测试 (The Brain)

- [ ] **非管理员操作**: 普通账号调用 `registerIssuer` / `setEmergencyPause`，必须 Revert
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_UnauthorizedAccess()`

- [ ] **升级测试**: 部署新逻辑合约，执行 `upgradeTo`，检查旧数据是否保留
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_UpgradePreservesData()`

---

## 2️⃣ 集成与 Fork 测试 (Integration & Fork Testing) - 实战演习

> 在 Base 主网 Fork 上运行：`forge test --fork-url $BASE_RPC_URL -vvv`

### Uniswap v4 真实交互

- [ ] **真实 Router**: 调用 Base 上的真实 Universal Router，传入 hookData
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_RealRouterIntegration()`
  - 🌐 Base Universal Router: `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD`

- [ ] **Gas 消耗**: 记录 Swap Gas，比普通 Swap 多出不超过 15,000 Gas
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_GasConsumption()`
  - 🎯 目标：< 215,000 Gas (普通 Swap ~200k)

### ZK 电路验证 (The Black Box)

- [ ] **真实 Proof**: 前端生成真实 Proof，合约 `verifyProof` 通过
  - ⚠️ **需手动测试**（需要真实 PlonkVerifier）
  - 📝 步骤：
    1. `cd circuits/scripts && ./setup.sh`
    2. `node generate-proof.js`
    3. 将 `calldata.txt` 传入合约测试

- [ ] **防重放 - 跨用户**: 用户 A 的 Proof 无法为用户 B 开 Session
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_ProofReplayCrossUser()`

- [ ] **防重放 - 时间**: 昨天的 Proof 今天无法使用
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_ProofReplayOldProof()`

---

## 3️⃣ 安全与极端场景 (Security & Edge Cases) - 黑客视角

> 模拟攻击场景

### 紧急逃生舱 (Escape Hatch)

- [x] **熔断测试**: `setEmergencyPause(true)` 后，Swap 和 Add Liquidity 失败
  - ✅ 实现：`test_E2E_EmergencyPause()`
  - 📁 文件：`contracts/test/integration/E2E.t.sol`

- [ ] **撤资测试（关键）**: 紧急模式下，Remove Liquidity 必须成功
  - ⚠️ **需补充**
  - 📝 见下方：`test_Hell_EmergencyWithdrawal()`
  - 💰 **机构最看重的安全感**

### 模糊测试 (Fuzzing / Invariant Tests)

- [x] **不变量 A**: 未验证用户的 `isSessionActive` 永远为 `false`
  - ✅ 实现：`invariant_unverifiedUserBalanceZero()`
  - 📁 文件：`contracts/test/invariant/ComplianceInvariant.t.sol`

- [x] **不变量 B**: Registry Owner 永远不是零地址
  - ✅ 实现：在 `Registry.sol` 的 `initialize()` 中强制检查

- [ ] **运行模糊测试**: 执行 Foundry Invariant Testing (256 runs)
  - ⚠️ **需手动运行**
  - 📝 命令：`forge test --match-contract Invariant -vvv`

---

## 4️⃣ 前端与用户体验测试 (UX Testing)

> 在真实浏览器环境测试

### ZK 生成性能

- [ ] **低配电脑测试**: 5 年前的笔记本，Proof 生成 < 30 秒
  - ⚠️ **需手动测试**
  - 📝 工具：Chrome DevTools Performance Monitor
  - 🎯 目标：首次 < 30s，后续 < 20s

- [ ] **进度反馈**: 前端显示 Loading 动画和进度百分比
  - ⚠️ **需手动测试**
  - 📁 文件：`frontend/components/VerificationFlow.tsx`

### 钱包兼容性

- [ ] **MetaMask 测试**: 连接、签名、交易全流程
  - ⚠️ **需手动测试**

- [ ] **Coinbase Wallet 测试（重点）**: Base 链核心用户群
  - ⚠️ **需手动测试**
  - 🎯 Coinbase Wallet 是 Base 生态的主要钱包

- [ ] **Rainbow Wallet 测试**: 测试 RainbowKit 集成
  - ⚠️ **需手动测试**

---

## 📋 测试统计

| 类别 | 已实现 | 待补充 | 需手动 | 总计 |
|------|--------|--------|--------|------|
| **核心单元测试** | 3 | 5 | 0 | 8 |
| **集成 Fork 测试** | 0 | 4 | 1 | 5 |
| **安全极端场景** | 2 | 1 | 1 | 4 |
| **前端 UX 测试** | 0 | 0 | 5 | 5 |
| **总计** | **5** | **10** | **7** | **22** |

**完成度**: 5/22 = **23%** 🟡

---

## 🚀 快速执行

### 运行现有测试

```bash
cd /Users/ronny/Desktop/ilal/contracts

# 1. 单元测试
forge test -vvv

# 2. 指定测试文件
forge test --match-path test/unit/ComplianceHook.t.sol -vvv

# 3. 集成测试
forge test --match-path test/integration/E2E.t.sol -vvv

# 4. Invariant 测试
forge test --match-contract Invariant -vvv

# 5. Gas 报告
forge test --gas-report
```

### 运行 Fork 测试（需要 RPC）

```bash
# 设置 Base 主网 RPC
export BASE_RPC_URL="https://mainnet.base.org"

# Fork 测试
forge test --fork-url $BASE_RPC_URL --match-test "test_Hell_Real" -vvv
```

---

## ⚠️ 测试前提条件

### 工具链已安装

- [x] Foundry (`foundryup`)
- [x] Circom (`cargo install circom`)
- [x] SnarkJS (`npm install -g snarkjs`)
- [x] Node.js >= 18

### 依赖已安装

```bash
cd contracts
./install-deps.sh
forge build
```

### ZK 电路已编译

```bash
cd circuits/scripts
npm install
./compile.sh
./setup.sh  # 生成 PlonkVerifier.sol
```

---

## 📝 补充测试实现

以下是需要添加的测试代码，放在 `contracts/test/hell/HellMode.t.sol`：

**下一步**：我会立即创建这个文件 👇
