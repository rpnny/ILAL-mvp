/**
 * Example 6: EAS Verification
 * 展示如何检查用户的合规验证状态
 *
 * 运行:
 *   PRIVATE_KEY=0x... npx tsx packages/sdk/examples/06-eas-verification.ts
 */

import { ILALClient } from '@ilal/sdk';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
if (!PRIVATE_KEY) { console.error('❌ Set PRIVATE_KEY env var'); process.exit(1); }

const account      = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

const client = new ILALClient({ walletClient, publicClient, chainId: 84532 });

async function easVerificationExample() {
  const userAddress = client.getUserAddress()!;
  console.log('Wallet:', userAddress);

  // 1. Check Coinbase verification status
  console.log('\n1. Checking Coinbase verification...');
  const coinbaseVerification = await client.eas.checkCoinbaseVerification(userAddress);

  if (coinbaseVerification.isVerified) {
    console.log('✅ User is verified by Coinbase');
    console.log('   Attestation ID:', coinbaseVerification.attestationId);
  } else {
    console.log('❌ User not verified by Coinbase (expected on testnet)');
  }

  // 2. Query all providers (Coinbase + custom)
  console.log('\n2. Checking all providers...');
  const allVerification = await client.eas.checkAllProviders(userAddress);
  console.log('   Any provider verified:', allVerification.isVerified);

  // 3. Get simple verification result
  console.log('\n3. Getting verification summary...');
  const verification = await client.eas.getVerification(userAddress);
  console.log('   Result:', JSON.stringify(verification, null, 2));

  // 4. Register a custom KYC provider (example — does not call external API)
  console.log('\n4. Registering custom KYC provider (mock)...');
  client.eas.registerProvider({
    name: 'Demo KYC Provider',
    attesterAddress: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    schemaUID: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`,
    verify: async () => null,
  });
  console.log('   Custom provider registered');

  // 5. Create mock attestations for testing
  console.log('\n5. Creating mock attestations...');
  const normalAttestation = client.eas.createMockAttestation(userAddress, 'normal');
  console.log('   Normal attestation:', normalAttestation ? 'created' : 'failed');

  const expiredAttestation = client.eas.createMockAttestation(userAddress, 'expired');
  console.log('   Expired attestation:', expiredAttestation ? 'created' : 'failed');

  console.log('\n✅ EAS verification example complete');
}

easVerificationExample().catch((err) => { console.error(err); process.exit(1); });
