'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Copy, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { getApiKeys } from '../../../lib/api';
import { getAccessToken } from '../../../lib/auth';
import toast from 'react-hot-toast';
import type { ApiKey } from '../../../lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const endpoints = [
    { method: 'GET' as const, path: '/api/v1/health', description: 'API health check (no auth required)', requiresAuth: false, defaultBody: '' },
    { method: 'GET' as const, path: '/api/v1/session/0x1b869CaC69Df23Ad9D727932496AEb3605538c8D', description: 'Query on-chain session status', requiresAuth: true, defaultBody: '' },
    { method: 'POST' as const, path: '/api/v1/defi/swap', description: 'Build unsigned swap TX (mUSD -> mTBILL)', requiresAuth: true, defaultBody: JSON.stringify({ tokenIn: '0xdd3d112a48906807c4b73c94ed884552427e4cf9', tokenOut: '0xfb080423cedd4ca56da3f60a4b901f51846459ae', amount: '1000000000000000', zeroForOne: true, userAddress: '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D' }, null, 2) },
    { method: 'GET' as const, path: '/api/v1/onboarding/status/0x1b869CaC69Df23Ad9D727932496AEb3605538c8D', description: 'Check institution onboarding status', requiresAuth: true, defaultBody: '' },
];

const methodColors: Record<string, string> = {
    GET: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    POST: 'bg-green-500/20 text-green-400 border-green-500/20',
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function PlaygroundPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [selectedKeyIndex, setSelectedKeyIndex] = useState(0);
    const [selectedEndpoint, setSelectedEndpoint] = useState(0);
    const [requestBody, setRequestBody] = useState(endpoints[0].defaultBody);
    const [response, setResponse] = useState<string | null>(null);
    const [responseStatus, setResponseStatus] = useState<number | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'response' | 'curl' | 'js' | 'python'>('response');
    const [copied, setCopied] = useState(false);
    const [loadingKeys, setLoadingKeys] = useState(true);

    const endpoint = endpoints[selectedEndpoint];
    const fullUrl = `${API_BASE}${endpoint.path}`;

    useEffect(() => { loadApiKeys(); }, []);
    useEffect(() => {
        setRequestBody(endpoints[selectedEndpoint].defaultBody);
        setResponse(null);
        setResponseStatus(null);
        setResponseTime(null);
    }, [selectedEndpoint]);

    async function loadApiKeys() {
        const token = getAccessToken();
        if (!token) { setLoadingKeys(false); return; }
        try { const res = await getApiKeys(token); setApiKeys(res.apiKeys || []); }
        catch { /* silent */ }
        finally { setLoadingKeys(false); }
    }

    async function handleSend() {
        setLoading(true); setResponse(null); setResponseStatus(null); setResponseTime(null);

        const start = Date.now();
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const selectedKey = apiKeys[selectedKeyIndex];
            if (endpoint.requiresAuth && selectedKey) {
                headers['x-api-key'] = selectedKey.key || `${selectedKey.keyPrefix}...`;
            }

            const fetchOptions: RequestInit = {
                method: endpoint.method,
                headers,
            };
            if (endpoint.method === 'POST' && requestBody.trim()) {
                fetchOptions.body = requestBody;
            }

            const res = await fetch(fullUrl, fetchOptions);
            const elapsed = Date.now() - start;
            const data = await res.json().catch(() => ({ error: 'Non-JSON response' }));

            setResponseStatus(res.status);
            setResponse(JSON.stringify(data, null, 2));
            setResponseTime(elapsed);
        } catch (err: any) {
            const elapsed = Date.now() - start;
            setResponseStatus(0);
            setResponse(JSON.stringify({ error: err.message || 'Network error' }, null, 2));
            setResponseTime(elapsed);
        } finally {
            setLoading(false); setActiveTab('response');
        }
    }

    const selectedKey = apiKeys[selectedKeyIndex];
    const keyDisplay = selectedKey ? (selectedKey.key || `${selectedKey.keyPrefix}...`) : 'YOUR_API_KEY';

    const curlCode = `curl -X ${endpoint.method} '${fullUrl}' \\
  -H "x-api-key: ${keyDisplay}" \\
  -H "Content-Type: application/json"${endpoint.method === 'POST' && requestBody ? ` \\
  -d '${requestBody.replace(/\n/g, '')}'` : ''}`;

    const jsCode = `const response = await fetch('${fullUrl}', {
  method: '${endpoint.method}',
  headers: {
    'x-api-key': '${keyDisplay}',
    'Content-Type': 'application/json',
  },${endpoint.method === 'POST' && requestBody ? `
  body: JSON.stringify(${requestBody}),` : ''}
});

const data = await response.json();
console.log(data);`;

    const pythonCode = `import requests

response = requests.${endpoint.method.toLowerCase()}(
    '${fullUrl}',
    headers={
        'x-api-key': '${keyDisplay}',
        'Content-Type': 'application/json'
    },${endpoint.method === 'POST' && requestBody ? `
    json=${requestBody}` : ''}
)

print(response.json())`;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true); toast.success('Copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div className="p-8" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="mb-8">
                <h1 className="font-serif text-3xl font-bold mb-2 flex items-center">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                        <Play className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    </div>
                    API Playground
                </h1>
                <p style={{ color: 'var(--text2)' }}>
                    Test ILAL API endpoints with the configured backend base{' '}
                    <code className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{API_BASE || 'same-origin /api proxy'}</code>
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Panel */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <div className="glass p-4">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text2)' }}>API Key</label>
                        {loadingKeys ? (
                            <div className="flex items-center text-sm" style={{ color: 'var(--text2)' }}><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</div>
                        ) : apiKeys.length === 0 ? (
                            <div className="text-sm text-yellow-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Create a key on the <a href="/dashboard/api-keys" className="hover:underline" style={{ color: 'var(--accent)' }}>API Keys</a> page first
                            </div>
                        ) : (
                            <select value={selectedKeyIndex} onChange={(e) => setSelectedKeyIndex(Number(e.target.value))}
                                className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                                style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'var(--text)' }}
                            >
                                {apiKeys.map((key, i) => <option key={key.id} value={i} style={{ background: 'var(--bg)' }}>{key.name} ({key.keyPrefix}...)</option>)}
                            </select>
                        )}
                    </div>

                    <div className="glass p-4">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text2)' }}>Endpoint</label>
                        <div className="space-y-2">
                            {endpoints.map((ep, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ x: 4 }}
                                    onClick={() => setSelectedEndpoint(i)}
                                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all text-left border"
                                    style={selectedEndpoint === i
                                        ? { background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }
                                        : { borderColor: 'var(--glass-border)' }
                                    }
                                >
                                    <span className={`px-2 py-0.5 rounded font-mono text-xs font-semibold border ${methodColors[ep.method]}`}>{ep.method}</span>
                                    <div className="min-w-0">
                                        <code className="text-xs block truncate" style={{ color: 'var(--text)' }}>{ep.path}</code>
                                        <span className="text-xs" style={{ color: 'var(--text2)' }}>{ep.description}</span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {endpoint.method === 'POST' && (
                        <div className="glass p-4">
                            <label className="block text-sm mb-2" style={{ color: 'var(--text2)' }}>Request Body (JSON)</label>
                            <textarea value={requestBody} onChange={(e) => setRequestBody(e.target.value)} rows={8}
                                className="w-full rounded-lg p-4 text-sm font-mono focus:outline-none transition-all resize-none"
                                style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'var(--text)' }}
                                spellCheck={false}
                            />
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSend}
                        disabled={loading || (endpoint.requiresAuth && apiKeys.length === 0)}
                        className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Sending...</span></>) :
                            (<><Play className="w-5 h-5" /><span>Send Request</span></>)}
                    </motion.button>
                </motion.div>

                {/* Response Panel */}
                <motion.div variants={itemVariants} className="glass overflow-hidden">
                    <div className="flex items-center overflow-x-auto" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        {(['response', 'curl', 'js', 'python'] as const).map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors relative"
                                style={{ color: activeTab === tab ? 'var(--accent)' : 'var(--text2)' }}
                            >
                                {tab === 'response' ? 'Response' : tab === 'curl' ? 'cURL' : tab === 'js' ? 'JavaScript' : 'Python'}
                                {activeTab === tab && (
                                    <motion.div layoutId="playground-tab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                const text = activeTab === 'response' ? (response || '') : activeTab === 'curl' ? curlCode : activeTab === 'js' ? jsCode : pythonCode;
                                handleCopy(text);
                            }}
                            className="absolute top-3 right-3 p-2 rounded-lg transition-colors z-10"
                            style={{ color: 'var(--text2)' }}
                        >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </motion.button>

                        {activeTab === 'response' ? (
                            <div className="p-4">
                                {responseStatus !== null && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center space-x-3 mb-4"
                                    >
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${responseStatus >= 200 && responseStatus < 300
                                            ? 'bg-green-500/20 text-green-400 border-green-500/20'
                                            : responseStatus >= 400 ? 'bg-red-500/20 text-red-400 border-red-500/20' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                                            }`}>{responseStatus || 'ERR'}</span>
                                        {responseTime !== null && (
                                            <span className="text-xs" style={{ color: 'var(--text2)' }}>{responseTime}ms</span>
                                        )}
                                    </motion.div>
                                )}
                                <pre className="rounded-lg p-4 text-sm font-mono overflow-auto max-h-[500px] min-h-[300px]" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'var(--text)' }}>
                                    <code>{response || '// Click "Send Request" to see the response'}</code>
                                </pre>
                            </div>
                        ) : (
                            <pre className="p-4 m-4 rounded-lg text-sm font-mono overflow-auto max-h-[500px] min-h-[300px]" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', color: 'var(--text)' }}>
                                <code>{activeTab === 'curl' ? curlCode : activeTab === 'js' ? jsCode : pythonCode}</code>
                            </pre>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
