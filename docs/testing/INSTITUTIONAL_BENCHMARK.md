# ILAL Institutional Benchmark Report

**Date:** 2026-03-08T04:16:04.952Z
**Network:** Base Sepolia (Chain ID: 84532)
**Wallet:** `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D`
**RPC:** https://sepolia.base.org
**API:** http://localhost:3001/api/v1

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Operations | 8 |
| Succeeded | 8 |
| Failed/Reverted | 0 |
| Total Gas | 3084559 |
| Duration | 79.2s |
| EIP-712 Permits Used | 4 |

---

## Environment

| Check | Status |
|-------|--------|
| Session Active | ✅ Yes |
| Session Expiry | 2026-03-09T03:55:29.000Z |
| Emergency Paused | ✅ No |
| SwapRouter Approved | ✅ Yes |
| Session TTL | 24h |
| API Health | 579ms |

---

## All Transactions

| Mode | Type | Label | Status | Gas | Total | API | Tx Hash |
|------|------|-------|--------|-----|-------|-----|---------|
| SDK | swap | SDK Swap 1 — 0.005 USDC→WETH | ✅ success | 1647097 | 4335ms | - | [`0x267c09d805...`](https://sepolia.basescan.org/tx/0x267c09d80500c75f8d00ef1c4bb906a8edc60e72d116bc84edaaa6ebad605d10) |
| SDK | swap | SDK Swap 2 — 0.008 USDC→WETH | ✅ success | 171629 | 4797ms | - | [`0x2ae081a213...`](https://sepolia.basescan.org/tx/0x2ae081a2139f8d160d3c51ddff3e3d13a032fd93db9bd56daad95cd8e90af500) |
| SDK | swap | SDK Swap 3 — 0.005 USDC→WETH | ✅ success | 170608 | 4511ms | - | [`0x56e7d20529...`](https://sepolia.basescan.org/tx/0x56e7d205294db7850df412af7355577f81c54e739dd8176c26e46e5be9510459) |
| SDK | liquidity | SDK Add Liquidity — full range | ✅ success | 318078 | 3937ms | - | [`0xa1e7d69d9a...`](https://sepolia.basescan.org/tx/0xa1e7d69d9a080615d536c2e4b1afbcfed200e7aed24ee54014110652182f853b) |
| API | swap | API Swap 1 — 0.005 USDC→WETH | ✅ success | 153039 | 5469ms | 1355ms | [`0x047aa640e9...`](https://sepolia.basescan.org/tx/0x047aa640e9e0fa605fcec86580dc7db11626ff9f5faf256cde684ee231967f41) |
| API | swap | API Swap 2 — 0.008 USDC→WETH | ✅ success | 153003 | 6239ms | 1359ms | [`0x0a5cffb71d...`](https://sepolia.basescan.org/tx/0x0a5cffb71d5269137b481502b9565a0e31b020eb40ecfe95cab7f773ce4e1e43) |
| API | swap | API Swap 3 — 0.005 USDC→WETH | ✅ success | 153003 | 6052ms | 1340ms | [`0xe8a9f5b24a...`](https://sepolia.basescan.org/tx/0xe8a9f5b24a562b38910b32d78b41b7263d0450f9646a0066acd26334fb8ae2f3) |
| API | liquidity | API Add Liquidity — full range | ✅ success | 318102 | 6211ms | 1342ms | [`0x5b5e088f78...`](https://sepolia.basescan.org/tx/0x5b5e088f787d2df4c2858939a543a160aaff1b9052a610164d29837988d39027) |

---

## Swap Comparison (SDK vs API)

| Metric | SDK Direct | API Relay | Diff |
|--------|-----------|-----------|------|
| Avg Total Latency | 4548ms | 5920ms | +1372ms |
| Avg API Overhead | - | 1351ms | - |
| Total Gas (3 TXs / 3 TXs) | 1989334 | 459045 | 23.1% |
| Success Rate | 3/3 | 3/3 | - |
| hookData Mode | EIP-712 SwapPermit | 0x (EOA Direct) | Different |

### SDK Swap Details (EIP-712 Permit Mode)
- **SDK Swap 1 — 0.005 USDC→WETH**: gas=1647097, 4335ms [TX](https://sepolia.basescan.org/tx/0x267c09d80500c75f8d00ef1c4bb906a8edc60e72d116bc84edaaa6ebad605d10)
- **SDK Swap 2 — 0.008 USDC→WETH**: gas=171629, 4797ms [TX](https://sepolia.basescan.org/tx/0x2ae081a2139f8d160d3c51ddff3e3d13a032fd93db9bd56daad95cd8e90af500)
- **SDK Swap 3 — 0.005 USDC→WETH**: gas=170608, 4511ms [TX](https://sepolia.basescan.org/tx/0x56e7d205294db7850df412af7355577f81c54e739dd8176c26e46e5be9510459)

### API Swap Details (Unsigned TX Mode)
- **API Swap 1 — 0.005 USDC→WETH**: gas=153039, api=1355ms, chain=4114ms, total=5469ms [TX](https://sepolia.basescan.org/tx/0x047aa640e9e0fa605fcec86580dc7db11626ff9f5faf256cde684ee231967f41)
- **API Swap 2 — 0.008 USDC→WETH**: gas=153003, api=1359ms, chain=4880ms, total=6239ms [TX](https://sepolia.basescan.org/tx/0x0a5cffb71d5269137b481502b9565a0e31b020eb40ecfe95cab7f773ce4e1e43)
- **API Swap 3 — 0.005 USDC→WETH**: gas=153003, api=1340ms, chain=4712ms, total=6052ms [TX](https://sepolia.basescan.org/tx/0xe8a9f5b24a562b38910b32d78b41b7263d0450f9646a0066acd26334fb8ae2f3)

---

## Liquidity Comparison (SDK vs API)

| Metric | SDK Direct | API Relay |
|--------|-----------|-----------|
| Latency | 3937ms | 6211ms |
| Gas | 318078 | 318102 |
| Status | success | success |
| hookData | 0x (EOA Direct) | 0x (EOA Direct) |
| Contract | PositionManager.mint() | PositionManager.mint() |

---

## Balance Changes

| Token | Before (SDK) | After SDK | After API | Total Change |
|-------|-------------|-----------|-----------|--------------|
| ETH | 0.229704821042107114 | 0.229680434308701748 | 0.229675747049000043 | -0.000029073993107071 |
| USDC | 0.003648 | 0.265507 | 0.247507 | 0.243859 |
| WETH | 0.011959729643208772 | 0.011872685020974571 | 0.011850191821817315 | -0.000109537821391457 |

---

## Architecture Comparison

| Dimension | SDK Direct Mode | API Relay Mode |
|-----------|----------------|----------------|
| Target User | DeFi-native: market makers, quant funds | TradFi: asset managers, banks |
| Chain Interaction | Direct via viem/ethers | API builds unsigned TX, client signs & broadcasts |
| Auth Model | Wallet signature only | JWT + API Key + Wallet signature |
| Swap hookData | EIP-712 SwapPermit (Mode 1) | 0x empty (Mode 2, EOA resolves as sender) |
| Liquidity hookData | 0x (EOA Direct) | 0x (EOA Direct) |
| Key Custody | Client holds private key | Client holds private key (non-custodial) |
| Latency Profile | 1 step: sign + broadcast | 2 steps: HTTP API + sign + broadcast |
| Complexity | Requires Web3 + EIP-712 knowledge | HTTP-only (after initial setup) |
| Rate Limiting | None (direct chain) | Tiered (Free/Pro/Enterprise) |
| Usage Tracking | None | Built-in billing & analytics |

---

## Key Findings

1. **SDK Swap (EIP-712)**: All swaps succeeded. EIP-712 permits provide cryptographic authorization per swap.

2. **API Swap (Mode 2)**: All swaps succeeded. The API unsigned TX with empty hookData works when the SwapRouter has proper permissions.

3. **SDK Liquidity**: Add liquidity succeeded. PositionManager checks session via its own `onlyVerified` modifier (msg.sender = EOA).

4. **API Liquidity**: Add liquidity succeeded via API unsigned TX.

5. **Latency**: SDK swaps averaged 4548ms total. API swaps averaged 5920ms total (including 1351ms API overhead).

---

## Recommendations

| Institution Type | Recommended Mode | Rationale |
|-----------------|-----------------|-----------|
| Market Makers / HFT | SDK Direct | Lowest latency, full control, EIP-712 permits |
| DeFi Funds / Quant | SDK Direct | Programmatic access, no API dependency |
| Asset Managers (TradFi) | API Relay | Simpler integration, built-in analytics |
| Banks / Custodians | API Relay | REST API familiar, compliance audit trail |
| Hybrid Teams | Both | SDK for trading, API for reporting & billing |

---

*Generated by ILAL Institutional Benchmark at 2026-03-08T04:16:04.952Z*
