/**
 * Example 5: ZK Proof Generation
 * 展示如何生成 ZK 证明并提交到 ILAL API 激活 Session
 *
 * 运行:
 *   PRIVATE_KEY=0x... ILAL_API_KEY=ilal_live_... npx tsx packages/sdk/examples/05-zk-proof.ts
 *
 * 前提:
 *   - 已完成机构 Onboarding (POST /api/v1/onboarding/register)
 *   - ZK 电路文件存在于 packages/circuits/build/ 和 packages/circuits/keys/
 */

import { ILALClient } from '@ilal/sdk';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY  = process.env.PRIVATE_KEY as Hex;
const API_KEY      = process.env.ILAL_API_KEY || '';
const API_URL      = process.env.ILAL_API_URL || 'https://ilal-mvp-production.up.railway.app';

if (!PRIVATE_KEY) { console.error('❌ Set PRIVATE_KEY env var'); process.exit(1); }

const account      = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
const client = new ILALClient({
  walletClient,
  publicClient,
  chainId: 84532,
  zkConfig: {
    wasmPath: path.join(__dirname, '../../packages/circuits/build/compliance_js/compliance.wasm'),
    zkeyPath: path.join(__dirname, '../../packages/circuits/keys/compliance.zkey'),
  },
});
if (API_KEY) client.session.configureApi({ apiBaseUrl: API_URL, apiKey: API_KEY });

async function zkProofExample() {
  const userAddress = client.getUserAddress()!;

  // 1. 生成证明（带进度回调）
  console.log('Generating ZK proof...');
  
  const result = await client.zkproof.generate(
    userAddress,
    (progress, message) => {
      console.log(`[${progress}%] ${message}`);
    }
  );

  console.log('Proof generated!');
  console.log('Elapsed time:', result.elapsedTime, 'ms');

  // 2. 格式化证明为合约参数
  const formatted = client.zkproof.formatForContract(
    result.proof,
    result.publicSignals
  );

  console.log('Proof bytes:', formatted.proofBytes.slice(0, 20) + '...');
  console.log('Public inputs:', formatted.publicInputs);

  // 3. 本地验证证明（可选）
  const isValid = await client.zkproof.verify(
    result.proof,
    result.publicSignals
  );
  console.log('Proof valid:', isValid);

  // 4. 使用证明调用合约
  // const tx = await someContract.verifyAndExecute(
  //   formatted.proofBytes,
  //   formatted.publicInputs
  // );
}

// 浏览器环境：从 CDN 加载 ZK 文件
function browserExample() {
  const client = ILALClient.fromProvider({
    provider: window.ethereum,
    chainId: 84532,
    zkConfig: {
      wasmUrl: 'https://cdn.ilal.tech/circuits/compliance.wasm',
      zkeyUrl: 'https://cdn.ilal.tech/circuits/compliance_final.zkey',
    },
  });

  return client.zkproof.generate('0x...');
}

// Node.js 环境：从本地文件加载
function nodeExample() {
  const client = ILALClient.fromRPC({
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    chainId: 84532,
    zkConfig: {
      wasmUrl: './circuits/compliance.wasm',
      zkeyUrl: './circuits/compliance_final.zkey',
    },
  });

  return client.zkproof.generate('0x...');
}

zkProofExample().catch(console.error);
