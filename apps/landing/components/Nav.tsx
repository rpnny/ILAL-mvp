"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/technology", label: "Technology" },
    { href: "/integrations", label: "Integrations" },
    { href: "/docs", label: "Docs" },
    { href: "/roadmap", label: "Roadmap" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 bg-gradient-to-br from-[#00F0FF] to-[#A855F7] rounded-md flex items-center justify-center group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <span className="font-heading font-bold text-white text-[15px] tracking-wide">I</span>
          </div>
          <span className="font-heading text-xl font-bold tracking-widest text-white">ILAL</span>
        </Link>

        {/* Middle: Desktop Links */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors relative hover-lift ${
                pathname === link.href ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <div className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
              )}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-4">
          <button className="hidden lg:flex items-center text-gray-400 hover:text-white transition-colors">
            <Globe className="w-4 h-4 mr-1" />
            <span className="text-xs font-medium">EN</span>
          </button>

          <Link href="/dashboard" className="hidden sm:block">
            <button className="glass-button glass-button-primary px-5 py-2 text-sm">
              Try Demo
            </button>
          </Link>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/5 bg-[#0A0A0A]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container mx-auto px-6 py-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "text-primary bg-primary/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block mt-3"
              >
                <button className="w-full glass-button glass-button-primary px-5 py-3 text-sm">
                  Try Demo
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
