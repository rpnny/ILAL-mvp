import 'dotenv/config';
import { type Address, createPublicClient, createWalletClient, http, pad } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { CONTRACTS } from './src/config/constants.js';

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;
const WETH = '0x4200000000000000000000000000000000000006' as Address;

const TEST_WALLET_PK = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

const routerABI = [
    {
        type: 'function',
        name: 'swap',
        inputs: [
            {
                name: 'key', type: 'tuple', components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' }
                ]
            },
            {
                name: 'params', type: 'tuple', components: [
                    { name: 'zeroForOne', type: 'bool' },
                    { name: 'amountSpecified', type: 'int256' },
                    { name: 'sqrtPriceLimitX96', type: 'uint160' }
                ]
            },
            { name: 'hookData', type: 'bytes' }
        ],
        outputs: [{ name: 'delta', type: 'int256' }],
        stateMutability: 'payable'
    }
] as const;


async function runSimulation() {
    try {
        console.log("=== Testing Session Manager Isolation ===");

        const account = privateKeyToAccount(TEST_WALLET_PK, { nonceManager });
        const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
        const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

        console.log("Using Relayer Wallet:", account.address);

        const unauthorizedUser = '0x000000000000000000000000000000000000DeaD' as Address; // An address with no session
        console.log("Simulating Swap for unauthorized user:", unauthorizedUser);

        const poolKey = {
            currency0: USDC,
            currency1: WETH,
            fee: 3000,
            tickSpacing: 60,
            hooks: '0x27127E0c9313043225E6f73E130A83A01810Ff89' as Address,
        };

        const MIN_SQRT_PRICE = 4295128739n;
        const sqrtPriceLimitX96 = MIN_SQRT_PRICE + 1n; // zeroForOne = true

        // 故意传入没有 session 的用户地址作为 hookData
        const hookData = pad(unauthorizedUser, { 'dir': 'right', 'size': 20 });

        console.log("\nAttempting Swap...");

        const { request } = await publicClient.simulateContract({
            account,
            address: CONTRACTS.simpleSwapRouter,
            abi: routerABI,
            functionName: 'swap',
            args: [
                poolKey,
                {
                    zeroForOne: true,
                    amountSpecified: -100n,
                    sqrtPriceLimitX96: sqrtPriceLimitX96
                },
                hookData
            ],
            value: 0n
        });

        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'reverted') {
            throw new Error("Transaction reverted on-chain");
        }

        console.log("ERROR: Transaction succeeded! Session Manager did NOT block the unauthorized swap.");
        process.exit(1);
    } catch (error: any) {
        console.log("\nTransaction Reverted.");
        console.log("Full Error:", error);
        console.log("\nIf this is 'NotVerified', then the hook worked.");
        process.exit(0);
    }
}

runSimulation();
