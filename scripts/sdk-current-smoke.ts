import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { ILALClient } from '../packages/sdk/dist/index.mjs';

const HARDHAT_1_PK =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;

// Fresh pool from a successful live integration run.
const TOKEN0 = '0x37dba33950e6a4dedf6e1006217d43deb25c636b' as Address;
const TOKEN1 = '0x65778f0ac986659c896158432f0a0f635995b0f1' as Address;

async function main() {
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

  const client = new ILALClient({
    walletClient,
    publicClient: publicClient as any,
    chainId: 84532,
  });

  console.log('=== SDK Current Smoke ===');
  console.log('wallet:', account.address);

  const health = await client.healthCheck();
  console.log('health:', health.healthy, health.checks);

  const session = await client.session.getInfo();
  console.log('session:', session.isActive, session.remainingTime.toString());

  const mode2 = await client.swap.execute({
    tokenIn: TOKEN0,
    tokenOut: TOKEN1,
    amountIn: 10n * 10n ** 18n,
    slippageTolerance: 0.5,
  });
  console.log('mode2:', mode2.hash, mode2.gasUsed.toString());

  const mode1 = await client.swap.executeWithPermit({
    tokenIn: TOKEN0,
    tokenOut: TOKEN1,
    amountIn: 10n * 10n ** 18n,
    slippageTolerance: 0.5,
  }, 84532);
  console.log('mode1:', mode1.hash, mode1.gasUsed.toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
