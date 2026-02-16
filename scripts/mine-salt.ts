/**
 * CREATE2 Salt 挖掘器（TypeScript 优化版本）
 * 
 * 使用实际的 initCode hash 挖掘符合要求的 salt
 */

import { keccak256, encodePacked, type Hex } from 'viem';

// 标准 CREATE2 Deployer
const CREATE2_DEPLOYER = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

// 从 Foundry 输出获取的实际 init code hash
const INIT_CODE_HASH = '0x8b8a86db5f190a8f5fb242cb9d0d835dad3aecfe6c208eec2b202a6dce37d1dd' as Hex;

// Hook 权限位
const BEFORE_SWAP_FLAG = 1 << 7;              // 0x80
const BEFORE_ADD_LIQUIDITY_FLAG = 1 << 11;    // 0x800
const BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9;  // 0x200
const REQUIRED_MASK = BEFORE_SWAP_FLAG | BEFORE_ADD_LIQUIDITY_FLAG | BEFORE_REMOVE_LIQUIDITY_FLAG; // 0x0A80 = 2688
const ALL_HOOK_MASK = (1 << 14) - 1; // 0x3FFF

function computeCreate2Address(salt: Hex): string {
  const hash = keccak256(
    encodePacked(
      ['bytes1', 'address', 'bytes32', 'bytes32'],
      ['0xff' as Hex, CREATE2_DEPLOYER as Hex, salt, INIT_CODE_HASH],
    ),
  );
  return `0x${hash.slice(-40)}`;
}

function checkAddress(address: string): boolean {
  const addrBigInt = BigInt(address);
  const lowBits = Number(addrBigInt & BigInt(ALL_HOOK_MASK));
  return lowBits === REQUIRED_MASK;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         CREATE2 Salt Miner (TypeScript)                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Required mask: 0x${REQUIRED_MASK.toString(16).toUpperCase()} (${REQUIRED_MASK})`);
  console.log(`  beforeSwap: bit 7 (0x${BEFORE_SWAP_FLAG.toString(16).toUpperCase()})`);
  console.log(`  beforeAddLiquidity: bit 11 (0x${BEFORE_ADD_LIQUIDITY_FLAG.toString(16).toUpperCase()})`);
  console.log(`  beforeRemoveLiquidity: bit 9 (0x${BEFORE_REMOVE_LIQUIDITY_FLAG.toString(16).toUpperCase()})`);
  console.log();
  console.log(`CREATE2 Deployer: ${CREATE2_DEPLOYER}`);
  console.log(`Init Code Hash:   ${INIT_CODE_HASH}`);
  console.log();
  console.log('⛏️  Mining...');
  console.log();

  const startTime = Date.now();
  let attempts = 0;
  const reportInterval = 100000;

  for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
    const salt = `0x${i.toString(16).padStart(64, '0')}` as Hex;
    const address = computeCreate2Address(salt);

    attempts++;

    if (checkAddress(address)) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (attempts / (Date.now() - startTime) * 1000).toFixed(0);

      console.log('✅ SUCCESS!');
      console.log();
      console.log(`   Attempts: ${attempts.toLocaleString()}`);
      console.log(`   Time:     ${elapsed}s`);
      console.log(`   Rate:     ${rate} attempts/s`);
      console.log();
      console.log(`   Salt:     ${salt}`);
      console.log(`   Address:  ${address}`);
      console.log();

      // 验证位
      const addrBigInt = BigInt(address);
      const lowBits = Number(addrBigInt & BigInt(ALL_HOOK_MASK));
      console.log('   Bit Verification:');
      console.log(`     Low 14 bits: 0x${lowBits.toString(16).toUpperCase()}`);
      console.log(`     beforeSwap (bit 7): ${(lowBits & BEFORE_SWAP_FLAG) !== 0 ? '✓' : '✗'}`);
      console.log(`     beforeAddLiquidity (bit 11): ${(lowBits & BEFORE_ADD_LIQUIDITY_FLAG) !== 0 ? '✓' : '✗'}`);
      console.log(`     beforeRemoveLiquidity (bit 9): ${(lowBits & BEFORE_REMOVE_LIQUIDITY_FLAG) !== 0 ? '✓' : '✗'}`);
      console.log();

      // 保存结果
      const output = `HOOK_SALT=${salt}\nHOOK_ADDRESS=${address}\n`;
      const fs = require('fs');
      fs.writeFileSync('.hook-address', output);
      console.log('📄 Saved to .hook-address');
      console.log();

      return;
    }

    if (attempts % reportInterval === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (attempts / (Date.now() - startTime) * 1000).toFixed(0);
      console.log(`   ${attempts.toLocaleString()} attempts (${elapsed}s, ${rate}/s)...`);
    }
  }

  console.log('❌ Mining failed after', attempts, 'attempts');
}

main();
