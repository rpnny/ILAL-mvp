import 'dotenv/config';
import { defiService } from './src/services/defi.service.js';
import { blockchainService } from './src/services/blockchain.service.js';
import { CONTRACTS } from './src/config/constants.js';
import { type Address, createPublicClient, createWalletClient, http, erc20Abi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;
const WETH = '0x4200000000000000000000000000000000000006' as Address;
const TEST_WALLET_PK = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

async function checkAndApprove(token: Address, owner: Address, spender: Address, client: any, walletClient: any) {
    const balance = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner]
    });
    console.log(`Balance of ${token}: ${balance.toString()}`);

    const allowance = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender]
    });
    console.log(`Allowance of ${token} to ${spender}: ${allowance.toString()}`);

    if (allowance === 0n && balance > 0n) {
        console.log(`Approving ${token}...`);
        const tx = await walletClient.writeContract({
            address: token,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spender, balance]
        });
        console.log(`Approve tx: ${tx}`);
        await client.waitForTransactionReceipt({ hash: tx });
        console.log(`Approval confirmed.`);
    }
}

async function run() {
    try {
        console.log("=== Testing DeFi Service ===");

        const account = privateKeyToAccount(TEST_WALLET_PK);
        const myAddress = account.address;
        console.log("Test Wallet Address:", myAddress);

        const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
        const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });

        // Grant VERIFIER_ROLE to self
        const VERIFIER_ROLE = '0xe17f73562b535fa34af86cbdfae7c0ea910905139046ff6230f252df8fb1f31f'; // keccak256("VERIFIER_ROLE")
        const hasRole = await publicClient.readContract({
            address: CONTRACTS.sessionManager,
            abi: [{ type: 'function', name: 'hasRole', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' }],
            functionName: 'hasRole',
            args: [VERIFIER_ROLE, myAddress]
        });

        if (!hasRole) {
            console.log("Granting VERIFIER_ROLE to self...");
            const tx = await walletClient.writeContract({
                address: CONTRACTS.sessionManager,
                abi: [{ type: 'function', name: 'grantRole', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'grantRole',
                args: [VERIFIER_ROLE, myAddress]
            });
            await publicClient.waitForTransactionReceipt({ hash: tx });
            console.log("VERIFIER_ROLE granted.");
        }

        // Approve Routers in Registry
        const isRouterApproved = await publicClient.readContract({
            address: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address, // Registry proxy
            abi: [{ type: 'function', name: 'isRouterApproved', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' }],
            functionName: 'isRouterApproved',
            args: [CONTRACTS.simpleSwapRouter]
        });

        if (!isRouterApproved) {
            console.log("Approving SimpleSwapRouter in Registry...");
            const tx1 = await walletClient.writeContract({
                address: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD',
                abi: [{ type: 'function', name: 'approveRouter', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'approveRouter',
                args: [CONTRACTS.simpleSwapRouter, true]
            });
            await publicClient.waitForTransactionReceipt({ hash: tx1 });
        }

        const isPosManagerApproved = await publicClient.readContract({
            address: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD',
            abi: [{ type: 'function', name: 'isRouterApproved', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' }],
            functionName: 'isRouterApproved',
            args: [CONTRACTS.positionManager]
        });

        if (!isPosManagerApproved) {
            console.log("Approving PositionManager in Registry...");
            const tx2 = await walletClient.writeContract({
                address: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD',
                abi: [{ type: 'function', name: 'approveRouter', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [], stateMutability: 'nonpayable' }],
                functionName: 'approveRouter',
                args: [CONTRACTS.positionManager, true]
            });
            await publicClient.waitForTransactionReceipt({ hash: tx2 });
        }

        // Check Session
        const isActive = await blockchainService.isSessionActive(myAddress);
        console.log("Is Session Active:", isActive);
        if (!isActive) {
            console.log("Starting Session...");
            const session = await blockchainService.startSession(myAddress);
            console.log("Session started:", session);
        }

        // Check Balances & Approvals for SwapRouter
        console.log("Approving SimpleSwapRouter...");
        await checkAndApprove(USDC, myAddress, CONTRACTS.simpleSwapRouter, publicClient, walletClient);
        await checkAndApprove(WETH, myAddress, CONTRACTS.simpleSwapRouter, publicClient, walletClient);

        console.log("Approving PositionManager...");
        await checkAndApprove(USDC, myAddress, CONTRACTS.positionManager, publicClient, walletClient);
        await checkAndApprove(WETH, myAddress, CONTRACTS.positionManager, publicClient, walletClient);

        console.log("\n1. Testing Add Liquidity...");
        const liqResult = await defiService.addLiquidity({
            token0: USDC,
            token1: WETH,
            amount0: '1000000', // 1 USDC
            amount1: '1000000000000000', // 0.001 WETH
            userAddress: myAddress
        });
        console.log("Add Liquidity Result:", liqResult);
        if (liqResult.success) {
            console.log("Waiting for Add Liquidity transaction to be mined...");
            await publicClient.waitForTransactionReceipt({ hash: liqResult.txHash as `0x${string}` });
        }

        console.log("\n2. Testing Swap...");
        const swapResult = await defiService.swap({
            tokenIn: USDC,
            tokenOut: WETH,
            amount: '100000', // 0.1 USDC
            zeroForOne: true,
            userAddress: myAddress
        });
        console.log("Swap Result:", swapResult);

        console.log("\nTest Completed.");
        process.exit(0);
    } catch (error) {
        console.error("Test Failed:", error);
        process.exit(1);
    }
}

run();
