/**
 * ZK Proof 模块
 * 支持浏览器和 Node.js 环境，WASM 文件外部化
 * 
 * 关键设计：
 * - 不打包 WASM 文件到 SDK（文件太大，50-100MB）
 * - 用户提供 wasmUrl 和 zkeyUrl（CDN 或本地文件）
 * - 动态加载 snarkjs 和 circomlibjs（避免打包问题）
 */

import type { CircuitInput, ProofResult, ProofProgressCallback, ZKProofConfig } from '../types';
import { InvalidProofError } from '../utils/errors';

// ============ 常量 ============

const TREE_DEPTH = 20;

/**
 * Pre-signed attestation from the Issuer (obtained server-side, never contains private key).
 * The client receives this from the ILAL API or Issuer service.
 */
export interface IssuerAttestation {
  sigR8x: string;
  sigR8y: string;
  sigS: string;
  issuerAx: string;
  issuerAy: string;
  kycStatus: string;
  countryCode: string;
  timestamp: string;
  merkleRoot: string;
  merkleProof: string[];
  merkleIndex: string;
}

export class ZKProofModule {
  private poseidonInstance: any = null;
  private snarkjsInstance: any = null;
  private eddsaInstance: any = null;

  constructor(private config?: ZKProofConfig) {}

  /**
   * Generate a compliance proof using a pre-signed issuer attestation.
   * The issuer private key is NEVER on the client — the issuer service
   * provides a signed attestation which the client uses to build the ZK proof.
   *
   * @param userAddress - User's Ethereum address
   * @param attestation - Pre-signed attestation from the Issuer service
   * @param onProgress - Progress callback
   */
  async generate(
    userAddress: string,
    attestationOrProgress?: IssuerAttestation | ProofProgressCallback,
    onProgress?: ProofProgressCallback
  ): Promise<ProofResult> {
    if (!this.config) {
      throw new Error('ZK config not provided. Please provide wasmUrl and zkeyUrl in ILALClient constructor.');
    }

    let attestation: IssuerAttestation | undefined;
    let progressCb: ProofProgressCallback | undefined;

    if (typeof attestationOrProgress === 'function') {
      progressCb = attestationOrProgress;
    } else {
      attestation = attestationOrProgress;
      progressCb = onProgress;
    }

    progressCb?.(5, 'Loading Poseidon hash...');
    const poseidon = await this.getPoseidon();

    progressCb?.(10, 'Computing circuit inputs...');
    let input: CircuitInput;

    if (attestation) {
      input = this.buildCircuitInputFromAttestation(userAddress, attestation);
    } else if (this.config?.issuerPrivateKey) {
      console.warn(
        '[ILAL SDK] WARNING: issuerPrivateKey in client config is deprecated and insecure. ' +
        'Use server-side attestation instead. See IssuerAttestation type.'
      );
      input = await this.prepareCircuitInput(userAddress, poseidon);
    } else {
      throw new Error(
        'Either an IssuerAttestation or issuerPrivateKey (deprecated) must be provided. ' +
        'Obtain an attestation from your Issuer service endpoint.'
      );
    }

    progressCb?.(15, 'Loading circuit files...');
    const [wasmBuffer, zkeyBuffer] = await Promise.all([
      this.loadFile(this.config.wasmUrl),
      this.loadFile(this.config.zkeyUrl),
    ]);

    progressCb?.(25, 'Generating proof (this may take a while)...');
    const snarkjs = await this.getSnarkJS();

    const startTime = Date.now();

    try {
      const { proof, publicSignals } = await snarkjs.plonk.fullProve(
        input,
        wasmBuffer,
        zkeyBuffer
      );

      const elapsedTime = Date.now() - startTime;
      progressCb?.(100, 'Proof generation complete!');

      return {
        proof,
        publicSignals,
        elapsedTime,
      };
    } catch (error: any) {
      throw new InvalidProofError({ originalError: error, input });
    }
  }

