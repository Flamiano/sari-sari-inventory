"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
    LayoutDashboard, Package, Users, ShoppingCart,
    BarChart3, History, X, Settings, ChevronRight, Quote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface NavItem {
    id: string;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    accent: string;
    accentBg: string;
    accentText: string;
    badge?: string;
}

interface SidebarProps {
    activeTab: string;
    setActiveTab: (id: string) => void;
    closeMobile: () => void;
    // Pass true only after client has mounted & restored sessionStorage tab.
    // Prevents SSR→client hydration mismatch on active-item styles.
    mounted?: boolean;
}

// Nav items
const NAV: NavItem[] = [
    {
        id: "dashboard",
        label: "Overview",
        sublabel: "Store summary",
        icon: LayoutDashboard,
        accent: "from-blue-500 to-indigo-500",
        accentBg: "bg-blue-500/10",
        accentText: "text-blue-500",
    },
    {
        id: "products",
        label: "Inventory",
        sublabel: "Stock management",
        icon: Package,
        accent: "from-violet-500 to-fuchsia-600",
        accentBg: "bg-violet-500/10",
        accentText: "text-violet-500",
        badge: "New",
    },
    {
        id: "suppliers",
        label: "Suppliers",
        sublabel: "Vendor relations",
        icon: Users,
        accent: "from-emerald-500 to-teal-500",
        accentBg: "bg-emerald-500/10",
        accentText: "text-emerald-500",
    },
    {
        id: "pos",
        label: "Point of Sale",
        sublabel: "Quick checkout",
        icon: ShoppingCart,
        accent: "from-orange-400 to-red-500",
        accentBg: "bg-orange-500/10",
        accentText: "text-orange-500",
    },
    {
        id: "sales",
        label: "Sales History",
        sublabel: "Past transactions",
        icon: History,
        accent: "from-rose-500 to-pink-600",
        accentBg: "bg-rose-500/10",
        accentText: "text-rose-500",
    },
    {
        id: "reports",
        label: "Analytics",
        sublabel: "Performance metrics",
        icon: BarChart3,
        accent: "from-cyan-500 to-blue-600",
        accentBg: "bg-cyan-500/10",
        accentText: "text-cyan-500",
    },
];

const QUOTES = [
    "Small coins build big dreams.",
    "Quality service, neighborhood trust.",
    "Stock smart, sell fast.",
    "Patience is the key to profit.",
    "Success is in the daily inventory.",
];

