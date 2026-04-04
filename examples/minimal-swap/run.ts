/**
 * ILAL Minimal Swap Example
 *
 * From zero to a successful WETH→tUSDC swap on Base Sepolia.
 * All addresses and parameters are pinned to the current testnet configuration.
 */

import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  parseAbi,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ── Pinned Configuration ─────────────────────────────────────

const API_BASE = process.env.ILAL_API_BASE ?? 'https://ilal-mvp-production.up.railway.app/api/v1';
const API_KEY  = process.env.ILAL_API_KEY!;
const PK       = process.env.PRIVATE_KEY! as Hex;

const WETH  = '0x4200000000000000000000000000000000000006';
const tUSDC = '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D';

const SWAP_AMOUNT = '1000000000000000'; // 0.001 WETH

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
]);

// ── Helpers ──────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok && !json.success) {
    console.error(`  API ${res.status}: ${json.code ?? json.error} — ${json.message}`);
    if (json.hint) console.error(`  Hint: ${json.hint}`);
    throw new Error(`API call failed: ${res.status} ${json.code ?? json.error}`);
  }
  return json;
}

function step(n: number, label: string) {
  console.log(`\n[${'='.repeat(n > 0 ? 2 : 0)}] Step ${n}: ${label}`);
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) throw new Error('ILAL_API_KEY is required — set it in .env');
  if (!PK)     throw new Error('PRIVATE_KEY is required — set it in .env');

  const account = privateKeyToAccount(PK);
  const walletAddress = account.address;

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });

  async function readBalances() {
    const [weth, tusdc] = await Promise.all([
      publicClient.readContract({ address: WETH as Address, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletAddress] }),
      publicClient.readContract({ address: tUSDC as Address, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletAddress] }),
    ]);
    return { weth, tusdc };
  }

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  ILAL Minimal Swap — Base Sepolia            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Wallet:  ${walletAddress}`);
  console.log(`  API:     ${API_BASE}`);

  // 1. Health check
  step(1, 'Health check');
  const health = await api('GET', '/health');
  console.log(`  Status: ${health.status}, Block: ${health.blockchain?.latestBlock ?? 'N/A'}`);

  // 2. Register (mock KYC)
  step(2, 'Register wallet (mock KYC)');
  const reg = await api('POST', '/onboarding/register', {
    name: 'Minimal Swap Demo',
    walletAddress,
  });
  console.log(`  Status: ${reg.status}, Institution: ${reg.institutionId}`);

  // 3. Activate session
  step(3, 'Activate compliance session');
  const session = await api('POST', '/onboarding/activate-session-demo', {
    walletAddress,
  });
  if (session.alreadyActive) {
    console.log(`  Session already active (${session.remainingSeconds}s remaining)`);
  } else {
    console.log(`  Session activated! TX: ${session.txHash}`);
    console.log(`  Expires: ${session.expiresAt}`);
  }

  // 4. Preflight self-check  (both /preflight/:addr and /defi/preflight/:addr work)
  step(4, 'Preflight self-check');
  const preflight = await api('GET', `/preflight/${walletAddress}`);
  console.log(`  Session active:  ${preflight.session.active}`);
  console.log(`  WETH balance:    ${formatEther(BigInt(preflight.tokens.WETH.balance))} WETH`);
  console.log(`  tUSDC balance:   ${formatUnits(BigInt(preflight.tokens.tUSDC.balance), 6)} tUSDC`);
  console.log(`  Can swap:        ${preflight.readiness.canSwap}`);
  if (preflight.readiness.issues.length > 0) {
    for (const issue of preflight.readiness.issues) {
      console.log(`  ⚠  ${issue}`);
    }
    if (!preflight.readiness.canSwap) {
      console.error('\n  Cannot proceed — fix the issues above first.');
      process.exit(1);
    }
  }

  // 5. Read on-chain balances BEFORE swap (ground truth from chain, not API cache)
  step(5, 'Reading on-chain balances before swap');
  const before = await readBalances();
  console.log(`  WETH:  ${formatEther(before.weth)} WETH`);
  console.log(`  tUSDC: ${formatUnits(before.tusdc, 6)} tUSDC`);

  // 6. Build swap transaction
  step(6, `Build swap (${formatEther(BigInt(SWAP_AMOUNT))} WETH → tUSDC)`);
  const swap = await api('POST', '/defi/swap', {
    tokenIn:     WETH,
    tokenOut:    tUSDC,
    amount:      SWAP_AMOUNT,
    userAddress: walletAddress,
  });
  console.log(`  Transaction built`);
  console.log(`  To:              ${swap.transaction.to}`);
  console.log(`  Session active:  ${swap.preflight.sessionActive}`);
  if (!swap.preflight.allowanceSufficient) {
    console.log(`  ⚠  Allowance insufficient — approve WETH to SwapRouter first`);
    console.log(`     ${swap.preflight.allowanceWarning?.hint}`);
  }

  // 7. Sign & broadcast
  step(7, 'Sign and broadcast');
  const txHash = await walletClient.sendTransaction({
    to: swap.transaction.to as Hex,
    data: swap.transaction.data as Hex,
    value: BigInt(swap.transaction.value ?? '0'),
    gas: BigInt(swap.transaction.gas ?? '2000000'),
    chain: baseSepolia,
  });
  console.log(`  TX hash: ${txHash}`);

  // 8. Wait for confirmation
  step(8, 'Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const success = receipt.status === 'success';
  console.log(`  Status:   ${success ? '✓ SUCCESS' : '✗ REVERTED'}`);
  console.log(`  Block:    ${receipt.blockNumber}`);
  console.log(`  Gas used: ${receipt.gasUsed}`);
  console.log(`  Explorer: https://sepolia.basescan.org/tx/${txHash}`);

  if (!success) {
    console.error('\n  Transaction reverted! Common causes:');
    console.error('  - Session expired (re-activate via step 3)');
    console.error('  - Insufficient WETH balance');
    console.error('  - Insufficient allowance for SwapRouter');
    process.exit(1);
  }

  // 9. Verify on-chain balance changes
  step(9, 'Verifying on-chain balance changes');
  const after = await readBalances();
  const wethDelta  = after.weth  - before.weth;
  const tusdcDelta = after.tusdc - before.tusdc;
  console.log(`  WETH:  ${formatEther(before.weth)} → ${formatEther(after.weth)}  (Δ ${formatEther(wethDelta)} WETH)`);
  console.log(`  tUSDC: ${formatUnits(before.tusdc, 6)} → ${formatUnits(after.tusdc, 6)}  (Δ +${formatUnits(tusdcDelta, 6)} tUSDC)`);

  if (wethDelta >= 0n) {
    console.error('  ✗ WETH balance did not decrease — swap may not have executed correctly');
    process.exit(1);
  }
  if (tusdcDelta <= 0n) {
    console.error('  ✗ tUSDC balance did not increase — swap may not have executed correctly');
    process.exit(1);
  }

  console.log('\n  ✓ Swap verified. All done!');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
