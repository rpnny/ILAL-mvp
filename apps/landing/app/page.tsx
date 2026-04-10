"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lock, Zap, ShieldCheck, Activity, Terminal, Database, ChevronRight, FileCheck, Fingerprint, Timer, Blocks } from "lucide-react";
import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary">
      {/* Background Data Flow Animation */}
      <div className="fixed inset-0 z-[-1] bg-data-flow pointer-events-none opacity-60" />

      {/* Navigation */}
      <Nav />

      {/* Main Content */}
      <main className="flex-grow pt-24">

        {/* HERO SECTION */}
        <section className="relative pt-20 pb-24 md:pt-32 md:pb-32 overflow-hidden px-6">
          <div className="container mx-auto relative z-10">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-5xl mx-auto text-center">

              {/* Badge */}
              <div className="inline-flex items-center space-x-2 glass-border rounded-full px-4 py-1.5 mb-8 bg-glass-bg">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse blur-[1px]" />
                <span className="text-xs text-gray-300 font-medium tracking-wide">ILAL v2 • Live on Base Sepolia</span>
              </div>

              {/* Headlines */}
              <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
                <span className="text-white">Institutions Trade Onchain.</span>
                <br />
                <span className="text-gradient-cyan">Securely.</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
                Zero-Knowledge Compliance for Uniswap V4.
                <br className="hidden md:block" /> One Session. 97% Less Gas. Full Regulatory Safety.
              </p>

              {/* Call to Actions */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-5"
              >
                <Link href="/dashboard" className="w-full sm:w-auto glass-button glass-button-primary px-8 py-3.5 flex items-center justify-center text-[15px]">
                  Launch Session
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link href="/technology" className="w-full sm:w-auto glass-button glass-button-purple px-8 py-3.5 flex items-center justify-center text-[15px]">
                  For Institutions
                </Link>
              </motion.div>

            </motion.div>
          </div>

          {/* Subtle bottom gradient to fade into next section */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>

        {/* LIVE DATA GRID (OKX Style Data Strip) */}
        <section className="py-8 border-y border-white/5 bg-black/40 backdrop-blur-md">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 divide-x divide-white/5">
              {[
                { value: "97%", label: "Gas Reduction vs Per-Tx", color: "text-primary" },
                { value: "364", label: "Tests Passing", color: "text-white" },
                { value: "All E2E", label: "Passing on Base Sepolia", color: "text-white" },
                { value: "Live", label: "API + Contracts Deployed", color: "text-secondary" },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className={`pl-6 ${i === 0 || i === 2 ? 'pl-0 lg:pl-6' : ''} ${i === 0 ? 'pl-0' : ''} group cursor-default`}
                >
                  <div className={`font-heading text-3xl font-bold mb-1 tracking-tight ${stat.color} group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CORE FEATURES MODULE */}
        <section className="py-32 relative">
          <div className="container mx-auto px-6">
            <div className="mb-16 text-center lg:text-left flex flex-col lg:flex-row justify-between items-end gap-6">
              <div className="max-w-2xl">
                <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">Infrastructure Layer Core</h2>
                <p className="text-gray-400 text-lg font-light">Built directly on Uniswap V4 native hooks. We never take custody. We only provide the gateway.</p>
              </div>
              <Link href="/technology" className="group flex items-center text-primary hover:text-white transition-colors text-sm font-medium tracking-wide">
                View Full Documentation <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: ShieldCheck,
                  title: "ZK Compliance",
                  desc: "Submit PLONK proofs off-chain to instantly verify your jurisdiction and KYC status, completely trustlessly."
                },
                {
                  icon: Terminal,
                  title: "API Execution",
                  desc: "Provide liquidity and execute swaps programmatically through our robust SaaS API using developer API keys."
                },
                {
                  icon: Activity,
                  title: "Session Management",
                  desc: "Cache your verified state on-chain for 24 hours. Enjoy native Uniswap V4 gas fees for all subsequent trades."
                },
                {
                  icon: Lock,
                  title: "Compliance Hooks",
                  desc: "The ILAL Gateway intercepts trades at the pool level, ensuring non-compliant orders are atomically reverted."
                },
              ].map((feature, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="glass-card p-8 flex flex-col h-full"
                >
                  <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-sm text-gray-400 font-light flex-grow leading-relaxed mb-6">
                    {feature.desc}
                  </p>
                  <Link href="/docs" className="text-sm text-gray-500 hover:text-primary transition-colors inline-flex items-center">
                    Learn More <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — Architecture Flow */}
        <section className="py-32 border-t border-white/5 relative overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
              <p className="text-gray-400 text-lg font-light max-w-2xl mx-auto">From KYC verification to DeFi execution in four steps. No custody. No intermediaries.</p>
            </div>

            {/* Flow Steps */}
            <div className="grid md:grid-cols-4 gap-6 relative">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/40 via-secondary/40 to-primary/40" />

              {[
                { step: "01", icon: FileCheck, title: "KYC Verification", desc: "Complete identity verification via Coinbase EAS attestation or Sumsub. Your data stays off-chain.", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
                { step: "02", icon: Fingerprint, title: "ZK Proof Generation", desc: "A PLONK zero-knowledge proof is generated, proving compliance without revealing any personal data.", color: "from-secondary/20 to-secondary/5", iconColor: "text-secondary" },
                { step: "03", icon: Timer, title: "Session Activation", desc: "Your proof is verified on-chain and cached for 24 hours. All subsequent trades use native gas fees.", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
                { step: "04", icon: Blocks, title: "Trade on Uniswap V4", desc: "Execute swaps and provide liquidity through ILAL hooks. Non-compliant orders are atomically reverted.", color: "from-secondary/20 to-secondary/5", iconColor: "text-secondary" },
              ].map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  key={i}
                  className="relative text-center"
                >
                  {/* Step number circle */}
                  <div className={`w-12 h-12 mx-auto mb-6 rounded-full bg-gradient-to-b ${item.color} border border-white/10 flex items-center justify-center relative z-10 bg-[#0A0A0A]`}>
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>

                  <div className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-medium mb-2">Step {item.step}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 font-light leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* BUILT ON — Integration Logos */}
        <section className="py-20 border-t border-white/5 bg-gradient-to-b from-transparent to-[#050505]">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-sm text-gray-500 uppercase tracking-[0.2em] font-medium mb-12">Built On</h3>

            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
              {[
                { name: "Uniswap V4", accent: "bg-[#FF007A]", letter: "U" },
                { name: "Base", accent: "bg-[#0052FF]", letter: "B" },
                { name: "EAS", accent: "bg-[#8B5CF6]", letter: "E" },
                { name: "Circom", accent: "bg-[#22C55E]", letter: "C" },
                { name: "snarkjs", accent: "bg-[#F59E0B]", letter: "S" },
              ].map((item, i) => (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  key={i}
                  className="flex items-center space-x-3 group"
                >
                  <div className={`w-9 h-9 rounded-lg ${item.accent} flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity`}>
                    <span className="text-white font-bold text-sm">{item.letter}</span>
                  </div>
                  <span className="font-semibold text-lg text-gray-400 group-hover:text-white transition-colors">{item.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative">
          <div className="container mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">Ready to Go Compliant?</h2>
              <p className="text-gray-400 text-lg font-light mb-10">Start trading on Uniswap V4 with full KYC/AML compliance. No intermediaries, no custody risk.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <Link href="/dashboard" className="w-full sm:w-auto glass-button glass-button-primary px-8 py-3.5 flex items-center justify-center text-[15px]">
                  Launch Demo <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link href="/docs" className="w-full sm:w-auto glass-button glass-button-purple px-8 py-3.5 flex items-center justify-center text-[15px]">
                  Read the Docs
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
