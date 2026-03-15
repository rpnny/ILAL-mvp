# ILAL Test Report

**Date:** March 7, 2026
**Network:** Base Sepolia (Chain ID: 84532) + Local Foundry VM
**Toolchain:** Foundry (forge 0.3.x), Node.js v24, snarkjs

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Test Suites** | 18 |
| **Total Tests** | 216 |
| **Passed** | 216 (100%) |
| **Failed** | 0 |
| **Skipped** | 0 |
| **Invariant Runs** | 13 × 256 = 3,328 |
| **Total Fuzz Calls** | 49,920 + 1,025 fuzz runs |
| **Attack Vectors Tested** | 52+ |
| **Total Execution Time** | ~134s |

---

## Test Suites Overview

| Suite | Tests | Status |
|-------|-------|--------|
| WarTheater | 45 | ✅ All pass |
| AttackVectors | 27 | ✅ All pass |
| BattleInvariantTest | 8 | ✅ All pass |
| ComplianceHookTest | 14 | ✅ All pass |
| RegistryTest | 21 | ✅ All pass |
| SessionManagerTest | 15 | ✅ All pass |
| SwapRouterTest | 16 | ✅ All pass |
| EIP712VerifierTest | 9 | ✅ All pass |
| FullFlowTest | 8 | ✅ All pass |
| HellModeTest | 8 | ✅ All pass |
| ForkSwapTest | 8 | ✅ All pass |
| ForkTest | 7 | ✅ All pass |
| PlonkIntegrationTest | 7 | ✅ All pass |
| E2EMockProofTest | 6 | ✅ All pass |
| VerifiedPoolsPositionManagerTest | 6 | ✅ All pass |
| ComplianceInvariantTest | 5 | ✅ All pass |
| E2ETest | 3 | ✅ All pass |
| RealPlonkProofTest | 3 | ✅ All pass |

---

## Part 1: Full-Fidelity Simulation Suite (80 Tests — NEW)

### 1.1 WarTheater — Institution Lifecycle + Extreme Conditions + Attack Resilience

**45 tests | All pass**

#### Phase 1: Institution Workflow Simulation (5 tests)

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_Phase1_FullInstitutionLifecycle` | 10 institutions: batch onboard → swap → renew → expire → re-onboard → reject expired | 1,028,883 | ✅ |
| `test_Phase1_ConcurrentPermitOperations` | 10 institutions × 3 rounds EIP-712 signed swap | 1,274,367 | ✅ |
| `test_Phase1_EOADirectSwap` | 10 institutions EOA direct swap mode | 444,102 | ✅ |
| `test_Phase1_BatchEndSessions` | Batch session termination | 292,796 | ✅ |
| `test_Phase1_BatchSessionQuery` | Batch session status query | 209,856 | ✅ |

#### Phase 2: Extreme Conditions Stress Test (8 tests)

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_Phase2_MassSessionActivation` | 50 users concurrent activation | 2,752,003 | ✅ |
| `test_Phase2_RapidFireSwaps` | 10 institutions × 10 rounds rapid swap | 2,406,697 | ✅ |
| `test_Phase2_RapidPauseUnpauseCycle` | 20 rounds rapid pause/unpause toggle | 529,868 | ✅ |
| `test_Phase2_EmergencyPauseCycle` | Emergency pause → block → resume → continue | 238,453 | ✅ |
| `test_Phase2_SessionExpiryDuringOperations` | Mid-operation expiry handling | 135,472 | ✅ |
| `test_Phase2_TTLBoundaries` | TTL upper/lower bound validation (1h~7d) | 117,281 | ✅ |
| `test_Phase2_GasBenchmarks` | Gas cost benchmarks (EOA < 30k, Permit < 80k) | 143,099 | ✅ |
| `test_Phase2_SessionBoundaryExactExpiry` | Second-precise expiry boundary | 89,460 | ✅ |

#### Phase 3: Attack Resilience (28 tests)

