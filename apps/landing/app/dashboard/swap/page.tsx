'use client';

import { motion } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import SwapWidget from '../../../components/SwapWidget';
import Link from 'next/link';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function SwapPage() {
    const { user } = useAuth();

    return (
        <motion.div
            className="p-8 pb-32"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants} className="mb-8">
                <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>DeFi Swap</h1>
                <p style={{ color: 'var(--text2)' }}>Execute compliant token swaps shielded by ZK verifications.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
                {/* Left Side: Info panel */}
                <div className="flex-1 space-y-6 lg:sticky lg:top-8">
                    <div className="glass p-6">
                        <h3 className="font-serif font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                            Live Network
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text2)' }}>Chain</span>
                                <span className="font-medium" style={{ color: 'var(--text)' }}>Base Sepolia</span>
                            </div>
                            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text2)' }}>Compliance Hook</span>
                                <span className="font-mono text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Active</span>
                            </div>
                            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text2)' }}>Router Version</span>
                                <span className="font-medium" style={{ color: 'var(--text)' }}>v2.0 (Mode 2 + Slippage)</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-5 text-xs leading-relaxed" style={{ borderTop: '1px solid var(--glass-border)', color: 'var(--text2)' }}>
                            This interface uses the <span className="font-medium" style={{ color: 'var(--text)' }}>SimpleSwapRouter</span> integrated with ILAL&apos;s <span className="font-medium" style={{ color: 'var(--text)' }}>ComplianceHook</span>.
                            Transactions will only succeed if you hold a valid on-chain ZK compliance session.
                            <br /><br />
                            <Link href="/dashboard" className="hover:underline" style={{ color: 'var(--accent)' }}>
                                &rarr; View your session status
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Side: Swap Widget */}
                <div className="flex-1 w-full lg:min-w-[420px]">
                    <SwapWidget walletAddress={user?.walletAddress} />
                </div>
            </motion.div>
        </motion.div>
    );
}
