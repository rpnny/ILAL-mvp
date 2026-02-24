'use client';

import { useState } from 'react';
import { X, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<{ key: string; prefix: string }>;
}

export default function CreateApiKeyDialog({ isOpen, onClose, onCreate }: CreateApiKeyDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter an API Key name');
      return;
    }

    setLoading(true);
    try {
      const result = await onCreate(name.trim());
      setCreatedKey(result.key);
      toast.success('API Key created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl max-w-md w-full p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdKey ? (
          <>
            <h2 className="font-heading text-xl font-bold mb-4">Create New API Key</h2>
            <p className="text-sm text-gray-400 mb-6">
              Give your API Key an easily recognizable name.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production API"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#00F0FF] transition-colors text-white placeholder-gray-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreate();
                  }
                }}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2 bg-[#00F0FF] hover:bg-[#00F0FF]/90 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>

            <h2 className="font-heading text-xl font-bold mb-2 text-center">API Key Created!</h2>
            <p className="text-sm text-gray-400 mb-6 text-center">
              Please copy and save your API Key now.<br />
              For security reasons, you won&apos;t be able to view it again.
            </p>

            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-xs text-gray-400 mb-2">Your API Key</div>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-sm font-mono text-[#00F0FF] break-all">
                  {createdKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-2 hover:bg-white/5 rounded transition-colors"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-200">
                ⚠️ Make sure you have copied and securely saved this API Key. You will not be able to view it after closing this window.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-[#00F0FF] hover:bg-[#00F0FF]/90 rounded-lg font-medium transition-colors"
            >
              I&apos;ve Saved It, Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
