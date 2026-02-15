"use client";

import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Network } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="fixed inset-0 opacity-[0.015]" style={{
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
            <Link href="/about" className="text-white font-medium">About</Link>
            <Link href="/technology" className="text-gray-400 hover:text-white transition-colors">Technology</Link>
            <Link href="/integrations" className="text-gray-400 hover:text-white transition-colors">Integrations</Link>
            <Link href="/roadmap" className="text-gray-400 hover:text-white transition-colors">Roadmap</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Vision & Market Opportunity</h1>
            <p className="text-xl text-gray-400 mb-16">
              The $400 trillion opportunity to bridge institutional capital and DeFi liquidity.
            </p>

            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Market Opportunity</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {[
                  { value: "$400T", label: "Total Addressable Market", desc: "Traditional assets eligible for tokenization" },
                  { value: "$10B", label: "Current On-Chain RWA", desc: "0.0025% penetration" },
                  { value: "$1T+", label: "5-Year Projection", desc: "100x growth", highlight: true },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
                    whileHover={{ scale: 1.05, y: -8 }}
                    className={`text-center p-8 border rounded-lg cursor-default ${
                      item.highlight 
                        ? 'border-[#2962FF]/30 bg-[#2962FF]/5 hover:border-[#2962FF]/50' 
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    } transition-all`}
                  >
                    <div className={`text-4xl font-bold mb-2 ${item.highlight ? 'text-[#2962FF]' : ''}`}>
                      {item.value}
                    </div>
                    <div className="text-sm text-gray-400 mb-4">{item.label}</div>
                    <div className="text-xs text-gray-600">{item.desc}</div>
                  </motion.div>
                ))}
              </div>

              <div className="border-l-4 border-[#2962FF] pl-6 bg-white/[0.02] p-6 rounded-r-lg">
                <h3 className="text-xl font-bold mb-3">The Bottleneck</h3>
                <p className="text-gray-400 leading-relaxed">
                  RWA protocols (Ondo, Backed, Maple) have proven institutional demand exists. 
                  But scaling requires DeFi liquidity—which demands compliance infrastructure. 
                  ILAL is the missing piece that unlocks $400T of traditional assets for on-chain trading.
                </p>
              </div>
            </section>

            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">ILAL as Infrastructure</h2>
              
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                >
                  <h3 className="text-lg font-semibold mb-3">The Compliance Layer for DeFi</h3>
                  <p className="text-gray-400 mb-4">
                    Just as Chainlink became the oracle standard, ILAL aims to be the compliance standard. 
                    Every RWA protocol needs on-chain KYC—ILAL provides it with privacy, efficiency, and seamless UX.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Privacy-Preserving", "Gas-Efficient", "Uniswap Native", "Multi-Provider"].map((tag, i) => (
                      <span key={i} className="text-xs bg-[#2962FF]/10 text-[#2962FF] px-3 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </section>

            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Competitive Positioning</h2>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02] mb-8"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 bg-white/[0.02]">
                      <tr>
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold">Traditional DeFi</th>
                        <th className="text-center p-4 font-semibold">CEX</th>
                        <th className="text-center p-4 font-semibold">Other ZK</th>
                        <th className="text-center p-4 font-semibold text-[#2962FF]">ILAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { feature: "Compliance", trad: "❌ 0%", cex: "✅ 100%", zk: "⚠️ 40%", ilal: "✅ 100%" },
                        { feature: "Privacy", trad: "⚠️ 30%", cex: "❌ 0%", zk: "✅ 100%", ilal: "✅ 100%" },
                        { feature: "Decentralization", trad: "✅ 100%", cex: "❌ 0%", zk: "✅ 80%", ilal: "✅ 100%" },
                        { feature: "Cost/Trade", trad: "$2-5", cex: "$0.50", zk: "$5+", ilal: "$0.0003" },
                        { feature: "Institutional Ready", trad: "❌", cex: "⚠️", zk: "❌", ilal: "✅" },
                        { feature: "Uniswap v4 Native", trad: "✅", cex: "❌", zk: "❌", ilal: "✅" },
                      ].map((row, i) => (
                        <motion.tr 
                          key={i}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-4 font-medium">{row.feature}</td>
                          <td className="p-4 text-center text-gray-400">{row.trad}</td>
                          <td className="p-4 text-center text-gray-400">{row.cex}</td>
                          <td className="p-4 text-center text-gray-400">{row.zk}</td>
                          <td className="p-4 text-center font-semibold text-[#2962FF]">{row.ilal}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: "5,405x Cheaper",
                    detail: "Than per-transaction ZK verification",
                    highlight: true
                  },
                  {
                    title: "6-12 Month Lead",
                    detail: "First compliance Hook on Uniswap v4",
                    highlight: false
                  },
                  {
                    title: "99% Test Coverage",
                    detail: "Production-ready, audit-prepared",
                    highlight: false
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className={`text-center p-6 border rounded-lg ${
                      stat.highlight 
                        ? 'border-[#2962FF]/30 bg-[#2962FF]/5' 
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    } transition-all cursor-default`}
                  >
                    <div className={`text-3xl font-bold mb-2 ${stat.highlight ? 'text-[#2962FF]' : ''}`}>
                      {stat.title}
                    </div>
                    <div className="text-sm text-gray-400">{stat.detail}</div>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Network Effects & Moat</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                  className="border border-white/10 rounded-lg p-6 hover:border-green-400/30 hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center mb-4">
                    <Network className="w-6 h-6 mr-3 text-green-400" />
                    <h3 className="text-lg font-semibold">Network Effects</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-gray-400">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      More protocols integrate → More verified users
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      More users → Deeper liquidity pools
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      Deeper liquidity → Better pricing for institutions
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      Better pricing → Attracts more protocols (flywheel)
                    </li>
                  </ul>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                  className="border border-white/10 rounded-lg p-6 hover:border-[#2962FF]/30 hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center mb-4">
                    <TrendingUp className="w-6 h-6 mr-3 text-[#2962FF]" />
                    <h3 className="text-lg font-semibold">Competitive Moat</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-gray-400">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      Technical complexity (11-19 months to replicate)
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      First-mover on Uniswap v4 (6-12 month lead)
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      Liquidity lock-in (switching costs)
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                      Regulatory approval (time-consuming for competitors)
                    </li>
                  </ul>
                </motion.div>
              </div>
            </section>

            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Why Now?</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { 
                    title: "Uniswap v4 Launch", 
                    detail: "Hook architecture enables native compliance integration without wrappers",
                    timing: "Q4 2026"
                  },
                  { 
                    title: "RWA Explosion", 
                    detail: "$10B → $100B+ growth trajectory over 24 months. Market is ready.",
                    timing: "2025-2027"
                  },
                  { 
                    title: "Regulatory Clarity", 
                    detail: "MiCA (EU) and evolving US frameworks create compliance demand",
                    timing: "2026+"
                  },
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    whileHover={{ y: -5, borderColor: "rgba(41, 98, 255, 0.3)" }}
                    className="border border-white/10 rounded-lg p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-default"
                  >
                    <div className="text-xs text-[#2962FF] font-semibold mb-2">{item.timing}</div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.detail}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border-t border-white/5 pt-12 text-center"
            >
              <p className="text-gray-400 mb-6">
                Learn how ILAL technology enables this vision.
              </p>
              <Link 
                href="/technology" 
                className="btn-ripple px-6 py-3 bg-[#2962FF] text-white rounded font-medium hover:bg-[#2962FF]/90 hover:shadow-lg hover:shadow-[#2962FF]/20 hover:scale-105 transition-all inline-block"
              >
                View Technical Architecture
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
