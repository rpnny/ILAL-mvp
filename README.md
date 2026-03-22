# ILAL — Institutional Liquidity Access Layer

> ZK-powered compliance infrastructure for Uniswap v4. Verify once, trade forever.

[![Tests](https://img.shields.io/badge/Tests-350%2B_passing-brightgreen)](#test-coverage)
[![E2E](https://img.shields.io/badge/E2E-15%2F15_Base_Sepolia-brightgreen)](https://sepolia.basescan.org/address/0xe633220f15932428FcA60A1A2C2C48797A180A80)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-blue)](.github/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

---

## What is ILAL?

ILAL is a Uniswap v4 Hook that enforces KYC/AML compliance at the protocol level using zero-knowledge proofs. Institutions verify their identity once via a ZK proof, receive a time-limited on-chain session, and then trade freely — no per-transaction compliance overhead.

**Core idea:** Move compliance from per-trade to per-session. One ZK proof unlocks 24 hours of unlimited, compliant trading.

## Performance (Benchmarked)

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Tests** | 350+ passing | Solidity + API + Frontend + E2E |
| **Base Sepolia E2E** | 15/15 (100%) | Full flow: register → ZK proof → on-chain swap |
| **ZK Proof Generation** | ~15 s | PLONK fullProve (WASM, 19,763 constraints) |
| **Off-chain ZK Verification** | 8.2 ms median | snarkjs PLONK verify |
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
| **ComplianceHook** | `0xe633220f15932428FcA60A1A2C2C48797A180A80` | [View](https://sepolia.basescan.org/address/0xe633220f15932428FcA60A1A2C2C48797A180A80) |
| **SessionManager** (UUPS) | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` | [View](https://sepolia.basescan.org/address/0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2) |
| **Registry** (UUPS) | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` | [View](https://sepolia.basescan.org/address/0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD) |
| **SimpleSwapRouter** | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` | [View](https://sepolia.basescan.org/address/0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891) |
| **PositionManager** | `0x692548a6E1797d2762b9d04f29112C172E5Cea32` | [View](https://sepolia.basescan.org/address/0x692548a6E1797d2762b9d04f29112C172E5Cea32) |
| **PlonkVerifier** (v2) | `0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A` | [View](https://sepolia.basescan.org/address/0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A) |
| **PlonkVerifierAdapter** (v2) | `0x8e093aC51921fe2be9bd0910092a01200AAd6560` | [View](https://sepolia.basescan.org/address/0x8e093aC51921fe2be9bd0910092a01200AAd6560) |

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
├── scripts/              # System tests, E2E scripts, deployment tools
├── .github/workflows/    # CI pipeline (contracts, API, SDK, landing)
└── docs/                 # Guides, API reference, architecture docs
```

## Quick Start

### Prerequisites
- Node.js >= 18, pnpm, Foundry

### Build & Test

```bash
# Install
pnpm install

# Run all Foundry tests (219 tests)
cd packages/contracts && forge test -v

# API unit tests (102 tests)
pnpm --filter @ilal/api test

# Frontend component tests (20 tests)
pnpm --filter @ilal/landing test

# ZK circuit compile + setup
cd packages/circuits && bash scripts/compile.sh && bash scripts/setup.sh

# Full E2E on Base Sepolia (requires API running + .env configured)
pnpm --filter @ilal/api dev &
npx tsx scripts/institutional-e2e.ts

# Local validation script (runs all local tests)
bash scripts/check.sh
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

**350+ tests across 4 layers, CI via GitHub Actions.**

### Solidity (219 tests — Foundry)

```
  Unit Tests (68):
    ComplianceHook ........... 14 tests (router whitelist, hookData validation, events)
    SessionManager ........... 16 tests (start/end/batch, expiry, upgrades)
    Registry ................. 23 tests (issuer CRUD, router ACL, emergency, upgrades)
    EIP712Verifier ........... 9 tests  (permits, replay, nonce, gas)
    PositionManager .......... 6 tests  (mint, burn, increase/decrease, transfer block)

  Integration Tests (50):
    SwapRouterTest ........... 18 tests (EIP-712, session reactivation, cross-user)
    ForkSwapTest ............. 8 tests  (live Base Sepolia swap, slippage, pause)
    FullFlow ................. 8 tests  (multi-user, session expiry, router auth)
    ForkTest ................. 7 tests  (contract linkage verification)
    PlonkIntegration ......... 7 tests  (adapter, gas, interface)
    E2EMockProof ............. 6 tests  (full verification flow, gas estimation)
    E2E ...................... 3 tests  (complete user journey, emergency, blocked user)
    RealPlonkProof ........... 3 tests  (actual PLONK proof on-chain verification)

  Simulation / Adversarial (81):
    WarTheater ............... 45 tests (multi-actor battle simulation)
    AttackVectors ............ 28 tests (MEV, front-running, reentrancy)
    BattleInvariant .......... 8 tests  (invariant fuzzing under adversarial conditions)

  Fuzz / Invariant (5):
    ComplianceInvariant ...... 5 invariants × 256 runs

  Hell Mode (15):
    HellMode ................. 8 tests  (fake sig, replay, unauthorized, upgrade, gas)
    ForkTest ................. 7 tests  (on-chain deployment verification)
```

### API (102 tests — Vitest)

```
  auth.controller ........... 14 tests (register, login, refresh, edge cases)
  auth.middleware ............ 5 tests  (JWT validation, expiry, missing tokens)
  apikey.controller ......... 12 tests (create, list, revoke, permissions)
  apikey.middleware .......... 8 tests  (key validation, rate limits, disabled keys)
  billing.controller ........ 8 tests  (plan management, usage queries)
  billing.service ........... 11 tests (plan upgrades, quota calculation)
  defi.controller ........... 9 tests  (swap/liquidity TX building)
  defi.service .............. 7 tests  (token sorting, slippage, ticks)
  onboarding.controller ..... 8 tests  (institution registration, attestation)
  verify.controller ......... 13 tests (ZK proof, session, anti-replay)
  usage.middleware ........... 7 tests  (usage tracking, quota enforcement)
```

### Frontend (20 tests — Vitest + React Testing Library)

```
  SwapWidget ................ 9 tests  (render, input, token selection, swap flow)
  SessionStatusCard ......... 6 tests  (active/expired/no session states)
  UserMenu .................. 5 tests  (authenticated/guest, plan display)
```

### E2E — Base Sepolia (15 tests — Live Testnet)

```
  Phase 1: API Health Check .................. ✅
  Phase 2: Register + Login + API Key ........ ✅ (2 tests)
  Phase 3: Institution Onboarding ............ ✅ (2 tests)
  Phase 4: Attestation → ZK Proof → Session .. ✅ (3 tests, 15s proof gen)
  Phase 5: Build Swap/Liquidity TX ........... ✅ (2 tests)
  Phase 6: On-chain Swap (EIP-712) ........... ✅ (2 TXs, real mUSD/mTBILL)
  Phase 7: Balance Verification + Cleanup .... ✅ (3 tests)

  On-chain TXs:
    Trade 1: https://sepolia.basescan.org/tx/0xa78f45ea060616c00451cee734b4a33d917e15002cde4b2469f9bbcb4cac74cd
    Trade 2: https://sepolia.basescan.org/tx/0xf2e363d1e6b6979af46b56f42e0bee60c832f6024dbc10a3f544846d25a90a18
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