  /**
   * Build circuit input from a pre-signed Issuer attestation (no private key needed).
   */
  private buildCircuitInputFromAttestation(
    userAddress: string,
    attestation: IssuerAttestation
  ): CircuitInput {
    return {
      userAddress: BigInt(userAddress).toString(),
      merkleRoot: attestation.merkleRoot,
      issuerAx: attestation.issuerAx,
      issuerAy: attestation.issuerAy,
      timestamp: attestation.timestamp,
      sigR8x: attestation.sigR8x,
      sigR8y: attestation.sigR8y,
      sigS: attestation.sigS,
      kycStatus: attestation.kycStatus,
      countryCode: attestation.countryCode,
      merkleProof: attestation.merkleProof,
      merkleIndex: attestation.merkleIndex,
    };
  }

  /**
   * 验证证明（本地验证）
   */
  async verify(proof: any, publicSignals: string[]): Promise<boolean> {
    if (!this.config?.verificationKeyUrl) {
      throw new Error('Verification key URL not provided');
    }

    const snarkjs = await this.getSnarkJS();
    const vKeyBuffer = await this.loadFile(this.config.verificationKeyUrl);
    const vKey = JSON.parse(vKeyBuffer.toString());

    return await snarkjs.plonk.verify(vKey, publicSignals, proof);
  }

