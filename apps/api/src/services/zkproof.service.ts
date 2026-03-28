/**
 * ZK Proof Service — Server-side PLONK proof generation
 *
 * Generates a compliance ZK proof server-side on behalf of an institution.
 * Requires: snarkjs, circuit WASM (committed to git), and the zkey file.
 *
 * The 136 MB compliance.zkey is NOT committed to git.
 * Set ZKEY_URL env var to a public download URL; the service downloads it on first use.
 * Example: ZKEY_URL=https://your-bucket.s3.amazonaws.com/compliance.zkey
 */

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve circuit files relative to the project root.
// __dirname is apps/api/src/services/ (dev) or apps/api/dist/services/ (built).
// 4 levels up → project root in both cases.
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const WASM_PATH = path.join(PROJECT_ROOT, 'packages/circuits/build/compliance_js/compliance.wasm');
/** Local repo zkey (developer machines) */
const REPO_ZKEY_PATH = path.join(PROJECT_ROOT, 'packages/circuits/keys/compliance.zkey');
/** Writable cache — Docker runs as non-root; /app/packages is not writable */
const CACHE_ZKEY_PATH = path.join(
  process.env.ZKEY_CACHE_DIR || path.join(os.tmpdir(), 'ilal-circuits'),
  'compliance.zkey',
);

let zkeyReady = false;
let resolvedZkeyPath: string | null = null;

/**
 * Download zkey from ZKEY_URL if not present locally.
 */
async function ensureZkey(): Promise<void> {
  if (zkeyReady && resolvedZkeyPath) return;

  const { access, mkdir } = await import('fs/promises');

  for (const p of [REPO_ZKEY_PATH, CACHE_ZKEY_PATH]) {
    try {
      await access(p);
      resolvedZkeyPath = p;
      zkeyReady = true;
      return;
    } catch {
      /* try next */
    }
  }

  const url = process.env.ZKEY_URL;
  if (!url) {
    throw new Error(
      'compliance.zkey not found and ZKEY_URL env not set. ' +
      'Set ZKEY_URL to a public download URL for the zkey file.',
    );
  }

  resolvedZkeyPath = CACHE_ZKEY_PATH;
  logger.info('Downloading compliance.zkey from ZKEY_URL...', { url, dest: resolvedZkeyPath });
  await mkdir(path.dirname(resolvedZkeyPath), { recursive: true });

  const { createWriteStream } = await import('fs');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download zkey: HTTP ${res.status}`);

  const { pipeline } = await import('stream/promises');
  const { Readable } = await import('stream');
  const dest = createWriteStream(resolvedZkeyPath);
  await pipeline(Readable.fromWeb(res.body as any), dest);

  logger.info('compliance.zkey downloaded successfully');
  zkeyReady = true;
}

export interface ProofResult {
  proofHex: string;
  publicInputs: string[];
}

/**
 * Generate a PLONK compliance proof server-side.
 * @param userAddress - The wallet address (as bigint string)
 * @param merkleRoot - Merkle tree root
 * @param merkleProof - Array of sibling hashes
 * @param merkleIndex - Leaf index in the tree
 * @param issuerAx - Issuer EdDSA public key X component
 * @param issuerAy - Issuer EdDSA public key Y component
 * @param sigR8x - EdDSA signature R8.x
 * @param sigR8y - EdDSA signature R8.y
 * @param sigS - EdDSA signature S
 * @param kycStatus - KYC status (0 or 1)
 * @param countryCode - ISO 3166-1 numeric country code
 * @param timestamp - Unix timestamp of the attestation
 */
export async function generateProof(params: {
  userAddressBigInt: string;
  merkleRoot: string;
  merkleProof: string[];
  merkleIndex: number;
  issuerAx: string;
  issuerAy: string;
  sigR8x: string;
  sigR8y: string;
  sigS: string;
  kycStatus: number;
  countryCode: number;
  timestamp: number;
}): Promise<ProofResult> {
  await ensureZkey();

  // @ts-ignore — snarkjs has no official type declarations
  const snarkjs = await import('snarkjs');

  const input = {
    userAddress:  params.userAddressBigInt,
    kycStatus:    params.kycStatus.toString(),
    countryCode:  params.countryCode.toString(),
    timestamp:    params.timestamp.toString(),
    merkleRoot:   params.merkleRoot,
    merkleProof:  params.merkleProof,
    merkleIndex:  params.merkleIndex.toString(),
    issuerAx:     params.issuerAx,
    issuerAy:     params.issuerAy,
    sigR8x:       params.sigR8x,
    sigR8y:       params.sigR8y,
    sigS:         params.sigS,
  };

  logger.info('Generating ZK proof server-side', {
    userAddress: params.userAddressBigInt.slice(0, 20) + '...',
    merkleIndex: params.merkleIndex,
  });

  const zkeyPath = resolvedZkeyPath;
  if (!zkeyPath) throw new Error('ZKEY path not resolved after ensureZkey()');

  const start = Date.now();
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(input, WASM_PATH, zkeyPath);
  const elapsed = Date.now() - start;

  logger.info('ZK proof generated', { elapsed, publicSignals: publicSignals.length });

  // Encode PLONK proof bytes — must match packages/sdk formatForContract (not exportSolidityCallData)
  const proofHex = plonkProofObjectToHex(proof);

  return {
    proofHex,
    publicInputs: publicSignals.map(String),
  };
}

/** Same field order as @ilal/sdk ZKProofModule.formatForContract */
function plonkProofObjectToHex(proof: Record<string, unknown>): `0x${string}` {
  const proofElements: string[] = [];
  const p = proof as any;
  if (p.A) proofElements.push(p.A[0], p.A[1]);
  if (p.B) proofElements.push(p.B[0], p.B[1]);
  if (p.C) proofElements.push(p.C[0], p.C[1]);
  if (p.Z) proofElements.push(p.Z[0], p.Z[1]);
  if (p.T1) proofElements.push(p.T1[0], p.T1[1]);
  if (p.T2) proofElements.push(p.T2[0], p.T2[1]);
  if (p.T3) proofElements.push(p.T3[0], p.T3[1]);
  if (p.Wxi) proofElements.push(p.Wxi[0], p.Wxi[1]);
  if (p.Wxiw) proofElements.push(p.Wxiw[0], p.Wxiw[1]);
  if (p.eval_a) proofElements.push(p.eval_a);
  if (p.eval_b) proofElements.push(p.eval_b);
  if (p.eval_c) proofElements.push(p.eval_c);
  if (p.eval_s1) proofElements.push(p.eval_s1);
  if (p.eval_s2) proofElements.push(p.eval_s2);
  if (p.eval_zw) proofElements.push(p.eval_zw);

  let hex = '0x';
  for (const element of proofElements) {
    hex += BigInt(element).toString(16).padStart(64, '0');
  }
  return hex as `0x${string}`;
}

/**
 * Check whether circuit files are accessible (or can be downloaded).
 */
export async function circuitsAvailable(): Promise<boolean> {
  try {
    const { access } = await import('fs/promises');
    await access(WASM_PATH);
    for (const p of [REPO_ZKEY_PATH, CACHE_ZKEY_PATH]) {
      try {
        await access(p);
        return true;
      } catch {
        /* continue */
      }
    }
    return !!process.env.ZKEY_URL;
  } catch {
    return false;
  }
}
