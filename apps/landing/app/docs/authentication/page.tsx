import { Shield, Key, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function AuthenticationPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-heading text-4xl font-bold mb-4">Authentication</h1>
      <p className="text-xl text-gray-400 mb-12">
        Learn how to authenticate with the ILAL API
      </p>

      <div className="space-y-8">
        {/* Two Methods */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4">Two Authentication Methods</h2>
          <p className="text-gray-400 mb-6">
            Every protected ILAL endpoint accepts <strong className="text-white">either</strong> of these two methods. You only need one per request.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-[#00F0FF]/20 rounded-xl p-5">
              <div className="text-[#00F0FF] font-semibold mb-2 text-sm uppercase tracking-wider">API Key (Server-to-Server)</div>
              <code className="text-[#00F0FF] bg-white/5 px-3 py-1.5 rounded block text-sm mb-3">
                X-API-Key: ilal_live_...
              </code>
              <p className="text-gray-400 text-sm">
                Best for backend services, SDKs, and CI/CD pipelines. Create keys in the{' '}
                <a href="/dashboard/api-keys" className="text-[#00F0FF] hover:underline">API Keys dashboard</a>.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-blue-500/20 rounded-xl p-5">
              <div className="text-blue-400 font-semibold mb-2 text-sm uppercase tracking-wider">JWT Token (Frontend / Dashboard)</div>
              <code className="text-blue-400 bg-white/5 px-3 py-1.5 rounded block text-sm mb-3">
                Authorization: Bearer eyJhbG...
              </code>
              <p className="text-gray-400 text-sm">
                Best for browser-based apps and the ILAL Dashboard. Obtain a token via{' '}
                <code className="text-gray-300 bg-white/5 px-1 rounded text-xs">POST /auth/login</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4">Examples</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-2">Using API Key:</div>
              <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-300">{`curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/swap \\
  -H "X-API-Key: ilal_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"tokenIn":"0x...","tokenOut":"0x...","amount":"1000","zeroForOne":true,"userAddress":"0x..."}'`}</code>
              </pre>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-2">Using JWT:</div>
              <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-300">{`curl -X GET https://ilal-mvp-production.up.railway.app/api/v1/usage/stats \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."  \\
  -H "Content-Type: application/json"`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-blue-400 text-sm">How the server decides</span>
          </div>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>If <code className="bg-white/5 px-1 rounded">X-API-Key</code> header is present, the server uses API Key auth exclusively.</li>
            <li>If <code className="bg-white/5 px-1 rounded">X-API-Key</code> is absent, it falls back to <code className="bg-white/5 px-1 rounded">Authorization: Bearer</code> (JWT).</li>
            <li>There is <strong>no silent fallback</strong>: if your API Key is invalid, the request fails even if you also sent a valid JWT.</li>
            <li>Every successful response includes <code className="bg-white/5 px-1 rounded">authMethod: &quot;api_key&quot;</code> or <code className="bg-white/5 px-1 rounded">&quot;jwt&quot;</code> so you can verify which path was used.</li>
          </ul>
        </div>

        {/* Error Codes */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4">API Key Error Codes</h2>
          <p className="text-gray-400 mb-4 text-sm">
            All API Key errors include a machine-readable <code className="bg-white/5 px-1 rounded text-gray-300">code</code> field for programmatic handling:
          </p>

          <div className="space-y-2">
            {[
              { code: 'API_KEY_FORMAT_INVALID', desc: 'Key doesn\'t match ilal_{test|live}_{48 hex}' },
              { code: 'API_KEY_PREFIX_NOT_FOUND', desc: 'No key with this prefix exists in the database' },
              { code: 'API_KEY_HASH_MISMATCH', desc: 'Key found but hash verification failed' },
              { code: 'API_KEY_INACTIVE', desc: 'Key has been deactivated' },
              { code: 'API_KEY_EXPIRED', desc: 'Key is past its expiration date' },
              { code: 'API_KEY_SCOPE_MISSING', desc: 'Key lacks a required permission' },
            ].map(({ code, desc }) => (
              <div key={code} className="bg-white/[0.02] border border-white/10 rounded-lg p-3 flex items-center gap-3">
                <code className="text-red-400 text-xs font-mono shrink-0">{code}</code>
                <span className="text-gray-400 text-sm">{desc}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Example error response:</div>
            <pre className="bg-[#1A1A1A] border border-white/10 rounded p-3 text-xs overflow-x-auto">
              <code className="text-gray-300">{`{
  "error": "Unauthorized",
  "code": "API_KEY_HASH_MISMATCH",
  "message": "API Key hash verification failed",
  "hint": "Ensure you are using the exact key returned at creation time"
}`}</code>
            </pre>
          </div>
        </div>

        {/* Security Best Practices */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4 flex items-center">
            <Shield className="w-7 h-7 mr-3 text-[#00F0FF]" />
            Security Best Practices
          </h2>

          <div className="space-y-4">
            <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1 text-green-400">Use Environment Variables</div>
                <div className="text-sm text-gray-300">
                  Never hardcode your API Key in source code. Use environment variables to store sensitive information.
                </div>
                <pre className="mt-3 bg-[#1A1A1A] border border-white/10 rounded p-3 text-xs overflow-x-auto">
                  <code className="text-gray-300">{`# .env file
ILAL_API_KEY=ilal_live_1234567890abcdef...

# In your code
const apiKey = process.env.ILAL_API_KEY;`}</code>
                </pre>
              </div>
            </div>

            <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1 text-green-400">Restrict Key Permissions</div>
                <div className="text-sm text-gray-300">
                  Create separate API Keys for different environments (development, staging, production).
                </div>
              </div>
            </div>

            <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1 text-green-400">Rotate Regularly</div>
                <div className="text-sm text-gray-300">
                  Periodically rotate your API Keys, especially if you suspect a leak.
                </div>
              </div>
            </div>

            <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1 text-red-400">Never Expose Your Key</div>
                <div className="text-sm text-gray-300">
                  Do not commit API Keys to Git repositories. Do not expose keys in client-side code. Do not share keys in public forums.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Management */}
        <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-xl p-6">
          <h3 className="font-heading text-xl font-semibold mb-4 flex items-center">
            <Key className="w-6 h-6 mr-2 text-[#00F0FF]" />
            Manage Your API Keys
          </h3>
          <p className="text-gray-300 mb-4">
            You can create, view, and revoke API Keys from the Dashboard.
          </p>
          <a
            href="/dashboard/api-keys"
            className="inline-flex items-center px-4 py-2 bg-[#00F0FF] hover:bg-[#00F0FF]/90 rounded-lg transition-colors"
          >
            Go to API Keys Management
          </a>
        </div>
      </div>
    </div>
  );
}
