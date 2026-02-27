# ILAL - Institutional Liquidity Access Layer

> Compliant DeFi Infrastructure, Built on Uniswap V4 Hooks

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-blue)](https://basescan.org)

## 🚀 Quick Start

### Monorepo Development

```bash
pnpm install
pnpm build
pnpm dev
```

**New to the project?** Start with `START_HERE.md` and `docs/INDEX.md`

### For Developers: Using the SDK

```bash
npm install @ilal/sdk viem
```

```typescript
import { ILALClient } from '@ilal/sdk';

const client = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});

// Activate Session
await client.session.activate();

// Execute Swap
await client.swap.execute({
  tokenIn: BASE_SEPOLIA_TOKENS.USDC,
  tokenOut: BASE_SEPOLIA_TOKENS.WETH,
  amountIn: parseUnits('100', 6),
});
```

**📖 Full Documentation**: [`packages/sdk/README.md`](packages/sdk/README.md)

### On-chain vs server integration

- **On-chain / frontend (with wallet)**: Use the **SDK + wallet** (e.g. MetaMask); the user signs and the session is activated on-chain. See [SDK docs](packages/sdk/README.md).
- **Server / middle-office (no wallet)**: Use **API Key + REST API**. Keys look like `ilal_live_xxx` and are passed in the `X-API-Key` header; create them in the Dashboard. See [SaaS API reference](docs/API.md) for base URL, auth, and swap/liquidity endpoints.

## ✨ Features

- **🔐 Compliance First** - Session management + ZK Proofs + EAS verification
- **💧 Liquidity Management** - Institutional-grade depth via Uniswap V4
- **🔄 Secure Swaps** - Whitelisted routing + ComplianceHook protection
- **📦 Developer Friendly** - Complete TypeScript SDK
- **🌐 Monorepo Architecture** - SDK, contracts, and circuits under one roof

## 🏗️ Project Structure (Monorepo)

```
ilal/
├── packages/
│   ├── sdk/              # ⭐ ILAL SDK (core product)
│   ├── contracts/        # Smart contracts (Foundry)
│   └── circuits/         # ZK circuits (Circom)
├── apps/
│   ├── landing/          # Landing Page (Next.js)
│   ├── api/              # SaaS API (includes original Verifier Relay)
│   ├── bot/              # Telegram Bot (Clawdbot)
│   └── subgraph/         # The Graph Indexer
├── scripts/              # Deployment and test scripts
└── docs/                 # Technical documentation
```

## 📦 SDK API Overview

### Core Modules

| Module | Function | Example |
|--------|----------|---------|
| **Session** | Compliance session management | `client.session.activate()` |
| **Swap** | Token exchange | `client.swap.execute(params)` |
| **Liquidity** | Liquidity management | `client.liquidity.add(params)` |
| **ZKProof** | Zero-knowledge proof generation | `client.zkproof.generate(addr)` |
| **EAS** | Identity verification | `client.eas.getVerification(addr)` |

### Examples

See the [`packages/sdk/examples/`](packages/sdk/examples/) directory:

- [Basic Setup](packages/sdk/examples/01-basic-setup.ts)
- [Session Management](packages/sdk/examples/02-session-management.ts)
- [Basic Swap](packages/sdk/examples/03-basic-swap.ts)
- [Add Liquidity](packages/sdk/examples/04-add-liquidity.ts)
- [ZK Proof Generation](packages/sdk/examples/05-zk-proof.ts)
- [EAS Verification](packages/sdk/examples/06-eas-verification.ts)

## 🔗 Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| Registry | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SessionManager | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| ComplianceHook | `0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80` |
| SimpleSwapRouter | `0xfBfc94f61b009C1DD39dB88A3b781199973E2e44` |
| PositionManager | `0x5b460c8Bd32951183a721bdaa3043495D8861f31` |

## 🧪 Testing

### Mock Theater Test (Dual Account Scenario)

```bash
cd scripts/system-test
export ACCOUNT_A_KEY="0x..." # Institutional whale
export ACCOUNT_B_KEY="0x..." # High-frequency trader
./run-theater.sh
```

**Test documentation**: [`scripts/system-test/README-MOCK-THEATER.md`](scripts/system-test/README-MOCK-THEATER.md)

### SDK Unit Tests

```bash
cd packages/sdk
npm test
```

## 🏃 Local Development (Monorepo)

### Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### Start Development Environment

```bash
# Parallel build all packages
pnpm turbo build

# Start SDK dev mode + APIs
pnpm turbo dev
```

### Build Individual Packages

```bash
# Build SDK
cd packages/sdk
npm run build

# Build contracts
cd packages/contracts
forge build

# Build ZK circuits
cd packages/circuits
npm run build
```

## 📚 Documentation

- **Documentation Index**: [`docs/INDEX.md`](docs/INDEX.md)
- **SDK Documentation**: [`packages/sdk/README.md`](packages/sdk/README.md)
- **SaaS API (API Key + REST)**: [`docs/API.md`](docs/API.md)
- **Contracts & chain config (addresses, RPC)**: [`docs/contracts.md`](docs/contracts.md)
- **Contract Documentation**: [`packages/contracts/README.md`](packages/contracts/README.md)
- **Deployment Guide**: [`docs/guides/DEPLOYMENT.md`](docs/guides/DEPLOYMENT.md)
- **Architecture Design**: [`docs/guides/ARCHITECTURE.md`](docs/guides/ARCHITECTURE.md)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

Apache-2.0 © 2026 ILAL Team

## 🔗 Links

- **GitHub**: [github.com/your-org/ilal](https://github.com/your-org/ilal)
- **Documentation**: [docs.ilal.xyz](https://docs.ilal.xyz)
- **Discord**: [discord.gg/ilal](https://discord.gg/ilal)
- **Twitter**: [@ILALProtocol](https://twitter.com/ILALProtocol)

---

**🎯 Core Philosophy**: ILAL focuses on providing compliance solutions at the infrastructure layer. We are not a DEX — we are the infrastructure provider that enables institutions to securely access DeFi liquidity.

**🚀 Current Status**: Deployed on Base Sepolia testnet. SDK v0.1.0 released. Mainnet launch coming soon.

**Made with ❤️ for the DeFi ecosystem**