export default function Sidebar({ activeTab, setActiveTab, closeMobile, mounted = true }: SidebarProps) {
    const [quoteIndex, setQuoteIndex] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setQuoteIndex(i => (i + 1) % QUOTES.length), 10000);
        return () => clearInterval(t);
    }, []);

    return (
        <aside
            className="w-72 h-full flex flex-col relative overflow-hidden"
            style={{
                background: "linear-gradient(180deg, #080d14 0%, #0d1520 50%, #080d14 100%)",
                borderRight: "1px solid rgba(255,255,255,0.05)",
            }}
        >
            {/* Ambient glow */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
                    filter: "blur(20px)",
                }}
            />

            {/* Branding */}
            <div className="relative px-5 pt-6 pb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="relative w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0"
                        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(37,99,235,0.3)" }}
                    >
                        <Image
                            src="/images/logo.png"
                            alt="Logo"
                            fill
                            className="object-cover"
                            onError={e => {
                                const t = e.currentTarget as HTMLImageElement;
                                t.style.display = "none";
                                const p = t.parentElement;
                                if (p) {
                                    p.style.background = "linear-gradient(135deg, #2563eb, #7c3aed)";
                                    p.innerHTML = `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:1.1rem;">M</span>`;
                                }
                            }}
                        />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-white font-black tracking-tight text-base uppercase">
                            Marilyn&apos;s
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span
                                className="text-[0.55rem] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md"
                                style={{
                                    background: "linear-gradient(90deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))",
                                    border: "1px solid rgba(99,102,241,0.25)",
                                    color: "#818cf8",
                                }}
                            >
                                Retail Pro
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={closeMobile}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Separator */}
            <div
                className="mx-5 mb-5"
                style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }}
            />

            <p className="px-5 text-[0.58rem] font-black uppercase tracking-[0.22em] text-slate-600 mb-2">
                Navigation
            </p>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-none">
                {NAV.map(item => {
                    const Icon = item.icon;
                    // Only apply active styles after client has mounted to prevent hydration mismatch
                    const isActive = mounted && activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (typeof window !== "undefined" && window.innerWidth < 768) closeMobile();
                            }}
                            className="w-full group relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 outline-none"
                            // Use suppressHydrationWarning so React doesn't throw on style mismatch
                            suppressHydrationWarning
                            style={
                                isActive
                                    ? {
                                        background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.08))",
                                        border: "1px solid rgba(99,102,241,0.2)",
                                    }
                                    : { border: "1px solid transparent" }
                            }
                        >
                            {/* Active left bar */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.span
                                        layoutId="navBar"
                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-gradient-to-b ${item.accent}`}
                                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Icon */}
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isActive ? item.accentBg : "bg-slate-800/40 group-hover:bg-slate-700/40"
                                    }`}
                            >
                                <Icon
                                    size={17}
                                    className={
                                        isActive
                                            ? item.accentText
                                            : "text-slate-500 group-hover:text-slate-300 transition-colors"
                                    }
                                />
                            </div>

                            {/* Labels */}
                            <div className="flex-1 min-w-0 text-left">
                                <p
                                    className={`text-[0.82rem] font-bold leading-none transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                        }`}
                                >
                                    {item.label}
                                </p>
                                <p className="text-[0.62rem] text-slate-600 mt-0.5 font-medium group-hover:text-slate-500 transition-colors">
                                    {item.sublabel}
                                </p>
                            </div>

                            {/* Badge or chevron */}
                            {item.badge ? (
                                <span
                                    className="text-[0.52rem] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(37,99,235,0.3))",
                                        border: "1px solid rgba(99,102,241,0.3)",
                                        color: "#a78bfa",
                                    }}
                                >
                                    {item.badge}
                                </span>
                            ) : (
                                <ChevronRight
                                    size={13}
                                    className={`transition-all duration-200 ${isActive
                                            ? "text-slate-400 opacity-100"
                                            : "text-slate-700 opacity-0 group-hover:opacity-100 group-hover:text-slate-500"
                                        }`}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom separator */}
            <div
                className="mx-5 mt-4 mb-4"
                style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }}
            />

            {/* Footer area */}
            <div className="mt-auto px-4 pb-6 space-y-4">
                {/* Quote */}
                <div className="px-2">
                    <div className="flex items-start gap-2 opacity-40">
                        <Quote size={10} className="text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-[0.6rem] font-medium italic text-slate-500 leading-tight">
                            &ldquo;{QUOTES[quoteIndex]}&rdquo;
                        </p>
                    </div>
                </div>

                {/* Store card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    <div
                        className="relative overflow-hidden rounded-2xl p-3.5 flex items-center gap-3 bg-[#0f172a]/80 border border-white/5 backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-white/10"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all duration-300">
                            <Image
                                src="/images/2.png"
                                alt="Store"
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={e => {
                                    const t = e.currentTarget as HTMLImageElement;
                                    t.style.display = "none";
                                    const p = t.parentElement;
                                    if (p) {
                                        p.style.background = "linear-gradient(135deg, #1e293b, #0f172a)";
                                        p.innerHTML = `<span class="flex items-center justify-center h-full text-lg">🏪</span>`;
                                    }
                                }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.15em] leading-none">
                                System Engine
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </div>
                                <span className="text-[0.7rem] font-black text-emerald-400 tracking-wide uppercase">
                                    Operational
                                </span>
                            </div>
                        </div>
                        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                            <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </div>

                {/* Version */}
                <div className="flex items-center justify-center gap-3">
                    <div className="h-[1px] w-4 bg-slate-800" />
                    <p className="text-[0.55rem] font-black uppercase tracking-[0.25em] text-slate-600">
                        MS-v2.0.4
                    </p>
                    <div className="h-[1px] w-4 bg-slate-800" />
                </div>
            </div>
        </aside>
    );
}