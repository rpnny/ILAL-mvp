"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lock, Zap, ShieldCheck, Activity, Terminal, Database } from "lucide-react";
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
                <span className="text-xs text-gray-300 font-medium tracking-wide">ILAL v1.0 • Live on Base Sepolia</span>
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
                { value: "97%", label: "Gas Reduction", color: "text-primary" },
                { value: "99%", label: "Test Coverage", color: "text-white" },
                { value: "18k+", label: "Lines of Code", color: "text-white" },
                { value: "Active", label: "Live on Base Sepolia", color: "text-secondary" },
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

        {/* TRUSTED BY / INTEGRATIONS PREVIEW */}
        <section className="py-24 border-t border-white/5 bg-gradient-to-b from-transparent to-[#050505]">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-sm text-gray-500 uppercase tracking-widest font-medium mb-10">Powering Compliant Markets On</h3>

            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center"><Database className="w-4 h-4 text-white" /></div>
                <span className="font-bold text-xl tracking-tight text-white">Uniswap <span className="text-pink-500">V4</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-white font-bold font-serif italic text-sm">O</span></div>
                <span className="font-bold text-xl tracking-tight text-white">Base</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 border-2 border-purple-500 flex items-center justify-center"><span className="text-white font-bold text-xs">EAS</span></div>
                <span className="font-bold text-xl tracking-tight text-white">Attestations</span>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