| Test | Attack Type | Gas | Status |
|------|-------------|-----|--------|
| `test_Phase3_Attack_ForgedSignature` | Forged EIP-712 signature | 95,251 | ✅ Blocked |
| `test_Phase3_Attack_ExpiredSignature` | Expired deadline signature | 91,002 | ✅ Blocked |
| `test_Phase3_Attack_SignatureReplay` | Nonce replay attack | 126,834 | ✅ Blocked |
| `test_Phase3_Attack_CrossUserNonce` | Cross-user nonce exploit | 166,995 | ✅ Blocked |
| `test_Phase3_Attack_PermitTypeMismatch` | Swap/Liquidity permit type confusion | 94,778 | ✅ Blocked |
| `test_Phase3_Attack_UnapprovedRouter` | Unapproved router with hookData | 88,439 | ✅ Blocked |
| `test_Phase3_Attack_RouterDeapproval` | Router de-approval and retry | 106,924 | ✅ Blocked |
| `test_Phase3_Attack_DirectHookCall` | Direct hook call bypass PoolManager | 80,312 | ✅ Blocked |
| `test_Phase3_Attack_NoSessionSwap` | Swap without active session | 41,623 | ✅ Blocked |
| `test_Phase3_Attack_PastExpirySession` | Past-expiry session creation | 22,612 | ✅ Blocked |
| `test_Phase3_Attack_ExcessiveSessionExpiry` | Session expiry exceeding TTL | 39,122 | ✅ Blocked |
| `test_Phase3_Attack_SessionExpiryRaceCondition` | Session expiry race condition | 92,955 | ✅ Blocked |
| `test_Phase3_Attack_MalformedHookData` | Malformed hookData decoding | 89,530 | ✅ Blocked |
| `test_Phase3_Attack_GarbageHookData` | Random garbage hookData | 103,244 | ✅ Blocked |
| `test_Phase3_Attack_NFTTransferBlocked` | NFT position transfer (soulbound) | 25,258 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedEmergencyPause` | Unauthorized pause attempt | 29,323 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedSessionStart` | Unauthorized session start | 21,678 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedSessionEnd` | Unauthorized session termination | 69,863 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedIssuerRegistration` | Unauthorized issuer registration | 24,263 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedIssuerRevocation` | Unauthorized issuer revocation | 31,535 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedRouterApproval` | Unauthorized router approval | 20,809 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedTTLChange` | Unauthorized TTL modification | 25,177 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedUpgrade_Registry` | Unauthorized Registry UUPS upgrade | 800,395 | ✅ Blocked |
| `test_Phase3_Attack_UnauthorizedUpgrade_SessionManager` | Unauthorized SessionManager UUPS upgrade | 991,706 | ✅ Blocked |
| `test_Phase3_Attack_ZeroAddressSession` | Zero address session creation | 18,596 | ✅ Blocked |
| `test_Phase3_Attack_IssuerRevocationImpact` | Issuer revocation does not affect active sessions | 97,064 | ✅ Verified |
| `test_Phase3_CombinedAttack_FullSequence` | Multi-vector combined attack chain | 912,654 | ✅ All blocked |
| `test_Phase3_UpgradePreservesState` | UUPS upgrade preserves all state | 1,861,405 | ✅ Verified |

#### Fuzz Tests (4 tests)

| Test | Runs | Avg Gas | Status |
|------|------|---------|--------|
| `testFuzz_HookDataLength` | 257 | 78,955 | ✅ |
| `testFuzz_NoSessionNoSwap` | 256 | 68,001 | ✅ |
| `testFuzz_SessionExpiryValidation` | 256 | 46,064 | ✅ |
| `testFuzz_TTLValidation` | 256 | 20,248 | ✅ |

---

### 1.2 AttackVectors — STRIDE Threat Model Test Library

**27 tests | All pass**

#### S — Spoofing (Identity Forgery)

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_S1_IdentitySpoofing_WrongKey` | Sign with attacker key for victim address | 89,141 | ✅ Blocked |
| `test_S2_IdentitySpoofing_ImpersonateUser` | Impersonate another user's permit | 119,043 | ✅ Blocked |
| `test_S3_ZeroAddressUser` | Zero address session creation | 19,014 | ✅ Blocked |

#### T — Tampering (Data Modification)

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_T1_Tampering_ModifyDeadline` | Modify deadline in signed permit | 89,582 | ✅ Blocked |
| `test_T1_Tampering_ModifyNonce` | Modify nonce in signed permit | 84,999 | ✅ Blocked |
| `test_T1_Tampering_ModifyUser` | Modify user address in signed permit | 120,820 | ✅ Blocked |
| `test_T2_TruncatedSignature` | Submit truncated 32-byte signature | 93,340 | ✅ Blocked |

