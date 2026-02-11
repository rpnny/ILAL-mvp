# ✅ Base Sepolia 部署前检查清单

在执行部署前，请逐项检查以下内容：

---

## 📋 必需项

### 1. 账户准备

- [ ] **创建测试钱包**
  ```bash
  cast wallet new
  # 保存输出的地址和私钥
  ```

- [ ] **获取测试 ETH** (至少 0.5 ETH)
  - 方式 1: [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
  - 方式 2: [Base Bridge](https://bridge.base.org/) (从 Sepolia 桥接)
  
  ```bash
  # 检查余额
  cast balance YOUR_ADDRESS --rpc-url https://sepolia.base.org
  ```

### 2. API Keys

- [ ] **Basescan API Key**
  - 注册: https://basescan.org/register
  - 获取 API Key: https://basescan.org/myapikey
  
- [ ] **RPC Provider** (可选但推荐)
  - Alchemy: https://www.alchemy.com/ (Base Sepolia)
  - Infura: https://www.infura.io/

### 3. 环境配置

- [ ] **复制配置文件**
  ```bash
  cd /Users/ronny/Desktop/ilal/contracts
  cp .env.base-sepolia.example .env
  ```

- [ ] **填写 .env 文件**
  - `PRIVATE_KEY`: 测试钱包私钥
  - `BASE_SEPOLIA_RPC_URL`: RPC URL
  - `BASESCAN_API_KEY`: Basescan API Key
  - `USE_PLONK_VERIFIER`: 设置为 `true`

- [ ] **验证配置**
  ```bash
  source .env
  echo "Deployer: $(cast wallet address --private-key $PRIVATE_KEY)"
  echo "Chain ID: $(cast chain-id --rpc-url $BASE_SEPOLIA_RPC_URL)"
  ```

### 4. 代码准备

- [ ] **确认所有合约已编译**
  ```bash
  cd /Users/ronny/Desktop/ilal/contracts
  forge build --via-ir
  ```

- [ ] **运行测试**
  ```bash
  forge test --match-contract PlonkIntegrationTest
  ```

- [ ] **确认 PlonkVerifier 存在**
  ```bash
  ls -la src/verifiers/PlonkVerifier.sol
  ls -la src/verifiers/PlonkVerifierAdapter.sol
  ```

---

## ⚙️ 可选项

### 5. Uniswap v4 配置

- [ ] **查找 Base Sepolia PoolManager**
  - 文档: https://docs.uniswap.org/contracts/v4/deployments
  - 如果未找到，使用占位符: `0x0000000000000000000000000000000000001234`

### 6. 治理配置

- [ ] **设置多签地址** (推荐)
  - 使用 Safe: https://app.safe.global/
  - 或使用部署者地址 (测试网可用)

---

## 🧪 预部署测试

### 7. 网络测试

- [ ] **Ping RPC**
  ```bash
  curl -X POST $BASE_SEPOLIA_RPC_URL \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
  ```

- [ ] **检查 Gas Price**
  ```bash
  cast gas-price --rpc-url $BASE_SEPOLIA_RPC_URL
  # 应该 < 1 gwei (测试网通常很便宜)
  ```

### 8. 模拟部署

- [ ] **Dry Run**
  ```bash
  forge script script/DeployPlonk.s.sol:DeployPlonk \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --sender $(cast wallet address --private-key $PRIVATE_KEY)
  ```
  
  确认输出无错误

---

## 📝 部署时记录

### 9. 准备记录表格

创建一个文档记录以下信息：

```
部署时间: _______________
部署者地址: _______________
交易 Hash: _______________
Gas Used: _______________
Total Cost: _______________

合约地址:
- Registry: _______________
- SessionManager: _______________
- PlonkVerifier: _______________
- PlonkVerifierAdapter: _______________
- ComplianceHook: _______________
- PositionManager: _______________
```

---

## 🚨 注意事项

### ⚠️ 安全警告

- **绝对不要使用主网私钥进行测试网部署！**
- **不要将 `.env` 文件提交到 Git**
- **部署后立即备份私钥和合约地址**

### 📊 预期结果

- **总 Gas 消耗**: ~5,000,000 gas
- **部署时间**: 5-10 分钟 (包括验证)
- **部署成本**: 根据 Gas Price，约 0.005-0.05 ETH

### 🔍 验证清单

部署后需要验证：

- [ ] 所有 6 个合约部署成功
- [ ] 合约在 Basescan 上已验证 (绿色 ✓)
- [ ] Registry owner 正确
- [ ] SessionManager 拥有正确的 VERIFIER_ROLE
- [ ] PlonkVerifierAdapter 连接到 PlonkVerifier

---

## ✅ 准备就绪

当所有 **必需项** 都勾选后，您就可以执行部署了：

```bash
cd /Users/ronny/Desktop/ilal/contracts
./deploy-base-sepolia.sh
```

或手动执行：

```bash
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

---

**祝部署顺利！** 🚀

如遇问题，请查看 `DEPLOY_BASE_SEPOLIA.md` 中的故障排除部分。
