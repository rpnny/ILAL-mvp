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

export default function ErrorsPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="font-heading text-4xl font-bold mb-4">Error Codes Reference</h1>
            <p className="text-xl text-gray-400 mb-6">
                Complete reference for all ILAL API error codes, organized by failure phase.
            </p>

            {/* Response Format */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 mb-10">
                <h2 className="font-heading text-lg font-semibold mb-3 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-[#00F0FF]" />
                    Unified Error Response Format
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                    All error responses follow a consistent envelope with machine-readable codes and developer-actionable hints:
                </p>
                <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{`{
  "error": "Bad Request",              // HTTP status text
  "code": "UNSUPPORTED_TOKEN",         // Machine-readable error code
  "message": "tokenIn 0xabc... is not a supported token",
  "hint": "Supported tokens: WETH (0x4200...0006), tUSDC (0xa486...424D)",
  "phase": "preflight",                // Where the failure occurred
  "details": [...]                     // Optional: Zod validation errors
}`}</code>
                </pre>
                <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/[0.03] rounded-lg p-3">
                        <div className="text-gray-500 mb-1">Phases</div>
                        <code className="text-gray-300">validation</code> → <code className="text-gray-300">auth</code> → <code className="text-gray-300">preflight</code> → <code className="text-gray-300">build</code> → <code className="text-gray-300">broadcast</code>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                        <div className="text-gray-500 mb-1">Switch on</div>
                        Use the <code className="text-[#00F0FF]">code</code> field for programmatic handling; <code className="text-[#00F0FF]">hint</code> for developer display.
                    </div>
                </div>
            </div>

            {/* Error Categories */}
            <div className="space-y-10">
                {errorCodes.map((category) => (
                    <div key={category.category}>
                        <h2 className="font-heading text-2xl font-bold mb-6">{category.category}</h2>
                        <div className="space-y-4">
                            {category.errors.map((error) => (
                                <div
                                    key={error.code}
                                    className="border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
                                >
                                    <div className="bg-white/[0.02] px-6 py-4 border-b border-white/10">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center space-x-3">
                                                <code className="text-[#00F0FF] font-mono font-semibold text-sm">
                                                    {error.code}
                                                </code>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${error.status >= 500 ? 'bg-red-500/20 text-red-400' :
                                                        error.status === 429 ? 'bg-orange-500/20 text-orange-400' :
                                                            error.status === 412 ? 'bg-yellow-500/20 text-yellow-400' :
                                                                error.status === 403 ? 'bg-purple-500/20 text-purple-400' :
                                                                    error.status === 200 ? 'bg-green-500/20 text-green-400' :
                                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {error.status}
                                                </span>
                                                <span className="text-xs text-gray-500 font-mono bg-white/[0.04] px-2 py-0.5 rounded">
                                                    {error.phase}
                                                </span>
                                                <span className="font-semibold">{error.title}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 space-y-3">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</div>
                                            <p className="text-sm text-gray-300">{error.description}</p>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">How to Fix</div>
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
            <div className="mt-10 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <h3 className="font-heading text-lg font-semibold mb-3 text-red-400">Deprecated Configurations</h3>
                <div className="space-y-2 text-sm text-gray-400">
                    <p><code className="text-red-400">0x036CbD53842c5426634e7929541eC2318f3dCF7e</code> — Circle USDC (pool drained, replaced by tUSDC)</p>
                    <p><code className="text-red-400">0xe633220f15932428FcA60A1A2C2C48797A180A80</code> — ComplianceHook v1 (deprecated)</p>
                    <p><code className="text-red-400">0xdD37A28e15A9592eAAd3f7Df0Ad36e374Af68A80</code> — ComplianceHook v2 (deprecated)</p>
                    <p className="mt-2 text-gray-500">If your code references any of the above addresses, update to the current configuration shown on the <a href="/docs" className="text-[#00F0FF] hover:underline">docs overview page</a>.</p>
                </div>
            </div>

            {/* Best Practices */}
            <div className="mt-10 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-xl p-6">
                <h3 className="font-heading text-xl font-semibold mb-4 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2 text-[#00F0FF]" />
                    Error Handling Best Practices
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-start">
                        <span className="text-[#00F0FF] mr-2">1.</span>
                        <span>Switch on the <code className="text-[#00F0FF]">code</code> field (e.g. <code>SESSION_NOT_ACTIVE</code>) — not the HTTP status or <code>message</code></span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#00F0FF] mr-2">2.</span>
                        <span>Check <code className="text-[#00F0FF]">phase</code> to know which stage failed: <code>validation → auth → preflight → build → broadcast</code></span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#00F0FF] mr-2">3.</span>
                        <span>Show the <code className="text-[#00F0FF]">hint</code> field to developers/operators — it contains actionable next steps</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#00F0FF] mr-2">4.</span>
                        <span>For 429 errors, wait for the <code>retryAfter</code> value before retrying</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#00F0FF] mr-2">5.</span>
                        <span>Before broadcasting, call <code className="text-[#00F0FF]">GET /defi/preflight/:address</code> to check session, balances, and allowances in one call</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
