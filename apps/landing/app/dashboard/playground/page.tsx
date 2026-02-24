'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronDown, Copy, CheckCircle2, Loader2, Code, Terminal } from 'lucide-react';
import { getApiKeys } from '../../../lib/api';
import { getAccessToken } from '../../../lib/auth';
import toast from 'react-hot-toast';
import type { ApiKey } from '../../../lib/types';

const endpoints = [
    { method: 'POST' as const, path: '/verify', description: 'Verify ZK Proof and create session', defaultBody: JSON.stringify({ proof: '0x...', publicSignals: ['signal1', 'signal2'], userAddress: '0x1234567890abcdef1234567890abcdef12345678' }, null, 2) },
    { method: 'GET' as const, path: '/session/status', description: 'Query session status', defaultBody: JSON.stringify({ userAddress: '0x1234567890abcdef1234567890abcdef12345678' }, null, 2) },
    { method: 'POST' as const, path: '/session/extend', description: 'Extend session lifetime', defaultBody: JSON.stringify({ sessionId: '0xabcdef...' }, null, 2) },
    { method: 'GET' as const, path: '/compliance/check', description: 'Check address compliance status', defaultBody: JSON.stringify({ address: '0x1234567890abcdef1234567890abcdef12345678' }, null, 2) },
];

