"use client";

import Link from "next/link";
import Image from "next/image";
import {
    Facebook, MessageCircle, Mail, MapPin, Phone,
    Clock, ArrowRight, Github, Twitter, Linkedin
} from "lucide-react";

export default function Footer() {
    const year = new Date().getFullYear();

    const FOOTER_LINKS = [
        {
            title: "Product",
            links: [
                { label: "Features", href: "/pages/features" },
                { label: "Inventory", href: "/dashboard" },
                { label: "POS System", href: "/pages/features" },
                { label: "Analytics", href: "/pages/features" },
            ]
        },
        {
            title: "Support",
            links: [
                { label: "Documentation", href: "/pages/docs" },
                { label: "Guides", href: "/pages/docs" },
                { label: "Contact Us", href: "/pages/contact" },
                { label: "Status", href: "#" },
            ]
        }
    ];

    return (
        <footer className="relative bg-[#0f172a] overflow-hidden border-t border-white/5">
            {/* Subtle Gradient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

            <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">

                    {/* Brand Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <Link href="/" className="flex items-center gap-3 no-underline group">
                            <div className="relative w-10 h-10">
                                <Image
                                    src="/images/logo.png"
                                    alt="SariSari IMS"
                                    fill
                                    className="object-contain rounded-xl group-hover:scale-105 transition-transform"
                                />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="font-black text-[1.2rem] tracking-tight text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                                    SariSari<span className="text-blue-500">.</span>IMS
                                </span>
                                <span className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-white/40 mt-1">
                                    Inventory Management
                                </span>
                            </div>
                        </Link>

                        <p className="text-slate-400 text-[0.92rem] leading-relaxed max-w-[320px]">
                            Empowering local retail with enterprise-grade inventory tools.
                            Streamline your operations, track sales, and grow your business with ease.
                        </p>

                        <div className="flex gap-3">
                            {[
                                { icon: <Facebook size={18} />, color: "hover:text-[#1877F2]" },
                                { icon: <Twitter size={18} />, color: "hover:text-[#1DA1F2]" },
                                { icon: <Github size={18} />, color: "hover:text-white" },
                            ].map((social, i) => (
                                <a key={i} href="#" className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 transition-all ${social.color} hover:bg-white/10`}>
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links Sections */}
                    {FOOTER_LINKS.map((group) => (
                        <div key={group.title} className="lg:col-span-1">
                            <h4 className="text-white font-bold text-[0.85rem] uppercase tracking-widest mb-6">{group.title}</h4>
                            <ul className="space-y-4 p-0 list-none">
                                {group.links.map((link) => (
                                    <li key={link.label}>
                                        <Link href={link.href} className="text-slate-400 hover:text-blue-400 text-[0.9rem] transition-colors no-underline flex items-center group">
                                            {link.label}
                                            <ArrowRight size={12} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-2 transition-all" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Contact Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <h4 className="text-white font-bold text-[0.85rem] uppercase tracking-widest mb-6">Contact</h4>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 text-slate-400">
                                <MapPin size={18} className="text-blue-500 mt-1 shrink-0" />
                                <span className="text-[0.9rem]">Quezon City, Metro Manila, Philippines</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <Phone size={18} className="text-blue-500 shrink-0" />
                                <span className="text-[0.9rem]">+63 994 5953 073</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <Mail size={18} className="text-blue-500 shrink-0" />
                                <span className="text-[0.9rem]">support@sarisari-ims.com</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-[0.8rem]">
                        © {year} <span className="text-slate-400 font-semibold">SariSari.IMS</span>. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                       <small className="text-slate-400">Made with Care</small>
                    </div>
                </div>
            </div>
        </footer>
    );
}