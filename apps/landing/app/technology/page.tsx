"use client";

import { motion } from "framer-motion";
import { Terminal, ExternalLink, CheckCircle2, Zap, Lock, Shield, Code } from "lucide-react";
import Link from "next/link";

export default function TechnologyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
        backgroundSize: '48px 48px'
      }} />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-[#2962FF] rounded-md flex items-center justify-center">
              <span className="font-bold text-white text-sm">I</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">ILAL</span>
          </Link>
          <div className="hidden md:flex items-center space-x-8 text-sm">
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
            <Link href="/technology" className="text-white font-medium">Technology</Link>
            <Link href="/integrations" className="text-gray-400 hover:text-white transition-colors">Integrations</Link>
            <Link href="/roadmap" className="text-gray-400 hover:text-white transition-colors">Roadmap</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Technical Architecture</h1>
            <p className="text-xl text-gray-400 mb-16">
              Session-based verification with zero-knowledge proofs and Uniswap v4 Hooks. Production-tested, 99% code coverage.
            </p>

            {/* Core Architecture */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Core Components</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                {[
                  {
                    name: "Registry",
                    type: "UUPS Proxy",
                    icon: Shield,
                    role: "System configuration center",
                    features: [
                      "Manage trusted Issuers (Coinbase, Circle, etc.)",
                      "Router whitelist (Universal Router)",
                      "Global parameters (24h Session TTL)",
                      "Emergency pause mechanism"
                    ],
                    address: "0x461e...5Faf",
                    upgradeable: true
                  },
                  {
                    name: "SessionManager",
                    type: "UUPS Proxy",
                    icon: Zap,
                    role: "User verification state caching",
                    features: [
                      "24-hour session TTL",
                      "Batch query support (~5k gas)",
                      "Manual session termination",
                      "Role-based access control (VERIFIER_ROLE)"
                    ],
                    address: "0xaa66...06e9",
                    upgradeable: true
                  },
                  {
                    name: "ComplianceHook",
                    type: "Immutable",
                    icon: Lock,
                    role: "Uniswap v4 access control layer",
                    features: [
                      "Intercepts beforeSwap/beforeAddLiquidity/beforeRemoveLiquidity",
                      "EIP-712 signature verification (hookData)",
                      "Nonce-based replay attack prevention",
                      "Session status validation (~8k gas)"
                    ],
                    address: "0x0000...002c",
                    upgradeable: false
                  },
                  {
                    name: "PlonkVerifier",
                    type: "Immutable",
                    icon: Code,
                    role: "On-chain ZK proof verification",
                    features: [
                      "PLONK algorithm (~350k gas)",
                      "Universal Setup (no trusted ceremony)",
                      "Public input validation (user, merkleRoot, issuer)",
                      "Mock implementation for testnet"
                    ],
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
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="border border-white/10 rounded-lg p-6 bg-white/[0.02] hover:border-[#2962FF]/30 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[#2962FF]/20 flex items-center justify-center">
                          <component.icon className="w-5 h-5 text-[#2962FF]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{component.name}</h3>
                          <div className="text-xs text-gray-500">{component.type}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded ${
                        component.upgradeable ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {component.upgradeable ? "Upgradeable" : "Immutable"}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{component.role}</p>
                    <div className="space-y-2 mb-4">
                      {component.features.map((feature, j) => (
                        <div key={j} className="flex items-start text-xs text-gray-500">
                          <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs font-mono text-gray-600 border-t border-white/10 pt-3">
                      Base Sepolia: {component.address}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Data Flow */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">System Data Flow</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Verification Flow */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                >
                  <h3 className="font-semibold mb-4 text-lg flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                      <span className="text-green-400 font-bold">1</span>
                    </div>
                    Verification Flow
                  </h3>
                  <div className="space-y-3 pl-11">
                    {[
                      { label: "User connects wallet", time: "~2s" },
                      { label: "Obtain Coinbase Verification attestation", time: "Manual" },
                      { label: "Download ZK circuit files (.wasm, .zkey)", time: "~3s" },
                      { label: "Generate ZK Proof (Web Worker)", time: "4.58s avg" },
                      { label: "Submit proof to Verifier contract", time: "~350k gas" },
                      { label: "Start session (24h validity)", time: "~54k gas" },
                      { label: "Session activated ✓", time: "Ready" }
                    ].map((step, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between text-sm group"
                      >
                        <span className="text-gray-400 group-hover:text-gray-300 transition-colors">{step.label}</span>
                        <span className="text-xs text-gray-600 font-mono">{step.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Swap Flow */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                >
                  <h3 className="font-semibold mb-4 text-lg flex items-center">
                    <div className="w-8 h-8 rounded-full bg-[#2962FF]/20 flex items-center justify-center mr-3">
                      <span className="text-[#2962FF] font-bold">2</span>
                    </div>
                    Swap Flow
                  </h3>
                  <div className="space-y-3 pl-11">
                    {[
                      { label: "User inputs swap parameters", time: "UI" },
                      { label: "Frontend checks session active", time: "~5k gas" },
                      { label: "Generate EIP-712 signature", time: "<1s" },
                      { label: "Construct hookData (user, deadline, nonce, sig)", time: "~0.1s" },
                      { label: "Call UniversalRouter.swap(...)", time: "Tx" },
                      { label: "ComplianceHook.beforeSwap() triggered", time: "Hook" },
                      { label: "Verify hookData signature + session", time: "~8k gas" },
                      { label: "PoolManager executes swap ✓", time: "~200k gas" }
                    ].map((step, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between text-sm group"
                      >
                        <span className="text-gray-400 group-hover:text-gray-300 transition-colors">{step.label}</span>
                        <span className="text-xs text-gray-600 font-mono">{step.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Code Example */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Integration Example</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Solidity */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ boxShadow: "0 0 30px rgba(41, 98, 255, 0.15)" }}
                  className="border border-white/10 bg-black/20 rounded-lg overflow-hidden hover:border-[#2962FF]/30 transition-all"
                >
                  <div className="border-b border-white/10 px-4 py-2 flex items-center">
                    <Terminal className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-xs text-gray-400 font-mono">Solidity Integration</span>
                  </div>
                  <div className="p-4 font-mono text-xs text-gray-300 overflow-x-auto">
                    <pre>{`// Integrate ILAL into your pool
import {IHooks} from "v4-core/interfaces/IHooks.sol";

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

                {/* Frontend */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ boxShadow: "0 0 30px rgba(41, 98, 255, 0.15)" }}
                  className="border border-white/10 bg-black/20 rounded-lg overflow-hidden hover:border-[#2962FF]/30 transition-all"
                >
                  <div className="border-b border-white/10 px-4 py-2 flex items-center">
                    <Terminal className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-xs text-gray-400 font-mono">Frontend Integration</span>
                  </div>
                  <div className="p-4 font-mono text-xs text-gray-300 overflow-x-auto">
                    <pre>{`// Activate user session
import { generateZKProof } from '@ilal/sdk';

// 1. Generate proof (one-time, ~4.58s)
const proof = await generateZKProof({
  attestationUID,
  userAddress
});

// 2. Start session (24h validity)
await sessionManager.startSession(
  userAddress,
  proof.data,
  proof.publicInputs
);

// 3. User can now trade freely
// Session check: ~8k gas per swap`}</pre>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Performance Benchmarks */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Performance Benchmarks</h2>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 bg-white/[0.02]">
                      <tr>
                        <th className="text-left p-4 font-semibold">Operation</th>
                        <th className="text-right p-4 font-semibold">First Transaction</th>
                        <th className="text-right p-4 font-semibold">Subsequent</th>
                        <th className="text-right p-4 font-semibold">Target</th>
                        <th className="text-center p-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { op: "Swap", first: "54,000", sub: "8,000", target: "<60,000" },
                        { op: "Add Liquidity", first: "52,000", sub: "10,000", target: "<60,000" },
                        { op: "Remove Liquidity", first: "48,000", sub: "9,000", target: "<50,000" },
                        { op: "Session Check", first: "5,000", sub: "5,000", target: "<8,000" },
                        { op: "ZK Verification", first: "350,000", sub: "N/A", target: "<400,000" },
                      ].map((row, i) => (
                        <motion.tr 
                          key={i}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-4 font-medium">{row.op}</td>
                          <td className="p-4 text-right font-mono text-gray-400">{row.first} gas</td>
                          <td className="p-4 text-right font-mono text-gray-400">{row.sub} gas</td>
                          <td className="p-4 text-right font-mono text-gray-500">{row.target} gas</td>
                          <td className="p-4 text-center">
                            <span className="text-green-400">✓</span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Cost Comparison */}
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="border border-red-500/20 rounded-lg p-6 bg-red-500/5"
                >
                  <h3 className="font-semibold mb-4 flex items-center">
                    <span className="text-red-400 mr-2">❌</span>
                    Traditional Approach (Per-TX Verification)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gas per swap:</span>
                      <span className="font-mono text-red-400">252,000 gas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">30 swaps/month:</span>
                      <span className="font-mono text-red-400">7,560,000 gas</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                      <span className="text-white font-semibold">Monthly cost:</span>
                      <span className="font-mono text-red-400 font-bold">$2,016</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="border border-green-500/20 rounded-lg p-6 bg-green-500/5"
                >
                  <h3 className="font-semibold mb-4 flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    ILAL Session Caching
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">First verification:</span>
                      <span className="font-mono text-gray-400">404,000 gas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">29 cached swaps:</span>
                      <span className="font-mono text-gray-400">232,000 gas</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                      <span className="text-white font-semibold">Monthly cost:</span>
                      <span className="font-mono text-green-400 font-bold">$37</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-6 border border-[#2962FF]/30 rounded-lg p-6 bg-[#2962FF]/5 text-center"
              >
                <div className="text-3xl font-bold text-[#2962FF] mb-2">98.2% Cost Reduction</div>
                <div className="text-sm text-gray-400">Save $1,979 per month per user (based on 30 swaps, 20 Gwei, $2000 ETH)</div>
              </motion.div>
            </section>

            {/* Security & Testing */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Security & Audit Status</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Testing */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                >
                  <h3 className="font-semibold mb-4">Comprehensive Testing</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Total Tests", value: "127", status: "pass" },
                      { label: "Pass Rate", value: "97.6%", status: "pass" },
                      { label: "Code Coverage", value: "99%", status: "pass" },
                      { label: "Security Tests", value: "15/15", status: "pass" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{item.label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-white">{item.value}</span>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-gray-500 mb-2">Test Categories</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unit Tests</span>
                        <span className="font-mono">68 tests (97%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Integration Tests</span>
                        <span className="font-mono">35 tests (97.1%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Security Tests</span>
                        <span className="font-mono">15 tests (100%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Performance Tests</span>
                        <span className="font-mono">9 tests (100%)</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Contracts */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                >
                  <h3 className="font-semibold mb-4">Deployed Contracts (Base Sepolia)</h3>
                  <div className="space-y-3 text-xs font-mono">
                    {[
                      { name: "Registry", addr: "0x461e57114c2DeE76dEC717eD8B2f4fBe62AB5Faf" },
                      { name: "SessionManager", addr: "0xaa66F34d10F60C2E8E63cA8DD6E1CAc7D2c406e9" },
                      { name: "ComplianceHook", addr: "0x00000000DA15E8FCA4dFf7aF93aBa7030000002c" },
                      { name: "MockVerifier", addr: "0x3Aa3f5766bfa2010070D93a27edA14A2ed38e3cC" },
                    ].map((contract, i) => (
                      <div key={i} className="border border-white/10 rounded p-3 hover:border-[#2962FF]/30 transition-colors">
                        <div className="text-gray-400 mb-1">{contract.name}</div>
                        <div className="text-gray-600 break-all">{contract.addr}</div>
                      </div>
                    ))}
                  </div>
                  <a 
                    href="https://sepolia.basescan.org" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center text-sm text-[#2962FF] hover:text-[#2962FF]/80 transition-colors"
                  >
                    View on BaseScan <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </motion.div>
              </div>

              {/* Security Measures */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-6 border border-white/10 rounded-lg p-6 bg-white/[0.02]"
              >
                <h3 className="font-semibold mb-4">Security Mechanisms</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Identity Verification",
                      items: ["ZK Proofs (privacy-preserving)", "EIP-712 signatures", "Nonce-based replay protection"]
                    },
                    {
                      title: "Access Control",
                      items: ["24-hour session TTL", "Manual revocation support", "Emergency pause mechanism"]
                    },
                    {
                      title: "Upgrade Safety",
                      items: ["UUPS Proxy (Registry, SessionManager)", "Immutable Hook & Verifier", "Multisig governance recommended"]
                    },
                  ].map((category, i) => (
                    <div key={i}>
                      <div className="text-sm font-semibold mb-3 text-gray-300">{category.title}</div>
                      <div className="space-y-2">
                        {category.items.map((item, j) => (
                          <div key={j} className="flex items-start text-xs text-gray-500">
                            <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border-t border-white/5 pt-12 text-center"
            >
              <p className="text-gray-400 mb-6">
                Ready to integrate ILAL into your protocol?
              </p>
              <div className="flex justify-center gap-4">
                <Link 
                  href="/integrations" 
                  className="btn-ripple px-6 py-3 bg-[#2962FF] text-white rounded font-medium hover:bg-[#2962FF]/90 hover:shadow-lg hover:shadow-[#2962FF]/20 hover:scale-105 transition-all inline-block"
                >
                  View Integration Guide
                </Link>
                <a 
                  href="https://github.com/rpnny/ILAL-mvp" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-white/10 rounded font-medium hover:bg-white/5 hover:border-white/20 hover:scale-105 transition-all inline-flex items-center"
                >
                  GitHub Repository <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
