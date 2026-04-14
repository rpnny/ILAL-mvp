'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Key, Terminal, CheckCircle2, Copy, Check } from 'lucide-react';

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-4 py-2 rounded-t-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text2)' }}>{lang}</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--text2)' }}>
          {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm rounded-b-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
        <code className="font-mono" style={{ color: 'var(--text)' }}>{code}</code>
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white" style={{ background: 'var(--accent)' }}>{n}</div>
        <div className="w-px flex-1 mt-3" style={{ background: 'var(--border)' }} />
      </div>
      <div className="pb-10 flex-1">
        <h2 className="font-heading text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const BASE_URL = 'https://ilal-mvp-production.up.railway.app/api/v1';

export default function QuickstartPage() {
  return (
    <div className="section max-w-3xl mx-auto">
      <p className="section-eyebrow mb-4">5 minute guide</p>
      <h1 className="font-heading text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>Quick Start</h1>
      <p className="text-lg mb-6" style={{ color: 'var(--text2)' }}>
        Build your first compliant DeFi transaction in under 5 minutes.
      </p>

      {/* Critical upfront callout */}
      <div className="glass p-4 mb-10 flex gap-3" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <span className="text-red-400 text-lg shrink-0">&#9888;</span>
        <div>
          <div className="text-red-400 font-display font-semibold text-sm mb-1">Read this before you write a single line of code</div>
          <p className="text-sm" style={{ color: 'var(--text)' }}>
            ILAL&apos;s <strong style={{ color: 'var(--text)' }}>ComplianceHook</strong> rejects every on-chain transaction from a wallet without an active compliance session.
            The API will build and return a valid unsigned TX — but when you broadcast it, the chain will revert.
            <strong style={{ color: 'var(--text)' }}> Step 2 activates your session. Do it before calling any DeFi endpoint.</strong>
          </p>
        </div>
      </div>

      <div>
        <Step n={1} title="Get Your API Key">
          <p className="mb-4" style={{ color: 'var(--text2)' }}>
            Register at <Link href="/login" style={{ color: 'var(--accent)' }} className="hover:underline">ilal.tech/login</Link>, then go to the{' '}
            <Link href="/dashboard/api-keys" style={{ color: 'var(--accent)' }} className="hover:underline">API Keys dashboard</Link> and click <strong style={{ color: 'var(--text)' }}>Create API Key</strong>.
          </p>
          <div className="glass p-4 flex items-center gap-3 mb-3" style={{ borderRadius: '16px' }}>
            <Key className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text2)' }}>Your key will look like:</div>
              <code className="font-mono text-sm" style={{ color: 'var(--accent)' }}>ilal_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
            </div>
          </div>
          <div className="text-sm text-yellow-400/70 flex items-start gap-2">
            <span>&#9888;</span>
            <span>Copy and save your key immediately — it will only be shown once.</span>
          </div>
        </Step>

        <Step n={2} title="Activate Your Wallet (Required Before Any On-Chain TX)">
          <p className="mb-4" style={{ color: 'var(--text2)' }}>
            One call. Handles registration + session activation in a single request.
            No ZK proof required on testnet. The relayer pays gas.
          </p>

          <CodeBlock lang="curl" code={`curl -X POST ${BASE_URL}/testnet/activate \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress": "YOUR_WALLET_ADDRESS"}'`} />

          <div className="mt-3">
            <div className="text-xs mb-2" style={{ color: 'var(--text2)' }}>Expected response:</div>
            <CodeBlock lang="json" code={`{
  "success": true,
  "walletAddress": "0x...",
  "txHash": "0x...",
  "expiresAt": "2026-04-05T14:00:00.000Z",
  "note": "Testnet only — ZK proof bypassed."
}`} />
          </div>

          <div className="mt-4 glass p-4 text-sm space-y-2" style={{ borderRadius: '16px' }}>
            <div style={{ color: 'var(--text2)' }}><span className="font-medium" style={{ color: 'var(--text)' }}>Idempotent:</span> safe to call multiple times. If already registered or active, returns existing state.</div>
            <div style={{ color: 'var(--text2)' }}><span className="font-medium" style={{ color: 'var(--text)' }}>Session duration:</span> 24 hours by default. Pass <code className="font-mono text-xs" style={{ color: 'var(--text)' }}>durationHours</code> to extend up to 720h.</div>
            <div style={{ color: 'var(--text2)' }}><span className="font-medium" style={{ color: 'var(--text)' }}>Multi-wallet:</span> use <code className="font-mono text-xs" style={{ color: 'var(--accent)' }}>POST /testnet/activate-batch</code> with <code className="font-mono text-xs" style={{ color: 'var(--text)' }}>{`{"wallets": ["0x...", "0x..."]}`}</code> for up to 20 wallets at once.</div>
            <div style={{ color: 'var(--text2)' }}><span className="font-medium" style={{ color: 'var(--text)' }}>Session expires?</span> Just call this endpoint again — no re-registration needed.</div>
          </div>

          <div className="mt-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text2)' }}>Verify your session is active:</p>
            <CodeBlock lang="curl" code={`curl ${BASE_URL}/session/YOUR_WALLET_ADDRESS \\
  -H "X-API-Key: YOUR_API_KEY"
# → { "isActive": true, "remainingSeconds": 86342 }`} />
          </div>

          {/* Production note */}
          <div className="mt-4 glass p-4" style={{ borderRadius: '16px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(129,140,248,0.2)', color: 'var(--accent2)' }}>Production</span>
              <span className="text-sm" style={{ color: 'var(--text2)' }}>Uses ZK proof instead of bypass</span>
            </div>
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--text2)' }}>
              <li>Register → <code className="font-mono" style={{ color: 'var(--text2)' }}>POST /onboarding/register</code></li>
              <li>Get attestation → <code className="font-mono" style={{ color: 'var(--text2)' }}>GET /onboarding/attestation/:address</code></li>
              <li>Generate PLONK proof client-side</li>
              <li>Submit → <code className="font-mono" style={{ color: 'var(--text2)' }}>POST /verify</code></li>
            </ol>
          </div>
        </Step>

        <Step n={3} title="Build a Swap Transaction">
          <p className="mb-4" style={{ color: 'var(--text2)' }}>
            Call <code className="font-mono text-sm px-1.5 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'var(--surface)' }}>POST /defi/swap</code>.
            Returns unsigned calldata plus a live <code className="font-mono text-sm px-1.5 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'var(--surface)' }}>preflight</code> that simulates the TX on-chain before returning.
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
            <div className="text-xs mb-2" style={{ color: 'var(--text2)' }}>Response:</div>
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

          <div className="mt-3 glass p-3 text-sm text-red-400" style={{ borderColor: 'rgba(239,68,68,0.2)', borderRadius: '12px' }}>
            If <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>canBroadcastSafely</code> is <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>false</code> — do not broadcast.
            Check <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>preflight.simulation.revertReason</code> for the exact cause.
            Most common: session expired → re-run Step 2.
          </div>
        </Step>

        <Step n={4} title="Sign & Broadcast">
          <p className="mb-4" style={{ color: 'var(--text2)' }}>
            Take <code className="font-mono text-sm px-1.5 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'var(--surface)' }}>result.transaction</code> and send it with your own signer.
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
        <div className="glass p-6 mb-8" style={{ borderRadius: 'var(--card-radius)' }}>
          <h3 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Terminal className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Troubleshooting Checklist
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>If something isn&apos;t working, run through this in order:</p>
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
                <span className="font-bold font-mono text-center" style={{ color: 'var(--accent)' }}>{step}</span>
                <code className="font-mono truncate" style={{ color: 'var(--text)' }}>{endpoint}</code>
                <span className="text-green-400 truncate">{pass}</span>
                <span className="text-red-400 truncate">{fail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Done */}
        <div className="glass p-6" style={{ borderColor: 'rgba(59,130,246,0.2)', borderRadius: 'var(--card-radius)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="font-heading font-semibold text-lg" style={{ color: 'var(--text)' }}>You&apos;re live!</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { href: '/docs/endpoints', label: 'Full API reference — all endpoints →' },
              { href: '/docs/authentication', label: 'Authentication methods (X-API-Key vs JWT) →' },
              { href: '/docs/errors', label: 'Error codes reference →' },
              { href: '/dashboard/usage', label: 'Monitor usage & rate limits →' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block transition-colors" style={{ color: 'var(--text2)' }}>{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
