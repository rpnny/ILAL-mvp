'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ArrowRight, Zap } from 'lucide-react';

const BASE = 'https://ilalapi-production.up.railway.app/api/v1';

function Code({ children, lang }: { children: string; lang?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <div className="relative group my-4">
            <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-t-lg px-4 py-2">
                <span className="text-xs text-gray-500 font-mono">{lang ?? 'code'}</span>
                <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
            </div>
            <pre className="bg-[#0D0D0D] border border-t-0 border-white/[0.08] rounded-b-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-200 font-mono whitespace-pre">{children}</code>
            </pre>
        </div>
    );
}

export default function SDKPage() {
    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-full text-xs text-[#00F0FF] mb-4">
                DeFi Guide
            </div>
            <h1 className="font-heading text-4xl font-bold mb-3">Swap & Liquidity</h1>
            <p className="text-lg text-gray-400 mb-8">
                The ILAL DeFi API builds <strong className="text-white">unsigned Uniswap V4 transactions</strong> for you.
                Your institution signs and broadcasts them using its own wallet — ILAL never touches your private key.
            </p>

            {/* How it works */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-10">
                <h3 className="font-semibold mb-4">How it works</h3>
                <ol className="space-y-3 text-sm text-gray-400">
                    {[
                        'Call the ILAL API with your API key and trade parameters.',
                        'ILAL encodes the Uniswap V4 calldata, applies the ComplianceHook, and returns an unsigned transaction object.',
                        'Your wallet signs and broadcasts the transaction to Base Sepolia.',
                        'The ComplianceHook verifies your on-chain compliance session and routes the trade.',
                    ].map((step, i) => (
                        <li key={i} className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-xs shrink-0 mt-0.5">{i + 1}</span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>
            </div>

            {/* Network info */}
            <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Network</div>
                    <div className="font-mono text-gray-200">Base Sepolia (chainId: 84532)</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">RPC</div>
                    <div className="font-mono text-gray-200 text-xs">https://sepolia.base.org</div>
                </div>
            </div>

            {/* Token addresses */}
            <div className="mb-10">
                <h2 className="font-heading text-xl font-bold mb-4">Token Addresses (Base Sepolia)</h2>
                <div className="bg-[#0D0D0D] border border-white/[0.08] rounded-xl overflow-hidden">
                    <table className="w-full text-xs font-mono">
                        <thead><tr className="border-b border-white/[0.06] text-gray-500"><th className="text-left p-3">Token</th><th className="text-left p-3">Address</th></tr></thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            <tr><td className="p-3 text-gray-300">WETH (Wrapped Ether)</td><td className="p-3 text-[#00F0FF]">0x4200000000000000000000000000000000000006</td></tr>
                            <tr><td className="p-3 text-gray-300">USDC (Circle)</td><td className="p-3 text-[#00F0FF]">0x036CbD53842c5426634e7929541eC2318f3dCF7e</td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-600 mt-2">Note: token0 must be lexicographically less than token1. WETH &lt; USDC by address.</p>
            </div>

            {/* Swap */}
            <h2 className="font-heading text-2xl font-bold mb-2">Execute a Swap</h2>
            <p className="text-gray-400 mb-4 text-sm">Sell <code className="bg-white/5 px-1.5 py-0.5 rounded">0.001 ETH</code> for USDC — WETH → USDC (<code className="bg-white/5 px-1.5 py-0.5 rounded">zeroForOne: true</code>).</p>

            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">1. Build the transaction</h3>
            <Code lang="curl">{`curl -X POST ${BASE}/defi/swap \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokenIn":     "0x4200000000000000000000000000000000000006",
    "tokenOut":    "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "amount":      "1000000000000000",
    "zeroForOne":  true,
    "userAddress": "YOUR_WALLET_ADDRESS"
  }'`}</Code>

            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">2. Sign and send (ethers.js v6)</h3>
            <Code lang="TypeScript">{`import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// Build
const res = await fetch('${BASE}/defi/swap', {
  method:  'POST',
  headers: { 'X-API-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenIn:     '0x4200000000000000000000000000000000000006',
    tokenOut:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount:      '1000000000000000',
    zeroForOne:  true,
    userAddress: wallet.address,
  }),
});
const { transaction } = await res.json();

// Sign & broadcast — your key, never shared
const tx = await wallet.sendTransaction(transaction);
console.log('Tx submitted:', tx.hash);

const receipt = await tx.wait();
console.log('Swap confirmed in block', receipt.blockNumber);`}</Code>

            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">2. Sign and send (viem)</h3>
            <Code lang="TypeScript">{`import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as \`0x\${string}\`);
const client  = createWalletClient({ account, chain: baseSepolia, transport: http() });

// Build
const res = await fetch('${BASE}/defi/swap', {
  method:  'POST',
  headers: { 'X-API-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenIn:     '0x4200000000000000000000000000000000000006',
    tokenOut:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount:      '1000000000000000',
    zeroForOne:  true,
    userAddress: account.address,
  }),
});
const { transaction } = await res.json();

// Sign & broadcast
const hash = await client.sendTransaction({
  to:    transaction.to,
  data:  transaction.data,
  value: BigInt(transaction.value),
  gas:   BigInt(transaction.gas),
});
console.log('Swap hash:', hash);`}</Code>

            {/* Liquidity */}
            <h2 className="font-heading text-2xl font-bold mb-2 mt-12">Add Liquidity</h2>
            <p className="text-gray-400 mb-4 text-sm">Provide liquidity to the WETH/USDC pool.</p>

            <Code lang="curl">{`curl -X POST ${BASE}/defi/liquidity \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token0":      "0x4200000000000000000000000000000000000006",
    "token1":      "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "amount0":     "1000000000000000",
    "amount1":     "1000000000000000",
    "tickLower":   -600,
    "tickUpper":    600,
    "userAddress": "YOUR_WALLET_ADDRESS"
  }'`}</Code>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mt-2 text-sm text-yellow-300/70">
                <strong>Note:</strong> <code className="bg-white/5 px-1 rounded">token0</code> must have a lower address value than <code className="bg-white/5 px-1 rounded">token1</code>.
                For WETH/USDC on Base Sepolia, WETH is <code className="bg-white/5 px-1 rounded">token0</code>.
            </div>

            {/* Next */}
            <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row gap-4">
                <Link href="/docs/endpoints" className="inline-flex items-center gap-2 text-sm text-[#00F0FF] hover:underline">
                    <ArrowRight className="w-4 h-4" /> Full endpoint reference
                </Link>
                <Link href="/docs/authentication" className="inline-flex items-center gap-2 text-sm text-[#00F0FF] hover:underline">
                    <ArrowRight className="w-4 h-4" /> Authentication guide
                </Link>
                <Link href="/dashboard/api-keys" className="inline-flex items-center gap-2 text-sm text-[#00F0FF] hover:underline">
                    <Zap className="w-4 h-4" /> Get your API key
                </Link>
            </div>
        </div>
    );
}
