import { createPublicClient, http, encodeAbiParameters, decodeErrorResult, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = '/Users/ronny/Desktop/ilal';
const envRaw = fs.readFileSync(path.join(ROOT, 'apps/api/.env'), 'utf8');

function env(key: string): string {
  const match = envRaw.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'));
  if (!match) throw new Error(`Missing env key: ${key}`);
  return match[1].trim();
}

const CONTRACTS = {
  complianceHook: env('COMPLIANCE_HOOK_ADDRESS') as Address,
  swapRouter: env('SIMPLE_SWAP_ROUTER_ADDRESS') as Address,
  sessionManager: env('SESSION_MANAGER_ADDRESS') as Address,
};

const HARDHAT_1_PK =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;
const account = privateKeyToAccount(HARDHAT_1_PK);

// Fresh pool from the latest live run.
const TOKEN0 = '0x37dba33950e6a4dedf6e1006217d43deb25c636b' as Address;
const TOKEN1 = '0x65778f0ac986659c896158432f0a0f635995b0f1' as Address;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

const hookAbi = [
  {
    type: 'function',
    name: 'getNonce',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDomainSeparator',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SWAP_PERMIT_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'verifySwapPermitView',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const sessionAbi = [
  {
    type: 'function',
    name: 'isSessionActive',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const routerAbi = [
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
] as const;

const wrappedErrorAbi = [
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

const knownInnerErrors = [
  { type: 'error', name: 'NotVerified', inputs: [{ name: 'user', type: 'address' }] },
  { type: 'error', name: 'RouterNotApproved', inputs: [{ name: 'router', type: 'address' }] },
  { type: 'error', name: 'InvalidHookData', inputs: [] },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  { type: 'error', name: 'InvalidNonce', inputs: [] },
  { type: 'error', name: 'SignatureExpired', inputs: [] },
  { type: 'error', name: 'EmergencyPaused', inputs: [] },
] as const;

async function main() {
  const [nonce, domainSeparator, typehash] = await Promise.all([
    publicClient.readContract({
      address: CONTRACTS.complianceHook,
      abi: hookAbi,
      functionName: 'getNonce',
      args: [account.address],
    }),
    publicClient.readContract({
      address: CONTRACTS.complianceHook,
      abi: hookAbi,
      functionName: 'getDomainSeparator',
    }),
    publicClient.readContract({
      address: CONTRACTS.complianceHook,
      abi: hookAbi,
      functionName: 'SWAP_PERMIT_TYPEHASH',
    }),
  ]);

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const { concat, keccak256 } = await import('viem');

  const structHash = keccak256(encodeAbiParameters(
    [
      { type: 'bytes32' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
    ],
    [typehash, account.address, deadline, nonce]
  ));
  const digest = keccak256(concat(['0x1901', domainSeparator, structHash]));
  const signature = await account.sign({ hash: digest });

  const hookData = encodeAbiParameters(
    [{
      type: 'tuple',
      components: [
        { name: 'user', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ],
    }],
    [{ user: account.address, deadline, nonce, signature }]
  );

  const [isValidPermit, isActiveSession] = await Promise.all([
    publicClient.readContract({
      address: CONTRACTS.complianceHook,
      abi: hookAbi,
      functionName: 'verifySwapPermitView',
      args: [account.address, deadline, nonce, signature],
    }),
    publicClient.readContract({
      address: CONTRACTS.sessionManager,
      abi: sessionAbi,
      functionName: 'isSessionActive',
      args: [account.address],
    }),
  ]);

  console.log('verifySwapPermitView:', isValidPermit);
  console.log('isSessionActive:', isActiveSession);

  try {
    await publicClient.simulateContract({
      address: CONTRACTS.swapRouter,
      abi: routerAbi,
      functionName: 'swap',
      args: [
        {
          currency0: TOKEN0,
          currency1: TOKEN1,
          fee: 500,
          tickSpacing: 10,
          hooks: CONTRACTS.complianceHook,
        },
        {
          zeroForOne: true,
          amountSpecified: -(100n * 10n ** 18n),
          sqrtPriceLimitX96: 4295128739n + 1n,
        },
        hookData,
        0n,
      ],
      account: account.address,
    });
    console.log('simulate ok');
  } catch (error: any) {
    const raw = error?.cause?.raw || error?.cause?.data || error?.data || error?.details;
    console.log('outer:', error?.shortMessage || error?.message);
    console.log('raw:', raw);
    console.dir(error, { depth: 8 });

    if (typeof raw === 'string' && raw.startsWith('0x90bfb865')) {
      const decoded = decodeErrorResult({
        abi: wrappedErrorAbi,
        data: raw as Hex,
      });
      console.log('wrapped:', decoded);

      const reason = Array.isArray(decoded.args) ? decoded.args[2] : undefined;
      const details = Array.isArray(decoded.args) ? decoded.args[3] : undefined;
      if (typeof reason === 'string' && reason.startsWith('0x') && reason !== '0x') {
        try {
          const inner = decodeErrorResult({
            abi: knownInnerErrors,
            data: reason as Hex,
          });
          console.log('inner:', inner);
        } catch {
          console.log('inner selector:', reason.slice(0, 10));
          console.log('inner raw:', reason);
        }
      }
      if (typeof details === 'string' && details.startsWith('0x') && details !== '0x') {
        try {
          const inner = decodeErrorResult({
            abi: knownInnerErrors,
            data: details as Hex,
          });
          console.log('details decoded:', inner);
        } catch {
          console.log('details selector:', details.slice(0, 10));
          console.log('details raw:', details);
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