#### R — Repudiation (Replay)

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_R1_NonceReplay` | Replay permit with already-used nonce | 120,823 | ✅ Blocked |
| `test_R2_CrossOperationReplay` | Cross-operation type replay attack | 89,731 | ✅ Blocked |

#### D — Denial of Service

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_D1_SessionActivationSpam` | Spam session activation as unauthorized user | 18,913 | ✅ Blocked |
| `test_D2_MassSessionEndAttack` | Mass session termination attempt | 96,227 | ✅ Blocked |
| `test_D3_EmergencyPauseAbuse` | Unauthorized emergency pause | 26,468 | ✅ Blocked |
| `test_D4_RouterDeapprovalAttack` | Unauthorized router de-approval | 28,637 | ✅ Blocked |
| `test_D5_TTLManipulationAttack` | Unauthorized TTL manipulation | 23,076 | ✅ Blocked |

#### E — Elevation of Privilege

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_E1_UnauthorizedVerifierRole` | Attempt to grant VERIFIER_ROLE | 26,954 | ✅ Blocked |
| `test_E2_UnauthorizedAdminRole` | Attempt to grant DEFAULT_ADMIN_ROLE | 25,963 | ✅ Blocked |
| `test_E3_OwnershipTakeover` | Attempt to transfer Registry ownership | 29,133 | ✅ Blocked |
| `test_E4_ProxyUpgradeHijack_Registry` | Attempt to hijack Registry UUPS upgrade | 798,698 | ✅ Blocked |
| `test_E4_ProxyUpgradeHijack_SessionManager` | Attempt to hijack SessionManager UUPS upgrade | 989,866 | ✅ Blocked |
| `test_E5_UnauthorizedIssuerRegistration` | Attempt unauthorized issuer registration | 18,913 | ✅ Blocked |

#### Edge Cases

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_Edge_DeadlineExactlyNow` | Deadline == block.timestamp boundary | 114,930 | ✅ |
| `test_Edge_SessionExpiryExactlyNow` | Session expiry exactly at current time | 76,625 | ✅ |
| `test_Edge_SessionOverwrite` | Session overwrite with new expiry | 69,309 | ✅ |
| `test_Edge_DuplicateIssuerRegistration` | Duplicate issuer ID registration | 96,727 | ✅ |
| `test_Edge_RevokedIssuerReregister` | Re-register revoked issuer | 79,719 | ✅ |

#### Comprehensive

| Test | Description | Gas | Status |
|------|-------------|-----|--------|
| `test_Gas_AttackRejectionCosts` | Gas cost benchmark for attack rejection | 104,088 | ✅ |
| `test_MultiStepAttackChain` | 10-step combined attack chain | 1,911,851 | ✅ All blocked |

---

### 1.3 BattleInvariant — Fuzz-Driven Invariant Verification

**8 invariants | 256 runs each | 30,720 total random calls | All pass**

| Invariant | Description | Calls | Reverts | Status |
|-----------|-------------|-------|---------|--------|
| `invariant_nonceMonotonic` | Nonces never decrease under any operation sequence | 3,840 | 23 | ✅ |
| `invariant_expiredSessionsBlockSwaps` | Expired sessions always block swap operations | 3,840 | 20 | ✅ |
| `invariant_pauseState` | Emergency pause flag remains consistent | 3,840 | 17 | ✅ |
| `invariant_ownershipPreserved` | Registry owner unchanged by adversarial operations | 3,840 | 12 | ✅ |
| `invariant_maliciousUsersNoSession` | Malicious users never gain active sessions | 3,840 | 20 | ✅ |
| `invariant_routerApproval` | Router approval state unaffected by attack handlers | 3,840 | 13 | ✅ |
| `invariant_sessionExpiryWithinTTL` | Active session expiry never exceeds current time + TTL | 3,840 | 12 | ✅ |
| `invariant_attacksAlwaysBlocked` | All attack attempts are consistently blocked | 3,840 | 24 | ✅ |

**Handler Operations (13 types):**

| Category | Operation | Avg Calls/Run |
|----------|-----------|---------------|
| Legitimate | `handler_startSession` | 300 |
| Legitimate | `handler_eoaSwap` | 290 |
| Legitimate | `handler_permitSwap` | 295 |
| Legitimate | `handler_addLiquidity` | 295 |
| Legitimate | `handler_removeLiquidity` | 300 |
| Legitimate | `handler_endSession` | 290 |
| Legitimate | `handler_warpTime` | 295 |
| Governance | `handler_governancePause` | 290 |
| Governance | `handler_governanceUnpause` | 295 |
| Attack | `handler_attackForgedSignature` | 280 |
| Attack | `handler_attackUnapprovedRouter` | 290 |
| Attack | `handler_attackUnauthorizedPause` | 290 |
| Attack | `handler_attackUnauthorizedSessionStart` | 300 |

