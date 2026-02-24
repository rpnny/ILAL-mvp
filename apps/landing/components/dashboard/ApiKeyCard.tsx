'use client';

import { useState } from 'react';
import { Copy, Trash2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ApiKeyCardProps {
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt?: string;
    isActive: boolean;
  };
  onRevoke: (id: string) => Promise<void>;
}

export default function ApiKeyCard({ apiKey, onRevoke }: ApiKeyCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.keyPrefix);
    setCopied(true);
    toast.success('Prefix copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await onRevoke(apiKey.id);
      toast.success('API Key revoked');
      setShowConfirm(false);
    } catch (error: any) {
      toast.error(error.message || 'Revoke failed');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-xl p-5 hover:border-[#00F0FF]/30 transition-all bg-white/[0.02]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg mb-1">{apiKey.name}</h3>
          <div className="flex items-center space-x-2">
            <code className="text-sm text-gray-400 bg-white/5 px-2 py-1 rounded">
              {apiKey.keyPrefix}...
            </code>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {apiKey.isActive ? (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
              Revoked
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-400 mb-4">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          <span>Created: {format(new Date(apiKey.createdAt), 'yyyy-MM-dd HH:mm')}</span>
        </div>
        {apiKey.lastUsedAt && (
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <span>Last used: {format(new Date(apiKey.lastUsedAt), 'yyyy-MM-dd HH:mm')}</span>
          </div>
        )}
      </div>

      {apiKey.isActive && (
        <>
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full px-4 py-2 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Revoke API Key
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-200">
                  This action cannot be undone. Applications using this API Key will immediately lose access.
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={revoking}
                  className="flex-1 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {revoking ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Revoking...
                    </>
                  ) : (
                    'Confirm Revoke'
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
