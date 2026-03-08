"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Lock, Database, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        h1, h2 { font-family: 'Syne', sans-serif; }
        @keyframes gridFloat { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
      `}</style>

            <div className="min-h-screen flex">
                {/* ── LEFT PANEL (Matching Register Sidebar) ── */}
                <aside className="hidden lg:flex w-[380px] xl:w-[420px] flex-shrink-0 flex-col relative overflow-hidden"
                    style={{ background: "linear-gradient(155deg, #050E1F 0%, #13294b 45%, #0e4d2e 100%)" }}>

                    <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 30s linear infinite" }} />

                    <div className="relative z-10 flex flex-col h-full p-10">
                        <Link href="/auth/register" className="flex items-center gap-3 no-underline mb-auto group">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                <ArrowLeft size={16} className="text-white" />
                            </div>
                            <span className="text-white/70 font-bold text-sm">Back to Register</span>
                        </Link>

                        <div className="my-auto">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                                <ShieldCheck size={32} className="text-emerald-400" />
                            </div>
                            <h2 className="text-3xl font-black text-white leading-tight mb-4">
                                Your data is <span className="text-emerald-400">secured.</span>
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed">
                                We use industry-standard encryption to ensure your store's sales, inventory, and utang records remain private and protected.
                            </p>
                        </div>

                        <div className="mt-auto text-white/20 text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                            Privacy & Protection Policy
                        </div>
                    </div>
                </aside>

                {/* ── RIGHT PANEL (Content) ── */}
                <main className="flex-1 bg-[#F7F9FC] overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="max-w-[680px] mx-auto py-16 px-8"
                    >
                        <div className="mb-12">
                            <p className="text-emerald-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Legal Docs</p>
                            <h1 className="text-4xl text-slate-900 font-black mb-4 tracking-tight">Privacy Policy</h1>
                            <p className="text-slate-500">Last updated: March 2026</p>
                        </div>

                        <div className="space-y-10">
                            <Section icon={<Database size={18} />} title="Data Collection">
                                When you register your store, we collect your <strong>Store Name</strong>, <strong>Full Name</strong>, and <strong>Email Address</strong>. As you use the app, we securely store your product inventory, transaction history, and customer "utang" records to provide the IMS functionality.
                            </Section>

                            <Section icon={<Lock size={18} />} title="Data Security">
                                Your financial data is protected via Supabase Row Level Security (RLS). This means even though data lives in the cloud, only your authenticated account has the "key" to view or modify your store's specific records.
                            </Section>

                            <Section icon={<Eye size={18} />} title="Data Usage">
                                We do not sell or trade your data. We use your information strictly to provide dashboard analytics, inventory alerts, and to maintain your digital <i>tindahan</i> records.
                            </Section>
                        </div>
                    </motion.div>
                </main>
            </div>
        </>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
    return (
        <div className="relative pl-12">
            <div className="absolute left-0 top-0 w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
            <div className="text-slate-500 text-[0.92rem] leading-relaxed">
                {children}
            </div>
        </div>
    );
}