import { pad, Address } from 'viem';

// The address we supply
const unauthorizedUser = '0x1111111111111111111111111111111111111111' as Address;

// What does it pad to natively?
const hookData = pad(unauthorizedUser, { 'dir': 'right', 'size': 20 });
console.log(`Original Padded length: ${(hookData.length - 2) / 2}`);

// Let's decode it as the hook does:
// bytes20(hookData[0:20])
if (hookData.length >= 42) {
    const extracted = '0x' + hookData.substring(2, 42);
    console.log(`Extracted: ${extracted}`);
}
