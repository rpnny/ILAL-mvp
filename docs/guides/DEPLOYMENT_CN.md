# ILAL 部署指南

## 概述

本文档描述如何将 ILAL (Institutional Liquidity Access Layer) 部署到 Base 网络。

## 前置条件

### 1. 环境准备

```bash
# 安装依赖
cd contracts && forge install
cd ../frontend && npm install
cd ../subgraph && npm install
cd ../bot && npm install
```

### 2. 环境变量

创建 `.env` 文件：

```bash
# 部署者私钥
PRIVATE_KEY=0x...

# RPC URLs
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# 治理多签地址
GOVERNANCE_ADDRESS=0x...

# Verifier 合约地址 (PLONK Verifier)
VERIFIER_ADDRESS=0x...

# Etherscan API Key (用于验证合约)
BASESCAN_API_KEY=...
```

## Base Sepolia 测试网部署

### 1. 部署合约

```bash
cd contracts

# 部署所有合约
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify \
  -vvvv
```

### 2. 记录部署地址

部署完成后，记录以下地址：
- Registry
- SessionManager
- ComplianceHook
- PositionManager
- Verifier

### 3. 配置后端

更新 `frontend/lib/contracts.ts` 中的地址：

```typescript
const ADDRESSES: Record<number, ContractAddresses> = {
  84532: { // Base Sepolia
    registry: '0x...',
    sessionManager: '0x...',
    complianceHook: '0x...',
    positionManager: '0x...',
    verifier: '0x...',
  },
};
```

### 4. 部署子图

```bash
cd subgraph

# 更新配置
vim config/base-sepolia.json

# 准备并部署
npm run prepare:base-sepolia
npm run codegen
npm run build
npm run deploy
```

### 5. 启动前端

```bash
cd frontend
npm run dev
```

## Base Mainnet 部署

### 1. 安全检查清单

- [ ] 所有测试通过
- [ ] 审计完成
- [ ] 多签钱包已设置
- [ ] 紧急暂停机制已测试
- [ ] Gas 估算已完成

### 2. 部署合约

```bash
cd contracts

# 使用 Mainnet 部署脚本
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --verify \
  -vvvv
```

### 3. 部署后配置

使用多签执行以下操作：

```solidity
// 1. 授予 Verifier 角色
sessionManager.grantRole(VERIFIER_ROLE, verifierAddress);

// 2. 注册 Issuer
registry.registerIssuer(
  keccak256("Coinbase"),
  coinbaseAttesterAddress,
  verifierAddress
);

// 3. 批准 Router
registry.approveRouter(uniswapRouterAddress, true);
```

### 4. 更新配置

1. 更新 `frontend/lib/contracts.ts` 添加 Mainnet 地址
2. 更新 `subgraph/config/base-mainnet.json`
3. 更新 `bot/config.yaml`

### 5. 部署子图

```bash
cd subgraph
npm run prepare:base-mainnet
npm run codegen
npm run build
npm run deploy
```

## 监控和维护

### 健康检查

- 定期检查 Session 状态
- 监控 Gas 价格
- 检查合约余额

### 紧急响应

如果发现安全问题：

```solidity
// 暂停系统
registry.setEmergencyPause(true);
```

### 升级流程

1. 部署新的实现合约
2. 通过多签提交升级提案
3. 等待时间锁
4. 执行升级

```solidity
// 升级 Registry
registry.upgradeToAndCall(newImplementation, "");

// 升级 SessionManager
sessionManager.upgradeToAndCall(newImplementation, "");
```

## 合约地址

### Base Sepolia (测试网)

| 合约 | 地址 |
|------|------|
| Registry | `待部署` |
| SessionManager | `待部署` |
| ComplianceHook | `待部署` |
| PositionManager | `待部署` |
| Verifier | `待部署` |

### Base Mainnet

| 合约 | 地址 |
|------|------|
| Registry | `待部署` |
| SessionManager | `待部署` |
| ComplianceHook | `待部署` |
| PositionManager | `待部署` |
| Verifier | `待部署` |

## 外部依赖

### Uniswap v4 PoolManager

| 网络 | 地址 |
|------|------|
| Base Sepolia | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |
| Base Mainnet | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |

## 故障排除

### 常见问题

1. **交易失败：Session 未激活**
   - 确保用户已通过验证
   - 检查 Session 是否过期

2. **交易失败：未授权的 Router**
   - 确保 Router 已在 Registry 中批准

3. **部署失败：Gas 不足**
   - 增加 Gas 限制
   - 检查账户余额

### 联系方式

- 技术支持：[email]
- 安全问题：[security email]
