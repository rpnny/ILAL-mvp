# 🔍 Swap 调试指南

## 当前状态

✅ **已修复的问题**:
1. Pool 读取 - 使用 `extsload` 替代不存在的 `getSlot0`
2. 价格计算 - 修复精度调整方向
3. 授权目标 - 改为授权给 SimpleSwapRouter
4. amountSpecified - 修复为负数（exact input）

✅ **确认正常的**:
- Pool 已初始化（sqrtPriceX96 正常，1 WETH ≈ 3022 USDC）
- Pool 有流动性（2,000,000,000,000）
- Session 已激活
- 合约已部署
- ETH 余额充足（0.005220 ETH）
- USDC 余额充足（17.72 USDC）

❌ **当前问题**:
- Swap 交易 revert
- 错误: `WrappedError(address,bytes4,bytes,bytes)` (0x90bfb865)
- 这是一个**包装错误**，包含了真实的底层错误

---

## 📋 请帮我收集信息

### 步骤 1: 刷新页面并清空控制台
1. 刷新 http://localhost:3000/trade
2. F12 → Console → 清空（点击 🚫）

### 步骤 2: 重试 Swap
1. 输入 **0.1 USDC**（小金额测试）
2. 点击 **Swap**

### 步骤 3: 查看控制台中的详细错误

你应该看到类似这样的日志：
```
[Swap] Gas estimation failed: ...
[Swap] Simulation failed: ...
```

**重要**：请展开红色错误（点击三角形 ▶），找到：
- `cause` 字段
- `data` 字段（应该是一个很长的十六进制字符串）
- `details` 字段

**把这些字段的内容复制给我**（特别是 `data` 字段）

---

## 🔧 可能的错误和解决方案

### 错误 1: NotVerified (0xb12c8f91)
**原因**: Session 未激活或已过期
**解决**: 重新完成身份验证

### 错误 2: CurrencyNotSettled (?)
**原因**: 代币结算失败（SimpleSwapRouter._settle）
**解决**: 检查授权和余额

### 错误 3: ERC20TransferFailed (?)
**原因**: USDC 转账失败
**解决**: 确认 USDC approve 给了 SimpleSwapRouter

### 错误 4: ManagerLocked (0x54e3ca0d)
**原因**: PoolManager 处于锁定状态
**解决**: 可能是重入问题，需要检查合约逻辑

---

## 🎯 下一步

一旦你给我完整的错误数据（特别是 `data` 字段），我就能：
1. 解析 `WrappedError` 参数
2. 找出真实的底层错误
3. 精确修复问题

请把控制台中红色错误的**完整内容**（包括展开后的 cause/data/details）复制给我！
