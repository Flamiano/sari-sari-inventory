"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Store, ShieldCheck, TrendingUp, Package } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast, { Toaster } from "react-hot-toast";

const FEATURES = [
    { icon: <Package size={14} />, text: "Real-time inventory tracking" },
    { icon: <TrendingUp size={14} />, text: "Sales analytics & reports" },
    { icon: <ShieldCheck size={14} />, text: "Secure cloud backup" },
];

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: "", password: "", remember: false });
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const validate = () => {
        const errs: typeof errors = {};
        if (!form.email) errs.email = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
        if (!form.password) errs.password = "Password is required.";
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
            options: { persistSession: form.remember },
        });

        if (error) {
            setLoading(false);
            if (error.message.toLowerCase().includes("email")) {
                toast.error("Please confirm your email first before logging in.");
                setErrors({ email: "Email not confirmed. Check your inbox." });
            } else {
                toast.error("Invalid email or password.");
                setErrors({ password: "Invalid credentials. Try again." });
            }
            return;
        }

        toast.success("Welcome back! Redirecting…");
        setTimeout(() => router.push("/owner"), 1000);
    };

    return (
        <>
            <Toaster position="top-right" toastOptions={{
                style: { fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 600, fontSize: "0.875rem", borderRadius: "12px", border: "1px solid #e2e8f0" },
                success: { iconTheme: { primary: "#2563eb", secondary: "#fff" }, style: { borderLeft: "4px solid #2563eb" } },
                error: { iconTheme: { primary: "#ef4444", secondary: "#fff" }, style: { borderLeft: "4px solid #ef4444" } },
            }} />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        h1, h2 { font-family: 'Syne', sans-serif; }
        @keyframes gridFloat { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        @keyframes shimmerBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

            <div className="min-h-screen flex">

                {/* ── LEFT PANEL ── */}
                <aside className="hidden lg:flex w-[480px] xl:w-[520px] flex-shrink-0 flex-col relative overflow-hidden"
                    style={{ background: "linear-gradient(155deg, #050E1F 0%, #0c1f4a 50%, #1346a0 100%)" }}>

                    {/* Animated grid */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 25s linear infinite" }} />

                    {/* Glows */}
                    <div className="absolute pointer-events-none" style={{ top: -80, right: -80, width: 400, height: 400, background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)" }} />
                    <div className="absolute pointer-events-none" style={{ bottom: -60, left: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 65%)" }} />
                    <div className="absolute pointer-events-none" style={{ top: "40%", left: "50%", transform: "translate(-50%, -50%)", width: 300, height: 300, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)" }} />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 no-underline mb-auto">
                            <div className="relative w-10 h-10 flex-shrink-0">
                                <Image src="/images/logo.png" alt="SariSari IMS" fill className="object-contain rounded-xl" sizes="40px" />
                            </div>
                            <div>
                                <div className="text-white font-black text-lg leading-none" style={{ fontFamily: "Syne, sans-serif" }}>
                                    SariSari<span className="text-blue-400">.</span>IMS
                                </div>
                                <div className="text-white/30 text-[0.52rem] font-bold uppercase tracking-widest mt-0.5">Inventory Management</div>
                            </div>
                        </Link>

                        {/* Main copy */}
                        <div className="my-auto">
                            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7"
                                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ boxShadow: "0 0 8px #60a5fa", animation: "pulse 2s infinite" }} />
                                <span className="text-blue-300 text-[0.68rem] font-bold uppercase tracking-[0.15em]">Owner Portal</span>
                            </div>

                            <h2 className="font-black text-white leading-[1.08] mb-5"
                                style={{ fontFamily: "Syne, sans-serif", fontSize: "2.8rem", letterSpacing: "-0.03em" }}>
                                Welcome back<br />
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a5b4fc)" }}>
                                    to your store.
                                </span>
                            </h2>

                            <p className="text-slate-300/70 text-[0.95rem] leading-relaxed mb-8 max-w-[340px]">
                                Sign in to access your inventory, review today's sales, and keep your tindahan running smoothly.
                            </p>

                            <div className="space-y-3">
                                {FEATURES.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                                            {f.icon}
                                        </div>
                                        <span className="text-white/60 text-[0.85rem] font-medium">{f.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom stat cards */}
                        <div className="grid grid-cols-3 gap-3 mt-auto">
                            {[
                                { val: "24/7", label: "Store Access" },
                                { val: "Live", label: "Sync" },
                                { val: "Safe", label: "Data" },
                            ].map((s) => (
                                <div key={s.label} className="rounded-2xl p-4 text-center"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
                                    <div className="text-white font-black text-[1.3rem] leading-none mb-1" style={{ fontFamily: "Syne, sans-serif" }}>{s.val}</div>
                                    <div className="text-white/30 text-[0.6rem] font-bold uppercase tracking-widest">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* ── RIGHT PANEL ── */}
                <main className="flex-1 flex items-center justify-center bg-[#F7F9FC] p-6 md:p-10 overflow-y-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-[420px]">

                        {/* Mobile logo */}
                        <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-8">
                            <div className="relative w-8 h-8">
                                <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                            </div>
                            <span className="font-black text-slate-900 text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                SariSari<span className="text-blue-600">.</span>IMS
                            </span>
                        </Link>

                        {/* Header */}
                        <div className="mb-8">
                            <p className="text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Welcome back</p>
                            <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", letterSpacing: "-0.03em" }}>
                                Sign in to your<br />dashboard
                            </h1>
                            <p className="text-slate-400 text-[0.9rem]">Enter your credentials to continue.</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} noValidate className="space-y-4">

                            {/* Email */}
                            <div>
                                <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                        style={{ color: errors.email ? "#ef4444" : "#94a3b8" }} />
                                    <input type="email" placeholder="you@example.com" value={form.email}
                                        onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(v => ({ ...v, email: undefined })); }}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                        style={{ border: errors.email ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: errors.email ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                        onFocus={e => { if (!errors.email) { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; } }}
                                        onBlur={e => { if (!errors.email) { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; } }}
                                    />
                                </div>
                                {errors.email && <p className="text-[0.75rem] text-red-500 mt-1">{errors.email}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                        style={{ color: errors.password ? "#ef4444" : "#94a3b8" }} />
                                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password}
                                        onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(v => ({ ...v, password: undefined })); }}
                                        className="w-full pl-10 pr-11 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                        style={{ border: errors.password ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: errors.password ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                        onFocus={e => { if (!errors.password) { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; } }}
                                        onBlur={e => { if (!errors.password) { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; } }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-[0.75rem] text-red-500 mt-1">{errors.password}</p>}
                            </div>

                            {/* Remember + Forgot */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.remember}
                                        onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))}
                                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                    <span className="text-[0.82rem] text-slate-500 font-medium">Keep me signed in</span>
                                </label>
                                <Link href="/auth/forgot" className="text-[0.82rem] font-bold text-blue-600 hover:text-blue-700 no-underline transition-colors">
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={loading}
                                className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem", letterSpacing: "0.01em" }}>
                                {loading && (
                                    <span className="absolute inset-0 pointer-events-none"
                                        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                )}
                                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                    <><ArrowRight size={16} />Sign In to Dashboard</>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-6">
                            <div className="flex-1 h-px bg-slate-100" />
                            <span className="text-slate-300 text-[0.72rem] font-semibold">OR</span>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>

                        <p className="text-center text-[0.85rem] text-slate-500">
                            Don't have an account?{" "}
                            <Link href="/auth/register" className="font-bold text-blue-600 hover:text-blue-700 no-underline transition-colors">
                                Create one free →
                            </Link>
                        </p>
                    </motion.div>
                </main>
            </div>
        </>
    );
}