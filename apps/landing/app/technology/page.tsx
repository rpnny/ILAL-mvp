"use client";

import { motion } from "framer-motion";
import { Terminal, ExternalLink, CheckCircle2, Zap, Lock, Shield, Code } from "lucide-react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export default function TechnologyPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary">
      {/* Background Data Flow Animation */}
      <div className="fixed inset-0 z-[-1] bg-data-flow pointer-events-none opacity-40" />

      {/* Navigation */}
      <Nav />

      {/* Main Content */}
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Technical Architecture</h1>
            <p className="text-xl text-gray-400 mb-16 font-light">
              Session-based verification with zero-knowledge proofs and <span className="text-white font-medium">Uniswap V4 Hooks</span>.
              Production-tested, 99% code coverage.
            </p>

            {/* Core Architecture */}
            <section className="mb-24">
              <h2 className="font-heading text-3xl font-bold mb-8">Core Components</h2>

              <div className="grid md:grid-cols-2 gap-6 mb-12">
                {[
                  {
                    name: "Registry",
                    type: "UUPS Proxy",
                    icon: Shield,
                    role: "System configuration center",
                    features: ["Manage trusted Issuers", "Router whitelist", "Global parameters", "Emergency pause"],
                    address: "0x461e...5Faf",
                    upgradeable: true
                  },
                  {
                    name: "SessionManager",
                    type: "UUPS Proxy",
                    icon: Zap,
                    role: "User verification state caching",
                    features: ["24-hour session TTL", "Batch query (~5k gas)", "Manual termination", "RBAC (VERIFIER)"],
                    address: "0xaa66...06e9",
                    upgradeable: true
                  },
                  {
                    name: "ComplianceHook",
                    type: "Immutable",
                    icon: Lock,
                    role: "Uniswap v4 access control layer",
                    features: ["Intercepts Pool Actions", "EIP-712 verification", "Replay protection", "Session validation (~8k gas)"],
                    address: "0x0000...002c",
                    upgradeable: false
                  },
                  {
                    name: "PlonkVerifier",
                    type: "Immutable",
                    icon: Code,
                    role: "On-chain ZK verification",
                    features: ["PLONK (~350k gas)", "Universal Setup", "Public input validation", "WASM generation"],
                    address: "0x3Aa3...e3cC",
                    upgradeable: false
                  },
                ].map((component, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <component.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{component.name}</h3>
                          <div className="text-xs text-secondary font-medium tracking-wide uppercase">{component.type}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded border ${component.upgradeable ? "bg-primary/10 text-primary border-primary/20" : "bg-white/5 text-gray-400 border-white/10"
                        }`}>
                        {component.upgradeable ? "Upgradeable" : "Immutable"}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{component.role}</p>
                    <div className="space-y-2 mb-6">
                      {component.features.map((feature, j) => (
                        <div key={j} className="flex items-start text-xs text-gray-400">
                          <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-primary" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] font-mono text-gray-500 border-t border-white/10 pt-3">
                      Base Sepolia: {component.address}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Code Integration Example */}
            <section className="mb-24">
              <h2 className="font-heading text-3xl font-bold mb-8">Integration Example</h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Solidity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass-card overflow-hidden group"
                >
                  <div className="border-b border-white/10 px-4 py-3 flex items-center bg-black/40">
                    <Terminal className="w-4 h-4 text-primary mr-2" />
                    <span className="text-xs text-gray-300 font-mono tracking-wide">Solidity (Uniswap V4 Hook)</span>
                  </div>
                  <div className="p-5 font-mono text-[13px] text-gray-300 overflow-x-auto leading-relaxed group-hover:text-primary transition-colors duration-500">
                    <pre>{`import {IHooks} from "v4-core/interfaces/IHooks.sol";

contract MyPool {
    address constant COMPLIANCE_HOOK = 
        0x00000000DA15E8FCA4dFf7aF93aBa7030000002c;
    
    function initialize() external {
        PoolKey memory key = PoolKey({
            currency0: USDC,
            currency1: USDY,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(COMPLIANCE_HOOK)
        });
        
        poolManager.initialize(key, SQRT_RATIO_1_1, "");
    }
}`}</pre>
                  </div>
                </motion.div>

                {/* Frontend SDK */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="glass-card overflow-hidden group"
                >
                  <div className="border-b border-white/10 px-4 py-3 flex items-center bg-black/40">
                    <Terminal className="w-4 h-4 text-secondary mr-2" />
                    <span className="text-xs text-gray-300 font-mono tracking-wide">Frontend SDK Integration</span>
                  </div>
                  <div className="p-5 font-mono text-[13px] text-gray-300 overflow-x-auto leading-relaxed group-hover:text-secondary transition-colors duration-500">
                    <pre>{`import { ILALClient } from '@ilal/sdk';

const client = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});

// 1. Activate session & generate ZK Proof
await client.session.activate();

// 2. Execute hook-protected swap
await client.swap.execute({
  tokenIn: BASE_SEPOLIA_TOKENS.USDC,
  tokenOut: BASE_SEPOLIA_TOKENS.WETH,
  amountIn: parseUnits('100', 6),
});`}</pre>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Performance Benchmarks */}
            <section className="mb-24">
              <h2 className="font-heading text-3xl font-bold mb-8">Performance Benchmarks</h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 bg-black/40">
                      <tr>
                        <th className="text-left p-4 font-semibold text-gray-300">Operation</th>
                        <th className="text-right p-4 font-semibold text-gray-300">First Tx</th>
                        <th className="text-right p-4 font-semibold text-gray-300">Subsequent</th>
                        <th className="text-center p-4 font-semibold text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { op: "Swap", first: "54,000", sub: "8,000" },
                        { op: "Add Liquidity", first: "52,000", sub: "10,000" },
                        { op: "Session Check", first: "5,000", sub: "5,000" },
                        { op: "ZK Verification", first: "350,000", sub: "N/A" },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-medium">{row.op}</td>
                          <td className="p-4 text-right font-mono text-gray-400">{row.first} gas</td>
                          <td className="p-4 text-right font-mono text-primary">{row.sub} gas</td>
                          <td className="p-4 text-center">
                            <span className="text-primary">✓</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </section>

            {/* Verification Status */}
            <section>
              <h2 className="font-heading text-3xl font-bold mb-8">Security & Audit Status</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Testing */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="glass-card p-6"
                >
                  <h3 className="font-semibold mb-4 text-lg">Comprehensive Testing</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Total Tests", value: "127", status: "pass" },
                      { label: "Pass Rate", value: "97.6%", status: "pass" },
                      { label: "Code Coverage", value: "99%", status: "pass" },
                      { label: "Security Tests", value: "15/15", status: "pass" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                        <span className="text-sm text-gray-400">{item.label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-white text-sm">{item.value}</span>
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Integration Promo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-8 flex flex-col justify-center items-center text-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 pointer-events-none" />
                  <Lock className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">Ready to Integrate?</h3>
                  <p className="text-sm text-gray-400 mb-6 font-light leading-relaxed">
                    Protect your protocols from sanctioned entity interference using the robust ILAL SDK.
                  </p>
                  <Link href="/integrations" className="glass-button glass-button-primary px-6 py-2">
                    Integration Guide
                  </Link>
                </motion.div>

              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
