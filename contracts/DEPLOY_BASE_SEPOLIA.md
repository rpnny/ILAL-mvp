# 🌐 Base Sepolia 测试网部署指南

**目标**: 将 ILAL 合约部署到 Base Sepolia 公开测试网  
**预计时间**: 30-45 分钟  
**难度**: 中等

---

## 📋 准备清单

### 1. 账户和资金

- [ ] 部署者钱包地址
- [ ] 部署者私钥（安全存储在 `.env`）
- [ ] Base Sepolia ETH（至少 0.5 ETH）
  - 获取方式: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
  - 或使用 Bridge 从 Sepolia 桥接

### 2. RPC 配置

- [ ] Base Sepolia RPC URL
  - 推荐: [Alchemy](https://www.alchemy.com/) 或 [Infura](https://www.infura.io/)
  - 公共 RPC: `https://sepolia.base.org`

### 3. Etherscan API Key

- [ ] Basescan API Key (用于合约验证)
  - 获取: https://basescan.org/myapikey
  - 注册账号后免费获取

### 4. Uniswap v4 配置

- [ ] Base Sepolia PoolManager 地址
  - 检查: [Uniswap v4 Deployments](https://docs.uniswap.org/contracts/v4/deployments)
  - 如果未部署，使用占位符或部署自己的 PoolManager

---

## 🔧 步骤 1: 配置环境变量

创建 `contracts/.env` 文件：

```bash
cd /Users/ronny/Desktop/ilal/contracts
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# ============ 部署配置 ============

# 部署者私钥 (⚠️ 请使用测试账户，不要使用主网私钥！)
PRIVATE_KEY=0x你的私钥

# 治理多签地址 (可选，默认使用部署者地址)
GOVERNANCE_ADDRESS=0x你的治理地址

# ============ 网络配置 ============

# Base Sepolia 测试网
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
# 或使用 Alchemy/Infura:
# BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Etherscan API Key (用于合约验证)
BASESCAN_API_KEY=你的_BASESCAN_API_KEY

# ============ Uniswap v4 配置 ============

# Base Sepolia PoolManager 地址
# 如果不知道，先留空，使用占位符部署
POOL_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000

# ============ 验证器配置 ============

# 使用 PLONK 验证器 (生产环境)
USE_PLONK_VERIFIER=true
```

---

## 🚀 步骤 2: 验证配置

运行配置检查：

```bash
# 检查账户余额
cast balance $DEPLOYER_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL

# 检查 Gas Price
cast gas-price --rpc-url $BASE_SEPOLIA_RPC_URL

# 检查链 ID (应该是 84532)
cast chain-id --rpc-url $BASE_SEPOLIA_RPC_URL

# 预估部署成本
# 约 5,000,000 gas * gas_price
```

---

## 📜 步骤 3: 执行部署

### 选项 A: 使用 forge script (推荐)

```bash
cd /Users/ronny/Desktop/ilal/contracts

# 1. 模拟部署 (不广播)
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --sender $DEPLOYER_ADDRESS

# 2. 实际部署 (需要确认)
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv

# 3. 如果验证失败，手动验证
forge verify-contract \
  <CONTRACT_ADDRESS> \
  <CONTRACT_NAME> \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 选项 B: 使用环境变量文件

创建部署脚本：

```bash
#!/bin/bash
# deploy-base-sepolia.sh

set -e

source .env

echo "🚀 Deploying ILAL to Base Sepolia"
echo "=================================="
echo "RPC URL: $BASE_SEPOLIA_RPC_URL"
echo "Deployer: $(cast wallet address --private-key $PRIVATE_KEY)"
echo ""

# 检查余额
BALANCE=$(cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $BASE_SEPOLIA_RPC_URL)
echo "Balance: $BALANCE wei"

if [ "$BALANCE" -lt 500000000000000000 ]; then
  echo "❌ Insufficient balance! Need at least 0.5 ETH"
  exit 1
fi

# 部署
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv

echo ""
echo "✅ Deployment complete!"
echo "Check deployments/84532-plonk.json for contract addresses"
```

执行：

```bash
chmod +x deploy-base-sepolia.sh
./deploy-base-sepolia.sh
```

---

## 🔍 步骤 4: 验证部署

### 4.1 检查部署地址

```bash
cat deployments/84532-plonk.json
```

### 4.2 验证合约在 Basescan

访问: https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS

检查：
- ✅ 合约代码已验证（绿色 ✓）
- ✅ Read Contract 可用
- ✅ Write Contract 可用

### 4.3 手动测试合约

```bash
# 1. 检查 Registry owner
cast call <REGISTRY_ADDRESS> "owner()(address)" \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# 2. 检查 SessionManager TTL
cast call <SESSION_MANAGER_ADDRESS> "registry()(address)" \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# 3. 检查 PlonkVerifierAdapter 版本
cast call <VERIFIER_ADAPTER_ADDRESS> "version()(string)" \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

---

## 📊 步骤 5: 记录部署信息

### 5.1 更新前端配置

```bash
# 编辑 frontend/.env.local
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

NEXT_PUBLIC_REGISTRY_ADDRESS=<从 deployments/84532-plonk.json 复制>
NEXT_PUBLIC_SESSION_MANAGER_ADDRESS=<从 deployments/84532-plonk.json 复制>
NEXT_PUBLIC_COMPLIANCE_HOOK_ADDRESS=<从 deployments/84532-plonk.json 复制>
NEXT_PUBLIC_PLONK_VERIFIER_ADDRESS=<从 deployments/84532-plonk.json 复制>
NEXT_PUBLIC_VERIFIER_ADAPTER_ADDRESS=<从 deployments/84532-plonk.json 复制>
```

### 5.2 创建公开文档

创建 `DEPLOYMENTS.md`：

```markdown
# ILAL 部署地址

## Base Sepolia (Testnet)

**部署时间**: 2026-02-10  
**Deployer**: 0x...  
**Chain ID**: 84532

### 核心合约

| 合约 | 地址 | Basescan |
|------|------|----------|
| Registry | 0x... | [查看](https://sepolia.basescan.org/address/0x...) |
| SessionManager | 0x... | [查看](https://sepolia.basescan.org/address/0x...) |
| ComplianceHook | 0x... | [查看](https://sepolia.basescan.org/address/0x...) |
| PlonkVerifier | 0x... | [查看](https://sepolia.basescan.org/address/0x...) |
| PlonkVerifierAdapter | 0x... | [查看](https://sepolia.basescan.org/address/0x...) |

### 配置

- **Session TTL**: 86400 秒 (24 小时)
- **Verifier Type**: PLONK
- **Proxy Pattern**: UUPS
```

---

## 🧪 步骤 6: 测试网交互测试

### 6.1 使用 Cast 测试

```bash
# 1. 注册测试 Issuer
cast send <REGISTRY_ADDRESS> \
  "registerIssuer(bytes32,address,address)" \
  $(cast keccak "TestIssuer") \
  0xYOUR_ATTESTER \
  0xYOUR_VERIFIER \
  --private-key $PRIVATE_KEY \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# 2. 创建测试 Session
cast send <SESSION_MANAGER_ADDRESS> \
  "startSession(address,uint256)" \
  0xYOUR_TEST_USER \
  $(($(cast block latest --rpc-url $BASE_SEPOLIA_RPC_URL --json | jq -r .timestamp) + 86400)) \
  --private-key $PRIVATE_KEY \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# 3. 检查 Session
cast call <SESSION_MANAGER_ADDRESS> \
  "isSessionActive(address)(bool)" \
  0xYOUR_TEST_USER \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

### 6.2 使用 Remix 测试

1. 访问 [Remix IDE](https://remix.ethereum.org/)
2. 连接到 Base Sepolia (Injected Provider)
3. 加载已验证的合约 (At Address)
4. 执行读/写操作

---

## 🎯 步骤 7: 集成到前端

### 7.1 安装依赖

```bash
cd /Users/ronny/Desktop/ilal/frontend

# 安装 wagmi, viem, RainbowKit
npm install wagmi viem @rainbow-me/rainbowkit
```

### 7.2 配置网络

```typescript
// frontend/src/config/chains.ts
import { defineChain } from 'viem'

export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
      http: ['https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Basescan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
})
```

### 7.3 测试连接

```bash
cd frontend
npm run dev

# 打开浏览器，连接钱包
# 确保切换到 Base Sepolia 网络
# 测试读取合约数据
```

---

## ⚠️ 常见问题

### 问题 1: 部署失败 - Insufficient funds

**原因**: 账户余额不足

**解决**:
```bash
# 检查余额
cast balance $YOUR_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL

# 获取测试 ETH
# 1. 使用 Coinbase Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
# 2. 从 Sepolia 桥接: https://bridge.base.org/
```

### 问题 2: 合约验证失败

**原因**: Etherscan API 限制或配置错误

**解决**:
```bash
# 手动验证每个合约
forge verify-contract \
  <CONTRACT_ADDRESS> \
  src/core/Registry.sol:Registry \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor()")

# 等待 30 秒后重试
sleep 30
```

### 问题 3: POOL_MANAGER_ADDRESS 未设置

**原因**: Base Sepolia 可能没有官方 Uniswap v4 部署

**解决**:
```bash
# 选项 A: 使用占位符（仅用于测试）
POOL_MANAGER_ADDRESS=0x0000000000000000000000000000000000001234

# 选项 B: 部署自己的 PoolManager (高级)
# 参考: https://github.com/Uniswap/v4-core

# 选项 C: 等待官方部署
```

### 问题 4: Gas Price 太高

**原因**: 网络拥堵

**解决**:
```bash
# 检查当前 Gas Price
cast gas-price --rpc-url $BASE_SEPOLIA_RPC_URL

# 等待 Gas 降低
# 或使用 --gas-price 参数强制设置
forge script ... --gas-price 1000000000  # 1 gwei
```

---

## 🎉 部署成功检查清单

部署完成后，确认以下所有项：

- [ ] ✅ 所有 6 个合约部署成功
- [ ] ✅ 合约在 Basescan 上已验证
- [ ] ✅ Registry owner 设置正确
- [ ] ✅ SessionManager VERIFIER_ROLE 已授予 Adapter
- [ ] ✅ PlonkVerifierAdapter 版本正确
- [ ] ✅ 部署地址已保存到 `deployments/84532-plonk.json`
- [ ] ✅ 前端配置已更新
- [ ] ✅ Cast 测试通过
- [ ] ✅ 前端可以连接和读取合约

---

## 📝 后续任务

部署完成后：

1. **创建公告**
   - 在 Twitter/Discord 宣布测试网部署
   - 提供合约地址和 Basescan 链接

2. **邀请测试**
   - 邀请社区成员测试
   - 收集反馈和 bug 报告

3. **性能监控**
   - 监控 Gas 消耗
   - 跟踪交易成功率
   - 收集用户使用数据

4. **准备主网部署**
   - 安全审计
   - 多签钱包设置
   - 正式发布计划

---

## 🆘 需要帮助？

- Discord: [ILAL Community](#)
- GitHub Issues: [ilal/issues](#)
- Documentation: [docs.ilal.xyz](#)

---

**祝部署顺利！** 🚀
