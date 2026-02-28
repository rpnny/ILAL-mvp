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
                <h1 className="font-heading text-3xl font-bold mb-2">DeFi Swap</h1>
                <p className="text-gray-400">Execute compliant token swaps shielded by ZK verifications.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
                {/* Left Side: Info panel */}
                <div className="flex-1 space-y-6 lg:sticky lg:top-8">
                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 shadow-2xl">
                        <h3 className="font-heading font-semibold text-[#00F0FF] mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
                            Live Network
                        </h3>
                        <div className="space-y-4 text-sm text-gray-300">
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-gray-500">Chain</span>
                                <span className="font-medium text-white">Base Sepolia</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-gray-500">Compliance Hook</span>
                                <span className="font-mono text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Active</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-gray-500">Router Version</span>
                                <span className="font-medium text-white">v1.1 (Slippage Protected)</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-white/[0.06] text-xs text-gray-500 leading-relaxed">
                            This interface uses the <span className="text-white font-medium">SimpleSwapRouter</span> integrated with ILAL's <span className="text-white font-medium">ComplianceHook</span>.
                            Transactions will only succeed if you hold a valid on-chain ZK compliance session.
                            <br /><br />
                            <Link href="/dashboard" className="text-[#00F0FF] hover:underline">
                                → View your session status
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