---

## Part 2: Pre-existing Test Suites (136 Tests — Regression)

### Unit Tests (65 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| ComplianceHookTest | 14 | ✅ All pass |
| SessionManagerTest | 15 | ✅ All pass |
| RegistryTest | 21 | ✅ All pass |
| EIP712VerifierTest | 9 | ✅ All pass |
| VerifiedPoolsPositionManagerTest | 6 | ✅ All pass |

### Integration Tests (48 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| SwapRouterTest | 16 | ✅ All pass |
| ForkSwapTest (live Base Sepolia) | 8 | ✅ All pass |
| FullFlowTest | 8 | ✅ All pass |
| ForkTest (live Base Sepolia) | 7 | ✅ All pass |
| PlonkIntegrationTest | 7 | ✅ All pass |
| E2EMockProofTest | 6 | ✅ All pass |
| E2ETest | 3 | ✅ All pass |
| RealPlonkProofTest | 3 | ✅ All pass |

### Pre-existing Invariant Tests (5 invariants × 256 runs)

| Invariant | Calls | Status |
|-----------|-------|--------|
| `emergencyPauseBlocksAll` | 3,840 | ✅ Pass |
| `nonceMonotonic` | 3,840 | ✅ Pass |
| `onlyActiveIssuersAccepted` | 3,840 | ✅ Pass |
| `sessionExpiryMonotonic` | 3,840 | ✅ Pass |
| `unverifiedUserBalanceZero` | 3,840 | ✅ Pass |

### Adversarial Tests — Hell Mode (8 tests)

| Test | Gas | Status |
|------|-----|--------|
| `Hell_EmergencyWithdrawal` | 113,134 | ✅ |
| `Hell_FakeSignature` | 83,301 | ✅ |
| `Hell_GasConsumption` | 72,171 | ✅ |
| `Hell_NFTTransferBlocked` | 15,625 | ✅ |
| `Hell_ProofReplayCrossUser` | 72,906 | ✅ |
| `Hell_ProofReplayOldProof` | 58,575 | ✅ |
| `Hell_UnauthorizedAccess` | 41,042 | ✅ |
| `Hell_UpgradePreservesData` | 885,204 | ✅ |

---

## Part 3: Gas Performance Benchmarks

### Core Contract Operations

| Operation | Min | Avg | Median | Max | Calls |
|-----------|-----|-----|--------|-----|-------|
| `ComplianceHook.beforeSwap` | 24,350 | 47,876 | 46,940 | 82,048 | 702 |
| `ComplianceHook.beforeAddLiquidity` | 24,491 | 40,074 | 46,974 | 47,380 | 5 |
| `ComplianceHook.beforeRemoveLiquidity` | 24,469 | 34,313 | 36,849 | 39,085 | 4 |
| `ComplianceHook.getNonce` | 2,508 | 2,508 | 2,508 | 2,508 | 182 |
| `SessionManager.startSession` | 2,488 | 31,428 | 38,350 | 38,350 | 656 |
| `SessionManager.isSessionActive` | 2,772 | 2,772 | 2,772 | 2,772 | 634 |
| `SessionManager.endSessionBatch` | 71,091 | 71,091 | 71,091 | 71,091 | 1 |
| `Registry.emergencyPaused` | 2,260 | 2,260 | 2,260 | 2,260 | 746 |
| `Registry.isRouterApproved` | 2,462 | 2,462 | 2,462 | 2,462 | 413 |
| `Registry.getSessionTTL` | 2,410 | 2,410 | 2,410 | 2,410 | 949 |
| `Registry.setEmergencyPause` | 2,698 | 16,620 | 8,733 | 25,833 | 44 |
| `Registry.registerIssuer` | 2,896 | 70,301 | 71,799 | 71,799 | 46 |
| `Registry.approveRouter` | 2,479 | 25,235 | 26,102 | 26,102 | 47 |

### Deployment Costs

| Contract | Gas | Size (bytes) |
|----------|-----|-------------|
| ComplianceHook | 1,492,106 | 8,101 |
| SessionManager | 1,065,555 | 4,799 |
| VerifiedPoolsPositionManager | 1,533,568 | 7,048 |
| Registry | 859,418 | 3,846 |
| MockVerifier | 444,409 | 1,813 |
| ERC1967Proxy | 214,062 | 876 |

