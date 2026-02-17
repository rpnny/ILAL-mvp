'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User, Loader2, Key } from 'lucide-react';

const VALID_INVITE_CODES = ['ILAL-BETA-2026', 'ILAL-EARLY-ACCESS'];

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (showInviteCode && !VALID_INVITE_CODES.includes(inviteCode.toUpperCase())) {
      setError('Invalid invite code');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name, inviteCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    ...(showInviteCode ? [{ key: 'invite', label: 'Invite Code', icon: Key, type: 'text', value: inviteCode, onChange: (v: string) => setInviteCode(v), placeholder: 'ILAL-BETA-2026', required: true, extra: 'uppercase' }] : []),
    { key: 'name', label: 'Name (optional)', icon: User, type: 'text', value: name, onChange: (v: string) => setName(v), placeholder: 'John Doe', required: false },
    { key: 'email', label: 'Email', icon: Mail, type: 'email', value: email, onChange: (v: string) => setEmail(v), placeholder: 'your@email.com', required: true },
    { key: 'password', label: 'Password', icon: Lock, type: 'password', value: password, onChange: (v: string) => setPassword(v), placeholder: '••••••••', required: true, minLength: 8, hint: 'At least 8 characters' },
  ];

  return (
    <div className="container mx-auto px-6 py-8 relative">
      {/* Background glow */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#2962FF]/[0.06] rounded-full blur-[100px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </motion.div>

      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2962FF]/40 to-transparent" />

          <div className="flex justify-center mb-8">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-12 h-12 bg-[#2962FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#2962FF]/30"
            >
              <span className="font-bold text-white text-2xl">I</span>
            </motion.div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Create an ILAL Account</h1>
          <p className="text-gray-400 text-center mb-8">Get started with the compliant DeFi API</p>

          {showInviteCode && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-[#2962FF]/[0.06] border border-[#2962FF]/20 rounded-xl"
            >
              <p className="text-sm text-gray-300">
                <span className="font-medium text-[#2962FF]">Beta Phase</span>
                <br />
                Registration requires an invite code. Contact us to get one.
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map((field, i) => (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                <div className="relative group">
                  <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#2962FF] transition-colors" />
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg focus:outline-none focus:border-[#2962FF]/50 focus:shadow-[0_0_20px_rgba(41,98,255,0.1)] transition-all text-white placeholder-gray-500 ${field.extra === 'uppercase' ? 'uppercase' : ''}`}
                    placeholder={field.placeholder}
                    required={field.required}
                    minLength={field.minLength}
                  />
                </div>
                {field.hint && <p className="mt-2 text-xs text-gray-500">{field.hint}</p>}
              </motion.div>
            ))}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#2962FF] hover:bg-[#2962FF]/90 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-[#2962FF]/20 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#2962FF] to-[#7C4DFF] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center">
                {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Signing up...</>) : 'Sign Up'}
              </span>
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#2962FF] hover:underline transition-colors">Sign in</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
