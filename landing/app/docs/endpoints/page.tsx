import { Code, CheckCircle2, XCircle } from 'lucide-react';

const endpoints = [
  {
    method: 'POST',
    path: '/verify',
    description: 'Verify ZK Proof and create a session',
    auth: true,
    body: {
      proof: 'string',
      publicSignals: 'string[]',
      userAddress: 'string'
    },
    response: {
      success: 'boolean',
      sessionId: 'string',
      expiresAt: 'string',
      message: 'string'
    }
  },
  {
    method: 'GET',
    path: '/session/status',
    description: 'Query session status',
    auth: true,
    params: {
      userAddress: 'string'
    },
    response: {
      isActive: 'boolean',
      sessionId: 'string',
      expiresAt: 'string'
    }
  },
  {
    method: 'POST',
    path: '/session/extend',
    description: 'Extend session lifetime',
    auth: true,
    body: {
      sessionId: 'string'
    },
    response: {
      success: 'boolean',
      newExpiresAt: 'string'
    }
  },
  {
    method: 'GET',
    path: '/compliance/check',
    description: 'Check address compliance status',
    auth: true,
    params: {
      address: 'string'
    },
    response: {
      isCompliant: 'boolean',
      reason: 'string'
    }
  }
];

export default function EndpointsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">API Endpoints</h1>
      <p className="text-xl text-gray-400 mb-12">
        Complete ILAL API endpoint reference
      </p>

      {/* Base URL */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 mb-8">
        <div className="text-sm text-gray-400 mb-2">Base URL</div>
        <code className="text-[#2962FF] text-lg">
          https://api.ilal.tech/api/v1
        </code>
      </div>

      {/* Endpoints */}
      <div className="space-y-6">
        {endpoints.map((endpoint, index) => (
          <div key={index} className="border border-white/10 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-white/[0.02] p-6 border-b border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded font-mono text-sm font-semibold ${endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                      endpoint.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                        'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-lg text-gray-300">
                    {endpoint.path}
                  </code>
                </div>
                {endpoint.auth && (
                  <span className="px-2 py-1 bg-[#2962FF]/20 text-[#2962FF] text-xs rounded-full">
                    Auth Required
                  </span>
                )}
              </div>
              <p className="text-gray-400">{endpoint.description}</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Request Parameters */}
              {endpoint.params && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-gray-300">Query Parameters</h4>
                  <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4">
                    <pre className="text-sm">
                      <code className="text-gray-300">
                        {JSON.stringify(endpoint.params, null, 2)}
                      </code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Request Body */}
              {endpoint.body && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-gray-300">Request Body</h4>
                  <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4">
                    <pre className="text-sm">
                      <code className="text-gray-300">
                        {JSON.stringify(endpoint.body, null, 2)}
                      </code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Response */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-300">Response</h4>
                <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4">
                  <pre className="text-sm">
                    <code className="text-gray-300">
                      {JSON.stringify(endpoint.response, null, 2)}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Example */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-300">Request Example</h4>
                <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-xs">
                  <code className="text-gray-300">
                    {`curl -X ${endpoint.method} https://api.ilal.tech/api/v1${endpoint.path} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${endpoint.body ? ` \\
  -d '${JSON.stringify(endpoint.body, null, 2)}'` : ''}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Codes */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">HTTP Status Codes</h2>
        <div className="space-y-3">
          <div className="border border-white/10 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">
                <code className="text-green-400">200 OK</code>
              </div>
              <div className="text-sm text-gray-400">Request successful</div>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">
                <code className="text-yellow-400">400 Bad Request</code>
              </div>
              <div className="text-sm text-gray-400">Invalid request parameters</div>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">
                <code className="text-red-400">401 Unauthorized</code>
              </div>
              <div className="text-sm text-gray-400">Missing or invalid API Key</div>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">
                <code className="text-orange-400">429 Too Many Requests</code>
              </div>
              <div className="text-sm text-gray-400">Rate limit exceeded</div>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">
                <code className="text-red-400">500 Internal Server Error</code>
              </div>
              <div className="text-sm text-gray-400">Server error</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
