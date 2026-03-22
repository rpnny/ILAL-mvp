/**
 * 解析 WrappedError (ERC-7751) 的详细参数
 */

import { createPublicClient, http, parseUnits, encodeAbiParameters, decodeErrorResult } from 'viem';
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

// 合约地址
const CONTRACTS = {
  simpleSwapRouter: '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891',
  complianceHook: '0xe633220f15932428FcA60A1A2C2C48797A180A80',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  weth: '0x4200000000000000000000000000000000000006',
};

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
  {
    type: 'error',
    name: 'InsufficientOutput',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnauthorizedCallback',
    inputs: [],
  },
] as const;

// WrappedError ABI
const WRAPPED_ERROR_ABI = [
  {
    type: 'error',
    name: 'WrappedError',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'selector', type: 'bytes4' },
      { name: 'reason', type: 'bytes' },
      { name: 'details', type: 'bytes' },
    ],
  },
] as const;

async function main() {
  console.log('解析 WrappedError 详细参数...\n');

  const poolKey = {
    currency0: CONTRACTS.usdc,
    currency1: CONTRACTS.weth,
    fee: 10000,
    tickSpacing: 200,
    hooks: CONTRACTS.complianceHook,
  };

  const amountIn = parseUnits('0.1', 6);
  const swapParams = {
    zeroForOne: true,
    amountSpecified: -amountIn,
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

  try {
    await publicClient.simulateContract({
      address: CONTRACTS.simpleSwapRouter as `0x${string}`,
      abi: SIMPLE_SWAP_ROUTER_ABI,
      functionName: 'swap',
      args: [poolKey, swapParams, hookData],
      account: account.address,
      value: 0n,
    });

    console.log('✅ Swap 成功');
  } catch (error: any) {
    console.log('❌ Swap 失败\n');

    // 获取原始错误数据
    let errorData = error.data;
    
    // 如果 error.data 不存在，尝试从其他地方获取
    if (!errorData && error.cause && error.cause.data) {
      errorData = error.cause.data;
    }

    if (!errorData && error.details) {
      errorData = error.details;
    }

    console.log('原始错误:', error.shortMessage || error.message);
    console.log();

    if (errorData) {
      console.log('Error Data:', errorData);
      console.log('Error Signature:', typeof errorData === 'string' ? errorData.slice(0, 10) : 'N/A');
      console.log();

      // 尝试解析 WrappedError
      if (typeof errorData === 'string' && errorData.startsWith('0x90bfb865')) {
        console.log('🔍 解析 WrappedError...\n');

        try {
          const decoded = decodeErrorResult({
            abi: WRAPPED_ERROR_ABI,
            data: errorData as `0x${string}`,
          });

          console.log('Decoded WrappedError:');
          console.log('  Error Name:', decoded.errorName);
          console.log('  Args:', decoded.args);
          
          if (decoded.args && Array.isArray(decoded.args)) {
            const [target, selector, reason, details] = decoded.args as [string, string, string, string];
            
            console.log();
            console.log('WrappedError 参数:');
            console.log('  Target (触发错误的合约):', target);
            console.log('  Selector (函数选择器):', selector);
            console.log('  Reason (原始 revert data):', reason);
            console.log('  Details (额外上下文):', details);
            
            // 尝试解析 reason 中的错误签名
            if (reason && reason.length >= 10) {
              const innerErrorSig = reason.slice(0, 10);
              console.log();
              console.log('🎯 真实的底层错误签名:', innerErrorSig);
              
              // 常见错误签名映射
              const ERROR_SIGS: { [key: string]: string } = {
                '0xb12c8f91': 'NotVerified(address)',
                '0x1fd05a4a': 'SessionExpired()',
                '0x4cb3183d': 'EmergencyPaused()',
                '0xf5c6c81a': 'UnauthorizedCallback()',
                '0xbb2875c3': 'InsufficientOutput()',
                '0x756688fe': 'InvalidNonce()',
                '0x815e1d64': 'InvalidSigner()',
                '0x82b42900': 'Unauthorized()',
                '0x49eddebb': 'CurrenciesNotSettled()',
                '0xb6c697c9': 'NonzeroDeltaCount()',
                '0x54e3ca0d': 'ManagerLocked()',
                '0xf645eedf': 'ECDSAInvalidSignature()',
                '0x8baa579f': 'InvalidSignature()',
                '0x0819bdcd': 'SignatureExpired()',
              };

              if (ERROR_SIGS[innerErrorSig]) {
                console.log('  ✅ 识别为:', ERROR_SIGS[innerErrorSig]);
              } else {
                console.log('  ⚠️  未知错误签名，需要查询 4byte.directory');
              }
            }
          }
        } catch (decodeError: any) {
          console.log('❌ 解析 WrappedError 失败:', decodeError.message);
        }
      } else {
        console.log('⚠️  不是 WrappedError，或者无法获取完整的 error data');
      }
    } else {
      console.log('⚠️  无法获取错误数据');
    }

    // 打印完整错误对象（用于调试）
    console.log('\n' + '='.repeat(60));
    console.log('完整错误对象:');
    console.log('='.repeat(60));
    
    const errorObj = {
      message: error.message,
      shortMessage: error.shortMessage,
      data: error.data,
      cause: error.cause ? {
        message: error.cause.message,
        data: error.cause.data,
      } : undefined,
    };
    
    console.log(JSON.stringify(errorObj, null, 2));
  }
}

main().catch(console.error);
