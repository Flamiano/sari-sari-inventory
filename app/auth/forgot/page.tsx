"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, ArrowRight, Loader2, MailCheck, KeyRound, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast, { Toaster } from "react-hot-toast";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setError("Email is required."); return; }
        if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email address."); return; }
        setError("");
        setLoading(true);

        const { error: supaErr } = await supabase.auth.resetPasswordForEmail(email, {
            // Update this to your actual domain in production
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        setLoading(false);

        if (supaErr) {
            toast.error(supaErr.message || "Failed to send reset email.");
            return;
        }

        setSent(true);
        toast.success("Reset link sent! Check your email.");
    };

    return (
        <>
            <Toaster position="top-right" toastOptions={{
                style: { fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 600, fontSize: "0.875rem", borderRadius: "12px", border: "1px solid #e2e8f0" },
                success: { style: { borderLeft: "4px solid #2563eb" } },
                error: { style: { borderLeft: "4px solid #ef4444" } },
            }} />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        h1, h2 { font-family: 'Syne', sans-serif; }
        @keyframes gridFloat { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        @keyframes shimmerBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes orbitSpin { from { transform: rotate(0deg) translateX(80px) rotate(0deg); } to { transform: rotate(360deg) translateX(80px) rotate(-360deg); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.05); } }
      `}</style>

            <div className="min-h-screen flex">

                {/* ── LEFT PANEL ── */}
                <aside className="hidden lg:flex w-[460px] xl:w-[500px] flex-shrink-0 flex-col relative overflow-hidden"
                    style={{ background: "linear-gradient(155deg, #050E1F 0%, #1a1060 50%, #2c0b6b 100%)" }}>

                    {/* Grid */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 28s linear infinite" }} />

                    {/* Glows */}
                    <div className="absolute pointer-events-none" style={{ top: "35%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)" }} />
                    <div className="absolute pointer-events-none" style={{ top: -80, right: -80, width: 350, height: 350, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)" }} />
                    <div className="absolute pointer-events-none" style={{ bottom: -60, left: -60, width: 320, height: 320, background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)" }} />

                    {/* Orbiting lock icon visual */}
                    <div className="absolute pointer-events-none" style={{ top: "38%", left: "50%", transform: "translate(-50%, -50%)" }}>
                        <div className="relative w-36 h-36 flex items-center justify-center">
                            {/* Center lock */}
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center z-10"
                                style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", backdropFilter: "blur(8px)", animation: "pulseGlow 3s ease-in-out infinite" }}>
                                <KeyRound size={28} className="text-violet-300" />
                            </div>
                            {/* Orbit ring */}
                            <div className="absolute inset-0 rounded-full" style={{ border: "1px dashed rgba(139,92,246,0.2)" }} />
                            {/* Orbiting dot */}
                            <div className="absolute" style={{ top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}>
                                <div className="w-2 h-2 rounded-full bg-violet-400" style={{ animation: "orbitSpin 6s linear infinite", boxShadow: "0 0 8px #a78bfa" }} />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 no-underline">
                            <div className="relative w-10 h-10 flex-shrink-0">
                                <Image src="/images/logo.png" alt="SariSari IMS" fill className="object-contain rounded-xl" sizes="40px" />
                            </div>
                            <div>
                                <div className="text-white font-black text-lg leading-none" style={{ fontFamily: "Syne, sans-serif" }}>
                                    SariSari<span className="text-violet-400">.</span>IMS
                                </div>
                                <div className="text-white/25 text-[0.52rem] font-bold uppercase tracking-widest mt-0.5">Inventory Management</div>
                            </div>
                        </Link>

                        {/* Bottom copy */}
                        <div className="mt-auto pb-4">
                            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6"
                                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
                                <ShieldCheck size={12} className="text-violet-300" />
                                <span className="text-violet-300 text-[0.68rem] font-bold uppercase tracking-[0.15em]">Secure Password Reset</span>
                            </div>

                            <h2 className="font-black text-white leading-[1.1] mb-4"
                                style={{ fontFamily: "Syne, sans-serif", fontSize: "2.4rem", letterSpacing: "-0.03em" }}>
                                Recover your<br />
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #c4b5fd)" }}>
                                    account access.
                                </span>
                            </h2>

                            <p className="text-white/45 text-[0.9rem] leading-relaxed mb-8 max-w-[320px]">
                                Enter your registered email and we'll send you a secure link to reset your password.
                            </p>

                            {/* Steps */}
                            <div className="space-y-4">
                                {[
                                    { num: "01", title: "Enter your email", desc: "The one you registered with" },
                                    { num: "02", title: "Check your inbox", desc: "We'll send a reset link immediately" },
                                    { num: "03", title: "Set new password", desc: "Choose something strong and unique" },
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-[0.7rem]"
                                            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa", fontFamily: "Syne, sans-serif" }}>
                                            {step.num}
                                        </div>
                                        <div>
                                            <div className="text-white/70 text-[0.84rem] font-semibold">{step.title}</div>
                                            <div className="text-white/30 text-[0.73rem]">{step.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── RIGHT PANEL ── */}
                <main className="flex-1 flex items-center justify-center bg-[#F7F9FC] p-6 md:p-10">
                    <AnimatePresence mode="wait">
                        {sent ? (
                            // ── SUCCESS STATE ──
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[420px] text-center">

                                <div className="w-20 h-20 rounded-3xl bg-violet-50 border-2 border-violet-100 flex items-center justify-center mx-auto mb-6">
                                    <MailCheck size={36} className="text-violet-600" />
                                </div>

                                <h2 className="font-black text-slate-900 text-2xl mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
                                    Reset link sent!
                                </h2>
                                <p className="text-slate-500 text-[0.9rem] leading-relaxed mb-2">
                                    We've emailed a password reset link to:
                                </p>
                                <div className="inline-block bg-violet-50 border border-violet-100 text-violet-700 font-bold text-[0.88rem] px-4 py-2 rounded-xl mb-6">
                                    {email}
                                </div>
                                <p className="text-slate-400 text-[0.83rem] leading-relaxed mb-8 max-w-[320px] mx-auto">
                                    Click the link in your email to choose a new password. The link expires in 1 hour.
                                </p>

                                <div className="space-y-2.5 mb-8">
                                    {[
                                        "Check your spam/junk folder too",
                                        "Link is valid for 1 hour only",
                                        "Don't share the link with anyone",
                                    ].map((tip, i) => (
                                        <div key={i} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                                            <ShieldCheck size={13} className="text-violet-400 flex-shrink-0" />
                                            <span className="text-slate-500 text-[0.8rem]">{tip}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button onClick={() => { setSent(false); setEmail(""); }}
                                        className="w-full flex items-center justify-center gap-2 font-semibold text-slate-600 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-[0.88rem]">
                                        <Mail size={15} /> Try a different email
                                    </button>
                                    <Link href="/auth/login"
                                        className="w-full flex items-center justify-center gap-2 font-bold text-white py-3.5 rounded-xl no-underline transition-all text-[0.9rem]"
                                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 24px rgba(124,58,237,0.25)", fontFamily: "Syne, sans-serif" }}>
                                        <ArrowLeft size={15} /> Back to Login
                                    </Link>
                                </div>
                            </motion.div>
                        ) : (
                            // ── FORM STATE ──
                            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[400px]">

                                {/* Mobile logo */}
                                <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-8">
                                    <div className="relative w-8 h-8">
                                        <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                                    </div>
                                    <span className="font-black text-slate-900 text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                        SariSari<span className="text-violet-600">.</span>IMS
                                    </span>
                                </Link>

                                {/* Back link */}
                                <Link href="/auth/login"
                                    className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-slate-500 hover:text-violet-600 no-underline mb-8 transition-colors">
                                    <ArrowLeft size={14} /> Back to login
                                </Link>

                                {/* Icon */}
                                <div className="w-14 h-14 rounded-2xl bg-violet-50 border-2 border-violet-100 flex items-center justify-center mb-6">
                                    <KeyRound size={24} className="text-violet-600" />
                                </div>

                                {/* Header */}
                                <div className="mb-8">
                                    <p className="text-violet-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Password Recovery</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", letterSpacing: "-0.03em" }}>
                                        Forgot your<br />password?
                                    </h1>
                                    <p className="text-slate-400 text-[0.9rem] leading-relaxed max-w-[300px]">
                                        No worries! Enter your email and we'll send you a reset link right away.
                                    </p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                    <div>
                                        <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Email Address</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                                style={{ color: error ? "#ef4444" : "#94a3b8" }} />
                                            <input type="email" placeholder="you@example.com" value={email}
                                                onChange={e => { setEmail(e.target.value); setError(""); }}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                                style={{ border: error ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                                onFocus={e => { if (!error) { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; } }}
                                                onBlur={e => { if (!error) { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; } }}
                                            />
                                        </div>
                                        {error && <p className="text-[0.75rem] text-red-500 mt-1">{error}</p>}
                                    </div>

                                    <button type="submit" disabled={loading}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 24px rgba(124,58,237,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                        {loading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {loading
                                            ? <><Loader2 size={17} className="animate-spin" />Sending reset link…</>
                                            : <><ArrowRight size={16} />Send Reset Link</>
                                        }
                                    </button>
                                </form>

                                <p className="text-center text-[0.82rem] text-slate-400 mt-6">
                                    Remembered it?{" "}
                                    <Link href="/auth/login" className="font-bold text-violet-600 hover:text-violet-700 no-underline transition-colors">
                                        Sign in →
                                    </Link>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </>
    );
}