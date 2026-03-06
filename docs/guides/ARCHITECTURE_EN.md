# ILAL Architecture

## System Overview

ILAL (Institutional Liquidity Access Layer) is a compliance infrastructure layer built on Uniswap v4 Hooks. It uses zero-knowledge proofs to verify institutional identities while preserving privacy, then caches the verification result as a time-limited on-chain session.

```
┌────────────────────────────────────────────────────────────────┐
│                      Client Layer                              │
│                                                                │
│   Institutional Backend          Market-Making Bot             │
│   (REST API / SDK)               (Automated Trading)           │
└───────────┬──────────────────────────────┬─────────────────────┘
            │                              │
            ▼                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      ILAL API Layer                            │
│                                                                │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│   │ ZK Proof     │  │ Session      │  │ Swap Payload │       │
│   │ Verification │  │ Management   │  │ Builder      │       │
│   └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│   Express + Prisma + Viem                                      │
└───────────┬──────────────────────────────┬─────────────────────┘
            │                              │
            ▼                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      Smart Contract Layer (Base)               │
│                                                                │
│   ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│   │ Registry │  │ SessionManager│  │ PlonkVerifier    │       │
│   │ (UUPS)   │  │ (UUPS)       │  │ + Adapter        │       │
│   └────┬─────┘  └──────┬───────┘  └──────────────────┘       │
│        │               │                                       │
│        └───────┬───────┘                                       │
│                ▼                                               │
│   ┌────────────────────────┐                                   │
│   │   ComplianceHook       │ ◄── Uniswap v4 Hook Interface    │
│   │   (EIP-712 Verifier)   │                                   │
│   └────────────┬───────────┘                                   │
│                │                                               │
│   ┌────────────▼───────────────────────────────────────┐      │
│   │            Uniswap v4 PoolManager                   │      │
│   │   SimpleSwapRouter    VerifiedPoolsPositionManager  │      │
│   └─────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

## Core Contracts

### ComplianceHook

The central enforcement point. Implements Uniswap v4's `beforeSwap`, `beforeAddLiquidity`, and `beforeRemoveLiquidity` hooks.

**Key behaviors:**
- Checks `Registry.emergencyPaused()` first — global kill switch
- Validates router whitelist via `Registry.isRouterApproved(sender)` for non-empty hookData
- Resolves user identity from hookData (EIP-712 permit) or falls back to sender address
- Checks `SessionManager.isSessionActive(user)` — single SLOAD
- Allows `beforeRemoveLiquidity` even without active session (users can always withdraw)

**Hook permissions bitmask:** `0x0A80` (beforeSwap + beforeAddLiquidity + beforeRemoveLiquidity)

### SessionManager (UUPS Proxy)

Stores per-user session expiry timestamps. Only addresses with `VERIFIER_ROLE` can call `startSession()`.

- `startSession(address user, uint256 expiry)` — grants trading access
- `isSessionActive(address user) → bool` — the hot path (single SLOAD)
- `getRemainingTime(address user) → uint256`
- `endSession(address user)` — revoke access
- Batch operations: `batchIsSessionActive`, `endSessionBatch`

### Registry (UUPS Proxy)

Access control and configuration:
- **Router whitelist:** `approveRouter(address, bool)` — only whitelisted routers can forward hookData
- **Issuer management:** register/revoke/update issuers
- **Emergency pause:** `setEmergencyPause(bool)` — halts all hook operations
- **Session TTL:** configurable default TTL (min 1 hour, max 30 days)

### EIP-712 Verifier (inherited by ComplianceHook)

Verifies typed signatures for delegated operations:
- `verifySwapPermit(user, deadline, nonce, signature)`
- `verifyLiquidityPermit(user, deadline, nonce, isAdd, signature)`
- Nonces are per-user and monotonically increasing (replay prevention)

### SimpleSwapRouter

Minimal router for Uniswap v4 swaps with compliance hookData passthrough:
- `swap(PoolKey, SwapParams, hookData, minAmountOut)` — slippage protection built in
- `ReentrancyGuard` — prevents reentrancy attacks
- ETH refund logic only returns excess from current `msg.value` (not stuck ETH)

### VerifiedPoolsPositionManager

ERC-721 position manager for compliance-gated liquidity:
- `mint`, `increaseLiquidity`, `decreaseLiquidity`, `burn`
- Positions are soulbound (transfers blocked)
- Compliance checked via ComplianceHook on add/remove operations

---

## ZK Circuit

**File:** `packages/circuits/compliance.circom`

**Proves (without revealing):**
1. User holds a valid EdDSA-Poseidon signature from an authorized issuer
2. User is a member of a Merkle tree of verified addresses (depth 20)
3. KYC status and country code meet requirements
4. Proof includes a timestamp for freshness

**Public inputs:** userAddress, merkleRoot, issuerAx, issuerAy, timestamp
**Private inputs:** signature components, KYC data, Merkle proof path

---

## API Authentication Flow

```
1. POST /auth/register  →  Create account
2. POST /auth/login     →  JWT access token (1h) + refresh token (7d)
3. POST /verify         →  Submit ZK proof → on-chain session activated
4. POST /verify/renew   →  Renew session (max 6 times per ZK proof, 7-day window)
5. POST /defi/swap      →  Get unsigned swap payload
6. Sign + broadcast     →  ComplianceHook checks session → swap executes
```

**Security:**
- Separate JWT secrets for access and refresh tokens
- ZK proof replay prevention (keccak256 hash stored in DB)
- Rate limiting on auth endpoints (5 login/15min, 3 register/hour)
- Relay wallet restricted to `SessionManager.startSession()` only

---

## Contact

2867755637@qq.com
