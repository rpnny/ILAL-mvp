'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldOff, Play, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const RAILWAY_API = 'https://ilal-mvp-production.up.railway.app';

const COMPLIANT_ADDRESS = '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D';
const NON_COMPLIANT_ADDRESS = '0x000000000000000000000000000000000000dEaD';

type DemoResult = {
    address: string;
    label: string;
    sessionActive: boolean | null;
    onboardingStatus: string | null;
    swapResult: string | null;
    success: boolean;
    loading: boolean;
    elapsed: number | null;
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function ComplianceDemoPage() {
    const [compliant, setCompliant] = useState<DemoResult>({
        address: COMPLIANT_ADDRESS, label: 'Verified Institution', sessionActive: null,
        onboardingStatus: null, swapResult: null, success: false, loading: false, elapsed: null,
    });
    const [nonCompliant, setNonCompliant] = useState<DemoResult>({
        address: NON_COMPLIANT_ADDRESS, label: 'Unregistered Address', sessionActive: null,
        onboardingStatus: null, swapResult: null, success: false, loading: false, elapsed: null,
    });
    const [running, setRunning] = useState(false);

    async function checkAddress(address: string): Promise<Partial<DemoResult>> {
        const start = Date.now();
        try {
            const [sessionRes, onboardingRes] = await Promise.all([
                fetch(`${RAILWAY_API}/api/v1/session/${address}`).then(r => r.json()).catch(() => null),
                fetch(`${RAILWAY_API}/api/v1/onboarding/status/${address}`, {
                    headers: { 'x-api-key': 'demo-check' },
                }).then(r => r.json()).catch(() => null),
            ]);

            const sessionActive = sessionRes?.isActive ?? false;
            const onboardingStatus = onboardingRes?.institution
                ? `KYC ${onboardingRes.institution.kycStatus === 1 ? 'Approved' : 'Pending'} · ${onboardingRes.institution.countryCode}`
                : 'Not Registered';

            let swapResult: string;
            let success: boolean;
            if (sessionActive) {
                swapResult = 'Swap would SUCCEED — active compliance session on-chain';
                success = true;
            } else if (onboardingRes?.institution) {
                swapResult = 'Swap would FAIL — session expired, needs ZK re-verification';
                success = false;
            } else {
                swapResult = 'Swap would FAIL — NotCompliant() revert: no KYC, no session';
                success = false;
            }

            return { sessionActive, onboardingStatus, swapResult, success, elapsed: Date.now() - start };
        } catch {
            return {
                sessionActive: false, onboardingStatus: 'Check failed',
                swapResult: 'Network error', success: false, elapsed: Date.now() - start,
            };
        }
    }

    async function runDemo() {
        setRunning(true);
        setCompliant(prev => ({ ...prev, loading: true, sessionActive: null, onboardingStatus: null, swapResult: null }));
        setNonCompliant(prev => ({ ...prev, loading: true, sessionActive: null, onboardingStatus: null, swapResult: null }));

        const [cResult, ncResult] = await Promise.all([
            checkAddress(COMPLIANT_ADDRESS),
            checkAddress(NON_COMPLIANT_ADDRESS),
        ]);

        setCompliant(prev => ({ ...prev, ...cResult, loading: false }));
        setNonCompliant(prev => ({ ...prev, ...ncResult, loading: false }));
        setRunning(false);
        toast.success('Compliance comparison complete');
    }

    const renderCard = (data: DemoResult, isCompliant: boolean) => {
        const borderColor = data.loading ? 'border-white/[0.08]' :
            data.success ? 'border-green-500/30' : data.swapResult ? 'border-red-500/30' : 'border-white/[0.08]';

        return (
            <motion.div
                variants={itemVariants}
                className={`relative bg-white/[0.02] backdrop-blur-xl border ${borderColor} rounded-xl p-6 overflow-hidden transition-all duration-500`}
            >
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${isCompliant ? 'via-green-500/50' : 'via-red-500/50'} to-transparent`} />

                <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCompliant ? 'bg-green-500/15 border border-green-500/20' : 'bg-red-500/15 border border-red-500/20'}`}>
                        {isCompliant ? <ShieldCheck className="w-5 h-5 text-green-400" /> : <ShieldOff className="w-5 h-5 text-red-400" />}
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-lg">{data.label}</h3>
                        <code className="text-xs text-gray-500">{data.address.slice(0, 10)}...{data.address.slice(-6)}</code>
                    </div>
                </div>

                {data.loading ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Querying on-chain state...
                    </div>
                ) : data.swapResult ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-sm text-gray-400">Session Active</span>
                            <span className={`text-sm font-medium ${data.sessionActive ? 'text-green-400' : 'text-red-400'}`}>
                                {data.sessionActive ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-sm text-gray-400">KYC Status</span>
                            <span className="text-sm font-medium text-gray-300">{data.onboardingStatus}</span>
                        </div>
                        <div className={`p-4 rounded-lg border ${data.success
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                                {data.success ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                                <span className={`font-semibold text-sm ${data.success ? 'text-green-400' : 'text-red-400'}`}>
                                    {data.success ? 'SWAP ALLOWED' : 'SWAP REJECTED'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{data.swapResult}</p>
                        </div>
                        {data.elapsed !== null && (
                            <p className="text-xs text-gray-600 text-right">Checked in {data.elapsed}ms</p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        Click &quot;Run Comparison&quot; to check this address
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <motion.div className="p-8 max-w-5xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="mb-8">
                <h1 className="font-heading text-3xl font-bold mb-2 flex items-center">
                    <div className="w-9 h-9 bg-[#00F0FF]/15 rounded-lg flex items-center justify-center mr-3">
                        <ShieldCheck className="w-5 h-5 text-[#00F0FF]" />
                    </div>
                    Compliance Demo
                </h1>
                <p className="text-gray-400 max-w-2xl">
                    Compare how the ILAL ComplianceHook treats a <span className="text-green-400">verified institution</span> vs
                    an <span className="text-red-400">unregistered address</span>. Non-compliant swaps are atomically reverted at the pool level.
                </p>
            </motion.div>

            {/* Explanation */}
            <motion.div
                variants={itemVariants}
                className="bg-[#00F0FF]/[0.04] border border-[#00F0FF]/15 rounded-xl p-5 mb-8"
            >
                <h3 className="font-semibold text-sm mb-3 text-[#00F0FF]">How it works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                    <div className="flex items-start gap-2">
                        <span className="text-[#00F0FF] font-bold mt-0.5">1</span>
                        <span>Institution completes KYC off-chain and receives an issuer attestation</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-[#00F0FF] font-bold mt-0.5">2</span>
                        <span>ZK proof is generated and verified on-chain, activating a 24h compliance session</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-[#00F0FF] font-bold mt-0.5">3</span>
                        <span>Uniswap V4 Hook checks session before every swap — no session = <code className="text-red-400">NotCompliant()</code> revert</span>
                    </div>
                </div>
            </motion.div>

            {/* Run button */}
            <motion.div variants={itemVariants} className="mb-8">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={runDemo}
                    disabled={running}
                    className="px-8 py-3 bg-[#00F0FF] hover:bg-[#00F0FF]/90 rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-[#00F0FF]/20 flex items-center gap-2 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] to-[#A855F7] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                        {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        {running ? 'Checking...' : 'Run Comparison'}
                    </span>
                </motion.button>
            </motion.div>

            {/* Side-by-side cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderCard(compliant, true)}
                {renderCard(nonCompliant, false)}
            </div>

            {/* Context */}
            <motion.div variants={itemVariants} className="mt-8 text-xs text-gray-600 text-center">
                Queries are live against the Railway API ({RAILWAY_API}) and Base Sepolia on-chain state.
            </motion.div>
        </motion.div>
    );
}
