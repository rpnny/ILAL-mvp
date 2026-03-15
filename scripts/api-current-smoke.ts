import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const HARDHAT_1_PK =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;

// Fresh pool from a successful live integration run.
const TOKEN0 = '0x37dba33950e6a4dedf6e1006217d43deb25c636b' as Address;
const TOKEN1 = '0x65778f0ac986659c896158432f0a0f635995b0f1' as Address;

const account = privateKeyToAccount(HARDHAT_1_PK);
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

async function api<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({})) as T;
  return { status: res.status, data };
}

async function main() {
  const email = `inst_api_${Date.now()}@ilal.test`;
  const password = 'InstitutionPass123!@#';

  console.log('=== API Current Smoke ===');
  console.log('wallet:', account.address);

  const health = await api<any>('GET', '/health');
  console.log('health:', health.status, health.data.status, health.data.blockchain?.connected);

  const register = await api<any>('POST', '/auth/register', {
    email,
    password,
    name: 'Institution API Smoke',
  });
  const jwt = register.data.accessToken;
  console.log('register:', register.status, Boolean(jwt));

  const me = await api<any>('GET', '/auth/me', undefined, {
    Authorization: `Bearer ${jwt}`,
  });
  console.log('auth/me:', me.status, me.data.user?.email || me.data.email);

  const apiKeyCreate = await api<any>('POST', '/apikeys', {
    name: 'Smoke Key',
  }, {
    Authorization: `Bearer ${jwt}`,
  });
  const apiKey = apiKeyCreate.data.key || apiKeyCreate.data.apiKey;
  console.log('apikey:', apiKeyCreate.status, String(apiKey).slice(0, 18));

  const session = await api<any>('GET', `/session/${account.address}`);
  console.log('session:', session.status, session.data.isActive, session.data.remainingSeconds);

  const buildSwap = await api<any>('POST', '/defi/swap', {
    tokenIn: TOKEN0,
    tokenOut: TOKEN1,
    amount: (10n * 10n ** 18n).toString(),
    zeroForOne: true,
    userAddress: account.address,
  }, {
    'X-API-Key': apiKey,
  });
  console.log('buildSwap:', buildSwap.status, buildSwap.data.success, buildSwap.data.transaction?.to);

  const buildLiquidity = await api<any>('POST', '/defi/liquidity', {
    token0: TOKEN0,
    token1: TOKEN1,
    amount0: (1n * 10n ** 18n).toString(),
    amount1: (1n * 10n ** 18n).toString(),
    tickLower: -600,
    tickUpper: 600,
    userAddress: account.address,
  }, {
    'X-API-Key': apiKey,
  });
  console.log('buildLiquidity:', buildLiquidity.status, buildLiquidity.data.success, buildLiquidity.data.transaction?.to);

  const hash = await walletClient.sendTransaction({
    account,
    to: buildSwap.data.transaction.to as Address,
    data: buildSwap.data.transaction.data as Hex,
    value: BigInt(buildSwap.data.transaction.value || 0),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('swapTx:', receipt.status, hash, receipt.gasUsed.toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
