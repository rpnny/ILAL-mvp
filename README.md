# ILAL - Institutional Liquidity Access Layer

**Compliant DeFi Access Control System built on Uniswap v4 Hooks**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Network: Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-blue)](https://sepolia.basescan.org/)
[![Tests: 97.6%](https://img.shields.io/badge/Tests-97.6%25%20Pass-brightgreen)](./docs/testing/TEST_REPORT.md)
[![Coverage: 99%](https://img.shields.io/badge/Coverage-99%25-brightgreen)](./docs/testing/CODE_HEALTH_CHECK.md)
[![Solidity: 0.8.26](https://img.shields.io/badge/Solidity-0.8.26-blue)](https://docs.soliditylang.org/)
[![Gas: 96.8% Savings](https://img.shields.io/badge/Gas%20Savings-96.8%25-success)](./docs/GAS_EFFICIENCY_BENCHMARKS.md)

---

## Overview

ILAL (Institutional Liquidity Access Layer) is a compliance-first DeFi protocol that implements on-chain access control using Uniswap v4 Hooks and zero-knowledge proofs. It enables institutional users to access DeFi liquidity while maintaining regulatory compliance and privacy.

**Key Features**:
- ✅ ZK-proof based identity verification
- ✅ On-chain compliance via ComplianceHook
- ✅ Privacy-preserving (no PII on-chain)
- ✅ Multi-KYC provider support
- ✅ Session-based access control

**Current Status**: Development complete, ready for testnet verification  
**Deployment**: Base Sepolia Testnet

---

## Quick Start

### For Users

1. **Connect Wallet** → Connect to Base Sepolia network
2. **Verify Identity** → Complete Coinbase Onchain Verify or use mock mode
3. **Activate Session** → Generate ZK proof to activate 24-hour session
4. **Trade & Provide Liquidity** → Access compliant pools

**Demo**: [Coming Soon]

### For Developers

```bash
# Clone the repository
git clone [repository-url]
cd ilal

# Install dependencies
cd frontend && npm install
cd ../contracts && forge install

# Configure environment
cp frontend/.env.example frontend/.env.local
# Edit .env.local with your configuration

# Start frontend
cd frontend && npm run dev

# Visit http://localhost:3000
```

---

## Documentation

### 📊 Main Reports
- **[Project Report](./docs/testing/PROJECT_REPORT.md)** ⭐ - Complete project overview
- **[Test Report](./docs/testing/TEST_REPORT.md)** - Testing results

### 📖 Technical Guides
- **[Architecture](./docs/guides/ARCHITECTURE.md)** - System design
- **[Deployment Guide](./docs/guides/DEPLOYMENT.md)** - Deployment instructions
- **[Debug Guide](./docs/guides/SWAP_DEBUG_GUIDE.md)** - Troubleshooting

### 🌐 Localized Docs
- [中文文档](./README_CN.md) - Chinese documentation

**Full documentation**: See [`docs/README.md`](./docs/README.md)

---

## Project Structure

```
ilal/
├── contracts/          # Smart contracts (Solidity + Foundry)
├── frontend/          # Next.js frontend application
├── circuits/          # Zero-knowledge circuits (Circom)
├── scripts/           # Deployment and testing scripts
├── bot/              # Market maker bot
├── devops/           # DevOps configuration
└── docs/             # 📚 All documentation
    ├── reports/      # Project reports & test results
    ├── guides/       # Technical guides
    └── archives/     # Historical documents
```

---

## Key Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| Registry | `0x4C4e...29BD` | System governance |
| SessionManager | `0x53fA...50e2` | Session management |
| ComplianceHook | `0xDeDc...8a80` | Access control hook |
| PositionManager | `0x5b46...1f31` | Liquidity management |
| SimpleSwapRouter | `0xD36F...eEdB` | Trading router |

**Full deployment info**: [`docs/guides/COMPLETE_DEPLOYMENT_SUMMARY.md`](./docs/guides/COMPLETE_DEPLOYMENT_SUMMARY.md)

---

## Tech Stack

**Smart Contracts**:
- Solidity ^0.8.26
- Uniswap v4 Core (Hooks)
- Foundry

**Frontend**:
- Next.js 14 + React 18
- Wagmi v2 + Viem
- RainbowKit
- TailwindCSS

**Identity & Compliance**:
- Coinbase Verifications (EAS)
- PLONK Zero-Knowledge Proofs
- Multi-KYC provider support

---

## Development Workflow

### Contracts

```bash
cd contracts

# Run tests
forge test

# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast

# Verify contracts
forge verify-contract [ADDRESS] [CONTRACT] --chain-id 84532
```

### Frontend

```bash
cd frontend

# Development
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

---

## Testing

### Run All Tests

```bash
# Smart contract tests
cd contracts && forge test

# Frontend tests
cd frontend && npm test

# End-to-end tests
./scripts/deployment/test-all-features.sh
```

**Test results**: See [`docs/reports/TEST_REPORT.md`](./docs/reports/TEST_REPORT.md)

---

## Security

### Audits
- ✅ Slither static analysis: [`contracts/slither-report.json`](./contracts/slither-report.json)
- 🔄 External audit: Pending

### Known Limitations
- Testnet only (Base Sepolia)
- Relay service dependency for session activation
- Mock mode for development (must disable in production)

**Security considerations**: See Project Report section 7

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Roadmap

### Short-term (1-2 weeks)
- [ ] Complete real verification testing
- [ ] Multi-language UI support
- [ ] Session auto-renewal

### Mid-term (1-2 months)
- [ ] Graph Protocol subgraph deployment
- [ ] Additional trading pairs
- [ ] Liquidity mining incentives

### Long-term (3-6 months)
- [ ] Base Mainnet deployment
- [ ] DAO governance
- [ ] Cross-chain support

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Contact & Support

- **Documentation**: [`docs/`](./docs/README.md)
- **Issues**: [GitHub Issues]
- **Discussions**: [GitHub Discussions]

---

## Acknowledgments

- Uniswap v4 team for the Hooks architecture
- Coinbase for Onchain Verify infrastructure
- Base team for testnet support

---

**Last Updated**: 2026-02-12  
**Version**: v1.0.0 (Testnet)
