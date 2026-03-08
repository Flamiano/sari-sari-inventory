"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
    LayoutDashboard, Package, Users, ShoppingCart,
    BarChart3, History, Zap, Shield, Globe, TrendingUp,
    CheckCircle2, ArrowRight, Sparkles, Lock, Clock, Bell
} from "lucide-react";
import Navbar from "@/app/comps/navbar/page";
import Footer from "@/app/comps/footer/page";

const FEATURES = [
    {
        icon: <LayoutDashboard size={24} />,
        title: "Intuitive Dashboard",
        desc: "Get a bird's-eye view of your entire store — revenue, top products, recent transactions, and low-stock alerts, all in one glance.",
        gradient: "from-blue-500 to-indigo-600",
        bullets: ["Live revenue snapshot", "Top-selling products", "Low stock alerts", "Daily transaction count"],
    },
    {
        icon: <Package size={24} />,
        title: "Smart Inventory",
        desc: "Manage your entire product catalog with ease. Set prices, track stock levels, and organize by category and subcategory.",
        gradient: "from-violet-500 to-purple-600",
        bullets: ["Product categories & subcategories", "Market price vs. selling price", "Image uploads per product", "Bulk stock management"],
        badge: "New",
    },
    {
        icon: <ShoppingCart size={24} />,
        title: "Point of Sale",
        desc: "Built for speed. Add items to cart, compute change automatically, and record transactions in seconds — no training needed.",
        gradient: "from-amber-400 to-orange-500",
        bullets: ["Fast product search", "Automatic change computation", "Transaction receipts", "Auto stock deduction"],
    },
    {
        icon: <Users size={24} />,
        title: "Supplier Directory",
        desc: "Keep all your vendor contacts organized. Track supplier types, contact info, and notes about main items supplied.",
        gradient: "from-emerald-500 to-teal-600",
        bullets: ["Supplier contact management", "Supplier type tagging", "Notes & main items field", "Quick search & filter"],
    },
    {
        icon: <History size={24} />,
        title: "Sales History",
        desc: "Every transaction is recorded. Review past sales, filter by date, and analyze which products are your top earners.",
        gradient: "from-rose-500 to-pink-600",
        bullets: ["Full transaction log", "Per-item profit tracking", "Date-range filtering", "Transaction references"],
    },
    {
        icon: <BarChart3 size={24} />,
        title: "Analytics & Reports",
        desc: "Turn your sales data into actionable insights. See trends, profit margins, and product performance over time.",
        gradient: "from-cyan-500 to-blue-500",
        bullets: ["Revenue over time charts", "Profit margin analysis", "Category performance", "Exportable reports"],
    },
    {
        icon: <Shield size={24} />,
        title: "Role-Based Access",
        desc: "Owner and staff accounts with separate permissions. You control who sees what — secure and flexible.",
        gradient: "from-slate-600 to-slate-800",
        bullets: ["Owner & staff roles", "Permission controls", "Secure Supabase Auth", "Session management"],
    },
    {
        icon: <Bell size={24} />,
        title: "Stock Alerts",
        desc: "Never run out of bestsellers. Get notified when products hit low-stock thresholds so you can reorder on time.",
        gradient: "from-yellow-400 to-amber-500",
        bullets: ["Threshold-based alerts", "Dashboard notifications", "Critical stock highlighting", "Reorder reminders"],
    },
    {
        icon: <Globe size={24} />,
        title: "Cloud Sync",
        desc: "Access your store data from any device, anytime. Everything syncs in real time across desktop and mobile browsers.",
        gradient: "from-indigo-500 to-blue-600",
        bullets: ["Real-time data sync", "Multi-device access", "No installs needed", "Always up-to-date"],
    },
];

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-syne">
            <Navbar />
            {/* Hero */}
            <div className="bg-[#0c1322] relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.15) 0%, transparent 70%)" }} />
                <div className="max-w-[1100px] mx-auto px-6 py-16 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
                            <Sparkles size={12} className="text-blue-400" />
                            <span className="text-blue-400 text-[0.68rem] font-bold uppercase tracking-[0.18em]">Platform Features</span>
                        </div>
                        <h1 className="text-white font-black text-3xl md:text-5xl leading-tight mb-4">
                            Everything your store needs, <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">built into one platform.</span>
                        </h1>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-[540px] mb-8">
                            Marilyn's Retail Pro gives you the tools to run a smarter sari-sari store — from inventory and POS to analytics and supplier management.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/auth/login" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-7 py-3 rounded-xl transition-all duration-300 shadow-lg">
                                <Lock size={14} /> Get Started
                            </Link>
                            <Link href="/pages/docs" className="flex items-center gap-2 text-sm font-bold px-7 py-3 rounded-xl transition-all duration-300" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                                Read the Docs
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Feature count strip */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-[1100px] mx-auto px-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
                        {[
                            { val: "9+", label: "Core Features" },
                            { val: "100%", label: "Cloud-Based" },
                            { val: "2", label: "User Roles" },
                            { val: "∞", label: "Transactions" },
                        ].map((s) => (
                            <div key={s.label} className="text-center py-5 px-4">
                                <div className="font-black text-[1.7rem] text-blue-600 leading-none mb-1">{s.val}</div>
                                <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-[1100px] mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.06 }}
                            whileHover={{ y: -4 }}
                            className="group bg-white border border-slate-200 hover:border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:shadow-blue-50 transition-all duration-300"
                        >
                            {/* Top bar accent */}
                            <div className={`h-[3px] w-full rounded-full bg-gradient-to-r ${f.gradient} mb-5 opacity-80`} />
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                    {f.icon}
                                </div>
                                {f.badge && (
                                    <span className="bg-violet-50 border border-violet-200 text-violet-600 text-[0.55rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                                        {f.badge}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-900 text-[1rem] mb-2 group-hover:text-blue-600 transition-colors">{f.title}</h3>
                            <p className="text-slate-500 text-[0.85rem] leading-relaxed mb-5">{f.desc}</p>
                            <ul className="space-y-2">
                                {f.bullets.map((b) => (
                                    <li key={b} className="flex items-center gap-2 text-[0.8rem] text-slate-600">
                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="bg-[#0c1322] relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
                <div className="max-w-[1100px] mx-auto px-6 py-20 text-center relative z-10">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
                            <Zap size={12} className="text-blue-400" />
                            <span className="text-blue-400 text-[0.68rem] font-bold uppercase tracking-[0.18em]">Start Today</span>
                        </div>
                        <h2 className="text-white font-black text-3xl md:text-4xl mb-4">Ready to modernize your tindahan?</h2>
                        <p className="text-slate-400 text-lg max-w-[460px] mx-auto mb-8">Log in to your dashboard and start managing your store like a pro.</p>
                        <Link href="/auth/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-10 py-4 rounded-2xl transition-all duration-300 shadow-2xl shadow-blue-900/30 hover:-translate-y-0.5">
                            <Lock size={16} /> Access Dashboard <ArrowRight size={16} />
                        </Link>
                    </motion.div>
                </div>
            </div>
            <Footer />
        </div>
    );
}