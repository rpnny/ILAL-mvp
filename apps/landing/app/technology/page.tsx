"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

/* ─────────────── DATA ─────────────── */

const COMPONENTS = [
  {
    name: "Registry",
    type: "UUPS Proxy",
    icon: "shield",
    role: "System configuration center",
    features: ["Manage trusted Issuers", "Router whitelist", "Global parameters", "Emergency pause"],
    address: "0x461e...5Faf",
    upgradeable: true,
  },
  {
    name: "SessionManager",
    type: "UUPS Proxy",
    icon: "zap",
    role: "User verification state caching",
    features: ["24-hour session TTL", "Batch query (~5k gas)", "Manual termination", "RBAC (VERIFIER)"],
    address: "0xaa66...06e9",
    upgradeable: true,
  },
  {
    name: "ComplianceHook",
    type: "Immutable",
    icon: "lock",
    role: "Uniswap v4 access control layer",
    features: ["Intercepts Pool Actions", "EIP-712 verification", "Replay protection", "Session validation (~8k gas)"],
    address: "0x0000...002c",
    upgradeable: false,
  },
  {
    name: "PlonkVerifier",
    type: "Immutable",
    icon: "code",
    role: "On-chain ZK verification",
    features: ["PLONK (~350k gas)", "Universal Setup", "Public input validation", "WASM generation"],
    address: "0x3Aa3...e3cC",
    upgradeable: false,
  },
];

const BENCHMARKS = [
  { op: "Swap — API Mode (EOA)", gas: "153,000", usd: "~$0.0009" },
  { op: "Swap — SDK EIP-712", gas: "171,000", usd: "~$0.001" },
  { op: "Add Liquidity", gas: "318,000", usd: "~$0.002" },
  { op: "ZK Session Activation", gas: "684,000", usd: "~$0.004 (once/24h)" },
];

const TEST_STATS = [
  { label: "Total Tests", value: "216" },
  { label: "Pass Rate", value: "100%" },
  { label: "Code Coverage", value: "99%" },
  { label: "Attack Vectors Tested", value: "52+" },
];

const SOLIDITY_CODE = `import {IHooks} from "v4-core/interfaces/IHooks.sol";

contract MyPool {
    address constant COMPLIANCE_HOOK =
        0x00000000DA15E8FCA4dFf7aF93aBa7030000002c;

    function initialize() external {
        PoolKey memory key = PoolKey({
            currency0: USDC,
            currency1: USDY,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(COMPLIANCE_HOOK)
        });

        poolManager.initialize(key, SQRT_RATIO_1_1, "");
    }
}`;

const SDK_CODE = `import { ILALClient } from '@ilal/sdk';

const client = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});

// 1. Activate session & generate ZK Proof
await client.session.activate();

// 2. Execute hook-protected swap
await client.swap.execute({
  tokenIn: BASE_SEPOLIA_TOKENS.USDC,
  tokenOut: BASE_SEPOLIA_TOKENS.WETH,
  amountIn: parseUnits('100', 6),
});`;

/* ─────────────── PIXEL ICONS ─────────────── */

