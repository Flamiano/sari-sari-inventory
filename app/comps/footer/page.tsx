"use client";

import Link from "next/link";
import Image from "next/image";
import {
    Mail, MapPin, Phone, ArrowRight,
    Shield, MessageCircle, Store,
    Github, Facebook,
} from "lucide-react";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="relative overflow-hidden border-t"
            style={{ background: "#050E1F", borderColor: "rgba(255,255,255,0.06)" }}>

            {/* Top gradient line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(37,99,235,0.5),transparent)" }} />

            {/* Subtle grid bg */}
            <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-8 relative">

                {/* Main grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-1 space-y-5">
                        <Link href="/" className="flex items-center gap-3 no-underline group">
                            <div className="relative w-9 h-9 flex-shrink-0">
                                <Image src="/images/logo.png" alt="SariSari IMS" fill
                                    className="object-contain rounded-xl group-hover:scale-105 transition-transform duration-300"
                                    sizes="36px" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="font-black text-[1.05rem] tracking-tight text-white"
                                    style={{ fontFamily: "Syne, sans-serif" }}>
                                    SariSari<span className="text-blue-500">.</span>IMS
                                </span>
                                <span className="text-[0.5rem] font-bold uppercase tracking-[0.18em] text-white/35 mt-0.5">
                                    Inventory Management
                                </span>
                            </div>
                        </Link>

                        <p className="text-[0.82rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)", maxWidth: 220 }}>
                            Enterprise-grade inventory management built specifically for Filipino sari-sari stores.
                        </p>

                        {/* IAS badge */}
                        <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border"
                            style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)" }}>
                            <Shield size={11} style={{ color: "#A5B4FC", flexShrink: 0 }} />
                            <span className="text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: "#A5B4FC" }}>
                                IAS Capstone Project
                            </span>
                        </div>

                        {/* Social */}
                        <div className="flex gap-2.5 pt-1">
                            {[
                                { icon: <Facebook size={14} />, href: "#" },
                                { icon: <MessageCircle size={14} />, href: "#" },
                                { icon: <Github size={14} />, href: "#" },
                            ].map((s, i) => (
                                <a key={i} href={s.href}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.15)"; (e.currentTarget as HTMLElement).style.color = "#60A5FA"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}>
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Features */}
                    <div>
                        <h4 className="text-[0.65rem] font-black uppercase tracking-widest mb-5"
                            style={{ color: "rgba(255,255,255,0.3)" }}>
                            Features
                        </h4>
                        <ul className="space-y-3 p-0 list-none m-0">
                            {[
                                { label: "Dashboard", href: "/pages/features?tab=dashboard" },
                                { label: "Inventory", href: "/pages/features?tab=inventory" },
                                { label: "Point of Sale", href: "/pages/features?tab=pos" },
                                { label: "Analytics", href: "/pages/features?tab=analytics" },
                                { label: "Staff & Access", href: "/pages/features?tab=staff" },
                                { label: "Auth & Security", href: "/pages/features?tab=auth" },
                            ].map(link => (
                                <li key={link.label}>
                                    <Link href={link.href}
                                        className="text-[0.82rem] font-medium transition-colors no-underline"
                                        style={{ color: "rgba(255,255,255,0.45)" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fff"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"}>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-[0.65rem] font-black uppercase tracking-widest mb-5"
                            style={{ color: "rgba(255,255,255,0.3)" }}>
                            Resources
                        </h4>
                        <ul className="space-y-3 p-0 list-none m-0">
                            {[
                                { label: "Documentation", href: "/pages/docs" },
                                { label: "Getting Started", href: "/pages/docs?section=getting-started&item=overview" },
                                { label: "Security Guide", href: "/pages/docs?section=auth&item=2fa-login" },
                                { label: "Inventory Guide", href: "/pages/docs?section=inventory&item=add-product" },
                                { label: "POS Guide", href: "/pages/docs?section=pos&item=process-sale" },
                                { label: "Contact Support", href: "/pages/contact" },
                            ].map(link => (
                                <li key={link.label}>
                                    <Link href={link.href}
                                        className="text-[0.82rem] font-medium transition-colors no-underline"
                                        style={{ color: "rgba(255,255,255,0.45)" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fff"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"}>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-[0.65rem] font-black uppercase tracking-widest mb-5"
                            style={{ color: "rgba(255,255,255,0.3)" }}>
                            Contact
                        </h4>
                        <div className="space-y-3.5">
                            {[
                                {
                                    icon: <Mail size={13} />,
                                    label: "johnroelf17@gmail.com",
                                    sub: "Technical Lead",
                                    href: "mailto:johnroelf17@gmail.com",
                                    color: "#3B82F6",
                                },
                                {
                                    icon: <Mail size={13} />,
                                    label: "sarisariims77@gmail.com",
                                    sub: "Technical Support",
                                    href: "mailto:sarisariims77@gmail.com",
                                    color: "#10B981",
                                },
                                {
                                    icon: <Phone size={13} />,
                                    label: "0994 595 3073",
                                    sub: "John Roel Flamiano",
                                    href: "tel:09945953073",
                                    color: "#F59E0B",
                                },
                                {
                                    icon: <MapPin size={13} />,
                                    label: "BCP",
                                    sub: "BCP Store Location",
                                    href: "/pages/contact",
                                    color: "#EF4444",
                                },
                            ].map((item, i) => (
                                <a key={i} href={item.href}
                                    className="flex items-start gap-2.5 no-underline group"
                                    style={{ color: "rgba(255,255,255,0.45)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fff"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"}>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ background: `${item.color}15`, color: item.color }}>
                                        {item.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[0.78rem] font-semibold truncate leading-tight group-hover:text-white transition-colors">
                                            {item.label}
                                        </div>
                                        <div className="text-[0.62rem] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                                            {item.sub}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>

                        {/* CTA */}
                        <Link href="/auth/register"
                            className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold no-underline transition-all"
                            style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "white", boxShadow: "0 4px 14px rgba(37,99,235,0.25)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(37,99,235,0.4)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(37,99,235,0.25)"}>
                            <Store size={12} /> Get Started Free <ArrowRight size={11} />
                        </Link>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px mb-8" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Bottom bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[0.72rem]" style={{ color: "rgba(255,255,255,0.25)" }}>
                        © {year}{" "}
                        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>SariSari.IMS</span>
                        {" "}· All rights reserved.
                    </p>

                    <div className="flex items-center gap-2">
                        <span className="text-[0.6rem] font-medium ml-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                            Made with Care
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}