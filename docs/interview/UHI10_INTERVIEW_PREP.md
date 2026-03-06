# UHI10 Interview Preparation

**Interview:** Uniswap Hook Incubator (UHI10) — Final Interview
**Interviewer:** Baumik Patel, Co-founder of Atrium Academy
**Format:** 20-minute call
**Date:** Starting July 2, 2026

---

## Part 1: Technical Background (5 min)

### Your Story (60-second pitch)

> "I'm Tony. I built ILAL — the Institutional Liquidity Access Layer — a production-ready Uniswap v4 Hook that enforces KYC/AML compliance using zero-knowledge proofs.
>
> The core idea is simple: institutions verify their identity once through a ZK proof, get a 24-hour on-chain session, and then trade freely with near-zero compliance overhead. One SLOAD per swap instead of a full verification every time.
>
> It's fully deployed on Base Sepolia today — 7 smart contracts, a ZK circuit, a REST API, and 136 passing Foundry tests including live fork tests against the deployed contracts."

### Why I Built This (Personal Motivation)

> "The gap between TradFi and DeFi isn't just technical — it's regulatory. I watched institutions wanting to access Uniswap liquidity but being blocked by compliance requirements. There was no solution that was both private (institutions don't want their trading strategies visible on-chain) and efficient (per-trade verification costs make institutional HFT on-chain impossible). I realized that Uniswap v4 Hooks gave us a unique primitive to solve this at the protocol level — not as an afterthought wrapper, but as atomic, unforgeable enforcement."

### Full Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Smart Contracts** | Solidity 0.8.26, Foundry | 7 contracts, UUPS proxy pattern, CREATE2 deployment |
| **ZK Circuits** | Circom 2.1, PLONK | EdDSA-Poseidon signature + Merkle membership, depth-20 tree |
| **Backend API** | Node.js, Express, TypeScript | JWT auth, ZK off-chain verify, on-chain relay, Prisma ORM |
| **Telegram Bot** | grammY framework, TypeScript | Swap execution, session management, compliance flow |
| **Landing Page** | Next.js 14, Tailwind CSS | Institutional-facing marketing + docs |
| **Subgraph** | The Graph, AssemblyScript | On-chain event indexing (sessions, swaps, liquidity) |
| **SDK** | TypeScript, viem | Client library for proof generation, EIP-712 signing, contract interaction |
| **DevOps** | Turborepo, pnpm monorepo | Unified build system across 4 apps + 3 packages |

### Monorepo Structure

```
ilal/
├── apps/
│   ├── api/           Express REST API — ZK verification, session management, JWT auth
│   │   ├── src/
│   │   │   ├── controllers/   verify.controller.ts, auth.controller.ts
│   │   │   ├── middleware/     auth, rate-limit, API key validation
│   │   │   ├── routes/         /verify, /auth, /session endpoints
│   │   │   └── services/       blockchain.service.ts (on-chain relay)
│   │   └── prisma/            User, ProofRecord, ApiKey schemas
│   │
│   ├── bot/           Telegram bot — institutional trading interface
│   ├── landing/       Next.js marketing site
│   └── subgraph/      The Graph indexer for on-chain events
│
├── packages/
│   ├── contracts/     Solidity smart contracts (Foundry)
│   │   ├── src/
│   │   │   ├── core/          ComplianceHook, SessionManager, Registry
│   │   │   ├── helpers/       SimpleSwapRouter, VerifiedPoolsPositionManager
│   │   │   ├── libraries/     EIP712Verifier, PlonkVerifierAdapter
│   │   │   └── interfaces/    IComplianceHook, ISessionManager, IRegistry
│   │   ├── test/              136 tests (unit, integration, fork, invariant, adversarial)
│   │   └── script/            Deployment scripts (DeployHookV2, AddLiquidity)
│   │
│   ├── circuits/      ZK compliance circuit (Circom 2.1)
│   │   ├── compliance.circom  Main circuit (3 constraints, depth-20 Merkle)
│   │   ├── build/             Compiled WASM, zkey, vkey
│   │   └── scripts/           Proof generation, benchmarking
│   │
│   └── sdk/           TypeScript client SDK
│       └── src/
│           ├── modules/       swap.ts, liquidity.ts, zkproof.ts
│           └── utils/         eip712.ts, contracts.ts
│
├── scripts/           Deployment automation, system tests
├── deployments/       Contract addresses per network
└── docs/              Architecture, deployment guides, test reports
```

### Key Technical Facts to Mention

- **Built entirely on Uniswap v4 Hooks** — `beforeSwap`, `beforeAddLiquidity`, `beforeRemoveLiquidity`
- **ZK proving system:** Circom circuit → PLONK prover → on-chain PlonkVerifier
- **Session model:** One-time 684k gas proof verification → unlimited trades at 15k gas overhead
- **EIP-712 permits** for delegated swap/liquidity operations (SwapPermit and LiquidityPermit are separate typed structs — a swap signature can never be replayed as a liquidity operation)
- **UUPS upgradeable** Registry and SessionManager — governance can update session TTL, router whitelist, and issuer registry without redeploying the Hook
- **136/136 Foundry tests** including invariant fuzzing (256 runs), adversarial "Hell Mode" tests, and fork tests against live Base Sepolia contracts
- **Soulbound LP positions** — ERC-721 NFTs representing liquidity positions are non-transferable, preventing verified users from minting positions and selling them to unverified users
- **CREATE2 address mining** — ComplianceHook address was mined via HookFactory to satisfy Uniswap v4's hook address bitmask requirement (0x0A80 = `beforeSwap | beforeAddLiquidity | beforeRemoveLiquidity`)

### The 7 Deployed Contracts (Base Sepolia)

| Contract | Address | Role |
|----------|---------|------|
| **ComplianceHook** | `0xE1AF...8a80` | Uniswap v4 Hook — enforces compliance on every swap/liquidity op |
| **SessionManager** | `0x53fA...50e2` | UUPS proxy — stores session expiry per user (VERIFIER_ROLE gated) |
| **Registry** | `0x4C4e...29BD` | UUPS proxy — router whitelist, issuer registry, emergency pause, session TTL |
| **PlonkVerifier** | auto-generated | Solidity verifier contract generated by snarkjs from the circuit |
| **PlonkVerifierAdapter** | deployed | Adapter that wraps PlonkVerifier for the verify.controller API |
| **SimpleSwapRouter** | `0x9450...0C73` | Swap execution with slippage protection, reentrancy guard, hookData passthrough |
| **VerifiedPoolsPositionManager** | `0x6648...87eA6` | Soulbound ERC-721 LP NFTs, compliance-gated mint/increase/decrease |

---

## Part 2: The Hook Innovation (10 min)

### Problem Statement

"$400T+ of institutional capital sits in TradFi because there's no compliant way to access DeFi liquidity."

**The three barriers institutions face:**

1. **Compliance cost** — Current on-chain identity solutions verify per-transaction. An on-chain ZK PLONK verification costs ~252k gas ($50-100 on mainnet). For an institution doing 1,000 trades/day, that's $50,000-$100,000/day just in compliance overhead. That makes institutional HFT on-chain economically impossible.

2. **Privacy** — Institutions don't want their trading addresses visible on a public whitelist. A simple `mapping(address => bool)` leaks which institutions are active, their trade patterns, and their portfolio composition. For a hedge fund managing billions, that's unacceptable.

3. **Enforcement gap** — Existing compliance solutions (Chainalysis, Elliptic) operate off-chain — they flag transactions after the fact. There's no protocol-level mechanism to prevent a non-compliant trade from executing in the first place.

### The Innovation: Session-Cached Compliance

"ILAL solves all three problems with a single architectural insight: **separate the expensive identity verification from the cheap per-trade enforcement**."

```
Traditional:  Every swap → full compliance check → 252k gas → $50-100
ILAL:         One ZK proof → 24h session → every swap checks 1 SLOAD → 15k gas → $0.0003
```

