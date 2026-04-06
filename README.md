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

**Current stage:** Developer-ready testnet product on Base Sepolia. Core ZK verification, session management, automated liquidity maintenance, preflight simulation, and on-chain swap/liquidity flows are all functional. Multi-wallet automated testing is supported via the testnet activation API.

### Latest Validation

- Multi-wallet institutional simulation (4 roles × parallel) passed with real on-chain execution
- Automated liquidity keeper maintains WETH/tUSDC pool depth continuously — no manual intervention
- `canBroadcastSafely` now backed by live `eth_call` simulation before returning — not just a session check
- `POST /testnet/activate` makes single-call multi-wallet onboarding fully automated (no ZK proof, no manual steps)
- Rate limits: FREE=60/min, PRO=300/min, ENTERPRISE=1000/min — suitable for concurrent institutional workloads

**Verified on-chain transactions (live Base Sepolia):**
- Swap WETH→tUSDC: [`0xd5afad58...`](https://sepolia.basescan.org/tx/0xd5afad581a685b4a20a5795c77565d4ac66a0bfe346e766669f7ada8fd23ee51)
- Add Liquidity [-600,600]: [`0x709925b0...`](https://sepolia.basescan.org/tx/0x709925b0bc256678054af221643fc0c4dabcde4783b72551389e8e0d9f71b894)
- Add Liquidity [-120,120]: [`0xecc8bf42...`](https://sepolia.basescan.org/tx/0xecc8bf42e04e2f9af61f269cbb068ebcde49914ffc249484d053a26370d54d73)
- Earlier validation: [`0x2af30c93...`](https://sepolia.basescan.org/tx/0x2af30c931c076095e633aee489c62d9f84f6c3e7292b0f20ebf2801202b1008b), [`0x1193ddc1...`](https://sepolia.basescan.org/tx/0x1193ddc1653849ff0cfd1b02cbb67cf0b06e750757032f8cc66ee60c4fb4dfd2)

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
- API onboarding/session/attestation reads are owner-scoped — no cross-account access
- Hook bitmask `0x0A80` covers `beforeSwap`, `beforeAddLiquidity`, `beforeRemoveLiquidity`

---

## Deployments (Base Sepolia Testnet)

| Contract | Address | Status | Explorer |
|----------|---------|--------|----------|
| **ComplianceHook** (v3) | `0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80` | **Active** | [View](https://sepolia.basescan.org/address/0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80) |
| **SimpleSwapRouter** | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` | Active | [View](https://sepolia.basescan.org/address/0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891) |
| **PositionManager** (v3) | `0x550c31a1861528Dca121ed634E50258fFA03fc58` | **Active** | [View](https://sepolia.basescan.org/address/0x550c31a1861528Dca121ed634E50258fFA03fc58) |
| **SessionManager** (UUPS) | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` | Active | [View](https://sepolia.basescan.org/address/0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2) |
| **Registry** (UUPS) | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` | Active | [View](https://sepolia.basescan.org/address/0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD) |
| **PlonkVerifier** (v2) | `0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A` | Active | [View](https://sepolia.basescan.org/address/0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A) |
| **PlonkVerifierAdapter** (v2) | `0x8e093aC51921fe2be9bd0910092a01200AAd6560` | Active | [View](https://sepolia.basescan.org/address/0x8e093aC51921fe2be9bd0910092a01200AAd6560) |
| ~~ComplianceHook (v2)~~ | `0xdD37A28e15A9592eAAd3f7Df0Ad36e374Af68A80` | Deprecated | — |
| ~~ComplianceHook (v1)~~ | `0xe633220f15932428FcA60A1A2C2C48797A180A80` | Deprecated | — |

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
| Preflight Simulation | `eth_call` before response | Catches reverts before broadcast |

---

## Repository Structure

```
ilal/
├── apps/
│   ├── api/              # Express API — ZK verification, session relay, swap TX building
│   ├── demo/             # Vite demo app for live onboarding / swap walkthroughs
│   ├── landing/          # Institutional dashboard + docs (Next.js 14, Vercel)
│   └── bot/              # Market-making bot prototype (WIP)
├── packages/
│   ├── contracts/        # Solidity — ComplianceHook, SessionManager, Registry (Foundry)
│   ├── sdk/              # TypeScript SDK for programmatic integration
│   └── circuits/         # Circom ZK circuits (EdDSA-Poseidon + Merkle membership)
├── examples/
│   ├── minimal-swap/     # Minimal Node/TS end-to-end swap example (runnable)
│   └── institutional-demo/ # Multi-role institutional simulation demo
├── scripts/              # E2E tests, system tests, deployment utilities
├── .github/workflows/    # CI pipeline (contracts, API, frontend)
└── docs/                 # API reference, architecture notes, deployment guides
```

---

## API Reference

### ⚠️ Integration Quick-Start (Read This First)

> **Canonical configuration — this is the single source of truth.**

| Setting | Value |
|---------|-------|
| **API Base URL** | `https://ilal-mvp-production.up.railway.app/api/v1` |
| **Auth Header** | `X-API-Key: ilal_live_xxx` |
| **Network** | Base Sepolia (chainId: 84532) / RPC: `https://sepolia.base.org` |
| **WETH** | `0x4200000000000000000000000000000000000006` |
| **tUSDC** (test stablecoin) | `0xa486Fb51ED09B970A23F7Fe910bc90089f78424D` |
| **ComplianceHook** | `0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80` |
| **SwapRouter** | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` |
| **PositionManager** | `0x550c31a1861528Dca121ed634E50258fFA03fc58` |
| **`zeroForOne`** | Optional — auto-derived from tokenIn/tokenOut ordering |
| **Live contract addresses** | `GET /api/v1/config/contracts` — always reflects the current deployment |

> **⚠️ Do not hardcode the PositionManager address.** It is redeployed when contract bugs are fixed. Always fetch from `GET /api/v1/config/contracts` and use the `positionManager` field from the response.

> **Critical:** ILAL's ComplianceHook rejects every on-chain transaction from a wallet without an active compliance session. The API will build and return a valid unsigned TX — but when you broadcast it, the chain will revert. **Activate your session (Step 2) before calling any DeFi endpoint.**

> **tUSDC** is an ILAL-controlled mintable ERC-20 (6 decimals) deployed to ensure the demo pool always has sufficient liquidity. The Circle testnet USDC (`0x036CbD...`) is **deprecated** — its pool has been drained.

---

### Integration Steps — API Mode (Testnet)

**Step 0 — Fetch Live Contract Addresses** *(one-time, no auth)*
```bash
curl https://ilal-mvp-production.up.railway.app/api/v1/config/contracts
# → { "contracts": { "positionManager": "0x...", "simpleSwapRouter": "0x...", ... }, "tokens": { ... } }
```

**Step 1 — Register & Get API Key**
```bash
# Create account
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@institution.com","password":"SecurePass123!","name":"Fund Name"}'
# → { "accessToken": "eyJ...", "user": { ... } }

# Create API key — permissions must be a JSON array (save it — shown only once)
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/apikeys \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-key","permissions":["verify","session","swap","liquidity","usage"]}'
# → { "apiKey": "ilal_live_xxx", ... }
```

**Step 2 — Activate Your Wallet** ⭐ *Do this before any DeFi call*
```bash
# One call: register institution + activate session. No ZK proof required on testnet.
# Idempotent — safe to call repeatedly; re-activates expired sessions.
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/testnet/activate \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xYOUR_WALLET"}'
# → { "success": true, "txHash": "0x...", "expiresAt": "..." }

# Multi-wallet (up to 20 at once):
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/testnet/activate-batch \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"wallets": ["0xWALLET_A", "0xWALLET_B"]}'
```

**Step 3 — Get Gas + Test Tokens**

You need **two** things before transacting: ETH (for gas) and tUSDC (to trade).

```bash
# 3a. Get Base Sepolia ETH for gas (external faucet, free):
#     https://www.alchemy.com/faucets/base-sepolia
#     Recommended: ≥ 0.01 ETH per wallet

# 3b. Get 10,000 tUSDC from the ILAL faucet (rate limited: 1 claim / wallet / 24h):
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/testnet/faucet \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xYOUR_WALLET"}'
# → { "success": true, "txHash": "0x...", "amount": "10000000000" }
```

**Step 4 — Approve Tokens**

The API returns **unsigned** approve transactions. You must sign & broadcast them yourself.

```bash
# Approve tUSDC to SwapRouter (for swaps):
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/approve \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "token":       "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "operation":   "swap",
    "amount":      "10000000000",
    "userAddress": "0xYOUR_WALLET"
  }'
# → { "isApprovalNeeded": true, "transaction": { "to": "0x...", "data": "0x..." } }
# Sign and broadcast the transaction (see "Sign & Broadcast" below).
# WAIT for on-chain confirmation before proceeding to Step 5.
```

> If `isApprovalNeeded` is `false`, the wallet already has sufficient allowance — skip to Step 5.

**Step 5 — (Optional) Run Preflight Self-Check**
```bash
# Verify everything is ready: session active, tokens received, allowances set
curl https://ilal-mvp-production.up.railway.app/api/v1/preflight/0xYOUR_WALLET \
  -H "X-API-Key: ilal_live_xxx"
# → { session: { active, remainingSeconds }, tokens: { tUSDC: { balance }, ETH: { balance } },
#     readiness: { canSwap: true, issues: [] } }
```

**Step 6 — Build a Swap Transaction**
```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/swap \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn":     "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "tokenOut":    "0x4200000000000000000000000000000000000006",
    "amount":      "1000000000",
    "userAddress": "0xYOUR_WALLET"
  }'
# → {
#     "success": true,
#     "transaction": { "to": "0xd46D...", "data": "0x...", "value": "0x0", "chainId": 84532 },
#     "preflight": {
#       "sessionActive": true,
#       "canBroadcastSafely": true        ← backed by live eth_call simulation
#     }
#   }
# Sign and broadcast the transaction.
```

> If `canBroadcastSafely` is `false`, do not broadcast. Check `preflight.simulation.revertReason` for the exact cause (session expired, insufficient allowance, pool depth, etc.). Most common fix: re-run Step 2.

**Step 7 — Add Liquidity** *(requires approving BOTH tokens to PositionManager)*
```bash
# 7a. Approve WETH to PositionManager — sign & broadcast, wait for confirmation
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/approve \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "token":       "0x4200000000000000000000000000000000000006",
    "operation":   "liquidity",
    "amount":      "50000000000000000",
    "userAddress": "0xYOUR_WALLET"
  }'

# 7b. Approve tUSDC to PositionManager — sign & broadcast, wait for confirmation
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/approve \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "token":       "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "operation":   "liquidity",
    "amount":      "100000000",
    "userAddress": "0xYOUR_WALLET"
  }'

# 7c. Add liquidity (0.05 WETH + 100 tUSDC) — sign & broadcast
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/liquidity \
  -H "X-API-Key: ilal_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "token0":      "0x4200000000000000000000000000000000000006",
    "token1":      "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "amount0":     "50000000000000000",
    "amount1":     "100000000",
    "tickLower":   -600,
    "tickUpper":   600,
    "userAddress": "0xYOUR_WALLET"
  }'
