'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import Link from 'next/link';

export default function BillingSuccessPage() {
    const { refreshUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan') || 'PRO';

    useEffect(() => {
        // Refresh user info so the new plan is reflected immediately
        refreshUser().catch(() => { });
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-md w-full text-center"
            >
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20"
                >
                    <CheckCircle className="w-12 h-12 text-green-400" />
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-bold text-white mb-3"
                >
                    Payment Successful!
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-400 mb-2"
                >
                    Your account has been upgraded to the
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="inline-flex items-center gap-2 bg-[#2962FF]/10 border border-[#2962FF]/30 rounded-full px-4 py-2 mb-8"
                >
                    <Zap className="w-4 h-4 text-[#2962FF]" />
                    <span className="text-[#2962FF] font-semibold">{plan} Plan</span>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-sm text-gray-500 mb-8"
                >
                    Your new limits are now active. You can start making more API calls immediately.
                </motion.p>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 bg-[#2962FF] hover:bg-[#2962FF]/90 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200"
                    >
                        Go to Dashboard
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
