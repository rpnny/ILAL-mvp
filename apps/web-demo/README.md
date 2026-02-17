# ILAL Web Demo

> SDK Reference Implementation - Demonstrates how to use @ilal/sdk

## 🎯 Purpose

This frontend application is the **ILAL SDK reference implementation**, designed for:

- ✅ Demonstrating SDK usage patterns
- ✅ Quick testing and debugging
- ✅ Developer reference

**⚠️ Note**: This is not a production-grade frontend — it's an example and testing tool for the SDK.

## 🚀 Quick Start

### Development in Monorepo (Recommended)

```bash
# Install dependencies from root
npm install

# Start SDK + Demo in parallel (hot reload)
npm run dev

# Or start Demo standalone
cd apps/web-demo
npm run dev
```

### Standalone Development

```bash
cd apps/web-demo
npm install
npm run dev
```

Visit: http://localhost:3000

## 📦 Using the SDK

### Basic Setup

```typescript
'use client';

import { ILALClient } from '@ilal/sdk';
import { useWalletClient, usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';

export default function Page() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [client, setClient] = useState<ILALClient | null>(null);

  useEffect(() => {
    if (walletClient && publicClient) {
      const ilalClient = new ILALClient({
        walletClient,
        publicClient,
        chainId: 84532,
      });
      setClient(ilalClient);
    }
  }, [walletClient, publicClient]);

  return <div>ILAL Demo</div>;
}
```

### Session Management

```typescript
// Activate session
const handleActivateSession = async () => {
  if (!client) return;
  const hash = await client.session.activate();
  console.log('Session activated:', hash);
};

// Check status
const info = await client.session.getInfo();
console.log('Session active:', info.isActive);
```

### Execute Swap

```typescript
import { parseUnits } from 'viem';
import { BASE_SEPOLIA_TOKENS } from '@ilal/sdk';

const handleSwap = async () => {
  if (!client) return;
  
  const result = await client.swap.execute({
    tokenIn: BASE_SEPOLIA_TOKENS.USDC,
    tokenOut: BASE_SEPOLIA_TOKENS.WETH,
    amountIn: parseUnits('100', 6),
    slippageTolerance: 0.5,
  });
  
  console.log('Swap successful:', result.hash);
};
```

## 🏗️ Project Structure

```
apps/web-demo/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   └── layout.tsx         # Layout
├── components/            # UI components
├── lib/                   # Utilities
│   ├── wagmi.ts          # Wagmi config
│   ├── cache.ts          # Cache utilities
│   ├── demo-mode.ts      # Demo mode
│   └── performance.ts    # Performance monitoring
└── public/               # Static assets
```

**Removed files** (now using SDK):
- ~~`lib/contracts.ts`~~ → Use `@ilal/sdk`'s `getContractAddresses()`
- ~~`lib/eas.ts`~~ → Use `client.eas`
- ~~`lib/eip712-signing.ts`~~ → Use SDK's `eip712` utilities
- ~~`lib/zkProof.ts`~~ → Use `client.zkproof`

## 📚 SDK Documentation

Full SDK docs: [`../../packages/sdk/README.md`](../../packages/sdk/README.md)

## 🔗 Related Links

- **SDK Documentation**: [packages/sdk/README.md](../../packages/sdk/README.md)
- **SDK Examples**: [packages/sdk/examples/](../../packages/sdk/examples/)
- **Monorepo Root**: [../../README.md](../../README.md)

---

**Made with ❤️ using @ilal/sdk**
