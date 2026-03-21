"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { LayoutDashboard, TrendingUp, AlertTriangle, ShoppingBag, RefreshCw, Eye, BarChart2 } from "lucide-react";

const BULLETS = [
    { icon: <TrendingUp size={15} />, title: "Live Revenue Snapshot", desc: "See today's total sales and profit at a glance — updates in real time as transactions are processed.", color: "#3B82F6" },
    { icon: <AlertTriangle size={15} />, title: "Low Stock Alerts", desc: "Dashboard highlights products nearing zero so you can reorder before running out.", color: "#F59E0B" },
    { icon: <ShoppingBag size={15} />, title: "Daily Transaction Count", desc: "Track how many sales have been completed today, broken down by cashier.", color: "#10B981" },
    { icon: <RefreshCw size={15} />, title: "Real-Time Sync", desc: "Every metric refreshes automatically — no manual refresh needed.", color: "#8B5CF6" },
    { icon: <Eye size={15} />, title: "Top-Selling Products", desc: "See which items are moving fastest and making the most profit.", color: "#EF4444" },
    { icon: <BarChart2 size={15} />, title: "Multi-Period View", desc: "Switch between daily, weekly, and monthly summaries with one click.", color: "#06B6D4" },
];

const SCREENSHOTS = [
    { src: "/images/dashboard/1.png", caption: "Main overview panel" },
    { src: "/images/dashboard/2.png", caption: "Revenue breakdown" },
    { src: "/images/dashboard/3.png", caption: "Stock alert cards" },
];

export default function DashboardFeature() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
                    <LayoutDashboard size={24} style={{ color: "#3B82F6" }} />
                </div>
                <div>
                    <h2 className="font-black text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Intuitive Dashboard
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: "#64748B", maxWidth: 520 }}>
                        Your store's control center — everything important visible the moment you log in.
                    </p>
                </div>
            </div>

            {/* Main screenshot hero */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="relative rounded-3xl overflow-hidden mb-10 shadow-2xl border"
                style={{ borderColor: "#E2E8F0" }}>
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                    <Image src="/images/dashboard/1.png" alt="Dashboard overview" fill className="object-cover object-top" sizes="(max-width:768px) 100vw, 900px" priority />
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-6 py-5"
                    style={{ background: "linear-gradient(to top, rgba(5,14,31,0.9) 0%, transparent 100%)" }}>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-white text-sm font-semibold">Live — updates every transaction</span>
                    </div>
                </div>
            </motion.div>

            {/* Feature bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {BULLETS.map((b, i) => (
                    <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                        className="rounded-2xl p-5 border bg-white"
                        style={{ borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                            style={{ background: `${b.color}18`, color: b.color }}>
                            {b.icon}
                        </div>
                        <div className="font-bold text-sm mb-1" style={{ color: "#0F172A" }}>{b.title}</div>
                        <div className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{b.desc}</div>
                    </motion.div>
                ))}
            </div>

            {/* Secondary screenshots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {SCREENSHOTS.slice(1).map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                        className="rounded-2xl overflow-hidden border shadow-sm"
                        style={{ borderColor: "#E2E8F0" }}>
                        <div className="relative w-full" style={{ aspectRatio: "16/10" }}>
                            <Image src={s.src} alt={s.caption} fill className="object-cover object-top" sizes="(max-width:768px) 100vw, 450px" />
                        </div>
                        <div className="px-4 py-3 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <span className="text-xs font-semibold" style={{ color: "#64748B" }}>{s.caption}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}