"use client";

import { useEffect } from "react";

export default function Nav() {
  useEffect(() => {
    // Initialize theme from localStorage
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.getAttribute("data-theme") === "light";
    if (isLight) {
      html.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
    } else {
      html.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <nav className="nav-pill">
      {/* Logo */}
      <a href="#" className="nav-logo">
        <div className="nav-logo-mark">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
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
        </div>
        <span className="nav-logo-text">ILAL</span>
      </a>

      {/* Desktop Links */}
      <div className="nav-links">
        <a href="#features" className="nav-link">Protocol</a>
        <a href="#pipeline" className="nav-link">How it works</a>
        <a href="#integration" className="nav-link">Integration</a>
        <a href="#deployments" className="nav-link">Deployments</a>
      </div>

      {/* Theme Toggle */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        type="button"
      >
        <div className="theme-toggle-thumb">
          <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1 }}>&#9790;</span>
        </div>
      </button>

      {/* CTA */}
      <a href="#cta" className="btn-primary" style={{ padding: "8px 20px", fontSize: 12, borderRadius: 30 }}>
        Request Access
      </a>
    </nav>
  );
}
