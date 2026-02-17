'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Loader2, RefreshCw, CheckCircle } from 'lucide-react';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const emailFromUrl = searchParams.get('email') || '';
    const { verifyEmail, resendCode } = useAuth();

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Cooldown timer for resend
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only digits

        const newCode = [...code];
        newCode[index] = value.slice(-1); // Only last char
        setCode(newCode);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits entered
        if (newCode.every(c => c !== '') && value) {
            handleSubmit(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newCode = pasted.split('');
            setCode(newCode);
            handleSubmit(pasted);
        }
    };

    const handleSubmit = async (codeStr?: string) => {
        const fullCode = codeStr || code.join('');
        if (fullCode.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await verifyEmail(emailFromUrl, fullCode);
        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || resending) return;
        setResending(true);
        try {
            await resendCode(emailFromUrl);
            setCooldown(60); // 60 second cooldown
        } catch (err: any) {
            setError(err.message || 'Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="container mx-auto px-6 py-8 relative">
            <Link href="/register" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-8">
                <ArrowLeft className="w-4 h-4" />
                Back to register
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md mx-auto"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2962FF]/10 border border-[#2962FF]/20 mb-4">
                        <Mail className="w-8 h-8 text-[#2962FF]" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
                    <p className="text-gray-400 text-sm">
                        We sent a 6-digit code to
                    </p>
                    <p className="text-white font-medium mt-1">{emailFromUrl}</p>
                </div>

                {/* Code Input */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                    <div className="flex justify-center gap-3 mb-6">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className={`w-12 h-14 text-center text-xl font-bold bg-white/[0.05] border rounded-xl text-white outline-none transition-all
                  ${error ? 'border-red-500/50' : digit ? 'border-[#2962FF]/50' : 'border-white/[0.1]'}
                  focus:border-[#2962FF] focus:bg-white/[0.08]`}
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-red-400 text-sm text-center mb-4"
                        >
                            {error}
                        </motion.p>
                    )}

                    {/* Submit button */}
                    <button
                        onClick={() => handleSubmit()}
                        disabled={loading || code.some(c => c === '')}
                        className="w-full py-3 rounded-xl bg-[#2962FF] text-white font-medium hover:bg-[#2962FF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Verify Email
                            </>
                        )}
                    </button>

                    {/* Resend */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm mb-2">Didn&apos;t receive the code?</p>
                        <button
                            onClick={handleResend}
                            disabled={cooldown > 0 || resending}
                            className="inline-flex items-center gap-2 text-sm text-[#2962FF] hover:text-[#2962FF]/80 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                        </button>
                    </div>
                </div>

                {/* Footer hint */}
                <p className="text-gray-600 text-xs text-center mt-6">
                    The code expires in 15 minutes. Check your spam folder if you don&apos;t see it.
                </p>
            </motion.div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#2962FF]" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
