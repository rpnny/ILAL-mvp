"use client";

import { useEffect } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

/* ─────────────── DATA ─────────────── */

const MARKET_STATS = [
  { value: "$400T", label: "Total Addressable Market", desc: "Traditional assets eligible for tokenization" },
  { value: "$10B", label: "Current On-Chain RWA", desc: "0.0025% penetration" },
  { value: "$1T+", label: "5-Year Projection", desc: "100x growth", highlight: true },
];

const TAGS = ["Privacy-Preserving", "Gas-Efficient", "Uniswap Native", "Multi-Provider"];

const COMPARISON = [
  { feature: "Compliance", trad: "0%", cex: "100%", zk: "40%", ilal: "100%" },
  { feature: "Privacy", trad: "30%", cex: "0%", zk: "100%", ilal: "100%" },
  { feature: "Decentralization", trad: "100%", cex: "0%", zk: "80%", ilal: "100%" },
  { feature: "Cost/Trade", trad: "$2-5", cex: "$0.50", zk: "$5+", ilal: "$0.0003" },
  { feature: "Institutional Ready", trad: "No", cex: "Partial", zk: "No", ilal: "Yes" },
  { feature: "Uniswap v4 Native", trad: "Yes", cex: "No", zk: "No", ilal: "Yes" },
];

const COMPETITIVE_STATS = [
  { title: "99.7% Cost Reduction", detail: "$50 to $0.0003 per-trade compliance overhead", highlight: true },
  { title: "6-12 Month Lead", detail: "First ZK Session compliance Hook on Uniswap v4" },
  { title: "216/216 Tests Pass", detail: "100% pass rate, 52+ attack vectors, production-ready" },
];

const NETWORK_EFFECTS = [
  "More protocols integrate, more verified users",
  "More users, deeper liquidity pools",
  "Deeper liquidity, better pricing for institutions",
  "Better pricing attracts more protocols (flywheel)",
];

const COMPETITIVE_MOAT = [
  "Technical complexity (11-19 months to replicate)",
  "First-mover on Uniswap v4 (6-12 month lead)",
  "Liquidity lock-in (switching costs)",
  "Regulatory approval (time-consuming for competitors)",
];

const WHY_NOW = [
  { timing: "Now", title: "Uniswap v4 is Live", detail: "Hook architecture is live now. ILAL deploys natively on v4, no wrappers needed." },
  { timing: "2025-2027", title: "RWA Explosion", detail: "$10B to $100B+ growth trajectory over 24 months. Market is ready." },
  { timing: "2026+", title: "Regulatory Clarity", detail: "MiCA (EU) and evolving US frameworks create compliance demand." },
];

/* ─────────────── PIXEL ICONS ─────────────── */

function PixelNetwork() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="14" y="2" width="4" height="4" fill="var(--accent)" />
      <rect x="14" y="6" width="4" height="4" fill="var(--accent)" opacity="0.6" />
      <rect x="6" y="14" width="4" height="4" fill="var(--accent)" />
      <rect x="10" y="10" width="4" height="4" fill="var(--accent)" opacity="0.4" />
      <rect x="22" y="14" width="4" height="4" fill="var(--accent)" />
      <rect x="18" y="10" width="4" height="4" fill="var(--accent)" opacity="0.4" />
      <rect x="14" y="14" width="4" height="4" fill="var(--accent)" />
      <rect x="10" y="18" width="4" height="4" fill="var(--accent)" opacity="0.4" />
      <rect x="18" y="18" width="4" height="4" fill="var(--accent)" opacity="0.4" />
      <rect x="6" y="22" width="4" height="4" fill="var(--accent)" opacity="0.6" />
      <rect x="22" y="22" width="4" height="4" fill="var(--accent)" opacity="0.6" />
    </svg>
  );
}

function PixelTrend() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="24" width="4" height="4" fill="var(--accent)" opacity="0.4" />
      <rect x="8" y="20" width="4" height="4" fill="var(--accent)" opacity="0.5" />
      <rect x="12" y="16" width="4" height="4" fill="var(--accent)" opacity="0.6" />
      <rect x="16" y="18" width="4" height="4" fill="var(--accent)" opacity="0.5" />
      <rect x="20" y="12" width="4" height="4" fill="var(--accent)" opacity="0.8" />
      <rect x="24" y="6" width="4" height="4" fill="var(--accent)" />
      <rect x="24" y="10" width="4" height="4" fill="var(--accent)" opacity="0.3" />
      <rect x="20" y="6" width="4" height="4" fill="var(--accent)" opacity="0.3" />
    </svg>
  );
}

function PixelCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="8" width="2" height="2" fill="var(--accent)" />
      <rect x="4" y="10" width="2" height="2" fill="var(--accent)" />
      <rect x="6" y="8" width="2" height="2" fill="var(--accent)" />
      <rect x="8" y="6" width="2" height="2" fill="var(--accent)" />
      <rect x="10" y="4" width="2" height="2" fill="var(--accent)" />
      <rect x="12" y="2" width="2" height="2" fill="var(--accent)" />
    </svg>
  );
}

/* ─────────────── COMPONENT ─────────────── */

