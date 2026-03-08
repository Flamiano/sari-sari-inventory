"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Store, User, Mail, Lock, Eye, EyeOff, ArrowRight, Check, CheckCircle2, MailCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast, { Toaster } from "react-hot-toast";

function getStrength(val: string): { pct: number; color: string; label: string } {
    if (!val) return { pct: 0, color: "#e2e8f0", label: "" };
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const map = [
        { pct: 20, color: "#ef4444", label: "Too weak" },
        { pct: 45, color: "#f97316", label: "Weak" },
        { pct: 70, color: "#eab308", label: "Fair" },
        { pct: 100, color: "#22c55e", label: "Strong 💪" },
    ];
    return map[Math.max(score - 1, 0)];
}

// Email Confirmation Screen
function EmailConfirmScreen({ email }: { email: string }) {
    const router = useRouter();
    return (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px] text-center">

            <div className="w-20 h-20 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center mx-auto mb-6">
                <MailCheck size={36} className="text-blue-600" />
            </div>

            <h2 className="font-black text-slate-900 text-2xl mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
                Check your email!
            </h2>
            <p className="text-slate-500 text-[0.9rem] leading-relaxed mb-2">
                We've sent a confirmation link to
            </p>
            <div className="inline-block bg-blue-50 border border-blue-100 text-blue-700 font-bold text-[0.88rem] px-4 py-2 rounded-xl mb-6">
                {email}
            </div>
            <p className="text-slate-400 text-[0.83rem] leading-relaxed mb-8 max-w-[320px] mx-auto">
                Click the link in your email to confirm your account. After confirming, you can log in to your dashboard.
            </p>

            <div className="space-y-3">
                {[
                    "Check your spam/junk folder if you don't see it",
                    "Link expires after 24 hours",
                    "Contact support if you need help",
                ].map((tip, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-left bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-500 text-[0.8rem]">{tip}</span>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => router.push("/auth/login")}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white py-3.5 rounded-xl transition-all"
                    style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.25)", fontFamily: "Syne, sans-serif" }}>
                    <ArrowRight size={16} /> Go to Login
                </button>
                <p className="text-slate-400 text-[0.78rem]">
                    Didn't receive it?{" "}
                    <button onClick={() => toast("Please wait a few minutes and check spam.", { icon: "📧" })}
                        className="text-blue-600 font-bold bg-transparent border-none cursor-pointer hover:underline p-0">
                        Resend email
                    </button>
                </p>
            </div>
        </motion.div>
    );
}

export default function RegisterPage() {
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [form, setForm] = useState({ storeName: "", name: "", email: "", password: "", confirm: "", terms: false });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const strength = useMemo(() => getStrength(form.password), [form.password]);

    const clearErr = (key: string) => setErrors(p => { const n = { ...p }; delete n[key]; return n; });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.storeName.trim()) e.storeName = "Store name is required.";
        if (!form.name.trim()) e.name = "Full name is required.";
        if (!form.email) e.email = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
        if (!form.password) e.password = "Password is required.";
        else if (form.password.length < 8) e.password = "Minimum 8 characters.";
        if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
        if (!form.terms) e.terms = "You must accept the terms.";
        return e;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
                data: { full_name: form.name, store_name: form.storeName },
                // Supabase will send confirmation email automatically
            },
        });

        setLoading(false);

        if (error) {
            if (error.message.toLowerCase().includes("already registered")) {
                toast.error("This email is already registered. Try logging in.");
                setErrors({ email: "Email already in use." });
            } else {
                toast.error(error.message || "Registration failed.");
            }
            return;
        }

        // Show email confirmation screen
        setConfirmed(true);
        toast.success("Account created! Please confirm your email.");
    };

    return (
        <>
            <Toaster position="top-right" toastOptions={{
                style: { fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 600, fontSize: "0.875rem", borderRadius: "12px", border: "1px solid #e2e8f0" },
                success: { style: { borderLeft: "4px solid #22c55e" } },
                error: { style: { borderLeft: "4px solid #ef4444" } },
            }} />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        h1, h2 { font-family: 'Syne', sans-serif; }
        @keyframes gridFloat { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        @keyframes shimmerBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

            <div className="min-h-screen flex">

                {/* ── LEFT PANEL ── */}
                <aside className="hidden lg:flex w-[420px] xl:w-[460px] flex-shrink-0 flex-col relative overflow-hidden"
                    style={{ background: "linear-gradient(155deg, #050E1F 0%, #13294b 45%, #0e4d2e 100%)" }}>

                    <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 30s linear infinite" }} />

                    <div className="absolute pointer-events-none" style={{ top: -60, left: "50%", transform: "translateX(-50%)", width: 500, height: 350, background: "radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, transparent 70%)" }} />
                    <div className="absolute pointer-events-none" style={{ bottom: -80, right: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 65%)" }} />
                    <div className="absolute pointer-events-none" style={{ bottom: 100, left: -40, width: 280, height: 280, background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)" }} />

                    <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 no-underline mb-auto">
                            <div className="relative w-10 h-10 flex-shrink-0">
                                <Image src="/images/logo.png" alt="SariSari IMS" fill className="object-contain rounded-xl" sizes="40px" />
                            </div>
                            <div>
                                <div className="text-white font-black text-lg leading-none" style={{ fontFamily: "Syne, sans-serif" }}>
                                    SariSari<span className="text-amber-400">.</span>IMS
                                </div>
                                <div className="text-white/30 text-[0.52rem] font-bold uppercase tracking-widest mt-0.5">Inventory Management</div>
                            </div>
                        </Link>

                        {/* Main copy */}
                        <div className="my-auto">
                            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7"
                                style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animation: "blink 2s infinite" }} />
                                <span className="text-amber-300 text-[0.68rem] font-bold uppercase tracking-[0.15em]">Free to Start</span>
                            </div>

                            <h2 className="font-black text-white leading-[1.08] mb-5"
                                style={{ fontFamily: "Syne, sans-serif", fontSize: "2.6rem", letterSpacing: "-0.03em" }}>
                                Open your<br />
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}>
                                    digital tindahan
                                </span><br />
                                today.
                            </h2>

                            <p className="text-white/50 text-[0.9rem] leading-relaxed mb-8 max-w-[320px]">
                                Join hundreds of Filipino store owners managing stocks, sales, and utang smarter — all in one place.
                            </p>

                            <div className="space-y-3">
                                {[
                                    { icon: "🆓", text: "Free forever for small stores" },
                                    { icon: "⚡", text: "Setup in under 5 minutes" },
                                    { icon: "📱", text: "Works on any device, no download" },
                                    { icon: "🔒", text: "Secure cloud backup always on" },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-base">{item.icon}</span>
                                        <span className="text-white/55 text-[0.85rem] font-medium">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Testimonial */}
                        <div className="mt-auto rounded-2xl p-5"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <p className="text-white/60 text-[0.82rem] leading-relaxed italic mb-3">
                                "Hindi ko na kailangang magsulat sa notebook. Lahat naka-track na sa SariSari IMS!"
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs">A</div>
                                <div>
                                    <div className="text-white/60 text-[0.75rem] font-bold">Ate Jenny</div>
                                    <div className="text-white/25 text-[0.65rem]">Store Owner, QC</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── RIGHT PANEL ── */}
                <main className="flex-1 flex items-start md:items-center justify-center bg-[#F7F9FC] overflow-y-auto p-6 md:p-10">
                    <AnimatePresence mode="wait">
                        {confirmed ? (
                            <EmailConfirmScreen key="confirm" email={form.email} />
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[440px] py-6">

                                {/* Mobile logo */}
                                <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-8">
                                    <div className="relative w-8 h-8">
                                        <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                                    </div>
                                    <span className="font-black text-slate-900 text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                        SariSari<span className="text-amber-500">.</span>IMS
                                    </span>
                                </Link>

                                {/* Header */}
                                <div className="mb-6">
                                    <p className="text-amber-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Get started free</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "1.9rem", letterSpacing: "-0.03em" }}>
                                        Create your store<br />account
                                    </h1>
                                    <p className="text-slate-400 text-[0.88rem]">Free setup in under 2 minutes. No credit card needed.</p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} noValidate className="space-y-4">

                                    {/* Store name */}
                                    <Field label="Store Name" error={errors.storeName}>
                                        <Input icon={<Store size={15} />} type="text" placeholder="e.g. Aling Nena's Store"
                                            value={form.storeName} hasErr={!!errors.storeName}
                                            onChange={e => { setForm(f => ({ ...f, storeName: e.target.value })); clearErr("storeName"); }} />
                                    </Field>

                                    {/* Full name */}
                                    <Field label="Full Name" error={errors.name}>
                                        <Input icon={<User size={15} />} type="text" placeholder="Your full name"
                                            value={form.name} hasErr={!!errors.name}
                                            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); clearErr("name"); }} />
                                    </Field>

                                    {/* Email */}
                                    <Field label="Email Address" error={errors.email}>
                                        <Input icon={<Mail size={15} />} type="email" placeholder="you@example.com"
                                            value={form.email} hasErr={!!errors.email}
                                            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); clearErr("email"); }} />
                                    </Field>

                                    {/* Password row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Field label="Password" error={errors.password}>
                                                <div className="relative">
                                                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                                        style={{ color: errors.password ? "#ef4444" : "#94a3b8" }} />
                                                    <input type={showPwd ? "text" : "password"} placeholder="Min. 8 chars"
                                                        value={form.password}
                                                        onChange={e => { setForm(f => ({ ...f, password: e.target.value })); clearErr("password"); }}
                                                        className="w-full pl-9 pr-9 py-2.5 rounded-xl text-[0.85rem] text-slate-800 bg-white outline-none transition-all"
                                                        style={{ border: errors.password ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0" }}
                                                        onFocus={e => { if (!errors.password) { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; } }}
                                                        onBlur={e => { if (!errors.password) { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; } }}
                                                    />
                                                    <button type="button" onClick={() => setShowPwd(v => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </Field>
                                            {/* Strength bar */}
                                            {form.password && (
                                                <div className="mt-1.5">
                                                    <div className="h-[3px] bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-300"
                                                            style={{ width: `${strength.pct}%`, background: strength.color }} />
                                                    </div>
                                                    <p className="text-[0.67rem] mt-0.5 font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                                                </div>
                                            )}
                                        </div>

                                        <Field label="Confirm Password" error={errors.confirm}>
                                            <div className="relative">
                                                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                                    style={{ color: errors.confirm ? "#ef4444" : "#94a3b8" }} />
                                                <input type={showConfirm ? "text" : "password"} placeholder="Repeat"
                                                    value={form.confirm}
                                                    onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); clearErr("confirm"); }}
                                                    className="w-full pl-9 pr-9 py-2.5 rounded-xl text-[0.85rem] text-slate-800 bg-white outline-none transition-all"
                                                    style={{ border: errors.confirm ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0" }}
                                                    onFocus={e => { if (!errors.confirm) { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; } }}
                                                    onBlur={e => { if (!errors.confirm) { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; } }}
                                                />
                                                <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </Field>
                                    </div>

                                    {/* Terms */}
                                    <div className="flex items-start gap-2.5 pt-1">
                                        <input type="checkbox" id="terms" checked={form.terms}
                                            onChange={e => { setForm(f => ({ ...f, terms: e.target.checked })); clearErr("terms"); }}
                                            className="mt-0.5 w-4 h-4 rounded cursor-pointer flex-shrink-0 accent-blue-600" />
                                        <label htmlFor="terms" className="cursor-pointer" style={{ color: errors.terms ? "#ef4444" : "#64748b", fontSize: "0.78rem", lineHeight: 1.5 }}>
                                            I agree to the{" "}
                                            <Link href="/terms" className="text-blue-600 font-semibold no-underline hover:underline">Terms of Use</Link>
                                            {" "}and{" "}
                                            <Link href="/privacy" className="text-blue-600 font-semibold no-underline hover:underline">Privacy Policy</Link>
                                        </label>
                                    </div>
                                    {errors.terms && <p className="text-[0.73rem] text-red-500 -mt-2">{errors.terms}</p>}

                                    {/* Submit */}
                                    <button type="submit" disabled={loading}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                        style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 8px 24px rgba(5,150,105,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                        {loading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {loading
                                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
                                            : <><Check size={16} />Create My Store Account</>
                                        }
                                    </button>
                                </form>

                                <p className="text-center text-[0.83rem] text-slate-400 mt-5">
                                    Already have an account?{" "}
                                    <Link href="/auth/login" className="font-bold text-blue-600 hover:text-blue-700 no-underline transition-colors">
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[0.75rem] font-bold text-slate-700 mb-1.5">{label}</label>
            {children}
            {error && <p className="text-[0.72rem] text-red-500 mt-1">{error}</p>}
        </div>
    );
}

function Input({ icon, type, placeholder, value, hasErr, onChange }: {
    icon: React.ReactNode; type: string; placeholder: string; value: string; hasErr?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: hasErr ? "#ef4444" : "#94a3b8" }}>
                {icon}
            </span>
            <input type={type} placeholder={placeholder} value={value} onChange={onChange}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-[0.88rem] text-slate-800 bg-white outline-none transition-all"
                style={{ border: hasErr ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: hasErr ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                onFocus={e => { if (!hasErr) { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; } }}
                onBlur={e => { if (!hasErr) { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; } }}
            />
        </div>
    );
}