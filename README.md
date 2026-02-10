# ILAL (Institutional Liquidity Access Layer)

基于 Uniswap v4 的合规机构流动性接入层，通过零知识证明实现身份验证和准入控制。

## 项目结构

```
ilal/
├── contracts/          # 智能合约 (Foundry)
│   ├── src/
│   │   ├── core/      # 核心合约 (Registry, SessionManager, Hook, Verifier)
│   │   ├── interfaces/ # 合约接口定义
│   │   └── libraries/  # 工具库
│   ├── test/          # Foundry 测试
│   └── script/        # 部署脚本
├── circuits/          # 零知识证明电路 (Circom)
├── frontend/          # Next.js 前端应用
├── subgraph/         # The Graph 索引
├── scripts/          # 运维脚本 (监控、做市等)
└── docs/             # 文档
```

## 快速开始

### 1. 安装 Foundry

```bash
# macOS/Linux
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 验证安装
forge --version
```

### 2. 安装依赖

```bash
cd contracts
forge install
```

### 3. 运行测试

```bash
cd contracts
forge test
```

### 4. 部署到 Base Sepolia

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify
```

## 技术栈

- **智能合约**: Solidity 0.8.26+ (Foundry)
- **零知识证明**: Circom + SnarkJS (Groth16/PLONK)
- **前端**: Next.js 14 + wagmi + RainbowKit
- **索引**: The Graph Protocol
- **目标网络**: Base Mainnet

## 核心合约

1. **Registry**: 配置中心，管理 Issuer 和全局参数
2. **SessionManager**: 会话缓存管理 (24h TTL)
3. **Verifier**: 零知识证明验证器
4. **ComplianceHook**: Uniswap v4 Hook，实现准入控制
5. **VerifiedPoolsPositionManager**: LP NFT 管理器 (不可转让)

## Phase 0: 关键决策

在开始开发前，请完成以下决策：

### 决策 1: ZK 算法选择
- [ ] Groth16 (最优 Gas，但需要 Trusted Setup)
- [ ] PLONK (稍高 Gas，但灵活可升级)

### 决策 2: Hook 身份解析
- [ ] 完成 hookData + EIP-712 方案的 PoC

### 决策 3: 合约升级策略
- [x] 使用 UUPS 代理模式

## 开发路线图

- [x] Phase 0: 项目初始化
- [ ] Phase 1: 基础设施搭建
- [ ] Phase 2: 核心合约开发
- [ ] Phase 3: ZK 电路开发
- [ ] Phase 4: 前端开发
- [ ] Phase 5: 子图索引
- [ ] Phase 6: 测试
- [ ] Phase 7: 部署
- [ ] Phase 8: 文档与运维

## 安全审计

所有合约在部署前必须通过：
- 内部代码审查
- Foundry Invariant Testing
- 外部专业安全审计

## 许可证

MIT

## 联系方式

- 文档: [查看完整 PRD](docs/PRD.md)
- 技术计划: [查看开发计划](.cursor/plans/)
