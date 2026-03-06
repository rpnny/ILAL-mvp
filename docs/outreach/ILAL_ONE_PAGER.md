# ILAL: Institutional Liquidity Access Layer

## ZK Compliance Hook for Uniswap v4

---

### The Problem

Institutional capital ($400T+ in traditional finance) cannot access DeFi liquidity due to compliance requirements. Existing solutions add $50–100 gas cost per transaction and require per-trade verification — making high-frequency institutional trading uneconomical.

### The Solution

ILAL is a Uniswap v4 Hook that enforces KYC/AML compliance at the protocol level using zero-knowledge proofs. Institutions verify once, then trade freely for 24 hours with near-zero marginal cost.

---

## Benchmarked Performance

| Metric | Value |
|--------|-------|
| Foundry Tests | **136/136 (100%)** |
| Off-chain ZK Verification | **8.2 ms** |
| Per-swap Compliance Overhead | **~15,000 gas ($0.0003)** |
| On-chain PLONK Verification | **683,986 gas ($0.016)** — one-time |
| Proof Generation | **~14.8 s** (client-side, one-time) |

---

## How It Works

```
1. Institution submits ZK proof  →  API verifies (8.2ms)
2. API activates on-chain session  →  SessionManager (24h TTL)
3. Every swap:  ComplianceHook checks session  →  1 SLOAD (~15k gas)
4. Session expires  →  Re-verify or renew
```

**Key insight:** Compliance cost is amortized across all trades in a session. An institution doing 1,000 trades/day pays $0.016 once — not $50 × 1,000.

---

## What's Built (Live on Base Sepolia)

- **7 audited smart contracts** — ComplianceHook, SessionManager, Registry, SimpleSwapRouter, PositionManager, PlonkVerifier, PlonkVerifierAdapter
- **ZK circuit** — Circom PLONK (EdDSA-Poseidon signature + depth-20 Merkle tree)
- **REST API** — Session management, ZK proof verification, swap payload generation
- **TypeScript SDK** — Programmatic integration for institutional backends
- **Market-making bot** — Automated trading with session management
- **136 tests** — Unit, integration, fork (live chain), invariant, fuzz, adversarial

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Identity | ZK proof (EdDSA-Poseidon + Merkle membership) |
| Session | On-chain TTL with renewal limits |
| Swap Auth | Hook `beforeSwap` gate |
| Router ACL | Registry whitelist |
| Anti-replay | Proof hash deduplication |
| Emergency | Global pause via Registry |
| Permits | Separate EIP-712 SwapPermit / LiquidityPermit |

---

## Differentiation

| | Traditional Compliance | ILAL |
|---|---|---|
| Per-trade cost | $50–100 (252k gas) | **$0.0003** (15k gas) |
| Verification | Per-transaction | Per-session (24h) |
| Privacy | Full KYC data exposed | **ZK proof — nothing revealed** |
| Integration | External wrapper | **Native Uniswap v4 Hook** |
| Latency | 48–72h onboarding | **8.2ms verification** |

---

## Contact

**Email:** 2867755637@qq.com

*Apache-2.0 Licensed*
