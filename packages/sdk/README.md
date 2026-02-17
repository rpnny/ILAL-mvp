# @ilal/sdk

> Official TypeScript SDK for ILAL Protocol - Compliant DeFi Infrastructure

[![npm version](https://img.shields.io/npm/v/@ilal/sdk.svg)](https://www.npmjs.com/package/@ilal/sdk)
[![License](https://img.shields.io/npm/l/@ilal/sdk.svg)](https://github.com/your-org/ilal/blob/main/LICENSE)

## Features

- ✅ **Session Management** - Compliance session activation and management
- 🔄 **Token Swaps** - Secure token exchange functionality
- 💧 **Liquidity Management** - Add/remove liquidity positions
- 🔐 **ZK Proof Generation** - Zero-knowledge proof compliance verification
- 🎫 **EAS Verification** - Ethereum Attestation Service integration
- 🌐 **Cross-Environment** - Works in both browser and Node.js
- 📦 **Tree-shakable** - Only bundle the code you use
- 🔧 **Full Type Support** - 100% TypeScript

## Installation

```bash
npm install @ilal/sdk viem
```

Or using pnpm:

```bash
pnpm add @ilal/sdk viem
```

## Quick Start

### Basic Setup

```typescript
import { ILALClient } from '@ilal/sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Create clients
const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

// Initialize ILAL client
const client = new ILALClient({
  walletClient,
  publicClient,
  chainId: 84532,
});
```

### Initialize from Browser Provider

```typescript
// Using MetaMask or other EIP-1193 providers
const client = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});
```

### Session Management

```typescript
// Activate session
await client.session.activate({ expiry: 24 * 3600 });

// Check status
const isActive = await client.session.isActive();
const info = await client.session.getInfo();

console.log(`Session active: ${info.isActive}`);
console.log(`Remaining: ${Number(info.remainingTime) / 3600}h`);
```

### Execute Swap

```typescript
import { parseUnits } from 'viem';
import { BASE_SEPOLIA_TOKENS } from '@ilal/sdk';

const result = await client.swap.execute({
  tokenIn: BASE_SEPOLIA_TOKENS.USDC,
  tokenOut: BASE_SEPOLIA_TOKENS.WETH,
  amountIn: parseUnits('100', 6), // 100 USDC
  slippageTolerance: 0.5, // 0.5%
});

console.log('Swap successful:', result.hash);
```

### Add Liquidity

```typescript
import { parseEther, parseUnits } from 'viem';

const result = await client.liquidity.add({
  poolKey: {
    currency0: BASE_SEPOLIA_TOKENS.USDC,
    currency1: BASE_SEPOLIA_TOKENS.WETH,
    fee: 500,
    tickSpacing: 10,
    hooks: client.addresses.complianceHook,
  },
  tickLower: 190700,
  tickUpper: 196250,
  amount0Desired: parseUnits('100', 6),
  amount1Desired: parseEther('0.05'),
});

console.log('Liquidity added, Token ID:', result.tokenId);
```

### Generate ZK Proof

```typescript
const client = new ILALClient({
  // ... base config
  zkConfig: {
    wasmUrl: 'https://cdn.ilal.xyz/circuits/compliance.wasm',
    zkeyUrl: 'https://cdn.ilal.xyz/circuits/compliance_final.zkey',
  },
});

const proof = await client.zkproof.generate(
  userAddress,
  (progress, message) => {
    console.log(`[${progress}%] ${message}`);
  }
);

console.log('Proof generated in', proof.elapsedTime, 'ms');
```

### EAS Verification

```typescript
const verification = await client.eas.getVerification(userAddress);

if (verification.isVerified) {
  console.log('✅ User is verified');
  console.log('Attestation:', verification.attestationId);
} else {
  console.log('❌ Verification required');
}
```

## Core API

### ILALClient

Main client class providing access to all modules.

**Constructors**:
- `new ILALClient(config: ILALConfig)`
- `ILALClient.fromProvider(params)`
- `ILALClient.fromRPC(params)`

**Modules**:
- `client.session` - Session management
- `client.swap` - Token swaps
- `client.liquidity` - Liquidity management
- `client.zkproof` - ZK Proof generation
- `client.eas` - EAS verification

### SessionModule

```typescript
// Activate session
await client.session.activate({ expiry?: number })

// Query status
await client.session.isActive(user?: Address): Promise<boolean>
await client.session.getInfo(user?: Address): Promise<SessionInfo>
await client.session.getRemainingTime(user?: Address): Promise<bigint>

// Smart activation
await client.session.activateIfNeeded(params?)
await client.session.ensureActive(user?)
```

### SwapModule

```typescript
// Execute swap
await client.swap.execute(params: SwapParams): Promise<SwapResult>

// Estimate output
await client.swap.estimateOutput(params: SwapParams): Promise<bigint>

// Query balance and info
await client.swap.getBalance(token: Address): Promise<bigint>
await client.swap.getTokenInfo(token: Address)
```

### LiquidityModule

```typescript
// Add liquidity
await client.liquidity.add(params: LiquidityParams): Promise<LiquidityResult>

// Remove liquidity
await client.liquidity.remove(params: RemoveLiquidityParams): Promise<LiquidityResult>

// Query positions
await client.liquidity.getPosition(tokenId: bigint): Promise<LiquidityPosition | null>
await client.liquidity.getUserPositions(user?: Address): Promise<LiquidityPosition[]>
```

### ZKProofModule

```typescript
// Generate proof
await client.zkproof.generate(
  userAddress: string,
  onProgress?: ProofProgressCallback
): Promise<ProofResult>

// Verify proof
await client.zkproof.verify(proof: any, publicSignals: string[]): Promise<boolean>

// Format for contract call
client.zkproof.formatForContract(proof, publicSignals)
```

### EASModule

```typescript
// Check verification status
await client.eas.checkCoinbaseVerification(user: Address): Promise<VerificationResult>
await client.eas.checkAllProviders(user: Address): Promise<VerificationResult>

// Convenience methods
await client.eas.getVerification(user: Address)
await client.eas.ensureVerified(user: Address)

// Register custom provider
client.eas.registerProvider(config: KYCProviderConfig)
```

## ZK Proof Configuration

The SDK does not bundle WASM files (too large, 50-100MB). Instead, you specify the file locations.

### Browser (from CDN)

```typescript
const client = new ILALClient({
  // ... other config
  zkConfig: {
    wasmUrl: 'https://cdn.ilal.xyz/circuits/compliance.wasm',
    zkeyUrl: 'https://cdn.ilal.xyz/circuits/compliance_final.zkey',
  },
});
```

### Node.js (Local files)

```typescript
const client = new ILALClient({
  // ... other config
  zkConfig: {
    wasmUrl: './circuits/compliance.wasm',
    zkeyUrl: './circuits/compliance_final.zkey',
  },
});
```

### Using Buffer (Advanced)

```typescript
import fs from 'fs';

const client = new ILALClient({
  zkConfig: {
    wasmUrl: fs.readFileSync('./compliance.wasm'),
    zkeyUrl: fs.readFileSync('./compliance_final.zkey'),
  },
});
```

## Error Handling

The SDK provides detailed error types:

```typescript
import {
  ILALError,
  SessionExpiredError,
  InsufficientLiquidityError,
  SlippageExceededError,
  VerificationFailedError,
} from '@ilal/sdk';

try {
  await client.swap.execute({ ... });
} catch (error) {
  if (error instanceof SessionExpiredError) {
    console.error('Session expired, please activate');
  } else if (error instanceof InsufficientLiquidityError) {
    console.error('Not enough liquidity in pool');
  } else if (error instanceof SlippageExceededError) {
    console.error('Price moved too much');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Examples

See the [`examples/`](./examples/) directory for complete examples:

- [01-basic-setup.ts](./examples/01-basic-setup.ts) - Client initialization
- [02-session-management.ts](./examples/02-session-management.ts) - Session management
- [03-basic-swap.ts](./examples/03-basic-swap.ts) - Basic swap
- [04-add-liquidity.ts](./examples/04-add-liquidity.ts) - Add liquidity
- [05-zk-proof.ts](./examples/05-zk-proof.ts) - ZK Proof generation
- [06-eas-verification.ts](./examples/06-eas-verification.ts) - EAS verification

## Chain Support

| Network | Chain ID | Status |
|---------|----------|--------|
| Base Sepolia | 84532 | ✅ Deployed |
| Base Mainnet | 8453 | 🚧 Coming soon |

## Dependencies

Core dependencies:
- `viem` - Ethereum interaction library

Optional dependencies (ZK features only):
- `circomlibjs` - Poseidon hash
- `snarkjs` - ZK proof generation

## License

Apache-2.0

## Resources

- [Documentation](../docs/) - Full technical documentation
- [Examples](./examples/) - Code examples
- [GitHub](https://github.com/your-org/ilal) - Source code
- [Discord](https://discord.gg/ilal) - Community support

## Support

Having issues?
- Check the [example code](./examples/)
- Submit an [Issue](https://github.com/your-org/ilal/issues)
- Join the [Discord](https://discord.gg/ilal) community

---

Made with ❤️ by the ILAL Team
