'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, ExternalLink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { registerInstitution, verifyEAS, getOnboardingStatus, getSumsubToken } from '../../../lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

type KycStatus = 'idle' | 'registering' | 'pending_kyc' | 'verifying' | 'sumsub_loading' | 'sumsub_active' | 'approved' | 'error';

export default function KycPage() {
  const { user, getAccessToken } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [status, setStatus] = useState<KycStatus>('idle');
  const [kycSource, setKycSource] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [merkleIndex, setMerkleIndex] = useState<number | null>(null);
  const [sumsubError, setSumsubError] = useState('');

  const token = getAccessToken();

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);

  async function handleCheckStatus() {
    if (!token || !isValidAddress) return;
    try {
      const result = await getOnboardingStatus(token, walletAddress);
      if (result.status === 'approved') {
        setStatus('approved');
        setKycSource(result.kycSource ?? null);
        setMerkleIndex(result.merkleIndex ?? null);
      } else if (result.status === 'pending_kyc') {
        setStatus('pending_kyc');
      } else {
        setStatus('idle');
      }
    } catch {
      // Not registered yet
      setStatus('idle');
    }
  }

  async function handleRegister() {
    if (!token || !isValidAddress || !institutionName.trim()) return;
    setStatus('registering');
    setErrorMsg('');
    try {
      const result = await registerInstitution(token, {
        name: institutionName.trim(),
        walletAddress,
      });
      if (result.status === 'approved') {
        setStatus('approved');
        setKycSource('mock');
        setMerkleIndex(result.leafIndex ?? null);
        toast.success('Registered and approved (mock KYC)');
      } else {
        setStatus('pending_kyc');
        toast.success('Registered. Complete KYC to proceed.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Registration failed');
      toast.error(err.message || 'Registration failed');
    }
  }

  async function handleVerifyEAS() {
    if (!token || !isValidAddress) return;
    setStatus('verifying');
    setErrorMsg('');
    try {
      const result = await verifyEAS(token, walletAddress);
      if (result.status === 'approved' || result.status === 'already_approved') {
        setStatus('approved');
        setKycSource(result.kycSource ?? 'coinbase-eas');
        setMerkleIndex(result.merkleIndex ?? null);
        toast.success('KYC verified via Coinbase EAS');
      }
    } catch (err: any) {
      setStatus('pending_kyc');
      setErrorMsg(err.message || 'EAS verification failed');
      toast.error(err.message || 'EAS verification failed');
    }
  }

  return (
    <motion.div
      className="p-8 pb-32"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2">KYC Verification</h1>
        <p className="text-gray-400">
          Verify your identity to enable compliant DeFi trading. Complete KYC once to unlock session activation and swap access.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="max-w-2xl space-y-6">
        {/* Step 1: Registration */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 shadow-2xl">
          <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-xs font-bold">1</span>
            Register Institution
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Institution Name</label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="My Institution"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                disabled={status === 'approved'}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                disabled={status === 'approved'}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRegister}
                disabled={!isValidAddress || !institutionName.trim() || status === 'registering' || status === 'approved'}
                className="px-5 py-2.5 bg-[#00F0FF] hover:bg-[#00D4E0] text-black font-medium rounded-lg text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'registering' ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Registering...</span>
                ) : 'Register'}
              </button>

              {isValidAddress && (
                <button
                  onClick={handleCheckStatus}
                  className="px-4 py-2.5 border border-white/[0.1] hover:border-white/[0.2] rounded-lg text-sm text-gray-300 transition-all"
                >
                  Check Status
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: KYC Verification (shown after registration) */}
        {(status === 'pending_kyc' || status === 'verifying' || status === 'error' || status === 'sumsub_loading' || status === 'sumsub_active') && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 shadow-2xl"
          >
            <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#A855F7]/20 text-[#A855F7] flex items-center justify-center text-xs font-bold">2</span>
              Complete KYC Verification
            </h2>

            {/* Coinbase EAS Option */}
            <div className="border border-white/[0.06] rounded-lg p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Coinbase EAS Verification</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    If you have a verified Coinbase account with an on-chain EAS attestation on Base,
                    click below to verify instantly.
                  </p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 text-sm text-gray-400 space-y-2">
                <p className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span>Your wallet must have a Coinbase identity attestation on Base chain.</span>
                </p>
                <a
                  href="https://www.coinbase.com/onchain-verify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#00F0FF] hover:underline"
                >
                  Get verified on Coinbase <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <button
                onClick={handleVerifyEAS}
                disabled={status === 'verifying'}
                className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {status === 'verifying' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying on-chain...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> Verify via Coinbase EAS</>
                )}
              </button>

              {errorMsg && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Sumsub Option */}
            <div className="mt-4 border border-white/[0.06] rounded-lg p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Document Verification (Sumsub)</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Verify your identity with an ID document and liveness check.
                    No Coinbase account needed.
                  </p>
                </div>
              </div>

              {status === 'sumsub_active' ? (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-6 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto" />
                  <p className="text-sm text-gray-300">Sumsub verification in progress...</p>
                  <p className="text-xs text-gray-500">Complete the verification in the Sumsub widget. Once approved, your status will update automatically.</p>
                  <button
                    onClick={handleCheckStatus}
                    className="px-4 py-2 border border-white/[0.1] hover:border-white/[0.2] rounded-lg text-sm text-gray-300 transition-all"
                  >
                    Refresh Status
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    if (!token || !isValidAddress) return;
                    setStatus('sumsub_loading');
                    setSumsubError('');
                    try {
                      const result = await getSumsubToken(token, walletAddress);
                      // Open Sumsub in a new tab with the access token
                      // In production, you would embed the @sumsub/websdk here
                      window.open(
                        `https://cockpit.sumsub.com/checkus#/accessToken=${result.token}`,
                        '_blank',
                      );
                      setStatus('sumsub_active');
                      toast.success('Sumsub verification started. Complete it in the new tab.');
                    } catch (err: any) {
                      setStatus('pending_kyc');
                      setSumsubError(err.message || 'Failed to start Sumsub verification');
                      toast.error(err.message || 'Failed to start Sumsub');
                    }
                  }}
                  disabled={status === 'sumsub_loading'}
                  className="w-full px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {status === 'sumsub_loading' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading Sumsub...</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> Start Document Verification</>
                  )}
                </button>
              )}

              {sumsubError && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{sumsubError}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Approved State */}
        {status === 'approved' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <h2 className="font-heading font-semibold text-lg text-emerald-300">KYC Verified</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Wallet</span>
                <span className="font-mono text-white">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">KYC Source</span>
                <span className="text-white capitalize">{kycSource?.replace('-', ' ') || 'Unknown'}</span>
              </div>
              {merkleIndex != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Merkle Index</span>
                  <span className="font-mono text-white">{merkleIndex}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-4">
              You can now activate your compliance session and start trading.
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
