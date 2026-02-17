import Link from 'next/link';
import { BookOpen, Zap, Lock, Code, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">ILAL API Documentation</h1>
        <p className="text-xl text-gray-400">
          Compliant DeFi API — Privacy-preserving blockchain transaction infrastructure for institutional users
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Link
          href="/docs/quickstart"
          className="border border-white/10 rounded-xl p-6 hover:border-[#2962FF]/50 hover:bg-white/[0.02] transition-all group"
        >
          <Zap className="w-8 h-8 text-[#2962FF] mb-4" />
          <h3 className="text-lg font-semibold mb-2">Quick Start</h3>
          <p className="text-sm text-gray-400 mb-4">
            Make your first API call in 5 minutes
          </p>
          <div className="flex items-center text-[#2962FF] text-sm group-hover:underline">
            Get Started <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        <Link
          href="/docs/authentication"
          className="border border-white/10 rounded-xl p-6 hover:border-[#2962FF]/50 hover:bg-white/[0.02] transition-all group"
        >
          <Lock className="w-8 h-8 text-[#2962FF] mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication</h3>
          <p className="text-sm text-gray-400 mb-4">
            Learn how to authenticate with your API Key
          </p>
          <div className="flex items-center text-[#2962FF] text-sm group-hover:underline">
            Learn More <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        <Link
          href="/docs/endpoints"
          className="border border-white/10 rounded-xl p-6 hover:border-[#2962FF]/50 hover:bg-white/[0.02] transition-all group"
        >
          <Code className="w-8 h-8 text-[#2962FF] mb-4" />
          <h3 className="text-lg font-semibold mb-2">API Endpoints</h3>
          <p className="text-sm text-gray-400 mb-4">
            Complete API endpoint reference
          </p>
          <div className="flex items-center text-[#2962FF] text-sm group-hover:underline">
            View API <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>
      </div>

      {/* Overview */}
      <div className="prose prose-invert max-w-none">
        <h2 className="text-2xl font-bold mb-4">Overview</h2>
        <p className="text-gray-400 mb-6">
          The ILAL API provides zero-knowledge proof verification, session management, and compliance checks, enabling your application to securely access Uniswap V4 liquidity pools.
        </p>

        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Core Features</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Zero-Knowledge Proof Verification</div>
                <div className="text-sm text-gray-400">Verify user identity without exposing sensitive information</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Session Management</div>
                <div className="text-sm text-gray-400">24-hour sessions to reduce repeated verifications</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Compliance Checks</div>
                <div className="text-sm text-gray-400">Real-time verification that users meet regulatory requirements</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Uniswap V4 Integration</div>
                <div className="text-sm text-gray-400">Seamless integration with Uniswap V4 Hooks</div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">API Basics</h2>

        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Base URL</div>
            <code className="text-[#2962FF] bg-white/5 px-3 py-1.5 rounded">
              https://api.ilal.tech/api/v1
            </code>
          </div>
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Authentication</div>
            <code className="text-[#2962FF] bg-white/5 px-3 py-1.5 rounded">
              Bearer Token (API Key)
            </code>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Data Format</div>
            <code className="text-[#2962FF] bg-white/5 px-3 py-1.5 rounded">
              JSON
            </code>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
        <p className="text-gray-400 mb-4">
          API calls are subject to the following limits based on your plan:
        </p>

        <div className="space-y-3 mb-8">
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">FREE Plan</span>
              <span className="px-2 py-1 bg-[#2962FF]/20 text-[#2962FF] text-xs rounded-full">
                Current Plan
              </span>
            </div>
            <div className="text-sm text-gray-400">
              • 100 calls / month<br />
              • 10 requests / minute<br />
              • Up to 2 API Keys
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
        <p className="text-gray-400 mb-6">
          Head to the <Link href="/docs/quickstart" className="text-[#2962FF] hover:underline">Quick Start</Link> page
          to learn how to make your first API call in 5 minutes.
        </p>
      </div>
    </div>
  );
}
