# ILAL SaaS Quick Start

This guide helps you get started with ILAL SaaS in 5 minutes.

## Step 1: Register an Account

### Option A: Register via API

```bash
curl -X POST https://api.ilal.xyz/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@example.com",
    "password": "SecureP@ssw0rd",
    "name": "Your Name"
  }'
```

**Response**:
```json
{
  "user": { "id": "clx123", "email": "your@example.com", ... },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

Save the `accessToken` for the next step.

### Option B: Register via Dashboard

Visit `https://dashboard.ilal.xyz` to register (coming soon).

## Step 2: Create an API Key

Using the `accessToken` from the previous step:

```bash
curl -X POST https://api.ilal.xyz/api/v1/apikeys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My First Key",
    "permissions": ["verify", "session"]
  }'
```

**Response**:
```json
{
  "apiKey": "ilal_live_1234567890abcdef1234567890abcdef12345678",
  "id": "cly456",
  "name": "My First Key",
  "warning": "Please save this API key securely. It will not be shown again."
}
```

⚠️ **Important**: Save the `apiKey`—it is shown only once!

## Step 3: Install the SDK

```bash
npm install @ilal/sdk
# or
yarn add @ilal/sdk
# or
pnpm add @ilal/sdk
```

## Step 4: Use the SDK

Create `test.ts`:

```typescript
import { ILALApiClient } from '@ilal/sdk';

const client = new ILALApiClient({
  apiKey: 'ilal_live_xxxxxxxxxxxxx', // Your API Key
  apiBaseUrl: 'https://api.ilal.xyz',
  chainId: 8453, // Base Mainnet
});

async function main() {
  // 1. Health check
  const health = await client.healthCheck();
  console.log('✅ API Service:', health.status);

  // 2. Query Session status
  const userAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const status = await client.getSessionStatus(userAddress);
  
  console.log('📊 Session Status:', {
    isActive: status.isActive,
    remainingSeconds: status.remainingSeconds,
  });

  // 3. Verify ZK Proof and activate Session
  // (Proof generation required first—see full documentation)
  /*
  const result = await client.verifyAndActivate({
    userAddress,
    proof: '0x...',
    publicInputs: ['123', '456'],
  });
  
  console.log('🎉 Session Activated:', result.txHash);
  */
}

main().catch(console.error);
```

Run:

```bash
npx tsx test.ts
```

## Step 5: View Usage Statistics

```bash
curl https://api.ilal.xyz/api/v1/usage/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response**:
```json
{
  "usage": {
    "totalCalls": 3,
    "successfulCalls": 3,
    "failedCalls": 0
  },
  "quota": {
    "limit": 100,
    "remaining": 97,
    "resetDate": "2024-03-01T00:00:00Z"
  },
  "plan": {
    "current": "FREE"
  }
}
```

## Complete Example: From EAS Verification to Session Activation

```typescript
import { ILALApiClient } from '@ilal/sdk';

const client = new ILALApiClient({
  apiKey: process.env.ILAL_API_KEY!,
  apiBaseUrl: 'https://api.ilal.xyz',
  chainId: 8453,
  // Provide config if ZK Proof generation is needed
  zkConfig: {
    wasmPath: './circuits/compliance.wasm',
    zkeyPath: './circuits/compliance_final.zkey',
  },
});

async function completeFlow() {
  const userAddress = '0x...';

  // 1. Prepare EAS attestation data (fetch from chain)
  const attestationData = {
    schema: 123456789012345678n,
    attester: 987654321098765432n,
    recipient: 111111111111111111n,
    time: BigInt(Math.floor(Date.now() / 1000)),
    expirationTime: 999999999999999999n,
    revocationTime: 0n,
    refUID: 0n,
    data: 555555555555555555n,
  };

  // 2. Generate ZK Proof and verify/activate via API
  const result = await client.generateAndActivate({
    userAddress,
    attestationData,
  });

  console.log('✅ Success!', {
    txHash: result.txHash,
    sessionExpiry: result.sessionExpiry,
    gasUsed: result.gasUsed,
  });

  // 3. Confirm Session is active
  const status = await client.getSessionStatus(userAddress);
  console.log('📊 Session Active:', status.isActive);
}

