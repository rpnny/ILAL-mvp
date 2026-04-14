"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

/* ─────────────── DATA ─────────────── */

const FEATURES = [
  {
    title: "Privacy preserving",
    desc: "ZK proof reveals nothing about the underlying identity. Compliance status is binary; personal data never touches the chain.",
    icon: "shield",
  },
  {
    title: "Mathematically enforced",
    desc: "Non-compliant addresses cannot interact with the pool. The hook reverts atomically before any state change occurs.",
    icon: "lock",
  },
  {
    title: "Session economics",
    desc: "683K gas once to verify a PLONK proof. Then 15K per swap for the next 24 hours. Six renewals before re-proof.",
    icon: "zap",
  },
];

const PIPELINE = [
  { num: 1, title: "Submit", desc: "PLONK proof generation", label: "OFF-CHAIN" },
  { num: 2, title: "Verify", desc: "PlonkVerifierAdapter on-chain, 683K gas", label: "ON-CHAIN" },
  { num: 3, title: "Session", desc: "24h grant, 6 renewals", label: "CACHED" },
  { num: 4, title: "Trade", desc: "ComplianceHook single SLOAD", label: "15K GAS" },
];

const STEPS = [
  {
    tab: "Auth",
    label: "STEP 01",
    title: "Authenticate",
    desc: "Obtain a JWT token to authorize all subsequent API calls. Tokens expire after 24 hours.",
    hint: { label: "Security", text: "All endpoints require Bearer token authentication. Store tokens securely." },
    code: `curl -X POST https://api.ilal.tech/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "walletAddress": "0x742d...4a6f",
    "signature": "0x1b9a...f3c2"
  }'`,
    response: `{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "walletAddress": "0x742d...4a6f"
}`,
  },
  {
    tab: "Activate",
    label: "STEP 02",
    title: "Activate Session",
    desc: "Submit your ZK proof to activate a 24-hour compliance session. The proof is verified on-chain via PlonkVerifierAdapter.",
    hint: { label: "Gas", text: "Initial verification costs ~683K gas. All subsequent swaps within the session cost only ~15K gas." },
    code: `curl -X POST https://api.ilal.tech/session/activate \\
  -H "Authorization: Bearer eyJhbG..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "proof": "0x2a1f...8b3c",
    "publicInputs": ["0x742d...4a6f"],
    "chainId": 84532
  }'`,
    response: `{
  "sessionId": "sess_0x8f2a...",
  "status": "active",
  "expiresAt": "2025-01-16T14:30:00Z",
  "txHash": "0x9c3d...7e1f",
  "gasUsed": 683247
}`,
  },
  {
    tab: "Faucet",
    label: "STEP 03",
    title: "Request Tokens",
    desc: "Claim testnet tokens from the ILAL faucet. Provides both mock USDC and WETH for testing swaps.",
    hint: { label: "Testnet", text: "Faucet is available on Base Sepolia only. Tokens have no real value." },
    code: `curl -X POST https://api.ilal.tech/faucet/drip \\
  -H "Authorization: Bearer eyJhbG..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "USDC",
    "amount": "1000",
    "recipient": "0x742d...4a6f"
  }'`,
    response: `{
  "txHash": "0x4b7e...2d1a",
  "token": "USDC",
  "amount": "1000.000000",
  "recipient": "0x742d...4a6f"
}`,
  },
  {
    tab: "Approve",
    label: "STEP 04",
    title: "Approve Tokens",
    desc: "Approve the PositionManager to spend your tokens. Required before executing any swap.",
    hint: { label: "Allowance", text: "You can set unlimited approval or specify exact amounts for each transaction." },
    code: `curl -X POST https://api.ilal.tech/tokens/approve \\
  -H "Authorization: Bearer eyJhbG..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "USDC",
    "spender": "PositionManager",
    "amount": "1000"
  }'`,
    response: `{
  "txHash": "0x6f1c...9a3b",
  "token": "USDC",
  "spender": "0x550c...fc58",
  "allowance": "1000.000000"
}`,
  },
  {
    tab: "Swap",
    label: "STEP 05",
    title: "Execute Swap",
    desc: "Perform a compliant swap through the ILAL hook. The ComplianceHook verifies your session with a single SLOAD.",
    hint: { label: "Compliance", text: "If your session is expired or invalid, the transaction will revert atomically." },
    code: `curl -X POST https://api.ilal.tech/swap/execute \\
  -H "Authorization: Bearer eyJhbG..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokenIn": "USDC",
    "tokenOut": "WETH",
    "amountIn": "100",
    "slippage": 0.5
  }'`,
    response: `{
  "txHash": "0x3e8d...5c2f",
  "amountIn": "100.000000 USDC",
  "amountOut": "0.031247 WETH",
  "gasUsed": 15023,
  "sessionValid": true,
  "complianceCheck": "passed"
}`,
  },
];

