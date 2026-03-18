"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast"; // Toaster lives in layout.tsx
import {
    User, Mail, Lock, Eye, EyeOff, ArrowRight,
    Store, MapPin, Calendar,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";

/* ─── helpers ─────────────────────────────────────────── */
const maxDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
};

const calcAge = (dob: string) => {
    if (!dob) return null;
    const today = new Date();
    const b = new Date(dob);
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return age;
};

const strengthInfo = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const map = [
        { pct: 25, color: "#ef4444", label: "Weak" },
        { pct: 50, color: "#f97316", label: "Fair" },
        { pct: 75, color: "#eab308", label: "Good" },
        { pct: 100, color: "#22c55e", label: "Strong" },
    ];
    return map[score - 1] ?? { pct: 0, color: "#e2e8f0", label: "" };
};

/* ─── tiny UI pieces ───────────────────────────────────── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">{children}</p>
);

const Field = ({
    label, error, children,
}: {
    label: React.ReactNode; error?: string; children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1">
        <label className="text-[0.78rem] font-bold text-slate-700">{label}</label>
        {children}
        {error && <p className="text-[0.7rem] text-red-500 font-medium">{error}</p>}
    </div>
);

const Input = ({
    icon, rightEl, hasErr, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: React.ReactNode; rightEl?: React.ReactNode; hasErr?: boolean;
}) => (
    <div className="relative">
        {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 z-10">
                {icon}
            </span>
        )}
        <input
            {...props}
            className="w-full bg-white text-slate-800 rounded-xl outline-none text-[0.85rem]"
            style={{
                border: hasErr ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                padding: `10px ${rightEl ? "36px" : "12px"} 10px ${icon ? "32px" : "12px"}`,
                boxShadow: hasErr ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
            }}
        />
        {rightEl && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 z-10">{rightEl}</span>
        )}
    </div>
);

/* ─── already-registered toast ─────────────────────────── */
// Custom toast with a "Go to Login" button
const showEmailExistsToast = () => {
    toast(
        (t) => (
            <div className="flex flex-col gap-2">
                <p className="text-[0.83rem] font-semibold text-slate-800 leading-snug">
                    This email is already registered.
                </p>
                <p className="text-[0.75rem] text-slate-500 leading-snug">
                    You already have an account. Sign in instead.
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <a
                        href="/auth/login"
                        onClick={() => toast.dismiss(t.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-bold text-white no-underline"
                        style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
                    >
                        <ArrowRight size={12} /> Go to Login
                    </a>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="text-[0.73rem] text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        ),
        {
            duration: 8000,
            style: {
                borderLeft: "4px solid #ef4444",
                background: "#fff",
                padding: "14px 16px",
                maxWidth: "340px",
            },
        }
    );
};

/* ─── success screen ───────────────────────────────────── */
const SuccessScreen = ({ storeName }: { storeName: string }) => (
    <motion.div
        key="success"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center text-center max-w-sm mx-auto p-8"
    >
        <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 12px 32px rgba(5,150,105,0.25)" }}
        >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        </div>
        <h2 className="font-black text-slate-900 mb-3"
            style={{ fontFamily: "Syne, sans-serif", fontSize: "1.7rem", letterSpacing: "-0.03em" }}>
            Account created!
        </h2>
        <p className="text-slate-500 text-[0.88rem] leading-relaxed mb-2">
            Welcome to <span className="font-bold text-slate-700">SariSari IMS</span>!
        </p>
        <p className="text-slate-400 text-[0.82rem] mb-6">
            Your store <span className="font-bold text-emerald-600">{storeName}</span> is ready. You can now sign in to your dashboard.
        </p>
        <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-[0.88rem] no-underline transition-all"
            style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 8px 24px rgba(5,150,105,0.2)" }}
        >
            <ArrowRight size={15} /> Go to Sign In
        </Link>
    </motion.div>
);

/* ─── main component ───────────────────────────────────── */
export default function RegisterPage() {
    const [form, setForm] = useState({
        storeName: "", storeAddress: "", name: "", email: "",
        birthdate: "", password: "", confirm: "", terms: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const set = (k: string, v: string | boolean) =>
        setForm((f) => ({ ...f, [k]: v }));

    const age = calcAge(form.birthdate);
    const strength = strengthInfo(form.password);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.storeName.trim()) e.storeName = "Store name is required.";
        if (!form.storeAddress.trim()) e.storeAddress = "Store address is required.";
        if (!form.name.trim()) e.name = "Full name is required.";
        if (!form.email.trim()) e.email = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
        if (!form.birthdate) e.birthdate = "Date of birth is required.";
        else if ((age ?? 0) < 18) e.birthdate = "You must be at least 18 years old.";
        if (!form.password) e.password = "Password is required.";
        else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
        if (!form.confirm) e.confirm = "Please confirm your password.";
        else if (form.confirm !== form.password) e.confirm = "Passwords do not match.";
        if (!form.terms) e.terms = "You must agree to the terms.";
        return e;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);

        // ── Step 1: Attempt signUp ───────────────────────────────────────────
        let data, error;
        try {
            ({ data, error } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: {
                        // Picked up by the DB trigger (handle_new_user) to populate profiles
                        full_name: form.name,
                        store_name: form.storeName,
                        address: form.storeAddress,
                        birthdate: form.birthdate || null,
                        age: calcAge(form.birthdate),
                        role: "owner",
                    },
                },
            }));
        } catch (networkErr: unknown) {
            setLoading(false);
            toast.error("Network error — please check your connection.");
            console.error("signUp network error:", networkErr);
            return;
        }

        // ── Step 2: Handle auth errors ───────────────────────────────────────
        if (error) {
            setLoading(false);
            const msg = error.message ?? "";

            if (
                msg.toLowerCase().includes("already registered") ||
                msg.toLowerCase().includes("already been registered") ||
                error.status === 422
            ) {
                // Explicit "already registered" error from Supabase
                setErrors({ email: "This email is already registered." });
                showEmailExistsToast();
            } else if (error.status === 500) {
                toast.error("Server error. If this persists, contact support.");
                console.error("Supabase 500 on signUp:", msg);
            } else {
                toast.error(msg || "Something went wrong. Please try again.");
                console.error("Supabase signUp error:", error);
            }
            return;
        }

        // ── Step 3: Detect existing email via empty identities ───────────────
        // When "Confirm email" is ON in Supabase and the email already exists,
        // signUp returns no error but user.identities = [] (a fake success).
        // We detect this and show the "already registered" flow.
        if (data?.user && data.user.identities?.length === 0) {
            setLoading(false);
            setErrors({ email: "This email is already registered." });
            showEmailExistsToast();
            return;
        }

        // ── Step 4: Genuine new account ──────────────────────────────────────
        // Profile row is created automatically via DB trigger (handle_new_user).
        setLoading(false);
        toast.success("Account created! You can now sign in.");
        setSuccess(true);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
                *, body { font-family: 'Plus Jakarta Sans', sans-serif; }
                h1, h2 { font-family: 'Syne', sans-serif; }
                @keyframes gridFloat { 0%{background-position:0 0} 100%{background-position:40px 40px} }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
                input[type="date"]::-webkit-calendar-picker-indicator { opacity:.45; cursor:pointer; }
                input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity:.8; }
                .reg-scroll::-webkit-scrollbar { width:4px; }
                .reg-scroll::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.1); border-radius:4px; }
                .strength-bar { transition: width 0.4s ease, background-color 0.4s ease; }
            `}</style>

            <div style={{ minHeight: "100svh", display: "flex", overflow: "hidden" }}>

                {/* ══ LEFT SIDEBAR ══ */}
                <aside
                    className="hidden lg:flex flex-col flex-shrink-0 relative overflow-hidden"
                    style={{ width: "clamp(300px, 30vw, 400px)", background: "linear-gradient(155deg,#050E1F 0%,#13294b 45%,#0e4d2e 100%)" }}
                >
                    <div className="absolute inset-0 pointer-events-none opacity-[0.045]"
                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 30s linear infinite" }} />
                    <div className="absolute pointer-events-none" style={{ top: -60, left: "50%", transform: "translateX(-50%)", width: 500, height: 350, background: "radial-gradient(ellipse,rgba(251,191,36,0.12) 0%,transparent 70%)" }} />
                    <div className="absolute pointer-events-none" style={{ bottom: -80, right: -80, width: 380, height: 380, background: "radial-gradient(circle,rgba(34,197,94,0.12) 0%,transparent 65%)" }} />
                    <div className="absolute pointer-events-none" style={{ bottom: 100, left: -40, width: 280, height: 280, background: "radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 65%)" }} />

                    <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
                        <Link href="/" className="flex items-center gap-3 no-underline flex-shrink-0">
                            <div className="relative w-9 h-9 flex-shrink-0">
                                <Image src="/images/logo.png" alt="SariSari IMS" fill className="object-contain rounded-xl" sizes="36px" />
                            </div>
                            <div>
                                <p className="text-white font-black text-base leading-none" style={{ fontFamily: "Syne, sans-serif" }}>
                                    SariSari<span className="text-amber-400">.</span>IMS
                                </p>
                                <p className="text-white/30 text-[0.48rem] font-bold uppercase tracking-widest mt-0.5">Inventory Management</p>
                            </div>
                        </Link>

                        <div className="flex-1 flex flex-col justify-center py-8">
                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 self-start"
                                style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" style={{ animation: "blink 2s infinite" }} />
                                <span className="text-amber-300 text-[0.6rem] font-bold uppercase tracking-[0.15em]">Free to Start</span>
                            </div>

                            <h2 className="font-black text-white leading-[1.08] mb-4"
                                style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(1.6rem,2.5vw,2.1rem)", letterSpacing: "-0.03em" }}>
                                Open your<br />
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
                                    digital tindahan
                                </span><br />
                                today.
                            </h2>

                            <p className="text-white/45 text-[0.82rem] leading-relaxed mb-6 max-w-[260px]">
                                Join hundreds of Filipino store owners managing stocks, sales, and utang smarter.
                            </p>

                            <div className="space-y-3">
                                {[
                                    { icon: "🆓", text: "Free forever for small stores" },
                                    { icon: "⚡", text: "Setup in under 5 minutes" },
                                    { icon: "📱", text: "Works on any device" },
                                    { icon: "🔒", text: "Secure cloud backup" },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-sm flex-shrink-0">{item.icon}</span>
                                        <span className="text-white/55 text-[0.8rem] font-medium">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl p-4 flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <p className="text-white/55 text-[0.78rem] leading-relaxed italic mb-3">
                                &quot;Hindi ko na kailangang magsulat sa notebook. Lahat naka-track na sa SariSari IMS!&quot;
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs flex-shrink-0">A</div>
                                <div>
                                    <p className="text-white/60 text-[0.7rem] font-bold leading-none">Ate Jenny</p>
                                    <p className="text-white/25 text-[0.6rem] mt-0.5">Store Owner, QC</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ══ RIGHT PANEL ══ */}
                <main className="flex-1 flex flex-col reg-scroll overflow-y-auto lg:overflow-hidden" style={{ background: "#F7F9FC" }}>
                    <AnimatePresence mode="wait">
                        {success ? (
                            <div className="flex-1 flex items-center justify-center p-6" key="success-wrap">
                                <SuccessScreen storeName={form.storeName} />
                            </div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="flex flex-col h-full"
                                style={{ padding: "clamp(20px,3vw,40px) clamp(16px,4vw,48px)" }}
                            >
                                {/* Mobile logo */}
                                <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-6">
                                    <div className="relative w-8 h-8 flex-shrink-0">
                                        <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                                    </div>
                                    <span className="font-black text-slate-900 text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                        SariSari<span className="text-amber-500">.</span>IMS
                                    </span>
                                </Link>

                                {/* Header */}
                                <div className="mb-6 flex-shrink-0">
                                    <p className="text-amber-600 text-[0.63rem] font-bold uppercase tracking-[0.25em] mb-1.5">Get started free</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-1"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(1.5rem,2.5vw,1.9rem)", letterSpacing: "-0.03em" }}>
                                        Create your store account
                                    </h1>
                                    <p className="text-slate-400 text-[0.83rem]">Setup your inventory management in under 2 minutes.</p>
                                </div>

                                {/* ── 2-Column Form ── */}
                                <form onSubmit={handleSubmit} noValidate className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 min-h-0">

                                    {/* LEFT COL */}
                                    <div className="flex flex-col gap-5">
                                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col gap-4">
                                            <SectionLabel>Store Details</SectionLabel>
                                            <Field label="Store Name" error={errors.storeName}>
                                                <Input icon={<Store size={14} />} type="text" placeholder="e.g. Juan's Store"
                                                    value={form.storeName} hasErr={!!errors.storeName}
                                                    onChange={e => set("storeName", e.target.value)} />
                                            </Field>
                                            <Field label="Store Address" error={errors.storeAddress}>
                                                <Input icon={<MapPin size={14} />} type="text" placeholder="Full Business Address"
                                                    value={form.storeAddress} hasErr={!!errors.storeAddress}
                                                    onChange={e => set("storeAddress", e.target.value)} />
                                            </Field>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col gap-4">
                                            <SectionLabel>Owner Information</SectionLabel>
                                            <Field label="Full Name" error={errors.name}>
                                                <Input icon={<User size={14} />} type="text" placeholder="Your Full Name"
                                                    value={form.name} hasErr={!!errors.name}
                                                    onChange={e => set("name", e.target.value)} />
                                            </Field>
                                            <Field label={<>Email Address <span style={{ color: "#ef4444" }}>*</span></>} error={errors.email}>
                                                <Input icon={<Mail size={14} />} type="email" placeholder="you@example.com"
                                                    value={form.email} hasErr={!!errors.email}
                                                    onChange={e => {
                                                        set("email", e.target.value);
                                                        // Clear email error when user starts retyping
                                                        if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                                                    }} />
                                            </Field>
                                        </div>

                                        <p className="hidden lg:block text-center text-[0.82rem] text-slate-400 mt-auto pt-2">
                                            Already have an account?{" "}
                                            <Link href="/auth/login" className="font-bold text-blue-600 hover:text-blue-700 no-underline transition-colors">Sign in →</Link>
                                        </p>
                                    </div>

                                    {/* RIGHT COL */}
                                    <div className="flex flex-col gap-5">
                                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col gap-4">
                                            <SectionLabel>Security &amp; Verification</SectionLabel>

                                            <Field label="Date of Birth" error={errors.birthdate}>
                                                <div className="relative">
                                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-slate-400" />
                                                    <input type="date" value={form.birthdate} max={maxDate()}
                                                        onChange={e => set("birthdate", e.target.value)}
                                                        className="w-full bg-white text-slate-800 rounded-xl outline-none text-[0.85rem]"
                                                        style={{ border: errors.birthdate ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", padding: "10px 36px" }} />
                                                    {age !== null && age >= 18 && (
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.62rem] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            {age} YRS
                                                        </span>
                                                    )}
                                                </div>
                                            </Field>

                                            <Field label="Password" error={errors.password}>
                                                <Input icon={<Lock size={14} />} type={showPwd ? "text" : "password"} placeholder="Min. 8 characters"
                                                    value={form.password} hasErr={!!errors.password}
                                                    onChange={e => set("password", e.target.value)}
                                                    rightEl={
                                                        <button type="button" onClick={() => setShowPwd(v => !v)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                                            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    } />
                                                {form.password && (
                                                    <div className="mt-1.5">
                                                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full strength-bar" style={{ width: `${strength.pct}%`, backgroundColor: strength.color }} />
                                                        </div>
                                                        <div className="flex items-center justify-between mt-0.5">
                                                            <p className="text-[0.67rem] font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                                                            {strength.pct < 100 && (
                                                                <p className="text-[0.62rem] text-slate-400 font-medium">
                                                                    Add {[
                                                                        !/[A-Z]/.test(form.password) && "uppercase",
                                                                        !/[0-9]/.test(form.password) && "number",
                                                                        !/[^A-Za-z0-9]/.test(form.password) && "symbol",
                                                                    ].filter(Boolean).join(", ")} to strengthen
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Field>

                                            <Field label="Confirm Password" error={errors.confirm}>
                                                <Input icon={<Lock size={14} />} type={showConfirm ? "text" : "password"} placeholder="Re-enter password"
                                                    value={form.confirm} hasErr={!!errors.confirm}
                                                    onChange={e => set("confirm", e.target.value)}
                                                    rightEl={
                                                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                                            {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    } />
                                            </Field>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col gap-4">
                                            <div>
                                                <div className="flex items-start gap-2.5">
                                                    <input type="checkbox" id="terms" checked={form.terms}
                                                        onChange={e => set("terms", e.target.checked)}
                                                        className="mt-0.5 w-4 h-4 rounded accent-blue-600 flex-shrink-0" />
                                                    <label htmlFor="terms" className="text-[0.78rem] text-slate-500 leading-snug cursor-pointer">
                                                        I agree to the{" "}
                                                        <Link href="/terms" className="text-blue-600 font-bold hover:underline">Terms of Service</Link>
                                                        {" "}and{" "}
                                                        <Link href="/privacy" className="text-blue-600 font-bold hover:underline">Privacy Policy</Link>
                                                    </label>
                                                </div>
                                                {errors.terms && <p className="text-[0.7rem] text-red-500 mt-1 font-medium ml-6">{errors.terms}</p>}
                                            </div>

                                            <button type="submit" disabled={loading}
                                                className="w-full flex items-center justify-center gap-2.5 font-bold text-white rounded-xl py-3.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 8px 24px rgba(5,150,105,0.2)", fontFamily: "Syne, sans-serif", fontSize: "0.9rem" }}>
                                                {loading ? (
                                                    <>
                                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        Creating Account…
                                                    </>
                                                ) : (
                                                    <><ArrowRight size={16} /> Create My Store Account</>
                                                )}
                                            </button>

                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                                <span className="text-[0.68rem] text-slate-400 font-medium">
                                                    You will be registered as <span className="font-bold text-slate-600">Store Owner</span>
                                                </span>
                                            </div>
                                        </div>

                                        <p className="lg:hidden text-center text-[0.82rem] text-slate-400">
                                            Already have an account?{" "}
                                            <Link href="/auth/login" className="font-bold text-blue-600 hover:text-blue-700 no-underline transition-colors">Sign in →</Link>
                                        </p>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </>
    );
}