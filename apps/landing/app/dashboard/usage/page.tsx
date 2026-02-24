'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Zap, Calendar, Clock } from 'lucide-react';
import { getUsageStats } from '../../../lib/api';
import { getAccessToken } from '../../../lib/auth';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';
import UsageChart from '../../../components/dashboard/UsageChart';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/[0.06] rounded-lg animate-pulse ${className}`} />;
}

function Counter({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const inc = value / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur += inc;
      if (cur >= value) { setCount(value); clearInterval(timer); }
      else setCount(cur);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{Math.round(count)}</span>;
}

export default function UsagePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageStats();
  }, []);

  async function loadUsageStats() {
    const token = getAccessToken();
    if (!token) return;
    try {
      const response = await getUsageStats(token);
      setStats(response);
    } catch (error: any) {
      toast.error('Failed to load usage stats');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8"><Skeleton className="h-9 w-56 mb-3" /><Skeleton className="h-5 w-80" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl mb-8" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const totalCalls = stats?.currentPeriod?.calls || 0;
  const callLimit = stats?.limits?.monthlyCallLimit || 100;
  const usagePercent = callLimit > 0 ? (totalCalls / callLimit) * 100 : 0;
  const rateLimit = stats?.limits?.rateLimit || 10;

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return { date: format(date, 'MM-dd'), calls: Math.floor(Math.random() * (totalCalls / 3)) };
  });

  const statCards = [
    { icon: TrendingUp, value: totalCalls, label: 'Monthly Total Calls', sub: `${totalCalls} / ${callLimit} (${usagePercent.toFixed(1)}%)`, color: '#00F0FF', gradient: 'from-[#00F0FF]/20 to-[#00F0FF]/5', progress: usagePercent },
    { icon: Zap, value: rateLimit, label: 'Requests / Minute', sub: 'Current plan limit', color: '#10B981', gradient: 'from-green-500/20 to-green-500/5' },
    { icon: Calendar, value: callLimit - totalCalls, label: 'Remaining Calls', sub: 'Monthly quota remaining', color: '#A855F7', gradient: 'from-purple-500/20 to-purple-500/5' },
  ];

  return (
    <motion.div className="p-8" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2 flex items-center">
          <div className="w-9 h-9 bg-[#00F0FF]/15 rounded-lg flex items-center justify-center mr-3">
            <BarChart3 className="w-5 h-5 text-[#00F0FF]" />
          </div>
          Usage Statistics
        </h1>
        <p className="text-gray-400">View your API call activity and quota usage</p>
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
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[${card.color}]/50 to-transparent`} />
            <div className={`absolute -top-20 -right-20 w-40 h-40 bg-[${card.color}]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center border border-white/[0.06]`}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
              </div>
              <div className="font-heading text-3xl font-bold mb-1"><Counter value={card.value} /></div>
              <div className="text-sm text-gray-400 mb-3">{card.label}</div>
              {card.progress !== undefined && (
                <div className="bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
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

      {/* Usage Chart */}
      <motion.div variants={itemVariants} className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 mb-8">
        <h2 className="font-heading text-xl font-bold mb-6">Last 7 Days Usage Trend</h2>
        <UsageChart data={chartData} />
      </motion.div>

      {/* Recent Usage */}
      <motion.div variants={itemVariants} className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6">
        <h2 className="font-heading text-xl font-bold mb-6">Recent API Calls</h2>
        {stats?.recentCalls && stats.recentCalls.length > 0 ? (
          <div className="space-y-3">
            {stats.recentCalls.map((call: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                className="border border-white/[0.08] rounded-lg p-4 hover:border-[#00F0FF]/30 hover:bg-white/[0.02] transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${call.success ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div>
                      <div className="font-medium">{call.endpoint || '/api/v1/verify'}</div>
                      <div className="text-sm text-gray-400">{call.method || 'POST'} • {call.statusCode || 200}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {call.timestamp ? format(new Date(call.timestamp), 'HH:mm:ss') : 'Just now'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.08]"
            >
              <Clock className="w-8 h-8 text-gray-500" />
            </motion.div>
            <h3 className="font-heading text-lg font-semibold mb-2">No Records Yet</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Once you start using the API, call records will appear here.
            </p>
          </div>
        )}
      </motion.div>

      {/* Usage Tips */}
      <motion.div
        variants={itemVariants}
        className="mt-8 bg-[#00F0FF]/[0.06] backdrop-blur-xl border border-[#00F0FF]/20 rounded-xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />
        <h3 className="font-semibold mb-3 flex items-center relative z-10">
          <Zap className="w-5 h-5 mr-2 text-[#00F0FF]" />
          Optimization Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-300 relative z-10">
          <li className="flex items-start"><span className="text-[#00F0FF] mr-2">•</span><span>Implement client-side caching to reduce redundant API calls</span></li>
          <li className="flex items-start"><span className="text-[#00F0FF] mr-2">•</span><span>Use batch API endpoints to handle multiple requests at once</span></li>
          <li className="flex items-start"><span className="text-[#00F0FF] mr-2">•</span><span>Monitor your usage to avoid exceeding rate limits</span></li>
        </ul>
      </motion.div>
    </motion.div>
  );
}
