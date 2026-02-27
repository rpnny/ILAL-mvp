'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Key, Terminal, Code, CheckCircle2, Copy, Check } from 'lucide-react';

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-t-lg px-4 py-2">
        <span className="text-xs text-gray-500 font-mono">{lang}</span>
        <button onClick={copy} className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 text-xs">
          {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre className="bg-[#111] border border-t-0 border-white/[0.08] rounded-b-lg p-4 overflow-x-auto text-sm">
        <code className="text-gray-200 font-mono">{code}</code>
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 bg-[#00F0FF] text-black rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-lg shadow-[#00F0FF]/20">{n}</div>
        <div className="w-px flex-1 bg-white/10 mt-3" />
      </div>
      <div className="pb-10 flex-1">
        <h2 className="font-heading text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

const BASE_URL = 'https://ilalapi-production.up.railway.app/api/v1';

export default function QuickstartPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-full text-xs text-[#00F0FF] mb-4 font-mono">
        5 minute guide
      </div>
      <h1 className="font-heading text-4xl font-bold mb-3">Quick Start</h1>
      <p className="text-lg text-gray-400 mb-10">
        Build your first compliant DeFi transaction in under 5 minutes.
      </p>

      <div>
        <Step n={1} title="Create an Account & Get Your API Key">
          <p className="text-gray-400 mb-4">
            Register at <Link href="/login" className="text-[#00F0FF] hover:underline">ilal.tech/login</Link>, then go to the{' '}
            <Link href="/dashboard/api-keys" className="text-[#00F0FF] hover:underline">API Keys dashboard</Link> and click <strong className="text-white">Create API Key</strong>.
          </p>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
            <Key className="w-5 h-5 text-[#00F0FF] shrink-0" />
            <div>
              <div className="text-xs text-gray-500 mb-1">Your key will look like:</div>
              <code className="text-[#00F0FF] font-mono text-sm">ilal_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
            </div>
          </div>
          <div className="mt-3 text-sm text-yellow-400/70 flex items-start gap-2">
            <span>⚠</span>
            <span>Copy and save your key immediately — it will only be shown once.</span>
          </div>
        </Step>

        <Step n={2} title="Verify the API is Working">
          <p className="text-gray-400 mb-4">Check the health endpoint — no auth required:</p>
          <CodeBlock lang="curl" code={`curl ${BASE_URL}/health`} />
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Expected response:</div>
            <CodeBlock lang="json" code={`{
  "status": "ok",
  "service": "ILAL API",
  "database": "connected"
}`} />
          </div>
        </Step>

        <Step n={3} title="Build a Swap Transaction">
          <p className="text-gray-400 mb-4">
            Call <code className="text-[#00F0FF] bg-white/5 px-1.5 py-0.5 rounded text-sm">POST /defi/swap</code> with your API key.
            The API returns <strong className="text-white">unsigned calldata</strong> — you sign and broadcast it with your own wallet.
          </p>

          <CodeBlock lang="curl" code={`curl -X POST ${BASE_URL}/defi/swap \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokenIn":  "0x4200000000000000000000000000000000000006",
    "tokenOut": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "amount":   "1000000000000000",
    "zeroForOne": true,
    "userAddress": "YOUR_WALLET_ADDRESS"
  }'`} />

          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Response — ready to sign:</div>
            <CodeBlock lang="json" code={`{
  "success": true,
  "transaction": {
    "to":      "0x2aaf6c55...",
    "data":    "0xf3cd914c...",
    "value":   "0x0",
    "chainId": 84532,
    "gas":     "0x1E8480"
  },
  "instructions": {
    "network": "Base Sepolia (chainId: 84532)",
    "rpcUrl":  "https://sepolia.base.org"
  }
}`} />
          </div>
        </Step>

        <Step n={4} title="Sign & Broadcast with Your Wallet">
          <p className="text-gray-400 mb-4">
            Take <code className="text-[#00F0FF] bg-white/5 px-1.5 py-0.5 rounded text-sm">result.transaction</code> and send it with your own signer — ethers.js, viem, or wagmi.
          </p>

          <div className="space-y-4">
            <CodeBlock lang="TypeScript (ethers.js)" code={`import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const signer = new ethers.Wallet(YOUR_PRIVATE_KEY, provider);

// 1. Build the tx via ILAL API
const res = await fetch('${BASE_URL}/defi/swap', {
  method: 'POST',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tokenIn:     '0x4200000000000000000000000000000000000006',
    tokenOut:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount:      '1000000000000000',
    zeroForOne:  true,
    userAddress: await signer.getAddress(),
  }),
});
const { transaction } = await res.json();

// 2. Sign and broadcast — your key, your transaction
const tx = await signer.sendTransaction(transaction);
console.log('Tx hash:', tx.hash);
await tx.wait();
console.log('Swap confirmed ✓');`} />

            <CodeBlock lang="TypeScript (viem)" code={`import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const account = privateKeyToAccount(YOUR_PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });

// 1. Build the tx
const res = await fetch('${BASE_URL}/defi/swap', {
  method: 'POST',
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

// 2. Send — your key, your transaction
const hash = await walletClient.sendTransaction({
  to:    transaction.to,
  data:  transaction.data,
  value: BigInt(transaction.value),
});
console.log('Tx hash:', hash);`} />
          </div>
        </Step>

        {/* Done */}
        <div className="bg-[#00F0FF]/5 border border-[#00F0FF]/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#00F0FF]" />
            <span className="font-heading font-semibold text-lg">You're live!</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { href: '/docs/endpoints', label: 'Explore all API endpoints →' },
              { href: '/docs/authentication', label: 'Learn about authentication & JWT tokens →' },
              { href: '/docs/sdk', label: 'Add liquidity positions →' },
              { href: '/dashboard/usage', label: 'Monitor your usage →' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block text-gray-400 hover:text-[#00F0FF] transition-colors">{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
