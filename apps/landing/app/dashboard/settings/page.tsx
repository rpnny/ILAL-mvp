'use client';

import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Settings, User, Mail, Lock, Zap, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccessToken } from '../../../lib/auth';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const PLANS = [
  {
    id: 'PRO',
    name: 'Pro',
    price: '$49',
    color: '#00F0FF',
    features: ['10,000 API calls / month', '100 requests / minute', 'Up to 20 API Keys', 'Email support'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: '$199',
    color: '#8B5CF6',
    features: ['Unlimited API calls', '1,000 requests / minute', 'Unlimited API Keys', 'Dedicated support'],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  if (!user) return null;

  const handleUpgrade = async (targetPlan: 'PRO' | 'ENTERPRISE') => {
    setUpgrading(targetPlan);
    try {
      const token = getAccessToken();
      const res = await fetch('http://localhost:3001/api/v1/stripe/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetPlan }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create checkout session');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to start upgrade');
      setUpgrading(null);
    }
  };

  return (
    <motion.div className="p-8 max-w-4xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2 flex items-center">
          <div className="w-9 h-9 bg-[#00F0FF]/15 rounded-lg flex items-center justify-center mr-3">
            <Settings className="w-5 h-5 text-[#00F0FF]" />
          </div>
          Account Settings
        </h1>
        <p className="text-gray-400">Manage your account information and preferences</p>
      </motion.div>

      {/* Account Info */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00F0FF]/30 to-transparent" />
        <h2 className="font-heading text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 bg-[#00F0FF]/15 rounded flex items-center justify-center mr-2">
            <User className="w-4 h-4 text-[#00F0FF]" />
          </div>
          Account Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <div className="flex items-center space-x-3 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg">
              <Mail className="w-5 h-5 text-gray-500" />
              <span>{user.email}</span>
            </div>
          </div>
          {user.name && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name</label>
              <div className="flex items-center space-x-3 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg">
                <User className="w-5 h-5 text-gray-500" />
                <span>{user.name}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-2">User ID</label>
            <div className="px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg">
              <code className="text-sm text-gray-400 font-mono">{user.id}</code>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Current Plan + Upgrade */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <h2 className="font-heading text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 bg-purple-500/15 rounded flex items-center justify-center mr-2">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          Current Plan
        </h2>

        {/* Current plan badge */}
        <div className="border border-[#00F0FF]/25 bg-gradient-to-br from-[#00F0FF]/[0.08] to-transparent rounded-xl p-5 mb-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="font-heading text-2xl font-bold mb-1">{user.plan || 'FREE'} Plan</h3>
              <p className="text-sm text-gray-400">{user.plan === 'FREE' ? 'Free forever' : 'Monthly subscription'}</p>
            </div>
            <div className="px-4 py-2 bg-[#00F0FF]/20 text-[#00F0FF] rounded-lg font-medium border border-[#00F0FF]/20">
              Active
            </div>
          </div>
        </div>

        {/* Upgrade cards */}
        {user.plan !== 'ENTERPRISE' && (
          <div>
            <p className="text-sm text-gray-400 mb-4">Upgrade your plan to unlock higher limits:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANS.filter(p => {
                const order: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
                return (order[p.id] ?? 0) > (order[user.plan ?? 'FREE'] ?? 0);
              }).map(plan => (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="relative border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-5 transition-all duration-200 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${plan.color}10, transparent)` }}
                >
                  <div
                    className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
                    style={{ background: plan.color }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
                      <span className="font-heading text-xl font-bold" style={{ color: plan.color }}>
                        {plan.price}<span className="text-xs text-gray-400 font-normal">/mo</span>
                      </span>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleUpgrade(plan.id as 'PRO' | 'ENTERPRISE')}
                      disabled={upgrading !== null}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-60"
                      style={{ background: plan.color }}
                    >
                      {upgrading === plan.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</>
                      ) : (
                        <>Upgrade to {plan.name} <ArrowRight className="w-4 h-4" /></>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Security */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
        <h2 className="font-heading text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 bg-green-500/15 rounded flex items-center justify-center mr-2">
            <Lock className="w-4 h-4 text-green-400" />
          </div>
          Security
        </h2>
        <div className="space-y-4">
          <motion.div
            whileHover={{ x: 4 }}
            className="flex items-center justify-between p-4 border border-white/[0.08] rounded-lg hover:border-white/[0.15] transition-all duration-200"
          >
            <div>
              <div className="font-medium mb-1">Password</div>
              <div className="text-sm text-gray-400">Last changed: Unknown</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 border border-white/[0.1] rounded-lg hover:bg-white/[0.04] transition-all"
              onClick={() => toast('Password change coming soon')}
            >
              Change Password
            </motion.button>
          </motion.div>

          <motion.div
            whileHover={{ x: 4 }}
            className="flex items-center justify-between p-4 border border-white/[0.08] rounded-lg hover:border-white/[0.15] transition-all duration-200"
          >
            <div>
              <div className="font-medium mb-1">API Keys</div>
              <div className="text-sm text-gray-400">Manage your API Keys</div>
            </div>
            <motion.a
              href="/dashboard/api-keys"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 bg-[#00F0FF] hover:bg-[#00F0FF]/90 rounded-lg transition-all shadow-lg shadow-[#00F0FF]/20"
            >
              Manage
            </motion.a>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