function PixelIcon({ type }: { type: string }) {
  if (type === "shield") {
    return (
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <rect x="10" y="4" width="12" height="4" fill="var(--accent)" />
        <rect x="6" y="8" width="4" height="4" fill="var(--accent)" />
        <rect x="22" y="8" width="4" height="4" fill="var(--accent)" />
        <rect x="6" y="12" width="20" height="4" fill="var(--accent)" opacity="0.5" />
        <rect x="10" y="16" width="12" height="4" fill="var(--accent)" opacity="0.3" />
        <rect x="14" y="20" width="4" height="4" fill="var(--accent)" opacity="0.2" />
      </svg>
    );
  }
  if (type === "lock") {
    return (
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <rect x="12" y="4" width="8" height="4" fill="var(--accent)" />
        <rect x="8" y="8" width="4" height="8" fill="var(--accent)" />
        <rect x="20" y="8" width="4" height="8" fill="var(--accent)" />
        <rect x="6" y="16" width="20" height="4" fill="var(--accent)" />
        <rect x="6" y="20" width="20" height="8" fill="var(--accent)" opacity="0.5" />
        <rect x="14" y="20" width="4" height="4" fill="var(--accent)" />
      </svg>
    );
  }
  if (type === "code") {
    return (
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="12" width="4" height="4" fill="var(--accent)" />
        <rect x="8" y="8" width="4" height="4" fill="var(--accent)" />
        <rect x="8" y="16" width="4" height="4" fill="var(--accent)" />
        <rect x="12" y="4" width="4" height="4" fill="var(--accent)" opacity="0.5" />
        <rect x="12" y="20" width="4" height="4" fill="var(--accent)" opacity="0.5" />
        <rect x="24" y="12" width="4" height="4" fill="var(--accent)" />
        <rect x="20" y="8" width="4" height="4" fill="var(--accent)" />
        <rect x="20" y="16" width="4" height="4" fill="var(--accent)" />
        <rect x="16" y="4" width="4" height="4" fill="var(--accent)" opacity="0.5" />
        <rect x="16" y="20" width="4" height="4" fill="var(--accent)" opacity="0.5" />
      </svg>
    );
  }
  // zap
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
      <rect x="16" y="2" width="4" height="4" fill="var(--accent)" />
      <rect x="12" y="6" width="4" height="4" fill="var(--accent)" />
      <rect x="8" y="10" width="4" height="4" fill="var(--accent)" />
      <rect x="8" y="14" width="16" height="4" fill="var(--accent)" />
      <rect x="20" y="18" width="4" height="4" fill="var(--accent)" />
      <rect x="16" y="22" width="4" height="4" fill="var(--accent)" />
      <rect x="12" y="26" width="4" height="4" fill="var(--accent)" />
    </svg>
  );
}

/* ─────────────── COMPONENT ─────────────── */

