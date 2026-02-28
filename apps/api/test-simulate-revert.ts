import { createWalletClient, createPublicClient, http, pad, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { CONTRACTS } from './src/config/constants.js';

const TEST_WALLET_PK = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;
const WETH = '0x4200000000000000000000000000000000000006' as Address;
const NEW_HOOK = '0x27127E0c9313043225E6f73E130A83A01810Ff89' as Address;

const poolManagerABI = [
  {
    type: 'function',
    name: 'swap',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' }
        ]
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      },
      { name: 'hookData', type: 'bytes' }
    ],
    outputs: [{ name: 'delta', type: 'int256' }],
    stateMutability: 'nonpayable'
  }
] as const;

async function main() {
  const account = privateKeyToAccount(TEST_WALLET_PK);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') });

  const key = {
    currency0: USDC,
    currency1: WETH,
    fee: 3000,
    tickSpacing: 60,
    hooks: NEW_HOOK
  };
  const sqrtPriceLimitX96 = 4295128739n + 1n; // For zeroForOne
  const unauthorizedUser = '0x1111111111111111111111111111111111111111' as Address;
  const hookData = pad(unauthorizedUser, { 'dir': 'right', 'size': 20 });

  try {
    console.log("Simulating direct PM.swap with fake user...");
    await publicClient.simulateContract({
      account,
      address: CONTRACTS.poolManager,
      abi: poolManagerABI,
      functionName: 'swap',
      args: [
        key,
        { zeroForOne: true, amountSpecified: -100n, sqrtPriceLimitX96 },
        hookData
      ]
    });
    console.log("Simulation SUCCESS (This is bad, it should revert)");
  } catch (e: any) {
    console.log("Simulation REVERTED (Expected!):", e.message);
  }
}
main();
