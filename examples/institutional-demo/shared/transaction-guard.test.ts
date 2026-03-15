import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeFunctionData } from 'viem';
import {
  assertTrustedApiBaseUrl,
  assertUnsignedLiquidityTxMatchesRequest,
  assertUnsignedSwapTxMatchesRequest,
} from './transaction-guard';

const swapRouter = '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891';
const positionManager = '0x692548a6E1797d2762b9d04f29112C172E5Cea32';
const complianceHook = '0xe633220f15932428FcA60A1A2C2C48797A180A80';
const usdc = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const weth = '0x4200000000000000000000000000000000000006';

test('assertTrustedApiBaseUrl rejects insecure non-local URLs', () => {
  assert.throws(() => assertTrustedApiBaseUrl('http://evil.example.com'));
  assert.doesNotThrow(() => assertTrustedApiBaseUrl('http://127.0.0.1:3001'));
  assert.doesNotThrow(() => assertTrustedApiBaseUrl('https://ilal.tech'));
});

test('assertUnsignedSwapTxMatchesRequest accepts expected swap calldata', () => {
  const data = encodeFunctionData({
    abi: [
      {
        type: 'function',
        name: 'swap',
        stateMutability: 'payable',
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
          { name: 'minAmountOut', type: 'uint128' },
        ],
        outputs: [{ name: 'delta', type: 'int256' }],
      },
    ] as const,
    functionName: 'swap',
    args: [
      {
        currency0: usdc,
        currency1: weth,
        fee: 500,
        tickSpacing: 10,
        hooks: complianceHook,
      },
      {
        zeroForOne: true,
        amountSpecified: -1000n,
        sqrtPriceLimitX96: 4295128740n,
      },
      '0x',
      995n,
    ],
  });

  assert.doesNotThrow(() => assertUnsignedSwapTxMatchesRequest({
    to: swapRouter,
    data,
    value: '0x0',
    chainId: 84532,
    gas: '0x1E8480',
  }, {
    tokenIn: usdc as `0x${string}`,
    tokenOut: weth as `0x${string}`,
    amount: '1000',
    zeroForOne: true,
  }));
});

test('assertUnsignedSwapTxMatchesRequest rejects wrong router target', () => {
  const data = '0x12345678' as `0x${string}`;
  assert.throws(() => assertUnsignedSwapTxMatchesRequest({
    to: positionManager,
    data,
    value: '0x0',
    chainId: 84532,
    gas: '0x1',
  }, {
    tokenIn: usdc as `0x${string}`,
    tokenOut: weth as `0x${string}`,
    amount: '1000',
    zeroForOne: true,
  }));
});

test('assertUnsignedLiquidityTxMatchesRequest accepts expected mint calldata', () => {
  const data = encodeFunctionData({
    abi: [
      {
        type: 'function',
        name: 'mint',
        stateMutability: 'payable',
        inputs: [
          {
            name: 'poolKey',
            type: 'tuple',
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ],
          },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'hookData', type: 'bytes' },
        ],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
      },
    ] as const,
    functionName: 'mint',
    args: [
      {
        currency0: usdc,
        currency1: weth,
        fee: 500,
        tickSpacing: 10,
        hooks: complianceHook,
      },
      -600,
      600,
      2000n,
      '0x',
    ],
  });

  assert.doesNotThrow(() => assertUnsignedLiquidityTxMatchesRequest({
    to: positionManager,
    data,
    value: '0x0',
    chainId: 84532,
    gas: '0x4C4B40',
  }, {
    token0: usdc as `0x${string}`,
    token1: weth as `0x${string}`,
    amount0: '1000',
    amount1: '2000',
  }));
});
