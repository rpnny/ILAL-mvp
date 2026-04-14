"use client";

import { useEffect } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { CheckCircle2, TrendingUp, Zap, Globe, Shield, Users, DollarSign, Target } from "lucide-react";

/* ─────────────── DATA ─────────────── */

const REVENUE_STREAMS = [
  {
    icon: DollarSign,
    stream: "Protocol Fees",
    amount: "0.05-0.1%",
    desc: "Per-transaction fee on compliant swaps and liquidity operations",
    example: "$100k swap = $50-100 fee",
  },
  {
    icon: Users,
    stream: "Session Fees",
    amount: "$1-5/mo",
    desc: "Monthly subscription for active users maintaining sessions",
    example: "10k users = $10-50k MRR",
  },
  {
    icon: Target,
    stream: "Enterprise",
    amount: "Custom",
    desc: "White-label solutions, dedicated support, and custom compliance rules",
    example: "Starting at $25k/year",
  },
];

const GROWTH_ASSUMPTIONS = [
  { label: "Monthly Active Users", value: "50,000", growth: "+20% MoM" },
  { label: "Avg. Swaps per User", value: "15/month", growth: "Stable" },
  { label: "Avg. Swap Size", value: "$5,000", growth: "+10% YoY" },
  { label: "Total Monthly Volume", value: "$3.75B", growth: "Derived" },
];

const REVENUE_BREAKDOWN = [
  { source: "Protocol Fees (0.05%)", value: "$1,875,000", pct: "66%" },
  { source: "Session Fees ($3/mo avg)", value: "$150,000", pct: "5%" },
  { source: "Enterprise (10 clients)", value: "$833,333", pct: "29%" },
];

const UNIT_ECONOMICS = [
  { label: "Customer LTV", value: "$1,850", sub: "24-month avg" },
  { label: "Gross Margin", value: "92%", sub: "Infrastructure costs" },
  { label: "Payback Period", value: "3 months", sub: "CAC recovery" },
];

const PHASES = [
  {
    quarter: "Q2 2026",
    title: "Foundation & Audit",
    icon: Shield,
    items: [
      "Trail of Bits external security audit ($25-30k)",
      "Uniswap Foundation grant application",
      "Documentation finalization and developer portal",
      "Testnet performance optimization",
      "Community bug bounty program launch ($10k pool)",
    ],
    status: "in-progress" as const,
    completion: "75%",
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
      "Launch monitoring dashboard and alerting system",
    ],
    status: "planned" as const,
    completion: "0%",
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
      "Enterprise tier launch with SLA guarantees",
    ],
    status: "future" as const,
    completion: "0%",
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
      "50,000 MAU milestone, $1B+ monthly volume",
    ],
    status: "future" as const,
    completion: "0%",
  },
];

const MILESTONES = [
  {
    period: "Q4 2026 (Launch)",
    metrics: [
      { label: "Protocol Integrations", value: "3-5", target: "Ondo, Backed, Maple" },
      { label: "Monthly Active Users", value: "500", target: "Pilot phase" },
      { label: "Monthly Volume", value: "$50M", target: "Initial traction" },
      { label: "MRR", value: "$30k", target: "Covering ops costs" },
    ],
  },
  {
    period: "Q4 2027 (Year 1)",
    metrics: [
      { label: "Protocol Integrations", value: "15+", target: "Market expansion" },
      { label: "Monthly Active Users", value: "10,000", target: "Product-market fit" },
      { label: "Monthly Volume", value: "$750M", target: "15x growth" },
      { label: "ARR", value: "$4.5M", target: "Series A readiness" },
    ],
  },
];

const PRIORITIES = [
  {
    title: "Protocol Partnerships",
    icon: Users,
    desc: "Integrate with leading RWA protocols",
    priorities: [
      "Ondo Finance (OUSG, USDY)",
      "Backed Finance (bIB01, bCSPX)",
      "Maple Finance (institutional lending)",
      "OpenEden (T-Bill tokens)",
    ],
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
    ],
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
    ],
  },
];

/* ─────────────── COMPONENT ─────────────── */

