/**
 * Issuer Service — EdDSA-Poseidon attestation signing
 *
 * Signs user compliance data with the issuer's EdDSA private key.
 * The resulting attestation is used by the client to generate a ZK proof.
 */

import { logger } from '../config/logger.js';

let poseidonInstance: any = null;
let eddsaInstance: any = null;
let issuerPubKey: [any, any] | null = null;
let issuerPrivKeyBuf: Buffer | null = null;

export interface AttestationResult {
  sigR8x: string;
  sigR8y: string;
  sigS: string;
  issuerAx: string;
  issuerAy: string;
  kycStatus: string;
  countryCode: string;
  timestamp: string;
}

async function ensureCrypto() {
  if (poseidonInstance && eddsaInstance) return;
  const { buildPoseidon, buildEddsa } = await import('circomlibjs');
  poseidonInstance = await buildPoseidon();
  eddsaInstance = await buildEddsa();
}

function getIssuerKey() {
  if (issuerPrivKeyBuf && issuerPubKey) return { privKey: issuerPrivKeyBuf, pubKey: issuerPubKey };

  const hex = process.env.ISSUER_PRIVATE_KEY;
  if (!hex) throw new Error('ISSUER_PRIVATE_KEY not configured');

  issuerPrivKeyBuf = Buffer.from(hex.replace(/^0x/, ''), 'hex');
  issuerPubKey = eddsaInstance.prv2pub(issuerPrivKeyBuf) as [any, any];
  return { privKey: issuerPrivKeyBuf, pubKey: issuerPubKey };
}

export async function initialize(): Promise<{ issuerAx: string; issuerAy: string }> {
  await ensureCrypto();
  const { pubKey } = getIssuerKey();
  const ax = eddsaInstance.F.toObject(pubKey[0]).toString();
  const ay = eddsaInstance.F.toObject(pubKey[1]).toString();
  logger.info('IssuerService initialized', { issuerAx: ax.slice(0, 20) + '...' });
  return { issuerAx: ax, issuerAy: ay };
}

export function getIssuerPublicKey(): { issuerAx: string; issuerAy: string } {
  if (!issuerPubKey || !eddsaInstance) throw new Error('IssuerService not initialized');
  return {
    issuerAx: eddsaInstance.F.toObject(issuerPubKey[0]).toString(),
    issuerAy: eddsaInstance.F.toObject(issuerPubKey[1]).toString(),
  };
}

/**
 * Sign an attestation for a user.
 * messageHash = poseidon([userAddress, kycStatus, countryCode, timestamp])
 */
export async function signAttestation(
  walletAddress: string,
  kycStatus: number,
  countryCode: number,
  timestamp: number,
): Promise<AttestationResult> {
  await ensureCrypto();
  const { privKey, pubKey } = getIssuerKey();

  const userAddressBigInt = BigInt(walletAddress.toLowerCase());
  const msgHash = poseidonInstance([
    userAddressBigInt,
    BigInt(kycStatus),
    BigInt(countryCode),
    BigInt(timestamp),
  ]);
  const msgHashValue = poseidonInstance.F.toObject(msgHash);

  const sig = eddsaInstance.signPoseidon(privKey, eddsaInstance.F.e(msgHashValue));

  const localValid = eddsaInstance.verifyPoseidon(
    eddsaInstance.F.e(msgHashValue),
    sig,
    pubKey,
  );
  if (!localValid) {
    throw new Error('EdDSA local verification failed — issuer key may be corrupt');
  }

  return {
    sigR8x: eddsaInstance.F.toObject(sig.R8[0]).toString(),
    sigR8y: eddsaInstance.F.toObject(sig.R8[1]).toString(),
    sigS: sig.S.toString(),
    issuerAx: eddsaInstance.F.toObject(pubKey[0]).toString(),
    issuerAy: eddsaInstance.F.toObject(pubKey[1]).toString(),
    kycStatus: kycStatus.toString(),
    countryCode: countryCode.toString(),
    timestamp: timestamp.toString(),
  };
}

/**
 * Compute a Poseidon leaf hash: poseidon([userAddress, kycStatus])
 */
export async function computeLeafHash(walletAddress: string, kycStatus: number): Promise<bigint> {
  await ensureCrypto();
  const leaf = poseidonInstance([BigInt(walletAddress.toLowerCase()), BigInt(kycStatus)]);
  return poseidonInstance.F.toObject(leaf) as bigint;
}

export function getPoseidon() {
  if (!poseidonInstance) throw new Error('IssuerService not initialized');
  return poseidonInstance;
}
