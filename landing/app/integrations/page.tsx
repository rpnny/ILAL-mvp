"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileText, Github, ExternalLink, Code, Zap, Users, Calendar } from "lucide-react";
import Link from "next/link";

export default function IntegrationsPage() {
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
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
            <Link href="/technology" className="text-gray-400 hover:text-white transition-colors">Technology</Link>
            <Link href="/integrations" className="text-white font-medium">Integrations</Link>
            <Link href="/roadmap" className="text-gray-400 hover:text-white transition-colors">Roadmap</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Integration Guide</h1>
            <p className="text-xl text-gray-400 mb-16">
              How RWA protocols integrate ILAL in 8 weeks. Complete developer resources and step-by-step process.
            </p>

            {/* Use Case: Ondo Finance */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Use Case: Ondo Finance</h2>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.01, boxShadow: "0 0 40px rgba(41, 98, 255, 0.1)" }}
                className="border border-white/10 rounded-lg p-8 bg-white/[0.02] hover:border-[#2962FF]/30 transition-all"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Challenge */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                        <span className="text-red-400">!</span>
                      </div>
                      The Challenge
                    </h3>
                    <div className="space-y-4">
                      {[
                        {
                          title: "High Gas Costs",
                          desc: "OUSG/USDY holders pay $50-100 per transaction on traditional DEXs"
                        },
                        {
                          title: "Manual KYC",
                          desc: "Each user requires $2,000 compliance check + 48-72 hour delays"
                        },
                        {
                          title: "Limited Liquidity",
                          desc: "Ondo tokens can't access Uniswap v4 liquidity without compliance layer"
                        },
                        {
                          title: "Privacy Concerns",
                          desc: "Traditional solutions expose PII on-chain, regulatory risk"
                        }
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                          className="border-l-4 border-red-500/30 pl-4"
                        >
                          <div className="text-sm font-semibold mb-1">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.desc}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Solution */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                      ILAL Solution
                    </h3>
                    <div className="space-y-4">
                      {[
                        {
                          title: "99.4% Lower Costs",
                          desc: "$0.37/month vs $2,000/month through session caching"
                        },
                        {
                          title: "Instant Trading",
                          desc: "One-time verification, then unlimited 24h trading window"
                        },
                        {
                          title: "Native UX",
                          desc: "OUSG/USDY swaps like any other token on Uniswap v4"
                        },
                        {
                          title: "Full Compliance",
                          desc: "ZK-proofs maintain privacy while ensuring regulatory adherence"
                        }
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                          className="border-l-4 border-green-500/30 pl-4"
                        >
                          <div className="text-sm font-semibold mb-1">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.desc}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="text-sm font-semibold mb-4 text-gray-400">PROJECTED IMPACT</h4>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { metric: "Cost Savings", value: "$1,979/mo", desc: "Per active user" },
                      { metric: "Time Saved", value: "99%", desc: "Transaction speed" },
                      { metric: "TVL Increase", value: "5-10x", desc: "Access to DeFi liquidity" },
                    ].map((item, i) => (
                      <div key={i} className="text-center">
                        <div className="text-2xl font-bold text-[#2962FF] mb-1">{item.value}</div>
                        <div className="text-xs text-gray-500 mb-1">{item.metric}</div>
                        <div className="text-xs text-gray-600">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Integration Process */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Integration Process (8 Weeks)</h2>
              
              <div className="space-y-6">
                {[
                  {
                    phase: "Phase 1",
                    duration: "Week 1-2",
                    title: "Discovery & Planning",
                    icon: Users,
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
                    phase: "Phase 2",
                    duration: "Week 3-4",
                    title: "Smart Contract Integration",
                    icon: Code,
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
                    phase: "Phase 3",
                    duration: "Week 5-6",
                    title: "Frontend & UX Integration",
                    icon: Zap,
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
                    phase: "Phase 4",
                    duration: "Week 7-8",
                    title: "Testing & Launch",
                    icon: Calendar,
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
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ x: 5 }}
                    className="border border-white/10 rounded-lg p-6 bg-white/[0.02] hover:border-[#2962FF]/30 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-[#2962FF]/20 flex items-center justify-center">
                          <phase.icon className="w-6 h-6 text-[#2962FF]" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{phase.phase}</div>
                          <h3 className="text-lg font-bold">{phase.title}</h3>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 bg-white/[0.02] px-3 py-1 rounded">{phase.duration}</div>
                    </div>

                    <div className="ml-16">
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-gray-400 mb-2">Tasks</div>
                        <ul className="space-y-2">
                          {phase.tasks.map((task, j) => (
                            <li key={j} className="flex items-start text-sm text-gray-500">
                              <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-400 mb-2">Deliverables</div>
                        <div className="flex flex-wrap gap-2">
                          {phase.deliverables.map((deliverable, j) => (
                            <div key={j} className="text-xs bg-[#2962FF]/10 text-[#2962FF] px-3 py-1 rounded">
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
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Technical Requirements</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Smart Contracts */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                >
                  <h3 className="font-semibold mb-4 flex items-center">
                    <Code className="w-5 h-5 mr-2 text-[#2962FF]" />
                    Smart Contract Stack
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: "Solidity", version: "^0.8.26" },
                      { name: "Foundry", version: "Latest" },
                      { name: "Uniswap v4 Core", version: "v4.0.0" },
                      { name: "OpenZeppelin", version: "^5.0.0" },
                      { name: "EAS SDK", version: "^2.0.0" },
                    ].map((dep, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{dep.name}</span>
                        <span className="font-mono text-xs text-gray-600">{dep.version}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Frontend */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                >
                  <h3 className="font-semibold mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-[#2962FF]" />
                    Frontend Stack
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: "Next.js", version: "14+" },
                      { name: "React", version: "^18.0.0" },
                      { name: "Wagmi", version: "^2.0.0" },
                      { name: "Viem", version: "^2.0.0" },
                      { name: "RainbowKit", version: "^2.0.0" },
                    ].map((dep, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{dep.name}</span>
                        <span className="font-mono text-xs text-gray-600">{dep.version}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Infrastructure */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-6 border border-white/10 rounded-lg p-6 bg-white/[0.02]"
              >
                <h3 className="font-semibold mb-4">Infrastructure & Services</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      category: "Network",
                      items: ["Base Sepolia (testnet)", "Base Mainnet (production)", "RPC provider (Alchemy/Infura)"]
                    },
                    {
                      category: "KYC Providers",
                      items: ["Coinbase Verifications", "Circle Verite (optional)", "Polygon ID (optional)"]
                    },
                    {
                      category: "Monitoring",
                      items: ["The Graph (indexing)", "Tenderly (debugging)", "Sentry (error tracking)"]
                    },
                  ].map((cat, i) => (
                    <div key={i}>
                      <div className="text-sm font-semibold mb-3 text-gray-400">{cat.category}</div>
                      <ul className="space-y-2">
                        {cat.items.map((item, j) => (
                          <li key={j} className="flex items-start text-xs text-gray-500">
                            <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* Developer Resources */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Developer Resources</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <motion.a 
                  href="https://github.com/rpnny/ILAL-mvp"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="border border-white/10 rounded-lg p-6 hover:border-[#2962FF]/50 hover:bg-white/[0.04] transition-all bg-white/[0.02] group block"
                >
                  <Github className="w-8 h-8 text-[#2962FF] mb-4 group-hover:rotate-12 transition-transform" />
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-[#2962FF] transition-colors">GitHub Repository</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Complete source code, smart contracts, frontend, and integration examples
                  </p>
                  <div className="flex items-center text-[#2962FF] text-sm">
                    View Repository <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </motion.a>

                <motion.a 
                  href="https://github.com/rpnny/ILAL-mvp/blob/main/docs/outreach/ILAL_EXECUTIVE_BRIEF.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="border border-white/10 rounded-lg p-6 hover:border-[#2962FF]/50 hover:bg-white/[0.04] transition-all bg-white/[0.02] group block"
                >
                  <FileText className="w-8 h-8 text-[#2962FF] mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-[#2962FF] transition-colors">Technical Documentation</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Architecture guides, API references, deployment instructions, and best practices
                  </p>
                  <div className="flex items-center text-[#2962FF] text-sm">
                    Read Docs <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </motion.a>
              </div>

              {/* Additional Resources */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-6 border border-white/10 rounded-lg p-6 bg-white/[0.02]"
              >
                <h3 className="font-semibold mb-4">Additional Resources</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: "Architecture Guide", link: "/docs/ARCHITECTURE.md" },
                    { title: "Test Report", link: "/docs/TEST_REPORT.md" },
                    { title: "Deployment Guide", link: "/docs/DEPLOYMENT.md" },
                    { title: "Security Audit", link: "/docs/AUDIT_REPORT.md" },
                  ].map((resource, i) => (
                    <a
                      key={i}
                      href={`https://github.com/rpnny/ILAL-mvp/blob/main${resource.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors p-3 rounded hover:bg-white/[0.02]"
                    >
                      <span>{resource.title}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* Support */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Integration Support</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Technical Support",
                    desc: "Direct access to core engineering team",
                    features: ["Slack/Discord channel", "Weekly sync calls", "Code review assistance"]
                  },
                  {
                    title: "Custom Development",
                    desc: "Tailored solutions for your protocol",
                    features: ["Custom Hook logic", "Multi-chain deployment", "Advanced compliance rules"]
                  },
                  {
                    title: "Training & Onboarding",
                    desc: "Comprehensive team enablement",
                    features: ["Technical workshops", "Documentation review", "Hands-on integration sessions"]
                  },
                ].map((service, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="border border-white/10 rounded-lg p-6 bg-white/[0.02] hover:border-[#2962FF]/30 transition-all"
                  >
                    <h3 className="font-semibold mb-2">{service.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{service.desc}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature, j) => (
                        <li key={j} className="flex items-start text-xs text-gray-400">
                          <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border-t border-white/5 pt-12 text-center"
            >
              <h3 className="text-2xl font-bold mb-4">Ready to Integrate?</h3>
              <p className="text-gray-400 mb-6">
                Contact our technical team to discuss your specific requirements and timeline.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a 
                  href="mailto:contact@ilal.tech?subject=Integration Inquiry" 
                  className="btn-ripple px-8 py-3 bg-[#2962FF] text-white rounded font-medium hover:bg-[#2962FF]/90 hover:shadow-lg hover:shadow-[#2962FF]/20 hover:scale-105 transition-all"
                >
                  Contact Integration Team
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
