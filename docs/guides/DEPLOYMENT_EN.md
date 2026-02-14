# ILAL Deployment Guide

## Overview

This document describes how to deploy ILAL (Institutional Liquidity Access Layer) to the Base network.

## Prerequisites

### 1. Environment Setup

```bash
# Install dependencies
cd contracts && forge install
cd ../frontend && npm install
cd ../subgraph && npm install
cd ../bot && npm install
```

### 2. Environment Variables

Create `.env` file:

```bash
# Deployer private key
PRIVATE_KEY=0x...

# RPC URLs
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# Governance multisig address
GOVERNANCE_ADDRESS=0x...

# Verifier contract address (PLONK Verifier)
VERIFIER_ADDRESS=0x...

# Etherscan API Key (for contract verification)
BASESCAN_API_KEY=...
```

## Base Sepolia Testnet Deployment

### 1. Deploy Contracts

```bash
cd contracts

# Deploy all contracts
forge script script/DeployPlonk.s.sol:DeployPlonk \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify \
  -vvvv
```

### 2. Record Deployment Addresses

After deployment, record the following addresses:
- Registry
- SessionManager
- ComplianceHook
- PositionManager
- Verifier

### 3. Configure Backend

Update addresses in `frontend/lib/contracts.ts`:

```typescript
const ADDRESSES: Record<number, ContractAddresses> = {
  84532: { // Base Sepolia
    registry: '0x...',
    sessionManager: '0x...',
    complianceHook: '0x...',
    positionManager: '0x...',
    verifier: '0x...',
  },
};
```

### 4. Deploy Subgraph

```bash
cd subgraph

# Update configuration
vim config/base-sepolia.json

# Prepare and deploy
npm run prepare:base-sepolia
npm run codegen
npm run build
npm run deploy
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

## Base Mainnet Deployment

### 1. Security Checklist

- [ ] All tests passing
- [ ] Audit completed
- [ ] Multisig wallet configured
- [ ] Emergency pause mechanism tested
- [ ] Gas estimation completed

### 2. Deploy Contracts

```bash
cd contracts

# Use Mainnet deployment script
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --verify \
  -vvvv
```

### 3. Post-Deployment Configuration

Execute the following operations using multisig:

```solidity
// 1. Grant Verifier role
sessionManager.grantRole(VERIFIER_ROLE, verifierAddress);

// 2. Register Issuer
registry.registerIssuer(
  keccak256("Coinbase"),
  coinbaseAttesterAddress,
  verifierAddress
);

// 3. Approve Router
registry.approveRouter(uniswapRouterAddress, true);
```

### 4. Update Configuration

1. Update `frontend/lib/contracts.ts` with Mainnet addresses
2. Update `subgraph/config/base-mainnet.json`
3. Update `bot/config.yaml`

### 5. Deploy Subgraph

```bash
cd subgraph
npm run prepare:base-mainnet
npm run codegen
npm run build
npm run deploy
```

## Monitoring and Maintenance

### Health Checks

- Regularly check Session status
- Monitor gas prices
- Check contract balances

### Emergency Response

If security issues are discovered:

```solidity
// Pause the system
registry.setEmergencyPause(true);
```

### Upgrade Process

1. Deploy new implementation contract
2. Submit upgrade proposal through multisig
3. Wait for timelock
4. Execute upgrade

```solidity
// Upgrade Registry
registry.upgradeToAndCall(newImplementation, "");

// Upgrade SessionManager
sessionManager.upgradeToAndCall(newImplementation, "");
```

## Contract Addresses

### Base Sepolia (Testnet)

| Contract | Address |
|---------|---------|
| Registry | `0x461e57114c2DeE76dEC717eD8B2f4fBe62AB5Faf` |
| SessionManager | `0xaa66F34d10F60C2E8E63cA8DD6E1CAc7D2c406e9` |
| ComplianceHook | `0x00000000DA15E8FCA4dFf7aF93aBa7030000002c` |
| PositionManager | `TBD` |
| Verifier | `0x3Aa3f5766bfa2010070D93a27edA14A2ed38e3cC` |

### Base Mainnet

| Contract | Address |
|---------|---------|
| Registry | `To be deployed` |
| SessionManager | `To be deployed` |
| ComplianceHook | `To be deployed` |
| PositionManager | `To be deployed` |
| Verifier | `To be deployed` |

## External Dependencies

### Uniswap v4 PoolManager

| Network | Address |
|---------|---------|
| Base Sepolia | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |
| Base Mainnet | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |

## Troubleshooting

### Common Issues

1. **Transaction fails: Session not active**
   - Ensure user has completed verification
   - Check if Session has expired

2. **Transaction fails: Unauthorized Router**
   - Ensure Router is approved in Registry

3. **Deployment fails: Insufficient gas**
   - Increase gas limit
   - Check account balance

### Contact

- Technical Support: 2867755637@qq.com
- Security Issues: 2867755637@qq.com
