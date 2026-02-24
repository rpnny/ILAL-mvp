import Link from 'next/link';
import { Code, Key, Terminal, CheckCircle2 } from 'lucide-react';

export default function QuickstartPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-heading text-4xl font-bold mb-4">Quick Start</h1>
      <p className="text-xl text-gray-400 mb-12">
        Make your first API call in 5 minutes
      </p>

      <div className="space-y-8">
        {/* Step 1 */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-[#00F0FF] rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h2 className="font-heading text-2xl font-bold">Get Your API Key</h2>
          </div>
          <p className="text-gray-400 mb-4 ml-11">
            Create a new API Key in the <Link href="/dashboard/api-keys" className="text-[#00F0FF] hover:underline">Dashboard</Link>.
          </p>
          <div className="ml-11 bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <Key className="w-5 h-5 text-[#00F0FF] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Your API Key will look like:
                </p>
                <code className="text-[#00F0FF] bg-white/5 px-3 py-1.5 rounded block">
                  ilal_live_1234567890abcdef1234567890abcdef
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-[#00F0FF] rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h2 className="font-heading text-2xl font-bold">Make Your First Request</h2>
          </div>
          <p className="text-gray-400 mb-4 ml-11">
            Use your API Key to send a request to the ILAL API.
          </p>

          <div className="ml-11 space-y-4">
            {/* cURL Example */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Terminal className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">cURL</span>
              </div>
              <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-300">{`curl -X POST https://api.ilal.tech/api/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "proof": "...",
    "publicSignals": [...],
    "userAddress": "0x..."
  }'`}</code>
              </pre>
            </div>

            {/* JavaScript Example */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Code className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">JavaScript</span>
              </div>
              <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-300">{`const response = await fetch('https://api.ilal.tech/api/v1/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    proof: '...',
    publicSignals: [...],
    userAddress: '0x...'
  })
});

const data = await response.json();
console.log(data);`}</code>
              </pre>
            </div>

            {/* Python Example */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Code className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Python</span>
              </div>
              <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-300">{`import requests

response = requests.post(
    'https://api.ilal.tech/api/v1/verify',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'proof': '...',
        'publicSignals': [...],
        'userAddress': '0x...'
    }
)

print(response.json())`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-[#00F0FF] rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <h2 className="font-heading text-2xl font-bold">Handle the Response</h2>
          </div>
          <p className="text-gray-400 mb-4 ml-11">
            The API returns responses in JSON format.
          </p>

          <div className="ml-11">
            <div className="text-sm font-medium mb-2 text-gray-300">Success response example:</div>
            <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
              <code className="text-gray-300">{`{
  "success": true,
  "sessionId": "0x1234...",
  "expiresAt": "2026-02-17T10:30:00Z",
  "message": "Verification successful"
}`}</code>
            </pre>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-xl p-6 mt-12">
          <h3 className="font-heading text-xl font-semibold mb-4 flex items-center">
            <CheckCircle2 className="w-6 h-6 mr-2 text-[#00F0FF]" />
            Next Steps
          </h3>
          <div className="space-y-3">
            <Link
              href="/docs/authentication"
              className="block text-gray-300 hover:text-white transition-colors"
            >
              → Learn about <span className="text-[#00F0FF]">Authentication</span>
            </Link>
            <Link
              href="/docs/endpoints"
              className="block text-gray-300 hover:text-white transition-colors"
            >
              → View the full <span className="text-[#00F0FF]">API Endpoints Reference</span>
            </Link>
            <Link
              href="/dashboard/usage"
              className="block text-gray-300 hover:text-white transition-colors"
            >
              → Monitor your <span className="text-[#00F0FF]">API Usage</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