export default function AboutPage() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
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
      <section className="hero">
        <div className="reveal">
          <p className="hero-kicker">&#9654; VISION &amp; MARKET</p>
          <h1>
            The $400T<br />
            <em>opportunity.</em>
          </h1>
          <p className="hero-sub">
            Bridging institutional capital and DeFi liquidity through
            privacy-preserving compliance infrastructure.
          </p>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="section reveal">
        <p className="section-eyebrow">MARKET OPPORTUNITY</p>
        <h2 className="section-headline">
          Institutional demand is proven.<br />Infrastructure is missing.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MARKET_STATS.map((item, i) => (
            <div
              key={i}
              className={`glass text-center p-8 ${
                item.highlight ? "border-[color:var(--accent)]/30" : ""
              }`}
            >
              <div
                className={`font-display text-4xl font-bold mb-2 ${
                  item.highlight ? "text-[color:var(--accent)]" : "text-[color:var(--text)]"
                }`}
              >
                {item.value}
              </div>
              <div className="text-sm text-[color:var(--text2)] mb-4">{item.label}</div>
              <div className="text-xs text-[color:var(--text2)] opacity-60">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Bottleneck callout */}
        <div className="glass mt-10 p-8 border-l-4 border-l-[color:var(--accent)]" style={{ borderLeftWidth: 4 }}>
          <h3 className="font-display text-xl font-semibold mb-3 text-[color:var(--text)]">
            The Bottleneck
          </h3>
          <p className="text-sm text-[color:var(--text2)] leading-relaxed">
            RWA protocols (Ondo, Backed, Maple) have proven institutional demand exists.
            But scaling requires DeFi liquidity, which demands compliance infrastructure.
            ILAL is the missing piece that unlocks $400T of traditional assets for on-chain trading.
          </p>
        </div>
      </section>

      {/* ILAL as Infrastructure */}
      <section className="section reveal">
        <p className="section-eyebrow">INFRASTRUCTURE</p>
        <h2 className="section-headline">
          The compliance layer<br />for DeFi.
        </h2>
        <div className="glass p-8">
          <h3 className="font-display text-lg font-semibold mb-3 text-[color:var(--text)]">
            The Compliance Layer for DeFi
          </h3>
          <p className="text-sm text-[color:var(--text2)] leading-relaxed mb-6">
            Just as Chainlink became the oracle standard, ILAL aims to be the compliance standard.
            Every RWA protocol needs on-chain KYC. ILAL provides it with privacy, efficiency, and seamless UX.
          </p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag, i) => (
              <span
                key={i}
                className="font-pixel text-[8px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-lg bg-[color:var(--surface)] text-[color:var(--accent)] border border-[color:var(--border)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Positioning */}
      <section className="section reveal">
        <p className="section-eyebrow">COMPETITIVE POSITIONING</p>
        <h2 className="section-headline">
          How ILAL compares.
        </h2>

        {/* Comparison Table */}
        <div className="glass overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  <th className="text-left p-4 font-display font-semibold text-[color:var(--text)]">Feature</th>
                  <th className="text-center p-4 font-display font-semibold text-[color:var(--text2)]">Traditional DeFi</th>
                  <th className="text-center p-4 font-display font-semibold text-[color:var(--text2)]">CEX</th>
                  <th className="text-center p-4 font-display font-semibold text-[color:var(--text2)]">Other ZK</th>
                  <th className="text-center p-4 font-display font-semibold text-[color:var(--accent)]">ILAL</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[color:var(--border)] last:border-b-0 transition-colors hover:bg-[color:var(--surface)]"
                  >
                    <td className="p-4 font-medium text-[color:var(--text)]">{row.feature}</td>
                    <td className="p-4 text-center text-[color:var(--text2)]">{row.trad}</td>
                    <td className="p-4 text-center text-[color:var(--text2)]">{row.cex}</td>
                    <td className="p-4 text-center text-[color:var(--text2)]">{row.zk}</td>
                    <td className="p-4 text-center font-semibold text-[color:var(--accent)]">{row.ilal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Competitive stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COMPETITIVE_STATS.map((stat, i) => (
            <div
              key={i}
              className={`glass text-center p-6 ${
                stat.highlight ? "border-[color:var(--accent)]/30" : ""
              }`}
            >
              <div
                className={`font-display text-2xl md:text-3xl font-bold mb-2 ${
                  stat.highlight ? "text-[color:var(--accent)]" : "text-[color:var(--text)]"
                }`}
              >
                {stat.title}
              </div>
              <div className="text-sm text-[color:var(--text2)]">{stat.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Network Effects & Moat */}
      <section className="section reveal">
        <p className="section-eyebrow">DEFENSIBILITY</p>
        <h2 className="section-headline">
          Network effects &amp; moat.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Network Effects */}
          <div className="glass p-8">
            <div className="flex items-center gap-3 mb-6">
              <PixelNetwork />
              <h3 className="font-display text-lg font-semibold text-[color:var(--text)]">
                Network Effects
              </h3>
            </div>
            <ul className="space-y-4">
              {NETWORK_EFFECTS.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[color:var(--text2)]">
                  <span className="flex-shrink-0 mt-0.5"><PixelCheck /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Competitive Moat */}
          <div className="glass p-8">
            <div className="flex items-center gap-3 mb-6">
              <PixelTrend />
              <h3 className="font-display text-lg font-semibold text-[color:var(--text)]">
                Competitive Moat
              </h3>
            </div>
            <ul className="space-y-4">
              {COMPETITIVE_MOAT.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[color:var(--text2)]">
                  <span className="flex-shrink-0 mt-0.5"><PixelCheck /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why Now */}
      <section className="section reveal">
        <p className="section-eyebrow">TIMING</p>
        <h2 className="section-headline">
          Why now?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {WHY_NOW.map((item, i) => (
            <div key={i} className="glass p-6">
              <span className="font-pixel text-[8px] tracking-[0.15em] uppercase text-[color:var(--accent)]">
                {item.timing}
              </span>
              <h3 className="font-display text-base font-semibold mt-3 mb-2 text-[color:var(--text)]">
                {item.title}
              </h3>
              <p className="text-sm text-[color:var(--text2)] leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section reveal">
        <h2>Learn how the technology enables this vision.</h2>
        <Link href="/technology" className="btn-primary">
          View Technical Architecture
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
