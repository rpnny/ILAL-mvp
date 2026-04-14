import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const errorCodes = [
    {
        category: 'Authentication (401 / 403)',
        color: 'red',
        errors: [
            {
                code: 'API_KEY_MISSING',
                status: 401,
                phase: 'auth',
                title: 'Missing API Key',
                description: 'No X-API-Key header in the request',
                solution: 'Add the header: X-API-Key: ilal_live_xxx',
            },
            {
                code: 'API_KEY_FORMAT_INVALID',
                status: 401,
                phase: 'auth',
                title: 'Invalid API Key Format',
                description: 'The key does not match the expected pattern',
                solution: 'Expected format: ilal_{test|live}_{48 hex characters}',
            },
            {
                code: 'API_KEY_PREFIX_NOT_FOUND',
                status: 401,
                phase: 'auth',
                title: 'API Key Not Found',
                description: 'No key with this prefix exists in the database',
                solution: 'Verify the key is correct or create a new one in the Dashboard',
            },
            {
                code: 'API_KEY_HASH_MISMATCH',
                status: 401,
                phase: 'auth',
                title: 'API Key Verification Failed',
                description: 'The key hash does not match any stored key',
                solution: 'Use the exact key returned at creation time (shown only once)',
            },
            {
                code: 'API_KEY_INACTIVE',
                status: 401,
                phase: 'auth',
                title: 'API Key Deactivated',
                description: 'This key has been revoked or deactivated',
                solution: 'Reactivate or create a new key in the API Keys dashboard',
            },
            {
                code: 'API_KEY_EXPIRED',
                status: 401,
                phase: 'auth',
                title: 'API Key Expired',
                description: 'This key has passed its expiration date',
                solution: 'Generate a new API key in the dashboard',
            },
            {
                code: 'API_KEY_SCOPE_MISSING',
                status: 403,
                phase: 'auth',
                title: 'Missing Permission',
                description: 'Your key lacks the required permission scope',
                solution: 'Create a new key with the required permissions',
            },
            {
                code: 'JWT_MISSING',
                status: 401,
                phase: 'auth',
                title: 'Missing JWT',
                description: 'Missing or malformed Authorization: Bearer header',
                solution: 'Include Authorization: Bearer <accessToken> in headers',
            },
            {
                code: 'JWT_INVALID',
                status: 401,
                phase: 'auth',
                title: 'Invalid JWT',
                description: 'The access token is invalid or expired',
                solution: 'Obtain a new token via POST /auth/login or refresh token flow',
            },
            {
                code: 'INSTITUTION_OWNERSHIP_MISMATCH',
                status: 403,
                phase: 'preflight',
                title: 'Wallet Belongs to Another Account',
                description: 'The userAddress/walletAddress is bound to a different ILAL account',
                solution: 'Call POST /onboarding/register with this wallet to rebind it (demo mode)',
            },
        ],
    },
    {
        category: 'Validation (400)',
        color: 'yellow',
        errors: [
            {
                code: 'INVALID_PARAMS',
                status: 400,
                phase: 'validation',
                title: 'Request Validation Failed',
                description: 'One or more request body fields failed validation',
                solution: 'Check the "details" array in the response for specific field errors',
            },
            {
                code: 'INVALID_ADDRESS',
                status: 400,
                phase: 'validation',
                title: 'Invalid Ethereum Address',
                description: 'The address is not a valid 0x-prefixed 40-char hex string',
                solution: 'Provide a valid checksummed Ethereum address',
            },
            {
                code: 'UNSUPPORTED_TOKEN',
                status: 400,
                phase: 'preflight',
                title: 'Token Not Supported',
                description: 'The token address is not in the current supported token whitelist',
                solution: 'Use supported tokens: WETH (0x4200...0006) or tUSDC (0xa486...424D)',
            },
        ],
    },
    {
        category: 'Preflight / Session (412)',
        color: 'orange',
        errors: [
            {
                code: 'SESSION_NOT_ACTIVE',
                status: 412,
                phase: 'preflight',
                title: 'Session Not Active',
                description: 'No active compliance session for this wallet. Returned by default from /defi/swap and /defi/liquidity — transaction would revert on-chain. Add ?buildOnly=true to suppress and get unsigned TX anyway.',
                solution: 'Testnet: POST /onboarding/activate-session-demo  |  Production: POST /verify (ZK proof flow)',
            },
            {
                code: 'ALLOWANCE_INSUFFICIENT',
                status: 200,
                phase: 'preflight',
                title: 'Insufficient Allowance (Warning)',
                description: 'Token allowance for the router/manager is less than the requested amount',
                solution: 'Approve the token to the SwapRouter or PositionManager before broadcasting',
            },
        ],
    },
    {
        category: 'Rate Limiting (429)',
        color: 'orange',
        errors: [
            {
                code: 'RATE_LIMIT_EXCEEDED',
                status: 429,
                phase: 'auth',
                title: 'Rate Limit Exceeded',
                description: 'Too many requests per minute',
                solution: 'Wait for the rate limit window to reset (60s) or upgrade your plan',
            },
        ],
    },
    {
        category: 'Build / Broadcast (400 / 500)',
        color: 'red',
        errors: [
            {
                code: 'BUILD_FAILED',
                status: 400,
                phase: 'build',
                title: 'Transaction Build Failed',
                description: 'Could not construct the transaction calldata',
                solution: 'Check token addresses, amounts, and tick ranges',
            },
            {
                code: 'INTERNAL_ERROR',
                status: 500,
                phase: 'build',
                title: 'Internal Server Error',
                description: 'Unexpected error during processing',
                solution: 'Retry later. If persistent, contact support with the error message',
            },
        ],
    },
];

