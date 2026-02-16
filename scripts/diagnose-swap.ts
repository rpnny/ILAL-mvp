/**
 * Swap 问题全面诊断脚本
 */

import { createPublicClient, createWalletClient, http, parseUnits, encodeAbiParameters, hexToBigInt, keccak256, encodePacked, pad } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// 合约地址
const CONTRACTS = {
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
  simpleSwapRouter: '0x96ad5eAE7e5797e628F9d3FD21995dB19aE17d58',
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80',
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2',
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  weth: '0x4200000000000000000000000000000000000006',
};

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const SESSION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'isSessionActive',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'emergencyPaused',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const SIMPLE_SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swap',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [{ name: 'delta', type: 'int256' }],
    stateMutability: 'payable',
  },
] as const;

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Swap 问题全面诊断                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`User: ${account.address}`);
  console.log();

  // ========== 1. 检查余额 ==========
  console.log('【1/6】检查余额...');
  
  const ethBalance = await publicClient.getBalance({ address: account.address });
  const usdcBalance = await publicClient.readContract({
    address: CONTRACTS.usdc as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  const wethBalance = await publicClient.readContract({
    address: CONTRACTS.weth as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  console.log(`  ETH:  ${(Number(ethBalance) / 1e18).toFixed(6)}`);
  console.log(`  USDC: ${(Number(usdcBalance) / 1e6).toFixed(2)}`);
  console.log(`  WETH: ${(Number(wethBalance) / 1e18).toFixed(6)}`);
  
  if (usdcBalance < parseUnits('0.1', 6)) {
    console.log('  ❌ USDC 余额不足 0.1');
  } else {
    console.log('  ✅ 余额充足');
  }
  console.log();

  // ========== 2. 检查授权 ==========
  console.log('【2/6】检查授权...');
  
  const usdcAllowance = await publicClient.readContract({
    address: CONTRACTS.usdc as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, CONTRACTS.simpleSwapRouter as `0x${string}`],
  });

  console.log(`  USDC → SimpleSwapRouter: ${(Number(usdcAllowance) / 1e6).toFixed(2)}`);
  
  if (usdcAllowance < parseUnits('0.1', 6)) {
    console.log('  ❌ USDC 授权不足，需要先 approve');
  } else {
    console.log('  ✅ USDC 授权充足');
  }
  console.log();

  // ========== 3. 检查 Session ==========
  console.log('【3/6】检查 Session...');
  
  const isActive = await publicClient.readContract({
    address: CONTRACTS.sessionManager as `0x${string}`,
    abi: SESSION_MANAGER_ABI,
    functionName: 'isSessionActive',
    args: [account.address],
  });

  console.log(`  Session Active: ${isActive ? '✅ YES' : '❌ NO'}`);
  
  if (!isActive) {
    console.log('  ❌ Session 未激活，需要先完成身份验证');
  }
  console.log();

  // ========== 4. 检查紧急暂停 ==========
  console.log('【4/6】检查紧急暂停...');
  
  const paused = await publicClient.readContract({
    address: CONTRACTS.registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'emergencyPaused',
  });

  console.log(`  Emergency Paused: ${paused ? '❌ YES (BLOCKED)' : '✅ NO'}`);
  console.log();

  // ========== 5. 检查 Pool 状态 ==========
  console.log('【5/6】检查 Pool 状态...');
  
  const poolId = keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'uint24' },
        { type: 'int24' },
        { type: 'address' },
      ],
      [
        CONTRACTS.usdc as `0x${string}`,
        CONTRACTS.weth as `0x${string}`,
        10000,
        200,
        CONTRACTS.complianceHook as `0x${string}`,
      ]
    )
  );

  const POOLS_SLOT = pad('0x06', { size: 32 });
  const stateSlot = keccak256(encodePacked(['bytes32', 'bytes32'], [poolId, POOLS_SLOT]));
  
  const EXTSLOAD_ABI = [
    {
      type: 'function',
      name: 'extsload',
      inputs: [{ name: 'slot', type: 'bytes32' }],
      outputs: [{ name: 'value', type: 'bytes32' }],
      stateMutability: 'view',
    },
  ] as const;

  const rawSlot0 = await publicClient.readContract({
    address: CONTRACTS.poolManager as `0x${string}`,
    abi: EXTSLOAD_ABI,
    functionName: 'extsload',
    args: [stateSlot],
  });

  const dataBigInt = hexToBigInt(rawSlot0 as `0x${string}`);
  const sqrtPriceX96 = dataBigInt & ((1n << 160n) - 1n);
  
  const liquiditySlot = `0x${(BigInt(stateSlot) + 3n).toString(16).padStart(64, '0')}` as `0x${string}`;
  const rawLiquidity = await publicClient.readContract({
    address: CONTRACTS.poolManager as `0x${string}`,
    abi: EXTSLOAD_ABI,
    functionName: 'extsload',
    args: [liquiditySlot],
  });
  const liquidity = hexToBigInt(rawLiquidity as `0x${string}`);

  console.log(`  Pool ID: ${poolId.slice(0, 20)}...`);
  console.log(`  sqrtPriceX96: ${sqrtPriceX96 > 0n ? '✅ Initialized' : '❌ Not initialized'}`);
  console.log(`  Liquidity: ${liquidity.toString()}`);
  
  if (liquidity === 0n) {
    console.log('  ⚠️  Pool 没有流动性！');
  } else {
    console.log('  ✅ Pool 有流动性');
  }
  console.log();

  // ========== 6. 模拟 Swap ==========
  console.log('【6/6】模拟 Swap 交易...');
  
  const poolKey = {
    currency0: CONTRACTS.usdc,
    currency1: CONTRACTS.weth,
    fee: 10000,
    tickSpacing: 200,
    hooks: CONTRACTS.complianceHook,
  };

  const amountIn = parseUnits('0.1', 6); // 0.1 USDC
  const swapParams = {
    zeroForOne: true, // USDC → WETH
    amountSpecified: -amountIn, // 负数 = exact input
    sqrtPriceLimitX96: BigInt('4295128740'),
  };

  const mockDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const hookData = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bytes' },
    ],
    [account.address, mockDeadline, 0n, '0x' + '00'.repeat(65)]
  );

  console.log(`  Amount: 0.1 USDC → WETH`);
  console.log(`  Direction: USDC → WETH (zeroForOne = true)`);
  console.log(`  amountSpecified: ${swapParams.amountSpecified.toString()} (负数 = exact input)`);
  console.log();

  try {
    const result = await publicClient.simulateContract({
      address: CONTRACTS.simpleSwapRouter as `0x${string}`,
      abi: SIMPLE_SWAP_ROUTER_ABI,
      functionName: 'swap',
      args: [poolKey, swapParams, hookData],
      account: account.address,
      value: 0n,
    });

    console.log('  ✅ 模拟成功！Swap 应该能正常工作');
    console.log('  Result:', result.result?.toString());
  } catch (error: any) {
    console.log('  ❌ 模拟失败！');
    console.log();
    
    console.log('错误详情:');
    console.log('  Message:', error.shortMessage || error.message);
    
    if (error.data) {
      console.log('  Error Data:', error.data);
      console.log('  Error Signature:', error.data.slice(0, 10));
    }
    
    // 尝试解析 WrappedError
    if (error.message && error.message.includes('0x90bfb865')) {
      console.log();
      console.log('  🔍 检测到 WrappedError (ERC-7751)');
      console.log('  这是一个包装错误，底层有另一个错误');
      console.log('  需要解析完整的错误数据来找出真实原因');
    }
    
    // 打印完整错误（截断到合理长度）
    const errorStr = JSON.stringify(error, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
    
    if (errorStr.length < 3000) {
      console.log();
      console.log('完整错误JSON:');
      console.log(errorStr);
    }
  }

  console.log();
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    诊断完成                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
