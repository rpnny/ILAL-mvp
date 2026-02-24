"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileText, Github, ExternalLink, Code, Zap, Users, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export default function IntegrationsPage() {
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
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Integration Guide</h1>
            <p className="text-xl text-gray-400 mb-16 font-light">
              How RWA protocols integrate ILAL in 8 weeks. Complete developer resources and step-by-step process.
            </p>

            {/* Use Case: Ondo Finance */}
            <section className="mb-24">
              <h2 className="font-heading text-3xl font-bold mb-8">Use Case: Ondo Finance</h2>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.01, boxShadow: "0 0 30px rgba(0, 240, 255, 0.1)" }}
                className="glass-card p-8 group transition-all"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Challenge */}
                  <div className="p-6 bg-black/40 rounded-xl border border-white/5">
                    <h3 className="text-xl font-bold mb-6 flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mr-3 border border-red-500/20">
                        <span className="text-red-400 font-bold">!</span>
                      </div>
                      The Challenge
                    </h3>
                    <div className="space-y-5">
                      {[
                        { title: "High Gas Costs", desc: "OUSG/USDY holders pay $50-100 per transaction on traditional DEXs" },
                        { title: "Manual KYC", desc: "Each user requires $2,000 compliance check + 48-72 hour delays" },
                        { title: "Limited Liquidity", desc: "Ondo tokens can't access Uniswap v4 liquidity without compliance layer" },
                        { title: "Privacy Concerns", desc: "Traditional solutions expose PII on-chain, creating regulatory risk" }
                      ].map((item, i) => (
                        <div key={i} className="border-l-2 border-red-500/50 pl-4">
                          <div className="text-sm font-semibold mb-1 text-gray-200">{item.title}</div>
                          <div className="text-xs text-gray-400 leading-relaxed font-light">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Solution */}
                  <div className="p-6 bg-primary/5 rounded-xl border border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />
                    <h3 className="text-xl font-bold mb-6 flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 border border-primary/20">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      </div>
                      ILAL Solution
                    </h3>
                    <div className="space-y-5 relative z-10">
                      {[
                        { title: "99.4% Lower Costs", desc: "$0.37/month vs $2,000/month through session caching" },
                        { title: "Instant Trading", desc: "One-time verification, then unlimited 24h trading window" },
                        { title: "Native UX", desc: "OUSG/USDY swaps like any other token on Uniswap v4" },
                        { title: "Full Compliance", desc: "ZK-proofs maintain privacy while ensuring regulatory adherence" }
                      ].map((item, i) => (
                        <div key={i} className="border-l-2 border-primary/50 pl-4">
                          <div className="text-sm font-semibold mb-1 text-primary">{item.title}</div>
                          <div className="text-xs text-gray-300 leading-relaxed font-light">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="mt-8 pt-8 border-t border-white/5">
                  <h4 className="text-xs font-semibold mb-6 text-gray-500 tracking-widest uppercase">Projected Impact</h4>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { metric: "Cost Savings", value: "$1,979/mo", desc: "Per active user" },
                      { metric: "Time Saved", value: "99%", desc: "Transaction speed" },
                      { metric: "TVL Increase", value: "5-10x", desc: "Access to DeFi liquidity" },
                    ].map((item, i) => (
                      <div key={i} className="text-center group">
                        <div className="text-3xl font-heading font-bold text-primary mb-1 group-hover:scale-105 transition-transform">{item.value}</div>
                        <div className="text-[13px] text-gray-300 mb-1 font-medium">{item.metric}</div>
                        <div className="text-xs text-secondary font-light">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Integration Process */}
            <section className="mb-24">
              <h2 className="font-heading text-3xl font-bold mb-8">Integration Process (8 Weeks)</h2>

              <div className="space-y-6">
                {[
                  {
                    phase: "Phase 1", duration: "Week 1-2",
                    title: "Discovery & Planning", icon: Users,
                    tasks: [
                      "Technical kickoff meeting with ILAL team",
                      "Review protocol requirements and compliance needs",
                      "Identify KYC providers (Coinbase, Circle, Polygon ID)",
                      "Define pool parameters and token pairs",
                      "Set up testnet environment (Base Sepolia)"
                    ],
                    deliverables: ["Integration plan document", "Technical specifications", "Timeline agreement"]
                  },
                  {
                    phase: "Phase 2", duration: "Week 3-4",
                    title: "Smart Contract Integration", icon: Code,
                    tasks: [
                      "Deploy Registry and SessionManager proxies",
                      "Configure ComplianceHook for your pools",
                      "Register your protocol as trusted Issuer",
                      "Integrate Uniswap v4 PoolManager with Hook",
                      "Write unit tests for contract integration"
                    ],
                    deliverables: ["Testnet deployment", "Contract test suite (>90% coverage)", "Gas optimization report"]
                  },
                  {
                    phase: "Phase 3", duration: "Week 5-6",
                    title: "Frontend & UX Integration", icon: Zap,
                    tasks: [
                      "Integrate ILAL SDK (@ilal/sdk) into your dApp",
                      "Implement wallet connection flow (RainbowKit)",
                      "Add ZK proof generation (Web Worker)",
                      "Build session management UI",
                      "Implement swap/liquidity interfaces"
                    ],
                    deliverables: ["Working frontend demo", "User flow documentation", "Performance benchmarks"]
                  },
                  {
                    phase: "Phase 4", duration: "Week 7-8",
                    title: "Testing & Launch", icon: Calendar,
                    tasks: [
                      "End-to-end testing on Base Sepolia",
                      "Security audit review (if required)",
                      "User acceptance testing with pilot group",
                      "Mainnet deployment preparation",
                      "Go-live coordination and monitoring setup"
                    ],
                    deliverables: ["Launch checklist completion", "Monitoring dashboard", "Incident response plan"]
                  },
                ].map((phase, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ x: 5 }}
                    className="glass-card p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden"
                  >
                    <div className="md:w-1/3 border-r border-white/5 pr-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <phase.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">{phase.phase}</div>
                          <h3 className="text-lg font-bold leading-tight">{phase.title}</h3>
                        </div>
                      </div>
                      <div className="inline-block text-xs text-secondary bg-secondary/10 px-3 py-1 rounded border border-secondary/20">{phase.duration}</div>
                    </div>

                    <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-500 mb-3">Tasks</div>
                        <ul className="space-y-2">
                          {phase.tasks.map((task, j) => (
                            <li key={j} className="flex items-start text-[13px] text-gray-400 font-light">
                              <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-primary" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-500 mb-3">Deliverables</div>
                        <div className="flex flex-wrap gap-2">
                          {phase.deliverables.map((deliverable, j) => (
                            <div key={j} className="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-3 py-1.5 rounded-md backdrop-blur-md">
                              {deliverable}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Technical Requirements */}
            <section className="mb-24">
              <h2 className="font-heading text-3xl font-bold mb-8">Technical Stack Requirements</h2>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: Code, title: "Smart Contract Stack", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20",
                    deps: [
                      { name: "Solidity", version: "^0.8.26" },
                      { name: "Foundry", version: "Latest" },
                      { name: "Uniswap v4 Core", version: "v4.0.0" },
                      { name: "OpenZeppelin", version: "^5.0.0" },
                      { name: "EAS SDK", version: "^2.0.0" }
                    ]
                  },
                  {
                    icon: Zap, title: "Frontend Stack", color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20",
                    deps: [
                      { name: "Next.js", version: "14+" },
                      { name: "React", version: "^18.0.0" },
                      { name: "Wagmi", version: "^2.0.0" },
                      { name: "Viem", version: "^2.0.0" },
                      { name: "RainbowKit", version: "^2.0.0" }
                    ]
                  }
                ].map((stack, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6"
                  >
                    <h3 className="font-semibold mb-6 flex items-center text-lg">
                      <div className={`w-8 h-8 rounded border ${stack.bg} ${stack.border} flex items-center justify-center mr-3`}>
                        <stack.icon className={`w-4 h-4 ${stack.color}`} />
                      </div>
                      {stack.title}
                    </h3>
                    <div className="space-y-1 bg-black/40 rounded-lg p-2 border border-white/5">
                      {stack.deps.map((dep, j) => (
                        <div key={j} className="flex items-center justify-between text-[13px] p-2 hover:bg-white/5 rounded transition-colors">
                          <span className="text-gray-400">{dep.name}</span>
                          <span className={`font-mono text-xs ${stack.color}`}>{dep.version}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Developer Resources & CTA */}
            <section>
              <h2 className="font-heading text-3xl font-bold mb-8">Developer Resources</h2>

              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <motion.a
                  href="https://github.com/rpnny/ILAL-mvp"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="glass-card p-8 group block text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4"
                >
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Github className="w-8 h-8 text-white group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">GitHub Repository</h3>
                    <p className="text-sm text-gray-500 mb-4 font-light">
                      Source code, smart contracts, frontend, and integration examples.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start text-primary text-sm font-medium">
                      View Repository <ExternalLink className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </div>
                </motion.a>

                <motion.a
                  href="https://github.com/rpnny/ILAL-mvp/blob/main/docs/outreach/ILAL_EXECUTIVE_BRIEF.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-8 group block text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4"
                >
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8 text-white group-hover:text-secondary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-secondary transition-colors">Documentation</h3>
                    <p className="text-sm text-gray-500 mb-4 font-light">
                      Architecture guides, API references, and deployment instructions.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start text-secondary text-sm font-medium">
                      Read Docs <ExternalLink className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </div>
                </motion.a>
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 text-center"
              >
                <div className="inline-block p-1 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 p-8 glass-card w-full max-w-3xl mx-auto border-t-primary/50 border-b-secondary/50">
                  <h3 className="text-2xl font-bold mb-4 font-heading">Ready to Integrate?</h3>
                  <p className="text-gray-400 mb-8 font-light">
                    Transform your protocol's compliance posture in just 8 weeks.
                  </p>
                  <div className="flex justify-center flex-wrap gap-4">
                    <a href="mailto:contact@ilal.tech" className="glass-button glass-button-primary px-8 py-3.5 flex items-center">
                      Contact Integration Team <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
