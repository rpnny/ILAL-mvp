import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-white/5 py-12 bg-[#0A0A0A]">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-sm">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center space-x-3 mb-4 group">
                            <div className="w-6 h-6 bg-gradient-to-br from-[#00F0FF] to-[#A855F7] rounded flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                <span className="font-heading font-bold text-white text-[11px] tracking-widest">N</span>
                            </div>
                            <span className="font-heading text-lg font-bold tracking-widest text-white">ILAL</span>
                        </Link>
                        <p className="text-gray-500 mb-4 pr-4">
                            Zero-knowledge compliance infrastructure layer for Uniswap V4.
                        </p>
                    </div>

                    {/* Docs */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Developers</h4>
                        <ul className="space-y-3 text-gray-400">
                            <li><Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link></li>
                            <li><Link href="/technology" className="hover:text-primary transition-colors">Architecture</Link></li>
                            <li><Link href="/integrations" className="hover:text-primary transition-colors">Integration Guide</Link></li>
                        </ul>
                    </div>

                    {/* Social / Ecosystem */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Ecosystem</h4>
                        <ul className="space-y-3 text-gray-400">
                            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
                            <li><a href="#" className="hover:text-primary transition-colors flex items-center">Media Kit</a></li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Connect</h4>
                        <div className="flex space-x-4">
                            <a href="https://github.com/rpnny/ILAL-mvp" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-primary hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                                <Github className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-primary hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                                <Twitter className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600">
                    <p>© 2026 ILAL Protocol. All rights reserved.</p>
                    <div className="flex space-x-4 mt-4 md:mt-0">
                        <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
