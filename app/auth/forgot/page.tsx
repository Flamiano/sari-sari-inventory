"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Mail, ArrowLeft, ArrowRight, Loader2, KeyRound,
    ShieldCheck, Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast from "react-hot-toast";

// ── Constants ──────────────────────────────────────────────────────────────
const OTP_LENGTH = 8;
const MAX_ATTEMPTS = 3;

type Step = "email" | "otp" | "newPassword" | "done";

// ── Password strength helper ───────────────────────────────────────────────
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

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>("email");

    // Step 1 — email
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);

    // Step 2 — OTP
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [otpError, setOtpError] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [shake, setShake] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const autoSubmitRef = useRef(false);

    // Step 3 — new password
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwdErrors, setPwdErrors] = useState<{ password?: string; confirm?: string }>({});
    const [pwdLoading, setPwdLoading] = useState(false);

    const strength = strengthInfo(password);

    // ── Auto-submit OTP when all digits filled ────────────────────────────
    useEffect(() => {
        const token = otp.join("");
        if (token.length === OTP_LENGTH && !autoSubmitRef.current && step === "otp" && !otpLoading) {
            autoSubmitRef.current = true;
            verifyOtp(token);
        }
        if (token.length < OTP_LENGTH) autoSubmitRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp]);

    // ── Step 1: Send OTP ──────────────────────────────────────────────────
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setEmailError("Email is required."); return; }
        if (!/\S+@\S+\.\S+/.test(email)) { setEmailError("Enter a valid email address."); return; }
        setEmailError("");
        setEmailLoading(true);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
        });

        setEmailLoading(false);

        if (error) {
            // Supabase returns an error if the email doesn't exist when shouldCreateUser is false
            if (error.message?.toLowerCase().includes("user") || error.status === 400) {
                toast.error("No account found with that email.");
                setEmailError("No account found with that email address.");
            } else {
                toast.error("Failed to send code. Please try again.");
            }
            return;
        }

        toast.success(`Verification code sent to ${email}`);
        setAttempts(0);
        setOtp(Array(OTP_LENGTH).fill(""));
        autoSubmitRef.current = false;
        setStep("otp");
        startResendCooldown();
        setTimeout(() => document.getElementById("otp-0")?.focus(), 500);
    };

    // ── Step 2: Verify OTP ────────────────────────────────────────────────
    const verifyOtp = async (token: string) => {
        setOtpError("");
        setOtpLoading(true);

        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: "email",
        });

        if (error) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setOtpLoading(false);
            triggerShake();

            if (newAttempts >= MAX_ATTEMPTS) {
                toast.error("Too many failed attempts. Please try again.", { duration: 3500 });
                setOtpLoading(true);
                setTimeout(() => {
                    setStep("email");
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setAttempts(0);
                    setOtpError("");
                    autoSubmitRef.current = false;
                    setOtpLoading(false);
                }, 2200);
            } else {
                const remaining = MAX_ATTEMPTS - newAttempts;
                toast.error(`Wrong code — ${remaining} attempt${remaining === 1 ? "" : "s"} left.`);
                setOtpError(`Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
                setOtp(Array(OTP_LENGTH).fill(""));
                autoSubmitRef.current = false;
                setTimeout(() => document.getElementById("otp-0")?.focus(), 80);
            }
            return;
        }

        // OTP verified — move to password reset step
        setOtpLoading(false);
        toast.success("Identity verified! Set your new password.");
        setStep("newPassword");
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = otp.join("");
        if (token.length < OTP_LENGTH) {
            setOtpError(`Please enter all ${OTP_LENGTH} digits.`);
            return;
        }
        if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            await verifyOtp(token);
        }
    };

    // ── Step 3: Update password ───────────────────────────────────────────
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: typeof pwdErrors = {};
        if (!password) errs.password = "Password is required.";
        else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
        if (!confirm) errs.confirm = "Please confirm your password.";
        else if (confirm !== password) errs.confirm = "Passwords do not match.";
        if (Object.keys(errs).length) { setPwdErrors(errs); return; }
        setPwdErrors({});
        setPwdLoading(true);

        const { error } = await supabase.auth.updateUser({ password });

        setPwdLoading(false);

        if (error) {
            toast.error(error.message || "Failed to update password.");
            return;
        }

        // Sign out after password change so user logs in fresh
        await supabase.auth.signOut();
        toast.success("Password updated successfully!");
        setStep("done");
    };

    // ── OTP helpers ───────────────────────────────────────────────────────
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
        if (resendCooldown > 0 || otpLoading) return;
        setOtpLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
        });
        setOtpLoading(false);
        if (error) { toast.error("Failed to resend code."); return; }
        toast.success("New code sent!");
        setOtp(Array(OTP_LENGTH).fill(""));
        setAttempts(0);
        setOtpError("");
        autoSubmitRef.current = false;
        startResendCooldown();
        setTimeout(() => document.getElementById("otp-0")?.focus(), 50);
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value) || otpLoading) return;
        const next = [...otp];
        next[index] = value.slice(-1);
        setOtp(next);
        setOtpError("");
        if (value && index < OTP_LENGTH - 1) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (pasted.length === OTP_LENGTH) {
            setOtp(pasted.split(""));
            document.getElementById(`otp-${OTP_LENGTH - 1}`)?.focus();
        }
    };

    // ── Left Panel ────────────────────────────────────────────────────────
    const LeftPanel = () => (
        <aside className="hidden lg:flex w-[460px] xl:w-[500px] flex-shrink-0 flex-col relative overflow-hidden"
            style={{ background: "linear-gradient(155deg, #050E1F 0%, #1a1060 50%, #2c0b6b 100%)" }}>
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 28s linear infinite" }} />
            <div className="absolute pointer-events-none" style={{ top: "35%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)" }} />
            <div className="absolute pointer-events-none" style={{ top: -80, right: -80, width: 350, height: 350, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)" }} />
            <div className="absolute pointer-events-none" style={{ bottom: -60, left: -60, width: 320, height: 320, background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)" }} />

            <div className="absolute pointer-events-none" style={{ top: "38%", left: "50%", transform: "translate(-50%, -50%)" }}>
                <div className="relative w-36 h-36 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center z-10"
                        style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", backdropFilter: "blur(8px)", animation: "pulseGlow 3s ease-in-out infinite" }}>
                        <KeyRound size={28} className="text-violet-300" />
                    </div>
                    <div className="absolute inset-0 rounded-full" style={{ border: "1px dashed rgba(139,92,246,0.2)" }} />
                    <div className="absolute" style={{ top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}>
                        <div className="w-2 h-2 rounded-full bg-violet-400" style={{ animation: "orbitSpin 6s linear infinite", boxShadow: "0 0 8px #a78bfa" }} />
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
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
                        Verify your identity with an 8-digit code, then set a new secure password.
                    </p>

                    <div className="space-y-4">
                        {[
                            { num: "01", title: "Enter your email", desc: "The one you registered with", active: step === "email" },
                            { num: "02", title: "Verify 8-digit code", desc: "Check your inbox for the code", active: step === "otp" },
                            { num: "03", title: "Set new password", desc: "Choose something strong and unique", active: step === "newPassword" || step === "done" },
                        ].map((s, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-[0.7rem] transition-all duration-300"
                                    style={{
                                        background: s.active ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.1)",
                                        border: s.active ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(139,92,246,0.2)",
                                        color: s.active ? "#c4b5fd" : "#7c5cbf",
                                        fontFamily: "Syne, sans-serif",
                                    }}>
                                    {s.num}
                                </div>
                                <div>
                                    <div className="text-[0.84rem] font-semibold transition-colors duration-300" style={{ color: s.active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)" }}>{s.title}</div>
                                    <div className="text-[0.73rem]" style={{ color: s.active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>{s.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
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
        @keyframes orbitSpin { from { transform: rotate(0deg) translateX(80px) rotate(0deg); } to { transform: rotate(360deg) translateX(80px) rotate(-360deg); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.05); } }
        .otp-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12) !important; }
        .strength-bar { transition: width 0.4s ease, background-color 0.4s ease; }
      `}</style>

            <div className="min-h-screen flex">
                <LeftPanel />

                <main className="flex-1 flex items-center justify-center bg-[#F7F9FC] p-6 md:p-10 overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* ── STEP 1: Email ── */}
                        {step === "email" && (
                            <motion.div key="email"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[400px]">

                                <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-8">
                                    <div className="relative w-8 h-8">
                                        <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                                    </div>
                                    <span className="font-black text-slate-900 text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                        SariSari<span className="text-violet-600">.</span>IMS
                                    </span>
                                </Link>

                                <Link href="/auth/login"
                                    className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-slate-500 hover:text-violet-600 no-underline mb-8 transition-colors">
                                    <ArrowLeft size={14} /> Back to login
                                </Link>

                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                                    style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)", border: "1.5px solid #c4b5fd" }}>
                                    <KeyRound size={24} className="text-violet-600" />
                                </div>

                                <div className="mb-8">
                                    <p className="text-violet-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Step 1 of 3 · Password Recovery</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", letterSpacing: "-0.03em" }}>
                                        Forgot your<br />password?
                                    </h1>
                                    <p className="text-slate-400 text-[0.9rem] leading-relaxed max-w-[300px]">
                                        Enter your registered email and we'll send you an 8-digit verification code.
                                    </p>
                                </div>

                                <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
                                    <div>
                                        <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Email Address</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                                style={{ color: emailError ? "#ef4444" : "#94a3b8" }} />
                                            <input type="email" placeholder="you@example.com" value={email}
                                                onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                                style={{ border: emailError ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: emailError ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                            />
                                        </div>
                                        {emailError && <p className="text-[0.75rem] text-red-500 mt-1">{emailError}</p>}
                                    </div>

                                    <button type="submit" disabled={emailLoading}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 24px rgba(124,58,237,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                        {emailLoading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {emailLoading
                                            ? <><Loader2 size={17} className="animate-spin" />Sending code…</>
                                            : <><ArrowRight size={16} />Send Verification Code</>
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

                        {/* ── STEP 2: OTP ── */}
                        {step === "otp" && (
                            <motion.div key="otp"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[460px]">

                                {/* Icon badge */}
                                <div className="flex justify-center mb-6">
                                    <motion.div
                                        animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55 }}
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                        style={{
                                            background: attempts > 0 ? "linear-gradient(135deg, #fff1f2, #fee2e2)" : "linear-gradient(135deg, #ede9fe, #ddd6fe)",
                                            border: attempts > 0 ? "1.5px solid #fecaca" : "1.5px solid #c4b5fd",
                                            transition: "all 0.3s ease",
                                        }}>
                                        {attempts > 0
                                            ? <AlertTriangle size={28} className="text-red-500" />
                                            : <KeyRound size={28} className="text-violet-600" />}
                                    </motion.div>
                                </div>

                                <div className="mb-5 text-center">
                                    <p className="text-violet-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Step 2 of 3 · Verify Identity</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "1.9rem", letterSpacing: "-0.03em" }}>
                                        Check your email
                                    </h1>
                                    <p className="text-slate-400 text-[0.88rem] leading-relaxed">
                                        We sent an {OTP_LENGTH}-digit code to<br />
                                        <span className="font-bold text-slate-700">{email}</span>
                                    </p>
                                </div>

                                {/* Attempt indicators */}
                                <div className="flex items-center justify-center gap-2 mb-5">
                                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                                        <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                background: i < attempts ? "#ef4444" : "#e2e8f0",
                                                boxShadow: i < attempts ? "0 0 6px rgba(239,68,68,0.5)" : "none",
                                                transform: i < attempts ? "scale(1.3)" : "scale(1)",
                                            }} />
                                    ))}
                                    <span className="text-[0.72rem] font-semibold ml-1.5"
                                        style={{ color: attempts === 0 ? "#94a3b8" : attempts === 1 ? "#f97316" : "#ef4444" }}>
                                        {attempts === 0
                                            ? `${MAX_ATTEMPTS} attempts allowed`
                                            : `${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining`}
                                    </span>
                                </div>

                                <form onSubmit={handleOtpSubmit} noValidate>
                                    <motion.div
                                        animate={shake ? { x: [-7, 7, -6, 6, -4, 4, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55 }}
                                        className="flex gap-1.5 justify-center mb-2"
                                        onPaste={handleOtpPaste}>
                                        {otp.map((digit, i) => (
                                            <input
                                                key={i}
                                                id={`otp-${i}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                disabled={otpLoading}
                                                onChange={e => handleOtpChange(i, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(i, e)}
                                                placeholder="·"
                                                className="otp-input text-center font-black text-slate-900 bg-white rounded-xl outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={{
                                                    width: "46px",
                                                    height: "54px",
                                                    fontSize: "1.2rem",
                                                    border: otpError ? "1.5px solid #ef4444" : digit ? "1.5px solid #c4b5fd" : "1.5px solid #e2e8f0",
                                                    background: otpLoading ? "#f8fafc" : digit ? "#f5f3ff" : "white",
                                                    boxShadow: otpError ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                                                    fontFamily: "Syne, sans-serif",
                                                    transition: "all 0.15s ease",
                                                }}
                                            />
                                        ))}
                                    </motion.div>

                                    <AnimatePresence>
                                        {otpError && (
                                            <motion.p key="otp-error"
                                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="text-[0.75rem] text-red-500 text-center font-semibold mb-2 mt-1">
                                                {otpError}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>

                                    <AnimatePresence>
                                        {otpLoading && (
                                            <motion.div key="verifying"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="flex items-center justify-center gap-2 my-3">
                                                <Loader2 size={14} className="animate-spin text-violet-500" />
                                                <span className="text-[0.78rem] text-violet-500 font-semibold">
                                                    {attempts >= MAX_ATTEMPTS - 1 && attempts > 0
                                                        ? "Redirecting back…"
                                                        : "Verifying code…"}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center justify-center gap-1.5 mb-5 mt-2">
                                        <span className="text-[0.82rem] text-slate-400">Didn't receive it?</span>
                                        <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || otpLoading}
                                            className="flex items-center gap-1 text-[0.82rem] font-bold transition-colors disabled:cursor-not-allowed"
                                            style={{ color: resendCooldown > 0 || otpLoading ? "#94a3b8" : "#7c3aed" }}>
                                            <RefreshCw size={12} />
                                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                                        </button>
                                    </div>

                                    <button type="submit"
                                        disabled={otpLoading || otp.join("").length < OTP_LENGTH}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 24px rgba(124,58,237,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                        {otpLoading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {otpLoading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={16} />Verify Identity</>}
                                    </button>
                                </form>

                                <button
                                    onClick={() => {
                                        setStep("email");
                                        setOtp(Array(OTP_LENGTH).fill(""));
                                        setAttempts(0);
                                        setOtpError("");
                                        autoSubmitRef.current = false;
                                    }}
                                    disabled={otpLoading}
                                    className="w-full mt-3 py-3 text-[0.85rem] font-semibold text-slate-400 hover:text-slate-700 transition-colors rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                                    ← Back
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP 3: New Password ── */}
                        {step === "newPassword" && (
                            <motion.div key="newPassword"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[420px]">

                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                                    style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)", border: "1.5px solid #c4b5fd" }}>
                                    <ShieldCheck size={24} className="text-violet-600" />
                                </div>

                                <div className="mb-8">
                                    <p className="text-violet-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Step 3 of 3 · New Password</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", letterSpacing: "-0.03em" }}>
                                        Set a new<br />password
                                    </h1>
                                    <p className="text-slate-400 text-[0.9rem] leading-relaxed">
                                        Choose something strong. You'll receive an email confirmation once your password is updated.
                                    </p>
                                </div>

                                <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
                                    {/* New password */}
                                    <div>
                                        <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPwd ? "text" : "password"}
                                                placeholder="Min. 8 characters"
                                                value={password}
                                                onChange={e => { setPassword(e.target.value); setPwdErrors(v => ({ ...v, password: undefined })); }}
                                                className="w-full pl-4 pr-11 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                                style={{ border: pwdErrors.password ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: pwdErrors.password ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                            />
                                            <button type="button" onClick={() => setShowPwd(v => !v)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors">
                                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {/* Strength bar */}
                                        {password && (
                                            <div className="mt-2">
                                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full strength-bar" style={{ width: `${strength.pct}%`, backgroundColor: strength.color }} />
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <p className="text-[0.67rem] font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                                                    {strength.pct < 100 && (
                                                        <p className="text-[0.62rem] text-slate-400 font-medium">
                                                            Add {[
                                                                !/[A-Z]/.test(password) && "uppercase",
                                                                !/[0-9]/.test(password) && "number",
                                                                !/[^A-Za-z0-9]/.test(password) && "symbol",
                                                            ].filter(Boolean).join(", ")} to strengthen
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {pwdErrors.password && <p className="text-[0.75rem] text-red-500 mt-1">{pwdErrors.password}</p>}
                                    </div>

                                    {/* Confirm password */}
                                    <div>
                                        <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="Re-enter your password"
                                                value={confirm}
                                                onChange={e => { setConfirm(e.target.value); setPwdErrors(v => ({ ...v, confirm: undefined })); }}
                                                className="w-full pl-4 pr-11 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                                style={{ border: pwdErrors.confirm ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: pwdErrors.confirm ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                            />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors">
                                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {pwdErrors.confirm && <p className="text-[0.75rem] text-red-500 mt-1">{pwdErrors.confirm}</p>}
                                    </div>

                                    <button type="submit" disabled={pwdLoading}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 24px rgba(124,58,237,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                        {pwdLoading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {pwdLoading
                                            ? <><Loader2 size={18} className="animate-spin" />Updating password…</>
                                            : <><ShieldCheck size={16} />Update Password</>
                                        }
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ── DONE ── */}
                        {step === "done" && (
                            <motion.div key="done"
                                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[400px] text-center">

                                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 12px 32px rgba(124,58,237,0.3)" }}>
                                    <CheckCircle2 size={36} className="text-white" />
                                </div>

                                <h2 className="font-black text-slate-900 text-2xl mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
                                    Password updated!
                                </h2>
                                <p className="text-slate-500 text-[0.9rem] leading-relaxed mb-2">
                                    Your password has been changed successfully.
                                </p>
                                <p className="text-slate-400 text-[0.82rem] mb-6">
                                    A confirmation email has been sent to <span className="font-bold text-slate-600">{email}</span>.
                                </p>

                                <div className="space-y-2.5 mb-8">
                                    {[
                                        "Your old password no longer works",
                                        "You've been signed out for security",
                                        "Check your email for confirmation",
                                    ].map((tip, i) => (
                                        <div key={i} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                                            <ShieldCheck size={13} className="text-violet-400 flex-shrink-0" />
                                            <span className="text-slate-500 text-[0.8rem]">{tip}</span>
                                        </div>
                                    ))}
                                </div>

                                <Link href="/auth/login"
                                    className="w-full flex items-center justify-center gap-2 font-bold text-white py-3.5 rounded-xl no-underline transition-all text-[0.9rem]"
                                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 24px rgba(124,58,237,0.25)", fontFamily: "Syne, sans-serif" }}>
                                    <ArrowLeft size={15} /> Back to Login
                                </Link>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </main>
            </div>
        </>
    );
}