```

**Sign & Broadcast (all steps above)**

The API only returns unsigned transactions. You sign with your own wallet key:

```typescript
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

// `tx` = the `transaction` object from any API response
async function signAndBroadcast(tx: { to: string; data: string; value: string; gas?: string }) {
  const hash = await wallet.sendTransaction({
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: BigInt(tx.value),
    ...(tx.gas ? { gas: BigInt(tx.gas) } : {}),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Confirmed in block', receipt.blockNumber, '- tx:', hash);
  return hash;
}
```

---

### Key Integration Notes

- **Authentication:** Use `X-API-Key: ilal_live_xxx` for server-to-server calls. Use `Authorization: Bearer <token>` for dashboard/JWT flows. All protected endpoints accept both.
- **`zeroForOne` is optional:** Auto-derived from `tokenIn`/`tokenOut` address ordering. If provided, the API validates it matches the expected direction.
- **Token ordering:** WETH (`0x4200...`) < tUSDC (`0xa486...`), so WETH is always `token0`. For WETH→tUSDC swaps, `zeroForOne = true` (auto-derived).
- **Session enforcement:** `/defi/swap` and `/defi/liquidity` return `412 SESSION_NOT_ACTIVE` by default when session is inactive. Pass `?buildOnly=true` to bypass enforcement and get unsigned TX data regardless.
- **`canBroadcastSafely`:** Now backed by a live `eth_call` simulation of the full transaction. `true` means both session is active AND the simulation passed against current chain state.
- **Error format:** All errors return `{ error, code, message, hint, phase }`. The `code` field is machine-readable (e.g., `SESSION_NOT_ACTIVE`, `ALLOWANCE_INSUFFICIENT`, `UNSUPPORTED_TOKEN`).
- **Rate limits:** FREE=60/min, PRO=300/min, ENTERPRISE=1000/min. Custom key-level limits via `PATCH /apikeys/:id`.

### SDK — Two Integration Modes

```bash
npm install @tony_hz/ilal-sdk
```

#### Mode A: API Mode (`ILALApiClient`) — Recommended for institutional backends

Uses the ILAL REST API via API Key. The API builds unsigned transactions; you sign & broadcast with your own wallet. **No direct RPC connection needed** — the API handles simulation, session checks, and pool state reads.

```typescript
import { ILALApiClient } from '@tony_hz/ilal-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// 1. Create API client (talks to ILAL API)
const client = new ILALApiClient({
  apiKey: 'ilal_live_xxx',
  apiBaseUrl: 'https://ilal-mvp-production.up.railway.app',
  chainId: 84532,
});

// 2. Create wallet (for signing — never leaves your server)
const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const pub = createPublicClient({ chain: baseSepolia, transport: http() });

async function signAndBroadcast(tx: any) {
  const hash = await wallet.sendTransaction({
    to: tx.to, data: tx.data, value: BigInt(tx.value), ...(tx.gas ? { gas: BigInt(tx.gas) } : {}),
  });
  return pub.waitForTransactionReceipt({ hash });
}

// 3. Full flow
const preflight = await client.preflight('0xYOUR_WALLET');

const approve = await client.approve({ token: TUSDC, amount: '10000000000', userAddress: '0x...', operation: 'swap' });
if (approve.isApprovalNeeded) await signAndBroadcast(approve.transaction);

const swap = await client.swap({ tokenIn: TUSDC, tokenOut: WETH, amount: '1000000000', userAddress: '0x...' });
if (swap.preflight?.canBroadcastSafely) await signAndBroadcast(swap.transaction);

const quote = await client.quote({ tokenIn: TUSDC, tokenOut: WETH, amount: '1000000000', userAddress: '0x...' });
```

**When to use:** Server-to-server integration, trading bots, institutional custody systems, any backend that holds private keys and needs a simple HTTP interface.

#### Mode B: Direct Mode (`ILALClient`) — For DApps and advanced integrations

Connects directly to the blockchain via your own RPC. The SDK calls smart contracts directly using your `walletClient` + `publicClient`. Supports ZK proof generation, EIP-712 permit signing, and full on-chain operations.

```typescript
import { ILALClient } from '@tony_hz/ilal-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Option A: From browser wallet (MetaMask, Rabby, etc.)
const client = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});

