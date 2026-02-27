import { Address } from 'viem';

// Constants from Uniswap v4 core Hooks.sol
const BEFORE_INITIALIZE_FLAG = 1 << 13;
const AFTER_INITIALIZE_FLAG = 1 << 12;
const BEFORE_ADD_LIQUIDITY_FLAG = 1 << 11;
const AFTER_ADD_LIQUIDITY_FLAG = 1 << 10;
const BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9;
const AFTER_REMOVE_LIQUIDITY_FLAG = 1 << 8;
const BEFORE_SWAP_FLAG = 1 << 7;
const AFTER_SWAP_FLAG = 1 << 6;
const BEFORE_DONATE_FLAG = 1 << 5;
const AFTER_DONATE_FLAG = 1 << 4;

function checkFlags(address: string) {
    // The flags are in the first byte, wait, actually they are bits in the 160-bit address.
    // Address is 20 bytes. The top byte (first 2 hex chars after 0x) contains the flags?
    // Wait, in Uniswap V4:
    // uint160 const BEFORE_SWAP_FLAG = 1 << 7;
    // So the flags are the LOWEST bits? No, it's 1 << 7, which is 0x80.
    // Address: 0x...
    const addrNum = BigInt(address);
    console.log(`Address: ${address}`);
    console.log(`Before Swap: ${(addrNum & BigInt(BEFORE_SWAP_FLAG)) !== 0n}`);
    console.log(`Before Add Liquidity: ${(addrNum & BigInt(BEFORE_ADD_LIQUIDITY_FLAG)) !== 0n}`);
}

checkFlags('0x27127E0c9313043225E6f73E130A83A01810Ff89'); // My new hook
