/**
 * ILAL ZK 证明生成库（浏览器端）
 *
 * 关键设计：circomlibjs 仅在客户端通过 dynamic import 加载，
 * 避免 SSR 中 Node.js 专有模块（web-worker, fs）导致的崩溃。
 */

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
  proof: any;
  publicSignals: string[];
  elapsedTime?: number;
}

export type ProofProgressCallback = (progress: number, message: string) => void;

// ============ 常量 ============

const TREE_DEPTH = 20;
const ISSUER_ADDRESS = '0x357458739F90461b99789350868CD7CF330Dd7EE';

// ============ Poseidon 延迟加载 ============

let poseidonInstance: any = null;

async function getPoseidon() {
  if (!poseidonInstance) {
    // 动态 import，只在浏览器端执行
    const { buildPoseidon } = await import('circomlibjs');
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

// ============ IndexedDB 缓存 ============

const DB_NAME = 'ilal-zk-cache';
const DB_VERSION = 1;
const STORE_NAME = 'circuit-files';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getCachedFile(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch {
    return null;
  }
}

async function setCachedFile(key: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // 缓存失败不影响功能
  }
}

export async function clearCircuitCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // ignore
  }
}

// ============ Web Worker 管理 ============

let proofWorker: Worker | null = null;

function getWorker(): Worker {
  if (!proofWorker) {
    proofWorker = new Worker('/workers/zkProof.worker.js');
  }
  return proofWorker;
}

export function terminateWorker(): void {
  if (proofWorker) {
    proofWorker.terminate();
    proofWorker = null;
  }
}

// ============ 稀疏 Merkle Tree（高性能版本） ============
//
// 优化：只有 1 个叶子(index=0)非零，其余全为 0
// 原始版本: O(2^20) = 100 万次 Poseidon 哈希（浏览器中 OOM/冻结）
// 优化版本: O(20) 次 Poseidon 哈希（毫秒级完成）
//
// 算法：
//   zeroHash[0] = 0
//   zeroHash[k] = Poseidon(zeroHash[k-1], zeroHash[k-1])
//   从 leaf 向上逐层计算，每层的 sibling 都是 zeroHash[level]
//

function buildSparseMerkleProof(
  leafValue: bigint,
  leafIndex: number,
  levels: number,
  poseidon: any
): { root: bigint; siblings: bigint[] } {
  // 1. 预计算每一层的 "零值哈希"
  const zeroHashes: bigint[] = new Array(levels);
  zeroHashes[0] = BigInt(0); // 空叶子 = 0
  for (let i = 1; i < levels; i++) {
    const h = poseidon([zeroHashes[i - 1], zeroHashes[i - 1]]);
    zeroHashes[i] = poseidon.F.toObject(h);
  }

  // 2. 从叶子向上计算路径，收集 siblings
  const siblings: bigint[] = [];
  let currentHash = leafValue;
  let currentIndex = leafIndex;

  for (let level = 0; level < levels; level++) {
    const isRight = (currentIndex & 1) === 1;
    const sibling = zeroHashes[level]; // 在稀疏树中，同层其他子树都是零哈希
    siblings.push(sibling);

    const left = isRight ? sibling : currentHash;
    const right = isRight ? currentHash : sibling;
    const parent = poseidon([left, right]);
    currentHash = poseidon.F.toObject(parent);
    currentIndex = currentIndex >> 1;
  }

  return { root: currentHash, siblings };
}

// ============ 证明生成 ============

/**
 * 生成合规证明
 *
 * 1. 动态加载 Poseidon（避免 SSR 问题）
 * 2. 计算 leaf, merkle tree, signature（与 Circom 电路一致）
 * 3. 发到 Web Worker 生成 PLONK proof
 */
export async function generateComplianceProof(
  userAddress: string,
  _issuerAttestation?: any,
  onProgress?: ProofProgressCallback
): Promise<ProofResult> {
  onProgress?.(5, 'Initializing Poseidon hash...');

  const poseidon = await getPoseidon();

  onProgress?.(8, 'Computing circuit inputs...');

  const input = await prepareCircuitInput(userAddress, poseidon);

  console.log('[ZK] Circuit input ready:', {
    userAddress: input.userAddress.slice(0, 20) + '...',
    merkleRoot: input.merkleRoot.slice(0, 20) + '...',
  });

  onProgress?.(10, 'Starting proof generation...');

  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const startTime = Date.now();

    const timeout = setTimeout(() => {
      reject(new Error('Proof generation timed out (exceeded 5 minutes)'));
    }, 5 * 60 * 1000);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'PROOF_READY') {
        clearTimeout(timeout);
        onProgress?.(95, 'Proof generation complete');
        resolve({
          proof: e.data.proof,
          publicSignals: e.data.publicSignals,
          elapsedTime: Date.now() - startTime,
        });
      } else if (e.data.type === 'ERROR') {
        clearTimeout(timeout);
        reject(new Error(e.data.message));
      } else if (e.data.type === 'PROGRESS') {
        const pct = 10 + Math.round((e.data.progress || 0) * 80);
        onProgress?.(Math.min(pct, 90), e.data.message || 'Generating...');
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error(`Worker 错误: ${error.message}`));
    };

    worker.postMessage({
      type: 'GENERATE_PROOF',
      input,
      wasmPath: '/circuits/compliance.wasm',
      zkeyPath: '/circuits/compliance_final.zkey',
    });
  });
}

