'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getApiKeys, getUsageStats } from '../../lib/api';
import { getAccessToken } from '../../lib/auth';
import { motion } from 'framer-motion';
import { Key, TrendingUp, Zap, Clock, ArrowRight, Copy, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Animated counter (matches landing page)
function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{Math.round(count)}{suffix}</span>;
}

// Shimmer skeleton
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/[0.06] rounded-lg animate-pulse ${className}`} />
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const [statsData, keysData] = await Promise.all([
        getUsageStats(token),
        getApiKeys(token),
      ]);

      setStats(statsData);
      setApiKeys(keysData.apiKeys || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-72 mb-3" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl mb-8" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const totalCalls = stats?.currentPeriod?.calls || 0;
  const callLimit = stats?.limits?.monthlyCallLimit || 100;
  const usagePercent = callLimit > 0 ? (totalCalls / callLimit) * 100 : 0;

  const statCards = [
    {
      icon: Key,
      value: apiKeys.length,
      label: 'API Keys',
      sub: `Max ${stats?.limits?.maxApiKeys || 2} keys`,
      link: '/dashboard/api-keys',
      linkText: 'Manage →',
      color: '#00F0FF',
      gradient: 'from-[#00F0FF]/20 to-[#00F0FF]/5',
    },
    {
      icon: TrendingUp,
      value: totalCalls,
      label: 'Monthly API Calls',
      sub: `${totalCalls} / ${callLimit} (${usagePercent.toFixed(1)}%)`,
      link: '/dashboard/usage',
      linkText: 'Details →',
      color: '#10B981',
      gradient: 'from-green-500/20 to-green-500/5',
      progress: usagePercent,
    },
    {
      icon: Zap,
      value: null,
      valueText: user?.plan || 'FREE',
      label: 'Current Plan',
      sub: `${stats?.limits?.rateLimit || 10} requests/min`,
      color: '#A855F7',
      gradient: 'from-purple-500/20 to-purple-500/5',
    },
  ];

  return (
    <motion.div
      className="p-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Welcome back, {user?.name || user?.email}</h1>
        <p className="text-gray-400">Manage your API Keys and view usage statistics</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 overflow-hidden group cursor-default"
          >
            {/* Gradient top accent */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[${card.color}]/50 to-transparent`} />
            {/* Hover glow */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 bg-[${card.color}]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center border border-white/[0.06]`}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                {card.link && (
                  <Link href={card.link} className="text-sm hover:underline transition-colors" style={{ color: card.color }}>
                    {card.linkText}
                  </Link>
                )}
              </div>
              <div className="font-heading text-3xl font-bold mb-1">
                {card.valueText || <Counter value={card.value!} />}
              </div>
              <div className="text-sm text-gray-400">{card.label}</div>
              {card.progress !== undefined && (
                <div className="mt-3 bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: card.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(card.progress, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Start Guide */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 mb-8 relative overflow-hidden"
      >
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-[#00F0FF]/[0.03] rounded-full blur-3xl pointer-events-none" />

        <h2 className="font-heading text-xl font-bold mb-4 flex items-center relative z-10">
          <div className="w-8 h-8 bg-[#00F0FF]/15 rounded-lg flex items-center justify-center mr-3">
            <Zap className="w-4 h-4 text-[#00F0FF]" />
          </div>
          Quick Start
        </h2>

        {apiKeys.length === 0 ? (
          <div className="space-y-4 relative z-10">
            <p className="text-gray-400">
              You haven&apos;t created any API Keys yet. Create one to start using the ILAL API.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dashboard/api-keys"
                className="inline-flex items-center px-5 py-2.5 bg-[#00F0FF] hover:bg-[#00F0FF]/90 rounded-lg font-medium transition-all shadow-lg shadow-[#00F0FF]/20 group"
              >
                Create Your First API Key
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {[
              { done: true, title: '1. API Key Created', desc: `You have created ${apiKeys.length} API Key(s)` },
              { done: false, title: '2. Integrate Into Your App', desc: 'Check the API docs to learn how to integrate', link: { href: '/docs', text: 'View Docs' } },
              { done: false, title: '3. Start Making API Calls', desc: 'Use your API Key to access the ILAL compliance API' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start space-x-3"
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-600 rounded-full mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-medium mb-1">{step.title}</div>
                  <div className="text-sm text-gray-400">{step.desc}</div>
                  {step.link && (
                    <Link
                      href={step.link.href}
                      className="inline-flex items-center text-[#00F0FF] text-sm hover:underline mt-1 group"
                    >
                      {step.link.text}
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent API Keys */}
      {apiKeys.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold flex items-center">
              <div className="w-8 h-8 bg-[#00F0FF]/15 rounded-lg flex items-center justify-center mr-3">
                <Key className="w-4 h-4 text-[#00F0FF]" />
              </div>
              Your API Keys
            </h2>
            <Link
              href="/dashboard/api-keys"
              className="text-[#00F0FF] text-sm hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {apiKeys.slice(0, 3).map((key, i) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ scale: 1.01, x: 4 }}
                className="border border-white/[0.08] rounded-lg p-4 hover:border-[#00F0FF]/30 hover:bg-white/[0.02] transition-all duration-200 cursor-default"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{key.name}</div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipboard(key.key || `${key.prefix}...`)}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <code className="text-gray-400 bg-white/[0.04] px-2 py-1 rounded text-xs font-mono">
                    {key.prefix}...
                  </code>
                  <div className="flex items-center text-gray-500 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {key.createdAt ? format(new Date(key.createdAt), 'yyyy-MM-dd') : 'Unknown'}
                  </div>
                </div>
                {key.lastUsedAt && (
                  <div className="text-xs text-gray-500 mt-2">
                    Last used: {format(new Date(key.lastUsedAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