"That's a ~17x gas reduction per trade. For an institution doing 1,000 trades/day, the savings are enormous — from $50,000 to $3.12."

**How this works in practice:**

1. The institution generates a ZK proof once (client-side, ~14.8 seconds) that proves:
   - They hold a valid EdDSA-Poseidon attestation from an authorized KYC issuer
   - They are a member of the verified-users Merkle tree
   - Their KYC status is active
   - The proof is bound to their specific wallet address (can't be transferred)

2. They submit this proof to the ILAL API. The API:
   - Verifies the proof off-chain in 7.35ms (snarkjs PLONK verify)
   - Runs 5 security checks (Merkle root, issuer key, timestamp freshness, proof replay hash, address binding)
   - Calls `SessionManager.startSession(user, block.timestamp + 24h)` via a relay wallet with `VERIFIER_ROLE`

3. For the next 24 hours, every swap the institution makes costs only:
   - `registry.emergencyPaused()` → 1 SLOAD (~2,100 gas)
   - `registry.isRouterApproved(sender)` → 1 SLOAD (~2,100 gas)
   - `sessionManager.isSessionActive(user)` → 1 SLOAD (~2,100 gas) + timestamp comparison
   - Total: ~15,000 gas overhead on top of the swap itself

4. Sessions can be renewed up to 6 times (POST `/verify/renew`) within a 7-day window. After that, a fresh ZK proof is required. This creates a balance between UX (not re-proving every day) and security (re-verification at least weekly).

### Why ZK Proofs (Not a Simple Whitelist)?

```
 SIMPLE WHITELIST                          ZK PROOF
 ════════════════                          ════════

 Registry:                                 Registry:
   mapping(address => bool) verified;        Merkle root (single value)

 On-chain visibility:                      On-chain visibility:
   ✗ Anyone can enumerate all               ✓ Only a single Merkle root is stored
     verified addresses                      ✓ Individual addresses are NOT visible
   ✗ Trading patterns of verified           ✓ Cannot determine which addresses
     users are linkable                        are in the verified set
   ✗ Competitors can identify               ✓ Zero information leakage about
     institutional addresses                   who is trading

 Gas cost per verification:                Gas cost per verification:
   ~25k gas (mapping lookup)                 ~684k gas (PLONK on-chain verify)
   BUT: happens every trade!                 BUT: happens once per 24h session!
   1000 trades = 25M gas                     1000 trades = 684k + 15k × 1000 = 15.7M gas
```

The key insight: **a more expensive verification amortized over thousands of trades is cheaper than a cheap verification repeated thousands of times.** And we get privacy as a bonus.

### The ComplianceHook Contract — Design Decisions

The `ComplianceHook` is the core contract. Every design choice was deliberate:

**1. Immutable Hook, Upgradeable Dependencies**

The `ComplianceHook` itself is immutable — it cannot be upgraded after deployment. This is a conscious decision: the enforcement logic should never change without deploying a new pool. However, the contracts it reads from — `Registry` and `SessionManager` — use UUPS proxy pattern and CAN be upgraded. This means:

- Session TTL can be changed (1 hour to 7 days) without redeploying the Hook
- New routers can be whitelisted without redeploying the Hook
- New issuers can be registered without redeploying the Hook
- Emergency pause can be activated instantly
- BUT: the actual enforcement logic (`beforeSwap` checks session → reverts if not active) is permanent

**2. Two HookData Modes**

The Hook supports two distinct operating modes based on `hookData`:

| Mode | hookData | Use Case | How User is Resolved |
|------|----------|----------|---------------------|
| **Mode 1: EIP-712 Permit** | >= 148 bytes (PermitData struct) | Router-mediated swaps. Institutional backend signs an EIP-712 typed permit, router forwards it in hookData. | Decode `PermitData` → verify EIP-712 signature → `user = permit.user` |
| **Mode 2: EOA Direct** | empty (0x) | Direct EOA calls. The user's wallet calls the router directly (or a whitelisted router calls on behalf of a user whose session was already activated). | `user = sender` (the calling contract/EOA) |

Why two modes?
- Mode 1 allows **delegated trading**: an institution signs a permit offline, and a relayer or router submits the transaction. The institution never needs to hold ETH for gas.
- Mode 2 is simpler: the router itself has an active session (activated by the API), and calls the pool directly. This is how the `SimpleSwapRouter` and `VerifiedPoolsPositionManager` work in practice.

**3. Separate EIP-712 Types for Swap vs Liquidity**

```solidity
// Two distinct EIP-712 type hashes — NOT interchangeable
SWAP_PERMIT_TYPEHASH      = keccak256("SwapPermit(address user,uint256 deadline,uint256 nonce)")
LIQUIDITY_PERMIT_TYPEHASH = keccak256("LiquidityPermit(address user,uint256 deadline,uint256 nonce,bool isAdd)")
```

A signature for a swap operation can NEVER be replayed as a liquidity operation (and vice versa). This is because:
- Different type hashes produce different EIP-712 digest values
- Even if the same `user`, `deadline`, and `nonce` are used, the digests will differ
- Additionally, nonces are monotonically incrementing per user — each signature can only be used once

**4. beforeRemoveLiquidity Always Allows**

This is perhaps the most important safety decision:

```
beforeAddLiquidity:    Emergency check → Router check → Session check → REVERT if not active
beforeRemoveLiquidity: NO emergency check → Session check → LOG warning → ALWAYS ALLOW
```

Why? **Funds must NEVER be locked by compliance logic.** If a user's session expires, or if there's an emergency pause, they must still be able to withdraw their liquidity. This is a hard requirement for institutional confidence — no institution will lock capital in a system that can freeze their funds.

**5. Router Whitelist**

The Hook checks `registry.isRouterApproved(sender)` for any call with non-empty hookData. This prevents:
- Malicious contracts from impersonating routers
- Unauthorized routers from passing crafted hookData to bypass compliance
- Third-party aggregators from routing through the pool without approval

Only the `Registry` owner (governance multisig) can add/remove approved routers.

**6. onlyPoolManager Modifier**

```solidity
modifier onlyPoolManager() {
    if (msg.sender != address(poolManager)) revert OnlyPoolManager();
    _;
}
```

Every hook function can ONLY be called by the PoolManager contract. This prevents:
- Direct calls to `beforeSwap()` that could manipulate nonces
- Nonce griefing attacks (an attacker calling `beforeSwap` repeatedly to increment a user's nonce, invalidating their signed permits)
- Any interaction outside the Uniswap v4 execution context

### The Session Model — Deep Dive

```
                    ┌──────────────────────────────────────────┐
                    │           SESSION LIFECYCLE               │
                    └──────────────────────────────────────────┘

  Day 0                    Day 1         Day 2    ...    Day 7
  ──┬──────────────────────┬─────────────┬────────────────┬──────
    │                      │             │                │
    │  ZK Proof submitted  │  Renew #1   │  Renew #2      │  Max 6 renewals
    │  Session starts      │  (API call) │  (API call)    │  reached — must
    │  (24h TTL)           │  New 24h    │  New 24h       │  re-submit fresh
    │                      │  session    │  session       │  ZK proof
    │  lastVerifiedAt =    │             │                │
    │  now                 │  renewalCount++              │
    │  renewalCount = 0    │             │                │
    │                      │             │                │
    ▼                      ▼             ▼                ▼


  On-chain (SessionManager):
  ┌────────────────────────────────────────────────┐
  │  mapping(address => uint256) _sessionExpiry     │
  │                                                 │
  │  startSession(user, expiry):                    │
  │    require(VERIFIER_ROLE)                       │
  │    require(expiry <= block.timestamp + TTL)     │
  │    _sessionExpiry[user] = expiry                │
  │                                                 │
  │  isSessionActive(user):                         │
  │    return _sessionExpiry[user] > block.timestamp│
  │    (this is the hot path — 1 SLOAD + 1 compare)│
  └────────────────────────────────────────────────┘

  Off-chain (API — verify.routes.ts):
  ┌────────────────────────────────────────────────┐
  │  POST /verify:                                  │
  │    • Full ZK proof verification                 │
  │    • Sets lastVerifiedAt = now                  │
  │    • Sets renewalCount = 0                      │
  │    • Records proofHash (anti-replay)            │
  │    • Calls startSession() on-chain              │
  │                                                 │
  │  POST /verify/renew:                            │
  │    • No ZK proof needed                         │
  │    • Checks lastVerifiedAt < 7 days ago         │
  │    • Checks renewalCount < 6                    │
  │    • Increments renewalCount                    │
  │    • Calls startSession() on-chain              │
  └────────────────────────────────────────────────┘
```

Why this model?
- **UX**: Institutions don't want to generate a 14.8-second ZK proof every day. With renewals, they prove once per week.
- **Security**: Sessions expire in 24 hours, so a compromised address is automatically locked out within a day. The 7-day re-verification window limits the blast radius further.
- **Gas efficiency**: `startSession()` costs ~52k gas. `isSessionActive()` is a pure SLOAD (~2,100 gas). The amortized cost across hundreds of trades is negligible.

### The ZK Circuit — What It Actually Proves

The Circom circuit (`compliance.circom`) enforces three constraints simultaneously:

**Constraint 1: KYC Status**
```
kycStatus === 1
```
The simplest constraint. The private input `kycStatus` must equal 1 (KYC passed). This ensures only KYC-approved users can generate valid proofs.

**Constraint 2: Issuer Signature (EdDSA-Poseidon)**
```
message = Poseidon(userAddress, kycStatus, countryCode, timestamp)
EdDSA.verify(message, {R8x, R8y, S}, {Ax, Ay})
```
This proves that an authorized issuer (identified by public key `Ax, Ay`) signed the user's compliance data. The issuer's public key is a public input — so the verifier can check it against the Registry's list of approved issuers.

Why EdDSA-Poseidon instead of ECDSA?
- Poseidon hash is ZK-friendly — ~240 constraints vs ~25,000 for SHA-256
- EdDSA over the Baby Jubjub curve is natively supported in circomlib
- The entire signature verification circuit compiles to ~4,500 constraints

**Constraint 3: Merkle Tree Membership**
```
leaf = Poseidon(userAddress, kycStatus)
MerkleTree.verify(leaf, root, proof[20], index)
```
This proves the user is a member of the verified-users set (represented as a depth-20 Merkle tree). The Merkle root is a public input — the verifier checks it against known valid roots.

Why depth 20? → 2^20 = 1,048,576 possible users. For an institutional compliance system, this is more than sufficient.

Why dual Merkle roots? When new users are onboarded, the tree changes. During the transition period, both the old and new root are accepted. This prevents existing users' proofs from being invalidated before they generate new ones.

### Why a Hook (Not a Wrapper or Middleware)?

**This is the most important architectural question. Three reasons:**

**Reason 1: Atomic, Unforgeable Enforcement**

```
 WRAPPER APPROACH:

   User → Compliance Wrapper → Uniswap Pool
                    ↑
                    │ PROBLEM: User can call the pool
                    │ directly, bypassing the wrapper entirely.
                    │ Compliance is a suggestion, not enforcement.

 HOOK APPROACH (ILAL):

   User → Router → PoolManager.unlock()
                         │
                         ├── beforeSwap() → ComplianceHook
                         │                       │
                         │    Must return         │
                         │    correct selector     │
                         │    for swap to proceed  │
                         │                       │
                         │     ← ── ── ── ── ── ┘
                         │
                         └── swap executes ONLY if Hook approved

   IMPOSSIBLE TO BYPASS.
   The Hook runs inside the PoolManager's execution context.
   There is no code path that executes a swap without the Hook being called.
```

**Reason 2: No Trust Assumption**

External compliance middleware (e.g., a centralized API that blocks trades) requires trusting a third party. If that third party goes down, gets hacked, or acts maliciously, compliance fails silently. With a Hook, the enforcement is in the smart contract — it's trustless, verifiable, and always on.

**Reason 3: Capital Efficiency**

The liquidity stays in the Uniswap v4 pool. There's no wrapping, no separate "compliant pool" with fragmented liquidity, no extra contracts holding tokens. Institutions access the same deep USDC/WETH liquidity as everyone else. The Hook is a transparent compliance layer — the pool doesn't even know it's there.

### Unique Design Decisions Summary

| Decision | Why | Alternative Rejected |
|----------|-----|---------------------|
| Session caching (24h TTL) | Makes institutional HFT viable (15k gas/trade vs 252k) | Per-trade ZK verification (too expensive) |
| Soulbound LP positions | Prevents verified→unverified position transfer | Standard transferable ERC-721 (compliance leak) |
| Separate SwapPermit / LiquidityPermit | Prevents cross-operation signature replay | Single generic permit type (unsafe) |
| beforeRemoveLiquidity always allows | Funds never locked by compliance | Strict session check on withdrawal (fund-locking risk) |
| Immutable Hook + upgradeable deps | Enforcement logic permanent, config flexible | Fully upgradeable Hook (trust risk) |
| CREATE2 address mining | Uniswap v4 requires specific bitmask in Hook address | Standard deployment (address won't match bitmask) |
| Dual Merkle roots | Smooth user onboarding during tree rotation | Single root (invalidates existing proofs) |
| EdDSA-Poseidon over ECDSA | ZK-friendly (~4.5k constraints vs ~25k) | ECDSA in circuit (too many constraints) |
| PLONK over Groth16 | No trusted setup ceremony required | Groth16 (requires per-circuit trusted setup) |

---

## System Architecture

### High-Level Architecture

```
                            ┌──────────────────────────────────────┐
                            │        Institutional Client          │
                            │  (Market Maker / OTC Desk / Fund)    │
                            └──────────┬───────────┬───────────────┘
                                       │           │
                          1. ZK Proof  │           │  3. Sign & Broadcast
                                       ▼           │
                            ┌──────────────────┐   │
                            │    ILAL REST API  │   │
                            │  ┌────────────┐   │   │
                            │  │ ZK Verify  │   │   │
                            │  │  (7.35ms)  │   │   │
                            │  └─────┬──────┘   │   │
                            │        │          │   │
                            └────────┼──────────┘   │
                   2. startSession() │              │
                                     ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BASE BLOCKCHAIN                                 │
│                                                                         │
│   ┌────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│   │  Registry   │    │ Session Manager  │    │   PLONK Verifier     │  │
│   │  (UUPS)     │    │    (UUPS)        │    │   + Adapter          │  │
│   │             │    │                  │    │                      │  │
│   │ • Router    │    │ • Session TTL    │    │ • On-chain ZK verify │  │
│   │   whitelist │    │   (24h default)  │    │   (684k gas)         │  │
│   │ • Issuer    │    │ • VERIFIER_ROLE  │    │                      │  │
│   │   registry  │    │   access control │    └───────────────────────┘  │
│   │ • Emergency │    │ • Batch ops      │                               │
│   │   pause     │    │                  │                               │
│   └──────┬──────┘    └────────┬─────────┘                               │
│          │                    │                                          │
│          │     ┌──────────────┘                                          │
│          │     │  isSessionActive()                                      │
│          ▼     ▼                                                         │
│   ┌────────────────────────────────────────────────┐                    │
│   │              ComplianceHook                     │                    │
│   │         (Uniswap v4 Hook Contract)              │                    │
│   │                                                  │                    │
│   │  Hooks implemented:                              │                    │
│   │    ☑ beforeSwap                                  │                    │
│   │    ☑ beforeAddLiquidity                          │                    │
│   │    ☑ beforeRemoveLiquidity (always allows)       │                    │
│   │                                                  │                    │
│   │  Address bitmask: 0x0A80 (CREATE2 mined)         │                    │
│   └──────────────────────┬───────────────────────────┘                    │
│                          │                                                │
│   ┌──────────────────────▼───────────────────────────┐                    │
│   │            Uniswap v4 PoolManager                 │                    │
│   │                                                    │                    │
│   │  ┌─────────────────┐    ┌──────────────────────┐  │                    │
│   │  │ SimpleSwapRouter │    │ VerifiedPools        │  │                    │
│   │  │ (swap execution) │    │ PositionManager      │  │                    │
│   │  │                  │    │ (soulbound LP NFTs)  │  │                    │
│   │  └─────────────────┘    └──────────────────────┘  │                    │
│   └────────────────────────────────────────────────────┘                    │
│                                                                             │
│   Pool: USDC / WETH  (fee=500, tickSpacing=10)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**How to explain this diagram (talking points):**

> "The system has three layers. At the top is the **institutional client** — a market maker, OTC desk, or fund. They interact with ILAL through two channels.
>
> First, they submit a ZK proof to our **REST API**. The API verifies the proof off-chain in about 7 milliseconds and then calls `startSession()` on the **SessionManager** contract on Base. This writes a 24-hour session expiry for that user address — that's a single storage write, about 52k gas.
>
> Then when they want to trade, they sign a transaction to the **SimpleSwapRouter** (or the **VerifiedPoolsPositionManager** for liquidity). The router calls the **Uniswap v4 PoolManager**, which triggers `beforeSwap()` on our **ComplianceHook**.
>
> The Hook reads from two contracts: **Registry** (is the system paused? is this router whitelisted?) and **SessionManager** (does this user have an active session?). Three SLOADs — about 15k gas overhead total. If all checks pass, the swap proceeds. If not, the entire transaction is mathematically reverted before any tokens move.
>
> The key insight: the Hook sits **inside** the PoolManager's execution context. There is no way to swap on this pool without passing through our compliance check. That's the fundamental difference from a wrapper."

---

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE OPERATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: ONBOARDING (one-time)                                            │
│  ═══════════════════════════════                                            │
│                                                                             │
│  Institution                API Server              Blockchain              │
│       │                         │                        │                  │
│       │  1. Register account    │                        │                  │
│       │ ──────────────────────► │                        │                  │
│       │  POST /auth/register    │                        │                  │
│       │                         │                        │                  │
│       │  2. Login → JWT token   │                        │                  │
│       │ ──────────────────────► │                        │                  │
│       │  ◄─────────────────────  │                        │                  │
│       │  {accessToken, refresh}  │                        │                  │
│       │                         │                        │                  │
│                                                                             │
│  PHASE 2: ZK VERIFICATION (once per 24h session)                            │
│  ═══════════════════════════════════════════════                             │
│                                                                             │
│  Institution                API Server              Blockchain              │
│       │                         │                        │                  │
│       │  3. Generate ZK proof   │                        │                  │
│       │     (client-side,       │                        │                  │
│       │      ~14.8s PLONK)      │                        │                  │
│       │                         │                        │                  │
│       │  4. Submit proof        │                        │                  │
│       │ ──────────────────────► │                        │                  │
│       │  POST /verify           │                        │                  │
│       │  {proof, publicInputs}  │                        │                  │
│       │                         │                        │                  │
│       │                         │  5. Verify off-chain   │                  │
│       │                         │     (7.35ms snarkjs)   │                  │
│       │                         │                        │                  │
│       │                         │  6. Security checks:   │                  │
│       │                         │     • Merkle root ✓    │                  │
│       │                         │     • Issuer key ✓     │                  │
│       │                         │     • Timestamp ✓      │                  │
│       │                         │     • Proof replay ✓   │                  │
│       │                         │     • User address ✓   │                  │
│       │                         │                        │                  │
│       │                         │  7. startSession()     │                  │
│       │                         │ ──────────────────────►│                  │
│       │                         │    (relay wallet,      │                  │
│       │                         │     VERIFIER_ROLE)     │  SessionManager  │
│       │                         │                        │  records expiry  │
│       │                         │                        │  (block.time +   │
│       │                         │                        │   24 hours)      │
│       │  ◄──────────────────────│                        │                  │
│       │  {session: active,      │                        │                  │
│       │   expiresAt: ...}       │                        │                  │
│       │                         │                        │                  │
│                                                                             │
│  PHASE 3: TRADING (unlimited swaps during session)                          │
│  ═════════════════════════════════════════════════                           │
│                                                                             │
│  Institution              SimpleSwapRouter         PoolManager + Hook       │
│       │                         │                        │                  │
│       │  8. swap()              │                        │                  │
│       │ ──────────────────────► │                        │                  │
│       │  (signed by custody     │                        │                  │
│       │   wallet: Fireblocks,   │                        │                  │
│       │   Copper, MPC, etc.)    │                        │                  │
│       │                         │                        │                  │
│       │                         │  9. unlock()           │                  │
│       │                         │ ──────────────────────►│                  │
│       │                         │                        │  PoolManager     │
│       │                         │                        │                  │
│       │                         │     10. beforeSwap()   │                  │
│       │                         │ ◄──────────────────────│                  │
│       │                         │     ComplianceHook     │                  │
│       │                         │     checks (see below) │                  │
│       │                         │                        │                  │
│       │                         │  11. swap executes     │                  │
│       │                         │ ──────────────────────►│                  │
│       │                         │                        │  Tokens settled  │
│       │  ◄──────────────────────│                        │                  │
│       │  USDC ↔ WETH            │                        │                  │
│       │                         │                        │                  │
│                                                                             │
│  PHASE 4: SESSION RENEWAL (before expiry)                                   │
│  ════════════════════════════════════════                                    │
│                                                                             │
│       │  12. POST /verify/renew │                        │                  │
│       │ ──────────────────────► │                        │                  │
│       │                         │  (max 6 renewals per   │                  │
│       │                         │   ZK proof, 7-day      │                  │
│       │                         │   window, then must    │                  │
│       │                         │   re-submit proof)     │                  │
│       │                         │                        │                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**How to explain this flow (talking points):**

> "Let me walk you through the complete lifecycle.
>
> **Phase 1 — Onboarding.** The institution registers on our API and gets JWT tokens. This is a standard web auth flow — nothing on-chain yet.
>
> **Phase 2 — ZK Verification.** This is the core innovation. The institution generates a PLONK ZK proof client-side — takes about 14.8 seconds. The proof proves three things: they hold a valid EdDSA-Poseidon signature from an authorized KYC issuer, they're in the Merkle tree of verified users, and their KYC status is active. Crucially, the proof is bound to their wallet address — you can't take someone else's proof and use it.
>
> They submit this proof to our API. We verify it off-chain in 7.35 milliseconds, run five security checks — Merkle root validity, issuer public key match, timestamp freshness, proof replay detection (each proof can only be used once), and address binding. If everything passes, our relay wallet calls `SessionManager.startSession()` on-chain. This writes a single storage slot: the user's session expiry, set to `block.timestamp + 24 hours`.
>
> **Phase 3 — Trading.** Now for the next 24 hours, every swap they make only costs about 15k gas overhead. The institution signs a transaction to our SimpleSwapRouter using their custody wallet — Fireblocks, Copper, whatever MPC system they use. The router calls `PoolManager.unlock()`, which triggers `beforeSwap()` on our ComplianceHook. The Hook checks three things: is the system paused? Is this router whitelisted? Is this user's session active? Three storage reads, one timestamp comparison, done. If the session is active, the swap proceeds. If not — full revert, no tokens move.
>
> **Phase 4 — Renewal.** Before the 24-hour session expires, the institution can call `POST /verify/renew` — no new ZK proof needed. We allow up to 6 renewals per ZK proof, covering a 7-day window. After that, they must re-submit a fresh proof. This balances UX — institutions don't want to re-prove every day — with security — we guarantee re-verification at least weekly."

---

## Hook Logic Deep-Dive

### ComplianceHook.beforeSwap() — Step by Step

```
 beforeSwap(sender, poolKey, swapParams, hookData)
 │
 │  Step 1: EMERGENCY CHECK
 │  ┌─────────────────────────────────────┐
 │  │ registry.emergencyPaused() ?        │
 │  │   YES → revert EmergencyPaused()    │
 │  │   NO  → continue                    │
 │  └─────────────────────┬───────────────┘
 │                        │
 │  Step 2: ROUTER WHITELIST CHECK
 │  ┌─────────────────────────────────────┐
 │  │ hookData.length > 0 ?               │
 │  │   YES → registry.isRouterApproved   │
 │  │          (sender) ?                  │
 │  │            YES → continue            │
 │  │            NO  → revert              │
 │  │              RouterNotApproved()     │
 │  │   NO  → continue (EOA direct call)  │
 │  └─────────────────────┬───────────────┘
 │                        │
 │  Step 3: RESOLVE USER IDENTITY
 │  ┌─────────────────────────────────────┐
 │  │ hookData.length >= 148 ?            │
 │  │   YES → Mode 1: EIP-712 Permit     │
 │  │     • Decode PermitData             │
 │  │     • verifySwapPermit(user,        │
 │  │       deadline, nonce, signature)    │
 │  │     • user = permit.user            │
 │  │                                      │
 │  │ hookData.length == 0 ?              │
 │  │   YES → Mode 2: EOA Direct          │
 │  │     • user = sender                  │
 │  │                                      │
 │  │ else → revert InvalidHookData()     │
 │  └─────────────────────┬───────────────┘
 │                        │
 │  Step 4: SESSION CHECK (the hot path — 1 SLOAD)
 │  ┌─────────────────────────────────────┐
 │  │ sessionManager.isSessionActive      │
 │  │   (user) ?                           │
 │  │                                      │
 │  │   YES → emit SwapAttempt(user,true) │
 │  │         return selector (PROCEED)    │
 │  │                                      │
 │  │   NO  → emit AccessDenied(user)     │
 │  │         revert NotVerified(user)     │
 │  └─────────────────────────────────────┘
```

**How to explain beforeSwap (talking points):**

> "When `beforeSwap` is called by the PoolManager, it runs through four checks in sequence.
>
> **Step 1** — Emergency check. We read `registry.emergencyPaused()` — one SLOAD. If the governance multisig has triggered an emergency pause, every swap on every pool using this Hook is immediately blocked. This is a global kill switch.
>
> **Step 2** — Router whitelist. If the caller passed `hookData` (meaning it's a router-mediated call), we check if the sender address is an approved router in the Registry. This prevents unauthorized contracts from interacting with our compliant pools. If `hookData` is empty, we skip this — it means the sender is the user directly.
>
> **Step 3** — Resolve user identity. This is where the two modes diverge. If `hookData` is 148+ bytes, it contains an EIP-712 typed `PermitData` struct — we decode it, verify the signature, and extract the user address. If `hookData` is empty, the user IS the sender. Anything else — revert with `InvalidHookData`.
>
> **Step 4** — The hot path. We call `sessionManager.isSessionActive(user)` — one SLOAD to read the session expiry, one comparison with `block.timestamp`. If the session is active, we return the selector and the swap proceeds. If not, we emit an `AccessDenied` event and revert. The swap never executes.
>
> The entire check is about 15k gas overhead. That's the cost of institutional compliance per trade."

### beforeAddLiquidity vs beforeRemoveLiquidity

```
 beforeAddLiquidity                    beforeRemoveLiquidity
 ═══════════════════                   ═════════════════════

 ┌─────────────────┐                   ┌─────────────────┐
 │ Emergency check  │                   │ NO emergency    │  ← Key difference!
 │ Router check     │                   │ check.          │
 │ Resolve user     │                   │ Users can       │
 │ Session check    │                   │ ALWAYS withdraw │
 │                  │                   │                 │
 │ No session →     │                   │ No session →    │
 │   REVERT         │                   │   LOG warning   │
 │                  │                   │   but ALLOW     │
 └─────────────────┘                   └─────────────────┘

 Why? Funds must never be locked by an expired compliance session.
 This is a hard requirement for institutional confidence.
```

**How to explain this difference (talking points):**

> "This is one of the most important design decisions. Adding liquidity requires a full compliance check — emergency pause, router whitelist, session check. If your session has expired, you can't add liquidity.
>
> But removing liquidity — withdrawing your funds — always works. Even during an emergency pause. Even if your session has expired. We log a warning event for monitoring, but we never block the withdrawal.
>
> Why? Because no institution will put capital into a system that can freeze their funds. If a regulator shuts down the compliance issuer, or if the session manager has a bug, or if there's an emergency — users must always be able to get their money out. This is a non-negotiable requirement for institutional confidence."

### Two HookData Modes

```
 Mode 1: EIP-712 Permit (Router-mediated)        Mode 2: EOA Direct
 ════════════════════════════════════════         ═══════════════════

 User → Router → PoolManager → Hook               User → PoolManager → Hook
              ▲                                              ▲
              │ hookData (>= 148 bytes):                     │ hookData = empty (0x)
              │ ┌──────────────────────┐                     │
              │ │ user:      address   │                     │ sender IS the user
              │ │ deadline:  uint256   │                     │ No signature needed
              │ │ nonce:     uint256   │                     │
              │ │ signature: bytes     │                     │
              │ │  (EIP-712 typed)     │                     │
              │ └──────────────────────┘                     │
              │                                              │
              │ SwapPermit ≠ LiquidityPermit                 │ Simpler but user
              │ (separate EIP-712 types                      │ must call pool
              │  prevent cross-replay)                       │ directly
```

**How to explain hookData modes (talking points):**

> "The Hook supports two ways to identify who the trader is.
>
> **Mode 1** is for delegated trading. The institution signs an EIP-712 typed permit offline — it contains their address, a deadline, a nonce, and a signature. A router or relayer submits the transaction and passes this permit in `hookData`. The Hook decodes the permit, verifies the signature matches the user address, increments the nonce (preventing replay), and uses the permit's user address for the session check. The institution never needs to hold ETH for gas — the relayer pays.
>
> **Mode 2** is simpler — the institution (or a whitelisted router with its own active session) calls the pool directly with empty `hookData`. The Hook just uses `sender` as the user address. This is how our SimpleSwapRouter works in practice — the router contract itself has a session.
>
> We also use separate EIP-712 type hashes for swaps and liquidity — `SwapPermit` and `LiquidityPermit` are different typed structs. A signature meant for a swap can never be replayed as a liquidity operation. And nonces are strictly monotonic — each signature is single-use."

---

## ZK Circuit Architecture

### What the Proof Proves (Without Revealing)

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                    ZK CIRCUIT: ComplianceVerifier                │
 │                    (Circom 2.1, PLONK prover)                   │
 ├─────────────────────────────────────────────────────────────────┤
 │                                                                 │
 │  PUBLIC INPUTS (visible on-chain):                              │
 │  ┌─────────────────┐                                            │
 │  │ userAddress      │  ← Which address is verified              │
 │  │ merkleRoot       │  ← Which verified-user set                │
 │  │ issuerAx, Ay     │  ← Which issuer signed the attestation   │
 │  │ timestamp        │  ← When the attestation was created       │
 │  └─────────────────┘                                            │
 │                                                                 │
 │  PRIVATE INPUTS (never revealed):                               │
 │  ┌─────────────────┐                                            │
 │  │ sigR8x, R8y, S  │  ← EdDSA-Poseidon signature components   │
 │  │ kycStatus        │  ← KYC pass/fail (must be 1)             │
 │  │ countryCode      │  ← User's jurisdiction                   │
 │  │ merkleProof[20]  │  ← Path through depth-20 Merkle tree     │
 │  │ merkleIndex      │  ← Leaf position in tree                 │
 │  └─────────────────┘                                            │
 │                                                                 │
 │  THREE CONSTRAINTS:                                             │
 │                                                                 │
 │  ┌─────────────────────────────────────────────────────┐        │
 │  │ Constraint 1: KYC Status                             │        │
 │  │   kycStatus === 1                                    │        │
 │  │   (Must have passed KYC)                             │        │
 │  └─────────────────────────────────────────────────────┘        │
 │                                                                 │
 │  ┌─────────────────────────────────────────────────────┐        │
 │  │ Constraint 2: Issuer Signature                       │        │
 │  │                                                      │        │
 │  │   message = Poseidon(userAddress, kycStatus,         │        │
 │  │                      countryCode, timestamp)         │        │
 │  │                                                      │        │
 │  │   EdDSA.verify(message, signature, issuerPubKey)     │        │
 │  │                                                      │        │
 │  │   (Proves an authorized issuer attested this user)   │        │
 │  └─────────────────────────────────────────────────────┘        │
 │                                                                 │
 │  ┌─────────────────────────────────────────────────────┐        │
 │  │ Constraint 3: Merkle Membership                      │        │
 │  │                                                      │        │
 │  │   leaf = Poseidon(userAddress, kycStatus)            │        │
 │  │                                                      │        │
 │  │   MerkleTree.verify(leaf, root, proof, index)        │        │
 │  │                                                      │        │
 │  │   (Proves user is in the set of verified addresses)  │        │
 │  │   (Tree depth 20 = supports up to 1,048,576 users)   │        │
 │  └─────────────────────────────────────────────────────┘        │
 │                                                                 │
 │  OUTPUT: A PLONK proof (~800 bytes) that proves all three       │
 │  constraints hold, without revealing any private inputs.        │
 └─────────────────────────────────────────────────────────────────┘
```

**How to explain the ZK circuit (talking points):**

> "The ZK circuit proves three things simultaneously without revealing any private data.
>
> **First**, that the user's KYC status is active — `kycStatus === 1`. This is the simplest constraint.
>
> **Second**, that an authorized KYC issuer actually signed this user's compliance data. We use EdDSA-Poseidon signatures — EdDSA over the Baby Jubjub curve with Poseidon hash. The message is `Poseidon(userAddress, kycStatus, countryCode, timestamp)`. The proof verifies this signature against the issuer's public key — which is a public input, so the verifier can check it against the Registry's approved issuers.
>
> Why EdDSA-Poseidon instead of ECDSA? Because Poseidon hash is ZK-friendly — about 240 constraints versus 25,000 for SHA-256. The entire signature verification compiles to about 4,500 constraints.
>
> **Third**, that the user is a member of the verified-users Merkle tree. The leaf is `Poseidon(userAddress, kycStatus)`, and we verify the Merkle path against the root. The tree is depth 20, supporting up to a million users.
>
> The output is a single PLONK proof — about 800 bytes — that proves all three constraints hold. The verifier (our API or an on-chain contract) learns only the public inputs: which address, which Merkle root, which issuer, and when. Nothing about the user's KYC details, country, or signature components ever leaves the client."

### ZK Verification Pipeline

```
 CLIENT SIDE                    API SERVER                    BLOCKCHAIN
 ═══════════                    ══════════                    ══════════

 ┌──────────────┐
 │ Issuer signs  │  (off-chain, by compliance provider)
 │ user data     │
 │ with EdDSA    │
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ User builds   │
 │ Merkle proof  │
 │ (depth 20)    │
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ snarkjs PLONK │
 │ fullProve()   │
 │ ~14.8 seconds │
 └──────┬───────┘
        │
        │ proof + publicInputs
        ▼
                                ┌──────────────┐
                                │ snarkjs PLONK │
                                │ verify()      │
                                │ ~7.35 ms      │
                                └──────┬───────┘
                                       │
                                       │ ✓ valid
                                       ▼
                                ┌──────────────┐
                                │ Security      │
                                │ checks:       │
                                │ • Merkle root │
                                │ • Issuer key  │
                                │ • Timestamp   │
                                │ • Replay hash │
                                │ • Address     │
                                └──────┬───────┘
                                       │
                                       │ all pass
                                       ▼
                                                              ┌──────────────┐
                                                              │ SessionMgr   │
                                                              │ .startSession│
                                                              │ (user, expiry│
                                                              │  = now+24h)  │
                                                              │              │
                                                              │  Cost:       │
                                                              │  ~52k gas    │
                                                              └──────────────┘
```

**How to explain the verification pipeline (talking points):**

> "The verification happens in three stages across three different environments.
>
> **Client-side**: The compliance issuer signs the user's data with EdDSA-Poseidon. Then the user builds a Merkle proof from the verified-users tree and runs `snarkjs.plonk.fullProve()` — this takes about 14.8 seconds and generates the PLONK proof.
>
> **API server**: The user submits the proof. We verify it off-chain with `snarkjs.plonk.verify()` — takes 7.35 milliseconds. Then we run five security checks: Is the Merkle root valid (we support dual roots for tree rotation)? Does the issuer public key match our Registry? Is the timestamp fresh? Has this exact proof been used before (we hash each proof and store it in the database for replay prevention)? Does the user address in the proof match the request?
>
> **Blockchain**: If all checks pass, our relay wallet (which has `VERIFIER_ROLE` on the SessionManager) calls `startSession(user, block.timestamp + 24h)`. This writes a single storage slot — about 52k gas. From this point on, the user can trade freely for 24 hours.
>
> Note that we do off-chain ZK verification, not on-chain. On-chain PLONK verification costs about 684k gas — we save this for situations where trustless verification is required. For the API flow, off-chain snarkjs verification in 7.35ms is sufficient because the API itself is the trusted relayer."

---

## Contract Relationship Map

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │    GOVERNANCE (Deployer/Multisig)                             │
  │    0x1b869CaC69Df23Ad9D727932496AEb3605538c8D                │
  │                                                              │
  │    Owns:  Registry (DEFAULT_ADMIN_ROLE)                      │
  │           SessionManager (DEFAULT_ADMIN_ROLE)                │
  │                                                              │
  └───────────┬─────────────────────────────┬────────────────────┘
              │                             │
              ▼                             ▼
  ┌─────────────────────┐      ┌─────────────────────────┐
  │ Registry (UUPS)      │      │ SessionManager (UUPS)    │
  │ 0x4C4e...29BD        │      │ 0x53fA...50e2            │
  │                      │      │                          │
  │ • approveRouter()    │      │ • startSession()         │
  │ • registerIssuer()   │      │   (VERIFIER_ROLE only)   │
  │ • emergencyPaused    │      │ • isSessionActive()      │
  │ • sessionTTL         │      │ • endSession()           │
  │                      │      │ • getRemainingTime()     │
  └───────┬──────────────┘      └──────────┬──────────────┘
          │ reads                           │ reads
          ▼                                ▼
  ┌──────────────────────────────────────────────────────┐
  │ ComplianceHook (immutable)                            │
  │ 0xE1AF...8a80                                         │
  │                                                        │
  │ beforeSwap():                                          │
  │   registry.emergencyPaused() → SLOAD                   │
  │   registry.isRouterApproved(sender) → SLOAD            │
  │   sessionManager.isSessionActive(user) → SLOAD         │
  │                                                        │
  │ Inherits: EIP712Verifier                               │
  │   • verifySwapPermit()                                 │
  │   • verifyLiquidityPermit()                            │
  │   • nonces per user (replay prevention)                │
  └────────────────────────┬─────────────────────────────┘
                           │ registered as hook
                           ▼
  ┌──────────────────────────────────────────────────────┐
  │ Uniswap v4 PoolManager                               │
  │ 0x05E7...3408                                         │
  │                                                        │
  │ Pool: USDC/WETH (fee=500, tickSpacing=10)              │
  │   currency0 = USDC (0x036C...CF7e)                     │
  │   currency1 = WETH (0x4200...0006)                     │
  └───────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
  ┌─────────────────────┐    ┌─────────────────────────────┐
  │ SimpleSwapRouter     │    │ VerifiedPoolsPositionMgr    │
  │ 0x9450...0C73        │    │ 0x6648...87eA6              │
  │                      │    │                              │
  │ • swap() + slippage  │    │ • mint() → ERC-721           │
  │ • ReentrancyGuard    │    │ • increase/decreaseLiquidity │
  │ • ETH refund fix     │    │ • Soulbound (no transfers)   │
  │ • hookData passthru  │    │ • burn() (only if liq == 0)  │
  └─────────────────────┘    └─────────────────────────────┘
```

**How to explain the contract relationships (talking points):**

> "There are seven contracts in total. Let me walk through how they relate.
>
> At the top is the **governance multisig** — this owns the Registry and SessionManager. It can add/remove routers, register issuers, change session TTL, and trigger emergency pause.
>
> **Registry** is the configuration hub. It stores the router whitelist, issuer registry, session TTL (configurable from 1 hour to 7 days, default 24 hours), and the emergency pause flag. It's a UUPS proxy — upgradeable without redeploying.
>
> **SessionManager** stores session expiries — a simple `mapping(address => uint256)`. Only addresses with `VERIFIER_ROLE` can call `startSession()`. Currently, our API relay wallet is the only verifier. It's also a UUPS proxy.
>
> **ComplianceHook** is the core — it's immutable, deployed via CREATE2 with a mined salt to match Uniswap v4's hook address bitmask (0x0A80). It reads from Registry and SessionManager but can't be upgraded itself. This is deliberate — the enforcement logic is permanent.
>
> **PoolManager** is Uniswap v4's singleton contract. Our pool (USDC/WETH, fee=500, tickSpacing=10) is registered with ComplianceHook as its hook.
>
> **SimpleSwapRouter** handles swap execution with slippage protection and reentrancy guard. **VerifiedPoolsPositionManager** manages liquidity positions as soulbound ERC-721 NFTs — you can mint, increase, or decrease liquidity, but you cannot transfer the NFT to another address. This prevents a verified user from creating a position and selling it to an unverified user."

---

## Security Architecture

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                     SECURITY LAYERS                             │
 ├─────────────────────────────────────────────────────────────────┤
 │                                                                 │
 │  Layer 1: IDENTITY (ZK Proof)                                   │
 │  ┌───────────────────────────────────────────────────────────┐  │
 │  │ • EdDSA-Poseidon signature from authorized issuer         │  │
 │  │ • Merkle tree membership (depth 20, 1M+ users)            │  │
 │  │ • KYC status verification                                 │  │
 │  │ • Timestamp freshness                                     │  │
 │  │ • Proof hash dedup (each proof used exactly once)         │  │
 │  └───────────────────────────────────────────────────────────┘  │
 │                                                                 │
 │  Layer 2: SESSION (On-chain TTL)                                │
 │  ┌───────────────────────────────────────────────────────────┐  │
 │  │ • 24-hour session from single ZK proof                    │  │
 │  │ • Max 6 renewals per proof (7-day window)                 │  │
 │  │ • Must re-verify with fresh proof after limits            │  │
 │  │ • Only VERIFIER_ROLE can call startSession()              │  │
 │  └───────────────────────────────────────────────────────────┘  │
 │                                                                 │
 │  Layer 3: HOOK ENFORCEMENT (Smart Contract)                     │
 │  ┌───────────────────────────────────────────────────────────┐  │
 │  │ • onlyPoolManager modifier (prevents direct calls)        │  │
 │  │ • Router whitelist (Registry.isRouterApproved)            │  │
 │  │ • EIP-712 typed permits (SwapPermit ≠ LiquidityPermit)   │  │
 │  │ • Nonce monotonicity (prevents signature replay)          │  │
 │  │ • Remove liquidity always allowed (no fund locking)       │  │
 │  └───────────────────────────────────────────────────────────┘  │
 │                                                                 │
 │  Layer 4: OPERATIONAL                                           │
 │  ┌───────────────────────────────────────────────────────────┐  │
 │  │ • Emergency pause (global kill switch)                    │  │
 │  │ • UUPS upgradeable (Registry, SessionManager)             │  │
 │  │ • Soulbound LP positions (no transfer to unverified)      │  │
 │  │ • Relay wallet restricted to startSession() only          │  │
 │  │ • Separate JWT secrets (access vs refresh)                │  │
 │  │ • Rate limiting on auth endpoints                         │  │
 │  └───────────────────────────────────────────────────────────┘  │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
```

**How to explain the security model (talking points):**

> "Security is layered — four layers, each independent.
>
> **Layer 1 — Identity.** ZK proofs guarantee that only KYC-verified users with valid issuer attestations and Merkle membership can get sessions. Each proof has a unique hash stored in the database — replay is impossible.
>
> **Layer 2 — Session.** Sessions are time-bounded (24 hours), renewable up to 6 times per proof (7-day window). Only the relay wallet with `VERIFIER_ROLE` can start sessions. If a user's address is compromised, the damage is limited to the remaining session time.
>
> **Layer 3 — Hook Enforcement.** The Hook itself is the final gate. `onlyPoolManager` prevents direct calls (stops nonce griefing). Router whitelist prevents unauthorized contracts. Separate EIP-712 types prevent cross-operation replay. And `beforeRemoveLiquidity` always allows — no fund locking.
>
> **Layer 4 — Operational.** Emergency pause is a global kill switch. UUPS proxies allow upgrading Registry and SessionManager without redeploying the Hook. Soulbound LP positions prevent position transfers to unverified users. The relay wallet is restricted to only call `SessionManager.startSession()` — it can't call any other contract function. And we use separate JWT secrets for access and refresh tokens."

---

## Gas Cost Comparison

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                    GAS COST ANALYSIS                                    │
 ├─────────────────────────────────────────────────────────────────────────┤
 │                                                                         │
 │  TRADITIONAL COMPLIANCE (per-trade verification):                       │
 │                                                                         │
 │    Trade 1:  ████████████████████████████████ 252,000 gas  ($50-100)    │
 │    Trade 2:  ████████████████████████████████ 252,000 gas               │
 │    Trade 3:  ████████████████████████████████ 252,000 gas               │
 │    ...                                                                  │
 │    1000 trades: 252,000,000 gas total                                   │
 │                                                                         │
 │  ILAL SESSION-CACHED:                                                   │
 │                                                                         │
 │    Session:  ████████████████████ 684,000 gas  (one-time ZK verify)     │
 │    Trade 1:  ██ 15,000 gas                                              │
 │    Trade 2:  ██ 15,000 gas                                              │
 │    Trade 3:  ██ 15,000 gas                                              │
 │    ...                                                                  │
 │    1000 trades: 684,000 + 15,000,000 = 15,684,000 gas                  │
 │                                                                         │
 │  SAVINGS: 252M vs 15.7M = 16x cheaper                                  │
 │           At $3,800/ETH: $50,000 vs $3.12 per day                      │
 │                                                                         │
 └─────────────────────────────────────────────────────────────────────────┘
```

**How to explain the gas savings (talking points):**

> "This is the economic argument that makes institutional DeFi viable.
>
> Traditional compliance — verifying per trade — costs about 252k gas per swap. For an institution doing 1,000 trades a day, that's 252 million gas. At $3,800 ETH and ~20 gwei gas price, that's roughly $50,000 per day just in compliance overhead. No market maker can absorb that.
>
> With ILAL's session model, you pay 684k gas once to start the session, then 15k gas per trade for the Hook's session check. 1,000 trades = 684k + 15M = about 15.7 million gas total. That's $3.12 per day. A 16x reduction.
>
> And that's on mainnet. On L2s like Base, the costs are orders of magnitude lower. The session start costs about $0.016 on Base, and each trade's compliance overhead is about $0.0003."

---

## Benchmarked Numbers (All Verified)

| Metric | Value | How Measured |
|--------|-------|-------------|
| Foundry Tests | **136/136 (100%)** | `forge test -v` |
| ZK Proof Generation | **14,770 ms** (median) | `benchmark-zk.js` (5 iterations) |
| Off-chain Verification | **7.35 ms** (median) | `benchmark-zk.js` (5 iterations) |
| On-chain PLONK Verify | **683,986 gas** | `testRealGeneratedPlonkProof` |
| Session Start | **51,536 gas** | `test_FullFlow_GasConsumption` |
| Per-swap Hook Overhead | **~15,000 gas** | `test_BeforeSwap_Allowed` delta |
| EIP-712 Permit Verify | **44,643 gas** | `test_VerifySwapPermit_Gas` |
| Hook Address Bitmask | **0x0A80** | CREATE2 salt mining verified |

---

## Why a Hook (Not a Wrapper)?

```
 WRAPPER APPROACH (external contract wraps Uniswap):

   User → Wrapper → Uniswap Pool
                ↑
                │ PROBLEM: User can bypass wrapper
                │ and call pool directly!
                │ Compliance is optional, not enforced.


 HOOK APPROACH (ILAL — inside the pool execution):

   User → Router → PoolManager ─── beforeSwap() ──→ ComplianceHook
                                         │                  │
                                         │     Session      │
                                         │     check        │
                                         │                  │
                                    swap executes     ← ── ─┘
                                    ONLY if Hook
                                    returns selector

   IMPOSSIBLE TO BYPASS.
   The Hook runs inside PoolManager's execution context.
   No compliant session = math revert = swap never happens.
```

**How to explain "why a Hook" (talking points):**

> "This is the most important architectural question, and I expect it will come up.
>
> A wrapper approach means you build a contract that sits in front of Uniswap and checks compliance before forwarding the swap. The problem is obvious — a user can bypass the wrapper and call the pool directly. Compliance becomes optional.
>
> With a Hook, the compliance check runs inside the PoolManager's execution context. When `PoolManager.unlock()` is called and a swap is requested, the PoolManager itself calls `beforeSwap()` on our ComplianceHook. If the Hook doesn't return the correct selector, the swap never executes. There is literally no code path that results in a swap without our compliance check running.
>
> Think of it this way: a wrapper is a security guard at the front door — you can climb in through the window. A Hook is the lock on the engine — the car doesn't start without the key. It's enforcement by mathematics, not by policy."

---

## Part 3: Questions to Ask Baumik (5 min)

Pick 2-3 of these:

1. "What does the incubator experience look like week by week? Is it more mentorship-focused or demo-day focused?"

2. "Are there other Hooks in the cohort working on compliance or institutional use cases? I'd love to collaborate rather than compete."

3. "What's the best way to get the Hook reviewed by the Uniswap team from a security perspective?"

4. "Does the incubator help with introductions to institutional partners or RWA protocols like Ondo or Securitize?"

5. "For mainnet deployment, are there specific requirements or audits the Uniswap Foundation recommends for Hooks?"

6. "What's been the most common reason a promising Hook project doesn't succeed after the incubator?"

---

## Anticipated Tough Questions

### "Why ZK instead of simpler access control?"

> "Simple access control (e.g., a whitelist mapping) leaks information — anyone can see who's on the whitelist. ZK proofs let institutions prove they're verified without revealing who they are. For institutions handling billions, privacy isn't optional — it's a hard requirement."

### "14.8 seconds for proof generation seems slow. Is that a problem?"

> "No, because proof generation happens once per 24-hour session, not per trade. The user generates it client-side before starting their trading day. The on-chain verification is the bottleneck — and at 684k gas, it's very reasonable for a one-time operation. The per-trade overhead is just 15k gas."

### "What happens if the session expires mid-trade?"

> "The session expiry is checked at the block timestamp level. If a session expires between block N and block N+1, any swap in block N+1 will be reverted by the Hook. There's no race condition — it's atomic."

### "Can a user still withdraw liquidity if their session expires?"

> "Yes. We specifically designed `beforeRemoveLiquidity` to allow withdrawals even without an active session. We log an `AccessDenied` event for monitoring, but the withdrawal proceeds. Users should never have their funds locked due to an expired compliance session."

### "How do you handle Merkle tree updates when new users are added?"

> "We support dual Merkle roots — current and previous. When the tree is updated, both roots are valid for a transition period. This prevents existing users' proofs from being invalidated immediately when new users are onboarded."

### "What's your go-to-market strategy?"

> "API-first for institutional backends. No frontend needed — institutions call our REST API, get an unsigned EVM transaction payload, sign it with their custody infrastructure (Fireblocks, Copper, etc.), and broadcast. The target customers are market makers, OTC desks, and RWA protocols that need compliant Uniswap access."

### "Why Base and not Ethereum mainnet?"

> "We started on Base Sepolia for lower gas costs during development and testing. The contracts are chain-agnostic — they work on any chain with Uniswap v4 PoolManager deployed. Mainnet deployment is a matter of deploying and configuring, not rewriting."

### "What would you use the incubator for? You already have a working product."

> "Three things I can't build alone:
> 1. **Network** — Introductions to institutional partners and RWA protocols
> 2. **Credibility** — Uniswap Foundation backing makes institutional sales conversations 10x easier
> 3. **Security** — Access to auditors and the Uniswap security team for a proper mainnet audit"

### "How is this different from existing compliance solutions like Chainalysis or Elliptic?"

> "Chainalysis and Elliptic do off-chain analytics — they flag addresses after the fact. ILAL enforces compliance before execution, at the smart contract level. You literally cannot swap without an active session. It's the difference between a security camera and a locked door."

### "What if regulators change requirements? Is the system flexible enough?"

> "Yes. The ZK circuit proves abstract properties (KYC status, country code) — not specific regulatory frameworks. If requirements change, we update the issuer's attestation criteria, not the circuit. The session model is also configurable — TTL, renewal limits, and issuer registry are all upgradeable via UUPS proxies."

---

## Demo Cheat Sheet (If Asked to Show Something)

### Option A: Live Fork Test (30 seconds)

```bash
cd packages/contracts
forge test --match-test test_SwapZeroForOne_Succeeds -vv
# Shows: real USDC→WETH swap on live Base Sepolia contracts
# Output: "USDC spent: 35061844, WETH received: 8845245822120767"
```

### Option B: ZK Proof Benchmark (20 seconds)

```bash
cd packages/circuits
node scripts/benchmark-zk.js
# Shows: 14.8s prove, 7.35ms verify — 5 iterations with stats
```

### Option C: Run Full Test Suite (10 seconds)

```bash
cd packages/contracts
forge test -v --no-match-contract "ForkSwapTest|ForkTest"
# Shows: "121 tests passed, 0 failed, 0 skipped"
```

### Option D: BaseScan Links (share in chat)

- ComplianceHook: https://sepolia.basescan.org/address/0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80
- SessionManager: https://sepolia.basescan.org/address/0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2
- SimpleSwapRouter: https://sepolia.basescan.org/address/0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73

---

## Final Tips

1. **Lead with the problem, not the tech.** "$400T is stuck in TradFi" lands better than "I built a PLONK verifier."

2. **Be specific about numbers.** "7.35ms" and "136/136" are more credible than "fast" and "well-tested."

3. **Acknowledge what you need.** The incubator wants to help people who know their gaps. "I need network, credibility, and audit access" is a strong answer.

4. **Keep it conversational.** 20 minutes is short. Don't lecture — have a dialogue.

5. **Show, don't tell.** If there's any chance to share screen, show the BaseScan contracts or run a test live.

6. **The "why Hook" question is almost guaranteed.** Have the bypass argument ready: "A wrapper can be circumvented. A Hook cannot. It's physics, not policy."
