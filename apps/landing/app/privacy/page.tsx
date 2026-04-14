"use client";

import { useEffect } from "react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export default function PrivacyPage() {
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
      <section className="hero" style={{ minHeight: "auto", paddingBottom: 40 }}>
        <div className="reveal">
          <p className="section-eyebrow" style={{ textAlign: "center" }}>LEGAL</p>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.4rem, 6vw, 4rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              margin: "0 0 20px",
              color: "var(--text)",
              textAlign: "center",
            }}
          >
            Privacy Policy
          </h1>
          <p className="hero-sub">Last updated: April 10, 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="section reveal" style={{ maxWidth: 780 }}>
        <div className="glass" style={{ padding: "40px 36px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {/* Section 1 */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 12px",
                }}
              >
                1. Overview
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                ILAL Protocol (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides zero-knowledge compliance infrastructure for institutional DeFi.
                This Privacy Policy describes how we collect, use, and protect information when you use our services, API, and website.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 16px",
                }}
              >
                2. Information We Collect
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    label: "Wallet Addresses",
                    text: "We collect your blockchain wallet address when you register for our services. This is a public identifier on the blockchain.",
                  },
                  {
                    label: "KYC Data",
                    text: "Identity verification is processed by third-party providers (Coinbase EAS, Sumsub). We store only the verification status and provider reference ID \u2014 never raw identity documents or personal details.",
                  },
                  {
                    label: "Zero-Knowledge Proofs",
                    text: "By design, ZK proofs verify compliance without revealing underlying personal data. We store proof artifacts and Merkle tree positions, not the private inputs.",
                  },
                  {
                    label: "API Usage",
                    text: "We log API request metadata (timestamps, endpoints, response codes) for rate limiting and security monitoring.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: "2px solid var(--accent)",
                      paddingLeft: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 4,
                      }}
                    >
                      {item.label}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 12px",
                }}
              >
                3. How We Use Your Information
              </h2>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 14,
                  color: "var(--text2)",
                  lineHeight: 1.7,
                }}
              >
                <li>To verify your compliance status for on-chain trading sessions</li>
                <li>To generate and verify zero-knowledge proofs</li>
                <li>To manage API access and enforce rate limits</li>
                <li>To detect and prevent fraud or unauthorized use</li>
                <li>To improve our services and infrastructure</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 12px",
                }}
              >
                4. Data Sharing
              </h2>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, margin: "0 0 16px" }}>
                We do not sell your data. We share information only with:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    label: "KYC Providers",
                    text: "Your wallet address is shared with your chosen verification provider during onboarding.",
                  },
                  {
                    label: "On-Chain",
                    text: "Compliance proofs and session states are published to the Base blockchain as part of the protocol\u2019s operation.",
                  },
                  {
                    label: "Legal Requirements",
                    text: "We may disclose information if required by law or valid legal process.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: "2px solid var(--accent)",
                      paddingLeft: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 4,
                      }}
                    >
                      {item.label}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5 */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 12px",
                }}
              >
                5. Data Retention
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                On-chain session data expires after 24 hours by protocol design. Off-chain records (API logs, KYC status) are retained
                for the duration of your account or as required by applicable regulations.
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 12px",
                }}
              >
                6. Security
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                We implement industry-standard security measures including encrypted communications (TLS), access controls,
                and secure key management. Zero-knowledge proofs ensure that compliance verification never exposes personal data.
              </p>
            </div>

            {/* Section 7 */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 12px",
                }}
              >
                7. Contact
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                For privacy inquiries, contact us at{" "}
                <a
                  href="mailto:contact@ilal.tech"
                  style={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  contact@ilal.tech
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
