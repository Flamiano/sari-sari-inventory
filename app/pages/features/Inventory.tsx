"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Package, Tag, ImageIcon, Layers, FileText, FileSpreadsheet, Search, TrendingUp } from "lucide-react";

const BULLETS = [
    { icon: <Layers size={15} />, title: "Categories & Subcategories", desc: "Organize products under Almusal, Meryenda, Sari-Sari, and more with subcategory tags.", color: "#10B981" },
    { icon: <Tag size={15} />, title: "Market Price vs. Selling Price", desc: "Track both prices per product so profit margin is always visible at a glance.", color: "#3B82F6" },
    { icon: <ImageIcon size={15} />, title: "Product Image Uploads", desc: "Attach images to each product for quicker identification at the counter.", color: "#8B5CF6" },
    { icon: <TrendingUp size={15} />, title: "Profit Margin Per Item", desc: "Automatically calculates profit per unit based on market vs. selling price.", color: "#F59E0B" },
    { icon: <Search size={15} />, title: "Full-Text Search", desc: "Find any product instantly with real-time search powered by Postgres FTS.", color: "#EF4444" },
    { icon: <FileText size={15} />, title: "Bulk Management", desc: "Add, edit, or archive products in bulk — no need to touch each one individually.", color: "#06B6D4" },
];

export default function InventoryFeature() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Package size={24} style={{ color: "#10B981" }} />
                </div>
                <div>
                    <h2 className="font-black text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Smart Inventory
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: "#64748B", maxWidth: 520 }}>
                        Manage every product in your store — from sachets to bulk goods — with full pricing and stock visibility.
                    </p>
                </div>
            </div>

            {/* Hero screenshots side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
                {[
                    { src: "/images/inventory/1.png", caption: "Product catalog view", badge: "Live", badgeColor: "#10B981" },
                    { src: "/images/inventory/2.png", caption: "Stock & pricing detail", badge: "Editable", badgeColor: "#3B82F6" },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                        className="relative rounded-3xl overflow-hidden border shadow-xl"
                        style={{ borderColor: "#E2E8F0" }}>
                        <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                            <Image src={s.src} alt={s.caption} fill className="object-cover object-top" sizes="(max-width:768px) 100vw, 450px" priority={i === 0} />
                        </div>
                        <div className="absolute top-3 left-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: s.badgeColor, color: "white" }}>
                                {s.badge}
                            </span>
                        </div>
                        <div className="px-4 py-3 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <span className="text-xs font-semibold" style={{ color: "#64748B" }}>{s.caption}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

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

            {/* Export section */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="rounded-3xl p-6 sm:p-8 border"
                style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)", borderColor: "#A7F3D0" }}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "#10B981", color: "white" }}>
                        <FileText size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-base" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#065F46" }}>Export Your Inventory</h3>
                        <p className="text-xs" style={{ color: "#047857" }}>Download your full product list in multiple formats</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { src: "/images/inventory/pdf.png", label: "PDF Export", icon: <FileText size={14} />, color: "#EF4444", bg: "#FEF2F2" },
                        { src: "/images/inventory/excel.png", label: "Excel Export", icon: <FileSpreadsheet size={14} />, color: "#10B981", bg: "#F0FDF4" },
                    ].map((e, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border bg-white shadow-sm"
                            style={{ borderColor: "#E2E8F0" }}>
                            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                                <Image src={e.src} alt={e.label} fill className="object-cover object-top" sizes="400px" />
                            </div>
                            <div className="px-4 py-3 flex items-center gap-2 border-t" style={{ borderColor: "#F1F5F9" }}>
                                <span style={{ color: e.color }}>{e.icon}</span>
                                <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{e.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}