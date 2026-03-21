"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Users, UserPlus, Shield, Clock, Edit3, Trash2, Eye, CheckCircle2 } from "lucide-react";

const CRUD_ITEMS = [
    { icon: <UserPlus size={16} />, label: "Add Staff", desc: "Create cashier or staff-worker accounts with name, email, role, and PIN code.", color: "#10B981" },
    { icon: <Edit3 size={16} />, label: "Edit Staff", desc: "Update any staff member's details, role, or permissions at any time.", color: "#3B82F6" },
    { icon: <Eye size={16} />, label: "View Staff", desc: "See all staff profiles, their roles, status (active/inactive), and last active time.", color: "#8B5CF6" },
    { icon: <Trash2 size={16} />, label: "Delete Staff", desc: "Remove staff accounts when they leave, with full audit trail preserved.", color: "#EF4444" },
];

const ATTENDANCE_ITEMS = [
    { icon: <Clock size={15} />, title: "Time In Recording", desc: "Automatically logs when a staff member starts their shift via dashboard login.", color: "#3B82F6" },
    { icon: <CheckCircle2 size={15} />, title: "Time Out Recording", desc: "Records exact logout time so you know the full shift duration for each staff.", color: "#10B981" },
    { icon: <Eye size={15} />, title: "Attendance History", desc: "Owner can view full attendance logs per staff — date, time in, time out, duration.", color: "#8B5CF6" },
    { icon: <Shield size={15} />, title: "Role-Based Permissions", desc: "Cashiers only access POS. Staff workers access inventory. Owners see everything.", color: "#F59E0B" },
];

export default function StaffFeature() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Users size={24} style={{ color: "#EF4444" }} />
                </div>
                <div>
                    <h2 className="font-black text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Staff & Access Control
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: "#64748B", maxWidth: 540 }}>
                        Full CRUD for your team, role-based permissions, and built-in attendance tracking — all in one place.
                    </p>
                </div>
            </div>

            {/* Screenshots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-12">
                {[
                    { src: "/images/staff/1.png", caption: "Staff directory — view all team members", badge: "Owner View" },
                    { src: "/images/staff/2.png", caption: "Attendance log — time in & time out per staff", badge: "Attendance" },
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
                                style={{ background: i === 0 ? "#EF4444" : "#3B82F6", color: "white" }}>
                                {s.badge}
                            </span>
                        </div>
                        <div className="px-4 py-3 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <span className="text-xs font-semibold" style={{ color: "#64748B" }}>{s.caption}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* CRUD section */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="rounded-3xl p-6 sm:p-8 mb-10 border"
                style={{ background: "linear-gradient(135deg, #FFF5F5 0%, #FEF2F2 100%)", borderColor: "#FECACA" }}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "#EF4444", color: "white" }}>
                        <Users size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-base" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#7F1D1D" }}>
                            Full Staff CRUD — Owner Only
                        </h3>
                        <p className="text-xs" style={{ color: "#991B1B" }}>Owners have complete control over all staff accounts</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CRUD_ITEMS.map((item, i) => (
                        <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                            className="rounded-2xl p-4 bg-white border"
                            style={{ borderColor: "#E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                                style={{ background: `${item.color}15`, color: item.color }}>
                                {item.icon}
                            </div>
                            <div className="font-bold text-sm mb-1" style={{ color: "#0F172A" }}>{item.label}</div>
                            <div className="text-[0.72rem] leading-relaxed" style={{ color: "#64748B" }}>{item.desc}</div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Attendance & permissions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ATTENDANCE_ITEMS.map((item, i) => (
                    <motion.div key={item.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                        className="rounded-2xl p-5 border bg-white flex items-start gap-4"
                        style={{ borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${item.color}12`, color: item.color }}>
                            {item.icon}
                        </div>
                        <div>
                            <div className="font-bold text-sm mb-1" style={{ color: "#0F172A" }}>{item.title}</div>
                            <div className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{item.desc}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Permission matrix */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="mt-8 rounded-2xl border overflow-hidden"
                style={{ borderColor: "#E2E8F0" }}>
                <div className="px-5 py-4 border-b flex items-center gap-2"
                    style={{ borderColor: "#F1F5F9", background: "#F8FAFC" }}>
                    <Shield size={14} style={{ color: "#8B5CF6" }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#64748B" }}>Permission Matrix</span>
                </div>
                <div className="overflow-x-auto">
                    <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#F8FAFC" }}>
                                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #F1F5F9" }}>Module</th>
                                {["Owner", "Cashier", "Staff Worker"].map(role => (
                                    <th key={role} style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #F1F5F9" }}>{role}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { module: "Dashboard", owner: true, cashier: false, staff: false },
                                { module: "Analytics", owner: true, cashier: false, staff: false },
                                { module: "Inventory", owner: true, cashier: false, staff: true },
                                { module: "Point of Sale", owner: true, cashier: true, staff: false },
                                { module: "Staff Management", owner: true, cashier: false, staff: false },
                                { module: "Sales History", owner: true, cashier: false, staff: false },
                            ].map((row, i) => (
                                <tr key={row.module} style={{ background: i % 2 === 0 ? "white" : "#FAFBFC" }}>
                                    <td style={{ padding: "10px 16px", fontWeight: 600, color: "#0F172A", borderBottom: "1px solid #F1F5F9" }}>{row.module}</td>
                                    {[row.owner, row.cashier, row.staff].map((has, j) => (
                                        <td key={j} style={{ padding: "10px 16px", textAlign: "center", borderBottom: "1px solid #F1F5F9" }}>
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                width: 22, height: 22, borderRadius: 8,
                                                background: has ? "#DCFCE7" : "#FEF2F2",
                                                color: has ? "#16A34A" : "#DC2626",
                                                fontSize: 13, fontWeight: 700,
                                            }}>
                                                {has ? "✓" : "✕"}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}