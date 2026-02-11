'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useVerification } from '@/hooks/useVerification';
import { useSession } from '@/hooks/useSession';
import { useEAS } from '@/hooks/useEAS';
import Link from 'next/link';

export default function Home() {
  const { isConnected, address } = useAccount();
  const { verify, isVerifying, isSuccess, progress, stage, error } = useVerification();
  const { isActive, timeRemainingFormatted } = useSession();
  const { attestation, isMock, status: easStatus } = useEAS();

  // 未连接钱包
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Hero */}
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto shadow-lg">
              <span className="text-white font-bold text-2xl">IL</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">ILAL</h1>
            <p className="text-lg text-slate-500">
              Institutional Liquidity Access Layer
            </p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Compliant institutional liquidity access layer built on Uniswap v4, using zero-knowledge proofs for privacy-preserving on-chain KYC verification
            </p>
          </div>

          {/* Connect */}
          <div className="card p-8 space-y-6">
            <h2 className="text-xl font-semibold text-slate-800">Get Started</h2>
            <p className="text-sm text-slate-500">
              Connect your wallet to begin the verification process
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mx-auto">
                <ShieldIcon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs text-slate-600 font-medium">Privacy</p>
              <p className="text-xs text-slate-400">Zero-Knowledge</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mx-auto">
                <LockIcon className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-xs text-slate-600 font-medium">Compliant</p>
              <p className="text-xs text-slate-400">Institutional KYC</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto">
                <BoltIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-600 font-medium">Efficient</p>
              <p className="text-xs text-slate-400">Uniswap v4</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 已验证
  if (isActive) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 mt-8">
        {/* 成功卡片 */}
        <div className="card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Verification Successful</h2>
          <p className="text-slate-500">You&apos;ve passed ZK verification and can start trading</p>

          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 rounded-full px-4 py-2 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Session Active &middot; {timeRemainingFormatted} remaining</span>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/trade"
            className="card card-hover p-6 space-y-3 text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto">
              <SwapIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Start Trading</h3>
            <p className="text-xs text-slate-500">Swap tokens in compliant pools</p>
          </Link>

          <Link
            href="/liquidity"
            className="card card-hover p-6 space-y-3 text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto">
              <DropIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Provide Liquidity</h3>
            <p className="text-xs text-slate-500">Become a compliant pool LP</p>
          </Link>
        </div>

        {/* Verification Details */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Verification Details</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Wallet Address" value={`${address?.slice(0, 8)}...${address?.slice(-6)}`} />
            <InfoRow label="Verification Method" value="PLONK ZK Proof" />
            <InfoRow label="Session Status" value="Active" valueColor="text-emerald-600" />
            <InfoRow label="Time Remaining" value={timeRemainingFormatted} />
            <InfoRow
              label="Attestation"
              value={attestation?.isMock ? 'Mock Data (Dev)' : 'Coinbase Verified'}
              valueColor={attestation?.isMock ? 'text-amber-600' : 'text-emerald-600'}
            />
            <InfoRow label="Network" value="Base Sepolia" />
          </div>
        </div>
      </div>
    );
  }

  // 需要验证
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 mt-8">
      {/* Verification Card */}
      <div className="card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Identity Verification</h2>
          <p className="text-sm text-slate-500">
            Verify your identity using zero-knowledge proofs without exposing personal information on-chain
          </p>
        </div>

        {/* Verification Steps */}
        <div className="space-y-4">
          <VerifyStep
            number={1}
            title="Check Coinbase Verification"
            description="Query on-chain EAS Attestation"
            status={
              progress >= 10 ? 'complete' : isVerifying ? 'active' : 'pending'
            }
          />
          <VerifyStep
            number={2}
            title="Generate ZK Proof"
            description="Generate PLONK zero-knowledge proof locally in browser (~4 seconds)"
            status={
              progress >= 60
                ? 'complete'
                : progress >= 10
                ? 'active'
                : 'pending'
            }
          />
          <VerifyStep
            number={3}
            title="On-Chain Verification"
            description="Submit proof to PlonkVerifier contract and activate Session"
            status={
              progress >= 100
                ? 'complete'
                : progress >= 60
                ? 'active'
                : 'pending'
            }
          />
        </div>

        {/* 进度条 —— 验证中、成功、或出错时都显示 */}
        {(isVerifying || isSuccess || (error && progress > 0)) && (
          <div className="space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  isSuccess
                    ? 'bg-emerald-500'
                    : error
                    ? 'bg-red-500'
                    : 'bg-blue-600 progress-pulse'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`text-xs text-center ${
              isSuccess ? 'text-emerald-600 font-medium' : error ? 'text-red-500' : 'text-slate-500'
            }`}>
              {isSuccess
                ? 'Verification successful! Redirecting...'
                : error
                ? `${progress}% — ${stage || 'Verification failed'}`
                : `${progress}% ${stage ? `— ${stage}` : ''}`}
            </p>
          </div>
        )}

        {/* 成功提示 */}
        {isSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-800">ZK Verification Passed! Session Activated</p>
            <p className="text-xs text-emerald-600">Page will refresh automatically...</p>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 验证按钮 */}
        <button
          onClick={verify}
          disabled={isVerifying || isSuccess}
          className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow ${
            isSuccess
              ? 'bg-emerald-500 disabled:opacity-100'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50'
          }`}
        >
          {isSuccess
            ? 'Verification Successful!'
            : isVerifying
            ? `Verifying... ${progress}%`
            : 'Start Verification'}
        </button>
      </div>

      {/* EAS Status Card */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-800">Coinbase Verification Status</h3>
        <div className="space-y-3 text-sm">
          <InfoRow
            label="EAS Query"
            value={
              easStatus === 'loading'
                ? 'Querying...'
                : easStatus === 'done'
                ? 'Completed'
                : easStatus === 'error'
                ? 'Query Failed'
                : 'Waiting'
            }
          />
          <InfoRow
            label="Attestation"
            value={
              attestation
                ? attestation.isMock
                  ? 'Using Mock Data'
                  : 'Verified'
                : 'Not Found'
            }
            valueColor={
              attestation?.isMock ? 'text-amber-600' : attestation ? 'text-emerald-600' : 'text-slate-500'
            }
          />
          <InfoRow label="Attester" value="Coinbase (0x3574...d7EE)" />
        </div>
        {attestation?.isMock && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">
              Currently using mock Attestation data. To use real data, please visit{' '}
              <a
                href="https://www.coinbase.com/onchain-verify"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Coinbase Onchain Verify
              </a>{' '}
              to complete identity verification.
            </p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-800">How It Works</h3>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            1. ILAL uses Coinbase&apos;s EAS (Ethereum Attestation Service) to check if you&apos;ve completed identity verification.
          </p>
          <p>
            2. Verification data is processed locally in your browser using PLONK zero-knowledge proofs. Your personal information never goes on-chain.
          </p>
          <p>
            3. The proof is submitted to the on-chain PlonkVerifier contract. Upon successful verification, a 24-hour Session is activated.
          </p>
          <p>
            4. During the Session validity period, you can freely trade in compliant liquidity pools.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ 子组件 ============

function VerifyStep({
  number,
  title,
  description,
  status,
}: {
  number: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
}) {
  return (
    <div className="flex items-start space-x-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          status === 'complete'
            ? 'bg-emerald-100 text-emerald-600'
            : status === 'active'
            ? 'bg-blue-100 text-blue-600 blink'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {status === 'complete' ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          number
        )}
      </div>
      <div>
        <p
          className={`font-medium text-sm ${
            status === 'complete'
              ? 'text-emerald-700'
              : status === 'active'
              ? 'text-blue-700'
              : 'text-slate-500'
          }`}
        >
          {title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${valueColor || 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}

// ============ 图标 ============

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function DropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}
