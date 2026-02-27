import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const BASE = 'https://ilalapi-production.up.railway.app/api/v1';

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
    title: 'DeFi — Transaction Builder',
    endpoints: [
      {
        method: 'POST', path: '/defi/swap', description: 'Build an unsigned Uniswap V4 swap transaction. Returns calldata for the caller to sign and broadcast with their own wallet.', auth: 'api-key',
        body: {
          tokenIn: 'address — token to sell',
          tokenOut: 'address — token to buy',
          amount: 'string — amount in wei (exact input)',
          zeroForOne: 'boolean — true if tokenIn < tokenOut by address',
          userAddress: 'address — caller\'s wallet address (for ComplianceHook)'
        },
        response: '{ success, transaction: { to, data, value, chainId, gas }, instructions, params }'
      },
      {
        method: 'POST', path: '/defi/liquidity', description: 'Build an unsigned Uniswap V4 liquidity mint transaction. Returns calldata for the caller to sign and broadcast.', auth: 'api-key',
        body: {
          token0: 'address (must be < token1)',
          token1: 'address (must be > token0)',
          amount0: 'string — liquidity amount (uint128)',
          amount1: 'string — secondary amount (informational)',
          tickLower: 'number — optional, default -600',
          tickUpper: 'number — optional, default 600',
          userAddress: 'address — caller\'s wallet address'
        },
        response: '{ success, transaction: { to, data, value, chainId, gas }, instructions, params }'
      }
    ]
  },
  {
    title: 'Usage & Billing',
    endpoints: [
      {
        method: 'GET', path: '/usage/stats', description: 'Get API usage statistics for the current period.', auth: 'both',
        response: '{ totalCalls, successRate, callsThisMonth, limit }'
      },
      {
        method: 'GET', path: '/billing/plans', description: 'List available subscription plans and their limits.', auth: 'none',
        response: '{ plans: [{ id, name, price, features }] }'
      }
    ]
  }
];

const authBadge: Record<string, { label: string; color: string }> = {
  none: { label: 'No Auth', color: 'bg-gray-500/20 text-gray-400' },
  jwt: { label: 'JWT Required', color: 'bg-blue-500/20 text-blue-400' },
  'api-key': { label: 'API Key (X-API-Key)', color: 'bg-[#00F0FF]/20 text-[#00F0FF]' },
  both: { label: 'JWT or API Key', color: 'bg-purple-500/20 text-purple-400' },
};

const methodColor: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400',
  POST: 'bg-green-500/20 text-green-400',
  PATCH: 'bg-yellow-500/20 text-yellow-400',
  DELETE: 'bg-red-500/20 text-red-400',
};

export default function EndpointsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="font-heading text-4xl font-bold mb-3">API Endpoints</h1>
      <p className="text-lg text-gray-400 mb-6">Complete reference for all ILAL API endpoints.</p>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-10 flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Base URL</div>
          <code className="text-[#00F0FF] font-mono">{BASE}</code>
        </div>
        <div className="sm:ml-auto flex gap-3 text-xs font-mono">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Authorization: Bearer TOKEN</span>
          <span className="px-2 py-1 bg-[#00F0FF]/20 text-[#00F0FF] rounded">X-API-Key: YOUR_KEY</span>
        </div>
      </div>

      <div className="space-y-10">
        {sections.map(section => (
          <div key={section.title}>
            <h2 className="font-heading text-xl font-bold mb-4 text-gray-200">{section.title}</h2>
            <div className="space-y-4">
              {section.endpoints.map(ep => (
                <div key={ep.path} className="border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/[0.14] transition-colors">
                  <div className="bg-white/[0.02] px-5 py-4 border-b border-white/[0.06] flex flex-wrap items-start gap-3">
                    <span className={`px-2.5 py-1 rounded font-mono text-xs font-bold ${methodColor[ep.method]}`}>{ep.method}</span>
                    <code className="text-gray-200 text-sm font-mono">{ep.path}</code>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${authBadge[ep.auth].color}`}>{authBadge[ep.auth].label}</span>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <p className="text-gray-400 text-sm">{ep.description}</p>
                    {ep.body && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Request Body</div>
                        <div className="bg-[#0D0D0D] rounded-lg border border-white/[0.06] p-3 space-y-1">
                          {Object.entries(ep.body).map(([k, v]) => (
                            <div key={k} className="flex gap-3 text-xs font-mono">
                              <span className="text-[#00F0FF] shrink-0">{k}</span>
                              <span className="text-gray-500">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ep.params && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Query Params</div>
                        <div className="bg-[#0D0D0D] rounded-lg border border-white/[0.06] p-3 space-y-1">
                          {Object.entries(ep.params).map(([k, v]) => (
                            <div key={k} className="flex gap-3 text-xs font-mono">
                              <span className="text-[#00F0FF] shrink-0">{k}</span>
                              <span className="text-gray-500">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Response</div>
                      <code className="text-xs text-gray-400 font-mono">{ep.response}</code>
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
        <h2 className="font-heading text-xl font-bold mb-4 text-gray-200">HTTP Status Codes</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { code: '200 OK', desc: 'Request succeeded', color: 'text-green-400', ok: true },
            { code: '201 Created', desc: 'Resource created successfully', color: 'text-green-400', ok: true },
            { code: '400 Bad Request', desc: 'Invalid or missing parameters', color: 'text-yellow-400', ok: false },
            { code: '401 Unauthorized', desc: 'Missing or invalid API key / JWT', color: 'text-red-400', ok: false },
            { code: '403 Forbidden', desc: 'Insufficient permissions or plan limit', color: 'text-red-400', ok: false },
            { code: '404 Not Found', desc: 'Resource does not exist', color: 'text-orange-400', ok: false },
            { code: '429 Too Many Requests', desc: 'Rate limit exceeded', color: 'text-orange-400', ok: false },
            { code: '500 Internal Server Error', desc: 'Unexpected server error', color: 'text-red-400', ok: false },
          ].map(({ code, desc, color, ok }) => (
            <div key={code} className="border border-white/[0.06] rounded-lg p-3 flex items-center gap-3">
              {ok ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <div>
                <code className={`text-sm font-mono ${color}`}>{code}</code>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/docs/quickstart" className="inline-flex items-center gap-2 text-sm text-[#00F0FF] hover:underline">
          <ArrowRight className="w-4 h-4" /> Quick Start guide
        </Link>
        <Link href="/docs/sdk" className="inline-flex items-center gap-2 text-sm text-[#00F0FF] hover:underline">
          <ArrowRight className="w-4 h-4" /> DeFi transaction guide
        </Link>
      </div>
    </div>
  );
}
