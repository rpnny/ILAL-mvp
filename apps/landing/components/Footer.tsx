import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-white/5 py-12 bg-[#0A0A0A]">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-sm">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center space-x-3 mb-4 group">
                            <div className="w-6 h-6 bg-gradient-to-br from-[#00F0FF] to-[#A855F7] rounded flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                <span className="font-heading font-bold text-white text-[11px] tracking-widest">I</span>
                            </div>
                            <span className="font-heading text-lg font-bold tracking-widest text-white">ILAL</span>
                        </Link>
                        <p className="text-gray-500 mb-4 pr-4">
                            Zero-knowledge compliance infrastructure layer for Uniswap V4.
                        </p>
                        <div className="flex space-x-3">
                            <a href="https://github.com/rpnny/ILAL-mvp" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-primary hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                                <Github className="w-4 h-4" />
                            </a>
                            <a href="https://x.com/ilal_protocol" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-primary hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                                <Twitter className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Developers */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Developers</h4>
                        <ul className="space-y-3 text-gray-400">
                            <li><Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link></li>
                            <li><Link href="/technology" className="hover:text-primary transition-colors">Architecture</Link></li>
                            <li><Link href="/integrations" className="hover:text-primary transition-colors">Integration Guide</Link></li>
                            <li><a href="https://github.com/rpnny/ILAL-mvp" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a></li>
                        </ul>
                    </div>

                    {/* Ecosystem */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Ecosystem</h4>
                        <ul className="space-y-3 text-gray-400">
                            <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
                            <li><Link href="/roadmap" className="hover:text-primary transition-colors">Roadmap</Link></li>
                            <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-3 text-gray-400">
                            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                            <li><a href="mailto:contact@ilal.tech" className="hover:text-primary transition-colors">Contact</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600">
                    <p>&copy; {new Date().getFullYear()} ILAL Protocol. All rights reserved.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
                        <a href="https://github.com/rpnny/ILAL-mvp/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">Apache-2.0</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
