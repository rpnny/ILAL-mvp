# Swap 调试报告

**时间**: 2026-02-11  
**错误码**: 0x7c9c6e8f  
**错误类型**: CurrenciesOutOfOrderOrEqual

---

## 问题描述

Swap 交易持续失败，错误码 `0x7c9c6e8f` 对应 Uniswap v4 的 `CurrenciesOutOfOrderOrEqual` 错误。

### 错误数据

```
0x7c9c6e8f
000000000000000000000000fffd8963efd1fc6a506488495d951d5263988d25
000000000000000000000000fffd8963efd1fc6a506488495d951d5263988d25
```

**异常点**: 两个地址相同 `0xfffd8963...`，这不应该发生。

---

## 尝试的修复

### ✅ 已确认正确

1. **代币顺序正确**
   - USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
   - WETH: 0x4200000000000000000000000000000000000006
   - USDC < WETH ✓ (正确顺序)

2. **Router 已批准**
   - SimpleSwapRouter 在 Registry 白名单中 ✓

3. **代币授权完成**
   - USDC → Router: 1T  ✓
   - WETH → Router: 1 ✓

4. **Session 激活**
   - isSessionActive: true ✓
   - 剩余时间: 81065秒 ✓

5. **流动性已添加**
   - Position #1: 1,804,870,827,924 liquidity
   - Tick range: [196260, 201560]
   - ✅ 成功交易

### ⚠️ 尝试的方向

1. **WETH → USDC (zeroForOne: false)**
   - Amount: 0.001 WETH
   - Result: ❌ 0x7c9c6e8f

2. **USDC → WETH (zeroForOne: true)**
   - Amount: 1 USDC
   - Result: ❌ 0x7c9c6e8f

---

## 根本原因分析

### 可能原因 1: Pool 未正确初始化

**症状**:
- Pool 调用返回 PoolAlreadyInitialized
- 但 getSlot0 查询失败 (execution reverted)

**推测**:
- Pool 可能在之前被错误参数初始化
- 或 Pool 数据损坏

### 可能原因 2: Hook 地址问题

**症状**:
- Hook: 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80
- 错误数据包含未知地址 0xfffd8963...

**推测**:
- Hook 可能在验证时返回了错误数据
- 或 PoolManager 内部将 Hook 地址转换错误

### 可能原因 3: PoolKey 编码问题

**症状**:
- PoolKey 看起来正确
- 但 PoolManager 验证时失败

**推测**:
- PoolKey 的哈希计算可能不匹配
- 或 Pool ID 映射错误

---

## 建议修复方案

### 方案 1: 重新部署 Pool (推荐)

**步骤**:
1. 部署新的 ComplianceHook v3 (不同地址)
2. 用新 Hook 初始化新 Pool
3. 迁移流动性
4. 更新所有配置

**优点**: 完全从头开始，避免遗留问题  
**缺点**: 需要重新部署多个合约

### 方案 2: 使用不同的 fee tier

**步骤**:
1. 初始化 fee=3000, tickSpacing=60 的池子
2. 测试 Swap
3. 如果成功，说明问题在 fee=500 的池子

**优点**: 快速测试  
**缺点**: 可能只是绕过问题

### 方案 3: 直接调用 PoolManager (调试)

**步骤**:
1. 跳过 SimpleSwapRouter
2. 直接实现 IUnlockCallback
3. 在 unlockCallback 中调用 PoolManager.swap
4. 观察详细错误

**优点**: 获取更多调试信息  
**缺点**: 需要编写测试合约

---

## 技术细节

### PoolKey 计算

```solidity
PoolKey memory key = PoolKey({
    currency0: Currency.wrap(0x036CbD53842c5426634e7929541eC2318f3dCF7e),
    currency1: Currency.wrap(0x4200000000000000000000000000000000000006),
    fee: 500,
    tickSpacing: 10,
    hooks: IHooks(0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80)
});

bytes32 poolId = keccak256(abi.encode(key));
// 计算结果: 0x898e5a4125262a3b7943502d00571221712cb355990954861a14a5e2ab94ebf9
```

### 流动性范围分析

| Position | Tick Range | 当前 Tick | 可用性 |
|----------|-----------|----------|--------|
| 原有 | [190700, 196250] | 196250 | ✅ 边界上 |
| #1 (新) | [196260, 201560] | 196250 | ⚠️ 上方 |

**问题**: 当前 tick (196250) 正好在第一个流动性的上边界，可能不稳定。

### Swap 方向与流动性

- **zeroForOne = true (USDC → WETH)**: 价格上升，tick 增加
  - 应使用 tick > 196250 的流动性
  - 即 [196260, 201560] ✅

- **zeroForOne = false (WETH → USDC)**: 价格下降，tick 减少
  - 应使用 tick < 196250 的流动性
  - 即 [190700, 196250] ✅

**理论上两个方向都应该可行**

---

## 下一步行动

### 立即行动 (推荐)

1. **部署诊断合约**
   ```solidity
   contract SwapDiagnostic is IUnlockCallback {
       function testSwap() external {
           // 直接测试 PoolManager.swap
           // 捕获详细错误信息
       }
   }
   ```

2. **验证 Pool 状态**
   ```bash
   # 使用 foundry 读取 Pool 存储
   cast storage 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408 <slot>
   ```

3. **测试其他 fee tier**
   ```bash
   # 初始化 fee=10000 的池子
   forge script script/InitializePool10000.s.sol --broadcast
   ```

### 临时解决方案

**绕过 Swap 测试，先验证其他功能**:
- ✅ Wrap: 正常
- ✅ Session: 正常
- ✅ 添加流动性: 正常
- ❌ Swap: 待修复

**项目整体就绪度**: 75% (3/4 核心功能正常)

---

## 结论

**问题严重性**: 🟡 中等

**影响范围**: Swap 功能

**建议**: 
1. 短期: 使用其他 Pool 或重新初始化
2. 中期: 排查 PoolManager/Hook 交互
3. 长期: 添加更详细的错误处理和诊断工具

**Ondo 就绪度**: 
- 合规层: ✅ 完全就绪
- 流动性管理: ✅ 完全就绪
- Swap 功能: ⚠️ 需要修复

---

*报告生成: 2026-02-11 13:15 UTC*
