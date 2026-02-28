'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldOff, RefreshCcw, Clock } from 'lucide-react';
import { getSessionStatus, renewSession } from '../lib/api';
import { getAccessToken } from '../lib/auth';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────

type SessionStatus = {
    active: boolean;
    remainingSeconds: number;
    expiresAt: number | null;
};

type StatusLevel = 'active' | 'expiring' | 'expired' | 'unknown';

// ── Helpers ───────────────────────────────────────────────────

function getLevel(status: SessionStatus | null): StatusLevel {
    if (!status) return 'unknown';
    if (!status.active) return 'expired';
    if (status.remainingSeconds < 2 * 3600) return 'expiring'; // < 2 hours
    return 'active';
}

function formatCountdown(seconds: number): string {
    if (seconds <= 0) return 'Expired';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

const LEVEL_CONFIG = {
    active: {
        icon: ShieldCheck,
        label: 'Session Active',
        color: '#10B981',
        bgGradient: 'from-green-500/20 to-green-500/5',
        borderColor: 'border-green-500/20',
        pillBg: 'bg-green-500/15 text-green-400',
    },
    expiring: {
        icon: ShieldAlert,
        label: 'Session Expiring',
        color: '#F59E0B',
        bgGradient: 'from-amber-500/20 to-amber-500/5',
        borderColor: 'border-amber-500/20',
        pillBg: 'bg-amber-500/15 text-amber-400',
    },
    expired: {
        icon: ShieldOff,
        label: 'Session Expired',
        color: '#EF4444',
        bgGradient: 'from-red-500/20 to-red-500/5',
        borderColor: 'border-red-500/20',
        pillBg: 'bg-red-500/15 text-red-400',
    },
    unknown: {
        icon: ShieldOff,
        label: 'Session Unknown',
        color: '#6B7280',
        bgGradient: 'from-gray-500/10 to-gray-500/5',
        borderColor: 'border-white/[0.08]',
        pillBg: 'bg-gray-500/15 text-gray-400',
    },
};

// ── Component ─────────────────────────────────────────────────

interface SessionStatusCardProps {
    /** On-chain wallet address to check. */
    walletAddress?: string;
}

export default function SessionStatusCard({ walletAddress }: SessionStatusCardProps) {
    const [status, setStatus] = useState<SessionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [renewing, setRenewing] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const fetchStatus = useCallback(async () => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }
        const token = getAccessToken();
        if (!token) { setLoading(false); return; }

        try {
            const data = await getSessionStatus(token, walletAddress);
            setStatus(data);
            setCountdown(data.remainingSeconds);
        } catch {
            // Non-fatal: show unknown state
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    // Initial fetch
    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    // Live countdown tick
    useEffect(() => {
        if (!status?.active) return;
        const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [status?.active]);

    // Re-fetch every 5 minutes to stay in sync with chain
    useEffect(() => {
        const id = setInterval(fetchStatus, 5 * 60 * 1000);
        return () => clearInterval(id);
    }, [fetchStatus]);

    const handleRenew = async () => {
        if (!walletAddress) return;
        const token = getAccessToken();
        if (!token) return;

        setRenewing(true);
        try {
            await renewSession(token, walletAddress);
            toast.success('Session renewal request submitted');
            await fetchStatus();
        } catch (err: any) {
            toast.error(err.message || 'Renewal failed');
        } finally {
            setRenewing(false);
        }
    };

    if (!walletAddress) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 mb-8 flex flex-col items-center justify-center text-center text-gray-400"
            >
                <ShieldOff className="w-8 h-8 mb-3 opacity-50" />
                <h3 className="font-semibold text-white mb-1">No Wallet Linked</h3>
                <p className="text-sm max-w-sm">
                    Link a Web3 wallet address to your ILAL account (e.g. via Settings) to monitor and renew on-chain compliance sessions.
                </p>
            </motion.div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 animate-pulse mb-8">
                <div className="h-5 w-48 bg-white/[0.06] rounded mb-3" />
                <div className="h-4 w-32 bg-white/[0.04] rounded" />
            </div>
        );
    }

    const level = getLevel(status);
    const cfg = LEVEL_CONFIG[level];
    const Icon = cfg.icon;
    const showRenewCta = level === 'expiring' || level === 'expired';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`relative bg-white/[0.02] backdrop-blur-xl border ${cfg.borderColor} rounded-xl p-6 mb-8 overflow-hidden group`}
        >
            {/* Top accent line */}
            <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${cfg.color}60, transparent)` }}
            />
            {/* Hover glow */}
            <div
                className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ backgroundColor: `${cfg.color}12` }}
            />

            <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
                {/* Left: icon + title + pill */}
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cfg.color}20`, border: `1px solid ${cfg.color}30` }}
                    >
                        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-heading font-semibold text-base">Compliance Session</h2>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.pillBg}`}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            On-chain ZK compliance status · Base Sepolia
                        </p>
                    </div>
                </div>

                {/* Right: countdown + renew */}
                <div className="flex items-center gap-3 ml-auto">
                    {status && (
                        <div className={`flex items-center gap-1.5 text-sm ${status.active ? 'text-gray-400' : 'text-red-400'}`}>
                            <Clock className="w-4 h-4" />
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={Math.floor(countdown / 60)}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className="font-mono tabular-nums font-medium"
                                >
                                    {status.active ? `${formatCountdown(countdown)} remaining` : '0h 0m (Expired)'}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    )}

                    {showRenewCta && (
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={handleRenew}
                            disabled={renewing}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                            style={{
                                backgroundColor: `${cfg.color}20`,
                                color: cfg.color,
                                border: `1px solid ${cfg.color}40`,
                            }}
                        >
                            <RefreshCcw className={`w-4 h-4 ${renewing ? 'animate-spin' : ''}`} />
                            {renewing ? 'Renewing…' : 'Renew Session'}
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Warning strip for expiring/expired */}
            {showRenewCta && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative z-10 mt-4 pt-4 border-t border-white/[0.06] text-sm"
                    style={{ color: cfg.color }}
                >
                    {level === 'expiring'
                        ? '⚠️ Your ZK compliance session expires in under 2 hours. Renew now to avoid swap interruptions.'
                        : '🔴 Your ZK session has expired. You must renew to continue making compliant swaps.'}
                </motion.div>
            )}
        </motion.div>
    );
}