/**
 * 准备电路输入 —— Poseidon 计算与 generate-test-proof.js / compliance.circom 完全一致
 */
async function prepareCircuitInput(
  userAddress: string,
  poseidon: any
): Promise<CircuitInput> {
  const userAddressBigInt = BigInt(userAddress);
  const issuerBigInt = BigInt(ISSUER_ADDRESS.toLowerCase());
  const kycStatus = BigInt(1);
  const countryCode = BigInt(840);
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  // leaf = Poseidon(userAddress, kycStatus)  —  circom line 137-138
  const leaf = poseidon([userAddressBigInt, kycStatus]);
  const leafValue: bigint = poseidon.F.toObject(leaf);

  // 构建稀疏 Merkle Tree（O(20) 而非 O(2^20)，毫秒级完成）
  const { root, siblings } = buildSparseMerkleProof(leafValue, 0, TREE_DEPTH, poseidon);

  // messageHash = Poseidon(userAddress, kycStatus, countryCode, timestamp)  — circom line 122-126
  const messageHash = poseidon([userAddressBigInt, kycStatus, countryCode, timestamp]);
  const messageHashValue: bigint = poseidon.F.toObject(messageHash);

  // signature = Poseidon(messageHash, issuerPubKeyHash)  — circom line 81-83
  const signature = poseidon([messageHashValue, issuerBigInt]);
  const signatureValue: bigint = poseidon.F.toObject(signature);

  return {
    userAddress: userAddressBigInt.toString(),
    merkleRoot: root.toString(),
    issuerPubKeyHash: issuerBigInt.toString(),
    signature: signatureValue.toString(),
    kycStatus: kycStatus.toString(),
    countryCode: countryCode.toString(),
    timestamp: timestamp.toString(),
    merkleProof: siblings.map((s) => s.toString()),
    merkleIndex: '0',
  };
}

/**
 * 格式化证明为合约调用参数
 */
export function formatProofForContract(
  proof: any,
  publicSignals: string[]
): { proofBytes: `0x${string}`; publicInputs: bigint[] } {
  const proofElements: string[] = [];

  if (proof.A) proofElements.push(proof.A[0], proof.A[1]);
  if (proof.B) proofElements.push(proof.B[0], proof.B[1]);
  if (proof.C) proofElements.push(proof.C[0], proof.C[1]);
  if (proof.Z) proofElements.push(proof.Z[0], proof.Z[1]);
  if (proof.T1) proofElements.push(proof.T1[0], proof.T1[1]);
  if (proof.T2) proofElements.push(proof.T2[0], proof.T2[1]);
  if (proof.T3) proofElements.push(proof.T3[0], proof.T3[1]);
  if (proof.Wxi) proofElements.push(proof.Wxi[0], proof.Wxi[1]);
  if (proof.Wxiw) proofElements.push(proof.Wxiw[0], proof.Wxiw[1]);
  if (proof.eval_a) proofElements.push(proof.eval_a);
  if (proof.eval_b) proofElements.push(proof.eval_b);
  if (proof.eval_c) proofElements.push(proof.eval_c);
  if (proof.eval_s1) proofElements.push(proof.eval_s1);
  if (proof.eval_s2) proofElements.push(proof.eval_s2);
  if (proof.eval_zw) proofElements.push(proof.eval_zw);

  let proofHex = '0x';
  for (const element of proofElements) {
    const bn = BigInt(element);
    proofHex += bn.toString(16).padStart(64, '0');
  }

  return {
    proofBytes: proofHex as `0x${string}`,
    publicInputs: publicSignals.map((s) => BigInt(s)),
  };
}

// ============ 工具函数 ============

export async function preloadCircuitFiles(): Promise<void> {
  const files = ['/circuits/compliance.wasm', '/circuits/compliance_final.zkey'];
  await Promise.all(files.map(async (file) => {
    const cached = await getCachedFile(file);
    if (!cached) {
      const response = await fetch(file);
      const buffer = await response.arrayBuffer();
      await setCachedFile(file, buffer);
    }
  }));
}

export async function isCircuitCached(): Promise<boolean> {
  const a = await getCachedFile('/circuits/compliance.wasm');
  const b = await getCachedFile('/circuits/compliance_final.zkey');
  return !!(a && b);
}

export async function getCircuitFileSize(): Promise<number> {
  try {
    const response = await fetch('/circuits/compliance_final.zkey', { method: 'HEAD' });
    const size = response.headers.get('content-length');
    return size ? parseInt(size, 10) : 0;
  } catch {
    return 0;
  }
}
