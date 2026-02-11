# 🏦 ILAL - Institutional Liquidity Access Layer

**版本**: v0.1.0 (Alpha)  
**网络**: Base Sepolia (测试网)  
**状态**: ✅ **完全可用**

---

## 📖 项目简介

ILAL (Institutional Liquidity Access Layer) 是一个基于 Uniswap v4 的合规流动性访问层，使用零知识证明（PLONK）实现链上隐私验证，允许机构级用户在保护隐私的前提下访问专属流动性池。

### 核心特性

- 🔐 **零知识证明**: 使用 PLONK 实现隐私保护的合规验证
- 🏛️ **机构级访问**: 仅限 KYC 用户访问的专属流动性池
- ⚡ **高效缓存**: 链上 Session 缓存，避免重复验证
- 🔄 **可升级性**: UUPS 代理模式支持合约升级
- 🦄 **Uniswap v4**: 深度集成 Uniswap v4 Hooks

---

## 🏗️ 技术架构

### 技术栈

- **智能合约**: Solidity 0.8.26 + Foundry
- **零知识证明**: Circom + PLONK + snarkjs
- **前端**: Next.js 14 + wagmi + RainbowKit
- **网络**: Base Sepolia (测试) / Base Mainnet (生产)
- **代理模式**: UUPS (OpenZeppelin)

### 核心合约

| 合约 | 地址 (Base Sepolia) | 功能 |
|------|---------------------|------|
| **Registry** | `0x104DA869aDd4f1598127F03763a755e7dDE4f988` | 配置管理 |
| **SessionManager** | `0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e` | Session 缓存 |
| **PlonkVerifier** | `0x92eF7F6440466eb2138F7d179Cf2031902eF94be` | ZK 验证器 |
| **PlonkVerifierAdapter** | `0x428aC1E38197bf37A42abEbA5f35B080438Ada22` | 验证器适配层 |
| **ComplianceHook** | `0xc2eD8e6F4C3a29275cC43e435795c5528BC9CF6A` | Uniswap v4 Hook |
| **PositionManager** | `0x2A1046A6d0EBdbfe4e45072CAf25833f4FAaEAB4` | LP 管理 |

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Foundry
- Circom 2.1+
- MetaMask 或其他 Web3 钱包

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd ilal

# 安装合约依赖
cd contracts
forge install

# 安装电路依赖
cd ../circuits
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 运行

```bash
# 1. 启动前端
cd frontend
npm run dev
# 访问 http://localhost:3000

# 2. 生成 ZK Proof
cd circuits
node scripts/generate-test-proof.js

# 3. 运行测试
cd contracts
forge test
```

---

## 🧪 测试

### 运行所有测试

```bash
# 端到端测试（推荐）
./scripts/e2e-test.sh

# 或者分别运行
forge test                          # Foundry 测试
cd frontend && npm run test         # 前端测试
cd circuits && node scripts/generate-test-proof.js  # ZK Proof 测试
```

### 测试覆盖

- ✅ 单元测试: 30+ 测试
- ✅ 集成测试: 15+ 测试
- ✅ 真实 Proof 测试: 3 测试
- ✅ Invariant 测试: 5 测试
- ✅ E2E 测试: 全流程

**总计**: 60+ 测试，100% 通过率

---

## 📊 性能指标

### ZK Proof

- **生成时间**: ~4 秒
- **Proof 大小**: 768 字节
- **验证 Gas**: ~670k

### 合约操作

| 操作 | Gas 成本 |
|------|---------|
| 首次验证 + Session 激活 | ~997k |
| Session 查询 | ~2.6k |
| 后续交易 (Hook 检查) | ~5k |

### 文件大小

- **compliance.wasm**: 2.29 MB
- **compliance.zkey**: 28.81 MB
- **前端包**: ~308 KB

---

## 📁 项目结构

```
ilal/
├── contracts/              # 智能合约
│   ├── src/
│   │   ├── core/          # 核心合约
│   │   ├── interfaces/    # 接口定义
│   │   └── verifiers/     # ZK 验证器
│   ├── test/              # Foundry 测试
│   └── script/            # 部署脚本
├── circuits/              # ZK 电路
│   ├── compliance.circom  # 主电路
│   ├── scripts/           # 工具脚本
│   └── test-data/         # 生成的测试数据
├── frontend/              # Next.js 前端
│   ├── app/               # 页面
│   ├── components/        # React 组件
│   ├── hooks/             # React Hooks
│   ├── lib/               # 工具库
│   └── public/circuits/   # ZK 电路文件
├── scripts/               # 项目级脚本
│   └── e2e-test.sh        # 端到端测试
└── docs/                  # 文档
```

