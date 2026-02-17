'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Key, AlertCircle } from 'lucide-react';
import { getApiKeys, createApiKey, deleteApiKey } from '../../../lib/api';
import { getAccessToken } from '../../../lib/auth';
import toast from 'react-hot-toast';
import ApiKeyCard from '../../../components/dashboard/ApiKeyCard';
import CreateApiKeyDialog from '../../../components/dashboard/CreateApiKeyDialog';

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

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  async function loadApiKeys() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await getApiKeys(token);
      setApiKeys(response.apiKeys || []);
      setLimits(response.limits);
    } catch (error: any) {
      toast.error('Failed to load API Keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(name: string) {
    const token = getAccessToken();
    if (!token) throw new Error('Not logged in');
    const response = await createApiKey(token, name);
    await loadApiKeys();
    return { key: response.apiKey.key || '', prefix: response.apiKey.prefix };
  }

  async function handleRevokeKey(keyId: string) {
    const token = getAccessToken();
    if (!token) throw new Error('Not logged in');
    await deleteApiKey(token, keyId);
    await loadApiKeys();
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-9 w-48 mb-3" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-16 rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const canCreateMore = !limits || apiKeys.length < (limits.maxApiKeys || 2);

  return (
    <motion.div className="p-8" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <div className="w-9 h-9 bg-[#2962FF]/15 rounded-lg flex items-center justify-center mr-3">
              <Key className="w-5 h-5 text-[#2962FF]" />
            </div>
            API Keys
          </h1>
          <p className="text-gray-400">Create and manage your API Keys</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreateDialog(true)}
          disabled={!canCreateMore}
          className="px-6 py-3 bg-[#2962FF] hover:bg-[#2962FF]/90 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-[#2962FF]/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create API Key
        </motion.button>
      </motion.div>

      {/* Limit Info */}
      {limits && (
        <motion.div
          variants={itemVariants}
          className="mb-6 p-4 bg-[#2962FF]/[0.06] backdrop-blur-xl border border-[#2962FF]/20 rounded-xl flex items-start"
        >
          <AlertCircle className="w-5 h-5 text-[#2962FF] mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="text-gray-300 mb-1">
              You are using <span className="font-semibold text-white">{apiKeys.length}</span> / {limits.maxApiKeys} API Keys
            </div>
            <div className="text-gray-400">
              {canCreateMore
                ? `You can create ${limits.maxApiKeys - apiKeys.length} more API Key(s)`
                : 'You have reached the API Key limit. Revoke an existing key to create a new one.'}
            </div>
          </div>
        </motion.div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.08]"
          >
            <Key className="w-8 h-8 text-gray-500" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">No API Keys Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your first API Key to start using the ILAL API.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateDialog(true)}
            className="px-6 py-3 bg-[#2962FF] hover:bg-[#2962FF]/90 rounded-lg font-medium transition-all inline-flex items-center shadow-lg shadow-[#2962FF]/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create First API Key
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {apiKeys.map((key, i) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                whileHover={{ scale: 1.005, x: 4 }}
              >
                <ApiKeyCard apiKey={key} onRevoke={handleRevokeKey} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <CreateApiKeyDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateKey}
      />
    </motion.div>
  );
}
