# ILAL 部署检查清单

## 📋 部署前准备

### 环境准备

- [ ] **Foundry 已安装** (`foundryup`)
- [ ] **Node.js >= 18** (`node --version`)
- [ ] **Circom 已安装** (`circom --version`)
- [ ] **SnarkJS 已安装** (`snarkjs --version`)
- [ ] **Base 主网 RPC**: 在 `.env` 中配置
- [ ] **Etherscan API Key**: 用于合约验证

### 密钥管理

- [ ] **部署者私钥**: 设置 `DEPLOYER_PRIVATE_KEY`
- [ ] **治理多签地址**: 准备 3/5 或 5/7 多签
- [ ] **足够的 ETH**: 至少 0.5 ETH 用于部署 Gas

### 合约审计

- [ ] **内部代码审查**: 团队成员 review
- [ ] **外部安全审计**: 推荐 Trail of Bits / OpenZeppelin
- [ ] **审计报告公开**: 发布在 GitHub

### ZK 电路准备

- [ ] **电路编译完成**: `compliance.circom` → `.wasm` + `.r1cs`
- [ ] **PLONK Setup**: 生成 `.zkey` 和 `verification_key.json`
- [ ] **Solidity Verifier**: 导出 `PlonkVerifier.sol`
- [ ] **本地测试通过**: 生成并验证测试证明

---

## 🚀 部署流程

### Phase 1: 测试网部署 (Base Sepolia)

#### 1.1 部署合约

```bash
cd contracts

# 设置环境变量
export DEPLOYER_PRIVATE_KEY="0x..."
export GOVERNANCE_MULTISIG="0x..."
export BASE_SEPOLIA_RPC="https://sepolia.base.org"

# 部署
forge script script/Deploy.s.sol:DeployILAL \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify

# 保存部署地址
# 输出会保存在 deployments/base-sepolia.json
```

- [ ] Registry Proxy 部署成功
- [ ] SessionManager Proxy 部署成功
- [ ] MockVerifier 部署成功 (测试用)
- [ ] ComplianceHook 部署成功
- [ ] 合约在 Basescan 验证成功

#### 1.2 配置合约

```bash
# 使用部署脚本自动配置
# 或手动调用:

# 1. 注册 Coinbase Issuer
cast send $REGISTRY_ADDRESS \
  "registerIssuer(bytes32,address,address)" \
  $(cast --format-bytes32-string "Coinbase") \
  $COINBASE_ATTESTER \
  $VERIFIER_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# 2. 批准 Universal Router
cast send $REGISTRY_ADDRESS \
  "approveRouter(address,bool)" \
  $UNIVERSAL_ROUTER \
  true \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

- [ ] Coinbase Issuer 已注册
- [ ] Universal Router 已批准
- [ ] Session TTL 设置为 24 小时

#### 1.3 测试验证

```bash
cd contracts
forge test --fork-url $BASE_SEPOLIA_RPC -vvv
```

- [ ] 单元测试全部通过
- [ ] 集成测试全部通过
- [ ] Gas 消耗在预期范围内

### Phase 2: 前端部署 (测试)

#### 2.1 配置前端

```bash
cd frontend

# 创建 .env.local
cat > .env.local <<EOF
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id"
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_REGISTRY_ADDRESS="0x..."
NEXT_PUBLIC_SESSION_MANAGER_ADDRESS="0x..."
NEXT_PUBLIC_HOOK_ADDRESS="0x..."
EOF
```

#### 2.2 部署到 Vercel

```bash
# 安装依赖
npm install

# 构建
npm run build

# 部署
vercel --prod
```

- [ ] 前端部署成功
- [ ] 钱包连接正常
- [ ] Session 状态显示正确

#### 2.3 端到端测试

使用测试账户完成完整流程:

- [ ] 连接钱包
- [ ] 完成 Coinbase 验证
- [ ] 生成 ZK Proof (使用 MockVerifier)
- [ ] 激活 Session
- [ ] 执行 Swap 交易
- [ ] 添加流动性
- [ ] 移除流动性

### Phase 3: 子图部署

#### 3.1 配置子图

```bash
cd subgraph

# 更新 subgraph.yaml 中的合约地址和 startBlock
vim subgraph.yaml

# 安装依赖
npm install -g @graphprotocol/graph-cli
```

#### 3.2 部署子图

```bash
# 认证
graph auth --studio $STUDIO_DEPLOY_KEY

