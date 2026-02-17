import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

const errorCodes = [
    {
        category: 'Authentication Errors (4xx)',
        color: 'red',
        errors: [
            {
                code: 'AUTH_001',
                status: 401,
                title: 'Missing API Key',
                description: 'The Authorization header is missing from the request',
                solution: 'Add Authorization: Bearer YOUR_API_KEY to the request headers',
            },
            {
                code: 'AUTH_002',
                status: 401,
                title: 'Invalid API Key',
                description: 'The API Key provided is invalid or has been revoked',
                solution: 'Verify the API Key is correct, or create a new one in the Dashboard',
            },
            {
                code: 'AUTH_003',
                status: 403,
                title: 'Forbidden',
                description: 'Your API Key does not have permission to access this endpoint',
                solution: 'Upgrade your plan or contact the administrator for higher permissions',
            },
            {
                code: 'AUTH_004',
                status: 401,
                title: 'Token Expired',
                description: 'The access token has expired',
                solution: 'Use the refresh token to obtain a new access token',
            },
        ],
    },
    {
        category: 'Request Errors (4xx)',
        color: 'yellow',
        errors: [
            {
                code: 'REQ_001',
                status: 400,
                title: 'Invalid Request Body',
                description: 'The request body is malformed or missing required fields',
                solution: 'Ensure the request body is valid JSON and includes all required fields',
            },
            {
                code: 'REQ_002',
                status: 400,
                title: 'Invalid Address',
                description: 'The Ethereum address format is invalid',
                solution: 'Ensure the address is a valid Ethereum address (0x-prefixed, 40 hex characters)',
            },
            {
                code: 'REQ_003',
                status: 400,
                title: 'Invalid Proof',
                description: 'The ZK Proof is malformed or failed verification',
                solution: 'Check proof data integrity and ensure it was generated with the correct proving system',
            },
            {
                code: 'REQ_004',
                status: 404,
                title: 'Session Not Found',
                description: 'The specified session ID does not exist',
                solution: 'Call /verify first to create a session, or check that the sessionId is correct',
            },
            {
                code: 'REQ_005',
                status: 409,
                title: 'Session Expired',
                description: 'The session has expired',
                solution: 'Call /verify again to create a new session',
            },
        ],
    },
    {
        category: 'Rate Limiting (429)',
        color: 'orange',
        errors: [
            {
                code: 'RATE_001',
                status: 429,
                title: 'Rate Limit Exceeded',
                description: 'You have exceeded the per-minute request limit',
                solution: 'Wait for retryAfter seconds before retrying, or upgrade your plan for a higher limit',
            },
            {
                code: 'RATE_002',
                status: 429,
                title: 'Monthly Quota Exceeded',
                description: 'You have exceeded the monthly API call limit',
                solution: 'Wait for the quota to reset next month, or upgrade your plan',
            },
        ],
    },
    {
        category: 'Server Errors (5xx)',
        color: 'red',
        errors: [
            {
                code: 'SRV_001',
                status: 500,
                title: 'Internal Server Error',
                description: 'An unexpected server error occurred',
                solution: 'Please retry later. If the issue persists, contact support',
            },
            {
                code: 'SRV_002',
                status: 502,
                title: 'Bad Gateway',
                description: 'An upstream service is unavailable',
                solution: 'Please retry later — this typically resolves within minutes',
            },
            {
                code: 'SRV_003',
                status: 503,
                title: 'Service Unavailable',
                description: 'The service is temporarily unavailable (under maintenance)',
                solution: 'Check the status page and wait for maintenance to complete',
            },
        ],
    },
];

export default function ErrorsPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">Error Codes Reference</h1>
            <p className="text-xl text-gray-400 mb-6">
                Complete reference for all ILAL API error codes
            </p>

            {/* Response Format */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 mb-10">
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-[#2962FF]" />
                    Error Response Format
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                    All error responses follow a consistent format:
                </p>
                <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{`{
  "error": "Error Title",
  "code": "AUTH_001",
  "message": "Detailed error description",
  "statusCode": 401,
  "retryAfter": 60  // Only present on 429 errors
}`}</code>
                </pre>
            </div>

            {/* Error Categories */}
            <div className="space-y-10">
                {errorCodes.map((category) => (
                    <div key={category.category}>
                        <h2 className="text-2xl font-bold mb-6">{category.category}</h2>
                        <div className="space-y-4">
                            {category.errors.map((error) => (
                                <div
                                    key={error.code}
                                    className="border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
                                >
                                    <div className="bg-white/[0.02] px-6 py-4 border-b border-white/10">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center space-x-3">
                                                <code className="text-[#2962FF] font-mono font-semibold text-sm">
                                                    {error.code}
                                                </code>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${error.status >= 500 ? 'bg-red-500/20 text-red-400' :
                                                        error.status === 429 ? 'bg-orange-500/20 text-orange-400' :
                                                            error.status === 404 || error.status === 409 ? 'bg-yellow-500/20 text-yellow-400' :
                                                                error.status === 403 ? 'bg-purple-500/20 text-purple-400' :
                                                                    'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {error.status}
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
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Solution</div>
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

            {/* Best Practices */}
            <div className="mt-12 bg-[#2962FF]/10 border border-[#2962FF]/20 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2 text-[#2962FF]" />
                    Error Handling Best Practices
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-start">
                        <span className="text-[#2962FF] mr-2">•</span>
                        <span>Always check the HTTP status code, not just the response body</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#2962FF] mr-2">•</span>
                        <span>For 429 errors, use the retryAfter field for exponential backoff</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#2962FF] mr-2">•</span>
                        <span>For 5xx errors, implement automatic retry logic (up to 3 retries recommended)</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#2962FF] mr-2">•</span>
                        <span>Log the error code field from all error responses for debugging and support tickets</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-[#2962FF] mr-2">•</span>
                        <span>Use the SDK&apos;s built-in error types for granular error handling (recommended)</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
