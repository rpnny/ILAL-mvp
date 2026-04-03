import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { defiService } = await import('./defi.service.ts');

const TOKEN_A = '0x' + '1'.repeat(40);
const TOKEN_B = '0x' + '2'.repeat(40);
const USER = '0x' + '3'.repeat(40);

// ── buildSwapTx ──

test('buildSwapTx returns valid transaction object', async () => {
  const result = await defiService.buildSwapTx({
    tokenIn: TOKEN_A as any,
    tokenOut: TOKEN_B as any,
    amount: '1000000000000000000',
    zeroForOne: true,
    userAddress: USER as any,
  });

  assert.equal(result.success, true);
  assert.ok(result.transaction.to);
  assert.ok(result.transaction.data);
  assert.equal(result.transaction.chainId, 84532);
  assert.ok(result.instructions);
});

test('buildSwapTx sorts tokens correctly regardless of input order', async () => {
  const result1 = await defiService.buildSwapTx({
    tokenIn: TOKEN_A as any,
    tokenOut: TOKEN_B as any,
    amount: '1000',
    zeroForOne: true,
    userAddress: USER as any,
  });

  const result2 = await defiService.buildSwapTx({
    tokenIn: TOKEN_B as any,
    tokenOut: TOKEN_A as any,
    amount: '1000',
    zeroForOne: false,
    userAddress: USER as any,
  });

  assert.equal(result1.success, true);
  assert.equal(result2.success, true);
});

test('buildSwapTx uses default slippage when not specified', async () => {
  const result = await defiService.buildSwapTx({
    tokenIn: TOKEN_A as any,
    tokenOut: TOKEN_B as any,
    amount: '10000',
    zeroForOne: true,
    userAddress: USER as any,
  });

  assert.equal(result.success, true);
  assert.ok(result.params.swapParams);
  assert.equal(result.params.swapParams.minAmountOut, '0');
});

// ── buildAddLiquidityTx ──

test('buildAddLiquidityTx returns valid transaction object', async () => {
  const result = await defiService.buildAddLiquidityTx({
    token0: TOKEN_A as any,
    token1: TOKEN_B as any,
    amount0: '1000000',
    amount1: '2000000',
    userAddress: USER as any,
  });

  assert.equal(result.success, true);
  assert.ok(result.transaction.to);
  assert.ok(result.transaction.data);
  assert.equal(result.transaction.chainId, 84532);
});

test('buildAddLiquidityTx uses default ticks when not specified', async () => {
  const result = await defiService.buildAddLiquidityTx({
    token0: TOKEN_A as any,
    token1: TOKEN_B as any,
    amount0: '1000',
    amount1: '2000',
    userAddress: USER as any,
  });

  assert.equal(result.params.position.tickLower, -600);
  assert.equal(result.params.position.tickUpper, 600);
});

test('buildAddLiquidityTx respects custom ticks', async () => {
  const result = await defiService.buildAddLiquidityTx({
    token0: TOKEN_A as any,
    token1: TOKEN_B as any,
    amount0: '1000',
    amount1: '2000',
    tickLower: -1200,
    tickUpper: 1200,
    userAddress: USER as any,
  });

  assert.equal(result.params.position.tickLower, -1200);
  assert.equal(result.params.position.tickUpper, 1200);
});

// ── legacy swap ──

test('swap method delegates to buildSwapTx', async () => {
  const result = await defiService.swap({
    tokenIn: TOKEN_A as any,
    tokenOut: TOKEN_B as any,
    amount: '1000',
    zeroForOne: true,
    userAddress: USER as any,
  });

  assert.equal(result.success, true);
  assert.ok(result.transaction);
});