// Option B: From private key (Node.js backend)
const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const client = new ILALClient({
  walletClient: createWalletClient({ account, chain: baseSepolia, transport: http() }),
  publicClient: createPublicClient({ chain: baseSepolia, transport: http() }),
  chainId: 84532,
});

// Session management — direct on-chain
const session = await client.session.getStatus('0xYOUR_WALLET');
console.log('Session active:', session.isActive, 'Expires:', session.expiresAt);

// Swap — direct contract call (SDK handles hookData encoding)
const result = await client.swap.execute({
  tokenIn: '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D',
  tokenOut: '0x4200000000000000000000000000000000000006',
  amount: 1000000000n,
  userAddress: '0xYOUR_WALLET',
});

// Liquidity — direct contract call
await client.liquidity.addLiquidity({
  token0: '0x4200000000000000000000000000000000000006',
  token1: '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D',
  amount0: 50000000000000000n,
  amount1: 100000000n,
  tickLower: -600,
  tickUpper: 600,
});

// ZK Proof generation (client-side, ~15s)
const proof = await client.zkproof.generateProof(circuitInput);
```

**When to use:** DApp frontends (React/Next.js with wallet connect), advanced users who want full control, or scenarios requiring client-side ZK proof generation.

#### Mode comparison

| | API Mode (`ILALApiClient`) | Direct Mode (`ILALClient`) |
|--|---------------------------|---------------------------|
| **Connection** | ILAL REST API | Direct RPC to chain |
| **Auth** | API Key (`X-API-Key`) | Wallet signature |
| **TX signing** | You sign unsigned TX from API | SDK signs and broadcasts |
| **Session activation** | `POST /testnet/activate` | `client.session.activate()` |
| **ZK proof** | Submit via `POST /verify` | Generate client-side |
| **Preflight simulation** | API runs `eth_call` for you | Manual |
| **Best for** | Backends, bots, custody | DApps, frontends |

---

### Integration Gotchas

Things that will save you an afternoon of debugging:

**1. Flow order is strict — no shortcuts**
```
Step 0 Contracts → Step 1 Register + API Key → Step 2 Activate
→ Step 3 ETH + Faucet → Step 4 Approve → Step 6 Swap / Step 7 Liquidity
```
Skip any step and you'll get a 412 or revert. The three most common failures:
- No session → call `/testnet/activate`
- No allowance → call `/defi/approve` and wait for on-chain confirmation
- No ETH → get Base Sepolia ETH from [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)

**2. Approve targets are different for swap vs. liquidity**
- Swap: approve token to **SwapRouter** (`0xd46D84Dc...`)
- Liquidity: approve **both** tokens to **PositionManager** (`0x550c31a1...`)
- Use `POST /defi/approve` with `operation: "swap"` or `"liquidity"` — the API picks the correct spender.

**3. Approve tx must confirm on-chain before the next call**
```typescript
// ✅ Correct — wait for confirmation
const approveTx = await client.approve({ token: TUSDC, operation: 'swap', amount, userAddress });
const hash = await wallet.sendTransaction(approveTx.transaction);
await publicClient.waitForTransactionReceipt({ hash }); // ← must wait
const swapTx = await client.swap({ ... });

