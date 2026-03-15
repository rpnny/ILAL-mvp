'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SwapWidget from '../../../components/SwapWidget';

type LiveExerciseConfig = {
    generatedAt: string;
    network: string;
    mode: 'permit';
    pool: {
        fee: number;
        tickSpacing: number;
        hook: `0x${string}`;
    };
    tokenA: {
        symbol: string;
        address: `0x${string}`;
        decimals: number;
    };
    tokenB: {
        symbol: string;
        address: `0x${string}`;
        decimals: number;
    };
    notes: string[];
};

export default function LiveExercisePage() {
    const [config, setConfig] = useState<LiveExerciseConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/live-exercise.json', { cache: 'no-store' })
            .then(async (res) => {
                if (!res.ok) throw new Error('Live exercise config not generated yet');
                return res.json();
            })
            .then((data) => setConfig(data))
            .catch((err: Error) => setError(err.message));
    }, []);

    return (
        <motion.div
            className="p-8 pb-24"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
                <div className="space-y-6">
                    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6">
                        <div className="text-xs uppercase tracking-[0.22em] text-[#00F0FF] mb-3">
                            Live Exercise
                        </div>
                        <h1 className="font-heading text-3xl font-bold mb-3">
                            Full-Chain Permit Swap
                        </h1>
                        <p className="text-gray-400 leading-7">
                            This page targets the freshly created testnet pool and signs a real
                            EIP-712 permit in the browser before calling the ILAL-bound Uniswap v4 router.
                        </p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6">
                        <h2 className="font-heading text-lg font-semibold mb-4">What This Verifies</h2>
                        <div className="space-y-3 text-sm text-gray-300">
                            <div>1. Frontend signs a real permit with the connected wallet.</div>
                            <div>2. `ComplianceHook` resolves the user from `hookData >= 148 bytes`.</div>
                            <div>3. Session-gated permissioning is enforced against the signed user.</div>
                            <div>4. The trade flows through the native Uniswap v4 router and pool.</div>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6">
                        <h2 className="font-heading text-lg font-semibold mb-4">Pool Details</h2>
                        {config ? (
                            <div className="space-y-3 text-sm text-gray-300">
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Network</span>
                                    <span>{config.network}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Mode</span>
                                    <span>Frontend Permit Mode</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Pair</span>
                                    <span>{config.tokenA.symbol} / {config.tokenB.symbol}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Fee</span>
                                    <span>{config.pool.fee}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Tick Spacing</span>
                                    <span>{config.pool.tickSpacing}</span>
                                </div>
                                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                                    <div className="text-xs text-gray-500">Token Addresses</div>
                                    <div className="font-mono text-xs break-all">{config.tokenA.symbol}: {config.tokenA.address}</div>
                                    <div className="font-mono text-xs break-all">{config.tokenB.symbol}: {config.tokenB.address}</div>
                                    <div className="font-mono text-xs break-all">Hook: {config.pool.hook}</div>
                                </div>
                                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                                    {config.notes.map((note) => (
                                        <div key={note} className="text-xs text-gray-400">- {note}</div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400">
                                {error || 'Waiting for live exercise config...'}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    {config ? (
                        <SwapWidget
                            tokenA={config.tokenA}
                            tokenB={config.tokenB}
                            mode="permit"
                        />
                    ) : (
                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 text-sm text-gray-400">
                            {error || 'Run the live integration script first to generate this pool config.'}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
