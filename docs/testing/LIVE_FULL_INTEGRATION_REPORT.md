# ILAL Full Live Integration Report

**Generated:** 2026-03-12T13:48:55.491Z
**Network:** Base Sepolia
**Fresh Pool:** `0xdd3d112a48906807c4b73c94ed884552427e4cf9` / `0xfb080423cedd4ca56da3f60a4b901f51846459ae` + `0xe633220f15932428FcA60A1A2C2C48797A180A80`
**Frontend Route:** `/live-exercise`

## What Was Completed

- Fresh mock assets deployed on-chain: `mUSD` and `mTBILL`
- Brand-new Uniswap v4 pool initialized with `ComplianceHook`
- Multiple independent wallets funded and used for blue / red exercises
- Real add-liquidity executed on the fresh pool
- Real Mode 1 swap path executed with `hookData >= 148 bytes`
- Frontend config generated for browser-issued permit swaps

## Key Proof Point

- Real ZK verification route executed through `POST /api/v1/verify` for the fixed zk-demo wallet `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Session was activated on-chain only after proof validation

## Summary

| Section | Passed |
|---|---:|
| Blue team | 5 |
| Red team | 4 |
| Fresh pool created | 1 |
| Frontend route prepared | 1 |

## Results

| Section | Test | Status | Detail | Tx |
|---|---|---|---|---|
| POOL | Deploy mUSD | PASS | 0xdd3d112a48906807c4b73c94ed884552427e4cf9 | [`0xad3b8549fb...`](https://sepolia.basescan.org/tx/0xad3b8549fb15fea7527d1d2bb4ffb850b3dbb4ecfb142ac6756a7844faffb922) |
| POOL | Deploy mTBILL | PASS | 0xfb080423cedd4ca56da3f60a4b901f51846459ae | [`0x142d9dbd83...`](https://sepolia.basescan.org/tx/0x142d9dbd838b3542bdd7403977d9d7cb50281ce7cf010b3ddc7ca5603382be81) |
| POOL | Initialize fresh Hook pool | PASS | 0xdd3d112a48906807c4b73c94ed884552427e4cf9/0xfb080423cedd4ca56da3f60a4b901f51846459ae fee=500 tickSpacing=10 | [`0xe60dadd889...`](https://sepolia.basescan.org/tx/0xe60dadd889b4fdee2961dcf1bcccf365ec4c5cbd599460dd45ce2fc0a462b079) |
| VERIFY | Real ZK verify + session activation | PASS | session opened for 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | [`0x716a252791...`](https://sepolia.basescan.org/tx/0x716a252791f7d79978b315cbc5b6d8e231603a55a1ead2a398dfe774bb484ab4) |
| BLUE | Add liquidity on fresh pool | PASS | liquidity=3383749980974202524803454 | [`0x6aad64bcca...`](https://sepolia.basescan.org/tx/0x6aad64bccacc2596f91c4dea9c25fdada3ef854f18872c814c173f2bbb468f11) |
| BLUE | BlackRock Mode2 swap | PASS | blackrock 250 mUSD -> mTBILL (Mode 2) | [`0x0847dc3ade...`](https://sepolia.basescan.org/tx/0x0847dc3ade2b6b9a0bffc85aafb06a148f6335f3bccd08db1544d2c0f80835cf) |
| BLUE | Ondo Mode2 swap | PASS | ondo 250 mUSD -> mTBILL (Mode 2) | [`0xf9d26a9a66...`](https://sepolia.basescan.org/tx/0xf9d26a9a6646c948d0fdadf83240590016dd4938dba6a07ddfe99aa648a2cea3) |
| BLUE | JPMorgan Mode2 swap | PASS | jpm 250 mUSD -> mTBILL (Mode 2) | [`0x75a581f07a...`](https://sepolia.basescan.org/tx/0x75a581f07a26f0019946b2b3c4939cb74d57d7bcb3e4b6141776cc71ec4b4f92) |
| BLUE | ZK-verified wallet permit swap (Mode 1) | PASS | zkVerified traded 100 mUSD via permit hookData | [`0x03f0332f2b...`](https://sepolia.basescan.org/tx/0x03f0332f2b228fb18a195507c1e65308ee144e4da72b7e2b6cf5bccbcadd5315) |
| RED | Unverified wallet swap (Mode 2) | PASS | blocked: The contract function "swap" reverted with the following signature:
0x90bfb865

Unable to decode signature "0x90bfb865"  | - |
| RED | Expired permit swap (Mode 1) | PASS | blocked: The contract function "swap" reverted with the following signature:
0x90bfb865

Unable to decode signature "0x90bfb865"  | - |
| RED | Malformed hookData swap | PASS | blocked: The contract function "swap" reverted with the following signature:
0x90bfb865

Unable to decode signature "0x90bfb865"  | - |
| RED | No-session wallet swap (Mode 2) | PASS | blocked: The contract function "swap" reverted with the following signature:
0x90bfb865

Unable to decode signature "0x90bfb865"  | - |
| FRONTEND | Generate frontend live config | PASS | /live-exercise now targets the fresh mUSD/mTBILL permit pool | - |

## Frontend Usage

- Visit `/live-exercise`
- Connect a wallet that already has an active session
- The page signs a real `SwapPermit` in-browser and calls `SimpleSwapRouter.swap()`

## Notes

- The zk-proof path currently uses the fixed demo Merkle proof input bundled in `packages/circuits/test-data/test-input.json`
- Additional blue wallets were activated directly by the verifier wallet for multi-wallet exercise coverage
