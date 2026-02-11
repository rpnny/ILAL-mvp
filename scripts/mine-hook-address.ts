/**
 * CREATE2 地址挖掘器 - 为 ComplianceHook 找到符合 Uniswap v4 位掩码的地址
 * 
 * ComplianceHook 需要的权限:
 * - beforeSwap: bit 7 (0x80)
 * - beforeAddLiquidity: bit 11 (0x800)
 * - beforeRemoveLiquidity: bit 9 (0x200)
 * 
 * 总掩码: 0x0A80 = 2688
 */

import { keccak256, encodePacked, type Hex, type Address } from 'viem';
import * as fs from 'fs';

// ComplianceHook 需要的位掩码
const BEFORE_SWAP_FLAG = 1 << 7;              // 0x80
const BEFORE_ADD_LIQUIDITY_FLAG = 1 << 11;    // 0x800
const BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9;  // 0x200
const REQUIRED_MASK = BEFORE_SWAP_FLAG | BEFORE_ADD_LIQUIDITY_FLAG | BEFORE_REMOVE_LIQUIDITY_FLAG; // 0x0A80
const ALL_HOOK_MASK = (1 << 14) - 1; // 0x3FFF

// 部署参数（从你的 .env 读取）
const DEPLOYER = '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D';
const REGISTRY = '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD';
const SESSION_MANAGER = '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2';

// ComplianceHook 的 creation bytecode hash
// 需要从编译后的 artifact 获取
const CREATION_CODE_HASH = '0x...'; // 待填充

/**
 * 计算 CREATE2 地址
 */
function computeCreate2Address(deployer: Address, salt: Hex, creationCodeHash: Hex): Address {
  const hash = keccak256(
    encodePacked(
      ['bytes1', 'address', 'bytes32', 'bytes32'],
      ['0xff' as Hex, deployer, salt, creationCodeHash],
    ),
  );
  return `0x${hash.slice(-40)}` as Address;
}

/**
 * 检查地址是否满足位掩码要求
 */
function isValidHookAddress(address: Address): boolean {
  const addrBigInt = BigInt(address);
  const lowBits = Number(addrBigInt & BigInt(ALL_HOOK_MASK));
  return lowBits === REQUIRED_MASK;
}

/**
 * 主挖掘函数
 */
async function mineHookAddress() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       CREATE2 Hook Address Miner                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('📋 目标配置:');
  console.log(`   Required mask: 0x${REQUIRED_MASK.toString(16).toUpperCase()} (${REQUIRED_MASK})`);
  console.log(`   beforeSwap: bit 7`);
  console.log(`   beforeAddLiquidity: bit 11`);
  console.log(`   beforeRemoveLiquidity: bit 9`);
  console.log();
  console.log('⚙️  部署参数:');
  console.log(`   Deployer: ${DEPLOYER}`);
  console.log(`   Registry: ${REGISTRY}`);
  console.log(`   SessionManager: ${SESSION_MANAGER}`);
  console.log();

  // 我们需要先编译合约获取 creation code
  console.log('❌ 需要先获取 ComplianceHook 的 creation bytecode');
  console.log();
  console.log('执行步骤:');
  console.log('1. cd contracts');
  console.log('2. forge build');
  console.log('3. 从 out/ComplianceHook.sol/ComplianceHook.json 提取 bytecode');
  console.log('4. 将 bytecode 添加构造函数参数后计算 hash');
  console.log();
  console.log('或者使用 Foundry 的内置挖掘功能...');
}

// 临时使用伪代码，实际需要真实的 creation code
async function mineWithKnownCreationCode(creationCodeHash: Hex) {
  console.log('⛏️  开始挖掘...');
  console.log();

  const startTime = Date.now();
  let attempts = 0;

  for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
    const salt = `0x${i.toString(16).padStart(64, '0')}` as Hex;
    const address = computeCreate2Address(DEPLOYER as Address, salt, creationCodeHash);

    attempts++;

    if (isValidHookAddress(address)) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ 找到有效地址! (尝试 ${attempts.toLocaleString()} 次, 耗时 ${elapsed}s)`);
      console.log();
      console.log(`   Salt:    ${salt}`);
      console.log(`   Address: ${address}`);
      console.log();

      // 验证位
      const addrBigInt = BigInt(address);
      const lowBits = Number(addrBigInt & BigInt(ALL_HOOK_MASK));
      console.log('   位验证:');
      console.log(`     低 14 位: 0x${lowBits.toString(16).toUpperCase()}`);
      console.log(`     beforeSwap (bit 7): ${(lowBits & BEFORE_SWAP_FLAG) !== 0 ? '✓' : '✗'}`);
      console.log(`     beforeAddLiquidity (bit 11): ${(lowBits & BEFORE_ADD_LIQUIDITY_FLAG) !== 0 ? '✓' : '✗'}`);
      console.log(`     beforeRemoveLiquidity (bit 9): ${(lowBits & BEFORE_REMOVE_LIQUIDITY_FLAG) !== 0 ? '✓' : '✗'}`);

      // 保存结果
      fs.writeFileSync('.hook-address', `HOOK_SALT=${salt}\nHOOK_ADDRESS=${address}\n`);
      console.log();
      console.log('📄 已保存到 .hook-address');

      return { salt, address };
    }

    if (attempts % 100000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   尝试: ${attempts.toLocaleString()} (${elapsed}s)...`);
    }
  }

  throw new Error('挖掘失败');
}

mineHookAddress();
