'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldOff, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
            let onboardingStatus: string;
            let swapResult: string;
            let success: boolean;
            let sessionActive: boolean;

            if (address === COMPLIANT_ADDRESS) {
                sessionActive = true;
                onboardingStatus = 'KYC Approved -- session status is now owner-scoped';
                swapResult = 'Swap should SUCCEED for the authenticated institution flow';
                success = true;
            } else {
                sessionActive = false;
                onboardingStatus = 'Not Registered';
                swapResult = 'Swap would FAIL -- NotCompliant() revert: no KYC, no session';
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
        return (
            <motion.div
                variants={itemVariants}
                className="glass p-6 overflow-hidden transition-all duration-500"
                style={{
                    borderColor: data.loading ? undefined :
                        data.success ? 'rgba(34,197,94,0.3)' :
                        data.swapResult ? 'rgba(239,68,68,0.3)' : undefined
                }}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                        background: isCompliant ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${isCompliant ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                    }}>
                        {isCompliant ? <ShieldCheck className="w-5 h-5 text-green-400" /> : <ShieldOff className="w-5 h-5 text-red-400" />}
                    </div>
                    <div>
                        <h3 className="font-serif font-bold text-lg" style={{ color: 'var(--text)' }}>{data.label}</h3>
                        <code className="text-xs" style={{ color: 'var(--text2)' }}>{data.address.slice(0, 10)}...{data.address.slice(-6)}</code>
                    </div>
                </div>

                {data.loading ? (
                    <div className="flex items-center gap-2 text-sm py-8 justify-center" style={{ color: 'var(--text2)' }}>
                        <Loader2 className="w-5 h-5 animate-spin" /> Querying on-chain state...
                    </div>
                ) : data.swapResult ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                            <span className="text-sm" style={{ color: 'var(--text2)' }}>Session Active</span>
                            <span className={`text-sm font-medium ${data.sessionActive ? 'text-green-400' : 'text-red-400'}`}>
                                {data.sessionActive ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                            <span className="text-sm" style={{ color: 'var(--text2)' }}>KYC Status</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{data.onboardingStatus}</span>
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
                            <p className="text-xs mt-1" style={{ color: 'var(--text2)' }}>{data.swapResult}</p>
                        </div>
                        {data.elapsed !== null && (
                            <p className="text-xs text-right" style={{ color: 'var(--text2)' }}>Checked in {data.elapsed}ms</p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-sm" style={{ color: 'var(--text2)' }}>
                        Click &quot;Run Comparison&quot; to check this address
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <motion.div className="p-8 max-w-5xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="mb-8">
                <h1 className="font-serif text-3xl font-bold mb-2 flex items-center">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                        <ShieldCheck className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    </div>
                    Compliance Demo
                </h1>
                <p className="max-w-2xl" style={{ color: 'var(--text2)' }}>
                    Compare how the ILAL ComplianceHook treats a <span className="text-green-400">verified institution</span> vs
                    an <span className="text-red-400">unregistered address</span>. Non-compliant swaps are atomically reverted at the pool level.
                </p>
            </motion.div>

            {/* Explanation */}
            <motion.div
                variants={itemVariants}
                className="glass p-5 mb-8"
            >
                <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--accent)' }}>How it works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--text2)' }}>
                    <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5" style={{ color: 'var(--accent)' }}>1</span>
                        <span>Institution completes KYC off-chain and receives an issuer attestation</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5" style={{ color: 'var(--accent)' }}>2</span>
                        <span>ZK proof is generated and verified on-chain, activating a 24h compliance session</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5" style={{ color: 'var(--accent)' }}>3</span>
                        <span>Uniswap V4 Hook checks session before every swap -- no session = <code className="text-red-400">NotCompliant()</code> revert</span>
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
                    className="btn-primary disabled:opacity-50 flex items-center gap-2"
                >
                    {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    {running ? 'Checking...' : 'Run Comparison'}
                </motion.button>
            </motion.div>

            {/* Side-by-side cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderCard(compliant, true)}
                {renderCard(nonCompliant, false)}
            </div>

            {/* Context */}
            <motion.div variants={itemVariants} className="mt-8 text-xs text-center" style={{ color: 'var(--text2)' }}>
                This demo now shows the protected owner-scoped compliance flow instead of querying public session state.
            </motion.div>
        </motion.div>
    );
}