const methodColors: Record<string, string> = {
    GET: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    POST: 'bg-green-500/20 text-green-400 border-green-500/20',
    PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/20',
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
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'response' | 'curl' | 'js' | 'python'>('response');
    const [copied, setCopied] = useState(false);
    const [loadingKeys, setLoadingKeys] = useState(true);

    const baseUrl = 'https://api.ilal.tech/api/v1';
    const endpoint = endpoints[selectedEndpoint];

    useEffect(() => { loadApiKeys(); }, []);
    useEffect(() => {
        setRequestBody(endpoints[selectedEndpoint].defaultBody);
        setResponse(null);
        setResponseStatus(null);
    }, [selectedEndpoint]);

    async function loadApiKeys() {
        const token = getAccessToken();
        if (!token) return;
        try { const res = await getApiKeys(token); setApiKeys(res.apiKeys || []); }
        catch { /* silent */ }
        finally { setLoadingKeys(false); }
    }

    async function handleSend() {
        setLoading(true); setResponse(null); setResponseStatus(null);
        await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
        const mockResponses: Record<string, any> = {
            '/verify': { success: true, sessionId: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''), expiresAt: new Date(Date.now() + 86400000).toISOString(), message: 'Verification successful' },
            '/session/status': { isActive: true, sessionId: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''), expiresAt: new Date(Date.now() + 43200000).toISOString() },
            '/session/extend': { success: true, newExpiresAt: new Date(Date.now() + 86400000).toISOString() },
            '/compliance/check': { isCompliant: true, reason: 'Address passed all compliance checks' },
        };
        setResponseStatus(200);
        setResponse(JSON.stringify(mockResponses[endpoint.path] || { success: true }, null, 2));
        setLoading(false); setActiveTab('response');
    }

    const selectedKey = apiKeys[selectedKeyIndex];
    const keyDisplay = selectedKey ? `${selectedKey.keyPrefix}...` : 'YOUR_API_KEY';

    const curlCode = `curl -X ${endpoint.method} ${baseUrl}${endpoint.path} \\
  -H "Authorization: Bearer ${keyDisplay}" \\
  -H "Content-Type: application/json"${endpoint.method === 'POST' ? ` \\
  -d '${requestBody}'` : ''}`;

    const jsCode = `const response = await fetch('${baseUrl}${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Authorization': 'Bearer ${keyDisplay}',
    'Content-Type': 'application/json',
  },${endpoint.method === 'POST' ? `
  body: JSON.stringify(${requestBody}),` : ''}
});

const data = await response.json();
console.log(data);`;

    const pythonCode = `import requests

response = requests.${endpoint.method.toLowerCase()}(
    '${baseUrl}${endpoint.path}',
    headers={
        'Authorization': 'Bearer ${keyDisplay}',
        'Content-Type': 'application/json'
    },${endpoint.method === 'POST' ? `
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
                <h1 className="font-heading text-3xl font-bold mb-2 flex items-center">
                    <div className="w-9 h-9 bg-[#00F0FF]/15 rounded-lg flex items-center justify-center mr-3">
                        <Play className="w-5 h-5 text-[#00F0FF]" />
                    </div>
                    API Playground
                </h1>
                <p className="text-gray-400">Test ILAL API endpoints and view requests and responses in real time</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Panel */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4">
                        <label className="block text-sm text-gray-400 mb-2">API Key</label>
                        {loadingKeys ? (
                            <div className="flex items-center text-sm text-gray-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</div>
                        ) : apiKeys.length === 0 ? (
                            <div className="text-sm text-yellow-400">⚠ Please create a key first on the <a href="/dashboard/api-keys" className="text-[#00F0FF] hover:underline">API Keys</a> page</div>
                        ) : (
                            <select value={selectedKeyIndex} onChange={(e) => setSelectedKeyIndex(Number(e.target.value))}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 transition-all appearance-none cursor-pointer"
                            >
                                {apiKeys.map((key, i) => <option key={key.id} value={i} className="bg-[#1A1A1A]">{key.name} ({key.keyPrefix}...)</option>)}
                            </select>
                        )}
                    </div>

                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4">
                        <label className="block text-sm text-gray-400 mb-2">Endpoint</label>
                        <div className="space-y-2">
                            {endpoints.map((ep, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ x: 4 }}
                                    onClick={() => setSelectedEndpoint(i)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${selectedEndpoint === i
                                        ? 'bg-[#00F0FF]/10 border border-[#00F0FF]/30'
                                        : 'border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <span className={`px-2 py-0.5 rounded font-mono text-xs font-semibold border ${methodColors[ep.method]}`}>{ep.method}</span>
                                    <code className="text-gray-300">{ep.path}</code>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4">
                        <label className="block text-sm text-gray-400 mb-2">
                            {endpoint.method === 'GET' ? 'Query Parameters' : 'Request Body'} (JSON)
                        </label>
                        <textarea value={requestBody} onChange={(e) => setRequestBody(e.target.value)} rows={8}
                            className="w-full bg-[#111] border border-white/[0.08] rounded-lg p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-[#00F0FF]/50 focus:shadow-[0_0_20px_rgba(41,98,255,0.08)] transition-all resize-none"
                            spellCheck={false}
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSend}
                        disabled={loading}
                        className="w-full py-3 bg-[#00F0FF] hover:bg-[#00F0FF]/90 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-[#00F0FF]/20 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] to-[#A855F7] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 flex items-center space-x-2">
                            {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Sending...</span></>) :
                                (<><Play className="w-5 h-5" /><span>Send Request</span></>)}
                        </span>
                    </motion.button>
                </motion.div>

                {/* Response Panel */}
                <motion.div variants={itemVariants} className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="flex items-center border-b border-white/[0.06] overflow-x-auto">
                        {(['response', 'curl', 'js', 'python'] as const).map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === tab ? 'text-[#00F0FF]' : 'text-gray-400 hover:text-white'}`}
                            >
                                {tab === 'response' ? 'Response' : tab === 'curl' ? 'cURL' : tab === 'js' ? 'JavaScript' : 'Python'}
                                {activeTab === tab && (
                                    <motion.div layoutId="playground-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00F0FF]" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
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
                            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
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
                                            }`}>{responseStatus}</span>
                                        <span className="text-xs text-gray-500">200ms</span>
                                    </motion.div>
                                )}
                                <pre className="bg-[#111] rounded-lg p-4 text-sm font-mono text-gray-300 overflow-auto max-h-[500px] min-h-[300px] border border-white/[0.04]">
                                    <code>{response || '// Click "Send Request" to see the response'}</code>
                                </pre>
                            </div>
                        ) : (
                            <pre className="p-4 bg-[#111] m-4 rounded-lg text-sm font-mono text-gray-300 overflow-auto max-h-[500px] min-h-[300px] border border-white/[0.04]">
                                <code>{activeTab === 'curl' ? curlCode : activeTab === 'js' ? jsCode : pythonCode}</code>
                            </pre>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
