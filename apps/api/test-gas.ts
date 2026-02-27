import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://base-sepolia-rpc.publicnode.com')
});

const txHashes = [
    { name: 'Add Liquidity', hash: '0x272dca96af4daa1a6c5e4a0fd2fb2047f3784c82c3599ca5fa8ba6770ce2ce9c' as `0x${string}` },
    { name: 'Swap', hash: '0x3d348382879540aa8ca064ce214d82e99b4d10ac8a71742d80ab3d4dcfee895e' as `0x${string}` }
];

async function calculateGas() {
    console.log('Calculating actual gas costs for recent transactions on Base Sepolia...\n');

    for (const tx of txHashes) {
        try {
            const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });

            const gasUsed = receipt.gasUsed;
            const effectiveGasPrice = receipt.effectiveGasPrice;
            const totalFeeWei = gasUsed * effectiveGasPrice;
            const totalFeeEth = formatEther(totalFeeWei);

            console.log(`--- ${tx.name} ---`);
            console.log(`Tx Hash: ${tx.hash}`);
            console.log(`Gas Used: ${gasUsed.toString()} units`);
            console.log(`Effective Gas Price: ${effectiveGasPrice.toString()} wei`);
            console.log(`Total Fee: ${totalFeeWei.toString()} wei`);
            console.log(`Total Fee (ETH): ${totalFeeEth} ETH\n`);
        } catch (e: any) {
            console.error(`Failed to fetch receipt for ${tx.name}:`, e.message);
        }
    }
}

calculateGas();
