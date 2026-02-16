# ILAL Mock Theater - 对手戏测试脚本使用指南

## 📖 概述

这个脚本模拟两个账户在 Base Sepolia 上的真实交互场景：

- **账户 A (机构巨鲸)**: 添加大额流动性，模拟机构级深度
- **账户 B (高频交易员)**: 频繁执行 Swap，制造交易量和手续费

这将在链上生成真实的交易历史，用于演示和测试。

## 🎯 场景设定

### 账户 A - 机构巨鲸 (Institution)
- **地址**: `0xC61d6115fcFcbA97Bd44Cb013C877bD0ef868dB3`
- **角色**: 流动性提供者
- **动作**:
  - 添加大额流动性（0.1-0.5 WETH）
  - 定期调整流动性范围
  - 模拟主动管理策略
- **目的**: 证明协议能承载机构级深度

### 账户 B - 高频交易员 (Trader)
- **地址**: `0xF40493ACDd33cC4a841fCD69577A66218381C2fC`
- **角色**: 活跃交易者
- **动作**:
  - 频繁小额/中额 Swap（10-100 USDC）
  - 随机交易方向（USDC ↔ WETH）
  - 每轮执行 2-3 次交易
- **目的**: 
  - 制造交易量 (Volume)
  - 产生手续费收入 (Fees)
  - 测试滑点 (Slippage)

## 🚀 快速开始

### 1. 前置要求

- Node.js 18+
- 两个测试账户的私钥
- 治理钱包有足够的测试代币（USDC、WETH、ETH）

### 2. 配置私钥

创建配置文件：

```bash
cd /Users/ronny/Desktop/ilal/scripts/system-test
cp mock-theater-config.example.env mock-theater-config.env
```

编辑 `mock-theater-config.env`，填入私钥：

```bash
ACCOUNT_A_KEY=0x你的账户A私钥
ACCOUNT_B_KEY=0x你的账户B私钥
```

### 3. 运行脚本

```bash
# 加载环境变量并运行
source mock-theater-config.env && tsx mock-theater.ts
```

或者直接在命令行设置：

```bash
export ACCOUNT_A_KEY="0x..."
export ACCOUNT_B_KEY="0x..."
tsx mock-theater.ts
```

## 📊 脚本流程

### 阶段 1: 初始化设置 (约 1 分钟)
1. ✅ 确保 PositionManager 在白名单
2. 💰 分发测试资金:
   - 账户 A: 0.05 ETH + 0.5 WETH
   - 账户 B: 0.05 ETH + 10,000 USDC + 0.1 WETH
3. 🔐 激活两个账户的 Session
4. 📊 显示初始余额

### 阶段 2: 对手戏循环 (默认 5 轮，约 5-10 分钟)

每轮包含：

**1️⃣ 账户 A 的动作**
- 第 1 轮: 添加初始流动性（0.1 WETH）
- 第 3 轮: 增加流动性（模拟主动管理）

**2️⃣ 账户 B 的动作**
- 执行 2-3 次随机 Swap
- 每次间隔 10 秒
- 金额: 10-100 USDC
- 方向: 随机（USDC → WETH 或 WETH → USDC）

**3️⃣ 状态检查**
- 每 2 轮显示余额变化
- 记录所有交易哈希

### 阶段 3: 最终统计
- 📊 显示两个账户的最终余额
- 🔗 提供 Basescan 查询链接
- ✅ 生成链上记录报告

## 📈 预期结果

### 链上记录 (Transaction History)

运行完成后，你将在 Basescan 上看到：

**账户 A 的交易历史:**
- ✅ Session 激活
- ✅ WETH Approve
- ✅ 添加流动性（mint）
- ✅ 增加流动性（增量调整）

**账户 B 的交易历史:**
- ✅ Session 激活
- ✅ USDC/WETH Approve
- ✅ 10+ 次 Swap 交易
- ✅ 双向交易记录

### 演示价值

这些链上记录将展示：

1. **机构级深度**: 账户 A 的大额流动性证明协议可承载机构资金
2. **交易活跃度**: 账户 B 的频繁交易展示真实市场活动
3. **合规验证**: 所有交易通过 ComplianceHook 验证
4. **手续费收入**: 每次 Swap 产生的手续费（0.05%）
5. **价格影响**: 测试滑点和价格曲线

## 🎛️ 高级配置

### 调整测试参数

编辑 `mock-theater.ts` 中的配置：

