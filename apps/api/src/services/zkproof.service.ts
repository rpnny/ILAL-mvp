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

import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve circuit files relative to the project root.
// __dirname is apps/api/src/services/ (dev) or apps/api/dist/services/ (built).
// 4 levels up → project root in both cases.
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const WASM_PATH = path.join(PROJECT_ROOT, 'packages/circuits/build/compliance_js/compliance.wasm');
const ZKEY_PATH = path.join(PROJECT_ROOT, 'packages/circuits/keys/compliance.zkey');

let zkeyReady = false;

/**
 * Download zkey from ZKEY_URL if not present locally.
 */
async function ensureZkey(): Promise<void> {
  if (zkeyReady) return;

  const { access, mkdir } = await import('fs/promises');
  try {
    await access(ZKEY_PATH);
    zkeyReady = true;
    return;
  } catch {
    // Not present locally — try to download
  }

  const url = process.env.ZKEY_URL;
  if (!url) {
    throw new Error(
      'compliance.zkey not found and ZKEY_URL env var is not set. ' +
      'Set ZKEY_URL to a public download URL for the zkey file.',
    );
  }

  logger.info('Downloading compliance.zkey from ZKEY_URL...', { url });
  await mkdir(path.dirname(ZKEY_PATH), { recursive: true });

  const { createWriteStream } = await import('fs');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download zkey: HTTP ${res.status}`);

  const { pipeline } = await import('stream/promises');
  const { Readable } = await import('stream');
  const dest = createWriteStream(ZKEY_PATH);
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

  const start = Date.now();
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(input, WASM_PATH, ZKEY_PATH);
  const elapsed = Date.now() - start;

  logger.info('ZK proof generated', { elapsed, publicSignals: publicSignals.length });

  // Encode proof as hex bytes (same format as PlonkVerifierAdapter.verifyProof)
  const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
  // calldata format: "0xABC...[pub1,pub2,...]"
  const proofHex = calldata.split(',')[0].trim() as string;

  return {
    proofHex,
    publicInputs: publicSignals.map(String),
  };
}

/**
 * Check whether circuit files are accessible (or can be downloaded).
 */
export async function circuitsAvailable(): Promise<boolean> {
  try {
    const { access } = await import('fs/promises');
    await access(WASM_PATH);
    // zkey: either present locally or ZKEY_URL is configured for download
    try {
      await access(ZKEY_PATH);
      return true;
    } catch {
      return !!process.env.ZKEY_URL;
    }
  } catch {
    return false;
  }
}
