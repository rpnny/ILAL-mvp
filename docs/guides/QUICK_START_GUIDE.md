# ILAL 快速启动指南

本指南帮助你快速部署和运行 ILAL 项目。

---

## 📋 前置要求

### 必需工具
- Node.js >= 18.0.0
- npm 或 yarn
- Foundry (forge, cast, anvil)
- Git

### 可选工具
- Docker（用于运行子图节点）
- The Graph CLI（用于子图部署）

---

## 🚀 快速启动（5 分钟）

### 1. 克隆并安装依赖

```bash
# 克隆项目
git clone <repository-url> ilal
cd ilal

# 安装合约依赖
cd contracts
forge install
cd ..

# 安装前端依赖
cd frontend
npm install
cd ..

# 安装机器人依赖
cd bot
npm install
cd ..

# 安装子图依赖
cd subgraph
npm install
cd ..
```

### 2. 配置环境变量

**前端** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_CHAIN_ID=84532
```

**机器人** (`bot/.env`):
```bash
PRIVATE_KEY=your_private_key
RPC_URL=https://sepolia.base.org
TELEGRAM_BOT_TOKEN=your_bot_token (可选)
TELEGRAM_CHAT_ID=your_chat_id (可选)
```

### 3. 启动前端

```bash
cd frontend
npm run dev
```

访问: http://localhost:3000

### 4. 启动机器人

```bash
cd bot
npm run dev
```

---

## 📦 完整部署流程

### Step 1: 部署合约（如果需要）

#### 测试网（Base Sepolia）

```bash
cd contracts

# 设置环境变量
export PRIVATE_KEY=your_private_key
export BASE_SEPOLIA_RPC=https://sepolia.base.org

# 部署
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify \
  -vvvv

# 保存部署地址
# 输出的地址需要更新到 frontend/lib/contracts.ts 和 bot/config.yaml
```

#### 主网（Base Mainnet）

```bash
cd contracts

# 设置环境变量
export PRIVATE_KEY=your_private_key
export BASE_MAINNET_RPC=https://mainnet.base.org
export GOVERNANCE_ADDRESS=your_multisig_address

# 部署
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --verify \
  -vvvv
```

### Step 2: 部署子图

```bash
cd subgraph

# 安装 Graph CLI
npm install -g @graphprotocol/graph-cli

# 认证
graph auth --studio <your-deploy-key>

# 生成代码
npm run codegen

# 构建
npm run build

# 部署到 Subgraph Studio
graph deploy --studio ilal-base-sepolia

# 或部署到托管服务
graph deploy --node https://api.thegraph.com/deploy/ \
  --ipfs https://api.thegraph.com/ipfs/ \
  <your-subgraph-name>
```

**更新前端配置**:
```typescript
// frontend/hooks/useLiquidity.ts
const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/<id>/ilal-base-sepolia/version/latest';
```

### Step 3: 配置并启动机器人

```bash
cd bot

# 复制配置文件
cp config.yaml config.local.yaml

# 编辑 config.local.yaml，填入实际值
vim config.local.yaml

# 构建
npm run build

# 启动
npm run start

# 或使用 PM2 守护进程
pm2 start dist/index.js --name ilal-bot
```

### Step 4: 部署前端

#### Vercel 部署

```bash
cd frontend

# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel

# 生产部署
vercel --prod
```

#### Docker 部署

```bash
cd frontend

# 构建镜像
docker build -t ilal-frontend .

# 运行容器
docker run -p 3000:3000 ilal-frontend
```

---

## 🧪 测试

### 合约测试

```bash
cd contracts

# 运行所有测试
forge test -vv

# 运行特定测试
forge test --match-contract SessionManager -vvv

# 运行集成测试
forge test --match-path test/integration/* -vvv

# Fork 测试（需要 RPC URL）
forge test --fork-url https://mainnet.base.org \
  --match-contract ForkTest -vvv
```

### 前端测试

```bash
cd frontend

# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 类型检查
npm run type-check

# Lint
npm run lint
```

### 机器人测试

```bash
cd bot

# 运行测试
npm run test

# Lint
npm run lint

# 类型检查
tsc --noEmit
```

---

## 🔧 常见问题

### Q1: 合约部署失败

**错误**: `Create2: Failed on deploy`

**解决**:
- 检查账户余额是否足够
- 确认 RPC URL 正确
- 尝试增加 gas price

### Q2: 前端连接钱包失败

**错误**: `WalletConnect initialization failed`

**解决**:
- 确认 `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` 已设置
- 访问 https://cloud.walletconnect.com/ 获取 Project ID

### Q3: 子图部署失败

**错误**: `deployment failed`

**解决**:
- 确认合约地址正确
- 确认 startBlock 在合约部署区块之后
- 检查 ABI 文件是否最新

### Q4: 机器人无法签名

**错误**: `Transaction signing failed`

**解决**:
- 确认 `PRIVATE_KEY` 正确（不要包含 `0x` 前缀）
- 确认账户有足够的 ETH 支付 gas
- 确认 Session 已激活

---

## 📊 监控和维护

### 健康检查

**合约**:
```bash
# 检查合约状态
cast call $REGISTRY_ADDRESS "emergencyPaused()(bool)" --rpc-url $RPC_URL

# 查询 Session
cast call $SESSION_MANAGER_ADDRESS "isSessionActive(address)(bool)" $USER_ADDRESS --rpc-url $RPC_URL
```

**子图**:
```bash
# 查询子图状态
curl -X POST https://api.studio.thegraph.com/query/<id>/ilal-base-sepolia/version/latest \
  -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { block { number } } }"}'
```

**机器人**:
```bash
# 检查 PM2 状态
pm2 status

# 查看日志
pm2 logs ilal-bot

# 重启
pm2 restart ilal-bot
```

### 日志查看

**机器人日志**:
```bash
cd bot
tail -f logs/bot.log
```

**前端日志**:
- Browser Console
- Vercel Logs (如果使用 Vercel)

---

## 🔒 安全建议

### 生产环境
1. ✅ 使用硬件钱包或多签管理治理权限
2. ✅ 设置合理的 gas limit
3. ✅ 定期备份私钥（加密存储）
4. ✅ 监控异常交易
5. ✅ 设置 Telegram 告警

### 敏感信息
- 🔐 永远不要提交 `.env` 文件到 Git
- 🔐 使用环境变量管理密钥
- 🔐 定期轮换 API Keys
- 🔐 限制 RPC URL 访问权限

---

## 📚 相关文档

- [完整文档](./README.md)
- [中文文档](./README_CN.md)
- [部署指南](./DEPLOYMENT.md)
- [生产就绪状态](./PRODUCTION_READY_STATUS.md)
- [测试报告](./TEST_REPORT.md)

---

## 🆘 获取帮助

### 社区支持
- GitHub Issues: 提交 Bug 报告和功能请求
- Discord: 加入社区讨论
- Twitter: 关注项目更新

### 紧急联系
- 安全问题: security@ilal.xyz
- 技术支持: support@ilal.xyz

---

## ✅ 检查清单

部署前确认：

- [ ] 所有依赖已安装
- [ ] 环境变量已配置
- [ ] 合约已部署并验证
- [ ] 子图已部署并同步
- [ ] 前端可访问
- [ ] 机器人正常运行
- [ ] 监控系统已设置
- [ ] 备份已完成

**恭喜！你已经成功部署 ILAL 项目！**🎉

---

**最后更新**: 2026-02-11
