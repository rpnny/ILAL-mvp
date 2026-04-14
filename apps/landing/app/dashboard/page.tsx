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
import SessionStatusCard from '../../components/SessionStatusCard';

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

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg animate-pulse ${className}`} style={{ background: 'var(--surface)' }} />
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
  const callLimit = stats?.limits?.monthlyCallLimit || 1000;
  const usagePercent = callLimit > 0 ? (totalCalls / callLimit) * 100 : 0;

  const statCards = [
    {
      icon: Key,
      value: apiKeys.length,
      label: 'API Keys',
      sub: `Max ${stats?.limits?.maxApiKeys || 2} keys`,
      link: '/dashboard/api-keys',
      linkText: 'Manage',
    },
    {
      icon: TrendingUp,
      value: totalCalls,
      label: 'Monthly API Calls',
      sub: `${totalCalls} / ${callLimit} (${usagePercent.toFixed(1)}%)`,
      link: '/dashboard/usage',
      linkText: 'Details',
      progress: usagePercent,
    },
    {
      icon: Zap,
      value: null,
      valueText: user?.plan || 'FREE',
      label: 'Current Plan',
      sub: `${stats?.limits?.rateLimit || 10} requests/min`,
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
        <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Welcome back, {user?.name || user?.email}
        </h1>
        <p style={{ color: 'var(--text2)' }}>Manage your API Keys and view usage statistics</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="glass p-6 overflow-hidden group cursor-default"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                  <card.icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                {card.link && (
                  <Link href={card.link} className="text-sm hover:underline transition-colors" style={{ color: 'var(--accent)' }}>
                    {card.linkText} &rarr;
                  </Link>
                )}
              </div>
              <div className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                {card.valueText || <Counter value={card.value!} />}
              </div>
              <div className="text-sm" style={{ color: 'var(--text2)' }}>{card.label}</div>
              {card.progress !== undefined && (
                <div className="mt-3 rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--surface)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(card.progress, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
              <div className="text-xs mt-2" style={{ color: 'var(--text2)' }}>{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Compliance Session Status */}
      <SessionStatusCard walletAddress={user?.walletAddress} />

      {/* Quick Start Guide */}
      <motion.div
        variants={itemVariants}
        className="glass p-6 mb-8 overflow-hidden"
      >
        <h2 className="font-serif text-xl font-bold mb-4 flex items-center relative z-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ background: 'var(--surface)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          Quick Start
        </h2>

        {apiKeys.length === 0 ? (
          <div className="space-y-4 relative z-10">
            <p style={{ color: 'var(--text2)' }}>
              You haven&apos;t created any API Keys yet. Create one to start using the ILAL API.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dashboard/api-keys"
                className="btn-primary inline-flex"
              >
                Create Your First API Key
                <ArrowRight className="w-4 h-4 ml-2" />
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
                  <div className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0" style={{ border: '2px solid var(--border)' }} />
                )}
                <div>
                  <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>{step.title}</div>
                  <div className="text-sm" style={{ color: 'var(--text2)' }}>{step.desc}</div>
                  {step.link && (
                    <Link
                      href={step.link.href}
                      className="inline-flex items-center text-sm hover:underline mt-1 group"
                      style={{ color: 'var(--accent)' }}
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
          className="glass p-6 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold flex items-center">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ background: 'var(--surface)' }}>
                <Key className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              Your API Keys
            </h2>
            <Link
              href="/dashboard/api-keys"
              className="text-sm hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              View All &rarr;
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
                className="rounded-xl p-4 transition-all duration-200 cursor-default"
                style={{ border: '1px solid var(--glass-border)', background: 'var(--surface)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium" style={{ color: 'var(--text)' }}>{key.name}</div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipboard(key.key || `${key.prefix}...`)}
                    className="transition-colors p-1 rounded"
                    style={{ color: 'var(--text2)' }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <code className="px-2 py-1 rounded text-xs font-mono" style={{ color: 'var(--text2)', background: 'var(--surface)' }}>
                    {key.prefix}...
                  </code>
                  <div className="flex items-center text-xs" style={{ color: 'var(--text2)' }}>
                    <Clock className="w-3 h-3 mr-1" />
                    {key.createdAt ? format(new Date(key.createdAt), 'yyyy-MM-dd') : 'Unknown'}
                  </div>
                </div>
                {key.lastUsedAt && (
                  <div className="text-xs mt-2" style={{ color: 'var(--text2)' }}>
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
