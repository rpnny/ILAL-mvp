import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const BASE = 'https://ilal-mvp-production.up.railway.app/api/v1';

type Endpoint = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth: 'none' | 'jwt' | 'api-key' | 'both';
  body?: Record<string, string>;
  params?: Record<string, string>;
  response: string;
};

const sections: { title: string; endpoints: Endpoint[] }[] = [
  {
    title: 'Health',
    endpoints: [
      {
        method: 'GET', path: '/health', description: 'Service health check — database connectivity status.', auth: 'none',
        response: '{ status: "ok", database: "connected" }'
      }
    ]
  },
  {
    title: 'Authentication',
    endpoints: [
      {
        method: 'POST', path: '/auth/register', description: 'Register a new user account.', auth: 'none',
        body: { email: 'string', password: 'string (min 8 chars)', name: 'string (optional)' },
        response: '{ user, accessToken, refreshToken }'
      },
      {
        method: 'POST', path: '/auth/login', description: 'Login with email and password.', auth: 'none',
        body: { email: 'string', password: 'string' },
        response: '{ user, accessToken, refreshToken }'
      },
      {
        method: 'POST', path: '/auth/refresh', description: 'Refresh an expired access token.', auth: 'none',
        body: { refreshToken: 'string' },
        response: '{ accessToken: string }'
      },
      {
        method: 'GET', path: '/auth/me', description: 'Get the currently authenticated user profile.', auth: 'jwt',
        response: '{ user: { id, email, name, plan, walletAddress } }'
      }
    ]
  },
  {
    title: 'API Key Management',
    endpoints: [
      {
        method: 'GET', path: '/apikeys', description: 'List all your API keys (hashed for security).', auth: 'jwt',
        response: '{ apiKeys: [...], limits: { maxApiKeys, remaining } }'
      },
      {
        method: 'POST', path: '/apikeys', description: 'Create a new API key. The raw key is only shown once — store it immediately.', auth: 'jwt',
        body: { name: 'string', permissions: 'string[] (optional)', rateLimit: 'number (optional)' },
        response: '{ apiKey: "ilal_live_...", keyPrefix, id }'
      },
      {
        method: 'PATCH', path: '/apikeys/:id', description: 'Update an API key name or rate limit.', auth: 'jwt',
        body: { name: 'string (optional)', rateLimit: 'number (optional)' },
        response: '{ success: true, key: {...} }'
      },
      {
        method: 'DELETE', path: '/apikeys/:id', description: 'Revoke and permanently delete an API key.', auth: 'jwt',
        response: '{ success: true }'
      }
    ]
  },
  {
    title: 'Onboarding — Institution Registration & Session',
    endpoints: [
      {
        method: 'POST', path: '/onboarding/register', description: 'Register a wallet as a compliant institution (mock KYC — auto-approved). Safe to call multiple times; re-registers if wallet belongs to another account in demo mode.', auth: 'both',
        body: {
          name: 'string — institution name',
          walletAddress: 'address — wallet to onboard',
          countryCode: 'number (optional) — ISO 3166-1 numeric, default 840 (US)',
        },
        response: '{ success, institutionId, status: "approved", walletAddress, merkleIndex }'
      },
      {
        method: 'POST', path: '/onboarding/activate-session-demo', description: 'TESTNET / DEV — Activate a 24h compliance session without a ZK proof. The ILAL relayer pays gas. Call after /onboarding/register. Idempotent — returns existing session info if already active.', auth: 'both',
        body: {
          walletAddress: 'address — wallet to activate',
          durationHours: 'number (optional) — session duration 1–720h, default 24',
        },
        response: '{ success, txHash, expiresAt, gasUsed } or { alreadyActive: true, remainingSeconds }'
      },
      {
        method: 'POST', path: '/onboarding/activate-session', description: 'PRODUCTION — Server-side ZK proof generation + on-chain session activation. Requires circuit files on the server.', auth: 'both',
        body: { walletAddress: 'address', expiry: 'number (optional) — unix timestamp' },
        response: '{ success, txHash, sessionExpiry, expiresAt }'
      },
      {
        method: 'GET', path: '/onboarding/status/:address', description: 'Check institution onboarding status for a wallet.', auth: 'both',
        response: '{ success, status: "approved"|"pending"|"not_registered", institutionId, merkleIndex }'
      },
      {
        method: 'GET', path: '/onboarding/attestation/:address', description: 'Get a fresh IssuerAttestation + Merkle proof for ZK proof generation.', auth: 'both',
        response: '{ success, attestation: { userAddress, merkleRoot, merkleProof, merkleIndex, sigR8x, sigR8y, sigS, issuerAx, issuerAy } }'
      },
    ]
  },
  {
    title: 'Testnet Utilities (Sandbox Only)',
    endpoints: [
      {
        method: 'POST', path: '/testnet/activate', description: 'TESTNET ONLY — Register + activate session in one call. No ZK proof needed. If wallet is already registered the registration step is skipped; if session is already active the activation step is skipped. Idempotent and safe to call repeatedly.', auth: 'both',
        body: {
          walletAddress: 'address — wallet to register and activate',
          durationHours: 'number (optional) — session duration 1–720h, default 24',
          name: 'string (optional) — institution name, auto-generated if omitted',
        },
        response: '{ success, walletAddress, txHash, expiresAt, gasUsed } or { success, alreadyActive: true, remainingSeconds }'
      },
      {
        method: 'POST', path: '/testnet/activate-batch', description: 'TESTNET ONLY — Activate up to 20 wallets in a single request. Processes sequentially to avoid nonce conflicts. Returns per-wallet results even if some fail.', auth: 'both',
        body: {
          wallets: 'string[] — array of wallet addresses (max 20)',
          durationHours: 'number (optional) — session duration for all wallets, default 24',
        },
        response: '{ total, succeeded, failed, results: [{ walletAddress, success, txHash | error }] }'
      },
    ]
  },
  {
    title: 'DeFi — Preflight & Transaction Builder',
    endpoints: [
      {
        method: 'GET', path: '/preflight/:address', description: 'Environment self-check. Returns session status, token balances, all allowances, and readiness in one call. Use before broadcasting to diagnose issues without on-chain trial-and-error.', auth: 'both',
        response: '{ session: { active, remainingSeconds }, tokens: { WETH: { balance, decimals }, tUSDC: { balance, decimals } }, allowances: { WETH_to_SwapRouter, tUSDC_to_PositionManager, ... }, readiness: { canSwap, canAddLiquidity, issues: [] } }'
      },
      {
        method: 'POST', path: '/defi/swap', description: 'Build an unsigned Uniswap V4 swap transaction. Returns calldata + preflight session + allowance check. Returns 412 SESSION_NOT_ACTIVE by default when session is inactive. Pass ?buildOnly=true to get unsigned TX data without session enforcement (useful for testing).', auth: 'both',
        body: {
          tokenIn: 'address — token to sell (WETH: 0x4200...0006)',
          tokenOut: 'address — token to buy (tUSDC: 0xa486...424D)',
          amount: 'string — positive integer in wei (exact input amount)',
          zeroForOne: 'boolean (optional) — auto-derived from token ordering if omitted',
          userAddress: 'address — wallet that will sign and broadcast'
        },
        params: { buildOnly: 'true | false (optional) — skip session check and return TX data even if session inactive. Default: false (returns 412 SESSION_NOT_ACTIVE when session is inactive).' },
        response: '{ success, transaction: { to, data, value, chainId, gas }, preflight: { sessionActive, canBroadcastSafely, tokenSupported, allowanceSufficient, warning? }, authMethod }'
      },
      {
        method: 'POST', path: '/defi/liquidity', description: 'Build an unsigned Uniswap V4 add-liquidity transaction. token0 must be < token1 (Uniswap sort order: WETH < tUSDC). Returns 412 SESSION_NOT_ACTIVE by default if session is inactive.', auth: 'both',
        body: {
          token0: 'address — must be < token1 (WETH: 0x4200...0006)',
          token1: 'address — must be > token0 (tUSDC: 0xa486...424D)',
          amount0: 'string — non-negative integer (at least one must be > 0)',
          amount1: 'string — non-negative integer (at least one must be > 0)',
          tickLower: 'number (optional) — default -600',
          tickUpper: 'number (optional) — default 600',
          userAddress: 'address — wallet that will sign and broadcast'
        },
        params: { buildOnly: 'true | false (optional) — skip session check. Default: false.' },
        response: '{ success, transaction: { to, data, value, chainId, gas }, preflight: { sessionActive, allowanceSufficient }, authMethod }'
      }
    ]
  },
  {
    title: 'Usage & Billing',
    endpoints: [
      {
        method: 'GET', path: '/usage/stats', description: 'Get API usage statistics for the current billing period.', auth: 'both',
        response: '{ usage: { totalCalls, successfulCalls, failedCalls, totalCost, byEndpoint }, quota: { limit, remaining, resetDate }, plan: { current, limits } }  Note: limit = -1 means unlimited.'
      },
      {
        method: 'GET', path: '/billing/plans', description: 'List available subscription plans and their limits.', auth: 'none',
        response: '{ plans: [{ id, name, price, features }] }'
      }
    ]
  }
];

