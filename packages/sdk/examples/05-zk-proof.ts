/**
 * Example 5: ZK Session Activation via API
 * 展示如何通过 ILAL API 激活 ZK 合规 Session
 *
 * 运行:
 *   PRIVATE_KEY=0x... ILAL_API_KEY=ilal_live_... npx tsx packages/sdk/examples/05-zk-proof.ts
 *
 * 前提: 已通过 POST /api/v1/onboarding/register 完成机构注册
 *
 * 注意: ZK 证明由 ILAL API 服务端生成 (需要 Issuer 私钥)。
 *       本地生成模式需要 packages/circuits/ 文件及 Issuer 私钥，
 *       适合自托管场景。
 */

import { ILALClient } from '@ilal/sdk';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const API_KEY     = process.env.ILAL_API_KEY as string;
const API_URL     = process.env.ILAL_API_URL || 'https://ilal-mvp-production.up.railway.app';

if (!PRIVATE_KEY) { console.error('❌ Set PRIVATE_KEY env var'); process.exit(1); }
if (!API_KEY)     { console.error('❌ Set ILAL_API_KEY env var'); process.exit(1); }

const account      = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

const client = new ILALClient({ walletClient, publicClient, chainId: 84532 });
client.session.configureApi({ apiBaseUrl: API_URL, apiKey: API_KEY });

async function zkSessionExample() {
  const userAddress = client.getUserAddress()!;
  console.log('Wallet:', userAddress);

  // 1. 检查是否已有活跃 Session
  const isActive = await client.session.isActive();
  console.log('\n1. Current session active:', isActive);

  if (isActive) {
    const remaining = Number(await client.session.getRemainingTime());
    const hours = Math.floor(remaining / 3600);
    const mins  = Math.floor((remaining % 3600) / 60);
    console.log(`   Remaining: ${hours}h ${mins}m`);
    console.log('\n✅ Session already active — no ZK proof needed');
    console.log('   You can proceed directly to swap/liquidity operations.');
    return;
  }

  // 2. Session 不存在 — 通过 API 激活 (API 服务端生成 ZK 证明)
  console.log('\n2. No active session. Activating via API (server-side ZK proof)...');
  console.log('   API URL:', API_URL);

  // POST /api/v1/onboarding/activate-session
  // The API generates the ZK proof server-side using the issuer key,
  // then submits an on-chain transaction (as relayer) to activate your session.
  const res = await fetch(`${API_URL}/api/v1/onboarding/activate-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      walletAddress: userAddress,
      expiry: 24 * 3600, // 24 hours
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API activation failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  console.log('\n✅ Session activated!');
  console.log('   TX hash:', data.txHash);
  console.log('   Explorer: https://sepolia.basescan.org/tx/' + data.txHash);
  console.log('   Expires:', new Date(data.expiresAt).toISOString());

  // 3. 验证 on-chain 状态
  const activeNow = await client.session.isActive();
  console.log('\n3. On-chain session confirmed:', activeNow);
}

zkSessionExample().catch((err) => { console.error(err); process.exit(1); });
