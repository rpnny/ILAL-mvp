import {
  decodeFunctionData,
  parseAbi,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';

export type UnsignedTransaction = {
  to: string;
  data: Hex;
  value: string;
  chainId: number;
  gas: string;
};

export type SwapRequest = {
  tokenIn: Address;
  tokenOut: Address;
  amount: string;
  zeroForOne: boolean;
};

export type LiquidityRequest = {
  token0: Address;
  token1: Address;
  amount0: string;
  amount1: string;
  tickLower?: number;
  tickUpper?: number;
};

const DEFAULT_ADDRESSES = {
  swapRouter: (process.env.SIMPLE_SWAP_ROUTER_ADDRESS ||
    '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891') as Address,
  positionManager: (process.env.POSITION_MANAGER_ADDRESS ||
    '0x692548a6E1797d2762b9d04f29112C172E5Cea32') as Address,
  complianceHook: (process.env.COMPLIANCE_HOOK_ADDRESS ||
    '0xe633220f15932428FcA60A1A2C2C48797A180A80') as Address,
} as const;

const routerAbi = parseAbi([
  'function swap((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key,(bool zeroForOne,int256 amountSpecified,uint160 sqrtPriceLimitX96) params,bytes hookData,uint128 minAmountOut)',
]);

const positionManagerAbi = parseAbi([
  'function mint((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,int24 tickLower,int24 tickUpper,uint128 liquidity,bytes hookData)',
]);

function normalizeAddress(address: string): Address {
  return address.toLowerCase() as Address;
}

function sortAddresses(a: Address, b: Address): [Address, Address] {
  return normalizeAddress(a) < normalizeAddress(b)
    ? [normalizeAddress(a), normalizeAddress(b)]
    : [normalizeAddress(b), normalizeAddress(a)];
}

function toBigInt(value: bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

function assertBaseSepoliaTx(tx: UnsignedTransaction) {
  if (tx.chainId !== baseSepolia.id) {
    throw new Error(`Unexpected chainId ${tx.chainId}; expected ${baseSepolia.id}`);
  }
  if (BigInt(tx.value) !== 0n) {
    throw new Error(`Unexpected transaction value ${tx.value}; expected 0`);
  }
}

export function assertTrustedApiBaseUrl(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl);
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !isLocalhost) {
    throw new Error(`Refusing insecure API base URL: ${apiBaseUrl}`);
  }
}

export function assertUnsignedSwapTxMatchesRequest(
  tx: UnsignedTransaction,
  request: SwapRequest,
  expected = DEFAULT_ADDRESSES
) {
  assertBaseSepoliaTx(tx);

  if (normalizeAddress(tx.to) !== normalizeAddress(expected.swapRouter)) {
    throw new Error(`Unexpected swap router ${tx.to}`);
  }

  const decoded = decodeFunctionData({
    abi: routerAbi,
    data: tx.data,
  });

  if (decoded.functionName !== 'swap') {
    throw new Error(`Unexpected router function ${String(decoded.functionName)}`);
  }

  const [key, params, hookData] = decoded.args as any[];
  const [expectedCurrency0, expectedCurrency1] = sortAddresses(request.tokenIn, request.tokenOut);

  if (normalizeAddress(key.currency0) !== expectedCurrency0) {
    throw new Error(`Unexpected currency0 ${key.currency0}`);
  }
  if (normalizeAddress(key.currency1) !== expectedCurrency1) {
    throw new Error(`Unexpected currency1 ${key.currency1}`);
  }
  if (key.fee !== 500 || key.tickSpacing !== 10) {
    throw new Error(`Unexpected pool config fee=${key.fee} tickSpacing=${key.tickSpacing}`);
  }
  if (normalizeAddress(key.hooks) !== normalizeAddress(expected.complianceHook)) {
    throw new Error(`Unexpected compliance hook ${key.hooks}`);
  }

  if (params.zeroForOne !== request.zeroForOne) {
    throw new Error('Unexpected swap direction in returned calldata');
  }
  if (params.amountSpecified !== -BigInt(request.amount)) {
    throw new Error(`Unexpected amountSpecified ${params.amountSpecified}`);
  }
  if (hookData !== '0x') {
    throw new Error('Unexpected hookData in unsigned swap transaction');
  }
}

export function assertUnsignedLiquidityTxMatchesRequest(
  tx: UnsignedTransaction,
  request: LiquidityRequest,
  expected = DEFAULT_ADDRESSES
) {
  assertBaseSepoliaTx(tx);

  if (normalizeAddress(tx.to) !== normalizeAddress(expected.positionManager)) {
    throw new Error(`Unexpected position manager ${tx.to}`);
  }

  const decoded = decodeFunctionData({
    abi: positionManagerAbi,
    data: tx.data,
  });

  if (decoded.functionName !== 'mint') {
    throw new Error(`Unexpected position manager function ${String(decoded.functionName)}`);
  }

  const [poolKey, tickLower, tickUpper, liquidity, hookData] = decoded.args as any[];

  if (normalizeAddress(poolKey.currency0) !== normalizeAddress(request.token0)) {
    throw new Error(`Unexpected liquidity token0 ${poolKey.currency0}`);
  }
  if (normalizeAddress(poolKey.currency1) !== normalizeAddress(request.token1)) {
    throw new Error(`Unexpected liquidity token1 ${poolKey.currency1}`);
  }
  if (poolKey.fee !== 500 || poolKey.tickSpacing !== 10) {
    throw new Error(`Unexpected pool config fee=${poolKey.fee} tickSpacing=${poolKey.tickSpacing}`);
  }
  if (normalizeAddress(poolKey.hooks) !== normalizeAddress(expected.complianceHook)) {
    throw new Error(`Unexpected compliance hook ${poolKey.hooks}`);
  }

  if (toBigInt(tickLower) !== BigInt(request.tickLower ?? -600)) {
    throw new Error(`Unexpected tickLower ${tickLower}`);
  }
  if (toBigInt(tickUpper) !== BigInt(request.tickUpper ?? 600)) {
    throw new Error(`Unexpected tickUpper ${tickUpper}`);
  }
  const expectedLiquidity = BigInt(request.amount0) > BigInt(request.amount1)
    ? BigInt(request.amount0)
    : BigInt(request.amount1);
  if (liquidity !== expectedLiquidity) {
    throw new Error(`Unexpected liquidity ${liquidity}`);
  }
  if (hookData !== '0x') {
    throw new Error('Unexpected hookData in liquidity transaction');
  }
}
