import 'dotenv/config';
import { createPublicClient, http, type Address, pad } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;
const WETH = '0x4200000000000000000000000000000000000006' as Address;
const COMPLIANCE_HOOK = '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80' as Address;
const SIMPLE_SWAP_ROUTER = '0x851A12a1A0A5670F4D8A74aD0f3534825EC5e7c2' as Address;

const routerABI = [{
    type: 'function', name: 'swap',
    inputs: [
        {
            name: 'key', type: 'tuple', components: [
                { name: 'currency0', type: 'address' },
                { name: 'currency1', type: 'address' },
                { name: 'fee', type: 'uint24' },
                { name: 'tickSpacing', type: 'int24' },
                { name: 'hooks', type: 'address' },
            ]
        },
        {
            name: 'params', type: 'tuple', components: [
                { name: 'zeroForOne', type: 'bool' },
                { name: 'amountSpecified', type: 'int256' },
                { name: 'sqrtPriceLimitX96', type: 'uint160' },
            ]
        },
        { name: 'hookData', type: 'bytes' }
    ],
    outputs: [{ name: 'delta', type: 'int256' }],
    stateMutability: 'payable'
}] as const;

async function main() {
    const pk = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    const account = privateKeyToAccount(pk);
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

    const poolKey = {
        currency0: USDC,
        currency1: WETH,
        fee: 3000,
        tickSpacing: 60,
        hooks: COMPLIANCE_HOOK,
    };

    const hookData = pad(account.address, { dir: 'right', size: 20 }) as `0x${string}`;
    console.log('Account:', account.address);
    console.log('hookData:', hookData, '(bytes:', hookData.slice(2).length / 2, ')');

    const MIN_SQRT = 4295128739n;

    try {
        const result = await publicClient.simulateContract({
            address: SIMPLE_SWAP_ROUTER,
            abi: routerABI,
            functionName: 'swap',
            args: [poolKey, { zeroForOne: true, amountSpecified: -100n, sqrtPriceLimitX96: MIN_SQRT + 1n }, hookData],
            account: account.address,
        });
        console.log('Sim success:', result.result);
    } catch (e: any) {
        console.log('Error name:', e.name);
        console.log('Short msg:', e.shortMessage);
        if (e.cause?.data) {
            console.log('Revert data:', e.cause.data);
        }
        let c = e;
        let depth = 0;
        while (c?.cause && depth < 5) {
            depth++;
            console.log(`-> cause[${depth}]:`, c.cause?.shortMessage || c.cause?.message || JSON.stringify(c.cause).slice(0, 200));
            if (c.cause?.data) console.log('   data:', c.cause.data);
            c = c.cause;
        }
    }
}
main().catch(console.error);