completeFlow().catch(console.error);
```

## Plan Upgrade

When the free tier (100 calls/month) is insufficient, upgrade to Pro:

```bash
curl -X POST https://api.ilal.xyz/api/v1/billing/upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"targetPlan": "PRO"}'
```

**Pro Plan**:
- 10,000 calls/month
- 100 req/min rate limit
- Email technical support
- $99/month

## Environment Variable Configuration

Create `.env`:

```bash
# API
ILAL_API_KEY=ilal_live_xxxxxxxxxxxxx
ILAL_API_URL=https://api.ilal.xyz

# JWT (if managing API Keys)
ILAL_ACCESS_TOKEN=eyJhbGciOi...
```

Use in code:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const client = new ILALApiClient({
  apiKey: process.env.ILAL_API_KEY!,
  apiBaseUrl: process.env.ILAL_API_URL!,
  chainId: 8453,
});
```

## Error Handling

```typescript
try {
  await client.verifyAndActivate({ ... });
} catch (error) {
  if (error.message.includes('Payment Required')) {
    console.error('❌ Quota exceeded. Please upgrade your plan.');
  } else if (error.message.includes('Too Many Requests')) {
    console.error('❌ Too many requests. Please try again later.');
  } else if (error.message.includes('Invalid proof')) {
    console.error('❌ ZK Proof verification failed');
  } else {
    console.error('❌ Unknown error:', error.message);
  }
}
```

## Monitoring and Debugging

### 1. Check API Health

```typescript
const health = await client.healthCheck();
console.log(health);
// {
//   status: 'ok',
//   service: 'ILAL API',
//   relay: '0x...',
//   network: 'base-mainnet',
//   latestBlock: '12345678'
// }
```

### 2. View Usage Statistics

Monitor in real time via Dashboard or API:
- Total call count
- Success/failure ratio
- Quota usage
- Endpoint call distribution

### 3. API Logs

All API requests return standard headers:

```
RateLimit-Remaining: 95
X-Quota-Remaining: 9950
X-Response-Time: 234ms
```

## Advanced Usage

### Direct On-Chain Mode (No API Key)

For fully decentralized usage, use the traditional `ILALClient`:

```typescript
import { ILALClient } from '@ilal/sdk';

const client = await ILALClient.fromRPC({
  rpcUrl: 'https://base.llamarpc.com',
  chainId: 8453,
  privateKey: process.env.PRIVATE_KEY,
});

// Direct on-chain; you pay gas
await client.session.activate();
```

### Hybrid Mode

Use API Key mode for production and direct on-chain for testing:

```typescript
const client = process.env.NODE_ENV === 'production'
  ? new ILALApiClient({ apiKey: process.env.ILAL_API_KEY!, ... })
  : await ILALClient.fromRPC({ rpcUrl: process.env.RPC_URL!, ... });
```

## FAQ

**Q: How do I get a testnet API Key?**  
A: The testnet (Base Sepolia) uses the same API. Specify `chainId: 84532` when creating the client.

**Q: Can API Keys be shared?**  
A: Not recommended. Each app/environment should use a separate API Key for tracking and revocation.

**Q: Is the free tier sufficient?**  
A: The free tier (100 calls/month) is suitable for development and small-scale apps. Production use is recommended on the Pro plan.

**Q: How do I get technical support?**  
A: 
- Community (Discord): https://discord.gg/ilal
- Documentation: https://docs.ilal.xyz
- Email (Pro+): 2867755637@qq.com

## Next Steps

- 📖 Read the full API docs: `apps/api/docs/API.md`
- 🏗️ Learn about the SaaS architecture: `docs/guides/saas/SAAS_ARCHITECTURE.md`
- 🔧 See the SDK docs: `packages/sdk/README.md`
- 💬 Join the [Discord community](https://discord.gg/ilal)

---

**Happy building compliant DeFi applications!**