```typescript
// 修改轮数
const ROUNDS = 10; // 默认 5

// 修改 Swap 间隔
const SWAP_INTERVAL = 5000; // 默认 10000 (10秒)

// 修改流动性金额
await accountA_AddLiquidity(walletA, '0.5'); // 默认 '0.1'

// 修改 Swap 金额范围
const amount = randomAmount(50, 200).toFixed(2); // 默认 (10, 100)
```

### 修改资金分配

```typescript
// 增加初始资金
await distributeTestFunds(accountA.address, '0.1', '0', '1.0');  // 更多 WETH
await distributeTestFunds(accountB.address, '0.1', '50000', '0.5');  // 更多 USDC
```

## 🔍 监控和调试

### 查看实时日志

脚本会输出详细的执行日志：

```
═══════════════════════════════════════════════════════════════
  阶段 1: 初始化设置
═══════════════════════════════════════════════════════════════
  ✅  PositionManager 已在白名单
  
═══════════════════════════════════════════════════════════════
  💰 分发资金给 0xC61d6115...
═══════════════════════════════════════════════════════════════
  ⛽  发送 0.05 ETH...
  ✅  ETH 已发送 (0x7f3b2c1a4e...)
  💎  Wrap 并发送 0.5 WETH...
  ✅  WETH 已发送 (0x9a4c5d8f...)
```

### 查看链上交易

访问以下链接查看实时交易：

- 账户 A: `https://sepolia.basescan.org/address/0xC61d6115fcFcbA97Bd44Cb013C877bD0ef868dB3`
- 账户 B: `https://sepolia.basescan.org/address/0xF40493ACDd33cC4a841fCD69577A66218381C2fC`
- Pool 合约: `https://sepolia.basescan.org/address/0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`

### 常见错误处理

**错误: "NotVerified"**
- 原因: Session 未激活或已过期
- 解决: 脚本会自动重新激活

**错误: "insufficient funds"**
- 原因: 治理钱包余额不足
- 解决: 确保 `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D` 有足够的 ETH/USDC/WETH

**错误: "PoolNotInitialized"**
- 原因: Pool 未初始化
- 解决: 先运行 `tsx initialize-pool.ts`

## 📝 测试检查清单

完成测试后，确认以下项目：

- [ ] 账户 A 成功添加流动性
- [ ] 账户 B 完成至少 10 次 Swap
- [ ] 所有交易在 Basescan 可查
- [ ] 余额变化符合预期
- [ ] 手续费已累积
- [ ] 无 revert 交易

## 🎬 演示技巧

在演示时，可以：

1. **展示账户 A 的流动性头寸**
   - 在 Basescan 查看 PositionManager 的 Transfer 事件
   - 显示流动性范围和金额

2. **展示账户 B 的交易活跃度**
   - 展示高频 Swap 的交易列表
   - 计算总交易量和手续费

3. **展示价格影响**
   - 对比大额和小额交易的滑点
   - 展示流动性深度的作用

4. **展示合规验证**
   - 所有交易都通过 ComplianceHook 验证
   - 展示 Session 管理机制

## 🛠️ 技术细节

### 流动性计算

```typescript
// 单边 WETH 流动性
tickLower = 196260  // 当前价格附近
tickUpper = 201560  // 约 5000 USDC/WETH

// L = amount1 / (sqrt(price_upper) - sqrt(price_lower))
// price = 1.0001^tick
```

### Swap 参数

```typescript
// USDC → WETH (zeroForOne = true)
amountSpecified: -swapAmount  // 负数 = exactInput
sqrtPriceLimitX96: 4295128740  // MIN_SQRT_PRICE + 1

// WETH → USDC (zeroForOne = false)
sqrtPriceLimitX96: 1461446703485210103287273052203988822378723970341  // MAX_SQRT_PRICE - 1
```

### HookData 格式

```typescript
// 白名单路由模式: 仅传用户地址 (20 bytes)
const hookData = userAddress as Hex;
```

## 📚 相关文档

- [ILAL 完整文档](../../docs/)
- [Pool 初始化指南](./README.md)
- [Swap 测试指南](./e2e-swap.ts)
- [流动性管理指南](./add-liquidity.ts)

## 💡 提示

- **首次运行**: 建议先用较少的资金和轮数测试（1-2 轮）
- **Gas 优化**: 可以批量 approve 减少交易数
- **时间安排**: 完整测试（5 轮）约需 10-15 分钟
- **网络稳定**: 使用稳定的 RPC 端点避免超时

## 🆘 获取帮助

遇到问题？

1. 检查日志输出中的错误信息
2. 在 Basescan 查看 revert 原因
3. 确认治理钱包余额充足
4. 检查 Session 是否激活

---

**准备好了吗？开始你的对手戏表演！** 🎭
