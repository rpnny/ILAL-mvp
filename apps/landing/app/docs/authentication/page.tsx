import { Shield, Key, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function AuthenticationPage() {
  return (
    <div className="section max-w-4xl mx-auto">
      <h1 className="font-heading text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>Authentication</h1>
      <p className="text-xl mb-12" style={{ color: 'var(--text2)' }}>
        Learn how to authenticate with the ILAL API
      </p>

      <div className="space-y-8">
        {/* Two Methods */}
        <div>
          <h2 className="font-heading text-2xl mb-4" style={{ color: 'var(--text)' }}>Two Authentication Methods</h2>
          <p className="mb-6" style={{ color: 'var(--text2)' }}>
            Every protected ILAL endpoint accepts <strong style={{ color: 'var(--text)' }}>either</strong> of these two methods. You only need one per request.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass p-5" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
              <div className="font-pixel text-xs tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--accent)' }}>API Key (Server-to-Server)</div>
              <code className="font-mono text-sm block px-3 py-1.5 rounded mb-3" style={{ color: 'var(--accent)', background: 'var(--surface)' }}>
                X-API-Key: ilal_live_...
              </code>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>
                Best for backend services, SDKs, and CI/CD pipelines. Create keys in the{' '}
                <a href="/dashboard/api-keys" style={{ color: 'var(--accent)' }} className="hover:underline">API Keys dashboard</a>.
              </p>
            </div>
            <div className="glass p-5" style={{ borderColor: 'rgba(129,140,248,0.2)' }}>
              <div className="font-pixel text-xs tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--accent2)' }}>JWT Token (Frontend / Dashboard)</div>
              <code className="font-mono text-sm block px-3 py-1.5 rounded mb-3" style={{ color: 'var(--accent2)', background: 'var(--surface)' }}>
                Authorization: Bearer eyJhbG...
              </code>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>
                Best for browser-based apps and the ILAL Dashboard. Obtain a token via{' '}
                <code className="font-mono text-xs px-1 rounded" style={{ background: 'var(--surface)', color: 'var(--text)' }}>POST /auth/login</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div>
          <h2 className="font-heading text-2xl mb-4" style={{ color: 'var(--text)' }}>Examples</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs mb-2" style={{ color: 'var(--text2)' }}>Using API Key:</div>
              <pre className="glass p-4 overflow-x-auto text-sm" style={{ borderRadius: '12px' }}>
                <code className="font-mono" style={{ color: 'var(--text)' }}>{`curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/swap \\
  -H "X-API-Key: ilal_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"tokenIn":"0x...","tokenOut":"0x...","amount":"1000","zeroForOne":true,"userAddress":"0x..."}'`}</code>
              </pre>
            </div>
            <div>
              <div className="text-xs mb-2" style={{ color: 'var(--text2)' }}>Using JWT:</div>
              <pre className="glass p-4 overflow-x-auto text-sm" style={{ borderRadius: '12px' }}>
                <code className="font-mono" style={{ color: 'var(--text)' }}>{`curl -X GET https://ilal-mvp-production.up.railway.app/api/v1/usage/stats \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."  \\
  -H "Content-Type: application/json"`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="glass p-5" style={{ borderColor: 'rgba(129,140,248,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5" style={{ color: 'var(--accent2)' }} />
            <span className="font-display font-semibold text-sm" style={{ color: 'var(--accent2)' }}>How the server decides</span>
          </div>
          <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text)' }}>
            <li>If <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>X-API-Key</code> header is present, the server uses API Key auth exclusively.</li>
            <li>If <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>X-API-Key</code> is absent, it falls back to <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>Authorization: Bearer</code> (JWT).</li>
            <li>There is <strong>no silent fallback</strong>: if your API Key is invalid, the request fails even if you also sent a valid JWT.</li>
            <li>Every successful response includes <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>authMethod: &quot;api_key&quot;</code> or <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)' }}>&quot;jwt&quot;</code> so you can verify which path was used.</li>
          </ul>
        </div>

        {/* Error Codes */}
        <div>
          <h2 className="font-heading text-2xl mb-4" style={{ color: 'var(--text)' }}>API Key Error Codes</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>
            All API Key errors include a machine-readable <code className="font-mono px-1 rounded text-xs" style={{ background: 'var(--surface)', color: 'var(--text)' }}>code</code> field for programmatic handling:
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
              <div key={code} className="glass p-3 flex items-center gap-3" style={{ borderRadius: '12px' }}>
                <code className="text-red-400 text-xs font-mono shrink-0">{code}</code>
                <span className="text-sm" style={{ color: 'var(--text2)' }}>{desc}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-xs mb-2" style={{ color: 'var(--text2)' }}>Example error response:</div>
            <pre className="glass p-3 text-xs overflow-x-auto" style={{ borderRadius: '12px' }}>
              <code className="font-mono" style={{ color: 'var(--text)' }}>{`{
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
          <h2 className="font-heading text-2xl mb-4 flex items-center" style={{ color: 'var(--text)' }}>
            <Shield className="w-7 h-7 mr-3" style={{ color: 'var(--accent)' }} />
            Security Best Practices
          </h2>

          <div className="space-y-4">
            <div className="glass p-4 flex items-start space-x-3" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-display font-semibold mb-1 text-green-400">Use Environment Variables</div>
                <div className="text-sm" style={{ color: 'var(--text)' }}>
                  Never hardcode your API Key in source code. Use environment variables to store sensitive information.
                </div>
                <pre className="mt-3 glass p-3 text-xs overflow-x-auto" style={{ borderRadius: '12px' }}>
                  <code className="font-mono" style={{ color: 'var(--text)' }}>{`# .env file
ILAL_API_KEY=ilal_live_1234567890abcdef...

# In your code
const apiKey = process.env.ILAL_API_KEY;`}</code>
                </pre>
              </div>
            </div>

            <div className="glass p-4 flex items-start space-x-3" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-display font-semibold mb-1 text-green-400">Restrict Key Permissions</div>
                <div className="text-sm" style={{ color: 'var(--text)' }}>
                  Create separate API Keys for different environments (development, staging, production).
                </div>
              </div>
            </div>

            <div className="glass p-4 flex items-start space-x-3" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-display font-semibold mb-1 text-green-400">Rotate Regularly</div>
                <div className="text-sm" style={{ color: 'var(--text)' }}>
                  Periodically rotate your API Keys, especially if you suspect a leak.
                </div>
              </div>
            </div>

            <div className="glass p-4 flex items-start space-x-3" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-display font-semibold mb-1 text-red-400">Never Expose Your Key</div>
                <div className="text-sm" style={{ color: 'var(--text)' }}>
                  Do not commit API Keys to Git repositories. Do not expose keys in client-side code. Do not share keys in public forums.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Management */}
        <div className="glass p-6" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
          <h3 className="font-heading text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--text)' }}>
            <Key className="w-6 h-6 mr-2" style={{ color: 'var(--accent)' }} />
            Manage Your API Keys
          </h3>
          <p className="mb-4" style={{ color: 'var(--text)' }}>
            You can create, view, and revoke API Keys from the Dashboard.
          </p>
          <a href="/dashboard/api-keys" className="btn-primary">
            Go to API Keys Management
          </a>
        </div>
      </div>
    </div>
  );
}
