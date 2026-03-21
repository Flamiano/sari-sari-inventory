"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ShoppingCart, Zap, Calculator, Package, History, Users, CheckCircle } from "lucide-react";

const BULLETS = [
    { icon: <Zap size={15} />, title: "Fast Product Search", desc: "Type-to-search instantly finds products from your entire catalog as you type.", color: "#F59E0B" },
    { icon: <Calculator size={15} />, title: "Automatic Change Computation", desc: "Enter amount paid and the system instantly calculates the change — zero errors.", color: "#3B82F6" },
    { icon: <Package size={15} />, title: "Auto Stock Deduction", desc: "Inventory automatically decreases with every completed sale — no manual entry needed.", color: "#10B981" },
    { icon: <History size={15} />, title: "Transaction Receipts", desc: "Every transaction generates a printable receipt with item breakdown and totals.", color: "#8B5CF6" },
    { icon: <Users size={15} />, title: "Staff & Owner Mode", desc: "Both owners and cashiers can process sales — with separate permission levels.", color: "#EF4444" },
    { icon: <CheckCircle size={15} />, title: "Out-of-Stock Prevention", desc: "Item buttons are disabled when stock is zero — over-selling is impossible.", color: "#06B6D4" },
];

export default function PosFeature() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <ShoppingCart size={24} style={{ color: "#F59E0B" }} />
                </div>
                <div>
                    <h2 className="font-black text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Point of Sale
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: "#64748B", maxWidth: 520 }}>
                        Built for speed and accuracy — process sales in seconds with zero training required.
                    </p>
                </div>
            </div>

            {/* Hero + payment side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-10">
                {/* Main POS screenshot — wider */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-3 relative rounded-3xl overflow-hidden border shadow-xl"
                    style={{ borderColor: "#E2E8F0" }}>
                    <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                        <Image src="/images/pos/1.png" alt="POS interface" fill className="object-cover object-top" sizes="(max-width:768px) 100vw, 560px" priority />
                    </div>
                    <div className="absolute top-3 left-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: "#F59E0B", color: "white" }}>
                            Sales Counter
                        </span>
                    </div>
                    <div className="px-4 py-3 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                        <span className="text-xs font-semibold" style={{ color: "#64748B" }}>Main POS interface — cart, search, and totals</span>
                    </div>
                </motion.div>

                {/* Payment screenshot — narrower */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="lg:col-span-2 relative rounded-3xl overflow-hidden border shadow-xl"
                    style={{ borderColor: "#E2E8F0" }}>
                    <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                        <Image src="/images/pos/payment.png" alt="Payment modal" fill className="object-cover object-top" sizes="(max-width:768px) 100vw, 380px" />
                    </div>
                    <div className="absolute top-3 left-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: "#10B981", color: "white" }}>
                            Payment
                        </span>
                    </div>
                    <div className="px-4 py-3 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                        <span className="text-xs font-semibold" style={{ color: "#64748B" }}>Payment modal with auto change</span>
                    </div>
                </motion.div>
            </div>

            {/* Feature bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
    );
}