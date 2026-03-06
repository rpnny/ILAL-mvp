# ILAL Test Report

**Date:** March 6, 2026
**Network:** Base Sepolia (Chain ID: 84532)
**Toolchain:** Foundry (forge 0.3.x), Node.js v24, snarkjs

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 136 |
| **Passed** | 136 (100%) |
| **Failed** | 0 |
| **Skipped** | 0 |
| **Invariant Runs** | 5 × 256 = 1,280 |
| **Fuzz Calls** | 19,200 |

---

## Test Breakdown

### Unit Tests (65 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| ComplianceHook | 14 | All pass |
| SessionManager | 15 | All pass |
| Registry | 21 | All pass |
| EIP712Verifier | 9 | All pass |
| VerifiedPoolsPositionManager | 6 | All pass |

### Integration Tests (48 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| SwapRouterTest | 16 | All pass |
| ForkSwapTest (live chain) | 8 | All pass |
| FullFlow | 8 | All pass |
| ForkTest (live chain) | 7 | All pass |
| PlonkIntegration | 7 | All pass |
| E2EMockProof | 6 | All pass |
| E2E | 3 | All pass |
| RealPlonkProof | 3 | All pass |

### Invariant Tests (5 invariants × 256 runs)

| Invariant | Calls | Reverts | Status |
|-----------|-------|---------|--------|
| `emergencyPauseBlocksAll` | 3,840 | 3,840 | Pass |
| `nonceMonotonic` | 3,840 | 3,840 | Pass |
| `onlyActiveIssuersAccepted` | 3,840 | 3,840 | Pass |
| `sessionExpiryMonotonic` | 3,840 | 3,840 | Pass |
| `unverifiedUserBalanceZero` | 3,840 | 3,840 | Pass |

### Adversarial Tests — Hell Mode (8 tests)

| Test | Gas | Status |
|------|-----|--------|
| `Hell_EmergencyWithdrawal` | 113,134 | Pass |
| `Hell_FakeSignature` | 83,301 | Pass |
| `Hell_GasConsumption` | 72,171 | Pass |
| `Hell_NFTTransferBlocked` | 15,625 | Pass |
| `Hell_ProofReplayCrossUser` | 72,906 | Pass |
| `Hell_ProofReplayOldProof` | 58,575 | Pass |
| `Hell_UnauthorizedAccess` | 41,042 | Pass |
| `Hell_UpgradePreservesData` | 885,204 | Pass |

---

## ZK Proof Benchmark

**Circuit:** compliance.circom (EdDSA-Poseidon + Merkle tree depth 20)
**Prover:** snarkjs PLONK, WASM backend
**Environment:** Node.js v24, macOS

| Phase | Avg | Median | Min | Max |
|-------|-----|--------|-----|-----|
| **Proof Generation** | 14,853 ms | 14,763 ms | 14,747 ms | 15,108 ms |
| **Off-chain Verification** | 8.18 ms | 8.45 ms | 7.21 ms | 9.42 ms |
| **Total** | 14,861 ms | 14,772 ms | — | — |

### On-chain Verification Gas

| Operation | Gas | Cost (est.) |
|-----------|-----|-------------|
| PLONK proof verification (one-time) | 683,986 | ~$0.016 |
| Session start | 51,536 | ~$0.001 |
| Per-swap compliance check (SLOAD) | ~15,000 | ~$0.0003 |
| EIP-712 permit verify | 44,643 | ~$0.001 |

*Gas costs estimated at 0.006 gwei gas price, ~$3,800/ETH.*

---

## Fork Test Results (Live Base Sepolia)

Real swap execution against deployed contracts:

| Test | Result |
|------|--------|
| USDC → WETH swap | 35.06 USDC → 0.00884 WETH |
| WETH → USDC swap | 0.001 WETH → 5.04 USDC |
| Add liquidity + swap | Pass |
| Currency delta settlement | Pass |
| Unverified user blocked | Pass |
| Expired session blocked | Pass |
| Emergency pause blocked | Pass |
| Slippage protection | Pass |

---

## Security Tests Covered

- Router whitelist enforcement (unapproved routers rejected)
- EIP-712 replay prevention (nonce increment)
- Cross-user session isolation
- Emergency pause halts all operations
- UUPS upgrade preserves state
- NFT position transfers blocked (soulbound)
- Invalid hookData rejected
- Fake signatures rejected
- Proof replay across users blocked

---

## Contact

2867755637@qq.com
