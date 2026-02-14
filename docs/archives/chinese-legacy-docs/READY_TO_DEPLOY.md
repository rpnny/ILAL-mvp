# ✅ 您的部署已配置完成！

**钱包地址**: `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D`  
**当前余额**: 0.0001 ETH ❌  
**需要余额**: 至少 0.05 ETH

---

## 🚨 **下一步：获取测试 ETH**

### 快速获取（3 选 1）

**方式 1: Coinbase Faucet** ⭐ 推荐
```
链接: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
地址: 0x1b869CaC69Df23Ad9D727932496AEb3605538c8D
预计: 0.05-0.1 ETH
等待: 5-10 分钟
```

**方式 2: Alchemy Faucet**
```
链接: https://www.alchemy.com/faucets/base-sepolia
需要: Alchemy 账号
预计: 0.05 ETH
```

**方式 3: QuickNode Faucet**
```
链接: https://faucet.quicknode.com/base/sepolia
预计: 0.05 ETH
```

---

## 📊 **实时检查余额**

```bash
cast balance 0x1b869CaC69Df23Ad9D727932496AEb3605538c8D \
  --rpc-url https://sepolia.base.org
```

**当余额 ≥ 50000000000000000 (0.05 ETH) 时，就可以部署了！**

---

## 🚀 **执行部署（当余额充足后）**

### 方式 1: 自动化脚本（推荐）

```bash
cd /Users/ronny/Desktop/ilal/contracts
./deploy-base-sepolia.sh
```

脚本会自动：
- ✅ 检查余额
- ✅ 检查网络
- ✅ 模拟部署
- ✅ 执行部署
- ✅ 验证合约（如果有 API Key）
- ✅ 保存部署地址

### 方式 2: 手动执行

```bash
cd /Users/ronny/Desktop/ilal/contracts

# 加载环境变量
source .env

# 执行部署
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

---

## 🔍 **部署后验证**

### 1. 查看部署地址

```bash
cat deployments/84532-plonk.json
```

### 2. 在 Basescan 查看

```
Registry: https://sepolia.basescan.org/address/<REGISTRY_ADDRESS>
SessionManager: https://sepolia.basescan.org/address/<SESSION_MANAGER_ADDRESS>
PlonkVerifier: https://sepolia.basescan.org/address/<PLONK_VERIFIER_ADDRESS>
```

### 3. 测试合约

```bash
# 检查 Registry owner
cast call <REGISTRY_ADDRESS> "owner()(address)" \
  --rpc-url https://sepolia.base.org

# 检查 PlonkVerifierAdapter 版本
cast call <VERIFIER_ADAPTER_ADDRESS> "version()(string)" \
  --rpc-url https://sepolia.base.org
```

---

## 📈 **预期结果**

| 指标 | 预期值 |
|------|--------|
| **部署时间** | 5-10 分钟 |
| **Gas 消耗** | ~5,000,000 gas |
| **部署成本** | 0.006 ETH (实际) |
| **合约数量** | 6 个 |
| **剩余余额** | ~0.044 ETH |

---

## ⚙️ **可选：获取 Basescan API Key**

**用途**: 自动验证合约（让合约在 Basescan 上可读）

**步骤**:
1. 访问 https://basescan.org/register
2. 注册账号
3. 访问 https://basescan.org/myapikey
4. 创建 API Key
5. 复制并填入 `.env` 文件:
   ```bash
   BASESCAN_API_KEY=你的API密钥
   ```

**不是必需的**，但强烈推荐！

---

## 📞 **需要帮助？**

### 获取 ETH 后回来

当您获取到测试 ETH 后：
1. 运行 `cast balance` 检查余额
2. 告诉我 "余额已充足"
3. 我会帮您执行部署

### 自己部署

您也可以按照上面的步骤自己部署，一切都已配置好！

---

## 🎯 **配置文件位置**

- ✅ `.env` - 环境变量（已配置）
- ✅ `deploy-base-sepolia.sh` - 自动化脚本（已准备）
- ✅ `script/DeployPlonk.s.sol` - 部署脚本（已存在）

**一切就绪，只差测试 ETH！** 🚀

---

**预计总耗时**: 15-20 分钟（包括获取 ETH 的等待时间）

当您准备好后，告诉我："已获取 ETH，可以部署了"
