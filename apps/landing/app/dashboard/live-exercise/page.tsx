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

const DEFAULT_CONFIG: LiveExerciseConfig = {
    generatedAt: '2026-03-12T00:00:00.000Z',
    network: 'Base Sepolia (84532)',
    mode: 'permit',
    pool: {
        fee: 500,
        tickSpacing: 10,
        hook: '0xe633220f15932428FcA60A1A2C2C48797A180A80',
    },
    tokenA: {
        symbol: 'mUSD',
        address: '0xdd3d112a48906807c4b73c94ed884552427e4cf9',
        decimals: 18,
    },
    tokenB: {
        symbol: 'mTBILL',
        address: '0xfb080423cedd4ca56da3f60a4b901f51846459ae',
        decimals: 18,
    },
    notes: [
        'This pool has the ComplianceHook attached -- only wallets with an active ZK session can swap.',
        'mUSD and mTBILL are mock tokens deployed on Base Sepolia for demonstration.',
        'Use the Compliance Demo page to check your session status before swapping.',
    ],
};

export default function LiveExercisePage() {
    const [config, setConfig] = useState<LiveExerciseConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/live-exercise.json', { cache: 'no-store' })
            .then(async (res) => {
                if (!res.ok) throw new Error('Using default mUSD/mTBILL pool config');
                return res.json();
            })
            .then((data) => setConfig(data))
            .catch(() => setConfig(DEFAULT_CONFIG));
    }, []);

    return (
        <motion.div
            className="p-8 pb-24"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
                <div className="space-y-6">
                    <div className="glass p-6">
                        <div className="font-pixel text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
                            Live Exercise
                        </div>
                        <h1 className="font-serif text-3xl font-bold mb-3" style={{ color: 'var(--text)' }}>
                            Full-Chain Permit Swap
                        </h1>
                        <p className="leading-7" style={{ color: 'var(--text2)' }}>
                            This page targets the freshly created testnet pool and signs a real
                            EIP-712 permit in the browser before calling the ILAL-bound Uniswap v4 router.
                        </p>
                    </div>

                    <div className="glass p-6">
                        <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>What This Verifies</h2>
                        <div className="space-y-3 text-sm" style={{ color: 'var(--text2)' }}>
                            <div>1. Frontend signs a real permit with the connected wallet.</div>
                            <div>2. `ComplianceHook` resolves the user from `hookData &gt;= 148 bytes`.</div>
                            <div>3. Session-gated permissioning is enforced against the signed user.</div>
                            <div>4. The trade flows through the native Uniswap v4 router and pool.</div>
                        </div>
                    </div>

                    <div className="glass p-6">
                        <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Pool Details</h2>
                        {config ? (
                            <div className="space-y-3 text-sm" style={{ color: 'var(--text2)' }}>
                                <div className="flex justify-between gap-4">
                                    <span style={{ color: 'var(--text2)' }}>Network</span>
                                    <span style={{ color: 'var(--text)' }}>{config.network}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span style={{ color: 'var(--text2)' }}>Mode</span>
                                    <span style={{ color: 'var(--text)' }}>Frontend Permit Mode</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span style={{ color: 'var(--text2)' }}>Pair</span>
                                    <span style={{ color: 'var(--text)' }}>{config.tokenA.symbol} / {config.tokenB.symbol}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span style={{ color: 'var(--text2)' }}>Fee</span>
                                    <span style={{ color: 'var(--text)' }}>{config.pool.fee}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span style={{ color: 'var(--text2)' }}>Tick Spacing</span>
                                    <span style={{ color: 'var(--text)' }}>{config.pool.tickSpacing}</span>
                                </div>
                                <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                    <div className="text-xs" style={{ color: 'var(--text2)' }}>Token Addresses</div>
                                    <div className="font-mono text-xs break-all" style={{ color: 'var(--text)' }}>{config.tokenA.symbol}: {config.tokenA.address}</div>
                                    <div className="font-mono text-xs break-all" style={{ color: 'var(--text)' }}>{config.tokenB.symbol}: {config.tokenB.address}</div>
                                    <div className="font-mono text-xs break-all" style={{ color: 'var(--text)' }}>Hook: {config.pool.hook}</div>
                                </div>
                                <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                    {config.notes.map((note) => (
                                        <div key={note} className="text-xs" style={{ color: 'var(--text2)' }}>- {note}</div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm" style={{ color: 'var(--text2)' }}>
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
                        <div className="glass p-6 text-sm" style={{ color: 'var(--text2)' }}>
                            {error || 'Run the live integration script first to generate this pool config.'}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
