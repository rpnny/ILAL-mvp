import { pad, Address } from 'viem';
const unauthorizedUser = '0x000000000000000000000000000000000000DeaD' as Address;
const hookData = pad(unauthorizedUser, { 'dir': 'right', 'size': 20 });
console.log(`HookData: ${hookData}`);
console.log(`Length: ${(hookData.length - 2) / 2} bytes`);
