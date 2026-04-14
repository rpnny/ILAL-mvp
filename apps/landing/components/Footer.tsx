import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="4" width="4" height="4" fill="var(--accent)" />
              <rect x="8" y="4" width="4" height="4" fill="var(--accent)" />
              <rect x="12" y="4" width="4" height="4" fill="var(--accent)" />
              <rect x="8" y="8" width="4" height="4" fill="var(--accent)" />
              <rect x="8" y="12" width="4" height="4" fill="var(--accent)" />
              <rect x="8" y="16" width="4" height="4" fill="var(--accent)" />
              <rect x="4" y="20" width="4" height="4" fill="var(--accent)" />
              <rect x="8" y="20" width="4" height="4" fill="var(--accent)" />
              <rect x="12" y="20" width="4" height="4" fill="var(--accent)" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "0.12em", color: "var(--text)" }}>
              ILAL
            </span>
          </div>
          <p className="footer-brand-tagline">
            Zero-knowledge compliance infrastructure for institutional DeFi.
          </p>
        </div>

        {/* Protocol */}
        <div className="footer-col">
          <h4>Protocol</h4>
          <ul>
            <li><Link href="/technology">Architecture</Link></li>
            <li><a href="#">ZK Circuit</a></li>
            <li><a href="https://sepolia.basescan.org/address/0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80" target="_blank" rel="noopener noreferrer">Contracts</a></li>
            <li><a href="#">Audits</a></li>
          </ul>
        </div>

        {/* Developers */}
        <div className="footer-col">
          <h4>Developers</h4>
          <ul>
            <li><Link href="/docs">API Reference</Link></li>
            <li><a href="#">SDK</a></li>
            <li><Link href="/docs/quickstart">Quick Start</Link></li>
            <li><a href="https://github.com/rpnny/ILAL-mvp" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          </ul>
        </div>

        {/* Institution */}
        <div className="footer-col">
          <h4>Institution</h4>
          <ul>
            <li><a href="mailto:contact@ilal.tech">Contact</a></li>
            <li><a href="#">Careers</a></li>
            <li><Link href="/terms">Legal</Link></li>
            <li><a href="#">Press</a></li>
          </ul>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="footer-bar">
        <span>&copy; MMXXVI &middot; ILAL.TECH</span>
        <span className="footer-status">
          <span className="footer-status-dot" />
          All systems operational
        </span>
      </div>
    </footer>
  );
}
