'use client';

import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Settings, User, Mail, Lock, Zap, CheckCircle2, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccessToken } from '../../../lib/auth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
    features: ['10,000 API calls / month', '100 requests / minute', 'Up to 20 API Keys', 'Email support'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: '$199',
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
      const res = await fetch(`${API_URL}/api/v1/stripe/create-session`, {
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
        <h1 className="font-serif text-3xl font-bold mb-2 flex items-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          Account Settings
        </h1>
        <p style={{ color: 'var(--text2)' }}>Manage your account information and preferences</p>
      </motion.div>

      {/* Account Info */}
      <motion.div
        variants={itemVariants}
        className="glass p-6 mb-6 overflow-hidden"
      >
        <h2 className="font-serif text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 rounded flex items-center justify-center mr-2" style={{ background: 'var(--surface)' }}>
            <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          Account Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text2)' }}>Email</label>
            <div className="flex items-center space-x-3 px-4 py-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <Mail className="w-5 h-5" style={{ color: 'var(--text2)' }} />
              <span style={{ color: 'var(--text)' }}>{user.email}</span>
            </div>
          </div>
          {user.name && (
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text2)' }}>Name</label>
              <div className="flex items-center space-x-3 px-4 py-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                <User className="w-5 h-5" style={{ color: 'var(--text2)' }} />
                <span style={{ color: 'var(--text)' }}>{user.name}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text2)' }}>User ID</label>
            <div className="px-4 py-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <code className="text-sm font-mono" style={{ color: 'var(--text2)' }}>{user.id}</code>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Current Plan + Upgrade */}
      <motion.div
        variants={itemVariants}
        className="glass p-6 mb-6 overflow-hidden"
      >
        <h2 className="font-serif text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 rounded flex items-center justify-center mr-2" style={{ background: 'rgba(168,85,247,0.1)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent2)' }} />
          </div>
          Current Plan
        </h2>

        {/* Current plan badge */}
        <div className="rounded-xl p-5 mb-6 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{user.plan || 'FREE'} Plan</h3>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>{user.plan === 'FREE' ? 'Free forever' : 'Monthly subscription'}</p>
            </div>
            <div className="px-4 py-2 rounded-lg font-medium text-sm" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)' }}>
              Active
            </div>
          </div>
        </div>

        {/* Upgrade cards */}
        {user.plan !== 'ENTERPRISE' && (
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>Upgrade your plan to unlock higher limits:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANS.filter(p => {
                const order: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
                return (order[p.id] ?? 0) > (order[user.plan ?? 'FREE'] ?? 0);
              }).map(plan => (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="glass p-5 transition-all duration-200 overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>{plan.name}</h3>
                      <span className="font-serif text-xl font-bold" style={{ color: 'var(--accent)' }}>
                        {plan.price}<span className="text-xs font-normal" style={{ color: 'var(--text2)' }}>/mo</span>
                      </span>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text2)' }}>
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleUpgrade(plan.id as 'PRO' | 'ENTERPRISE')}
                      disabled={upgrading !== null}
                      className="btn-primary w-full justify-center disabled:opacity-60"
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
        className="glass p-6 overflow-hidden"
      >
        <h2 className="font-serif text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 rounded flex items-center justify-center mr-2" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Lock className="w-4 h-4 text-green-400" />
          </div>
          Security
        </h2>
        <div className="space-y-4">
          <motion.div
            whileHover={{ x: 4 }}
            className="flex items-center justify-between p-4 rounded-lg transition-all duration-200"
            style={{ border: '1px solid var(--glass-border)' }}
          >
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>API Keys</div>
              <div className="text-sm" style={{ color: 'var(--text2)' }}>Manage your API Keys</div>
            </div>
            <Link
              href="/dashboard/api-keys"
              className="btn-primary text-sm"
            >
              Manage
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ x: 4 }}
            className="flex items-center justify-between p-4 rounded-lg transition-all duration-200"
            style={{ border: '1px solid var(--glass-border)' }}
          >
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>Support</div>
              <div className="text-sm" style={{ color: 'var(--text2)' }}>Password resets, account issues, and questions</div>
            </div>
            <a
              href="mailto:2867755637@qq.com"
              className="btn-ghost text-sm"
            >
              Contact <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
