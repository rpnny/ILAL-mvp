import Link from 'next/link';
import { CheckCircle2, ArrowRight, Zap, Lock, Code, BookOpen, Terminal, Cpu } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-full text-xs text-[#00F0FF] mb-4 font-mono">
          Base Sepolia Testnet
        </div>
        <h1 className="font-heading text-4xl font-bold mb-4">ILAL API Reference</h1>
        <p className="text-xl text-gray-400 leading-relaxed">
          Compliant DeFi infrastructure for institutions. Build on top of Uniswap V4 with zero-knowledge compliance verification — without exposing user identity.
        </p>
      </div>

      {/* Base URL banner */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 mb-10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">API Base URL</div>
          <code className="text-[#00F0FF] font-mono text-sm">https://ilalapi-production.up.railway.app/api/v1</code>
        </div>
        <div className="text-xs text-gray-500 bg-white/[0.04] px-3 py-1.5 rounded-lg">
          Authentication: <span className="text-gray-300">X-API-Key header</span>
        </div>
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
            className="border border-white/10 rounded-xl p-5 hover:border-[#00F0FF]/40 hover:bg-white/[0.02] transition-all group"
          >
            <Icon className="w-6 h-6 text-[#00F0FF] mb-3" />
            <div className="font-semibold mb-1">{title}</div>
            <div className="text-xs text-gray-500 mb-3">{desc}</div>
            <div className="flex items-center text-[#00F0FF] text-xs group-hover:underline">
              View <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Overview */}
      <div className="prose prose-invert max-w-none">
        <h2 className="font-heading text-2xl font-bold mb-6">What is ILAL?</h2>
        <p className="text-gray-400 mb-6">
          ILAL provides a programmable compliance layer for institutional DeFi. It uses zero-knowledge proofs to verify that users meet regulatory requirements (AML/KYC) without exposing any personal data on-chain. Your application gets a simple REST API — ILAL handles the cryptographic complexity.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {[
            { icon: CheckCircle2, title: 'ZK Compliance Verification', desc: 'Verify KYC/AML status without revealing identity. Powered by Groth16 ZK proofs.' },
            { icon: CheckCircle2, title: 'Unsigned Transaction Builder', desc: 'Get pre-built calldata for Uniswap V4 swaps and liquidity operations. Sign with your own wallet.' },
            { icon: CheckCircle2, title: 'Uniswap V4 ComplianceHook', desc: 'Every swap/liquidity tx is gated via an on-chain compliance hook — automatic regulatory enforcement.' },
            { icon: CheckCircle2, title: 'Session Management', desc: '24-hour on-chain sessions reduce re-verification overhead for active traders.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium mb-1">{title}</div>
                  <div className="text-sm text-gray-400">{desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-heading text-2xl font-bold mb-6">Rate Limits by Plan</h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="text-left py-3 pr-6">Plan</th>
                <th className="text-left py-3 pr-6">Calls/month</th>
                <th className="text-left py-3 pr-6">Req/min</th>
                <th className="text-left py-3">API Keys</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <tr>
                <td className="py-3 pr-6 font-medium">Free</td>
                <td className="py-3 pr-6 text-gray-400">100</td>
                <td className="py-3 pr-6 text-gray-400">10</td>
                <td className="py-3 text-gray-400">2</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 font-medium">Pro <span className="text-xs text-[#00F0FF]">$99/mo</span></td>
                <td className="py-3 pr-6 text-gray-400">10,000</td>
                <td className="py-3 pr-6 text-gray-400">100</td>
                <td className="py-3 text-gray-400">10</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 font-medium">Enterprise <span className="text-xs text-[#00F0FF]">Custom</span></td>
                <td className="py-3 pr-6 text-gray-400">Unlimited</td>
                <td className="py-3 pr-6 text-gray-400">1,000</td>
                <td className="py-3 text-gray-400">Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/docs/quickstart"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00F0FF] text-black font-semibold rounded-xl text-sm hover:bg-[#00F0FF]/90 transition-all shadow-lg shadow-[#00F0FF]/20"
          >
            <Zap className="w-4 h-4" />
            Get Started in 5 minutes
          </Link>
          <Link
            href="/dashboard/api-keys"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:border-white/30 transition-all"
          >
            Get your API key →
          </Link>
        </div>
      </div>
    </div>
  );
}
