/**
 * ZK Proof Service — Server-side PLONK proof generation
 *
 * Generates a compliance ZK proof server-side on behalf of an institution.
 * Requires: snarkjs, circuit WASM, and the zkey file accessible at runtime.
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
 * Check whether circuit files are accessible.
 */
export async function circuitsAvailable(): Promise<boolean> {
  try {
    const { access } = await import('fs/promises');
    await Promise.all([access(WASM_PATH), access(ZKEY_PATH)]);
    return true;
  } catch {
    return false;
  }
}
