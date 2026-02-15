"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Github, ExternalLink, Zap, Lock, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

// Number counter animation
function Counter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = numValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numValue) {
        setCount(numValue);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [numValue]);
  
  return <span>{Math.round(count)}{suffix}</span>;
}

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
      {/* Subtle grid background */}
      <div className="fixed inset-0 opacity-[0.015]" style={{
        backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
        backgroundSize: '48px 48px'
      }} />

      {/* Navigation */}
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
            <Link href="/technology" className="text-gray-400 hover:text-white transition-colors">Technology</Link>
            <Link href="/integrations" className="text-gray-400 hover:text-white transition-colors">Integrations</Link>
            <Link href="/roadmap" className="text-gray-400 hover:text-white transition-colors">Roadmap</Link>
                    <a href="https://github.com/rpnny/ILAL-mvp" className="text-gray-400 hover:text-white transition-colors flex items-center">
                      Docs <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
              </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Signature element: subtle blue glow with mouse tracking */}
        <motion.div 
          className="absolute top-20 w-[600px] h-[400px] bg-[#2962FF]/5 rounded-full blur-[100px] pointer-events-none"
          animate={{
            x: mousePosition.x / 20 - 300,
            y: mousePosition.y / 20 + 80,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 border border-white/10 bg-white/5 rounded-full px-3 py-1 mb-8">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">Deployed on Base Sepolia</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Zero-Knowledge Compliance<br />
              Infrastructure for Uniswap v4
            </h1>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              On-chain verification layer enabling institutional access to DeFi liquidity 
              while maintaining regulatory compliance and user privacy through ZK-SNARKs.
            </p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Link 
                href="/about" 
                className="btn-ripple px-6 py-2.5 bg-[#2962FF] text-white rounded font-medium hover:bg-[#2962FF]/90 hover:shadow-lg hover:shadow-[#2962FF]/20 transition-all flex items-center group"
              >
                Learn More
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/technology" 
                className="px-6 py-2.5 border border-white/10 rounded font-medium hover:bg-white/5 hover:border-white/20 transition-all"
              >
                View Architecture
              </Link>
              <a 
                href="https://github.com/rpnny/ILAL-mvp" 
                className="px-6 py-2.5 border border-white/10 rounded font-medium hover:bg-white/5 hover:border-white/20 transition-all flex items-center group"
              >
                <Github className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                GitHub
              </a>
            </motion.div>

            {/* Key metrics - with animation */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            >
              {[
                { value: "96.8", label: "Gas Reduction", suffix: "%" },
                { value: "99", label: "Test Coverage", suffix: "%" },
                { value: "18", label: "Lines of Code", suffix: "k+" },
                { value: "127", label: "Tests Passing", suffix: "" },
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="border border-white/5 bg-white/[0.02] rounded-lg p-4 hover:border-[#2962FF]/30 hover:bg-white/[0.05] transition-all cursor-default"
                >
                  <div className="text-2xl font-bold mb-1">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem & Solution - With animations */}
      <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Problem */}
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="text-2xl font-bold mb-6"
                >
                  The Challenge
                </motion.h2>
                <div className="space-y-4">
                  {[
                    { icon: TrendingUp, title: "High Gas Cost", desc: "252k Gas per transaction = $50-$100 at peak" },
                    { icon: Lock, title: "Privacy Risk", desc: "Traditional solutions expose PII on-chain" },
                    { icon: Zap, title: "Manual KYC", desc: "$2,000 per user, 48-72 hour delays" },
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ x: 5 }}
                      className="flex items-start space-x-4 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-red-500/40 transition-colors">
                        <item.icon className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Solution */}
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="text-2xl font-bold mb-6"
                >
                  The ILAL Solution
                </motion.h2>
                <div className="space-y-4">
                  {[
                    { icon: Zap, title: "Session Caching", desc: "Verify once, trade for 24 hours. 96.8% gas savings." },
                    { icon: Lock, title: "Zero-Knowledge", desc: "PLONK proofs ensure no PII touches the chain." },
                    { icon: CheckCircle2, title: "Uniswap Native", desc: "Built directly into v4 via Hooks. No wrappers." },
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ x: -5 }}
                      className="flex items-start space-x-4 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-green-500/40 group-hover:bg-green-500/20 transition-all">
                        <item.icon className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <Link 
                href="/technology" 
                className="inline-flex items-center text-[#2962FF] hover:text-[#2962FF]/80 transition-colors group"
              >
                Explore technical architecture
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Links to Deep Pages - Enhanced animations */}
      <section className="py-20 border-t border-white/5 bg-white/[0.01]">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold mb-12 text-center"
            >
              Learn More
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  title: "Market & Vision", 
                  desc: "$400T opportunity. How ILAL becomes the compliance standard.",
                  link: "/about",
                  icon: TrendingUp
                },
                { 
                  title: "Technology", 
                  desc: "Architecture deep dive, benchmarks, and security audits.",
                  link: "/technology",
                  icon: Lock
                },
                { 
                  title: "Integration Guide", 
                  desc: "How RWA protocols integrate ILAL in 8 weeks.",
                  link: "/integrations",
                  icon: CheckCircle2
                },
              ].map((card, i) => (
                <Link 
                  key={i}
                  href={card.link}
                  className="block border border-white/10 rounded-lg p-6 hover:border-[#2962FF]/50 hover:bg-white/[0.02] hover:-translate-y-2 transition-all group"
                >
                  <card.icon className="w-8 h-8 text-[#2962FF] mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all" />
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-[#2962FF] transition-colors">{card.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{card.desc}</p>
                  <div className="text-[#2962FF] text-sm flex items-center">
                    Read more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Enhanced */}
      <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-4">Ready to Build Compliant DeFi?</h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Join leading RWA protocols in enabling institutional access to DeFi liquidity.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="/integrations" 
                  className="btn-ripple px-8 py-3 bg-[#2962FF] text-white rounded font-medium hover:bg-[#2962FF]/90 hover:shadow-lg hover:shadow-[#2962FF]/20 hover:scale-105 transition-all"
                >
                  View Integration Guide
                </Link>
                <a 
                  href="https://github.com/rpnny/ILAL-mvp" 
                  className="px-8 py-3 border border-white/10 rounded font-medium hover:bg-white/5 hover:border-white/20 hover:scale-105 transition-all flex items-center group"
                >
                  <Github className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  View Source
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-4 md:mb-0 flex items-center space-x-3">
              <div className="w-5 h-5 bg-[#2962FF] rounded flex items-center justify-center">
                <span className="font-bold text-white text-xs">I</span>
              </div>
              <span>ILAL © 2026</span>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/technology" className="hover:text-white transition-colors">Technology</Link>
              <Link href="/roadmap" className="hover:text-white transition-colors">Roadmap</Link>
              <a href="https://github.com/rpnny/ILAL-mvp" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
