import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const acc = privateKeyToAccount('0x3aa3f5766bfa2010070d93a27eda14a2ed38e3cc1d616ae44462caf7cf1e8ae6');
const pub = createPublicClient({ chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') });
const wal = createWalletClient({ account: acc, chain: baseSepolia, transport: http('https://base-sepolia-rpc.publicnode.com') });

const WETH = '0x4200000000000000000000000000000000000006' as const;
const amount = parseEther('0.005');

async function main() {
  console.log('Wrapping', formatEther(amount), 'ETH → WETH...');
  const hash = await wal.sendTransaction({ to: WETH, value: amount, data: '0xd0e30db0' });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log('Done! TX:', hash, 'Status:', receipt.status);

  const bal = await pub.readContract({
    address: WETH,
    abi: [{ type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
    functionName: 'balanceOf',
    args: [acc.address],
  });
  console.log('WETH Balance:', formatEther(bal));
}

main();