const STATS = [
  { value: 15000, suffix: " gas", label: "PER-SWAP GAS" },
  { value: 8.2, suffix: "ms", label: "VERIFY TIME" },
  { value: 24, suffix: "h", label: "SESSION TTL" },
  { value: 345, suffix: "", label: "TESTS PASSING" },
];

const DEPLOYMENTS = [
  { name: "ComplianceHook v3", addr: "0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80" },
  { name: "SessionManager UUPS", addr: "0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2" },
  { name: "Registry UUPS", addr: "0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD" },
  { name: "PlonkVerifier v2", addr: "0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A" },
  { name: "PositionManager v3", addr: "0x550c31a1861528Dca121ed634E50258fFA03fc58" },
];

/* ─────────────── PIXEL ICONS ─────────────── */

function PixelShield() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="16" y="4" width="16" height="4" fill="var(--accent)" />
      <rect x="12" y="8" width="4" height="4" fill="var(--accent)" />
      <rect x="32" y="8" width="4" height="4" fill="var(--accent)" />
      <rect x="12" y="12" width="24" height="4" fill="var(--accent)" opacity="0.6" />
      <rect x="12" y="16" width="24" height="4" fill="var(--accent)" opacity="0.4" />
      <rect x="16" y="20" width="16" height="4" fill="var(--accent)" opacity="0.4" />
      <rect x="16" y="24" width="16" height="4" fill="var(--accent)" opacity="0.3" />
      <rect x="20" y="28" width="8" height="4" fill="var(--accent)" opacity="0.2" />
      <rect x="22" y="32" width="4" height="4" fill="var(--accent)" opacity="0.15" />
      {/* Checkmark */}
      <rect x="18" y="14" width="4" height="4" fill="#22c55e" />
      <rect x="22" y="18" width="4" height="4" fill="#22c55e" />
      <rect x="26" y="10" width="4" height="4" fill="#22c55e" />
    </svg>
  );
}

