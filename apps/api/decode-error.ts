import { decodeErrorResult } from 'viem';

const abi = [
    {
        type: 'error',
        name: 'WrappedError',
        inputs: [
            { name: 'target', type: 'address' },
            { name: 'selector', type: 'bytes4' },
            { name: 'reason', type: 'bytes' },
            { name: 'details', type: 'bytes' }
        ]
    }
];

const data = '0x90bfb865000000000000000000000000ba90d5fe45b84b2b99e9c5a1a36c72695c514a80259982e500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004a9e35b2f00000000000000000000000000000000000000000000000000000000';

try {
    const result = decodeErrorResult({
        abi,
        data
    });
    console.log('Decoded:', result);
} catch (e) {
    console.error(e);
}
