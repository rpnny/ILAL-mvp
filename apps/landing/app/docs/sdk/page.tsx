'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ArrowRight, Zap } from 'lucide-react';

const BASE = 'https://ilal-mvp-production.up.railway.app/api/v1';

function Code({ children, lang }: { children: string; lang?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <div className="relative group my-4">
            <div className="flex items-center justify-between px-4 py-2 rounded-t-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--text2)' }}>{lang ?? 'code'}</span>
                <button onClick={copy} className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--text2)' }}>
                    {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm rounded-b-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
                <code className="font-mono whitespace-pre" style={{ color: 'var(--text)' }}>{children}</code>
            </pre>
        </div>
    );
}

export default function SDKPage() {
    return (
        <div className="section max-w-3xl mx-auto">
            <p className="section-eyebrow mb-4">DeFi Guide</p>
            <h1 className="font-heading text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>Swap & Liquidity</h1>
            <p className="text-lg mb-8" style={{ color: 'var(--text2)' }}>
                The ILAL DeFi API builds <strong style={{ color: 'var(--text)' }}>unsigned Uniswap V4 transactions</strong> for you.
                Your institution signs and broadcasts them using its own wallet — ILAL never touches your private key.
            </p>

            {/* How it works */}
            <div className="glass p-6 mb-10" style={{ borderRadius: 'var(--card-radius)' }}>
                <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>How it works</h3>
                <ol className="space-y-3 text-sm" style={{ color: 'var(--text2)' }}>
                    {[
                        'Call the ILAL API with your API key and trade parameters.',
                        'ILAL encodes the Uniswap V4 calldata, applies the ComplianceHook, and returns an unsigned transaction object.',
                        'Your wallet signs and broadcasts the transaction to Base Sepolia.',
                        'The ComplianceHook verifies your on-chain compliance session and routes the trade.',
                    ].map((step, i) => (
                        <li key={i} className="flex gap-3">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 text-white" style={{ background: 'var(--accent)' }}>{i + 1}</span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>
            </div>

            {/* Network info */}
            <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
                <div className="glass p-3" style={{ borderRadius: '12px' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text2)' }}>Network</div>
                    <div className="font-mono" style={{ color: 'var(--text)' }}>Base Sepolia (chainId: 84532)</div>
                </div>
                <div className="glass p-3" style={{ borderRadius: '12px' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text2)' }}>RPC</div>
                    <div className="font-mono text-xs" style={{ color: 'var(--text)' }}>https://sepolia.base.org</div>
                </div>
            </div>

            {/* Token addresses */}
            <div className="mb-10">
                <h2 className="font-heading text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Token Addresses (Base Sepolia)</h2>
                <div className="glass overflow-hidden" style={{ borderRadius: '16px' }}>
                    <table className="w-full text-xs font-mono">
                        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}><th className="text-left p-3" style={{ color: 'var(--text2)' }}>Token</th><th className="text-left p-3" style={{ color: 'var(--text2)' }}>Address</th></tr></thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}><td className="p-3" style={{ color: 'var(--text)' }}>WETH (Wrapped Ether)</td><td className="p-3" style={{ color: 'var(--accent)' }}>0x4200000000000000000000000000000000000006</td></tr>
                            <tr><td className="p-3" style={{ color: 'var(--text)' }}>tUSDC (ILAL Test)</td><td className="p-3" style={{ color: 'var(--accent)' }}>0xa486Fb51ED09B970A23F7Fe910bc90089f78424D</td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text2)' }}>Note: token0 must be lexicographically less than token1. WETH &lt; tUSDC by address. The <code className="font-mono px-1 rounded" style={{ background: 'var(--surface)' }}>zeroForOne</code> parameter is auto-derived from token ordering if omitted.</p>
            </div>

            {/* Swap */}
            <h2 className="font-heading text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Execute a Swap</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>Sell <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)' }}>0.001 ETH</code> for tUSDC — WETH → tUSDC. The API auto-derives <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)' }}>zeroForOne</code> from the token ordering.</p>

            <h3 className="pixel-label mb-2">1. Build the transaction</h3>
            <Code lang="curl">{`curl -X POST ${BASE}/defi/swap \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokenIn":     "0x4200000000000000000000000000000000000006",
    "tokenOut":    "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "amount":      "1000000000000000",
    "userAddress": "YOUR_WALLET_ADDRESS"
  }'`}</Code>

            <h3 className="pixel-label mb-2">2. Sign and send (ethers.js v6)</h3>
            <Code lang="TypeScript">{`import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// Build
const res = await fetch('${BASE}/defi/swap', {
  method:  'POST',
  headers: { 'X-API-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenIn:     '0x4200000000000000000000000000000000000006',
    tokenOut:    '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D',
    amount:      '1000000000000000',
    userAddress: wallet.address,
  }),
});
const { transaction } = await res.json();

// Sign & broadcast — your key, never shared
const tx = await wallet.sendTransaction(transaction);
console.log('Tx submitted:', tx.hash);

const receipt = await tx.wait();
console.log('Swap confirmed in block', receipt.blockNumber);`}</Code>

            <h3 className="pixel-label mb-2">2. Sign and send (viem)</h3>
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
    tokenOut:    '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D',
    amount:      '1000000000000000',
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
            <h2 className="font-heading text-2xl font-bold mb-2 mt-12" style={{ color: 'var(--text)' }}>Add Liquidity</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>Provide liquidity to the WETH/tUSDC pool.</p>

            <Code lang="curl">{`curl -X POST ${BASE}/defi/liquidity \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token0":      "0x4200000000000000000000000000000000000006",
    "token1":      "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "amount0":     "1000000000000000",
    "amount1":     "1000000000000000",
    "tickLower":   -600,
    "tickUpper":    600,
    "userAddress": "YOUR_WALLET_ADDRESS"
  }'`}</Code>

            <div className="glass p-4 mt-2 text-sm text-yellow-300/70" style={{ borderColor: 'rgba(234,179,8,0.2)', borderRadius: '16px' }}>
                <strong>Note:</strong> <code className="font-mono px-1 rounded" style={{ background: 'var(--surface)' }}>token0</code> must have a lower address value than <code className="font-mono px-1 rounded" style={{ background: 'var(--surface)' }}>token1</code>.
                For WETH/tUSDC on Base Sepolia, WETH is <code className="font-mono px-1 rounded" style={{ background: 'var(--surface)' }}>token0</code>.
            </div>

            {/* Next */}
            <div className="mt-12 pt-8 flex flex-col sm:flex-row gap-4" style={{ borderTop: '1px solid var(--border)' }}>
                <Link href="/docs/endpoints" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                    <ArrowRight className="w-4 h-4" /> Full endpoint reference
                </Link>
                <Link href="/docs/authentication" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                    <ArrowRight className="w-4 h-4" /> Authentication guide
                </Link>
                <Link href="/dashboard/api-keys" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                    <Zap className="w-4 h-4" /> Get your API key
                </Link>
            </div>
        </div>
    );
}
