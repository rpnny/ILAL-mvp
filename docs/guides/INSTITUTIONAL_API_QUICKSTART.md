# ILAL Institutional API Quickstart

Complete guide: register, activate session, get test tokens, approve, and swap — all via API.

## Prerequisites

- Node.js 18+
- A wallet private key (for signing transactions)
- Base Sepolia ETH for gas ([Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia))

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| tUSDC | `0xa486Fb51ED09B970A23F7Fe910bc90089f78424D` |
| WETH | `0x4200000000000000000000000000000000000006` |
| SimpleSwapRouter | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` |
| ComplianceHook | `0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80` |

## API Base URL

```
https://ilal-mvp-production.up.railway.app
```

---

## Step 1: Register

```bash
curl -X POST $API/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@institution.com","password":"SecureP@ss123"}'
```

Save the `accessToken` from the response.

## Step 2: Create API Key

```bash
curl -X POST $API/api/v1/apikeys \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"integration-test","permissions":"verify,session,swap,liquidity,usage"}'
```

Save the API key (shown only once). Use it as `X-API-Key` header for all subsequent calls.

## Step 3: Activate Session

```bash
curl -X POST $API/api/v1/testnet/activate \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"<your-wallet-address>"}'
```

This auto-registers your wallet (mock KYC) and activates a 24-hour compliance session on-chain. No ZK proof needed for testnet.

## Step 4: Get Test Tokens

```bash
curl -X POST $API/api/v1/testnet/faucet \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"<your-wallet-address>"}'
```

Mints 10,000 tUSDC to your wallet. Rate limited: 1 claim per wallet per 24 hours.

## Step 5: Check Readiness

```bash
curl $API/api/v1/defi/preflight/<your-wallet-address> \
  -H "X-API-Key: <your-api-key>"
```

Verify session is active, tokens received, and RPC connected.

## Step 6: Approve Tokens

```bash
curl -X POST $API/api/v1/defi/approve \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "operation": "swap",
    "amount": "10000000000",
    "userAddress": "<your-wallet-address>"
  }'
```

Returns an unsigned `approve()` transaction. **You must sign and broadcast it** (see Step 8).

## Step 7: Build Swap Transaction

```bash
curl -X POST $API/api/v1/defi/swap \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "tokenOut": "0x4200000000000000000000000000000000000006",
    "amount": "1000000000",
    "userAddress": "<your-wallet-address>"
  }'
```

Returns an unsigned swap transaction with preflight checks.

## Step 8: Sign and Broadcast

The API returns unsigned transactions. You sign and broadcast with your own wallet:

```typescript
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const account = privateKeyToAccount('0x<YOUR_PRIVATE_KEY>');
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

// `tx` is the `transaction` object from any API response (approve, swap, liquidity)
async function signAndBroadcast(tx: { to: string; data: string; value: string; gas: string }) {
  const hash = await wallet.sendTransaction({
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: BigInt(tx.value),
    gas: BigInt(tx.gas),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Confirmed in block', receipt.blockNumber, '- tx:', hash);
  return hash;
}
```

## Complete Flow (TypeScript)

```typescript
const API = 'https://ilal-mvp-production.up.railway.app';
const API_KEY = '<your-api-key>';
const WALLET = '<your-wallet-address>';

const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };

// 1. Activate session
await fetch(`${API}/api/v1/testnet/activate`, {
  method: 'POST', headers, body: JSON.stringify({ walletAddress: WALLET }),
});

// 2. Get tUSDC
await fetch(`${API}/api/v1/testnet/faucet`, {
  method: 'POST', headers, body: JSON.stringify({ walletAddress: WALLET }),
});

// 3. Approve tUSDC for SwapRouter
const approveRes = await fetch(`${API}/api/v1/defi/approve`, {
  method: 'POST', headers,
  body: JSON.stringify({ token: '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D', operation: 'swap', amount: '10000000000', userAddress: WALLET }),
}).then(r => r.json());

await signAndBroadcast(approveRes.transaction);

// 4. Swap 1000 tUSDC -> WETH
const swapRes = await fetch(`${API}/api/v1/defi/swap`, {
  method: 'POST', headers,
  body: JSON.stringify({ tokenIn: '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D', tokenOut: '0x4200000000000000000000000000000000000006', amount: '1000000000', userAddress: WALLET }),
}).then(r => r.json());

await signAndBroadcast(swapRes.transaction);

console.log('Done! Check https://sepolia.basescan.org/address/' + WALLET);
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `SESSION_NOT_ACTIVE` (412) | No compliance session | Call `/testnet/activate` first |
| `ALLOWANCE_INSUFFICIENT` | Token not approved | Call `/defi/approve` first |
| `ERC20: insufficient balance` | Not enough tokens | Call `/testnet/faucet` first |
| `FAUCET_COOLDOWN` (429) | Already claimed today | Wait 24 hours |
| `InsufficientOutput` | Pool too shallow | Reduce swap amount |