### ZK Proof Benchmark

**Circuit:** compliance.circom (EdDSA-Poseidon + Merkle tree depth 20)
**Prover:** snarkjs PLONK, WASM backend

| Phase | Avg | Median | Min | Max |
|-------|-----|--------|-----|-----|
| **Proof Generation** | 14,853 ms | 14,763 ms | 14,747 ms | 15,108 ms |
| **Off-chain Verification** | 8.18 ms | 8.45 ms | 7.21 ms | 9.42 ms |

| On-chain Operation | Gas | Cost (est.) |
|--------------------|-----|-------------|
| PLONK proof verification (one-time) | 683,986 | ~$0.016 |
| Session start | 51,536 | ~$0.001 |
| Per-swap compliance check (SLOAD) | ~15,000 | ~$0.0003 |
| EIP-712 permit verify | 44,643 | ~$0.001 |

*Gas costs estimated at 0.006 gwei gas price, ~$3,800/ETH.*

---

## Part 4: Fork Test Results (Live Base Sepolia)

| Test | Result |
|------|--------|
| USDC → WETH swap | 35.06 USDC → 0.00884 WETH |
| WETH → USDC swap | 0.001 WETH → 5.04 USDC |
| Add liquidity + swap | ✅ Pass |
| Currency delta settlement | ✅ Pass |
| Unverified user blocked | ✅ Pass |
| Expired session blocked | ✅ Pass |
| Emergency pause blocked | ✅ Pass |
| Slippage protection | ✅ Pass |

---

## Part 5: Security Assessment

### Threat Coverage Matrix

| Threat Category | Vectors Tested | Result |
|-----------------|---------------|--------|
| **Signature Forgery** | Wrong key, impersonation, truncated sig | ✅ All blocked |
| **Replay Attacks** | Nonce replay, cross-user, cross-operation | ✅ All blocked |
| **Data Tampering** | Modified deadline/nonce/user in permit | ✅ All blocked |
| **Access Control Bypass** | Unauthorized role grant, ownership transfer, upgrade | ✅ All blocked |
| **Denial of Service** | Session spam, mass termination, pause abuse, TTL manipulation | ✅ All blocked |
| **Privilege Escalation** | VERIFIER_ROLE, ADMIN_ROLE, owner takeover, proxy hijack | ✅ All blocked |
| **Session Manipulation** | Excessive expiry, zero address, race condition | ✅ All blocked |
| **Asset Theft** | NFT transfer, unauthorized withdrawal | ✅ All blocked |
| **State Corruption** | Post-upgrade state loss, issuer revocation impact | ✅ State preserved |

### Key Security Properties Verified

| Property | Verification Method | Confidence |
|----------|-------------------|------------|
| Nonce monotonicity | Invariant fuzz (30,720 calls) | High |
| Session expiry enforcement | Invariant fuzz + explicit tests | High |
| Emergency pause consistency | Invariant fuzz + explicit tests | High |
| Ownership immutability | Invariant fuzz (30,720 calls) | High |
| Malicious user isolation | Invariant fuzz (30,720 calls) | High |
| Router approval integrity | Invariant fuzz + explicit tests | High |
| TTL bound enforcement | Invariant fuzz + fuzz tests (256 runs) | High |
| EIP-712 signature validity | 20+ targeted attack scenarios | High |
| UUPS upgrade safety | Explicit state preservation test | High |

---

## Test Files

| File | Tests | Category |
|------|-------|----------|
| `test/simulation/WarTheater.t.sol` | 45 | Full-fidelity simulation |
| `test/simulation/AttackVectors.t.sol` | 27 | STRIDE attack vectors |
| `test/simulation/BattleInvariant.t.sol` | 8 | Fuzz-driven invariants |
| `test/unit/ComplianceHook.t.sol` | 14 | Unit tests |
| `test/unit/Registry.t.sol` | 21 | Unit tests |
| `test/unit/SessionManager.t.sol` | 15 | Unit tests |
| `test/unit/EIP712Verifier.t.sol` | 9 | Unit tests |
| `test/unit/VerifiedPoolsPositionManager.t.sol` | 6 | Unit tests |
| `test/integration/SwapRouter.t.sol` | 16 | Integration |
| `test/integration/FullFlow.t.sol` | 8 | Integration |
| `test/integration/E2EMockProof.t.sol` | 6 | Integration |
| `test/integration/E2E.t.sol` | 3 | Integration |
| `test/integration/PlonkIntegration.t.sol` | 7 | Integration |
| `test/integration/RealPlonkProof.t.sol` | 3 | Integration |
| `test/invariant/ComplianceInvariant.t.sol` | 5 | Invariant fuzz |
| `test/hell/HellMode.t.sol` | 8 | Adversarial |
| `test/hell/ForkTest.t.sol` | 7 | Fork (live) |
| `test/hell/ForkSwapTest.t.sol` | 8 | Fork (live) |