// ❌ Wrong — concurrent. Swap sees allowance = 0 and reverts.
await Promise.all([approve(...), swap(...)]);
```

**4. Liquidity requires two approvals**
```typescript
// Approve WETH to PositionManager
const a1 = await client.approve({ token: WETH, operation: 'liquidity', amount: '50000000000000000', userAddress });
await waitForReceipt(await wallet.sendTransaction(a1.transaction));
// Approve tUSDC to PositionManager
const a2 = await client.approve({ token: TUSDC, operation: 'liquidity', amount: '100000000', userAddress });
await waitForReceipt(await wallet.sendTransaction(a2.transaction));
// Now add liquidity
const liq = await client.addLiquidity({ token0: WETH, token1: TUSDC, amount0, amount1, userAddress });
```

**5. `amount` is always in the token's smallest unit**
- WETH: 18 decimals → `"1000000000000000"` = 0.001 WETH
- tUSDC: 6 decimals → `"1000000"` = 1 tUSDC

**6. You need ETH for gas — tUSDC faucet does NOT give ETH**
```bash
# Get test ETH from Alchemy (Base Sepolia)
# https://www.alchemy.com/faucets/base-sepolia
# Keep ≥ 0.01 ETH per wallet. Swap costs ~100k gas, liquidity ~400k gas.
```

**7. Nonce management for rapid sequential transactions**
```typescript
// If you need approve → swap without waiting for each receipt:
const nonce = await provider.getTransactionCount(address, "pending");
await wallet.sendTransaction({ ...approveTx, nonce });
await wallet.sendTransaction({ ...swapTx, nonce: nonce + 1 });
```
Without this, the second transaction may collide with the first's nonce.

**8. Always check `canBroadcastSafely` before signing**
- `true` = session active + simulation passed (swap) or allowances sufficient (liquidity)
- `false` = check `preflight.simulation.revertReason` or `preflight.issues`

**9. Don't call contracts directly** — the API injects correct hookData for ComplianceHook identity verification. Direct contract calls will revert with `NotVerified`.

**10. `isApprovalNeeded` — `transaction` is only present when approval is actually needed**

When allowance is already sufficient the `transaction` field is **intentionally omitted**. Always gate on `isApprovalNeeded`:
```typescript
const res = await client.approve({ token: TUSDC, operation: 'swap', amount: '1000000000', userAddress });
if (res.isApprovalNeeded) {
  // transaction is present — sign and broadcast
  await signAndBroadcast(res.transaction);
} else {
  // allowance already sufficient — skip approve, proceed to swap
  console.log('Already approved:', res.allowance.current);
}
```
A **brand-new wallet** (allowance = 0) always gets `isApprovalNeeded: true` and a valid `transaction`. If you see no `transaction` field, your wallet's existing allowance already covers the amount.

**11. Session lifetime**
- Testnet sessions: 24 hours (pass `durationHours` to extend, max 720h)
- Production: 24 hours (real ZK proof required)
- Check remaining time: `GET /api/v1/session/:address`
- Re-activate: just call `/testnet/activate` again — fully idempotent

**12. Don't hardcode contract addresses** — fetch them at startup:
```typescript
const { contracts, tokens } = await fetch(`${API}/api/v1/config/contracts`).then(r => r.json());
const POSITION_MANAGER = contracts.positionManager; // always current
```
The PositionManager address changes when the contract is redeployed.

---

### Error Reference

| Status | Code | Meaning | Fix |
|--------|------|---------|-----|
| 412 | `SESSION_NOT_ACTIVE` | No active compliance session | Call `/testnet/activate` |
| 412 | `INSUFFICIENT_ETH` | Not enough ETH for gas | [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia) |
| 400 | `UNSUPPORTED_TOKEN` | Token not in whitelist | Only WETH + tUSDC on testnet |
| 400 | `ALLOWANCE_INSUFFICIENT` | Token not approved | Call `/defi/approve` first |
| 400 | `VALIDATION_ERROR` | Bad request body | Check `details` array — often `permissions` sent as string instead of array |
| 401 | `API_KEY_FORMAT_INVALID` | X-API-Key format wrong | Must be `ilal_live_<48 hex chars>` |
| 401 | `API_KEY_MISSING` | No X-API-Key header on testnet endpoint | Add `X-API-Key: ilal_live_xxx` to all requests including `/testnet/activate` |
| 429 | `FAUCET_COOLDOWN` | Already claimed today | Check `retryAfterSeconds` in response |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests | Check plan tier (FREE=60/min) |

All errors include `{ error, code, message, hint }`. The `hint` field tells you exactly what to do.

---

### Tokens (Base Sepolia)

| Token | Address | Decimals | Status |
|-------|---------|----------|--------|
| **WETH** | `0x4200000000000000000000000000000000000006` | 18 | Active |
| **tUSDC** (ILAL Test) | `0xa486Fb51ED09B970A23F7Fe910bc90089f78424D` | 6 | **Active** |
| ~~USDC (Circle)~~ | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | 6 | Deprecated |

### Production ZK Session Flow

For production (non-testnet) environments, session activation requires a real ZK proof:

```bash
# 1. Register wallet
curl -X POST .../api/v1/onboarding/register \
  -H "X-API-Key: ilal_live_xxx" \
  -d '{"name": "My Institution", "walletAddress": "0x..."}'

