'use client';

import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Settings, User, Mail, Lock, Zap, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  return (
    <motion.div className="p-8 max-w-4xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <div className="w-9 h-9 bg-[#2962FF]/15 rounded-lg flex items-center justify-center mr-3">
            <Settings className="w-5 h-5 text-[#2962FF]" />
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
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2962FF]/30 to-transparent" />
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 bg-[#2962FF]/15 rounded flex items-center justify-center mr-2">
            <User className="w-4 h-4 text-[#2962FF]" />
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

      {/* Current Plan */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <div className="w-7 h-7 bg-purple-500/15 rounded flex items-center justify-center mr-2">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          Current Plan
        </h2>

        <motion.div
          whileHover={{ scale: 1.005 }}
          className="border border-[#2962FF]/25 bg-gradient-to-br from-[#2962FF]/[0.08] to-transparent rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2962FF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h3 className="text-2xl font-bold mb-1">{user.plan || 'FREE'} Plan</h3>
              <p className="text-sm text-gray-400">Free trial</p>
            </div>
            <div className="px-4 py-2 bg-[#2962FF]/20 text-[#2962FF] rounded-lg font-medium border border-[#2962FF]/20">
              Active
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            {[
              '100 API calls / month',
              '10 requests / minute',
              'Up to 2 API Keys',
              'Community support',
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center space-x-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-6 p-4 bg-[#2962FF]/[0.06] border border-[#2962FF]/15 rounded-lg"
        >
          <p className="text-sm text-gray-300">
            Need higher quotas? PRO and ENTERPRISE plans are coming soon.
          </p>
        </motion.div>
      </motion.div>

      {/* Security */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
        <h2 className="text-xl font-bold mb-6 flex items-center">
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
              className="px-4 py-2 bg-[#2962FF] hover:bg-[#2962FF]/90 rounded-lg transition-all shadow-lg shadow-[#2962FF]/20"
            >
              Manage
            </motion.a>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