const authBadge: Record<string, { label: string; bg: string; color: string }> = {
  none: { label: 'No Auth', bg: 'rgba(113,113,122,0.2)', color: 'var(--text2)' },
  jwt: { label: 'JWT Required', bg: 'rgba(129,140,248,0.2)', color: 'var(--accent2)' },
  'api-key': { label: 'API Key (X-API-Key)', bg: 'rgba(59,130,246,0.2)', color: 'var(--accent)' },
  both: { label: 'JWT or API Key', bg: 'rgba(168,85,247,0.2)', color: '#a855f7' },
};

const methodColor: Record<string, { bg: string; color: string }> = {
  GET: { bg: 'rgba(59,130,246,0.2)', color: '#60a5fa' },
  POST: { bg: 'rgba(34,197,94,0.2)', color: '#4ade80' },
  PATCH: { bg: 'rgba(234,179,8,0.2)', color: '#facc15' },
  DELETE: { bg: 'rgba(239,68,68,0.2)', color: '#f87171' },
};

export default function EndpointsPage() {
  return (
    <div className="section max-w-5xl mx-auto">
      <h1 className="font-heading text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>API Endpoints</h1>
      <p className="text-lg mb-6" style={{ color: 'var(--text2)' }}>Complete reference for all ILAL API endpoints.</p>

      <div className="glass p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderRadius: 'var(--card-radius)' }}>
        <div>
          <div className="pixel-label mb-1">Base URL</div>
          <code className="font-mono" style={{ color: 'var(--accent)' }}>{BASE}</code>
        </div>
        <div className="sm:ml-auto flex flex-col gap-2 text-xs font-mono">
          <div className="flex gap-3">
            <span className="px-2 py-1 rounded" style={{ background: 'rgba(129,140,248,0.2)', color: 'var(--accent2)' }}>Authorization: Bearer TOKEN</span>
            <span className="font-sans" style={{ color: 'var(--text2)' }}>JWT (frontend)</span>
          </div>
          <div className="flex gap-3">
            <span className="px-2 py-1 rounded" style={{ background: 'rgba(59,130,246,0.2)', color: 'var(--accent)' }}>X-API-Key: YOUR_KEY</span>
            <span className="font-sans" style={{ color: 'var(--text2)' }}>API Key (server-to-server)</span>
          </div>
        </div>
      </div>

      {/* Rate Limit Reference */}
      <div className="glass p-5 mb-10" style={{ borderRadius: 'var(--card-radius)' }}>
        <div className="pixel-label mb-3">Rate Limits (per minute, per API key)</div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { plan: 'FREE', color: 'var(--text2)', rate: '60', monthly: '1,000 req/month' },
            { plan: 'PRO', color: 'var(--accent)', rate: '300', monthly: '50,000 req/month' },
            { plan: 'ENTERPRISE', color: '#a855f7', rate: '1,000', monthly: 'Unlimited / month' },
          ].map(({ plan, color, rate, monthly }) => (
            <div key={plan} className="glass p-3" style={{ borderRadius: '12px' }}>
              <div className="text-xs mb-1" style={{ color }}>{plan}</div>
              <div className="font-mono font-bold text-lg" style={{ color: 'var(--text)' }}>
                {rate} <span className="text-xs font-normal" style={{ color: 'var(--text2)' }}>req/min</span>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>{monthly}</div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text2)' }}>
          Individual API keys can have a custom limit via <code className="font-mono" style={{ color: 'var(--text2)' }}>PATCH /apikeys/:id {'{'} rateLimit {'}'}</code>.
          Effective limit = max(plan limit, key limit). On 429, the response includes <code className="font-mono" style={{ color: 'var(--text2)' }}>retryAfter</code> and the current plan/limit.
        </p>
      </div>

      <div className="space-y-10">
        {sections.map(section => (
          <div key={section.title}>
            <h2 className="font-heading text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>{section.title}</h2>
            <div className="space-y-4">
              {section.endpoints.map(ep => (
                <div key={ep.path} className="glass overflow-hidden" style={{ borderRadius: '16px' }}>
                  <div className="px-5 py-4 flex flex-wrap items-start gap-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <span className="px-2.5 py-1 rounded font-mono text-xs font-bold" style={{ background: methodColor[ep.method].bg, color: methodColor[ep.method].color }}>{ep.method}</span>
                    <code className="text-sm font-mono" style={{ color: 'var(--text)' }}>{ep.path}</code>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs" style={{ background: authBadge[ep.auth].bg, color: authBadge[ep.auth].color }}>{authBadge[ep.auth].label}</span>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <p className="text-sm" style={{ color: 'var(--text2)' }}>{ep.description}</p>
                    {ep.body && (
                      <div>
                        <div className="pixel-label mb-2">Request Body</div>
                        <div className="p-3 space-y-1 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          {Object.entries(ep.body).map(([k, v]) => (
                            <div key={k} className="flex gap-3 text-xs font-mono">
                              <span className="shrink-0" style={{ color: 'var(--accent)' }}>{k}</span>
                              <span style={{ color: 'var(--text2)' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ep.params && (
                      <div>
                        <div className="pixel-label mb-2">Query Params</div>
                        <div className="p-3 space-y-1 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          {Object.entries(ep.params).map(([k, v]) => (
                            <div key={k} className="flex gap-3 text-xs font-mono">
                              <span className="shrink-0" style={{ color: 'var(--accent)' }}>{k}</span>
                              <span style={{ color: 'var(--text2)' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="pixel-label mb-2">Response</div>
                      <code className="text-xs font-mono" style={{ color: 'var(--text2)' }}>{ep.response}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Status Codes */}
      <div className="mt-12">
        <h2 className="font-heading text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>HTTP Status Codes</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { code: '200 OK', desc: 'Request succeeded', color: '#4ade80', ok: true },
            { code: '201 Created', desc: 'Resource created successfully', color: '#4ade80', ok: true },
            { code: '400 Bad Request', desc: 'Invalid or missing parameters', color: '#facc15', ok: false },
            { code: '401 Unauthorized', desc: 'Missing or invalid API key / JWT — check the "code" field', color: '#f87171', ok: false },
            { code: '403 Forbidden', desc: 'Insufficient permissions or plan limit', color: '#f87171', ok: false },
            { code: '404 Not Found', desc: 'Resource does not exist', color: '#fb923c', ok: false },
            { code: '412 Precondition Failed', desc: 'Compliance session not active (when requireActiveSession=true)', color: '#fb923c', ok: false },
            { code: '429 Too Many Requests', desc: 'Rate limit exceeded', color: '#fb923c', ok: false },
            { code: '500 Internal Server Error', desc: 'Unexpected server error', color: '#f87171', ok: false },
          ].map(({ code, desc, color, ok }) => (
            <div key={code} className="glass p-3 flex items-center gap-3" style={{ borderRadius: '12px' }}>
              {ok ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <div>
                <code className="text-sm font-mono" style={{ color }}>{code}</code>
                <div className="text-xs" style={{ color: 'var(--text2)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/docs/quickstart" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
          <ArrowRight className="w-4 h-4" /> Quick Start guide
        </Link>
        <Link href="/docs/sdk" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
          <ArrowRight className="w-4 h-4" /> DeFi transaction guide
        </Link>
      </div>
    </div>
  );
}