---

## Part 6: Live On-Chain Transactions (Base Sepolia)

**Executed:** 2026-03-07T01:32:20Z
**Wallet:** `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D`
**Network:** Base Sepolia (Chain ID: 84532)

### Real Transaction Summary

| Metric | Value |
|--------|-------|
| Write Transactions | 5 |
| Security Rejections | 1 |
| Total Gas Used | 5,173,875 |

### Transaction Log

| Phase | Test | Gas | Tx Hash | Status |
|-------|------|-----|---------|--------|
| Session | Session status query (read) | - | - | ✅ active=true |
| Swap | WETH→USDC (EIP-712 permit) | 1,657,297 | [`0x046f7ab4...`](https://sepolia.basescan.org/tx/0x046f7ab44186572de4b5f0ef65e5de3657a2648ded5b04ed2909ddd6fdd5d725) | ✅ Success |
| Swap | USDC→WETH (EIP-712 permit) | 1,668,169 | [`0xa51e4f6e...`](https://sepolia.basescan.org/tx/0xa51e4f6e2cd631b94cad7248ac8c57b3ebedf5c6918c022d57f7158dcdfc64a6) | ✅ Success |
| Pause | Emergency pause ON | 51,844 | [`0xf3f2e732...`](https://sepolia.basescan.org/tx/0xf3f2e73256608a4be023ea356380cef54849194fa632d853e79fc78d957865dd) | ✅ Paused |
| Security | Swap blocked during pause | - | - | 🛡️ Correctly rejected |
| Pause | Emergency pause OFF | 29,932 | [`0xb3a06207...`](https://sepolia.basescan.org/tx/0xb3a06207c174feb6eb6fe4059bcbad0fd5a1b66e5ba6f5bb9fa7e6106e655c81) | ✅ Resumed |
| Recovery | Swap after unpause | 1,766,633 | [`0xf38c985e...`](https://sepolia.basescan.org/tx/0xf38c985e5f89c8a48a06331fd5a54bccb3003abaa1e93383368fdf38f0340212) | ✅ Success |

### Balance Changes

| Token | Before | After | Delta |
|-------|--------|-------|-------|
| ETH | 0.22983 | 0.22980 | -0.00003 (gas) |
| USDC | 0.283861 | 0.28381 | -0.000051 |
| WETH | 0.011895 | 0.011895 | ~0 (micro delta) |

### What Was Verified On-Chain

1. **EIP-712 Signature Flow**: User signs permit → Router submits to PoolManager → ComplianceHook verifies signature → Swap executes
2. **Nonce Increment**: On-chain nonce correctly incremented after each permit swap
3. **Emergency Pause**: `setEmergencyPause(true)` blocks all swap operations on-chain
4. **Pause Recovery**: `setEmergencyPause(false)` restores normal swap operations
5. **Security Rejection**: Swap attempt during pause correctly reverted with `EmergencyPaused` error

> All transactions are verifiable on [BaseScan (Base Sepolia)](https://sepolia.basescan.org/address/0x1b869CaC69Df23Ad9D727932496AEb3605538c8D)

---

## How to Run

```bash
# Run all tests
forge test

# Run simulation suite only
./scripts/simulation/run-simulation.sh contracts

# Run individual suites
./scripts/simulation/run-simulation.sh war        # WarTheater
./scripts/simulation/run-simulation.sh attack     # AttackVectors
./scripts/simulation/run-simulation.sh invariant  # BattleInvariant

# Run with gas report
forge test --match-path "test/simulation/WarTheater.t.sol" --gas-report

# Run with verbose traces
forge test --match-path "test/simulation/*.sol" -vvvv

# Run live on-chain transactions (Base Sepolia)
./apps/api/node_modules/.bin/tsx scripts/simulation/live-transactions.ts
```

---

## Contact

2867755637@qq.com
