"use client";

import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Zap, Globe, Shield, Users, DollarSign, Target } from "lucide-react";
import Link from "next/link";

export default function RoadmapPage() {
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
            <Link href="/integrations" className="text-gray-400 hover:text-white transition-colors">Integrations</Link>
            <Link href="/roadmap" className="text-white font-medium">Roadmap</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Business Model & Roadmap</h1>
            <p className="text-xl text-gray-400 mb-16">
              Path to becoming the compliance standard for institutional DeFi. Revenue model, growth projections, and development timeline.
            </p>

            {/* Revenue Model */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Revenue Model</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {[
                  { 
                    icon: DollarSign,
                    stream: "Protocol Fees", 
                    amount: "0.05-0.1%", 
                    desc: "Per-transaction fee on compliant swaps and liquidity operations",
                    example: "$100k swap = $50-100 fee"
                  },
                  { 
                    icon: Users,
                    stream: "Session Fees", 
                    amount: "$1-5/mo", 
                    desc: "Monthly subscription for active users maintaining sessions",
                    example: "10k users = $10-50k MRR"
                  },
                  { 
                    icon: Target,
                    stream: "Enterprise", 
                    amount: "Custom", 
                    desc: "White-label solutions, dedicated support, and custom compliance rules",
                    example: "Starting at $25k/year"
                  },
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="border border-white/10 rounded-lg p-6 bg-white/[0.02] hover:border-[#2962FF]/30 hover:bg-white/[0.04] transition-all cursor-default"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-[#2962FF]/20 flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-[#2962FF]" />
                      </div>
                      <div className="text-2xl font-bold">{item.amount}</div>
                    </div>
                    <div className="text-sm text-gray-400 font-semibold mb-2">{item.stream}</div>
                    <p className="text-xs text-gray-500 mb-3">{item.desc}</p>
                    <div className="text-xs text-gray-600 bg-white/[0.02] px-3 py-2 rounded">
                      Example: {item.example}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Unit Economics */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-white/10 rounded-lg p-8 bg-white/[0.02]"
              >
                <h3 className="text-xl font-semibold mb-6">Projected Unit Economics (Year 3)</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Assumptions */}
                  <div>
                    <div className="text-sm font-semibold text-gray-400 mb-4">Growth Assumptions</div>
                    <div className="space-y-3">
                      {[
                        { label: "Monthly Active Users", value: "50,000", growth: "+20% MoM" },
                        { label: "Avg. Swaps per User", value: "15/month", growth: "Stable" },
                        { label: "Avg. Swap Size", value: "$5,000", growth: "+10% YoY" },
                        { label: "Total Monthly Volume", value: "$3.75B", growth: "Derived" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{item.label}</span>
                          <div className="text-right">
                            <div className="font-mono text-white">{item.value}</div>
                            <div className="text-xs text-gray-600">{item.growth}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue Breakdown */}
                  <div>
                    <div className="text-sm font-semibold text-gray-400 mb-4">Monthly Revenue Breakdown</div>
                    <div className="space-y-3">
                      {[
                        { source: "Protocol Fees (0.05%)", value: "$1,875,000", pct: "66%" },
                        { source: "Session Fees ($3/mo avg)", value: "$150,000", pct: "5%" },
                        { source: "Enterprise (10 clients)", value: "$833,333", pct: "29%" },
                      ].map((item, i) => (
                        <div key={i} className="border-l-4 border-[#2962FF]/30 pl-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">{item.source}</span>
                            <span className="text-xs text-gray-600">{item.pct}</span>
                          </div>
                          <div className="font-mono text-white font-semibold">{item.value}</div>
                        </div>
                      ))}
                      <div className="border-t border-white/10 pt-3 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">Total Monthly Revenue</span>
                          <span className="font-mono text-2xl text-green-400 font-bold">$2.86M</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-white">Annualized Run Rate (ARR)</span>
                          <span className="font-mono text-xl text-green-400 font-bold">$34.3M</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Customer LTV</div>
                      <div className="text-2xl font-bold text-[#2962FF]">$1,850</div>
                      <div className="text-xs text-gray-600">24-month avg</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Gross Margin</div>
                      <div className="text-2xl font-bold text-[#2962FF]">92%</div>
                      <div className="text-xs text-gray-600">Infrastructure costs</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Payback Period</div>
                      <div className="text-2xl font-bold text-[#2962FF]">3 months</div>
                      <div className="text-xs text-gray-600">CAC recovery</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Development Roadmap */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Development Roadmap</h2>
              
              <div className="space-y-4">
                {[
                  { 
                    quarter: "Q2 2026", 
                    title: "Foundation & Audit",
                    icon: Shield,
                    items: [
                      "Trail of Bits external security audit ($25-30k)",
                      "Uniswap Foundation grant application",
                      "Documentation finalization and developer portal",
                      "Testnet performance optimization",
                      "Community bug bounty program launch ($10k pool)"
                    ],
                    status: "in-progress",
                    completion: "75%"
                  },
                  { 
                    quarter: "Q4 2026", 
                    title: "Mainnet Launch & Growth",
                    icon: Zap,
                    items: [
                      "Base mainnet deployment with 3/5 multisig governance",
                      "First 3-5 RWA protocol integrations (Ondo, Backed, Maple targets)",
                      "Institutional pilot program (100 verified users)",
                      "Real PLONK verifier integration (replace mock)",
                      "Launch monitoring dashboard and alerting system"
                    ],
                    status: "planned",
                    completion: "0%"
                  },
                  { 
                    quarter: "Q1 2027", 
                    title: "Scale & Multi-Chain",
                    icon: Globe,
                    items: [
                      "Multi-chain expansion (Optimism mainnet, Arbitrum)",
                      "Multiple KYC provider integration (Circle Verite, Polygon ID)",
                      "Advanced compliance rules engine (country blocklists, AML)",
                      "DAO governance transition (token launch considerations)",
                      "Enterprise tier launch with SLA guarantees"
                    ],
                    status: "future",
                    completion: "0%"
                  },
                  { 
                    quarter: "Q3 2027", 
                    title: "Ecosystem Maturity",
                    icon: TrendingUp,
                    items: [
                      "Cross-chain session synchronization (unified identity)",
                      "Layer 2 ZK Rollup integration for gas optimization",
                      "Institutional custody integration (Fireblocks, Copper)",
                      "Regulatory compliance dashboard for institutions",
                      "50,000 MAU milestone, $1B+ monthly volume"
                    ],
                    status: "future",
                    completion: "0%"
                  },
                ].map((phase, i) => {
                  const statusConfig = {
                    "in-progress": { 
                      border: "border-green-500/30", 
                      bg: "bg-green-500/5", 
                      badge: "bg-green-500 text-white",
                      badgeText: "In Progress"
                    },
                    "planned": {
                      border: "border-[#2962FF]/30",
                      bg: "bg-[#2962FF]/5",
                      badge: "bg-[#2962FF] text-white",
                      badgeText: "Planned"
                    },
                    "future": {
                      border: "border-white/10",
                      bg: "bg-white/[0.02]",
                      badge: "bg-white/10 text-gray-400",
                      badgeText: "Future"
                    }
                  };
                  const config = statusConfig[phase.status];

                  return (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ x: 5 }}
                      className={`border rounded-lg p-6 transition-all ${config.border} ${config.bg} hover:shadow-lg`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            phase.status === 'in-progress' ? 'bg-green-500/20' : 
                            phase.status === 'planned' ? 'bg-[#2962FF]/20' : 'bg-white/10'
                          }`}>
                            <phase.icon className={`w-6 h-6 ${
                              phase.status === 'in-progress' ? 'text-green-400' :
                              phase.status === 'planned' ? 'text-[#2962FF]' : 'text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{phase.quarter}</div>
                            <h3 className="text-lg font-semibold">{phase.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {phase.status === 'in-progress' && (
                            <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">Progress</div>
                              <div className="text-sm font-bold text-green-400">{phase.completion}</div>
                            </div>
                          )}
                          <div className={`text-xs px-3 py-1 rounded font-medium ${config.badge}`}>
                            {config.badgeText}
                          </div>
                        </div>
                      </div>
                      <ul className="space-y-2 ml-16">
                        {phase.items.map((item, j) => (
                          <li key={j} className="flex items-start text-sm text-gray-400">
                            <CheckCircle2 className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${
                              phase.status === 'in-progress' ? 'text-green-400' : 
                              phase.status === 'planned' ? 'text-[#2962FF]' : 'text-gray-600'
                            }`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* Market Traction Goals */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Growth Milestones</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    period: "Q4 2026 (Launch)",
                    metrics: [
                      { label: "Protocol Integrations", value: "3-5", target: "Ondo, Backed, Maple" },
                      { label: "Monthly Active Users", value: "500", target: "Pilot phase" },
                      { label: "Monthly Volume", value: "$50M", target: "Initial traction" },
                      { label: "MRR", value: "$30k", target: "Covering ops costs" },
                    ]
                  },
                  {
                    period: "Q4 2027 (Year 1)",
                    metrics: [
                      { label: "Protocol Integrations", value: "15+", target: "Market expansion" },
                      { label: "Monthly Active Users", value: "10,000", target: "Product-market fit" },
                      { label: "Monthly Volume", value: "$750M", target: "15x growth" },
                      { label: "ARR", value: "$4.5M", target: "Series A readiness" },
                    ]
                  },
                ].map((milestone, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="border border-white/10 rounded-lg p-6 bg-white/[0.02]"
                  >
                    <h3 className="font-semibold mb-4 text-lg">{milestone.period}</h3>
                    <div className="space-y-4">
                      {milestone.metrics.map((metric, j) => (
                        <div key={j} className="border-l-4 border-[#2962FF]/30 pl-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">{metric.label}</span>
                            <span className="font-mono text-xl font-bold text-white">{metric.value}</span>
                          </div>
                          <div className="text-xs text-gray-600">{metric.target}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Investment & Partnership */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold mb-8">Strategic Priorities</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Protocol Partnerships",
                    icon: Users,
                    desc: "Integrate with leading RWA protocols",
                    priorities: [
                      "Ondo Finance (OUSG, USDY)",
                      "Backed Finance (bIB01, bCSPX)",
                      "Maple Finance (institutional lending)",
                      "OpenEden (T-Bill tokens)",
                    ]
                  },
                  {
                    title: "Infrastructure Partners",
                    icon: Shield,
                    desc: "Build ecosystem of compliance providers",
                    priorities: [
                      "Coinbase (primary KYC)",
                      "Circle (Verite integration)",
                      "Polygon ID (decentralized identity)",
                      "Uniswap Labs (v4 support)",
                    ]
                  },
                  {
                    title: "Funding Strategy",
                    icon: TrendingUp,
                    desc: "Capital to accelerate growth",
                    priorities: [
                      "Uniswap Grants ($50-100k)",
                      "Seed Round Q4 2026 ($2-3M)",
                      "Strategic investors (Base, Coinbase)",
                      "Revenue-driven post-launch",
                    ]
                  },
                ].map((priority, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="border border-white/10 rounded-lg p-6 bg-white/[0.02] hover:border-[#2962FF]/30 transition-all"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#2962FF]/20 flex items-center justify-center">
                        <priority.icon className="w-5 h-5 text-[#2962FF]" />
                      </div>
                      <h3 className="font-semibold">{priority.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{priority.desc}</p>
                    <ul className="space-y-2">
                      {priority.priorities.map((item, j) => (
                        <li key={j} className="flex items-start text-xs text-gray-400">
                          <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-[#2962FF]" />
                          {item}
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
              <p className="text-gray-400 mb-6">
                Interested in partnering, investing, or integrating?
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link 
                  href="/integrations" 
                  className="btn-ripple px-6 py-3 bg-[#2962FF] text-white rounded font-medium hover:bg-[#2962FF]/90 hover:shadow-lg hover:shadow-[#2962FF]/20 hover:scale-105 transition-all"
                >
                  View Integration Guide
                </Link>
                <a 
                  href="mailto:contact@ilal.tech?subject=Partnership Inquiry" 
                  className="px-6 py-3 border border-white/10 rounded font-medium hover:bg-white/5 hover:border-white/20 hover:scale-105 transition-all"
                >
                  Contact Team
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
