'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Zap, ArrowRight, Lock, Mail, User } from 'lucide-react';
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
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center relative overflow-hidden">
            {/* Background grid */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
                backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                backgroundSize: '48px 48px'
            }} />
            {/* Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00F0FF]/5 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-md mx-4"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-9 h-9 bg-[#00F0FF]/15 rounded-xl flex items-center justify-center border border-[#00F0FF]/20">
                            <Zap className="w-5 h-5 text-[#00F0FF]" />
                        </div>
                        <span className="font-heading font-bold text-xl tracking-wide">ILAL</span>
                    </Link>
                    <h1 className="font-heading text-2xl font-bold mb-1">
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {mode === 'login' ? 'Sign in to access your dashboard' : 'Start building with the ILAL API'}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
                    {/* Mode toggle */}
                    <div className="flex bg-white/[0.04] rounded-xl p-1 mb-6 relative">
                        <motion.div
                            layout
                            className="absolute top-1 bottom-1 bg-[#00F0FF]/15 border border-[#00F0FF]/30 rounded-lg"
                            style={{ width: 'calc(50% - 4px)', left: mode === 'login' ? '4px' : 'calc(50%)' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                        {(['login', 'register'] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg relative z-10 transition-colors duration-200 capitalize ${mode === m ? 'text-[#00F0FF]' : 'text-gray-400 hover:text-gray-200'
                                    }`}
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
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/40 focus:bg-white/[0.06] transition-all"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/40 focus:bg-white/[0.06] transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={mode === 'register' ? 'Min 8 characters' : 'Your password'}
                                    required
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/40 focus:bg-white/[0.06] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black font-semibold rounded-xl transition-all shadow-lg shadow-[#00F0FF]/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>

                <p className="text-center text-gray-600 text-sm mt-6">
                    <Link href="/" className="hover:text-gray-300 transition-colors">← Back to home</Link>
                </p>
            </motion.div>
        </div>
    );
}
