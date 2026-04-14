"use client";

import { CheckCircle2, FileText, Github, ExternalLink, Code, Zap, Users, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export default function IntegrationsPage() {
  return (
    <>
      {/* Background Orbs */}
      <div className="orb orb--1" />
      <div className="orb orb--2" />
      <div className="orb orb--3" />

      {/* Navigation */}
      <Nav />

      {/* Hero */}
      <section className="hero" style={{ minHeight: "auto", paddingBottom: "40px" }}>
        <div>
          <p className="section-eyebrow" style={{ textAlign: "center" }}>INTEGRATIONS</p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2.4rem, 6vw, 4rem)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 20px", color: "var(--text)", textAlign: "center" }}>
            Integration Guide
          </h1>
          <p className="hero-sub">
            How RWA protocols integrate ILAL in 8 weeks. Complete developer resources and step-by-step process.
          </p>
        </div>
      </section>

      {/* Use Case: Ondo Finance */}
      <section className="section">
        <p className="section-eyebrow">CASE STUDY</p>
        <h2 className="section-headline">Use Case: Ondo Finance</h2>

        <div className="glass" style={{ padding: "32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Challenge */}
            <div style={{ padding: "24px", background: "var(--surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", color: "var(--text)" }}>
                <span style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontWeight: 700 }}>!</span>
                The Challenge
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { title: "High Gas Costs", desc: "OUSG/USDY holders pay $50-100 per transaction on traditional DEXs" },
                  { title: "Manual KYC", desc: "Each user requires $2,000 compliance check + 48-72 hour delays" },
                  { title: "Limited Liquidity", desc: "Ondo tokens can't access Uniswap v4 liquidity without compliance layer" },
                  { title: "Privacy Concerns", desc: "Traditional solutions expose PII on-chain, creating regulatory risk" }
                ].map((item, i) => (
                  <div key={i} style={{ borderLeft: "2px solid rgba(239,68,68,0.4)", paddingLeft: "16px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", color: "var(--text)" }}>{item.title}</div>
                    <div style={{ fontSize: "13px", color: "var(--text2)", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solution */}
            <div style={{ padding: "24px", background: "rgba(59,130,246,0.05)", borderRadius: "16px", border: "1px solid rgba(59,130,246,0.15)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: "128px", height: "128px", background: "rgba(59,130,246,0.08)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", color: "var(--text)" }}>
                <span style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <CheckCircle2 style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
                </span>
                ILAL Solution
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", zIndex: 1 }}>
                {[
                  { title: "99.4% Lower Costs", desc: "$0.37/month vs $2,000/month through session caching" },
                  { title: "Instant Trading", desc: "One-time verification, then unlimited 24h trading window" },
                  { title: "Native UX", desc: "OUSG/USDY swaps like any other token on Uniswap v4" },
                  { title: "Full Compliance", desc: "ZK-proofs maintain privacy while ensuring regulatory adherence" }
                ].map((item, i) => (
                  <div key={i} style={{ borderLeft: "2px solid rgba(59,130,246,0.4)", paddingLeft: "16px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", color: "var(--accent)" }}>{item.title}</div>
                    <div style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ marginTop: "32px", paddingTop: "32px", borderTop: "1px solid var(--border)" }}>
            <p className="pixel-label" style={{ marginBottom: "20px" }}>PROJECTED IMPACT</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
              {[
                { metric: "Cost Savings", value: "$1,979/mo", desc: "Per active user" },
                { metric: "Time Saved", value: "99%", desc: "Transaction speed" },
                { metric: "TVL Increase", value: "5-10x", desc: "Access to DeFi liquidity" },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 700, color: "var(--accent)", marginBottom: "4px" }}>{item.value}</div>
                  <div style={{ fontSize: "14px", color: "var(--text)", marginBottom: "4px", fontWeight: 500 }}>{item.metric}</div>
                  <div style={{ fontSize: "13px", color: "var(--text2)" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integration Process */}
      <section className="section">
        <p className="section-eyebrow">TIMELINE</p>
        <h2 className="section-headline">Integration Process (8 Weeks)</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
            <div
              key={i}
              className="glass"
              style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <phase.icon style={{ width: "24px", height: "24px", color: "var(--accent)" }} />
                  </div>
                  <div>
                    <span className="pixel-label" style={{ color: "var(--accent)", marginBottom: "4px", display: "block" }}>{phase.phase}</span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{phase.title}</h3>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text2)", background: "var(--surface)", padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>{phase.duration}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <p className="pixel-label" style={{ marginBottom: "12px" }}>TASKS</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {phase.tasks.map((task, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "flex-start", fontSize: "13px", color: "var(--text2)", lineHeight: 1.5 }}>
                        <CheckCircle2 style={{ width: "14px", height: "14px", marginRight: "8px", marginTop: "2px", flexShrink: 0, color: "var(--accent)" }} />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="pixel-label" style={{ marginBottom: "12px" }}>DELIVERABLES</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {phase.deliverables.map((deliverable, j) => (
                      <span key={j} style={{ fontSize: "12px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)", padding: "6px 14px", borderRadius: "8px" }}>
                        {deliverable}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Requirements */}
      <section className="section">
        <p className="section-eyebrow">REQUIREMENTS</p>
        <h2 className="section-headline">Technical Stack</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {[
            {
              icon: Code, title: "Smart Contract Stack",
              deps: [
                { name: "Solidity", version: "^0.8.26" },
                { name: "Foundry", version: "Latest" },
                { name: "Uniswap v4 Core", version: "v4.0.0" },
                { name: "OpenZeppelin", version: "^5.0.0" },
                { name: "EAS SDK", version: "^2.0.0" }
              ]
            },
            {
              icon: Zap, title: "Frontend Stack",
              deps: [
                { name: "Next.js", version: "14+" },
                { name: "React", version: "^18.0.0" },
                { name: "Wagmi", version: "^2.0.0" },
                { name: "Viem", version: "^2.0.0" },
                { name: "RainbowKit", version: "^2.0.0" }
              ]
            }
          ].map((stack, i) => (
            <div key={i} className="glass" style={{ padding: "28px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", color: "var(--text)" }}>
                <span style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <stack.icon style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                </span>
                {stack.title}
              </h3>
              <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "8px", border: "1px solid var(--border)" }}>
                {stack.deps.map((dep, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", padding: "10px 14px", borderRadius: "8px", transition: "background 0.2s" }}>
                    <span style={{ color: "var(--text2)" }}>{dep.name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent)" }}>{dep.version}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Developer Resources */}
      <section className="section">
        <p className="section-eyebrow">RESOURCES</p>
        <h2 className="section-headline">Developer Resources</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "48px" }}>
          <a
            href="https://github.com/rpnny/ILAL-mvp"
            target="_blank"
            rel="noopener noreferrer"
            className="glass"
            style={{ padding: "32px", display: "flex", alignItems: "flex-start", gap: "20px", textDecoration: "none", color: "inherit" }}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Github style={{ width: "28px", height: "28px", color: "var(--text)" }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>GitHub Repository</h3>
              <p style={{ fontSize: "13px", color: "var(--text2)", lineHeight: 1.6, marginBottom: "16px" }}>
                Source code, smart contracts, frontend, and integration examples.
              </p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500, color: "var(--accent)" }}>
                View Repository <ExternalLink style={{ width: "14px", height: "14px" }} />
              </span>
            </div>
          </a>

          <a
            href="https://github.com/rpnny/ILAL-mvp/blob/main/docs/outreach/ILAL_EXECUTIVE_BRIEF.md"
            target="_blank"
            rel="noopener noreferrer"
            className="glass"
            style={{ padding: "32px", display: "flex", alignItems: "flex-start", gap: "20px", textDecoration: "none", color: "inherit" }}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText style={{ width: "28px", height: "28px", color: "var(--text)" }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>Documentation</h3>
              <p style={{ fontSize: "13px", color: "var(--text2)", lineHeight: 1.6, marginBottom: "16px" }}>
                Architecture guides, API references, and deployment instructions.
              </p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500, color: "var(--accent)" }}>
                Read Docs <ExternalLink style={{ width: "14px", height: "14px" }} />
              </span>
            </div>
          </a>
        </div>

        {/* CTA */}
        <div className="glass" style={{ padding: "48px", textAlign: "center", maxWidth: "700px", margin: "0 auto" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 400, color: "var(--text)", marginBottom: "16px" }}>Ready to Integrate?</h3>
          <p style={{ fontSize: "15px", color: "var(--text2)", marginBottom: "32px", lineHeight: 1.6 }}>
            Transform your protocol's compliance posture in just 8 weeks.
          </p>
          <a href="mailto:contact@ilal.tech" className="btn-primary">
            Contact Integration Team
            <ArrowRight style={{ width: "16px", height: "16px" }} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