function statusBadgeStyle(status: number) {
    if (status >= 500) return { background: 'rgba(239,68,68,0.2)', color: '#f87171' };
    if (status === 429) return { background: 'rgba(251,146,60,0.2)', color: '#fb923c' };
    if (status === 412) return { background: 'rgba(234,179,8,0.2)', color: '#facc15' };
    if (status === 403) return { background: 'rgba(168,85,247,0.2)', color: '#a855f7' };
    if (status === 200) return { background: 'rgba(34,197,94,0.2)', color: '#4ade80' };
    return { background: 'rgba(239,68,68,0.2)', color: '#f87171' };
}

export default function ErrorsPage() {
    return (
        <div className="section max-w-5xl mx-auto">
            <h1 className="font-heading text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>Error Codes Reference</h1>
            <p className="text-xl mb-6" style={{ color: 'var(--text2)' }}>
                Complete reference for all ILAL API error codes, organized by failure phase.
            </p>

            {/* Response Format */}
            <div className="glass p-6 mb-10" style={{ borderRadius: 'var(--card-radius)' }}>
                <h2 className="font-heading text-lg font-semibold mb-3 flex items-center" style={{ color: 'var(--text)' }}>
                    <Info className="w-5 h-5 mr-2" style={{ color: 'var(--accent)' }} />
                    Unified Error Response Format
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>
                    All error responses follow a consistent envelope with machine-readable codes and developer-actionable hints:
                </p>
                <pre className="p-4 text-sm overflow-x-auto rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <code className="font-mono" style={{ color: 'var(--text)' }}>{`{
  "error": "Bad Request",              // HTTP status text
  "code": "UNSUPPORTED_TOKEN",         // Machine-readable error code
  "message": "tokenIn 0xabc... is not a supported token",
  "hint": "Supported tokens: WETH (0x4200...0006), tUSDC (0xa486...424D)",
  "phase": "preflight",                // Where the failure occurred
  "details": [...]                     // Optional: Zod validation errors
}`}</code>
                </pre>
                <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                        <div className="mb-1" style={{ color: 'var(--text2)' }}>Phases</div>
                        <code className="font-mono" style={{ color: 'var(--text)' }}>validation</code> → <code className="font-mono" style={{ color: 'var(--text)' }}>auth</code> → <code className="font-mono" style={{ color: 'var(--text)' }}>preflight</code> → <code className="font-mono" style={{ color: 'var(--text)' }}>build</code> → <code className="font-mono" style={{ color: 'var(--text)' }}>broadcast</code>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                        <div className="mb-1" style={{ color: 'var(--text2)' }}>Switch on</div>
                        Use the <code className="font-mono" style={{ color: 'var(--accent)' }}>code</code> field for programmatic handling; <code className="font-mono" style={{ color: 'var(--accent)' }}>hint</code> for developer display.
                    </div>
                </div>
            </div>

            {/* Error Categories */}
            <div className="space-y-10">
                {errorCodes.map((category) => (
                    <div key={category.category}>
                        <h2 className="font-heading text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>{category.category}</h2>
                        <div className="space-y-4">
                            {category.errors.map((error) => (
                                <div
                                    key={error.code}
                                    className="glass overflow-hidden"
                                    style={{ borderRadius: '16px' }}
                                >
                                    <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center space-x-3">
                                                <code className="font-mono font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                                                    {error.code}
                                                </code>
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={statusBadgeStyle(error.status)}>
                                                    {error.status}
                                                </span>
                                                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--text2)' }}>
                                                    {error.phase}
                                                </span>
                                                <span className="font-display font-semibold" style={{ color: 'var(--text)' }}>{error.title}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 space-y-3">
                                        <div>
                                            <div className="pixel-label mb-1">Description</div>
                                            <p className="text-sm" style={{ color: 'var(--text)' }}>{error.description}</p>
                                        </div>
                                        <div>
                                            <div className="pixel-label mb-1">How to Fix</div>
                                            <div className="flex items-start space-x-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-green-300">{error.solution}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Deprecated Token Notice */}
            <div className="mt-10 glass p-6" style={{ borderColor: 'rgba(239,68,68,0.2)', borderRadius: 'var(--card-radius)' }}>
                <h3 className="font-heading text-lg font-semibold mb-3 text-red-400">Deprecated Configurations</h3>
                <div className="space-y-2 text-sm" style={{ color: 'var(--text2)' }}>
                    <p><code className="font-mono text-red-400">0x036CbD53842c5426634e7929541eC2318f3dCF7e</code> — Circle USDC (pool drained, replaced by tUSDC)</p>
                    <p><code className="font-mono text-red-400">0xe633220f15932428FcA60A1A2C2C48797A180A80</code> — ComplianceHook v1 (deprecated)</p>
                    <p><code className="font-mono text-red-400">0xdD37A28e15A9592eAAd3f7Df0Ad36e374Af68A80</code> — ComplianceHook v2 (deprecated)</p>
                    <p className="mt-2" style={{ color: 'var(--text2)' }}>If your code references any of the above addresses, update to the current configuration shown on the <a href="/docs" style={{ color: 'var(--accent)' }} className="hover:underline">docs overview page</a>.</p>
                </div>
            </div>

            {/* Best Practices */}
            <div className="mt-10 glass p-6" style={{ borderColor: 'rgba(59,130,246,0.2)', borderRadius: 'var(--card-radius)' }}>
                <h3 className="font-heading text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--text)' }}>
                    <AlertTriangle className="w-6 h-6 mr-2" style={{ color: 'var(--accent)' }} />
                    Error Handling Best Practices
                </h3>
                <ul className="space-y-3 text-sm" style={{ color: 'var(--text)' }}>
                    <li className="flex items-start">
                        <span className="mr-2" style={{ color: 'var(--accent)' }}>1.</span>
                        <span>Switch on the <code className="font-mono" style={{ color: 'var(--accent)' }}>code</code> field (e.g. <code className="font-mono">SESSION_NOT_ACTIVE</code>) — not the HTTP status or <code className="font-mono">message</code></span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2" style={{ color: 'var(--accent)' }}>2.</span>
                        <span>Check <code className="font-mono" style={{ color: 'var(--accent)' }}>phase</code> to know which stage failed: <code className="font-mono">validation → auth → preflight → build → broadcast</code></span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2" style={{ color: 'var(--accent)' }}>3.</span>
                        <span>Show the <code className="font-mono" style={{ color: 'var(--accent)' }}>hint</code> field to developers/operators — it contains actionable next steps</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2" style={{ color: 'var(--accent)' }}>4.</span>
                        <span>For 429 errors, wait for the <code className="font-mono">retryAfter</code> value before retrying</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2" style={{ color: 'var(--accent)' }}>5.</span>
                        <span>Before broadcasting, call <code className="font-mono" style={{ color: 'var(--accent)' }}>GET /defi/preflight/:address</code> to check session, balances, and allowances in one call</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
