/**
 * ILAL ZK 证明生成库（浏览器端）
 * 使用 Web Worker 避免阻塞主线程
 */

import type { Groth16Proof } from 'snarkjs';

// ============ 类型定义 ============

export interface CircuitInput {
  userAddress: string;
  merkleRoot: string;
  issuerPubKeyHash: string;
  signature: string;
  kycStatus: string;
  countryCode: string;
  timestamp: string;
  merkleProof: string[];
  merkleIndex: string;
}

export interface ProofResult {
  proof: Groth16Proof;
  publicSignals: string[];
}

// ============ Web Worker 管理 ============

let proofWorker: Worker | null = null;

function getWorker(): Worker {
  if (!proofWorker) {
    proofWorker = new Worker('/workers/zkProof.worker.js');
  }
  return proofWorker;
}

// ============ 证明生成 ============

/**
 * 生成合规证明（使用 Web Worker）
 * @param userAddress 用户地址
 * @param issuerAttestation Issuer attestation 数据（从 EAS 获取）
 * @returns 证明和公共信号
 */
export async function generateComplianceProof(
  userAddress: string,
  issuerAttestation?: any // TODO: 定义 Attestation 类型
): Promise<ProofResult> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();

    // 准备电路输入
    const input = prepareCircuitInput(userAddress, issuerAttestation);

    // 设置超时（5 分钟）
    const timeout = setTimeout(() => {
      reject(new Error('证明生成超时'));
    }, 5 * 60 * 1000);

    // 监听 Worker 消息
    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timeout);

      if (e.data.type === 'PROOF_READY') {
        resolve({
          proof: e.data.proof,
          publicSignals: e.data.publicSignals,
        });
      } else if (e.data.type === 'ERROR') {
        reject(new Error(e.data.message));
      } else if (e.data.type === 'PROGRESS') {
        console.log(`证明生成进度: ${e.data.progress * 100}%`);
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    // 发送生成请求
    worker.postMessage({
      type: 'GENERATE_PROOF',
      input,
      wasmPath: '/circuits/compliance.wasm',
      zkeyPath: '/circuits/compliance.zkey',
    });
  });
}

/**
 * 准备电路输入
 */
function prepareCircuitInput(
  userAddress: string,
  issuerAttestation?: any
): CircuitInput {
  // TODO: 从 EAS attestation 中提取真实数据
  // 这里是模拟数据
  
  const addressBigInt = BigInt(userAddress).toString();

  return {
    userAddress: addressBigInt,
    merkleRoot: '987654321098765432109876543210',
    issuerPubKeyHash: '111111111111111111111111111111',
    signature: '222222222222222222222222222222',
    kycStatus: '1',
    countryCode: '840', // 美国
    timestamp: Math.floor(Date.now() / 1000).toString(),
    merkleProof: Array(20).fill('100000000000000000000000000001'),
    merkleIndex: '0',
  };
}

/**
 * 格式化证明为合约调用参数
 */
export function formatProofForContract(
  proof: Groth16Proof,
  publicSignals: string[]
): { proofBytes: string; publicInputs: bigint[] } {
  // TODO: 根据 PlonkVerifier.sol 的接口格式化
  // PLONK 证明格式与 Groth16 不同

  return {
    proofBytes: '0x', // TODO: 编码 proof
    publicInputs: publicSignals.map((s) => BigInt(s)),
  };
}

// ============ 工具函数 ============

/**
 * 预加载 WASM 和 zkey（优化首次使用体验）
 */
export async function preloadCircuitFiles(): Promise<void> {
  const files = ['/circuits/compliance.wasm', '/circuits/compliance.zkey'];

  await Promise.all(
    files.map(async (file) => {
      const response = await fetch(file);
      await response.arrayBuffer(); // 触发下载和缓存
    })
  );

  console.log('✅ 电路文件预加载完成');
}

/**
 * 获取电路文件大小（用于显示下载进度）
 */
export async function getCircuitFileSize(): Promise<number> {
  const response = await fetch('/circuits/compliance.zkey', { method: 'HEAD' });
  const size = response.headers.get('content-length');
  return size ? parseInt(size, 10) : 0;
}
