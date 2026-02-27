import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACTS } from './src/config/constants.js';

const registryABI = [
  {
    type: 'function',
    name: 'isRouterApproved',
    inputs: [{ name: 'router', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  }
] as const;

async function checkRegistry() {
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') });
    
    // The "sender" inside `_resolveUser` is actually the `PoolManager` calling the hook. Let's check PoolManager!
    // Wait, PoolManager calls Hook. Let me check the caller. 
    // Actually, in Uniswap V4, the msg.sender to the hook is the PoolManager.
    
    const poolManager = CONTRACTS.poolManager;
    const router = CONTRACTS.simpleSwapRouter;
    const positionManager = CONTRACTS.positionManager;
    
    const pmApproved = await publicClient.readContract({
        address: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD', // Registry
        abi: registryABI,
        functionName: 'isRouterApproved',
        args: [poolManager as `0x${string}`]
    });
    
    const routerApproved = await publicClient.readContract({
        address: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD', // Registry
        abi: registryABI,
        functionName: 'isRouterApproved',
        args: [router as `0x${string}`]
    });
    
    const poMApproved = await publicClient.readContract({
        address: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD', // Registry
        abi: registryABI,
        functionName: 'isRouterApproved',
        args: [positionManager as `0x${string}`]
    });
    
    console.log(`Pool Manager Approved: ${pmApproved}`);
    console.log(`Swap Router Approved: ${routerApproved}`);
    console.log(`Position Manager Approved: ${poMApproved}`);
}

checkRegistry();
