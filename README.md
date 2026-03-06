# ILAL — Institutional Liquidity Access Layer

> ZK-powered compliance infrastructure for Uniswap v4. Verify once, trade forever.

[![Tests](https://img.shields.io/badge/Foundry_Tests-136%2F136-brightgreen)](packages/contracts)
[![Base Sepolia](https://img.shields.io/badge/Live-Base_Sepolia-blue)](https://sepolia.basescan.org/address/0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

---

## What is ILAL?

ILAL is a Uniswap v4 Hook that enforces KYC/AML compliance at the protocol level using zero-knowledge proofs. Institutions verify their identity once via a ZK proof, receive a time-limited on-chain session, and then trade freely — no per-transaction compliance overhead.

**Core idea:** Move compliance from per-trade to per-session. One ZK proof unlocks 24 hours of unlimited, compliant trading.

## Performance (Benchmarked)

| Metric | Value | Notes |
|--------|-------|-------|
| **Foundry Tests** | 136/136 (100%) | Unit, integration, fork, invariant, fuzz |
| **Off-chain ZK Verification** | 8.2 ms median | snarkjs PLONK verify |
| **ZK Proof Generation** | ~14.8 s | PLONK fullProve (WASM) |
| **Per-swap Compliance Overhead** | ~15,000 gas (~$0.0003) | Session-cached SLOAD |
| **On-chain PLONK Verification** | 683,986 gas (~$0.016) | One-time per session |
| **Hook Address Bitmask** | Verified (0x0A80) | beforeSwap + beforeAddLiquidity + beforeRemoveLiquidity |

## Architecture

```
Institutional Client
        │
        ▼
   ┌─────────┐     ZK Proof      ┌──────────┐    startSession()   ┌───────────────┐
   │  ILAL   │ ──────────────►   │  PLONK   │ ─────────────────►  │  Session      │
   │  API    │                   │  Verifier │                     │  Manager      │
   └─────────┘                   └──────────┘                     └───────┬───────┘
                                                                          │
   Swap Request                                                   isSessionActive()
        │                                                                 │
        ▼                                                                 ▼
   ┌──────────────┐    beforeSwap()    ┌──────────────────┐     ┌────────────────┐
   │  SimpleSwap  │ ─────────────────► │  ComplianceHook  │ ──► │  Uniswap v4    │
   │  Router      │                    │  (v4 Hook)       │     │  PoolManager   │
   └──────────────┘                    └──────────────────┘     └────────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │   Registry   │
                                       │ (Router ACL) │
                                       └──────────────┘
```

**Flow:**
1. Institution submits a ZK proof (EdDSA-Poseidon signature + Merkle membership) to the ILAL API.
2. API verifies the proof off-chain, then calls `SessionManager.startSession()` on-chain.
3. For each swap, the `ComplianceHook` checks `SessionManager.isSessionActive()` — a single SLOAD.
4. Non-compliant addresses are mathematically reverted before the swap executes.

## Contract Deployments (Base Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| **ComplianceHook** | `0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80` | [View](https://sepolia.basescan.org/address/0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80) |
| **SessionManager** (UUPS) | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` | [View](https://sepolia.basescan.org/address/0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2) |
| **Registry** (UUPS) | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` | [View](https://sepolia.basescan.org/address/0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD) |
| **SimpleSwapRouter** | `0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73` | [View](https://sepolia.basescan.org/address/0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73) |
| **PositionManager** | `0x664858fa4d3938788C7b7fE4f8d8f0864d087eA6` | [View](https://sepolia.basescan.org/address/0x664858fa4d3938788C7b7fE4f8d8f0864d087eA6) |
| **PlonkVerifier** | `0x2645C48A7DB734C9179A195C51Ea5F022B86261f` | [View](https://sepolia.basescan.org/address/0x2645C48A7DB734C9179A195C51Ea5F022B86261f) |
| **PlonkVerifierAdapter** | `0x0cDcD82E5efba9De4aCc255402968397F323AFBB` | [View](https://sepolia.basescan.org/address/0x0cDcD82E5efba9De4aCc255402968397F323AFBB) |

**External:** Uniswap v4 PoolManager at `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`

## Monorepo Structure

```
ilal/
├── apps/
│   ├── api/              # REST API — ZK verification, session relay, swap payloads
│   ├── landing/          # Institutional dashboard (Next.js)
│   └── bot/              # Market-making bot with session management
├── packages/
│   ├── contracts/        # Solidity — ComplianceHook, SessionManager, Registry (Foundry)
│   ├── sdk/              # TypeScript SDK for programmatic integration
│   └── circuits/         # Circom ZK circuits (EdDSA-Poseidon + Merkle)
├── scripts/              # System tests and deployment scripts
└── deployments/          # On-chain deployment records
```

## Quick Start

### Prerequisites
- Node.js >= 18, pnpm, Foundry

### Build & Test

```bash
# Install
pnpm install

# Run all 136 Foundry tests
cd packages/contracts && forge test -v

# Run fork tests against live Base Sepolia contracts
forge test --match-contract ForkSwapTest -vv

# ZK proof benchmark
cd packages/circuits && node scripts/benchmark-zk.js

# API
cd apps/api && npx prisma db push && npm run dev
```

## Security Model

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| **Identity** | ZK Proof (PLONK) | EdDSA-Poseidon signature + Merkle tree membership |
| **Session** | On-chain TTL | 24h sessions, renewable with limits (max 6 renewals per ZK proof) |
| **Swap Auth** | ComplianceHook | `beforeSwap` checks `isSessionActive()` — reverts if expired |
| **Router ACL** | Registry whitelist | Only approved routers can forward hookData |
| **EIP-712** | Permit signatures | Separate SwapPermit and LiquidityPermit types |
| **Anti-replay** | Proof hashing | Each ZK proof can only be used once (keccak256 dedup) |
| **Emergency** | Global pause | Registry owner can halt all operations instantly |
| **Upgradability** | UUPS Proxy | Registry and SessionManager are upgradeable |

## Test Coverage

```
136 tests, 0 failures

  Unit Tests:
    ComplianceHook ........... 14 tests (router whitelist, hookData validation, events)
    SessionManager ........... 15 tests (start/end/batch, expiry, upgrades)
    Registry ................. 21 tests (issuer CRUD, router ACL, emergency, upgrades)
    EIP712Verifier ........... 9 tests  (permits, replay, nonce, gas)
    PositionManager .......... 6 tests  (mint, burn, increase/decrease, transfer block)

  Integration Tests:
    ForkSwapTest ............. 8 tests  (live Base Sepolia swap, slippage, pause)
    ForkTest ................. 7 tests  (contract linkage verification)
    FullFlow ................. 8 tests  (multi-user, session expiry, router auth)
    SwapRouterTest ........... 16 tests (EIP-712, session reactivation, cross-user)
    E2E ...................... 3 tests  (complete user journey, emergency, blocked user)
    E2EMockProof ............. 6 tests  (full verification flow, gas estimation)
    PlonkIntegration ......... 7 tests  (adapter, gas, interface)
    RealPlonkProof ........... 3 tests  (actual PLONK proof on-chain verification)

  Fuzz / Invariant:
    ComplianceInvariant ...... 5 invariants × 256 runs (nonce monotonic, session expiry, emergency)

  Adversarial (Hell Mode):
    HellMode ................. 8 tests  (fake sig, replay, unauthorized, upgrade, gas, NFT block)
```

## API Usage

```bash
# 1. Register & get API key
curl -X POST https://api.ilal.tech/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "fund@institution.com", "password": "...", "name": "Hedge Fund Alpha"}'

# 2. Submit ZK proof and activate session
curl -X POST https://api.ilal.tech/api/v1/verify \
  -H "Authorization: Bearer <token>" \
  -d '{"proof": "0x...", "publicInputs": ["..."], "userAddress": "0x..."}'

# 3. Build a compliant swap payload
curl -X POST https://api.ilal.tech/api/v1/defi/swap \
  -H "Authorization: Bearer <token>" \
  -d '{"tokenIn": "USDC", "tokenOut": "WETH", "amount": "1000000", "userAddress": "0x..."}'

# 4. Sign and broadcast the returned payload with your custody wallet
```

## Contact

**Email:** 2867755637@qq.com

## License

Apache-2.0
