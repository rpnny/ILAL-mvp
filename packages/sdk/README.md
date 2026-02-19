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

**Recommended**: Once published to npm, install with:

```bash
npm install @ilal/sdk viem
# or
pnpm add @ilal/sdk viem
```

> **About Git dependencies**: Using `"@ilal/sdk": "github:xxx/ILAL-mvp#main"` installs the whole repo root; **you cannot install only the `packages/sdk` subpackage**. Use the **npm package** (after publish) or **local `file:`** install instead.

### Using the SDK in an external project (before npm publish)

If `@ilal/sdk` is not yet published to npm, you can install it from a local path:

1. **Clone the repo** (if needed):
   ```bash
   git clone https://github.com/your-org/ilal.git
   cd ilal
   ```

2. **Build the SDK from the monorepo root**:
   ```bash
   pnpm install
   pnpm build
   # or build only the SDK: cd packages/sdk && pnpm build
   ```

3. **Add the SDK via `file:` in your project** (adjust the path to your machine):
   ```bash
   pnpm add file:../ilal/packages/sdk
   # or absolute path example:
   pnpm add file:/Users/you/ilal/packages/sdk
   ```
   Then use `import { ILALClient } from '@ilal/sdk'` as usual.

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

### Session Management (compliance)

Swap and liquidity operations **require an active session first**. This is ILAL’s compliance design: the session is recorded on-chain with user authorization and expiry; the ComplianceHook checks that the current tx is within a valid session.

- **Why activate first**: The contracts only allow swap/add-liquidity inside an active, non-expired session. Without it you get `SESSION_EXPIRED`.
- **Expiry and refresh**: Default duration is 24 hours (`expiry` in seconds). After expiry, call `client.session.activate({ expiry })` again. You can use `client.session.activateIfNeeded()` or `client.session.ensureActive()` before critical operations.

```typescript
// Activate session (required before swap/liquidity)
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

// Ensure session is active first (see Session Management above)
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

// Ensure session is active first (see Session Management above)
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

All errors extend `ILALError` and include a `code` field for branching. Below is the full list of codes, when they occur, and suggested handling.

| Code | Meaning | When it happens | Suggested handling |
|------|--------|------------------|---------------------|
| `SESSION_EXPIRED` | Session expired or not active | Swap/liquidity without `session.activate()` or after expiry | Ask user to reactivate or call `session.activateIfNeeded()` |
| `SESSION_NOT_FOUND` | Session not found | Querying session that does not exist | Guide user to activate session first |
| `INSUFFICIENT_LIQUIDITY` | Insufficient pool liquidity | Swap amount exceeds available liquidity | Ask user to reduce amount, use another pool, or retry later |
| `SLIPPAGE_EXCEEDED` | Slippage tolerance exceeded | Execution price outside `slippageTolerance` | Ask user to increase slippage or retry; retry or reduce amount |
| `INVALID_POOL` | Invalid or uninitialized pool | Pool not initialized or bad params | Check poolKey and chain/contract config |
| `UNAUTHORIZED` | Unauthorized | Permission/compliance check failed | Check session and KYC/compliance status |
| `ROUTER_NOT_APPROVED` | Router not approved | Token approval for router missing | Guide user to approve router |
| `VERIFICATION_FAILED` | Verification failed | EAS/KYC verification not passed | Guide user to complete verification |
| `INVALID_PROOF` | Invalid ZK proof | Proof verification failed | Regenerate proof or check circuit/inputs |
| `INVALID_CONFIG` | Invalid config | Wrong SDK/chain/contract config | Check chainId, contract addresses, RPC |
| `CONTRACT_NOT_DEPLOYED` | Contract not deployed | No contract on current chain | Switch chain or wait for deployment |
| `TRANSACTION_FAILED` | Transaction failed | On-chain tx reverted | Use revert message to inform user or retry |
| `GAS_ESTIMATION_FAILED` | Gas estimation failed | Tx would revert so estimation fails | Same as TRANSACTION_FAILED; check params and state |

**Example: catch by type**:

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
  } else if (error instanceof ILALError) {
    console.error('ILAL error:', error.code, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

**Example: branch by code** (for unified user messages):

```typescript
if (error instanceof ILALError) {
  switch (error.code) {
    case 'SESSION_EXPIRED':
    case 'SESSION_NOT_FOUND':
      showMessage('Please activate session first');
      break;
    case 'SLIPPAGE_EXCEEDED':
      showMessage('Price moved; try higher slippage or retry');
      break;
    case 'INSUFFICIENT_LIQUIDITY':
      showMessage('Insufficient liquidity; reduce amount');
      break;
    default:
      showMessage(error.message);
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

Contract addresses and recommended RPC per chain are maintained in [docs/contracts.md](../docs/contracts.md). In code, use `getChainConfig(chainId)` or `getContractAddresses(chainId)`.

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
