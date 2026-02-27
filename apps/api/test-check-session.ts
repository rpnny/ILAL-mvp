import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACTS } from './src/config/constants.js';

const sessionManagerABI = [
  {
    type: 'function',
    name: 'isSessionActive',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  }
] as const;

async function checkSession() {
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') });

  const fakeUser = '0x1111111111111111111111111111111111111111';
  const relayer = '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D';

  const fakeActive = await publicClient.readContract({
    address: CONTRACTS.sessionManager,
    abi: sessionManagerABI,
    functionName: 'isSessionActive',
    args: [fakeUser as `0x${string}`]
  });

  const relayerActive = await publicClient.readContract({
    address: CONTRACTS.sessionManager,
    abi: sessionManagerABI,
    functionName: 'isSessionActive',
    args: [relayer as `0x${string}`]
  });

  console.log(`Fake User Session Active: ${fakeActive}`);
  console.log(`Relayer Session Active: ${relayerActive}`);
}

checkSession();
