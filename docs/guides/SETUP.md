# ILAL 项目设置指南

## 前置要求

### 1. 安装 Foundry

Foundry 是现代化的 Solidity 开发工具链，包含 `forge`、`cast`、`anvil` 等工具。

```bash
# macOS/Linux
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 验证安装
forge --version
cast --version
```

### 2. 安装 Node.js (前端和 ZK 电路需要)

```bash
# 使用 nvm 安装 (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 验证
node --version  # 应该 >= 18
npm --version
```

### 3. 安装 Circom (ZK 电路编译)

```bash
# 安装 Rust (Circom 依赖)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# 验证
circom --version
```

## 快速开始

### 步骤 1: 克隆并进入项目

```bash
cd /Users/ronny/Desktop/ilal
```

### 步骤 2: 安装合约依赖

```bash
cd contracts
./install-deps.sh

# 或手动安装
forge install
```

### 步骤 3: 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的密钥和配置
```

### 步骤 4: 编译合约

```bash
cd contracts
forge build
```

### 步骤 5: 运行测试

```bash
cd contracts
forge test -vvv
```

## Phase 0: 关键决策

在继续开发前，请完成以下技术决策：

### 决策 1: ZK 算法选择 (1-2 天)

评估 Groth16 vs PLONK：

```bash
# 在 Base Sepolia 测试 Gas 差异
cd circuits
# TODO: 添加 Gas 基准测试脚本
```

**评估要点:**
- [ ] Groth16 验证 Gas: ~280k
- [ ] PLONK 验证 Gas: ~350k
- [ ] 团队是否有 Trusted Setup 经验?
- [ ] 未来 6 个月是否可能修改电路?

**决策**: [选择 Groth16 / PLONK]

### 决策 2: Hook 身份解析 PoC (3-5 天)

验证 hookData 方案可行性：

```bash
cd contracts/test/poc
forge test --match-contract HookPoC -vvv
```

**验证要点:**
- [ ] Universal Router 支持传递 hookData?
- [ ] 前端如何构造 hookData?
- [ ] EIP-712 签名验证性能如何?

**决策**: [实现方案确定]

### 决策 3: 合约升级策略

- [x] 使用 UUPS 代理模式
- [x] OpenZeppelin 库已集成

## 开发工作流

### 日常开发

```bash
# 监听文件变化，自动编译
forge build --watch

# 运行特定测试
forge test --match-contract RegistryTest -vvv

# Gas 报告
forge test --gas-report

# 代码覆盖率
forge coverage
```

### 部署到测试网

```bash
# 部署到 Base Sepolia
source .env
forge script script/Deploy.s.sol \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify

# 验证合约
forge verify-contract <ADDRESS> <CONTRACT> \
    --chain-id 84532 \
    --etherscan-api-key $BASESCAN_API_KEY
```

## 项目结构说明

```
ilal/
├── contracts/          # Foundry 项目
│   ├── src/
│   │   ├── core/      # Registry, SessionManager, Hook, Verifier
│   │   ├── interfaces/ # ✅ 已完成
│   │   └── libraries/
│   ├── test/
│   │   ├── unit/      # 单元测试
│   │   ├── integration/ # 集成测试
│   │   └── invariant/  # Fuzz 测试
│   └── script/
│       └── Deploy.s.sol
├── circuits/          # Circom 电路
│   ├── compliance.circom
│   └── scripts/
├── frontend/          # Next.js (待创建)
├── subgraph/         # The Graph (待创建)
└── scripts/          # 运维脚本 (待创建)
```

## 常见问题

### 1. Foundry 安装失败

```bash
# 手动安装
git clone https://github.com/foundry-rs/foundry
cd foundry
cargo install --path ./cli --bins --locked
```

### 2. 依赖安装失败

```bash
# 清理缓存重试
forge clean
rm -rf lib/
./install-deps.sh
```

### 3. 测试失败

```bash
# 查看详细日志
forge test -vvvv

# 调试特定测试
forge test --debug --match-test testSpecificFunction
```

## 下一步

1. ✅ 项目结构已创建
2. ✅ 接口定义已完成
3. ⏳ 安装 Foundry: `curl -L https://foundry.paradigm.xyz | bash`
4. ⏳ 运行依赖安装: `cd contracts && ./install-deps.sh`
5. ⏳ 开始实现核心合约

## 资源链接

- [Foundry Book](https://book.getfoundry.sh/)
- [Uniswap v4 Docs](https://docs.uniswap.org/contracts/v4/overview)
- [OpenZeppelin Upgrades](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Circom Documentation](https://docs.circom.io/)
- [完整 PRD 文档](docs/PRD.md)
