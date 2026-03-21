"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BarChart3, TrendingUp, PieChart, Award, Calendar, FileText } from "lucide-react";

const BULLETS = [
    { icon: <TrendingUp size={15} />, title: "Revenue Over Time", desc: "Line and bar charts showing daily, weekly, and monthly revenue trends.", color: "#8B5CF6" },
    { icon: <PieChart size={15} />, title: "Category Breakdown", desc: "See which product categories contribute the most to your bottom line.", color: "#3B82F6" },
    { icon: <Award size={15} />, title: "Best-Selling Products", desc: "Ranked list of your top earners by quantity sold and profit generated.", color: "#F59E0B" },
    { icon: <BarChart3 size={15} />, title: "Profit Margin Analysis", desc: "Compare market price vs. selling price across your entire catalog.", color: "#10B981" },
    { icon: <Calendar size={15} />, title: "Date-Range Filtering", desc: "Filter all charts and reports by custom date ranges — daily to monthly.", color: "#EF4444" },
    { icon: <FileText size={15} />, title: "Exportable Reports", desc: "Download your analytics as PDF, Excel, or CSV for record-keeping.", color: "#06B6D4" },
];

const SCREENSHOTS = [
    { src: "/images/analytics/1.png", caption: "Revenue overview charts" },
    { src: "/images/analytics/2.png", caption: "Category performance" },
    { src: "/images/analytics/3.png", caption: "Product profit breakdown" },
    { src: "/images/analytics/4.png", caption: "Date range filter view" },
];

export default function AnalyticsFeature() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <BarChart3 size={24} style={{ color: "#8B5CF6" }} />
                </div>
                <div>
                    <h2 className="font-black text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Analytics & Reports
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: "#64748B", maxWidth: 520 }}>
                        Turn raw sales data into clear, visual insights that drive smarter business decisions.
                    </p>
                </div>
            </div>

            {/* Hero screenshot */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="relative rounded-3xl overflow-hidden mb-10 shadow-2xl border"
                style={{ borderColor: "#E2E8F0" }}>
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                    <Image src="/images/analytics/1.png" alt="Analytics overview" fill className="object-cover object-top" sizes="900px" priority />
                </div>
                <div className="absolute top-4 right-4">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{ background: "rgba(139,92,246,0.9)", color: "white", backdropFilter: "blur(8px)" }}>
                        Business Intelligence
                    </span>
                </div>
            </motion.div>

            {/* Bullets */}
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

            {/* Screenshot grid 2x2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {SCREENSHOTS.slice(1).map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                        className="rounded-2xl overflow-hidden border shadow-sm"
                        style={{ borderColor: "#E2E8F0" }}>
                        <div className="relative w-full" style={{ aspectRatio: "16/10" }}>
                            <Image src={s.src} alt={s.caption} fill className="object-cover object-top" sizes="450px" />
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