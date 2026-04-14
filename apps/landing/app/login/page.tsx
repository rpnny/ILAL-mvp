'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Mode = 'login' | 'register';

export default function LoginPage() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                if (!name) { toast.error('Please enter your name'); setLoading(false); return; }
                await register(email, password, name);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'var(--bg)' }}>
            {/* Background orbs */}
            <div className="orb orb--1" />
            <div className="orb orb--2" />
            <div className="orb orb--3" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-md mx-4 z-10"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 no-underline">
                        <div className="nav-logo-mark">
                            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                                <rect x="16" y="2" width="4" height="4" fill="var(--accent)" />
                                <rect x="12" y="6" width="4" height="4" fill="var(--accent)" />
                                <rect x="8" y="10" width="4" height="4" fill="var(--accent)" />
                                <rect x="8" y="14" width="16" height="4" fill="var(--accent)" />
                                <rect x="20" y="18" width="4" height="4" fill="var(--accent)" />
                                <rect x="16" y="22" width="4" height="4" fill="var(--accent)" />
                                <rect x="12" y="26" width="4" height="4" fill="var(--accent)" />
                            </svg>
                        </div>
                        <span className="nav-logo-text">ILAL</span>
                    </Link>
                    <h1 className="font-serif text-2xl font-normal mb-1" style={{ color: 'var(--text)' }}>
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text2)' }}>
                        {mode === 'login' ? 'Sign in to access your dashboard' : 'Start building with the ILAL API'}
                    </p>
                </div>

                {/* Card */}
                <div className="glass p-8">
                    {/* Mode toggle */}
                    <div className="flex rounded-xl p-1 mb-6 relative"
                        style={{ background: 'var(--surface)' }}>
                        <motion.div
                            layout
                            className="absolute top-1 bottom-1 rounded-lg"
                            style={{
                                width: 'calc(50% - 4px)',
                                left: mode === 'login' ? '4px' : 'calc(50%)',
                                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                        {(['login', 'register'] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className="flex-1 py-2 text-sm font-medium rounded-lg relative z-10 transition-colors duration-200 capitalize"
                                style={{
                                    color: mode === m ? 'var(--accent)' : 'var(--text2)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {m === 'login' ? 'Sign In' : 'Register'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {mode === 'register' && (
                                <motion.div
                                    key="name"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <label className="pixel-label block mb-1.5">Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                                            style={{ color: 'var(--text2)' }} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full rounded-xl px-4 py-3 pl-10 text-sm transition-all outline-none"
                                            style={{
                                                background: 'var(--surface)',
                                                border: '1px solid var(--glass-border)',
                                                color: 'var(--text)',
                                                fontFamily: 'var(--font-body)',
                                            }}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label className="pixel-label block mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: 'var(--text2)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full rounded-xl px-4 py-3 pl-10 text-sm transition-all outline-none"
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text)',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="pixel-label block mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: 'var(--text2)' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={mode === 'register' ? 'Min 8 chars, A-z, 0-9' : 'Your password'}
                                    required
                                    className="w-full rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all outline-none"
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text)',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {mode === 'register' && (
                                <p className="mt-1.5 text-xs" style={{ color: 'var(--text2)' }}>
                                    Must include uppercase, lowercase, and a number
                                </p>
                            )}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full justify-center mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ padding: '14px 28px' }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 rounded-full animate-spin"
                                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>

                <p className="text-center text-sm mt-6">
                    <Link href="/" className="transition-colors no-underline"
                        style={{ color: 'var(--text2)' }}>
                        &larr; Back to home
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
