"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
    ShieldCheck, KeyRound, RefreshCw, AlertTriangle,
    Terminal, Activity, Database, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "sarisariims77@gmail.com";

const FEATURES = [
    { icon: <Terminal size={14} />, text: "Full system control & oversight" },
    { icon: <Activity size={14} />, text: "Real-time platform analytics" },
    { icon: <Database size={14} />, text: "Database & user management" },
];

const OTP_LENGTH = 8;
const MAX_ATTEMPTS = 3;

type Step = "credentials" | "otp";

export default function AdminLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("credentials");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [form, setForm] = useState({ email: "", password: "" });
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [errors, setErrors] = useState<{ email?: string; password?: string; otp?: string }>({});
    const [attempts, setAttempts] = useState(0);
    const [shake, setShake] = useState(false);
    const autoSubmitRef = useRef(false);

    useEffect(() => {
        const token = otp.join("");
        if (token.length === OTP_LENGTH && !autoSubmitRef.current && step === "otp" && !loading) {
            autoSubmitRef.current = true;
            submitOtp(token);
        }
        if (token.length < OTP_LENGTH) autoSubmitRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp]);

    const validate = () => {
        const errs: typeof errors = {};
        if (!form.email) errs.email = "Email is required.";
        else if (form.email !== ADMIN_EMAIL) errs.email = "Unauthorized. Admin access only.";
        if (!form.password) errs.password = "Password is required.";
        return errs;
    };

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
        });

        if (signInError) {
            setLoading(false);
            if (signInError.message.toLowerCase().includes("email")) {
                toast.error("Please confirm your email first.");
                setErrors({ email: "Email not confirmed. Check your inbox." });
            } else {
                toast.error("Invalid credentials.");
                setErrors({ password: "Invalid credentials. Access denied." });
            }
            return;
        }

        await supabase.auth.signOut();

        const { error: otpError } = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { shouldCreateUser: false },
        });

        setLoading(false);

        if (otpError) {
            toast.error("Failed to send verification code. Try again.");
            return;
        }

        toast.success(`Verification code sent to ${form.email}`);
        setAttempts(0);
        setOtp(Array(OTP_LENGTH).fill(""));
        autoSubmitRef.current = false;
        setStep("otp");
        startResendCooldown();
        setTimeout(() => document.getElementById("otp-0")?.focus(), 500);
    };

    const submitOtp = async (token: string) => {
        setErrors({});
        setLoading(true);

        const { data, error } = await supabase.auth.verifyOtp({
            email: form.email,
            token,
            type: "email",
        });

        if (error) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setLoading(false);
            triggerShake();

            if (newAttempts >= MAX_ATTEMPTS) {
                toast.error("Too many failed attempts. Please sign in again.", { duration: 3500 });
                setLoading(true);
                setTimeout(() => {
                    setStep("credentials");
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setAttempts(0);
                    setErrors({});
                    autoSubmitRef.current = false;
                    setLoading(false);
                }, 2200);
            } else {
                const remaining = MAX_ATTEMPTS - newAttempts;
                toast.error(`Wrong code — ${remaining} attempt${remaining === 1 ? "" : "s"} left.`);
                setErrors({ otp: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` });
                setOtp(Array(OTP_LENGTH).fill(""));
                autoSubmitRef.current = false;
                setTimeout(() => document.getElementById("otp-0")?.focus(), 80);
            }
            return;
        }

        // Verify the signed-in user is the admin
        const user = data?.user;
        if (!user || user.email !== ADMIN_EMAIL) {
            await supabase.auth.signOut();
            setLoading(false);
            toast.error("Unauthorized account.");
            setStep("credentials");
            return;
        }

        setLoading(false);
        toast.success("Admin verified! Entering command center 🛡️");
        setTimeout(() => router.push("/admin"), 1000);
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = otp.join("");
        if (token.length < OTP_LENGTH) {
            setErrors({ otp: `Please enter all ${OTP_LENGTH} digits.` });
            return;
        }
        if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            await submitOtp(token);
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 600);
    };

    const startResendCooldown = () => {
        setResendCooldown(60);
        const interval = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || loading) return;
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { shouldCreateUser: false },
        });
        setLoading(false);
        if (error) { toast.error("Failed to resend code."); return; }
        toast.success("New code sent!");
        setOtp(Array(OTP_LENGTH).fill(""));
        setAttempts(0);
        setErrors({});
        autoSubmitRef.current = false;
        startResendCooldown();
        setTimeout(() => document.getElementById("otp-0")?.focus(), 50);
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value) || loading) return;
        const next = [...otp];
        next[index] = value.slice(-1);
        setOtp(next);
        setErrors({});
        if (value && index < OTP_LENGTH - 1) document.getElementById(`otp-${index + 1}`)?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (pasted.length === OTP_LENGTH) {
            setOtp(pasted.split(""));
            document.getElementById(`otp-${OTP_LENGTH - 1}`)?.focus();
        }
    };

    const LeftPanel = () => (
        <aside className="hidden lg:flex w-[480px] xl:w-[520px] flex-shrink-0 flex-col relative overflow-hidden"
            style={{ background: "linear-gradient(155deg, #030a0f 0%, #061a14 50%, #0a3d2b 100%)" }}>
            {/* Grid pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{ backgroundImage: "linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 25s linear infinite" }} />
            {/* Glow orbs */}
            <div className="absolute pointer-events-none" style={{ top: -80, right: -80, width: 400, height: 400, background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 65%)" }} />
            <div className="absolute pointer-events-none" style={{ bottom: -60, left: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 65%)" }} />
            <div className="absolute pointer-events-none" style={{ top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300, background: "radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 65%)" }} />

            <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 no-underline mb-auto">
                    <div className="relative w-10 h-10 flex-shrink-0">
                        <Image src="/images/logo.png" alt="SariSari IMS" fill className="object-contain rounded-xl" sizes="40px" />
                    </div>
                    <div>
                        <div className="text-white font-black text-lg leading-none" style={{ fontFamily: "Syne, sans-serif" }}>
                            SariSari<span className="text-emerald-400">.</span>IMS
                        </div>
                        <div className="text-white/30 text-[0.52rem] font-bold uppercase tracking-widest mt-0.5">Admin Control Panel</div>
                    </div>
                </Link>

                <div className="my-auto">
                    <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7"
                        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 8px #34d399" }} />
                        <span className="text-emerald-300 text-[0.68rem] font-bold uppercase tracking-[0.15em]">Super Admin</span>
                    </div>
                    <h2 className="font-black text-white leading-[1.08] mb-5"
                        style={{ fontFamily: "Syne, sans-serif", fontSize: "2.8rem", letterSpacing: "-0.03em" }}>
                        System<br />
                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #34d399, #6ee7b7)" }}>
                            Command Center.
                        </span>
                    </h2>
                    <p className="text-slate-400/80 text-[0.95rem] leading-relaxed mb-8 max-w-[340px]">
                        Restricted access. Only the authorized system administrator may proceed beyond this point.
                    </p>
                    <div className="space-y-3">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>{f.icon}</div>
                                <span className="text-white/50 text-[0.85rem] font-medium">{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-auto">
                    {[{ val: "Root", label: "Access" }, { val: "Sys", label: "Admin" }, { val: "Live", label: "Monitor" }].map((s) => (
                        <div key={s.label} className="rounded-2xl p-4 text-center"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
                            <div className="text-emerald-400 font-black text-[1.1rem] leading-none mb-1" style={{ fontFamily: "Syne, sans-serif" }}>{s.val}</div>
                            <div className="text-white/25 text-[0.6rem] font-bold uppercase tracking-widest">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        h1, h2 { font-family: 'Syne', sans-serif; }
        @keyframes gridFloat { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        @keyframes shimmerBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .otp-input:focus { border-color: #059669 !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.15) !important; }

        .otp-box { width: 46px; height: 54px; font-size: 1.2rem; }
        @media (max-width: 480px) {
          .otp-box { width: 36px; height: 44px; font-size: 1rem; }
          .otp-wrap { gap: 4px !important; }
        }
        @media (max-width: 360px) {
          .otp-box { width: 30px; height: 38px; font-size: 0.85rem; }
          .otp-wrap { gap: 3px !important; }
        }
      `}</style>

            <div className="min-h-screen flex">
                <LeftPanel />

                <main className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-y-auto"
                    style={{ background: "#0d1117" }}>
                    <AnimatePresence mode="wait">

                        {/* ── STEP 1: Credentials ── */}
                        {step === "credentials" && (
                            <motion.div key="credentials"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[420px]">

                                {/* Mobile logo */}
                                <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-8">
                                    <div className="relative w-8 h-8">
                                        <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                                    </div>
                                    <span className="font-black text-white text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                        SariSari<span className="text-emerald-400">.</span>IMS
                                    </span>
                                </Link>

                                {/* Header */}
                                <div className="mb-8">
                                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
                                        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                        <Zap size={10} className="text-emerald-400" />
                                        <span className="text-emerald-400 text-[0.65rem] font-bold uppercase tracking-[0.2em]">Step 1 of 2 · Admin Auth</span>
                                    </div>
                                    <h1 className="font-black leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", letterSpacing: "-0.03em", color: "#f0fdf4" }}>
                                        Admin Sign In
                                    </h1>
                                    <p className="text-[0.9rem]" style={{ color: "#4b5563" }}>Restricted to authorized administrators only.</p>
                                </div>

                                <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-4">
                                    {/* Email */}
                                    <div>
                                        <label className="block text-[0.78rem] font-bold mb-1.5" style={{ color: "#6b7280" }}>Admin Email</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                                style={{ color: errors.email ? "#ef4444" : "#374151" }} />
                                            <input type="email" placeholder="sarisariims77@gmail.com" value={form.email}
                                                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(v => ({ ...v, email: undefined })); }}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl text-[0.9rem] outline-none transition-all"
                                                style={{
                                                    background: "#161b22",
                                                    color: "#e6edf3",
                                                    border: errors.email ? "1.5px solid #ef4444" : "1.5px solid #21262d",
                                                    boxShadow: errors.email ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                                                }}
                                            />
                                        </div>
                                        {errors.email && <p className="text-[0.75rem] text-red-500 mt-1">{errors.email}</p>}
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-[0.78rem] font-bold mb-1.5" style={{ color: "#6b7280" }}>Password</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                                style={{ color: errors.password ? "#ef4444" : "#374151" }} />
                                            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password}
                                                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(v => ({ ...v, password: undefined })); }}
                                                className="w-full pl-10 pr-11 py-3 rounded-xl text-[0.9rem] outline-none transition-all"
                                                style={{
                                                    background: "#161b22",
                                                    color: "#e6edf3",
                                                    border: errors.password ? "1.5px solid #ef4444" : "1.5px solid #21262d",
                                                    boxShadow: errors.password ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                                                }}
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                                                style={{ color: "#4b5563" }}>
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-[0.75rem] text-red-500 mt-1">{errors.password}</p>}
                                    </div>

                                    {/* Submit */}
                                    <button type="submit" disabled={loading}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                                        style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 8px 24px rgba(5,150,105,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem", letterSpacing: "0.01em" }}>
                                        {loading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={16} />Continue to Verification</>}
                                    </button>
                                </form>

                                {/* Divider */}
                                <div className="flex items-center gap-3 my-6">
                                    <div className="flex-1 h-px" style={{ background: "#21262d" }} />
                                    <span className="text-[0.7rem] font-semibold" style={{ color: "#30363d" }}>RESTRICTED</span>
                                    <div className="flex-1 h-px" style={{ background: "#21262d" }} />
                                </div>

                                {/* Back link */}
                                <Link href="/auth/login"
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.82rem] font-bold no-underline transition-all"
                                    style={{ color: "#4b5563", border: "1px solid #21262d" }}>
                                    ← Back to Owner Login
                                </Link>
                            </motion.div>
                        )}

                        {/* ── STEP 2: OTP ── */}
                        {step === "otp" && (
                            <motion.div key="otp"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[460px]">

                                {/* Icon */}
                                <div className="flex justify-center mb-6">
                                    <motion.div
                                        animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55 }}
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                        style={{
                                            background: attempts > 0 ? "linear-gradient(135deg, #1f0a0a, #2d0f0f)" : "linear-gradient(135deg, #061a14, #0a3d2b)",
                                            border: attempts > 0 ? "1.5px solid #7f1d1d" : "1.5px solid #065f46",
                                            transition: "all 0.3s ease",
                                        }}>
                                        {attempts > 0
                                            ? <AlertTriangle size={28} className="text-red-500" />
                                            : <KeyRound size={28} className="text-emerald-400" />}
                                    </motion.div>
                                </div>

                                {/* Header */}
                                <div className="mb-5 text-center">
                                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
                                        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                        <Zap size={10} className="text-emerald-400" />
                                        <span className="text-emerald-400 text-[0.65rem] font-bold uppercase tracking-[0.2em]">Step 2 of 2 · Email OTP</span>
                                    </div>
                                    <h1 className="font-black leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "1.9rem", letterSpacing: "-0.03em", color: "#f0fdf4" }}>
                                        Verify Your Identity
                                    </h1>
                                    <p className="text-[0.88rem] leading-relaxed" style={{ color: "#4b5563" }}>
                                        We sent an {OTP_LENGTH}-digit code to<br />
                                        <span className="font-bold" style={{ color: "#34d399" }}>{form.email}</span>
                                    </p>
                                </div>

                                {/* Attempt dots */}
                                <div className="flex items-center justify-center gap-2 mb-5">
                                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                                        <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                background: i < attempts ? "#ef4444" : "#21262d",
                                                boxShadow: i < attempts ? "0 0 6px rgba(239,68,68,0.5)" : "none",
                                                transform: i < attempts ? "scale(1.3)" : "scale(1)",
                                            }} />
                                    ))}
                                    <span className="text-[0.72rem] font-semibold ml-1.5"
                                        style={{ color: attempts === 0 ? "#4b5563" : attempts === 1 ? "#f97316" : "#ef4444" }}>
                                        {attempts === 0
                                            ? `${MAX_ATTEMPTS} attempts allowed`
                                            : `${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining`}
                                    </span>
                                </div>

                                <form onSubmit={handleOtpSubmit} noValidate>
                                    <motion.div
                                        animate={shake ? { x: [-7, 7, -6, 6, -4, 4, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55 }}
                                        className="otp-wrap flex justify-center mb-2"
                                        style={{ gap: "6px" }}
                                        onPaste={handleOtpPaste}>
                                        {otp.map((digit, i) => (
                                            <input
                                                key={i}
                                                id={`otp-${i}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                disabled={loading}
                                                onChange={e => handleOtpChange(i, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(i, e)}
                                                placeholder="·"
                                                className="otp-input otp-box text-center font-black rounded-xl outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={{
                                                    background: loading ? "#0d1117" : digit ? "#0a1f18" : "#161b22",
                                                    color: "#34d399",
                                                    border: errors.otp ? "1.5px solid #ef4444" : digit ? "1.5px solid #065f46" : "1.5px solid #21262d",
                                                    boxShadow: errors.otp ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                                                    fontFamily: "Syne, sans-serif",
                                                    transition: "all 0.15s ease",
                                                }}
                                            />
                                        ))}
                                    </motion.div>

                                    <AnimatePresence>
                                        {errors.otp && (
                                            <motion.p key="otp-error"
                                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="text-[0.75rem] text-red-500 text-center font-semibold mb-2 mt-1">
                                                {errors.otp}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>

                                    <AnimatePresence>
                                        {loading && (
                                            <motion.div key="verifying"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="flex items-center justify-center gap-2 my-3">
                                                <Loader2 size={14} className="animate-spin text-emerald-500" />
                                                <span className="text-[0.78rem] font-semibold" style={{ color: "#059669" }}>
                                                    {attempts >= MAX_ATTEMPTS - 1 && attempts > 0 ? "Redirecting back…" : "Verifying code…"}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Resend */}
                                    <div className="flex items-center justify-center gap-1.5 mb-5 mt-2">
                                        <span className="text-[0.82rem]" style={{ color: "#4b5563" }}>Didn't receive it?</span>
                                        <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                                            className="flex items-center gap-1 text-[0.82rem] font-bold transition-colors disabled:cursor-not-allowed"
                                            style={{ color: resendCooldown > 0 || loading ? "#374151" : "#059669" }}>
                                            <RefreshCw size={12} />
                                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                                        </button>
                                    </div>

                                    <button type="submit" disabled={loading || otp.join("").length < OTP_LENGTH}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 8px 24px rgba(5,150,105,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                        {loading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={16} />Verify & Enter Admin Panel</>}
                                    </button>
                                </form>

                                <button
                                    onClick={() => { setStep("credentials"); setOtp(Array(OTP_LENGTH).fill("")); setAttempts(0); setErrors({}); autoSubmitRef.current = false; }}
                                    disabled={loading}
                                    className="w-full mt-3 py-3 text-[0.85rem] font-semibold transition-colors rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ color: "#4b5563" }}>
                                    ← Back to credentials
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </main>
            </div>
        </>
    );
}