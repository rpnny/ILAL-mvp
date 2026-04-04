import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { executeSwap, addLiquidity } = await import('./defi.controller.ts');
const { defiService } = await import('../services/defi.service.js');
const { prisma } = await import('../config/database.js');

const origSwap = defiService.swap.bind(defiService);
const origBuildAddLiquidityTx = defiService.buildAddLiquidityTx.bind(defiService);
const origInstitutionFindUnique = prisma.institution.findUnique.bind(prisma.institution);

afterEach(() => {
  defiService.swap = origSwap;
  defiService.buildAddLiquidityTx = origBuildAddLiquidityTx;
  prisma.institution.findUnique = origInstitutionFindUnique;
});

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
}

// Must use actual supported token addresses (whitelist is enforced)
const WETH  = '0x4200000000000000000000000000000000000006';
const tUSDC = '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D';

const validSwapBody = {
  tokenIn: WETH,
  tokenOut: tUSDC,
  amount: '1000000',
  zeroForOne: true,
  userAddress: '0x' + '3'.repeat(40),
};

const validLiquidityBody = {
  token0: WETH,
  token1: tUSDC,
  amount0: '1000000',
  amount1: '2000000',
  userAddress: '0x' + '3'.repeat(40),
};

// ── executeSwap ──

test('executeSwap returns unsigned transaction on success', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({ userId: 'user-1' } as any);
  defiService.swap = async () => ({
    success: true,
    transaction: { to: '0xrouter', data: '0xcalldata', value: '0x0', chainId: 84532, gas: '0x1E8480' },
    instructions: { description: 'Sign this', network: 'Base Sepolia', rpcUrl: '', explorerBase: '' },
    params: {},
  } as any);

  await executeSwap({ body: validSwapBody, apiKey: { userId: 'user-1' } } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).success, true);
  assert.ok((res.body as any).transaction);
  assert.equal((res.body as any).signerRequirement.mode, 'msg.sender');
});

test('executeSwap returns 400 when service returns failure', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({ userId: 'user-1' } as any);
  defiService.swap = async () => ({ success: false, error: 'Pool not found' } as any);

  await executeSwap({ body: validSwapBody, apiKey: { userId: 'user-1' } } as any, res as any);
  assert.equal(res.statusCode, 400);
  assert.equal((res.body as any).success, false);
});

test('executeSwap returns 403 when userAddress belongs to another account', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({ userId: 'user-2' } as any);

  await executeSwap({ body: validSwapBody, apiKey: { userId: 'user-1' } } as any, res as any);
  assert.equal(res.statusCode, 403);
  assert.equal((res.body as any).code, 'INSTITUTION_OWNERSHIP_MISMATCH');
});

test('executeSwap rejects invalid tokenIn address', async () => {
  const res = createMockResponse();
  await executeSwap({ body: { ...validSwapBody, tokenIn: 'not-an-address' } } as any, res as any);
  assert.equal(res.statusCode, 400);
  assert.ok((res.body as any).details);
});

test('executeSwap rejects missing amount', async () => {
  const res = createMockResponse();
  const { amount, ...incomplete } = validSwapBody;
  await executeSwap({ body: incomplete } as any, res as any);
  assert.equal(res.statusCode, 400);
});

test('executeSwap accepts missing zeroForOne (auto-derived)', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({ userId: 'user-1' } as any);
  defiService.swap = async () => ({
    success: true,
    transaction: { to: '0xrouter', data: '0xcalldata', value: '0x0', chainId: 84532, gas: '0x1E8480' },
    instructions: { description: 'Sign this', network: 'Base Sepolia', rpcUrl: '', explorerBase: '' },
    params: {},
  } as any);
  const { zeroForOne, ...body } = validSwapBody;
  await executeSwap({ body, apiKey: { userId: 'user-1' } } as any, res as any);
  assert.equal(res.statusCode, 200);
});

// ── addLiquidity ──

test('addLiquidity returns unsigned transaction on success', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({ userId: 'user-1' } as any);
  defiService.buildAddLiquidityTx = async () => ({
    success: true,
    transaction: { to: '0xpm', data: '0x', value: '0x0', chainId: 84532, gas: '0x4C4B40' },
    instructions: {},
    params: {},
  } as any);

  await addLiquidity({ body: validLiquidityBody, apiKey: { userId: 'user-1' } } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).success, true);
});

test('addLiquidity returns 400 when service fails', async () => {
  const res = createMockResponse();
  defiService.buildAddLiquidityTx = async () => ({ success: false, error: 'fail' } as any);

  await addLiquidity({ body: validLiquidityBody } as any, res as any);
  assert.equal(res.statusCode, 400);
});

test('addLiquidity rejects invalid token address', async () => {
  const res = createMockResponse();
  await addLiquidity({ body: { ...validLiquidityBody, token0: 'bad' } } as any, res as any);
  assert.equal(res.statusCode, 400);
});

test('addLiquidity accepts optional tick parameters', async () => {
  const res = createMockResponse();
  defiService.buildAddLiquidityTx = async () => ({
    success: true, transaction: {}, instructions: {}, params: {},
  } as any);

  await addLiquidity({
    body: { ...validLiquidityBody, tickLower: -887220, tickUpper: 887220 },
  } as any, res as any);
  assert.equal(res.statusCode, 200);
});
