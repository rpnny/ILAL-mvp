/**
 * EAS Verification Service — Server-side Coinbase EAS attestation verification
 *
 * Mirrors the SDK's EASModule.checkCoinbaseVerification() but uses the API
 * server's publicClient from blockchain.service.ts. Verifies that a wallet
 * address has a valid, non-revoked, non-expired Coinbase identity attestation
 * on the EAS contract deployed on Base.
 */

import { type Address, type Hex, parseAbiItem } from 'viem';
import { blockchainService } from './blockchain.service.js';
import { EAS_CONTRACT_ADDRESS, COINBASE_ATTESTER_ADDRESS, EAS_SCHEMA_IDS } from '../config/constants.js';
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

const attestedEventAbi = parseAbiItem(
  'event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)',
);

const getAttestationAbi = parseAbiItem(
  'function getAttestation(bytes32 uid) external view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))',
);

/**
 * Verify that a wallet has a valid Coinbase EAS attestation on Base.
 *
 * Checks:
 *  1. Attestation exists for the given recipient from the Coinbase attester
 *  2. Attestation has not been revoked
 *  3. Attestation has not expired
 *  4. Attester matches the known Coinbase address
 */
export async function verifyCoinbaseAttestation(userAddress: Address): Promise<EASVerificationResult> {
  try {
    const client = blockchainService.getPublicClient();

    // Query Attested events filtered by recipient + attester
    const logs = await client.getLogs({
      address: EAS_CONTRACT_ADDRESS,
      event: attestedEventAbi,
      args: {
        recipient: userAddress,
        attester: COINBASE_ATTESTER_ADDRESS,
      },
      fromBlock: 0n,
      toBlock: 'latest',
    });

    if (logs.length === 0) {
      return {
        isValid: false,
        error: 'No Coinbase EAS attestation found for this address',
      };
    }

    // Use the most recent attestation
    const latestLog = logs[logs.length - 1];
    const uid = latestLog.args.uid as Hex;

    // Fetch full attestation data from the EAS contract
    const attestation = await client.readContract({
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

    logger.info('EAS attestation verified', {
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
