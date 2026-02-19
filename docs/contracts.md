# Contract addresses and chain config

This doc is the **single source** for contract addresses and recommended RPC URLs per chain. Scripts and frontends should use this or the SDK’s `getChainConfig(chainId)` / `getContractAddresses(chainId)`.

## Base Sepolia (testnet)

| Config | Value |
|--------|--------|
| Chain ID | 84532 |
| Recommended RPC | `https://base-sepolia-rpc.publicnode.com` |

### Contract addresses

| Contract | Address |
|----------|---------|
| Registry | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SessionManager | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| ComplianceHook | `0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80` |
| SimpleSwapRouter | `0xfBfc94f61b009C1DD39dB88A3b781199973E2e44` |
| PositionManager | `0x5b460c8Bd32951183a721bdaa3043495D8861f31` |
| Verifier | `0x0cDcD82E5efba9De4aCc255402968397F323AFBB` |
| PlonkVerifier | `0x2645C48A7DB734C9179A195C51Ea5F022B86261f` |
| PoolManager | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |

### Common tokens (Base Sepolia)

| Symbol | Address |
|--------|---------|
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| WETH | `0x4200000000000000000000000000000000000006` |

## Base Mainnet

| Config | Value |
|--------|--------|
| Chain ID | 8453 |
| Recommended RPC | `https://mainnet.base.org` |

Mainnet contracts are not deployed yet. The SDK’s `getContractAddresses(8453)` returns placeholder zero addresses. This doc will be updated when they are deployed.

---

## Using in code

### With the SDK

```typescript
import { getChainConfig, getContractAddresses } from '@ilal/sdk';

// Full chain config (addresses + recommended RPC)
const config = getChainConfig(84532);
if (config) {
  console.log(config.addresses.sessionManager, config.rpcUrl);
}

// Addresses only
const addresses = getContractAddresses(84532);
```

### Without the SDK

Copy the constants for the chain from this doc or from `packages/sdk/src/constants/addresses.ts`. Use the recommended RPC URLs above or your own node.
