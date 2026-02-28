import { decodeAbiParameters } from 'viem';

const data = '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001b869cac69df23ad9d727932496aeb3605538c8d000000000000000000000000000000000000000000000000000000000000000b000000000000000000000000036cbd53842c5426634e7929541ec2318f3dcf7e00000000000000000000000042000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000ba90d5fe45b84b2b99e9c5a1a36c72695c514a80fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffda8000000000000000000000000000000000000000000000000000000000000025800000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000141b869cac69df23ad9d727932496aeb3605538c8d000000000000000000000000';

const decoded = decodeAbiParameters([
    {
        type: 'tuple',
        components: [
            { name: 'operationType', type: 'uint8' },
            { name: 'sender', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            {
                name: 'poolKey', type: 'tuple', components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' }
                ]
            },
            { name: 'tickLower', type: 'int24' },
            { name: 'tickUpper', type: 'int24' },
            { name: 'liquidityDelta', type: 'int256' },
            { name: 'hookData', type: 'bytes' }
        ]
    }
], data);

console.dir(decoded, { depth: null });
