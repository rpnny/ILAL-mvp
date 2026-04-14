"use client";

import { useEffect } from "react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export default function TermsPage() {
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
            Terms of Service
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
                1. Acceptance of Terms
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                By accessing or using the ILAL Protocol services, API, smart contracts, or website (collectively, the &quot;Services&quot;),
                you agree to be bound by these Terms of Service. If you do not agree, do not use the Services.
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
                  margin: "0 0 12px",
                }}
              >
                2. Description of Services
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                ILAL Protocol provides zero-knowledge compliance infrastructure for Uniswap V4, including KYC verification,
                ZK proof generation, on-chain session management, and DeFi execution APIs. The Services are currently
                deployed on Base Sepolia testnet for demonstration and testing purposes.
              </p>
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
                3. Eligibility
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
                <li>You must be at least 18 years old to use the Services.</li>
                <li>You must not be located in, or a resident of, any sanctioned jurisdiction.</li>
                <li>You must complete KYC verification through an approved provider before accessing trading functionality.</li>
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
                4. User Responsibilities
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
                <li>You are responsible for securing your wallet private keys and API keys.</li>
                <li>You must provide accurate information during KYC verification.</li>
                <li>You agree not to use the Services for money laundering, terrorist financing, or other illicit activities.</li>
                <li>You agree to comply with all applicable laws and regulations in your jurisdiction.</li>
              </ul>
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
                5. API Usage
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                API access is subject to rate limits based on your tier (Free: 60/min, Pro: 300/min, Enterprise: 1000/min).
                Excessive or abusive use may result in temporary or permanent suspension of access.
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
                6. Testnet Disclaimer
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                The Services are currently deployed on Base Sepolia testnet. Testnet tokens have no monetary value.
                The protocol is provided &quot;as is&quot; for evaluation purposes. We make no guarantees regarding uptime,
                security, or correctness of testnet deployments.
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
                7. Intellectual Property
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                ILAL Protocol is open-source software released under the Apache 2.0 license. The ILAL name, logo,
                and branding are proprietary and may not be used without permission.
              </p>
            </div>

            {/* Section 8 */}
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
                8. Limitation of Liability
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                To the maximum extent permitted by law, ILAL Protocol and its contributors shall not be liable for
                any indirect, incidental, special, consequential, or punitive damages arising from your use of the Services,
                including but not limited to loss of funds, data, or profits.
              </p>
            </div>

            {/* Section 9 */}
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
                9. Modifications
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                We reserve the right to modify these Terms at any time. Continued use of the Services after changes
                constitutes acceptance of the updated Terms.
              </p>
            </div>

            {/* Section 10 */}
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
                10. Contact
              </h2>
              <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                For questions about these Terms, contact us at{" "}
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