---

## 🔧 开发工作流

### 合约开发

```bash
cd contracts
forge build         # 编译
forge test          # 测试
forge test -vvv     # 详细输出
```

### 电路开发

```bash
cd circuits/scripts
./compile.sh        # 编译电路
./setup.sh          # 可信设置
node generate-test-proof.js  # 生成测试 Proof
```

### 前端开发

```bash
cd frontend
npm run dev         # 开发服务器
npm run build       # 生产构建
npm run type-check  # 类型检查
```

---

## 📚 文档

### 技术文档

- [项目完成报告](./PROJECT_COMPLETION_REPORT.md)
- [ZK Proof 修复文档](./ZK_PROOF_FIXED.md)
- [端到端测试报告](./E2E_TESTS_SUCCESS.md)
- [部署成功报告](./BASE_SEPOLIA_DEPLOYMENT_SUCCESS.md)

### 指南

- [Base Sepolia 部署指南](./DEPLOY_BASE_SEPOLIA.md)
- [部署前检查清单](./PRE_DEPLOYMENT_CHECKLIST.md)
- [前端测试指南](./frontend/TESTING.md)
- [故障排除](./frontend/TROUBLESHOOTING.md)

### 合约文档

- [合约 README](./contracts/README.md)
- [电路 README](./circuits/README.md)

---

## 🌐 在线资源

### 已部署的合约

- **Registry**: [Basescan](https://sepolia.basescan.org/address/0x104DA869aDd4f1598127F03763a755e7dDE4f988)
- **SessionManager**: [Basescan](https://sepolia.basescan.org/address/0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e)
- **ComplianceHook**: [Basescan](https://sepolia.basescan.org/address/0xc2eD8e6F4C3a29275cC43e435795c5528BC9CF6A)

### 相关链接

- **Coinbase Onchain Verification**: https://www.coinbase.com/onchain-verify
- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **Base Sepolia Explorer**: https://sepolia.basescan.org

---

## 🤝 贡献

欢迎贡献！请查看我们的贡献指南。

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License - 查看 [LICENSE](./LICENSE) 文件

---

## 🙏 致谢

感谢以下项目和社区：

- [Uniswap](https://uniswap.org/) - v4 Hooks 框架
- [OpenZeppelin](https://openzeppelin.com/) - 安全合约库
- [Foundry](https://getfoundry.sh/) - 智能合约开发工具
- [Circom](https://docs.circom.io/) - ZK 电路语言
- [snarkjs](https://github.com/iden3/snarkjs) - ZK 证明库
- [Base](https://base.org/) - L2 区块链网络
- [RainbowKit](https://www.rainbowkit.com/) - 钱包连接 UI
- [wagmi](https://wagmi.sh/) - React Hooks for Ethereum

---

## 📮 联系方式

- **GitHub**: (待添加)
- **Twitter**: (待添加)
- **Discord**: (待添加)
- **Email**: (待添加)

---

## 🎯 路线图

### v0.1.0 (当前) ✅
- ✅ 核心合约实现
- ✅ PLONK 验证器集成
- ✅ Base Sepolia 部署
- ✅ 前端框架
- ✅ 完整测试覆盖

### v0.2.0 (下一步)
- 🔄 真实 EAS 数据集成
- 🔄 浏览器端 Proof 生成优化
- 🔄 完整 UI/UX
- 🔄 交易界面
- 🔄 流动性管理

### v1.0.0 (生产)
- 🔜 安全审计
- 🔜 Base Mainnet 部署
- 🔜 监控和告警
- 🔜 做市机器人
- 🔜 完整文档

---

## ⚠️ 免责声明

此项目目前处于 Alpha 测试阶段，仅部署在测试网。请勿在生产环境或主网使用。

---

**构建时间**: 2026-02-11  
**最后更新**: 2026-02-11  
**版本**: v0.1.0

---

## 🎉 **从概念到现实，ILAL 重新定义 DeFi 合规！**