export default function RoadmapPage() {
  /* ── Reveal observer ── */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Background Orbs */}
      <div className="orb orb--1" />
      <div className="orb orb--2" />
      <div className="orb orb--3" />

      {/* Nav */}
      <Nav />

      {/* Hero */}
      <section className="hero" style={{ minHeight: "auto", paddingBottom: 40 }}>
        <div className="reveal" style={{ maxWidth: 800 }}>
          <p className="section-eyebrow" style={{ color: "var(--accent)" }}>ROADMAP</p>
          <h1
            className="font-serif"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.4rem, 6vw, 4rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--text)",
              margin: "0 0 20px",
            }}
          >
            Business Model &amp; Roadmap
          </h1>
          <p className="hero-sub">
            Path to becoming the compliance standard for institutional DeFi.
            Revenue model, growth projections, and development timeline.
          </p>
        </div>
      </section>

      {/* Revenue Model */}
      <section className="section reveal">
        <p className="section-eyebrow">REVENUE MODEL</p>
        <h2 className="section-headline">Three streams. Predictable growth.</h2>

        <div className="feature-grid" style={{ marginBottom: 32 }}>
          {REVENUE_STREAMS.map((item, i) => (
            <div key={i} className="glass feature-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <item.icon style={{ width: 24, height: 24, color: "var(--accent)" }} />
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {item.amount}
                </span>
              </div>
              <div className="pixel-label" style={{ marginBottom: 8 }}>
                {item.stream}
              </div>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, margin: "0 0 12px" }}>
                {item.desc}
              </p>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  background: "var(--surface)",
                  padding: "10px 14px",
                  borderRadius: 10,
                }}
              >
                Example: {item.example}
              </div>
            </div>
          ))}
        </div>

        {/* Unit Economics */}
        <div className="glass" style={{ padding: "36px 32px" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--text)",
              margin: "0 0 28px",
            }}
          >
            Projected Unit Economics (Year 3)
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Growth Assumptions */}
            <div>
              <div className="pixel-label" style={{ marginBottom: 16 }}>
                Growth Assumptions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {GROWTH_ASSUMPTIONS.map((item, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}
                  >
                    <span style={{ color: "var(--text2)" }}>{item.label}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{item.value}</div>
                      <div style={{ fontSize: 11, color: "var(--text2)" }}>{item.growth}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div>
              <div className="pixel-label" style={{ marginBottom: 16 }}>
                Monthly Revenue Breakdown
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {REVENUE_BREAKDOWN.map((item, i) => (
                  <div key={i} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>{item.source}</span>
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>{item.pct}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", color: "var(--text)", fontWeight: 600 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Total Monthly Revenue</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#22c55e",
                      }}
                    >
                      $2.86M
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 10,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      Annualized Run Rate (ARR)
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#22c55e",
                      }}
                    >
                      $34.3M
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stats */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 28,
              borderTop: "1px solid var(--border)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              textAlign: "center",
            }}
          >
            {UNIT_ECONOMICS.map((item, i) => (
              <div key={i}>
                <div className="pixel-label" style={{ marginBottom: 8 }}>
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {item.value}
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Development Roadmap */}
      <section className="section reveal">
        <p className="section-eyebrow">DEVELOPMENT</p>
        <h2 className="section-headline">Ship, audit, scale.</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PHASES.map((phase, i) => {
            const isActive = phase.status === "in-progress";
            const isPlanned = phase.status === "planned";

            return (
              <div
                key={i}
                className="glass"
                style={{
                  padding: "28px 28px",
                  borderColor: isActive
                    ? "rgba(34,197,94,0.25)"
                    : isPlanned
                    ? "rgba(59,130,246,0.2)"
                    : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: isActive
                          ? "rgba(34,197,94,0.12)"
                          : isPlanned
                          ? "var(--surface)"
                          : "var(--surface)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <phase.icon
                        style={{
                          width: 24,
                          height: 24,
                          color: isActive ? "#22c55e" : isPlanned ? "var(--accent)" : "var(--text2)",
                        }}
                      />
                    </div>
                    <div>
                      <div className="pixel-label" style={{ marginBottom: 6 }}>
                        {phase.quarter}
                      </div>
                      <h3
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "var(--text)",
                          margin: 0,
                        }}
                      >
                        {phase.title}
                      </h3>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {isActive && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 2 }}>Progress</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{phase.completion}</div>
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-pixel)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: isActive
                          ? "rgba(34,197,94,0.15)"
                          : isPlanned
                          ? "rgba(59,130,246,0.15)"
                          : "var(--surface)",
                        color: isActive ? "#22c55e" : isPlanned ? "var(--accent)" : "var(--text2)",
                      }}
                    >
                      {isActive ? "In Progress" : isPlanned ? "Planned" : "Future"}
                    </span>
                  </div>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, paddingLeft: 64, display: "flex", flexDirection: "column", gap: 8 }}>
                  {phase.items.map((item, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", fontSize: 14, color: "var(--text2)" }}>
                      <CheckCircle2
                        style={{
                          width: 16,
                          height: 16,
                          marginRight: 10,
                          marginTop: 2,
                          flexShrink: 0,
                          color: isActive ? "#22c55e" : isPlanned ? "var(--accent)" : "var(--text2)",
                          opacity: phase.status === "future" ? 0.5 : 1,
                        }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Growth Milestones */}
      <section className="section reveal">
        <p className="section-eyebrow">TRACTION</p>
        <h2 className="section-headline">Growth milestones.</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {MILESTONES.map((milestone, i) => (
            <div key={i} className="glass" style={{ padding: "28px 28px" }}>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 20px",
                }}
              >
                {milestone.period}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {milestone.metrics.map((metric, j) => (
                  <div key={j} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--text2)" }}>{metric.label}</span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "var(--text)",
                        }}
                      >
                        {metric.value}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>{metric.target}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Strategic Priorities */}
      <section className="section reveal">
        <p className="section-eyebrow">STRATEGY</p>
        <h2 className="section-headline">Strategic priorities.</h2>

        <div className="feature-grid">
          {PRIORITIES.map((priority, i) => (
            <div key={i} className="glass feature-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <priority.icon style={{ width: 20, height: 20, color: "var(--accent)" }} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: 0,
                  }}
                >
                  {priority.title}
                </h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, margin: "0 0 16px" }}>
                {priority.desc}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {priority.priorities.map((item, j) => (
                  <li
                    key={j}
                    style={{ display: "flex", alignItems: "flex-start", fontSize: 12, color: "var(--text2)" }}
                  >
                    <CheckCircle2
                      style={{
                        width: 14,
                        height: 14,
                        marginRight: 8,
                        marginTop: 1,
                        flexShrink: 0,
                        color: "var(--accent)",
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section reveal">
        <h2>Interested in partnering, investing, or integrating?</h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/integrations" className="btn-primary">
            View Integration Guide
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8h10m0 0L9 4m4 4L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <a href="mailto:contact@ilal.tech?subject=Partnership Inquiry" className="btn-ghost">
            Contact Team
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