# 部署
graph deploy --studio ilal-base-sepolia
```

- [ ] 子图部署成功
- [ ] 索引正常运行
- [ ] GraphQL API 可访问

### Phase 4: 主网部署准备

#### 4.1 最终审查

- [ ] 所有测试网功能正常
- [ ] 安全审计报告已发布
- [ ] 社区反馈已收集
- [ ] 紧急响应计划已准备

#### 4.2 替换 MockVerifier

```bash
cd circuits

# 1. 使用真实 PLONK Setup
./scripts/setup.sh

# 2. 导出 PlonkVerifier.sol
# 自动生成在 ../contracts/src/core/PlonkVerifier.sol

# 3. 更新部署脚本
# 将 Deploy.s.sol 中的 MockVerifier 替换为 PlonkVerifier
```

- [ ] PlonkVerifier.sol 已生成
- [ ] 本地测试通过
- [ ] Gas 消耗验证 (~350k)

#### 4.3 主网部署

```bash
cd contracts

export DEPLOYER_PRIVATE_KEY="0x..."
export GOVERNANCE_MULTISIG="0x..." # 主网多签地址
export BASE_MAINNET_RPC="https://mainnet.base.org"

# 部署到主网
forge script script/Deploy.s.sol:DeployILAL \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --verify \
  --slow

# ⚠️ 仔细检查部署输出
# ⚠️ 确认所有地址无误后再继续
```

- [ ] 主网合约部署成功
- [ ] 地址已保存并备份
- [ ] 合约已验证
- [ ] 初始配置完成

#### 4.4 主网前端部署

```bash
cd frontend

# 更新 .env.production
cat > .env.production <<EOF
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id"
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_REGISTRY_ADDRESS="0x..."
NEXT_PUBLIC_SESSION_MANAGER_ADDRESS="0x..."
NEXT_PUBLIC_HOOK_ADDRESS="0x..."
EOF

# 部署
vercel --prod
```

- [ ] 生产环境部署成功
- [ ] 域名绑定 (app.ilal.xyz)
- [ ] SSL 证书正常

#### 4.5 主网子图部署

```bash
cd subgraph

# 更新为主网配置
vim subgraph.yaml

# 部署
graph deploy --studio ilal-base-mainnet
```

- [ ] 主网子图部署成功
- [ ] 索引同步正常

---

## 📊 上线后监控

### 关键指标

- [ ] **合约 TVL**: 总锁仓价值
- [ ] **活跃用户数**: 24h 内有效 Session
- [ ] **交易量**: 每日通过 Hook 的交易总额
- [ ] **Hook 拒绝率**: 应 < 5%
- [ ] **Gas 价格**: 平均交易成本

### 告警设置

- [ ] **Tenderly**: 合约监控和告警
- [ ] **OpenZeppelin Defender**: 自动化任务
- [ ] **Telegram Bot**: 关键事件通知
- [ ] **Datadog / Grafana**: 性能监控

### 紧急响应

- [ ] **多签持有人**: 7x24 可联系
- [ ] **紧急暂停流程**: 已测试
- [ ] **事故响应手册**: 已准备
- [ ] **Bug Bounty**: 已启动

---

## 🔄 上线计划

### Week 1: 软启动

- [ ] 仅邀请早期用户（白名单）
- [ ] TVL 上限: $500k
- [ ] 密切监控所有指标
- [ ] 每日团队同步

### Week 2-4: 逐步扩展

- [ ] 移除白名单限制
- [ ] 提高 TVL 上限: $5M
- [ ] 启动市场宣传
- [ ] 发布博客文章和教程

### Month 2: 全面运营

- [ ] 无 TVL 限制
- [ ] 上线更多交易对
- [ ] 跨链扩展评估
- [ ] 社区治理启动

---

## ✅ 最终检查

在宣布正式上线前:

- [ ] 所有合约部署并验证
- [ ] 前端和子图运行正常
- [ ] 安全审计报告已发布
- [ ] 用户文档完整
- [ ] 社区渠道活跃
- [ ] 紧急响应团队就位
- [ ] 媒体报道已协调

---

## 📞 联系人

| 角色 | 负责人 | 联系方式 |
|------|--------|---------|
| 技术负责人 | - | - |
| 安全负责人 | - | - |
| 运营负责人 | - | - |
| 社区负责人 | - | - |

---

**祝部署顺利！** 🚀