function PixelIcon({ type }: { type: string }) {
  if (type === "shield") {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
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
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="12" y="4" width="8" height="4" fill="var(--accent)" />
        <rect x="8" y="8" width="4" height="8" fill="var(--accent)" />
        <rect x="20" y="8" width="4" height="8" fill="var(--accent)" />
        <rect x="6" y="16" width="20" height="4" fill="var(--accent)" />
        <rect x="6" y="20" width="20" height="8" fill="var(--accent)" opacity="0.5" />
        <rect x="14" y="20" width="4" height="4" fill="var(--accent)" />
      </svg>
    );
  }
  // zap
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
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

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [typedCode, setTypedCode] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const countersAnimated = useRef(false);

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

  /* ── Counter animation ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !countersAnimated.current) {
            countersAnimated.current = true;
            animateCounters();
          }
        });
      },
      { threshold: 0.3 }
    );

    const statsSection = document.getElementById("stats");
    if (statsSection) obs.observe(statsSection);
    return () => obs.disconnect();
  }, []);

  function animateCounters() {
    STATS.forEach((stat, i) => {
      const el = counterRefs.current[i];
      if (!el) return;
      const target = stat.value;
      const duration = 1500;
      const startTime = performance.now();
      const isFloat = !Number.isInteger(target);

      function tick(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * target;
        if (el) {
          el.textContent = (isFloat ? current.toFixed(1) : Math.round(current).toLocaleString()) + stat.suffix;
        }
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ── Typing animation ── */
  const typeCode = useCallback((code: string) => {
    setTypedCode("");
    setShowResponse(false);
    let idx = 0;
    const speed = 12;

    function typeNext() {
      if (idx < code.length) {
        const chunk = code.slice(0, idx + 1);
        setTypedCode(chunk);
        idx++;
        typingRef.current = setTimeout(typeNext, speed);
      } else {
        setTimeout(() => setShowResponse(true), 300);
      }
    }
    typeNext();
  }, []);

  /* ── Tab switching ── */
  useEffect(() => {
    typeCode(STEPS[activeTab].code);
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [activeTab, typeCode]);

  /* ── Auto-cycling ── */
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % STEPS.length);
    }, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  function handleTabClick(i: number) {
    setActiveTab(i);
    setIsPaused(true);
  }

  const step = STEPS[activeTab];

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
          <PixelShield />
          <p className="hero-kicker">&#9654; ZK COMPLIANCE LAYER</p>
          <h1>
            Verify once.<br />
            <em>Trade freely.</em>
          </h1>
          <p className="hero-sub">
            Zero-knowledge compliance hook for Uniswap v4. One session verification,
            then native-cost swaps for 24 hours.
          </p>
          <div className="hero-buttons">
            <a href="/dashboard" className="btn-primary">
              Enter Dashboard
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#integration" className="btn-ghost">
              See Integration
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section reveal">
        <p className="section-eyebrow">THE PROTOCOL</p>
        <h2 className="section-headline">
          Compliance at session initiation.<br />Not every swap.
        </h2>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass feature-card">
              <PixelIcon type={f.icon} />
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="section reveal">
        <p className="section-eyebrow">HOW IT WORKS</p>
        <h2 className="section-headline">Four steps. One proof.</h2>
        <div className="glass pipeline-card">
          <div className="pipeline-steps">
            {PIPELINE.map((s, i) => (
              <div key={i} className="pipeline-step">
                <div className="pipeline-step-num">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                <span className="pixel-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Demo */}
      <section id="integration" className="section reveal">
        <p className="section-eyebrow">INTEGRATION</p>
        <h2 className="section-headline">Five API calls to compliant DeFi.</h2>
        <div className="int-window">
          {/* Title bar */}
          <div className="int-titlebar">
            <div className="int-dots">
              <span className="int-dot int-dot--r" />
              <span className="int-dot int-dot--y" />
              <span className="int-dot int-dot--g" />
            </div>
            <span className="int-filename">ilal-integration.sh</span>
            <span className="int-status">&#9679; connected</span>
          </div>

          {/* Tabs */}
          <div className="int-tabs">
            {STEPS.map((s, i) => (
              <button
                key={i}
                className={`int-tab${i === activeTab ? " int-tab--active" : ""}`}
                onClick={() => handleTabClick(i)}
              >
                {s.tab}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="int-body">
            {/* Left: info */}
            <div className="int-info">
              <span className="int-step-label">{step.label}</span>
              <h3 className="int-step-title">{step.title}</h3>
              <p className="int-step-desc">{step.desc}</p>
              <div className="int-hint">
                <strong>{step.hint.label}:</strong> {step.hint.text}
              </div>
            </div>

            {/* Right: code */}
            <div className="int-code-area">
              <div className="int-code">
                {typedCode}
                <span className="typing-cursor" />
              </div>
              {showResponse && (
                <div className="int-response">{step.response}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="section reveal">
        <div className="stats-strip">
          {STATS.map((s, i) => (
            <div key={i} className="glass stat-card">
              <div
                className="stat-value"
                ref={(el) => { counterRefs.current[i] = el; }}
              >
                0{s.suffix}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Deployments */}
      <section id="deployments" className="section reveal">
        <p className="section-eyebrow">DEPLOYMENTS</p>
        <h2 className="section-headline">Live on Base Sepolia</h2>
        <div className="glass deploy-list">
          {DEPLOYMENTS.map((d, i) => (
            <div key={i} className="deploy-item">
              <span className="deploy-name">{d.name}</span>
              <span className="deploy-addr">{d.addr}</span>
              <a
                className="deploy-link"
                href={`https://sepolia.basescan.org/address/${d.addr}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View &rarr;
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="cta-section reveal">
        <h2>Built for what comes next.</h2>
        <a href="mailto:contact@ilal.tech" className="btn-primary">
          Request Institutional Access
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