export default function TechnologyPage() {
  /* ── Reveal observer ── */
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

      {/* Navigation */}
      <Nav />

      {/* Hero */}
      <section className="hero">
        <div className="reveal" style={{ maxWidth: 720 }}>
          <p className="section-eyebrow" style={{ textAlign: "center" }}>ARCHITECTURE</p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, lineHeight: 1.1, textAlign: "center", fontSize: "clamp(2.4rem, 6vw, 4.2rem)", margin: "0 0 20px", color: "var(--text)" }}>
            Technical Architecture
          </h1>
          <p className="hero-sub">
            Session-based verification with zero-knowledge proofs and{" "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>Uniswap V4 Hooks</span>.
            Production-tested, 99% code coverage.
          </p>
        </div>
      </section>

      {/* Core Components */}
      <section className="section reveal">
        <p className="section-eyebrow">CORE CONTRACTS</p>
        <h2 className="section-headline">Core Components</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 20 }}>
          {COMPONENTS.map((component, i) => (
            <div key={i} className="glass" style={{ padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PixelIcon type={component.icon} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                      {component.name}
                    </h3>
                    <div className="pixel-label" style={{ marginTop: 2 }}>{component.type}</div>
                  </div>
                </div>
                <span style={{
                  padding: "4px 10px", fontSize: 10, fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600,
                  borderRadius: 8, border: "1px solid",
                  ...(component.upgradeable
                    ? { background: "rgba(59,130,246,0.1)", color: "var(--accent)", borderColor: "rgba(59,130,246,0.2)" }
                    : { background: "var(--surface)", color: "var(--text2)", borderColor: "var(--border)" }
                  ),
                }}>
                  {component.upgradeable ? "Upgradeable" : "Immutable"}
                </span>
              </div>

              <p style={{ fontSize: 14, color: "var(--text2)", margin: "0 0 16px", lineHeight: 1.6 }}>{component.role}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {component.features.map((feature, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", fontSize: 13, color: "var(--text2)" }}>
                    <CheckCircle2 style={{ width: 14, height: 14, marginRight: 8, marginTop: 2, flexShrink: 0, color: "var(--accent)" }} />
                    {feature}
                  </div>
                ))}
              </div>

              <div style={{
                fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text2)",
                borderTop: "1px solid var(--border)", paddingTop: 12,
              }}>
                Base Sepolia: {component.address}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Code Integration Example */}
      <section className="section reveal">
        <p className="section-eyebrow">INTEGRATION</p>
        <h2 className="section-headline">Integration Example</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 20 }}>
          {/* Solidity */}
          <div className="glass" style={{ overflow: "hidden" }}>
            <div style={{
              borderBottom: "1px solid var(--border)", padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--surface)",
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h8M2 12h10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)", letterSpacing: "0.04em" }}>
                Solidity (Uniswap V4 Hook)
              </span>
            </div>
            <div style={{ padding: 20, overflow: "auto" }}>
              <pre style={{
                fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)",
                lineHeight: 1.7, margin: 0, whiteSpace: "pre",
              }}>
                {SOLIDITY_CODE}
              </pre>
            </div>
          </div>

          {/* Frontend SDK */}
          <div className="glass" style={{ overflow: "hidden" }}>
            <div style={{
              borderBottom: "1px solid var(--border)", padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--surface)",
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h8M2 12h10" stroke="var(--accent2)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)", letterSpacing: "0.04em" }}>
                Frontend SDK Integration
              </span>
            </div>
            <div style={{ padding: 20, overflow: "auto" }}>
              <pre style={{
                fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)",
                lineHeight: 1.7, margin: 0, whiteSpace: "pre",
              }}>
                {SDK_CODE}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Benchmarks */}
      <section className="section reveal">
        <p className="section-eyebrow">BENCHMARKS</p>
        <h2 className="section-headline">Performance Benchmarks</h2>

        <div className="glass" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <th style={{ textAlign: "left", padding: 16, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-body)" }}>Operation</th>
                  <th style={{ textAlign: "right", padding: 16, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-body)" }}>Gas Used</th>
                  <th style={{ textAlign: "right", padding: 16, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-body)" }}>USD (Base)</th>
                  <th style={{ textAlign: "center", padding: 16, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-body)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < BENCHMARKS.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: 16, fontWeight: 500, color: "var(--text)" }}>{row.op}</td>
                    <td style={{ padding: 16, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text2)" }}>{row.gas}</td>
                    <td style={{ padding: 16, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{row.usd}</td>
                    <td style={{ padding: 16, textAlign: "center", color: "var(--accent)" }}>&#10003;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security & Audit Status */}
      <section className="section reveal">
        <p className="section-eyebrow">SECURITY</p>
        <h2 className="section-headline">Security &amp; Audit Status</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: 20 }}>
          {/* Testing Stats */}
          <div className="glass" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text)", margin: "0 0 20px" }}>
              Comprehensive Testing
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {TEST_STATS.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  paddingBottom: i < TEST_STATS.length - 1 ? 14 : 0,
                  borderBottom: i < TEST_STATS.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{ fontSize: 14, color: "var(--text2)" }}>{item.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text)" }}>{item.value}</span>
                    <CheckCircle2 style={{ width: 16, height: 16, color: "var(--accent)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Card */}
          <div className="glass" style={{
            padding: 36, display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center", textAlign: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(129,140,248,0.08) 100%)",
              pointerEvents: "none",
            }} />
            <PixelIcon type="lock" />
            <h3 style={{
              fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600,
              color: "var(--text)", margin: "16px 0 8px", position: "relative",
            }}>
              Ready to Integrate?
            </h3>
            <p style={{
              fontSize: 14, color: "var(--text2)", marginBottom: 24,
              lineHeight: 1.6, maxWidth: 340, position: "relative",
            }}>
              Protect your protocols from sanctioned entity interference using the robust ILAL SDK.
            </p>
            <Link href="/integrations" className="btn-primary" style={{ position: "relative" }}>
              Integration Guide
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
