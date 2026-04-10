/**
 * EAS Verification Service — Server-side Coinbase EAS attestation verification
 *
 * Uses the EAS GraphQL API to find attestation UIDs (avoids RPC block-range
 * limits on public nodes), then verifies on-chain via a dedicated Base Mainnet
 * publicClient (separate from the Sepolia client in blockchain.service.ts).
 */

import { createPublicClient, http, type Address, type Hex, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import {
  BASE_MAINNET_RPC_URL,
  EAS_CONTRACT_ADDRESS,
  COINBASE_ATTESTER_ADDRESS,
} from '../config/constants.js';
import { logger } from '../config/logger.js';

export interface EASVerificationResult {
  isValid: boolean;
  uid?: Hex;
  attester?: Address;
  recipient?: Address;
  schema?: Hex;
  time?: bigint;
  expirationTime?: bigint;
  error?: string;
}

// Dedicated Base Mainnet client for on-chain EAS verification
const mainnetClient = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET_RPC_URL),
});

const getAttestationAbi = parseAbiItem(
  'function getAttestation(bytes32 uid) external view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))',
);

// EAS GraphQL endpoint for Base Mainnet
const EAS_GRAPHQL_URL = 'https://base.easscan.org/graphql';

/**
 * Query the EAS GraphQL API to find the most recent Coinbase attestation UID
 * for a given recipient address. This avoids eth_getLogs block-range limits.
 */
async function findAttestationUid(userAddress: Address): Promise<Hex | null> {
  const query = `
    query FindAttestation($recipient: String!, $attester: String!) {
      attestations(
        where: {
          recipient: { equals: $recipient }
          attester: { equals: $attester }
          revoked: { equals: false }
        }
        orderBy: [{ time: desc }]
        take: 1
      ) {
        id
      }
    }
  `;

  const response = await fetch(EAS_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: {
        recipient: userAddress.toLowerCase(),
        attester: COINBASE_ATTESTER_ADDRESS.toLowerCase(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`EAS GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const attestations = data?.data?.attestations;

  if (!attestations || attestations.length === 0) {
    return null;
  }

  return attestations[0].id as Hex;
}

/**
 * Verify that a wallet has a valid Coinbase EAS attestation on Base Mainnet.
 *
 * Steps:
 *  1. Query EAS GraphQL API for the most recent attestation UID
 *  2. Fetch full attestation data on-chain via getAttestation(uid)
 *  3. Verify: not revoked, not expired, attester matches Coinbase
 */
export async function verifyCoinbaseAttestation(userAddress: Address): Promise<EASVerificationResult> {
  try {
    // 1. Find attestation UID via GraphQL
    const uid = await findAttestationUid(userAddress);

    if (!uid) {
      return {
        isValid: false,
        error: 'No Coinbase EAS attestation found for this address on Base Mainnet',
      };
    }

    // 2. Verify on-chain: fetch full attestation data
    const attestation = await mainnetClient.readContract({
      address: EAS_CONTRACT_ADDRESS,
      abi: [getAttestationAbi],
      functionName: 'getAttestation',
      args: [uid],
    }) as any;

    const now = BigInt(Math.floor(Date.now() / 1000));

    // Check revocation
    if (attestation.revocationTime > 0n) {
      logger.warn('EAS attestation is revoked', { userAddress, uid });
      return {
        isValid: false,
        uid,
        error: 'Attestation has been revoked',
      };
    }

    // Check expiration
    if (attestation.expirationTime > 0n && attestation.expirationTime < now) {
      logger.warn('EAS attestation is expired', { userAddress, uid });
      return {
        isValid: false,
        uid,
        error: 'Attestation has expired',
      };
    }

    // Verify attester identity
    if (attestation.attester.toLowerCase() !== COINBASE_ATTESTER_ADDRESS.toLowerCase()) {
      logger.warn('EAS attestation attester mismatch', {
        userAddress,
        uid,
        expected: COINBASE_ATTESTER_ADDRESS,
        actual: attestation.attester,
      });
      return {
        isValid: false,
        uid,
        error: 'Attestation attester does not match Coinbase',
      };
    }

    logger.info('EAS attestation verified on Base Mainnet', {
      userAddress,
      uid,
      attester: attestation.attester,
      time: attestation.time.toString(),
    });

    return {
      isValid: true,
      uid,
      attester: attestation.attester,
      recipient: attestation.recipient,
      schema: attestation.schema,
      time: BigInt(attestation.time),
      expirationTime: BigInt(attestation.expirationTime),
    };
  } catch (error: any) {
    logger.error('EAS verification failed', { userAddress, error: error.message });
    return {
      isValid: false,
      error: `EAS query failed: ${error.message}`,
    };
  }
}
