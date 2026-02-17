import Link from 'next/link';
import { Code, Terminal, Package, CheckCircle2, Zap, BookOpen } from 'lucide-react';

export default function SdkPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">SDK Guide</h1>
            <p className="text-xl text-gray-400 mb-12">
                Integrate compliant DeFi features quickly with the ILAL TypeScript SDK
            </p>

            <div className="space-y-10">
                {/* Installation */}
                <div>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-[#2962FF] rounded-full flex items-center justify-center text-sm font-bold">
                            1
                        </div>
                        <h2 className="text-2xl font-bold">Installation</h2>
                    </div>
                    <div className="ml-11 space-y-3">
                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <Terminal className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">npm</span>
                            </div>
                            <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                                <code className="text-gray-300">npm install @ilal/sdk</code>
                            </pre>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <Terminal className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">yarn</span>
                            </div>
                            <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                                <code className="text-gray-300">yarn add @ilal/sdk</code>
                            </pre>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <Terminal className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">pnpm</span>
                            </div>
                            <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                                <code className="text-gray-300">pnpm add @ilal/sdk</code>
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Initialization */}
                <div>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-[#2962FF] rounded-full flex items-center justify-center text-sm font-bold">
                            2
                        </div>
                        <h2 className="text-2xl font-bold">Initialization</h2>
                    </div>
                    <div className="ml-11">
                        <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                            <code className="text-gray-300">{`import { ILALClient } from '@ilal/sdk';

const client = new ILALClient({
  apiKey: process.env.ILAL_API_KEY,
  // Optional — defaults to Base Sepolia
  chainId: 84532,
  // Optional — defaults to production API
  baseUrl: 'https://api.ilal.tech/api/v1'
});`}</code>
                        </pre>
                    </div>
                </div>

                {/* Core Modules */}
                <div>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-[#2962FF] rounded-full flex items-center justify-center text-sm font-bold">
                            3
                        </div>
                        <h2 className="text-2xl font-bold">Core Modules</h2>
                    </div>

                    <div className="ml-11 space-y-6">
                        {/* Session Module */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <div className="bg-white/[0.02] p-4 border-b border-white/10">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <Package className="w-5 h-5 mr-2 text-[#2962FF]" />
                                    Session Module
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">Manage the lifecycle of ZK verification sessions</p>
                            </div>
                            <pre className="p-4 overflow-x-auto text-sm">
                                <code className="text-gray-300">{`// Verify ZK Proof and create a session
const session = await client.session.verify({
  proof: zkProof,
  publicSignals: publicSignals,
  userAddress: '0x...'
});

console.log(session.sessionId); // 0x...
console.log(session.expiresAt); // ISO date string

// Check session status
const status = await client.session.getStatus('0x...');
console.log(status.isActive); // true

// Extend session
const extended = await client.session.extend(session.sessionId);
console.log(extended.newExpiresAt);`}</code>
                            </pre>
                        </div>

                        {/* Compliance Module */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <div className="bg-white/[0.02] p-4 border-b border-white/10">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <Package className="w-5 h-5 mr-2 text-green-400" />
                                    Compliance Module
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">Check address compliance status</p>
                            </div>
                            <pre className="p-4 overflow-x-auto text-sm">
                                <code className="text-gray-300">{`// Check address compliance status
const result = await client.compliance.check('0x...');

if (result.isCompliant) {
  console.log('Address passed compliance checks');
} else {
  console.log('Non-compliant reason:', result.reason);
}`}</code>
                            </pre>
                        </div>

                        {/* Swap Module */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <div className="bg-white/[0.02] p-4 border-b border-white/10">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <Package className="w-5 h-5 mr-2 text-purple-400" />
                                    Swap Module
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">Execute compliant Uniswap V4 trades</p>
                            </div>
                            <pre className="p-4 overflow-x-auto text-sm">
                                <code className="text-gray-300">{`// Execute a token swap (requires active session)
const swap = await client.swap.execute({
  tokenIn: '0x...', // USDC
  tokenOut: '0x...', // WETH
  amountIn: '1000000', // 1 USDC (6 decimals)
  slippage: 0.5 // 0.5%
});

console.log(swap.txHash); // Transaction hash
console.log(swap.amountOut); // Tokens received`}</code>
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Error Handling */}
                <div>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-[#2962FF] rounded-full flex items-center justify-center text-sm font-bold">
                            4
                        </div>
                        <h2 className="text-2xl font-bold">Error Handling</h2>
                    </div>
                    <div className="ml-11">
                        <pre className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 overflow-x-auto text-sm">
                            <code className="text-gray-300">{`import { ILALError, RateLimitError } from '@ilal/sdk';

try {
  const session = await client.session.verify({...});
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited, retry in', error.retryAfter, 'seconds');
  } else if (error instanceof ILALError) {
    console.log('API error:', error.message);
    console.log('Error code:', error.code);
  }
}`}</code>
                        </pre>
                    </div>
                </div>

                {/* TypeScript Support */}
                <div className="bg-[#2962FF]/10 border border-[#2962FF]/20 rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <Zap className="w-6 h-6 mr-2 text-[#2962FF]" />
                        TypeScript Support
                    </h3>
                    <p className="text-gray-300 mb-4">
                        The SDK is written entirely in TypeScript with full type definitions. All method parameters and return values are fully typed.
                    </p>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300">Complete .d.ts type definitions</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300">ESM and CommonJS support</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300">IntelliSense autocomplete</span>
                        </div>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="border-t border-white/10 pt-8">
                    <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
                    <div className="space-y-3">
                        <Link
                            href="/docs/endpoints"
                            className="block text-gray-300 hover:text-white transition-colors"
                        >
                            → View the full <span className="text-[#2962FF]">API Endpoint Reference</span>
                        </Link>
                        <Link
                            href="/docs/errors"
                            className="block text-gray-300 hover:text-white transition-colors"
                        >
                            → Browse <span className="text-[#2962FF]">Error Codes Reference</span>
                        </Link>
                        <Link
                            href="/dashboard/playground"
                            className="block text-gray-300 hover:text-white transition-colors"
                        >
                            → Try the <span className="text-[#2962FF]">API Playground</span> for live testing
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
