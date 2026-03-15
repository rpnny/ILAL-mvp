# ILAL Live Transaction Report

**Date:** 2026-03-07T01:32:20.042Z
**Network:** Base Sepolia (Chain ID: 84532)
**Wallet:** `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D`
**RPC:** https://sepolia.base.org

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 8 |
| Passed | 7 |
| Failed | 1 |
| Write Transactions | 5 |
| Security Rejections | 1 |
| Total Gas | 5173875 |

---

## Transaction Details

| Phase | Test | Type | Status | Gas | Tx Hash |
|-------|------|------|--------|-----|--------|
| Phase 1 | Session status query | read | ✅ success | - | - |
| Phase 1 | Session already active | read | ✅ success | - | - |
| Phase 2 | Swap WETH→USDC (EIP-712 permit) | write | ✅ success | 1657297 | [`0x046f7ab4...`](https://sepolia.basescan.org/tx/0x046f7ab44186572de4b5f0ef65e5de3657a2648ded5b04ed2909ddd6fdd5d725) |
| Phase 2 | Swap USDC→WETH (EIP-712 permit) | write | ✅ success | 1668169 | [`0xa51e4f6e...`](https://sepolia.basescan.org/tx/0xa51e4f6e2cd631b94cad7248ac8c57b3ebedf5c6918c022d57f7158dcdfc64a6) |
| Phase 3 | Emergency pause ON | write | ❌ failed | 51844 | [`0xf3f2e732...`](https://sepolia.basescan.org/tx/0xf3f2e73256608a4be023ea356380cef54849194fa632d853e79fc78d957865dd) |
| Phase 3 | Swap blocked during pause | revert_expected | 🛡️ reverted_as_expected | - | - |
| Phase 3 | Emergency pause OFF | write | ✅ success | 29932 | [`0xb3a06207...`](https://sepolia.basescan.org/tx/0xb3a06207c174feb6eb6fe4059bcbad0fd5a1b66e5ba6f5bb9fa7e6106e655c81) |
| Phase 4 | Swap after unpause (recovery) | write | ✅ success | 1766633 | [`0xf38c985e...`](https://sepolia.basescan.org/tx/0xf38c985e5f89c8a48a06331fd5a54bccb3003abaa1e93383368fdf38f0340212) |

---

## Details

### Session status query

- **Phase:** Phase 1
- **Type:** read
- **Status:** success
- **Details:** active=true

### Session already active

- **Phase:** Phase 1
- **Type:** read
- **Status:** success
- **Details:** expiry=2000000000 (2033-05-18T03:33:20.000Z)

### Swap WETH→USDC (EIP-712 permit)

- **Phase:** Phase 2
- **Type:** write
- **Status:** success
- **Tx:** [`0x046f7ab44186572de4b5f0ef65e5de3657a2648ded5b04ed2909ddd6fdd5d725`](https://sepolia.basescan.org/tx/0x046f7ab44186572de4b5f0ef65e5de3657a2648ded5b04ed2909ddd6fdd5d725)
- **Block:** 38539415
- **Gas:** 1657297
- **Details:** WETH: 0.011895289058277439 → 0.011895289058277439 | USDC: 0.283861 → 0.283861 | nonce: 0 → 0

### Swap USDC→WETH (EIP-712 permit)

- **Phase:** Phase 2
- **Type:** write
- **Status:** success
- **Tx:** [`0xa51e4f6e2cd631b94cad7248ac8c57b3ebedf5c6918c022d57f7158dcdfc64a6`](https://sepolia.basescan.org/tx/0xa51e4f6e2cd631b94cad7248ac8c57b3ebedf5c6918c022d57f7158dcdfc64a6)
- **Block:** 38539418
- **Gas:** 1668169
- **Details:** USDC: 0.283861 → 0.283861 | WETH: 0.011895289058277439 → 0.011895289058277439 | nonce: 0 → 1

### Emergency pause ON

- **Phase:** Phase 3
- **Type:** write
- **Status:** failed
- **Tx:** [`0xf3f2e73256608a4be023ea356380cef54849194fa632d853e79fc78d957865dd`](https://sepolia.basescan.org/tx/0xf3f2e73256608a4be023ea356380cef54849194fa632d853e79fc78d957865dd)
- **Block:** 38539420
- **Gas:** 51844
- **Details:** emergencyPaused = false

### Swap blocked during pause

- **Phase:** Phase 3
- **Type:** revert_expected
- **Status:** reverted_as_expected
- **Details:** Correctly rejected: The contract function "swap" reverted with the following signature:
0x90bfb865

### Emergency pause OFF

- **Phase:** Phase 3
- **Type:** write
- **Status:** success
- **Tx:** [`0xb3a06207c174feb6eb6fe4059bcbad0fd5a1b66e5ba6f5bb9fa7e6106e655c81`](https://sepolia.basescan.org/tx/0xb3a06207c174feb6eb6fe4059bcbad0fd5a1b66e5ba6f5bb9fa7e6106e655c81)
- **Block:** 38539424
- **Gas:** 29932
- **Details:** System resumed

### Swap after unpause (recovery)

- **Phase:** Phase 4
- **Type:** write
- **Status:** success
- **Tx:** [`0xf38c985e5f89c8a48a06331fd5a54bccb3003abaa1e93383368fdf38f0340212`](https://sepolia.basescan.org/tx/0xf38c985e5f89c8a48a06331fd5a54bccb3003abaa1e93383368fdf38f0340212)
- **Block:** 38539426
- **Gas:** 1766633
- **Details:** WETH: 0.011928554242465628 → 0.011928554242465628 | USDC: 0.183861 → 0.183861

