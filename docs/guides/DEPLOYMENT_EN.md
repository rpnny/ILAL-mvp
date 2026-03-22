# ILAL Deployment Guide

## Prerequisites

- Foundry (`forge`, `cast`)
- Node.js >= 18, pnpm
- Base Sepolia ETH (for gas)

## Environment Setup

```bash
# Root .env
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC=https://sepolia.base.org
GOVERNANCE_MULTISIG=0x...

# packages/contracts/.env
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
POOL_MANAGER_ADDRESS=0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408
BASESCAN_API_KEY=...

# apps/api/.env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=...
JWT_REFRESH_SECRET=...
VERIFIER_PRIVATE_KEY=0x...
```

## Contract Deployment

### 1. Build and Test

```bash
cd packages/contracts
forge build
forge test -v  # 136/136 should pass
```

### 2. Deploy Core Contracts

Registry and SessionManager are UUPS proxies:

```bash
source .env
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast -vvv
```

### 3. Deploy ComplianceHook (CREATE2)

The Hook address must satisfy Uniswap v4's bitmask requirement (`0x0A80`). Use the factory-based deployment:

```bash
forge script script/DeployHookV2.s.sol:DeployHookV2 \
  --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast -vvv
```

This script:
1. Deploys a HookFactory contract
2. Mines a salt that produces a valid Hook address
3. Deploys ComplianceHook via CREATE2
4. Deploys VerifiedPoolsPositionManager

### 4. Deploy SimpleSwapRouter

```bash
forge script script/RedeploySimpleSwapRouter.s.sol:RedeploySimpleSwapRouter \
  --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast -vvv
```

### 5. Initialize Pool

```bash
forge script script/InitializePool500.s.sol:InitializePool500 \
  --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast -vvv
```

### 6. Add Liquidity

```bash
forge script script/AddLiquidity.s.sol:AddLiquidity \
  --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast -vvv
```

## Current Deployment (Base Sepolia)

| Contract | Address |
|----------|---------|
| Registry (proxy) | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SessionManager (proxy) | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| ComplianceHook | `0xe633220f15932428FcA60A1A2C2C48797A180A80` |
| SimpleSwapRouter | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` |
| PositionManager | `0x692548a6E1797d2762b9d04f29112C172E5Cea32` |
| PlonkVerifier | `0x2645C48A7DB734C9179A195C51Ea5F022B86261f` |
| PlonkVerifierAdapter | `0x0cDcD82E5efba9De4aCc255402968397F323AFBB` |
| PoolManager (Uniswap) | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |

Pool: USDC/WETH, fee=500, tickSpacing=10, initialTick=196250

## API Setup

```bash
cd apps/api
cp .env.example .env  # fill in values
npx prisma db push
npm run dev
```

## Verification

```bash
# Run fork tests against live deployment
cd packages/contracts
forge test --match-contract ForkSwapTest -vv

# Run ZK benchmark
cd packages/circuits
node scripts/benchmark-zk.js
```

## Contact

2867755637@qq.com
