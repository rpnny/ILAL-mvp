# ILAL — Institutional Liquidity Access Layer

> ZK-powered compliance infrastructure for Uniswap v4. Verify once, trade freely.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Network](https://img.shields.io/badge/Network-Base_Sepolia_(Testnet)-orange)](https://sepolia.basescan.org)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-blue)](.github/workflows/ci.yml)
[![Frontend](https://img.shields.io/badge/Frontend-ilal.tech-green)](https://ilal.tech)

---

## Overview

ILAL is a Uniswap v4 Hook that enforces KYC/AML compliance at the protocol level using zero-knowledge proofs. Rather than checking compliance on every transaction, institutions submit a single ZK proof to receive a time-limited on-chain session — then trade without per-swap friction.

**Core design principle:** Compliance belongs at session initiation, not at every swap. One ZK proof unlocks 24 hours of compliant, unlimited trading.

**Current stage:** Security-hardened MVP on Base Sepolia testnet. Core ZK verification, session management, owner-scoped API authorization, and on-chain swap flows are functional. Billing enforcement and usage tracking are not yet implemented.

### Latest Validation

- Live API ownership protections are deployed on Railway: cross-account onboarding status, attestation, and session activation attempts now fail with `403`
- Public session reads are no longer exposed anonymously: `/api/v1/session/:address` now returns `401` without auth
- End-to-end live validation passed on the current deployment: register -> onboarding -> attestation -> proof -> session activation -> 2 real Base Sepolia swaps -> balance verification
- Latest successful live swap transactions:
  - [`0x2af30c93...`](https://sepolia.basescan.org/tx/0x2af30c931c076095e633aee489c62d9f84f6c3e7292b0f20ebf2801202b1008b)
  - [`0x1193ddc1...`](https://sepolia.basescan.org/tx/0x1193ddc1653849ff0cfd1b02cbb67cf0b06e750757032f8cc66ee60c4fb4dfd2)

---

## How It Works

```
Institution
     │
     │  1. Submit ZK proof (EdDSA-Poseidon + Merkle membership)
     ▼
┌─────────┐        off-chain verify        ┌───────────────┐
│  ILAL   │ ─────────────────────────────► │     PLONK     │
│  API    │                                │    Verifier   │
└────┬────┘                                └───────────────┘
     │
     │  2. Relay: startSession() on-chain
     ▼
┌───────────────┐
│  Session      │  TTL: 24h
│  Manager      │  Max renewals: 6 per proof
└───────┬───────┘
        │
        │  3. isSessionActive() — single SLOAD per swap
        ▼
┌──────────────────┐    beforeSwap()    ┌────────────────┐
│  ComplianceHook  │ ◄───────────────── │  Uniswap v4    │
│  (v4 Hook)       │                    │  PoolManager   │
└──────────────────┘                    └────────────────┘
        │
        │  Reverts if no active session
        ▼
   Compliant swap executes (or reverts with NotCompliant)
```

**Key properties:**
- Non-compliant addresses revert mathematically — no admin action needed
- ZK proof reveals nothing about the institution's identity on-chain
- API onboarding/session/attestation reads are owner-scoped — no public or cross-account session activation
- Hook bitmask `0x0A80` covers `beforeSwap`, `beforeAddLiquidity`, `beforeRemoveLiquidity`

---

## Deployments (Base Sepolia Testnet)

| Contract | Address | Explorer |
|----------|---------|----------|
| **ComplianceHook** | `0xe633220f15932428FcA60A1A2C2C48797A180A80` | [View](https://sepolia.basescan.org/address/0xe633220f15932428FcA60A1A2C2C48797A180A80) |
| **SessionManager** (UUPS) | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` | [View](https://sepolia.basescan.org/address/0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2) |
| **Registry** (UUPS) | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` | [View](https://sepolia.basescan.org/address/0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD) |
| **SimpleSwapRouter** | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` | [View](https://sepolia.basescan.org/address/0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891) |
| **PlonkVerifier** (v2) | `0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A` | [View](https://sepolia.basescan.org/address/0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A) |
| **PlonkVerifierAdapter** (v2) | `0x8e093aC51921fe2be9bd0910092a01200AAd6560` | [View](https://sepolia.basescan.org/address/0x8e093aC51921fe2be9bd0910092a01200AAd6560) |

**External dependency:** Uniswap v4 PoolManager at `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`

---

## Live Services

| Service | URL | Status |
|---------|-----|--------|
| **Frontend Dashboard** | https://ilal.tech | Live (Vercel) |
| **API Backend** | https://ilal-mvp-production.up.railway.app | Live (Railway) |
| **API Health** | [`/api/v1/health`](https://ilal-mvp-production.up.railway.app/api/v1/health) | Connected to Base Sepolia |

---

## Performance (Measured on Base Sepolia)

| Metric | Value | Notes |
|--------|-------|-------|
| ZK Proof Generation | ~15 s | PLONK `fullProve`, 19,763 constraints, WASM |
| Off-chain ZK Verification | 8.2 ms median | snarkjs PLONK verify |
| Per-swap Compliance Overhead | ~15,000 gas (~$0.0003) | Single `SLOAD` on session cache |
| On-chain PLONK Verification | 683,986 gas (~$0.016) | One-time cost per session |
| Session Duration | 24 hours | Max 6 renewals per ZK proof |

---

## Repository Structure

```
ilal/
├── apps/
│   ├── api/              # Express API — ZK verification, session relay, swap TX building
│   ├── demo/             # Vite demo app for live onboarding / swap walkthroughs
│   ├── landing/          # Institutional dashboard + Next.js API routes (Next.js 14)
│   └── bot/              # Market-making bot prototype (WIP)
├── packages/
│   ├── contracts/        # Solidity — ComplianceHook, SessionManager, Registry (Foundry)
│   ├── sdk/              # TypeScript SDK for programmatic integration
│   └── circuits/         # Circom ZK circuits (EdDSA-Poseidon + Merkle membership)
├── scripts/              # E2E tests, system tests, deployment utilities
├── .github/workflows/    # CI pipeline (contracts, API, frontend)
└── docs/                 # API reference, architecture notes, deployment guides
```

---

## API Reference

### ⚠️ Integration Quick-Start (Read First)

> **Note:** The docs site at `ilal.tech/docs` may show a stale base URL. Always use the addresses below.

| Endpoint type | Base URL |
|---|---|
| Auth / API Key management | `https://www.ilal.tech/api/v1` |
| DeFi (swap / liquidity / session) | `https://ilal-mvp-production.up.railway.app/api/v1` |

**Step 1 — Register**
```bash
curl -X POST https://www.ilal.tech/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@institution.com","password":"SecurePass123!","name":"Fund Name"}'
# → { "accessToken": "eyJ...", "user": { ... } }
```

**Step 2 — Create an API Key** (save it — shown only once)
```bash
curl -X POST https://www.ilal.tech/api/v1/apikeys \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"production-key"}'
# → { "apiKey": "ilal_live_xxx", "permissions": "verify,session,defi:swap,defi:liquidity,usage:read" }
```

**Step 3 — Build a Swap Transaction**
```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/swap \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn":     "0x4200000000000000000000000000000000000006",
    "tokenOut":    "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "amount":      "1000000000000000",
    "zeroForOne":  false,
    "userAddress": "0xYOUR_WALLET"
  }'
# → { "success": true, "transaction": { "to": "0x...", "data": "0x..." },
#     "preflight": { "sessionActive": false, "canBroadcastSafely": false,
#                    "warning": "No active compliance session..." } }
```

**Step 4 — Add Liquidity**
```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/liquidity \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "token0":      "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1":      "0x4200000000000000000000000000000000000006",
    "amount0":     "100000",
    "amount1":     "1000000000000000",
    "tickLower":   -600,
    "tickUpper":   600,
    "userAddress": "0xYOUR_WALLET"
  }'
```

### Key Notes

- **Authentication:** Use `X-API-Key: ilal_live_xxx` for server-to-server calls. Use `Authorization: Bearer <token>` for dashboard/JWT flows. All protected endpoints accept both.
- **`zeroForOne` direction:** USDC address (`0x036...`) sorts before WETH (`0x420...`). WETH→USDC = `zeroForOne: false`. USDC→WETH = `zeroForOne: true`.
- **Compliance session:** `preflight.sessionActive: false` means on-chain broadcast will revert. Call `/api/v1/verify` first to activate a 24-hour session.
- **Error codes:** API Key errors return machine-readable `code` field: `API_KEY_FORMAT_INVALID`, `API_KEY_PREFIX_NOT_FOUND`, `API_KEY_HASH_MISMATCH`, `API_KEY_INACTIVE`, `API_KEY_EXPIRED`, `API_KEY_SCOPE_MISSING`.
- **Preflight enforcement:** Add `?requireActiveSession=true` to force a `412 Precondition Failed` instead of a warning when session is inactive.
- **Network:** Base Sepolia testnet (chainId: 84532). RPC: `https://sepolia.base.org`.

### Tokens (Base Sepolia)

| Token | Address |
|---|---|
| WETH | `0x4200000000000000000000000000000000000006` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

### ZK Session Flow

```bash
# Submit ZK proof — activates on-chain session via relayer
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/verify \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"proof": {...}, "publicInputs": ["..."], "userAddress": "0x..."}'

# Check session status
curl https://ilal-mvp-production.up.railway.app/api/v1/verify/session?address=0xYOUR_WALLET \
  -H "X-API-Key: ilal_live_xxx"
# → { "isActive": true, "remainingSeconds": 86400, "expiresAt": "..." }
```

Full API reference: [`docs/guides/saas/API_REFERENCE.md`](docs/guides/saas/API_REFERENCE.md)

---

## Security Model

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| **Identity** | ZK Proof (PLONK) | EdDSA-Poseidon signature + Merkle tree membership — reveals nothing on-chain |
| **Session** | On-chain TTL | 24h sessions, max 6 renewals per ZK proof |
| **Swap Gate** | ComplianceHook | `beforeSwap` checks `isSessionActive()` — single SLOAD, reverts if expired |
| **Router ACL** | Two-tier router whitelist | Generic routers must be approved; Mode 2 identity forwarding requires a stricter identity-router allowlist |
| **Permit signing** | EIP-712 | Separate `SwapPermit` and `LiquidityPermit` typed data |
| **Anti-replay** | Proof dedup | Each ZK proof hashed (keccak256) and rejected on reuse |
| **API ownership** | Institution -> User binding | `/verify`, onboarding status, attestation, and session reads reject cross-account access |
| **Emergency** | Global pause | Registry owner can halt all operations instantly |
| **Upgradability** | UUPS Proxy | Registry and SessionManager are upgradeable |

---

## Security Status

The current deployment includes the following hardening work:

- Cross-account API access is blocked by binding `Institution -> User` ownership in onboarding, verification, attestation, and session-query paths
- `ComplianceHook` no longer treats generic approved routers as identity-forwarding routers; Mode 2 identity forwarding is restricted to a stricter allowlist
- Frontend/API integration no longer relies on public session endpoints or hard-coded backend paths for protected flows
- Production API config requires explicit refresh-secret and CORS/proxy controls rather than permissive defaults

Residual risk profile:

- Mainnet deployment has not started and should still be gated on independent audit review
- Billing/quota enforcement remains placeholder logic and should not be treated as a hardened abuse-control layer
- Testnet/demo wallets and tokens should be treated as disposable operational assets

---

## Tests

### Solidity — Foundry (219 tests)

```
Unit Tests (68):
  ComplianceHook ........... 14 (router whitelist, hookData, events)
  SessionManager ........... 16 (start/end/batch, expiry, upgrades)
  Registry ................. 23 (issuer CRUD, router ACL, emergency, upgrades)
  EIP712Verifier ............ 9 (permits, replay, nonce)
  PositionManager ........... 6 (mint, burn, increase/decrease)

Integration Tests (50):
  SwapRouterTest ........... 18 (EIP-712, session reactivation, cross-user)
  ForkSwapTest .............. 8 (live Base Sepolia fork, slippage, pause)
  FullFlow .................. 8 (multi-user, expiry, router auth)
  PlonkIntegration .......... 7 (adapter, gas, interface)
  E2EMockProof .............. 6 (full verification flow)
  E2E ....................... 3 (user journey, emergency, blocked user)

Simulation / Adversarial (81):
  WarTheater ............... 45 (multi-actor battle simulation)
  AttackVectors ............ 28 (MEV, front-running, reentrancy)
  BattleInvariant ........... 8 (invariant fuzzing)

Fuzz / Invariant (5 invariants × 256 runs)
Hell Mode (15): fake sig, replay, unauthorized upgrade, gas extremes
```

### API — Vitest (106 tests)

```
auth.controller ........... 14   auth.middleware ............ 5
apikey.controller ......... 12   apikey.middleware .......... 8
billing.controller ......... 8   billing.service ........... 11
defi.controller ............ 9   defi.service ............... 7
onboarding.controller ...... 8   verify.controller ......... 13
usage.middleware ........... 7
```

### Frontend — Vitest + React Testing Library (20 tests)

```
SwapWidget ................ 9   SessionStatusCard .......... 6   UserMenu .................. 5
```

### E2E — Base Sepolia Live Testnet (14 phases)

Full flow: register → login → onboard institution → generate ZK proof → activate on-chain session → build & broadcast swap → verify balances.

Verified on-chain transactions:
- [`0xa78f45ea...`](https://sepolia.basescan.org/tx/0xa78f45ea060616c00451cee734b4a33d917e15002cde4b2469f9bbcb4cac74cd)
- [`0xf2e363d1...`](https://sepolia.basescan.org/tx/0xf2e363d1e6b6979af46b56f42e0bee60c832f6024dbc10a3f544846d25a90a18)
- [`0x2af30c93...`](https://sepolia.basescan.org/tx/0x2af30c931c076095e633aee489c62d9f84f6c3e7292b0f20ebf2801202b1008b)
- [`0x1193ddc1...`](https://sepolia.basescan.org/tx/0x1193ddc1653849ff0cfd1b02cbb67cf0b06e750757032f8cc66ee60c4fb4dfd2)

Security validation after remediation:
- Cross-account `onboarding/status`, `attestation`, and `activate-session` requests now return `403`
- Public `/api/v1/session/:address` access now returns `401`
- Live E2E passed end-to-end on the current Railway deployment with two successful Base Sepolia swaps

---

## Development Status

| Area | Status | Notes |
|------|--------|-------|
| Smart contracts | ✅ Deployed | Base Sepolia testnet |
| ZK circuit (PLONK) | ✅ Working | 19,763 constraints, ~15s proof gen |
| ZK verification (on-chain + off-chain) | ✅ Working | v2 PlonkVerifierAdapter |
| Session relay (API → on-chain) | ✅ Working | EIP-712, relayer wallet |
| REST API (auth, sessions, DeFi) | ✅ Working | Railway deployment |
| Frontend dashboard | ✅ Working | ilal.tech, Vercel |
| API key management | ✅ Working | Create, list, revoke |
| Usage tracking | 🚧 Placeholder | Returns zeros; not yet wired to DB |
| Billing / plan enforcement | 🚧 Placeholder | Plans defined; no payment or quota logic |
| Market-making bot | 🚧 WIP | Prototype in `apps/bot`, not deployed |
| Mainnet deployment | ❌ Not started | Awaiting audit + security review |

---

## Local Development

### Prerequisites

- Node.js >= 18, pnpm >= 8, Foundry, Docker

### Setup

```bash
# Clone
git clone https://github.com/<org>/ilal.git && cd ilal

# Install dependencies
pnpm install

# Start local PostgreSQL
cd apps/api && docker compose up -d

# Copy and configure env
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, API_KEY_SECRET

# Run API in dev mode
pnpm --filter @ilal/api dev
```

### Run Tests

```bash
# Solidity (Foundry)
cd packages/contracts && forge test -v

# API unit tests
pnpm --filter @ilal/api test

# Frontend component tests
pnpm --filter @ilal/landing test

# Full local + testnet validation wrapper
pnpm check:testnet

# Direct live E2E on Base Sepolia (requires funded wallet + circuit artifacts)
npx tsx scripts/ilal-e2e-live.ts
```

### ZK Circuit

```bash
cd packages/circuits
bash scripts/compile.sh   # Compile Circom circuit
bash scripts/setup.sh     # Generate proving/verification keys
```

---

## Contact

**Email:** 2867755637@qq.com

---

## License

Apache-2.0
