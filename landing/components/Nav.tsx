"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();
  
  const links = [
    { href: "/about", label: "About" },
    { href: "/technology", label: "Technology" },
    { href: "/integrations", label: "Integrations" },
    { href: "/roadmap", label: "Roadmap" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-7 h-7 bg-[#2962FF] rounded-md flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="font-bold text-white text-sm">I</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">ILAL</span>
        </Link>
        <div className="hidden md:flex items-center space-x-8 text-sm">
          {links.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className={`transition-colors relative ${
                pathname === link.href 
                  ? 'text-white font-medium' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <div className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[#2962FF]" />
              )}
            </Link>
          ))}
          <a href="https://github.com/rpnny/ILAL-mvp" className="text-gray-400 hover:text-white transition-colors flex items-center group">
            Docs <ExternalLink className="w-3 h-3 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </nav>
  );
}
