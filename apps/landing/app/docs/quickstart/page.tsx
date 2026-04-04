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

const BASE_URL = 'https://ilal-mvp-production.up.railway.app/api/v1';

export default function QuickstartPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-full text-xs text-[#00F0FF] mb-4 font-mono">
        5 minute guide
      </div>
      <h1 className="font-heading text-4xl font-bold mb-3">Quick Start</h1>
      <p className="text-lg text-gray-400 mb-6">
        Build your first compliant DeFi transaction in under 5 minutes.
      </p>

      {/* Critical upfront callout */}
      <div className="bg-red-500/8 border border-red-500/30 rounded-xl p-4 mb-10 flex gap-3">
        <span className="text-red-400 text-lg shrink-0">⚠</span>
        <div>
          <div className="text-red-400 font-semibold text-sm mb-1">Read this before you write a single line of code</div>
          <p className="text-gray-300 text-sm">
            ILAL&apos;s <strong className="text-white">ComplianceHook</strong> rejects every on-chain transaction from a wallet without an active compliance session.
            The API will build and return a valid unsigned TX — but when you broadcast it, the chain will revert.
            <strong className="text-white"> Step 2 activates your session. Do it before calling any DeFi endpoint.</strong>
          </p>
        </div>
      </div>

      <div>
        <Step n={1} title="Get Your API Key">
          <p className="text-gray-400 mb-4">
            Register at <Link href="/login" className="text-[#00F0FF] hover:underline">ilal.tech/login</Link>, then go to the{' '}
            <Link href="/dashboard/api-keys" className="text-[#00F0FF] hover:underline">API Keys dashboard</Link> and click <strong className="text-white">Create API Key</strong>.
          </p>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3 mb-3">
            <Key className="w-5 h-5 text-[#00F0FF] shrink-0" />
            <div>
              <div className="text-xs text-gray-500 mb-1">Your key will look like:</div>
              <code className="text-[#00F0FF] font-mono text-sm">ilal_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
            </div>
          </div>
          <div className="text-sm text-yellow-400/70 flex items-start gap-2">
            <span>⚠</span>
            <span>Copy and save your key immediately — it will only be shown once.</span>
          </div>
        </Step>

        <Step n={2} title="Activate Your Wallet (Required Before Any On-Chain TX)">
          <p className="text-gray-400 mb-4">
            One call. Handles registration + session activation in a single request.
            No ZK proof required on testnet. The relayer pays gas.
          </p>

          <CodeBlock lang="curl" code={`curl -X POST ${BASE_URL}/testnet/activate \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress": "YOUR_WALLET_ADDRESS"}'`} />

          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Expected response:</div>
            <CodeBlock lang="json" code={`{
  "success": true,
  "walletAddress": "0x...",
  "txHash": "0x...",
  "expiresAt": "2026-04-05T14:00:00.000Z",
  "note": "Testnet only — ZK proof bypassed."
}`} />
          </div>

          <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 text-sm text-gray-400 space-y-2">
            <div><span className="text-white font-medium">Idempotent:</span> safe to call multiple times. If already registered or active, returns existing state.</div>
            <div><span className="text-white font-medium">Session duration:</span> 24 hours by default. Pass <code className="text-gray-300">durationHours</code> to extend up to 720h.</div>
            <div><span className="text-white font-medium">Multi-wallet:</span> use <code className="text-[#00F0FF]">POST /testnet/activate-batch</code> with <code className="text-gray-300">{`{"wallets": ["0x...", "0x..."]}`}</code> for up to 20 wallets at once.</div>
            <div><span className="text-white font-medium">Session expires?</span> Just call this endpoint again — no re-registration needed.</div>
          </div>

          <div className="mt-4">
            <p className="text-gray-500 text-xs mb-2">Verify your session is active:</p>
            <CodeBlock lang="curl" code={`curl ${BASE_URL}/session/YOUR_WALLET_ADDRESS \\
  -H "X-API-Key: YOUR_API_KEY"
# → { "isActive": true, "remainingSeconds": 86342 }`} />
          </div>

          {/* Production note */}
          <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">Production</span>
              <span className="text-gray-400 text-sm">Uses ZK proof instead of bypass</span>
            </div>
            <ol className="text-gray-500 text-xs space-y-1 list-decimal list-inside">
              <li>Register → <code className="text-gray-400">POST /onboarding/register</code></li>
              <li>Get attestation → <code className="text-gray-400">GET /onboarding/attestation/:address</code></li>
              <li>Generate PLONK proof client-side</li>
              <li>Submit → <code className="text-gray-400">POST /verify</code></li>
            </ol>
          </div>
        </Step>

        <Step n={3} title="Build a Swap Transaction">
          <p className="text-gray-400 mb-4">
            Call <code className="text-[#00F0FF] bg-white/5 px-1.5 py-0.5 rounded text-sm">POST /defi/swap</code>.
            Returns unsigned calldata plus a live <code className="text-[#00F0FF] bg-white/5 px-1.5 py-0.5 rounded text-sm">preflight</code> that simulates the TX on-chain before returning.
          </p>

          <CodeBlock lang="curl" code={`curl -X POST ${BASE_URL}/defi/swap \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokenIn":     "0x4200000000000000000000000000000000000006",
    "tokenOut":    "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "amount":      "1000000000000000",
    "userAddress": "YOUR_WALLET_ADDRESS"
  }'`} />

          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Response:</div>
            <CodeBlock lang="json" code={`{
  "success": true,
  "transaction": { "to": "0x...", "data": "0x...", "value": "0x0", "chainId": 84532, "gas": "0x1E8480" },
  "preflight": {
    "sessionActive": true,
    "canBroadcastSafely": true,
    "simulation": { "success": true }
  }
}`} />
          </div>

          <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            If <code className="bg-white/5 px-1 rounded text-red-300">canBroadcastSafely</code> is <code className="bg-white/5 px-1 rounded text-red-300">false</code> — do not broadcast.
            Check <code className="bg-white/5 px-1 rounded text-red-300">preflight.simulation.revertReason</code> for the exact cause.
            Most common: session expired → re-run Step 2.
          </div>
        </Step>

        <Step n={4} title="Sign & Broadcast">
          <p className="text-gray-400 mb-4">
            Take <code className="text-[#00F0FF] bg-white/5 px-1.5 py-0.5 rounded text-sm">result.transaction</code> and send it with your own signer.
          </p>

          <CodeBlock lang="TypeScript (viem)" code={`import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const account = privateKeyToAccount(YOUR_PRIVATE_KEY);
const wallet  = createWalletClient({ account, chain: baseSepolia, transport: http() });

// Step 2: activate (if not already done)
await fetch('${BASE_URL}/testnet/activate', {
  method: 'POST',
  headers: { 'X-API-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: account.address }),
});

// Step 3: build
const res = await fetch('${BASE_URL}/defi/swap', {
  method: 'POST',
  headers: { 'X-API-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenIn:     '0x4200000000000000000000000000000000000006',
    tokenOut:    '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D',
    amount:      '1000000000000000',
    userAddress: account.address,
  }),
});
const { transaction, preflight } = await res.json();

// Guard: never broadcast if simulation failed
if (!preflight.canBroadcastSafely) {
  throw new Error(\`Cannot broadcast: \${preflight.simulation?.revertReason}\`);
}

// Step 4: send
const hash = await wallet.sendTransaction({
  to:    transaction.to,
  data:  transaction.data,
  value: BigInt(transaction.value),
});
console.log('Confirmed:', hash);`} />
        </Step>

        {/* Troubleshooting */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 mb-8">
          <h3 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#00F0FF]" />
            Troubleshooting Checklist
          </h3>
          <p className="text-gray-400 text-sm mb-4">If something isn&apos;t working, run through this in order:</p>
          <div className="space-y-2">
            {[
              { step: '1', endpoint: 'GET /health', pass: '200 — API reachable', fail: 'Wrong URL or network issue' },
              { step: '2', endpoint: 'GET /usage/stats (X-API-Key)', pass: '200 — key works', fail: 'Check error.code: API_KEY_FORMAT_INVALID / API_KEY_HASH_MISMATCH' },
              { step: '3', endpoint: 'POST /testnet/activate', pass: 'txHash — session active', fail: '500 → check VERIFIER_PRIVATE_KEY on server side' },
              { step: '4', endpoint: 'GET /session/:address', pass: 'isActive: true', fail: 'Session not yet on-chain — wait 1 block and retry' },
              { step: '5', endpoint: 'GET /preflight/:address', pass: 'canSwap: true', fail: 'Check readiness.issues[] for missing allowances or balance' },
              { step: '6', endpoint: 'POST /defi/swap', pass: 'canBroadcastSafely: true', fail: 'Check simulation.revertReason — session / allowance / pool depth' },
              { step: '7', endpoint: 'Sign + Broadcast', pass: 'On-chain confirmed', fail: 'canBroadcastSafely was false — never broadcast if false' },
            ].map(({ step, endpoint, pass, fail }) => (
              <div key={step} className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 text-xs items-center">
                <span className="text-[#00F0FF] font-bold font-mono text-center">{step}</span>
                <code className="text-gray-300 font-mono truncate">{endpoint}</code>
                <span className="text-green-400 truncate">{pass}</span>
                <span className="text-red-400 truncate">{fail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Done */}
        <div className="bg-[#00F0FF]/5 border border-[#00F0FF]/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#00F0FF]" />
            <span className="font-heading font-semibold text-lg">You&apos;re live!</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { href: '/docs/endpoints', label: 'Full API reference — all endpoints →' },
              { href: '/docs/authentication', label: 'Authentication methods (X-API-Key vs JWT) →' },
              { href: '/docs/errors', label: 'Error codes reference →' },
              { href: '/dashboard/usage', label: 'Monitor usage & rate limits →' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block text-gray-400 hover:text-[#00F0FF] transition-colors">{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
