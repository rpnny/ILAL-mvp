import Link from 'next/link';
import { CheckCircle2, ArrowRight, Zap, Lock, Code, Terminal } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="section max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="section-eyebrow mb-4">Base Sepolia Testnet</p>
        <h1 className="font-heading text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>
          ILAL API Reference
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--text2)' }}>
          Compliant DeFi infrastructure for institutions. Build on top of Uniswap V4 with zero-knowledge compliance verification — without exposing user identity.
        </p>
      </div>

      {/* Current Configuration Card */}
      <div className="glass p-6 mb-10" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Current Active Configuration
          </h2>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Base Sepolia</span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text2)' }}>
          This is the only supported testnet configuration. All addresses below are pinned and verified.
        </p>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            { label: 'DeFi Base URL', value: 'ilal-mvp-production.up.railway.app/api/v1', accent: true },
            { label: 'Auth Header', value: 'X-API-Key: ilal_live_xxx' },
            { label: 'WETH', value: '0x4200...0006' },
            { label: 'tUSDC (test stablecoin)', value: '0xa486...424D' },
            { label: 'ComplianceHook', value: '0x54b8...8a80' },
            { label: 'SwapRouter', value: '0xd46D...2891' },
            { label: 'PositionManager', value: '0x6925...Cea32' },
            { label: 'zeroForOne', value: 'Optional (auto-derived)', mono: false },
          ].map(({ label, value, accent, mono }) => (
            <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)' }}>{label}</span>
              {mono === false ? (
                <span className="text-xs" style={{ color: 'var(--text2)' }}>{value}</span>
              ) : (
                <code className="font-mono text-xs" style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}>
                  {value}
                </code>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text2)' }}>
          Circle USDC (<code className="font-mono" style={{ color: 'var(--text2)' }}>0x036CbD...</code>) is{' '}
          <span className="text-red-400">deprecated</span> — its demo pool has been drained. Use{' '}
          <strong style={{ color: 'var(--text)' }}>tUSDC</strong> instead.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[
          { href: '/docs/quickstart', icon: Zap, title: 'Quick Start', desc: '5-minute setup guide' },
          { href: '/docs/authentication', icon: Lock, title: 'Authentication', desc: 'API keys & JWT tokens' },
          { href: '/docs/endpoints', icon: Code, title: 'API Endpoints', desc: 'Full reference' },
          { href: '/docs/sdk', icon: Terminal, title: 'DeFi Guide', desc: 'Swap & liquidity' },
        ].map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="glass p-5 group"
          >
            <Icon className="w-6 h-6 mb-3" style={{ color: 'var(--accent)' }} />
            <div className="font-display font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</div>
            <div className="text-xs mb-3" style={{ color: 'var(--text2)' }}>{desc}</div>
            <div className="flex items-center text-xs" style={{ color: 'var(--accent)' }}>
              View <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Overview */}
      <div className="max-w-none">
        <h2 className="font-heading text-2xl mb-6" style={{ color: 'var(--text)' }}>What is ILAL?</h2>
        <p className="mb-6" style={{ color: 'var(--text2)' }}>
          ILAL provides a programmable compliance layer for institutional DeFi. It uses zero-knowledge proofs to verify that users meet regulatory requirements (AML/KYC) without exposing any personal data on-chain. Your application gets a simple REST API — ILAL handles the cryptographic complexity.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {[
            { title: 'ZK Compliance Verification', desc: 'Verify KYC/AML status without revealing identity. Powered by PLONK ZK proofs (snarkjs, Circom).' },
            { title: 'Unsigned Transaction Builder', desc: 'Get pre-built calldata for Uniswap V4 swaps and liquidity operations. Sign with your own wallet.' },
            { title: 'Uniswap V4 ComplianceHook', desc: 'Every swap/liquidity tx is gated via an on-chain compliance hook — automatic regulatory enforcement.' },
            { title: 'Session Management', desc: '24-hour on-chain sessions reduce re-verification overhead for active traders.' },
          ].map(({ title, desc }) => (
            <div key={title} className="glass p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-display font-medium mb-1" style={{ color: 'var(--text)' }}>{title}</div>
                  <div className="text-sm" style={{ color: 'var(--text2)' }}>{desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-heading text-2xl mb-6" style={{ color: 'var(--text)' }}>Rate Limits by Plan</h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text2)' }}>
                <th className="text-left py-3 pr-6">Plan</th>
                <th className="text-left py-3 pr-6">Calls/month</th>
                <th className="text-left py-3 pr-6">Req/min</th>
                <th className="text-left py-3">API Keys</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 pr-6 font-medium" style={{ color: 'var(--text)' }}>Free</td>
                <td className="py-3 pr-6" style={{ color: 'var(--text2)' }}>100</td>
                <td className="py-3 pr-6" style={{ color: 'var(--text2)' }}>10</td>
                <td className="py-3" style={{ color: 'var(--text2)' }}>2</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 pr-6 font-medium" style={{ color: 'var(--text)' }}>
                  Pro <span className="text-xs" style={{ color: 'var(--accent)' }}>$99/mo</span>
                </td>
                <td className="py-3 pr-6" style={{ color: 'var(--text2)' }}>10,000</td>
                <td className="py-3 pr-6" style={{ color: 'var(--text2)' }}>100</td>
                <td className="py-3" style={{ color: 'var(--text2)' }}>10</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 pr-6 font-medium" style={{ color: 'var(--text)' }}>
                  Enterprise <span className="text-xs" style={{ color: 'var(--accent)' }}>Custom</span>
                </td>
                <td className="py-3 pr-6" style={{ color: 'var(--text2)' }}>Unlimited</td>
                <td className="py-3 pr-6" style={{ color: 'var(--text2)' }}>1,000</td>
                <td className="py-3" style={{ color: 'var(--text2)' }}>Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/docs/quickstart" className="btn-primary">
            <Zap className="w-4 h-4" />
            Get Started in 5 minutes
          </Link>
          <Link href="/dashboard/api-keys" className="btn-ghost">
            Get your API key
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
