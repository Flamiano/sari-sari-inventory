"use client";
import Link from "next/link";
import { ArrowLeft, Scale, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        h1, h2 { font-family: 'Syne', sans-serif; }
        @keyframes gridFloat { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
      `}</style>

            <div className="min-h-screen flex">
                {/* ── LEFT PANEL ── */}
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
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-6">
                                <Scale size={32} className="text-amber-400" />
                            </div>
                            <h2 className="text-3xl font-black text-white leading-tight mb-4">
                                Simple terms for <span className="text-amber-400">smart stores.</span>
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed">
                                Our agreement is designed to be fair, transparent, and supportive of small businesses across the Philippines.
                            </p>
                        </div>

                        <div className="mt-auto text-white/20 text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                            Service Agreement
                        </div>
                    </div>
                </aside>

                {/* ── RIGHT PANEL ── */}
                <main className="flex-1 bg-[#F7F9FC] overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="max-w-[680px] mx-auto py-16 px-8"
                    >
                        <div className="mb-12">
                            <p className="text-amber-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">User Agreement</p>
                            <h1 className="text-4xl text-slate-900 font-black mb-4 tracking-tight">Terms of Use</h1>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                By creating a <span className="font-bold text-slate-700">SariSari.IMS</span> account, you agree to the following terms regarding the management of your digital inventory.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <TermCard icon={<CheckCircle2 size={18} className="text-emerald-500" />} title="Account Responsibility">
                                You are responsible for all activity that occurs under your store account. Keep your password safe. If you add staff members to your dashboard, you are responsible for their actions within the system.
                            </TermCard>

                            <TermCard icon={<Zap size={18} className="text-blue-500" />} title="Fair Use Policy">
                                Our free tier is intended for individual sari-sari stores. We reserve the right to limit transaction volume or storage if usage suggests enterprise-scale operations or automated bot activity.
                            </TermCard>

                            <div className="p-6 rounded-2xl bg-red-50 border border-red-100 flex gap-4">
                                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                                <div>
                                    <h3 className="font-bold text-red-900 text-sm mb-1">Liability Disclaimer</h3>
                                    <p className="text-red-700/70 text-xs leading-relaxed">
                                        SariSari.IMS is a management tool. We are not liable for business losses, data entry errors by the user, or disputes between the store owner and their customers regarding "utang" records.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <footer className="mt-12 pt-8 border-t border-slate-200 text-center">
                            <p className="text-slate-400 text-xs font-medium">© 2026 SariSari.IMS Inventory Management System</p>
                        </footer>
                    </motion.div>
                </main>
            </div>
        </>
    );
}

function TermCard({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3 mb-3">
                {icon}
                <h3 className="font-bold text-slate-800">{title}</h3>
            </div>
            <p className="text-slate-500 text-[0.88rem] leading-relaxed">
                {children}
            </p>
        </div>
    );
}