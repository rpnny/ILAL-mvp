import { Shield, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AuthenticationPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-heading text-4xl font-bold mb-4">Authentication</h1>
      <p className="text-xl text-gray-400 mb-12">
        Learn how to securely access the ILAL API using your API Key
      </p>

      <div className="space-y-8">
        {/* Overview */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4">Authentication Method</h2>
          <p className="text-gray-400 mb-6">
            The ILAL API uses Bearer Token authentication. Every request must include your API Key in the HTTP header.
          </p>

          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <div className="text-sm text-gray-400 mb-2">Header format:</div>
            <code className="text-[#00F0FF] bg-white/5 px-3 py-1.5 rounded block">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>
        </div>

        {/* Example */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4">Example</h2>
          <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
            <code className="text-gray-300">{`curl -X GET https://api.ilal.tech/api/v1/session/status \\
  -H "Authorization: Bearer ilal_live_1234567890abcdef" \\
  -H "Content-Type: application/json"`}</code>
          </pre>
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
                  <code className="text-gray-300">{`// .env file
ILAL_API_KEY=ilal_live_1234567890abcdef

// In your code
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
                  • Do not commit API Keys to Git repositories<br />
                  • Do not expose API Keys in client-side code<br />
                  • Do not share API Keys in public forums or documentation
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Handling */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4">Error Handling</h2>

          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="text-red-400">401 Unauthorized</code>
                <span className="text-sm text-gray-400">Missing or invalid API Key</span>
              </div>
              <pre className="bg-[#1A1A1A] rounded p-3 text-xs overflow-x-auto">
                <code className="text-gray-300">{`{
  "error": "Unauthorized",
  "message": "Invalid API key"
}`}</code>
              </pre>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="text-yellow-400">429 Too Many Requests</code>
                <span className="text-sm text-gray-400">Rate limit exceeded</span>
              </div>
              <pre className="bg-[#1A1A1A] rounded p-3 text-xs overflow-x-auto">
                <code className="text-gray-300">{`{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit",
  "retryAfter": 60
}`}</code>
              </pre>
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