  /**
   * 格式化证明为合约调用参数
   */
  formatForContract(
    proof: any,
    publicSignals: string[]
  ): { proofBytes: `0x${string}`; publicInputs: bigint[] } {
    const proofElements: string[] = [];

    // PLONK 证明元素
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

  // ============ 私有方法 ============

  /**
   * @deprecated Use IssuerAttestation flow instead.
   * This method requires the issuer private key on the client, which is insecure.
   * Kept only for backward compatibility and testing.
   */
  private async prepareCircuitInput(
    userAddress: string,
    poseidon: any
  ): Promise<CircuitInput> {
    if (!this.config?.issuerPrivateKey) {
      throw new Error('issuerPrivateKey must be provided in ZKProofConfig to generate proofs');
    }

    const eddsa = await this.getEddsa();
    const userAddressBigInt = BigInt(userAddress);
    const kycStatus = BigInt(1);
    const countryCode = BigInt(840);
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    const leaf = poseidon([userAddressBigInt, kycStatus]);
    const leafValue: bigint = poseidon.F.toObject(leaf);

    const { root, siblings } = this.buildSparseMerkleProof(leafValue, 0, TREE_DEPTH, poseidon);

    const messageHash = poseidon([userAddressBigInt, kycStatus, countryCode, timestamp]);
    const messageHashValue: bigint = poseidon.F.toObject(messageHash);

    const issuerPrivKey = Buffer.from(this.config.issuerPrivateKey.replace(/^0x/, ''), 'hex');
    const issuerPubKey = eddsa.prv2pub(issuerPrivKey);
    const issuerAx: bigint = eddsa.F.toObject(issuerPubKey[0]);
    const issuerAy: bigint = eddsa.F.toObject(issuerPubKey[1]);

    const signature = eddsa.signPoseidon(issuerPrivKey, eddsa.F.e(messageHashValue));
    const sigR8x: bigint = eddsa.F.toObject(signature.R8[0]);
    const sigR8y: bigint = eddsa.F.toObject(signature.R8[1]);
    const sigS: bigint = signature.S;

    return {
      userAddress: userAddressBigInt.toString(),
      merkleRoot: root.toString(),
      issuerAx: issuerAx.toString(),
      issuerAy: issuerAy.toString(),
      timestamp: timestamp.toString(),
      sigR8x: sigR8x.toString(),
      sigR8y: sigR8y.toString(),
      sigS: sigS.toString(),
      kycStatus: kycStatus.toString(),
      countryCode: countryCode.toString(),
      merkleProof: siblings.map((s) => s.toString()),
      merkleIndex: '0',
    };
  }

  /**
   * 构建稀疏 Merkle 树证明（优化版本：O(20) vs O(2^20)）
   */
  private buildSparseMerkleProof(
    leafValue: bigint,
    leafIndex: number,
    levels: number,
    poseidon: any
  ): { root: bigint; siblings: bigint[] } {
    // 预计算零值哈希
    const zeroHashes: bigint[] = new Array(levels);
    zeroHashes[0] = BigInt(0);
    
    for (let i = 1; i < levels; i++) {
      const h = poseidon([zeroHashes[i - 1], zeroHashes[i - 1]]);
      zeroHashes[i] = poseidon.F.toObject(h);
    }

    // 从叶子向上计算
    const siblings: bigint[] = [];
    let currentHash = leafValue;
    let currentIndex = leafIndex;

    for (let level = 0; level < levels; level++) {
      const isRight = (currentIndex & 1) === 1;
      const sibling = zeroHashes[level];
      siblings.push(sibling);

      const left = isRight ? sibling : currentHash;
      const right = isRight ? currentHash : sibling;
      const parent = poseidon([left, right]);
      currentHash = poseidon.F.toObject(parent);
      currentIndex = currentIndex >> 1;
    }

    return { root: currentHash, siblings };
  }

  private async getEddsa(): Promise<any> {
    if (!this.eddsaInstance) {
      const circomlibjs = await this.loadCircomLib();
      this.eddsaInstance = await circomlibjs.buildEddsa();
    }
    return this.eddsaInstance;
  }

  private async getPoseidon(): Promise<any> {
    if (!this.poseidonInstance) {
      const circomlibjs = await this.loadCircomLib();
      this.poseidonInstance = await circomlibjs.buildPoseidon();
    }
    return this.poseidonInstance;
  }

  /**
   * 懒加载 SnarkJS
   */
  private async getSnarkJS(): Promise<any> {
    if (!this.snarkjsInstance) {
      this.snarkjsInstance = await this.loadSnarkJS();
    }
    return this.snarkjsInstance;
  }

  /**
   * 动态加载 circomlibjs（环境适配）
   */
  private async loadCircomLib(): Promise<any> {
    if (typeof window !== 'undefined') {
      // 浏览器环境
      return await import('circomlibjs');
    } else {
      // Node.js 环境
      return require('circomlibjs');
    }
  }

  /**
   * 动态加载 snarkjs（环境适配）
   */
  private async loadSnarkJS(): Promise<any> {
    if (typeof window !== 'undefined') {
      // 浏览器环境
      return await import('snarkjs');
    } else {
      // Node.js 环境
      return require('snarkjs');
    }
  }

  /**
   * 加载文件（支持 URL 或 Buffer）
   */
  private async loadFile(urlOrBuffer: string | Buffer): Promise<Buffer> {
    // 如果已经是 Buffer，直接返回
    if (Buffer.isBuffer(urlOrBuffer)) {
      return urlOrBuffer;
    }

    // 浏览器环境：从 URL 加载
    if (typeof window !== 'undefined') {
      const response = await fetch(urlOrBuffer);
      if (!response.ok) {
        throw new Error(`Failed to load file from ${urlOrBuffer}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // Node.js 环境：从文件系统加载
    const fs = require('fs');
    const path = require('path');
    
    // 如果是相对路径，解析为绝对路径
    const filePath = path.isAbsolute(urlOrBuffer) 
      ? urlOrBuffer 
      : path.resolve(process.cwd(), urlOrBuffer);

    return fs.readFileSync(filePath);
  }
}

/**
 * 工具函数：计算 Poseidon hash（用于测试）
 */
export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const isBrowser = typeof window !== 'undefined';
  const circomlibjs = isBrowser 
    ? await import('circomlibjs') 
    : require('circomlibjs');
  
  const poseidon = await circomlibjs.buildPoseidon();
  const hash = poseidon(inputs);
  return poseidon.F.toObject(hash);
}
