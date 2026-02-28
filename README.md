# ILAL - Institutional Liquidity Access Layer

> **API As A Service for Compliant Institutional DeFi**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-blue)](https://basescan.org)

ILAL is an enterprise-grade API and smart contract infrastructure layer designed strictly for institutions (funds, market makers, OTC desks). It enables programmatic, fully-compliant access to on-chain liquidity (Uniswap v4) via Zero-Knowledge (ZK) compliance sessions.

**For institutions, UI is secondary. ILAL is an API-first platform.** We provide a robust REST API that constructs highly complex, compliance-wrapped DeFi transaction payloads. Institutions simply fetch the payload, sign it with their own custody infrastructure (e.g., Fireblocks, Copper, MPC wallets), and broadcast it to the blockchain.

---

## 🏗️ Architecture: How It Works

ILAL’s compliance is enforced strictly at the smart contract layer using **Uniswap v4 Hooks**, ensuring that no unverified address can interact with the liquidity pools.

1. **Session Minting**: Institutional clients pass off-chain or ZK KYC/AML checks. ILAL's backend Verifier securely mints a Time-To-Live (TTL) Compliance Session on the on-chain `SessionManager` contract.
2. **Payload Generation (REST API)**: The institution's backend calls the ILAL API proposing a Swap or Liquidity provision. ILAL generates a raw, unsigned EVM transaction payload containing the encoded routing and `hookData`.
3. **Execution**: The institution signs the transaction from their cold storage or MPC wallet and broadcasts it.
4. **On-chain Hook Verification**: Before the Uniswap v4 Pool executes the swap, the `ComplianceHook` intercepts the transaction, verifies the user's `hookData`, and checks the `SessionManager` for an active compliance session. Non-compliant trades are mathematically reverted.

---

## 🚀 Quick Start (API As A Service)

### 1. Execute a Compliant Swap via API

Institutions interact with our API to build the raw transaction:

```bash
curl -X POST https://api.ilal.tech/api/v1/defi/swap \
  -H "Authorization: Bearer <INSTITUTION_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "tokenOut": "0x4200000000000000000000000000000000000006",
    "amount": "1000000",
    "zeroForOne": true,
    "userAddress": "0xYourInstitutionalColdWalletAddress"
  }'
```

**Response (Unsigned Payload):**
```json
{
  "success": true,
  "transaction": {
    "to": "0x851A12a1A0A5670F4D8A74aD0f3534825EC5e7c2",
    "data": "0x41c0e5280000...", // Encoded Uniswap v4 router calldata + hookData
    "value": "0x0",
    "chainId": 84532,
    "gas": "0x1E8480"
  },
  "instructions": {
    "description": "Sign and broadcast this transaction with your custody wallet."
  }
}
```

### 2. Sign and Broadcast (Client Side)

Using `ethers.js`, `viem`, or an MPC provider:

```javascript
// Using ethers.js as an example
const tx = await institutionalSigner.sendTransaction({
    to: payload.transaction.to,
    data: payload.transaction.data,
    value: payload.transaction.value,
    gasLimit: payload.transaction.gas
});
console.log("Compliant Swap Executed:", tx.hash);
```

---

## 🛠️ Tech Stack & Monorepo Structure

```text
ilal/
├── apps/
│   ├── api/              # Core SaaS REST API (Node.js, Express, Prisma, Viem)
│   ├── landing/          # Institutional Dashboard (Next.js, Tailwind, Wagmi)
│   └── bot/              # Telegram Notification Bot
├── packages/
│   ├── contracts/        # Foundry Smart Contracts (v4 Hooks, Session Manager)
│   ├── sdk/              # TS SDK for frontend/Node integrations
│   └── circuits/         # ZK-SNARK Circom Circuits
└── scripts/              # Deployment and Testing
```

## 🔗 Contract Deployments (Base Sepolia)

All ILAL core infrastructure is live on Base Sepolia testnet interacting with Uniswap v4 pools.

| Contract | Address |
|----------|---------|
| **Registry** (Router Whitelist) | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| **SessionManager** (Identity TTL) | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| **ComplianceHook** (v4 Interceptor) | `0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80` |
| **SimpleSwapRouter** (Execution) | `0x851A12a1A0A5670F4D8A74aD0f3534825EC5e7c2` |
| **PositionManager** (Liquidity) | `0x5b460c8Bd32951183a721bdaa3043495D8861f31` |
| **Test USDC** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| **Test WETH** | `0x4200000000000000000000000000000000000006` |

---

## ⚙️ Local Development

### Prerequisites
- Node.js >= 18
- Foundry (for smart contracts)
- `pnpm`

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages (SDK, contracts, etc.)
pnpm turbo build

# Start the API and Dashboard in development mode
pnpm turbo dev
```

The Dashboard will be live at `http://localhost:3000` and the API at `http://localhost:3001`.

---

## 🛡️ For Auditors & Security

ILAL's smart contract architecture focuses on absolute separation of concerns:
- `ComplianceHook` only checks the `Registry` (to authorize routers) and `SessionManager` (to authorize users).
- The REST API holds the `VERIFIER_PRIVATE_KEY` strictly to grant on-chain sessions. It **never** has access to institutional user funds or private keys. The API only builds unsigned Hex payloads.

## 📄 License
Apache-2.0 © 2026 ILAL Team
