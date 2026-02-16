/**
 * 用 eth_call 获取原始 revert data 并解析
 */

import { createPublicClient, http, parseUnits, encodeAbiParameters, encodeFunctionData, decodeAbiParameters, slice } from 'viem';
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

const CONTRACTS = {
  simpleSwapRouter: '0x96ad5eAE7e5797e628F9d3FD21995dB19aE17d58',
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80',
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
] as const;

// 常见错误签名映射
const ERROR_SIGS: { [key: string]: { name: string; params: any[] } } = {
  '0xb12c8f91': { name: 'NotVerified(address)', params: [{ type: 'address' }] },
  '0x1fd05a4a': { name: 'SessionExpired()', params: [] },
  '0x4cb3183d': { name: 'EmergencyPaused()', params: [] },
  '0xf5c6c81a': { name: 'UnauthorizedCallback()', params: [] },
  '0xbb2875c3': { name: 'InsufficientOutput()', params: [] },
  '0x756688fe': { name: 'InvalidNonce()', params: [] },
  '0x815e1d64': { name: 'InvalidSigner()', params: [] },
  '0x82b42900': { name: 'Unauthorized()', params: [] },
  '0x49eddebb': { name: 'CurrenciesNotSettled()', params: [] },
  '0xb6c697c9': { name: 'NonzeroDeltaCount()', params: [] },
  '0x54e3ca0d': { name: 'ManagerLocked()', params: [] },
  '0xf645eedf': { name: 'ECDSAInvalidSignature()', params: [] },
  '0x8baa579f': { name: 'InvalidSignature()', params: [] },
  '0x0819bdcd': { name: 'SignatureExpired()', params: [] },
};

async function main() {
  console.log('使用 eth_call 获取原始 revert data...\n');

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

  // 编码函数调用
  const callData = encodeFunctionData({
    abi: SIMPLE_SWAP_ROUTER_ABI,
    functionName: 'swap',
    args: [poolKey, swapParams, hookData],
  });

  console.log('Call Data:', callData.slice(0, 100) + '...');
  console.log();

  try {
    // 使用 eth_call
    const result = await publicClient.request({
      method: 'eth_call',
      params: [
        {
          from: account.address,
          to: CONTRACTS.simpleSwapRouter as `0x${string}`,
          data: callData,
          value: '0x0',
        },
        'latest',
      ],
    });

    console.log('✅ 调用成功:', result);
  } catch (error: any) {
    console.log('❌ 调用失败\n');

    // 从错误中提取 revert data
    let revertData: string | undefined;

    if (error.data) {
      revertData = error.data;
    } else if (error.details && typeof error.details === 'string') {
      // 尝试从 details 中提取
      const match = error.details.match(/0x[0-9a-fA-F]+/);
      if (match) {
        revertData = match[0];
      }
    }

    console.log('原始错误:', error.message || error);
    console.log();

    if (revertData) {
      console.log('🔍 Revert Data:', revertData);
      console.log('长度:', revertData.length, '字符');
      console.log();

      // 获取错误签名
      const errorSig = revertData.slice(0, 10);
      console.log('错误签名:', errorSig);

      // 检查是否是 WrappedError (0x90bfb865)
      if (errorSig === '0x90bfb865') {
        console.log('✅ 这是 WrappedError!');
        console.log();

        try {
          // WrappedError(address target, bytes4 selector, bytes reason, bytes details)
          const decoded = decodeAbiParameters(
            [
              { type: 'address', name: 'target' },
              { type: 'bytes4', name: 'selector' },
              { type: 'bytes', name: 'reason' },
              { type: 'bytes', name: 'details' },
            ],
            slice(revertData as `0x${string}`, 4) // 跳过函数签名
          );

          console.log('WrappedError 参数:');
          console.log('  Target (触发错误的合约):', decoded[0]);
          console.log('  Selector (函数选择器):', decoded[1]);
          console.log('  Reason (原始 revert data):', decoded[2]);
          console.log('  Details (额外上下文):', decoded[3]);
          console.log();

          // 解析 reason 中的真实错误
          const reason = decoded[2] as `0x${string}`;
          if (reason.length >= 10) {
            const innerErrorSig = reason.slice(0, 10);
            console.log('🎯 真实的底层错误签名:', innerErrorSig);

            if (ERROR_SIGS[innerErrorSig]) {
              const errorInfo = ERROR_SIGS[innerErrorSig];
              console.log('  ✅ 识别为:', errorInfo.name);

              // 如果有参数，解析它们
              if (errorInfo.params.length > 0) {
                try {
                  const params = decodeAbiParameters(
                    errorInfo.params,
                    slice(reason, 4)
                  );
                  console.log('  参数:', params);
                } catch (e) {
                  console.log('  (无法解析参数)');
                }
              }
            } else {
              console.log('  ⚠️  未知错误，查询 https://4byte.directory/api/v1/signatures/?hex_signature=' + innerErrorSig);
            }

            // 打印完整的 reason bytes（可能包含额外信息）
            if (reason.length > 10) {
              console.log();
              console.log('完整 Reason Bytes:', reason);
            }
          }
        } catch (decodeError: any) {
          console.log('❌ 解析 WrappedError 失败:', decodeError.message);
          console.log();
          console.log('完整 revert data:', revertData);
        }
      } else {
        // 不是 WrappedError，直接解析
        console.log('这不是 WrappedError');
        
        if (ERROR_SIGS[errorSig]) {
          const errorInfo = ERROR_SIGS[errorSig];
          console.log('✅ 识别为:', errorInfo.name);

          if (errorInfo.params.length > 0) {
            try {
              const params = decodeAbiParameters(
                errorInfo.params,
                slice(revertData as `0x${string}`, 4)
              );
              console.log('参数:', params);
            } catch (e) {
              console.log('(无法解析参数)');
            }
          }
        } else {
          console.log('⚠️  未知错误签名');
        }
      }
    } else {
      console.log('⚠️  无法获取 revert data');
      console.log('完整错误对象:');
      console.log(JSON.stringify(error, null, 2).slice(0, 2000));
    }
  }
}

main().catch(console.error);
