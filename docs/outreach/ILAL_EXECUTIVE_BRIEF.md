# ILAL: Executive Brief

**Institutional Liquidity Access Layer — ZK Compliance Hook for Uniswap v4**

**Contact:** 2867755637@qq.com
**Date:** March 2026
**Status:** Live on Base Sepolia, 136/136 tests passing

---

## Executive Summary

ILAL is a production-ready Uniswap v4 Hook that enforces institutional KYC/AML compliance using zero-knowledge proofs. It eliminates per-transaction compliance costs by introducing session-based verification: institutions prove compliance once via a ZK proof, receive a 24-hour on-chain trading session, and execute unlimited compliant swaps at near-zero marginal cost.

**Result:** Compliance overhead drops from ~$50/trade to ~$0.0003/trade.

---

## The Market Gap

Traditional finance holds $400T+ in assets. Institutional adoption of DeFi is blocked by three barriers:

1. **Compliance cost** — Per-trade verification costs $50–100 in gas alone (252k gas for on-chain KYC checks)
2. **Privacy** — Current solutions require exposing full KYC data on-chain
3. **Integration friction** — Compliance wrappers sit outside the DEX, adding latency and trust assumptions

ILAL solves all three by moving compliance verification into the Uniswap v4 Hook itself.

---

## Technical Architecture

### Core Innovation: Session-Cached Compliance

```
Traditional:    Trade → Verify → Execute    (252k gas every time)
ILAL:           Verify once → Session(24h) → Trade unlimited (15k gas)
```

### System Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **ComplianceHook** | Uniswap v4 beforeSwap/beforeAddLiquidity gate | Solidity, EIP-712 |
| **SessionManager** | On-chain TTL session storage | UUPS Proxy, role-based |
| **Registry** | Router whitelist, issuer management, emergency pause | UUPS Proxy |
| **PlonkVerifier** | On-chain ZK proof verification | PLONK (auto-generated) |
| **ZK Circuit** | EdDSA-Poseidon signature + Merkle tree membership proof | Circom, depth-20 |
| **REST API** | Session relay, proof verification, swap payload builder | Node.js, Express, Prisma |
| **SDK** | TypeScript programmatic integration | Viem, ethers-compatible |

### Security Layers

1. **ZK Identity** — Institutions prove KYC status without revealing personal data
2. **Session TTL** — 24-hour expiry with bounded renewals (max 6 per proof, 7-day window)
3. **Router ACL** — Only whitelisted routers can forward user identity in hookData
4. **EIP-712 Permits** — Typed signatures prevent cross-type replay (SwapPermit ≠ LiquidityPermit)
5. **Proof Deduplication** — Each ZK proof has a unique hash; reuse is blocked on-chain
6. **Emergency Pause** — Registry owner can halt all operations globally

---

## Benchmarked Performance

All numbers are from actual measurements, not estimates.

### ZK Proof Performance (5 iterations, PLONK WASM)

| Phase | Median | Notes |
|-------|--------|-------|
| Proof Generation | 14,763 ms | Client-side, one-time per session |
| Off-chain Verification | **8.45 ms** | API-side, snarkjs |
| On-chain Verification | 683,986 gas | One-time per session |

### Per-Swap Cost (After Session Active)

| Operation | Gas | USD (est.) |
|-----------|-----|------------|
| ComplianceHook check | ~15,000 | ~$0.0003 |
| EIP-712 permit verify | ~44,643 | ~$0.001 |
| Vanilla Uniswap v4 swap | ~150,000 | ~$0.003 |

*At 0.006 gwei gas price, ~$3,800/ETH on Base Sepolia.*

### Test Coverage

| Category | Count | Pass Rate |
|----------|-------|-----------|
| Unit tests | 65 | 100% |
| Integration tests | 48 | 100% |
| Invariant tests (256 runs each) | 5 | 100% |
| Adversarial (Hell Mode) | 8 | 100% |
| Fork tests (live chain) | 15 | 100% |
| **Total** | **136** | **100%** |

---

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| ComplianceHook | `0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80` |
| SessionManager | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| Registry | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SimpleSwapRouter | `0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73` |
| PositionManager | `0x664858fa4d3938788C7b7fE4f8d8f0864d087eA6` |
| PlonkVerifier | `0x2645C48A7DB734C9179A195C51Ea5F022B86261f` |
| PlonkVerifierAdapter | `0x0cDcD82E5efba9De4aCc255402968397F323AFBB` |

All contracts verified on BaseScan. Pool initialized with USDC/WETH (fee=500, tickSpacing=10).

---

## Integration Path

### For RWA Protocols (e.g., Ondo, Securitize, Centrifuge)

```
Week 1-2:  Technical review of contracts and ZK circuits
Week 3-4:  Deploy ILAL on target chain, configure token pools
Week 5-6:  Pilot with 10-50 institutional users
Week 7-8:  Production launch, monitoring, iteration
```

### For Institutional Traders

```
1. Register via API → get API key
2. Submit ZK proof (generated client-side) → session activated (24h)
3. Call /defi/swap → receive unsigned EVM payload
4. Sign with custody wallet (Fireblocks, Copper, MPC) → broadcast
5. ComplianceHook verifies session → swap executes
```

---

## What's Next

- [ ] Professional security audit (Trail of Bits / OpenZeppelin)
- [ ] Mainnet deployment (Base → Ethereum)
- [ ] Multi-chain support (Arbitrum, Optimism)
- [ ] Institutional pilot partnerships
- [ ] Enhanced ZK circuits (accredited investor tiers, geographic restrictions)

---

## Contact

**Email:** 2867755637@qq.com

*Apache-2.0 Licensed. All code is open source.*
