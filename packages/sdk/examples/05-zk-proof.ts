/**
 * Example 5: ZK Proof Generation
 * 展示如何生成和验证 ZK 证明
 */

import { ILALClient } from '@ilal/sdk';

declare const client: ILALClient;

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
      wasmUrl: 'https://cdn.ilal.xyz/circuits/compliance.wasm',
      zkeyUrl: 'https://cdn.ilal.xyz/circuits/compliance_final.zkey',
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