# 2. Get attestation (needed to generate proof)
curl .../api/v1/onboarding/attestation/0xYOUR_WALLET \
  -H "X-API-Key: ilal_live_xxx"
# → { attestation: { userAddress, merkleRoot, merkleProof, sigR8x, ... } }

# 3. Generate PLONK proof client-side (~15s)
#    Use packages/circuits or @ilal/sdk

# 4. Submit proof — activates on-chain session via relayer
curl -X POST .../api/v1/verify \
  -H "X-API-Key: ilal_live_xxx" \
  -d '{"proof": {...}, "publicInputs": ["..."], "userAddress": "0x..."}'
# → { success: true, txHash: "0x...", expiresAt: "..." }
```

Full API reference: [`docs/guides/saas/API_REFERENCE.md`](docs/guides/saas/API_REFERENCE.md)

---

## Security Model

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| **Identity** | ZK Proof (PLONK) | EdDSA-Poseidon signature + Merkle tree membership — reveals nothing on-chain |
| **Session** | On-chain TTL | 24h sessions, max 6 renewals per ZK proof |
| **Swap Gate** | ComplianceHook | `beforeSwap` checks `isSessionActive()` — single SLOAD, reverts if expired |
| **Router ACL** | Two-tier router whitelist | Generic routers must be approved; Mode 2 identity forwarding requires a stricter allowlist |
| **Permit signing** | EIP-712 | Separate `SwapPermit` and `LiquidityPermit` typed data |
| **Anti-replay** | Proof dedup | Each ZK proof hashed (keccak256) and rejected on reuse |
| **API ownership** | Institution → User binding | `/verify`, onboarding, attestation, and session reads reject cross-account access (403) |
| **Preflight simulation** | `eth_call` before response | Catches on-chain reverts before the client broadcasts |
| **Emergency** | Global pause | Registry owner can halt all operations instantly |
| **Upgradability** | UUPS Proxy | Registry and SessionManager are upgradeable |

---

## Security Status

The current deployment includes the following hardening work:

- Cross-account API access is blocked by binding `Institution → User` ownership in onboarding, verification, attestation, and session-query paths
- `ComplianceHook` no longer treats generic approved routers as identity-forwarding routers; Mode 2 identity forwarding is restricted to a stricter allowlist
- Frontend/API integration no longer relies on public session endpoints or hard-coded backend paths for protected flows
- Production API config requires explicit refresh-secret and CORS/proxy controls rather than permissive defaults
- `canBroadcastSafely` is now backed by live `eth_call` simulation — not just a session flag check

Residual risk profile:

- Mainnet deployment has not started and should still be gated on independent audit review
- Billing/quota enforcement remains placeholder logic and should not be treated as a hardened abuse-control layer
- Testnet/demo wallets and tokens should be treated as disposable operational assets

---

## New in This Release

### Developer Experience (DX)

| Feature | Description |
|---------|-------------|
| `POST /testnet/activate` | One-call register + session activation. No ZK proof, no pre-registration needed. Fully idempotent. |
| `POST /testnet/activate-batch` | Activate up to 20 wallets in one request. Designed for multi-role automated tests. |
| `GET /preflight/:address` | Full environment self-check: session, balances, allowances, readiness — one call. |
| Unified error envelope | All errors return `{ code, message, hint, phase }`. Machine-readable error codes throughout. |
| Simulation-backed preflight | `/defi/swap` and `/defi/liquidity` run `eth_call` before returning. `canBroadcastSafely: true` means the chain won't revert. |
| `?buildOnly=true` | Skip session enforcement on DeFi endpoints — useful for build/test flows. |
| Rate limit tiers | FREE: 60/min · PRO: 300/min · ENTERPRISE: 1,000/min. Custom key limits via `PATCH /apikeys/:id`. |
| Quick Start redesign | Session activation is now **Step 2** (was Step 4). Prominent upfront callout about the ComplianceHook requirement. |

### Infrastructure

| Feature | Description |
|---------|-------------|
| `LiquidityKeeperService` | Background job that monitors WETH/tUSDC pool depth via `eth_call`. Auto-mints tUSDC and re-seeds LP positions when depth drops below threshold. |
| Relay session auto-renewal | Keeper proactively renews the relay wallet's compliance session before expiry — prevents pool probe false-negatives. |

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

### E2E — Base Sepolia Live Testnet

Full flow: register → activate session (testnet) → preflight self-check → build swap → sign & broadcast → verify on-chain balances.

Verified on-chain transactions:
- [`0xd5afad58...`](https://sepolia.basescan.org/tx/0xd5afad581a685b4a20a5795c77565d4ac66a0bfe346e766669f7ada8fd23ee51) — Swap WETH→tUSDC
- [`0x709925b0...`](https://sepolia.basescan.org/tx/0x709925b0bc256678054af221643fc0c4dabcde4783b72551389e8e0d9f71b894) — Add Liquidity [-600,600]
- [`0xecc8bf42...`](https://sepolia.basescan.org/tx/0xecc8bf42e04e2f9af61f269cbb068ebcde49914ffc249484d053a26370d54d73) — Add Liquidity [-120,120]
- [`0x2af30c93...`](https://sepolia.basescan.org/tx/0x2af30c931c076095e633aee489c62d9f84f6c3e7292b0f20ebf2801202b1008b) — Earlier validation swap
- [`0x1193ddc1...`](https://sepolia.basescan.org/tx/0x1193ddc1653849ff0cfd1b02cbb67cf0b06e750757032f8cc66ee60c4fb4dfd2) — Earlier validation swap

---

## Development Status

| Area | Status | Notes |
|------|--------|-------|
| Smart contracts | ✅ Deployed | Base Sepolia testnet, v3 ComplianceHook active |
| ZK circuit (PLONK) | ✅ Working | 19,763 constraints, ~15s proof gen |
| ZK verification (on-chain + off-chain) | ✅ Working | v2 PlonkVerifierAdapter |
| Session relay (API → on-chain) | ✅ Working | EIP-712, relayer wallet |
| Testnet session activation | ✅ Working | `POST /testnet/activate` — no ZK proof needed |
| REST API (auth, sessions, DeFi) | ✅ Working | Railway deployment |
| Frontend dashboard + docs | ✅ Working | ilal.tech, Vercel |
| API key management | ✅ Working | Create, list, update, revoke; plan-based rate limits |
| Preflight self-check | ✅ Working | `GET /preflight/:address` — session + balances + simulation |
| `eth_call` simulation | ✅ Working | `canBroadcastSafely` backed by live simulation |
| Pool liquidity keeper | ✅ Working | Auto-maintains WETH/tUSDC depth; auto-renews relay session |
| Unified error envelope | ✅ Working | `code`, `message`, `hint`, `phase` on all errors |
| Usage tracking | 🚧 Placeholder | Returns zeros; not yet wired to DB |
| Billing / plan enforcement | 🚧 Placeholder | Plans defined; no payment or quota logic |
| Market-making bot | 🚧 WIP | Prototype in `apps/bot`, not deployed |
| Real KYC integration | ❌ Not started | Current: mock auto-approval (suitable for demos) |
| Mainnet deployment | ❌ Not started | Awaiting audit + security review |
| Multi-chain support | ❌ Not started | Architecture supports any EVM + Uniswap v4 chain |

---

## Local Development

### Prerequisites

- Node.js >= 18, pnpm >= 8, Foundry, Docker

### Setup

```bash
# Clone
git clone https://github.com/rpnny/ILAL-mvp.git && cd ilal

# Install dependencies
pnpm install

# Start local PostgreSQL
cd apps/api && docker compose up -d

# Copy and configure env
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, API_KEY_SECRET, VERIFIER_PRIVATE_KEY

# Run API in dev mode
pnpm --filter @ilal/api dev

# Run frontend
pnpm --filter @ilal/landing dev
```

### Run Tests

```bash
# Solidity (Foundry)
cd packages/contracts && forge test -v

# API unit tests
pnpm --filter @ilal/api test

# Frontend component tests
pnpm --filter @ilal/landing test

# Minimal swap example (requires .env with funded wallet)
cd examples/minimal-swap && npx tsx run.ts

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
