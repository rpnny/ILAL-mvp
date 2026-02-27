import 'dotenv/config';
import { createWalletClient, createPublicClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address;
const WETH = '0x4200000000000000000000000000000000000006' as Address;
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;
const NEW_HOOK = '0x27127E0c9313043225E6f73E130A83A01810Ff89' as Address;

const poolManagerABI = [
  {
    type: 'function',
    name: 'initialize',
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
      { name: 'sqrtPriceX96', type: 'uint160' }
    ],
    outputs: [{ name: 'tick', type: 'int24' }],
    stateMutability: 'nonpayable'
  }
] as const;

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') });

  const key = {
    currency0: USDC,
    currency1: WETH,
    fee: 3000,
    tickSpacing: 60,
    hooks: NEW_HOOK
  };

  const sqrtPriceX96 = 79224306130848112672356n; // Approx 1/3000

  console.log("Initializing Pool with New Hook...");
  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: POOL_MANAGER,
      abi: poolManagerABI,
      functionName: 'initialize',
      args: [key, sqrtPriceX96]
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Transaction submitted: https://sepolia.basescan.org/tx/${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("Pool successfully initialized!");
  } catch (e: any) {
    if (e.message && e.message.includes('PoolAlreadyInitialized')) {
      console.log("Pool successfully initialized already!");
      return;
    }
    console.error("Initialization Failed:", e.message);
  }
}
main();
