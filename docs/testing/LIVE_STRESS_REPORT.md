# ILAL Live Stress Test Report

**Date:** 2026-03-07T02:25:12.094Z
**Network:** Base Sepolia (84532)
**Wallet:** `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D`
**Duration:** 2358.4s

## Summary

| Metric | Value |
|--------|-------|
| Tests | 29 |
| Pass | 29 |
| Fail | 0 |
| On-chain Writes | 19 |
| Total Gas | 2205289 |
| Nonce | 8 → 19 |
| ETH Spent (gas) | 0.000013231734022962 |

## All Transactions

| # | Test | Gas | Block | Status | Tx |
|---|------|-----|-------|--------|----|
| 1 | USDC allowance OK | - | - | ✅ | - |
| 2 | WETH allowance OK | - | - | ✅ | - |
| 3 | Round 1: USDC→WETH (0.02 USDC) | 171597 | 38539837 | ✅ | [`0x05890a1ccc...`](https://sepolia.basescan.org/tx/0x05890a1ccc9612ae7c67e8d80d37c5d2261e3b2db0857b20cb01fa00409d5e2c) |
| 4 | Round 2: USDC→WETH (0.01 USDC) | 171589 | 38539841 | ✅ | [`0xb38ce8592a...`](https://sepolia.basescan.org/tx/0xb38ce8592ab96d2169c037ae69d74d5b70687d340afdc49331660193cb059fdc) |
| 5 | Round 3: USDC→WETH (0.03 USDC) | 171565 | 38539845 | ✅ | [`0xc6e5355c2b...`](https://sepolia.basescan.org/tx/0xc6e5355c2b7f7d3e6119ae5250f6ddc3d10032264755f456bbd617660c2559ad) |
| 6 | Round 4: USDC→WETH (0.015 USDC) | 171565 | 38539849 | ✅ | [`0xd38c6c7c6b...`](https://sepolia.basescan.org/tx/0xd38c6c7c6bcbcaf95702f86d606731e2c5d91f8e4b144cfe555ec24025e7da60) |
| 7 | Round 5: USDC→WETH (0.025 USDC) | 171697 | 38539853 | ✅ | [`0x077cf95f06...`](https://sepolia.basescan.org/tx/0x077cf95f06139b896d814b59c74d9d531b6465a37ce68723465d0317492076bf) |
| 8 | Nonce verification | - | - | ✅ | - |
| 9 | Emergency pause ON | 51844 | 38539857 | ✅ | [`0x29f2147af3...`](https://sepolia.basescan.org/tx/0x29f2147af34099497bf17f296ce319bea88a299bae15c37f91849e940046c8ff) |
| 10 | Swap during pause (must fail) | - | - | ✅ | - |
| 11 | Emergency pause OFF | 29932 | 38539864 | ✅ | [`0x4155061a7f...`](https://sepolia.basescan.org/tx/0x4155061a7fb88e7c26d7032140ba1da7d617307c7bfca9e8fbdae6e08afb2f2e) |
| 12 | Swap after unpause | 171641 | 38539867 | ✅ | [`0x9430960b5e...`](https://sepolia.basescan.org/tx/0x9430960b5e88f7692f95de52d0fc5a9f0a231ecb0ea3f4ae6b436ad4f91f491c) |
| 13 | Router de-approved | 30572 | 38539871 | ✅ | [`0x9a8c3a0d46...`](https://sepolia.basescan.org/tx/0x9a8c3a0d46e1fb4ed2fe10115d3c013903d22ca01b95f68c3b120f36aa84a7c2) |
| 14 | Swap with de-approved router (must fail) | - | - | ✅ | - |
| 15 | Router re-approved | 52484 | 38539878 | ✅ | [`0x00586ab2cb...`](https://sepolia.basescan.org/tx/0x00586ab2cb3bfd664a6faade0c149d34c015c0a77bb66ace3b4fd01e031faf5e) |
| 16 | Swap after re-approval | 171661 | 38540414 | ✅ | [`0x56df19f974...`](https://sepolia.basescan.org/tx/0x56df19f974410fc8a30f192f6afecfe9586694ba9fcd49a251b52b85dd23adf0) |
| 17 | TTL changed 24h→12h | 34804 | 38540418 | ✅ | [`0x45470ca606...`](https://sepolia.basescan.org/tx/0x45470ca606cc3a3b63fac65c153dfff6b3a98c764c7458fcea120d74f54fcd6b) |
| 18 | TTL restored 12h→24h | 34816 | 38540908 | ✅ | [`0xe1532c640c...`](https://sepolia.basescan.org/tx/0xe1532c640cc8752f0c9358f8fc1bf20fcb6df93712c2615f4b393a4859435dfa) |
| 19 | Session status | - | - | ✅ | - |
| 20 | Session ended | 30455 | 38540913 | ✅ | [`0xfb900aa4b0...`](https://sepolia.basescan.org/tx/0xfb900aa4b0422f0fda31c262653e720d18161885bf00b03ed0749547e19ec2eb) |
| 21 | Swap without session (must fail) | - | - | ✅ | - |
| 22 | Session restarted | 52511 | 38540920 | ✅ | [`0xcf40c8179d...`](https://sepolia.basescan.org/tx/0xcf40c8179d9f7e1fa94353d68f176e90032c4cc36788e2dc5431fb97ac8cc323) |
| 23 | Swap with new session | 171629 | 38540995 | ✅ | [`0x40bb1b3cfb...`](https://sepolia.basescan.org/tx/0x40bb1b3cfb19ca5e0f1d5e9adbf62bb1699943c053916e42c0d8fc7419b8865d) |
| 24 | NFT transfer blocked (soulbound) | - | - | ✅ | - |
| 25 | Malformed hookData rejected | - | - | ✅ | - |
| 26 | Expired permit rejected | - | - | ✅ | - |
| 27 | Burst swap 1 | 171661 | 38541005 | ✅ | [`0x605fb12414...`](https://sepolia.basescan.org/tx/0x605fb1241455516b666b0b301689e91d8b6d1299efb6554aef9a7b33519cd04f) |
| 28 | Burst swap 2 | 171633 | 38541008 | ✅ | [`0x8969d9f964...`](https://sepolia.basescan.org/tx/0x8969d9f96474d0ea9edc067f29ddefcb6c615d4187283b6d2c928ed7d9d68157) |
| 29 | Burst swap 3 | 171633 | 38541011 | ✅ | [`0xd33f2343cc...`](https://sepolia.basescan.org/tx/0xd33f2343ccb5e17a9ad8cbe05fa63e4e25e6ad44c419f21683595177ccedf727) |

## Balance Changes

| Token | Before | After | Delta |
|-------|--------|-------|-------|
| ETH | 0.229783160128261538 | 0.229769928394238576 | -0.000013231734022962 |
| USDC | 0.228829 | 0.068829 | -0.160000 |
| WETH | 0.011913564414051963 | 0.011966706023070532 | 0.000053141609018569 |
