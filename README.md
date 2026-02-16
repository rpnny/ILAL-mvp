# ILAL - Institutional Liquidity Access Layer

> 合规的 DeFi 基础设施，基于 Uniswap V4 Hooks 构建

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-blue)](https://basescan.org)

## 🚀 快速开始

### 项目开发入口（Monorepo）

```bash
pnpm install
pnpm build
pnpm dev
```

**新同学建议先读**：`START_HERE.md` 和 `docs/INDEX.md`

### 对于开发者：使用 SDK

```bash
npm install @ilal/sdk viem
```

```typescript
import { ILALClient } from '@ilal/sdk';

const client = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});

// 激活 Session
await client.session.activate();

// 执行 Swap
await client.swap.execute({
  tokenIn: BASE_SEPOLIA_TOKENS.USDC,
  tokenOut: BASE_SEPOLIA_TOKENS.WETH,
  amountIn: parseUnits('100', 6),
});
```

**📖 完整文档**: [`packages/sdk/README.md`](packages/sdk/README.md)

## ✨ 特性

- **🔐 合规优先** - Session 管理 + ZK 证明 + EAS 验证
- **💧 流动性管理** - 基于 Uniswap V4 的机构级深度
- **🔄 安全交换** - 白名单路由 + ComplianceHook 保护
- **📦 开发者友好** - 完整的 TypeScript SDK
- **🌐 Monorepo 架构** - SDK、合约、电路统一管理

## 🏗️ 项目结构（Monorepo）

```
ilal/
├── packages/
│   ├── sdk/              # ⭐ ILAL SDK（核心产品）
│   ├── contracts/        # 智能合约（Foundry）
│   └── circuits/         # ZK 电路（Circom）
├── apps/
│   ├── web-demo/         # Web Demo（SDK 参考实现）
│   └── api/              # SaaS API（含原 Verifier Relay 能力）
├── scripts/              # 部署和测试脚本
└── docs/                 # 技术文档
```

## 📦 SDK API 概览

### 核心模块

| 模块 | 功能 | 示例 |
|------|------|------|
| **Session** | 合规会话管理 | `client.session.activate()` |
| **Swap** | 代币交换 | `client.swap.execute(params)` |
| **Liquidity** | 流动性管理 | `client.liquidity.add(params)` |
| **ZKProof** | 零知识证明生成 | `client.zkproof.generate(addr)` |
| **EAS** | 身份验证 | `client.eas.getVerification(addr)` |

### 完整示例

查看 [`packages/sdk/examples/`](packages/sdk/examples/) 目录：

- [基础设置](packages/sdk/examples/01-basic-setup.ts)
- [Session 管理](packages/sdk/examples/02-session-management.ts)
- [基本 Swap](packages/sdk/examples/03-basic-swap.ts)
- [添加流动性](packages/sdk/examples/04-add-liquidity.ts)
- [ZK Proof 生成](packages/sdk/examples/05-zk-proof.ts)
- [EAS 验证](packages/sdk/examples/06-eas-verification.ts)

## 🔗 合约地址（Base Sepolia）

| 合约 | 地址 |
|------|------|
| Registry | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SessionManager | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| ComplianceHook | `0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80` |
| SimpleSwapRouter | `0xfBfc94f61b009C1DD39dB88A3b781199973E2e44` |
| PositionManager | `0x5b460c8Bd32951183a721bdaa3043495D8861f31` |

## 🧪 测试

### Mock Theater 测试（双账户场景）

```bash
cd scripts/system-test
export ACCOUNT_A_KEY="0x..." # 机构巨鲸
export ACCOUNT_B_KEY="0x..." # 高频交易员
./run-theater.sh
```

**测试说明**: [`scripts/system-test/README-MOCK-THEATER.md`](scripts/system-test/README-MOCK-THEATER.md)

### SDK 单元测试

```bash
cd packages/sdk
npm test
```

## 🏃 本地开发（Monorepo）

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 启动开发环境

```bash
# 并行构建所有包
pnpm turbo build

# 启动 SDK 开发模式 + Web Demo
pnpm turbo dev
```

### 构建单个包

```bash
# 构建 SDK
cd packages/sdk
npm run build

# 构建合约
cd packages/contracts
forge build

# 构建 ZK 电路
cd packages/circuits
npm run build
```

## 📚 文档

- **文档导航**: [`docs/INDEX.md`](docs/INDEX.md)
- **SDK 文档**: [`packages/sdk/README.md`](packages/sdk/README.md)
- **合约文档**: [`packages/contracts/README.md`](packages/contracts/README.md)
- **部署指南**: [`docs/guides/DEPLOYMENT.md`](docs/guides/DEPLOYMENT.md)
- **架构设计**: [`docs/guides/ARCHITECTURE.md`](docs/guides/ARCHITECTURE.md)

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

Apache-2.0 © 2026 ILAL Team

## 🔗 链接

- **GitHub**: [github.com/your-org/ilal](https://github.com/your-org/ilal)
- **文档**: [docs.ilal.xyz](https://docs.ilal.xyz)
- **Discord**: [discord.gg/ilal](https://discord.gg/ilal)
- **Twitter**: [@ILALProtocol](https://twitter.com/ILALProtocol)

---

**🎯 核心理念**: ILAL 专注于提供基础设施层的合规解决方案。我们不是一个 DEX，而是让机构安全接入 DeFi 流动性的基础设施提供商。

**🚀 当前状态**: Base Sepolia 测试网已部署，SDK v0.1.0 已发布。主网即将推出。

**Made with ❤️ for the DeFi ecosystem**
