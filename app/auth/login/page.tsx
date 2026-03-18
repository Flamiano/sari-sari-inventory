"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
    ShieldCheck, TrendingUp, Package, KeyRound, RefreshCw, AlertTriangle,
    Smartphone, Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast, { Toaster } from "react-hot-toast";

const FEATURES = [
    { icon: <Package size={14} />, text: "Real-time inventory tracking" },
    { icon: <TrendingUp size={14} />, text: "Sales analytics & reports" },
    { icon: <ShieldCheck size={14} />, text: "Secure cloud backup" },
];

const OTP_LENGTH = 8;
const MAX_ATTEMPTS = 3;

type Step = "credentials" | "otp" | "mfa";

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("credentials");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [form, setForm] = useState({ email: "", password: "", remember: false });
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [errors, setErrors] = useState<{ email?: string; password?: string; otp?: string; mfa?: string }>({});
    const [attempts, setAttempts] = useState(0);
    const [shake, setShake] = useState(false);
    const autoSubmitRef = useRef(false);

    // MFA state — only used when the account has TOTP enabled
    const [mfaCode, setMfaCode] = useState("");
    const [mfaChallengeId, setMfaChallengeId] = useState("");
    const [mfaFactorId, setMfaFactorId] = useState("");
    const [mfaLoading, setMfaLoading] = useState(false);

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
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
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
                toast.error("Invalid email or password.");
                setErrors({ password: "Invalid credentials. Try again." });
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

        toast.success(`Code sent to ${form.email}`);
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

        const { error } = await supabase.auth.verifyOtp({
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

        // Check whether the account has a verified TOTP factor
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = (mfaData?.totp ?? []).find((f: any) => f.status === "verified");

        if (verifiedFactor) {
            // MFA enabled — start a challenge before granting full access
            const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
                factorId: verifiedFactor.id,
            });
            setLoading(false);
            if (challengeErr) { toast.error("Failed to start MFA challenge. Try again."); return; }
            setMfaFactorId(verifiedFactor.id);
            setMfaChallengeId(challengeData.id);
            setMfaCode("");
            setStep("mfa");
            toast.success("Email verified! Enter your authenticator code.");
            setTimeout(() => document.getElementById("mfa-input")?.focus(), 300);
        } else {
            // No MFA — sign in complete
            setLoading(false);
            toast.success("Verified! Welcome back 🎉");
            setTimeout(() => router.push("/owner"), 1000);
        }
    };

    // Step 3 (only if MFA enabled): verify the 6-digit TOTP from authenticator app
    const submitMfa = async (codeOverride?: string) => {
        const code = codeOverride ?? mfaCode;
        if (code.length !== 6) {
            setErrors({ mfa: "Enter the 6-digit code from your authenticator app." });
            return;
        }
        setErrors({});
        setMfaLoading(true);
        const { error } = await supabase.auth.mfa.verify({
            factorId: mfaFactorId, challengeId: mfaChallengeId, code,
        });
        setMfaLoading(false);
        if (error) {
            triggerShake();
            toast.error("Invalid authenticator code. Try again.");
            setErrors({ mfa: "Wrong code. Check your app and try again." });
            setMfaCode("");
            setTimeout(() => document.getElementById("mfa-input")?.focus(), 80);
            return;
        }
        toast.success("Two-factor verified! Welcome back 🎉");
        setTimeout(() => router.push("/owner"), 1000);
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
            style={{ background: "linear-gradient(155deg, #050E1F 0%, #0c1f4a 50%, #1346a0 100%)" }}>
            <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "gridFloat 25s linear infinite" }} />
            <div className="absolute pointer-events-none" style={{ top: -80, right: -80, width: 400, height: 400, background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)" }} />
            <div className="absolute pointer-events-none" style={{ bottom: -60, left: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 65%)" }} />
            <div className="absolute pointer-events-none" style={{ top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)" }} />

            <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
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

                <div className="my-auto">
                    <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7"
                        style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ boxShadow: "0 0 8px #60a5fa" }} />
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
                                    style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>{f.icon}</div>
                                <span className="text-white/60 text-[0.85rem] font-medium">{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-auto">
                    {[{ val: "24/7", label: "Store Access" }, { val: "Live", label: "Sync" }, { val: "Safe", label: "Data" }].map((s) => (
                        <div key={s.label} className="rounded-2xl p-4 text-center"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
                            <div className="text-white font-black text-[1.3rem] leading-none mb-1" style={{ fontFamily: "Syne, sans-serif" }}>{s.val}</div>
                            <div className="text-white/30 text-[0.6rem] font-bold uppercase tracking-widest">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );

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
        .otp-input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important; }
      `}</style>

            <div className="min-h-screen flex">
                <LeftPanel />

                <main className="flex-1 flex items-center justify-center bg-[#F7F9FC] p-6 md:p-10 overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* ── STEP 1: Credentials ── */}
                        {step === "credentials" && (
                            <motion.div key="credentials"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[420px]">

                                <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-8">
                                    <div className="relative w-8 h-8">
                                        <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                                    </div>
                                    <span className="font-black text-slate-900 text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                        SariSari<span className="text-blue-600">.</span>IMS
                                    </span>
                                </Link>

                                <div className="mb-8">
                                    <p className="text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Step 1 of 2</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", letterSpacing: "-0.03em" }}>
                                        Sign in to your<br />dashboard
                                    </h1>
                                    <p className="text-slate-400 text-[0.9rem]">Enter your credentials to continue.</p>
                                </div>

                                <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-4">
                                    <div>
                                        <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Email Address</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                                style={{ color: errors.email ? "#ef4444" : "#94a3b8" }} />
                                            <input type="email" placeholder="you@example.com" value={form.email}
                                                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(v => ({ ...v, email: undefined })); }}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                                style={{ border: errors.email ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: errors.email ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                            />
                                        </div>
                                        {errors.email && <p className="text-[0.75rem] text-red-500 mt-1">{errors.email}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Password</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                                style={{ color: errors.password ? "#ef4444" : "#94a3b8" }} />
                                            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password}
                                                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(v => ({ ...v, password: undefined })); }}
                                                className="w-full pl-10 pr-11 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                                style={{ border: errors.password ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: errors.password ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }}
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-[0.75rem] text-red-500 mt-1">{errors.password}</p>}
                                    </div>

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

                                    <button type="submit" disabled={loading}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                                        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem", letterSpacing: "0.01em" }}>
                                        {loading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={16} />Continue</>}
                                    </button>
                                </form>

                                <div className="flex items-center gap-3 my-5">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-slate-300 text-[0.7rem] font-semibold">OR</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>

                                <p className="text-center text-[0.85rem] text-slate-500 mb-4">
                                    Don't have an account?{" "}
                                    <Link href="/auth/register" className="font-bold text-blue-600 hover:text-blue-700 no-underline transition-colors">
                                        Create one free →
                                    </Link>
                                </p>

                                {/* ── Staff / Cashier Portal Link ── */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-slate-300 text-[0.7rem] font-semibold whitespace-nowrap">NOT THE OWNER?</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>
                                <Link
                                    href="/auth/staff-cashier-worker-login"
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.82rem] font-bold text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all no-underline"
                                >
                                    Staff / Cashier Portal →
                                </Link>

                            </motion.div>
                        )}

                        {/* ── STEP 2: OTP ── */}
                        {step === "otp" && (
                            <motion.div key="otp"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[460px]">

                                <div className="flex justify-center mb-6">
                                    <motion.div
                                        animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55 }}
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                        style={{
                                            background: attempts > 0 ? "linear-gradient(135deg, #fff1f2, #fee2e2)" : "linear-gradient(135deg, #eff6ff, #dbeafe)",
                                            border: attempts > 0 ? "1.5px solid #fecaca" : "1.5px solid #bfdbfe",
                                            transition: "all 0.3s ease",
                                        }}>
                                        {attempts > 0
                                            ? <AlertTriangle size={28} className="text-red-500" />
                                            : <KeyRound size={28} className="text-blue-600" />}
                                    </motion.div>
                                </div>

                                <div className="mb-5 text-center">
                                    <p className="text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Step 2 of 2</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "1.9rem", letterSpacing: "-0.03em" }}>
                                        Check your email
                                    </h1>
                                    <p className="text-slate-400 text-[0.88rem] leading-relaxed">
                                        We sent an {OTP_LENGTH}-digit code to<br />
                                        <span className="font-bold text-slate-700">{form.email}</span>
                                    </p>
                                </div>

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
                                                disabled={loading}
                                                onChange={e => handleOtpChange(i, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(i, e)}
                                                placeholder="·"
                                                className="otp-input text-center font-black text-slate-900 bg-white rounded-xl outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={{
                                                    width: "46px", height: "54px", fontSize: "1.2rem",
                                                    border: errors.otp ? "1.5px solid #ef4444" : digit ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                                                    background: loading ? "#f8fafc" : digit ? "#f0f7ff" : "white",
                                                    boxShadow: errors.otp ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                                                    fontFamily: "Syne, sans-serif", transition: "all 0.15s ease",
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
                                                <Loader2 size={14} className="animate-spin text-blue-500" />
                                                <span className="text-[0.78rem] text-blue-500 font-semibold">
                                                    {attempts >= MAX_ATTEMPTS - 1 && attempts > 0 ? "Redirecting back to login…" : "Verifying code…"}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center justify-center gap-1.5 mb-5 mt-2">
                                        <span className="text-[0.82rem] text-slate-400">Didn't receive it?</span>
                                        <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                                            className="flex items-center gap-1 text-[0.82rem] font-bold transition-colors disabled:cursor-not-allowed"
                                            style={{ color: resendCooldown > 0 || loading ? "#94a3b8" : "#2563eb" }}>
                                            <RefreshCw size={12} />
                                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                                        </button>
                                    </div>

                                    <button type="submit" disabled={loading || otp.join("").length < OTP_LENGTH}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                        {loading && (
                                            <span className="absolute inset-0 pointer-events-none"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                        )}
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={16} />Verify & Sign In</>}
                                    </button>
                                </form>

                                <button
                                    onClick={() => { setStep("credentials"); setOtp(Array(OTP_LENGTH).fill("")); setAttempts(0); setErrors({}); autoSubmitRef.current = false; }}
                                    disabled={loading}
                                    className="w-full mt-3 py-3 text-[0.85rem] font-semibold text-slate-400 hover:text-slate-700 transition-colors rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                                    ← Back to login
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP 3: TOTP MFA — only appears when account has MFA enabled ── */}
                        {step === "mfa" && (
                            <motion.div key="mfa"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-[420px]">

                                <div className="flex justify-center mb-6">
                                    <motion.div
                                        animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55 }}
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                        style={{
                                            background: errors.mfa ? "linear-gradient(135deg, #fff1f2, #fee2e2)" : "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                                            border: errors.mfa ? "1.5px solid #fecaca" : "1.5px solid #bbf7d0",
                                            transition: "all 0.3s ease",
                                        }}>
                                        {errors.mfa
                                            ? <AlertTriangle size={28} className="text-red-500" />
                                            : <Smartphone size={28} className="text-emerald-600" />}
                                    </motion.div>
                                </div>

                                <div className="mb-6 text-center">
                                    <p className="text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.2em] mb-2">Step 3 of 3</p>
                                    <h1 className="font-black text-slate-900 leading-[1.1] mb-2"
                                        style={{ fontFamily: "Syne, sans-serif", fontSize: "1.9rem", letterSpacing: "-0.03em" }}>
                                        Two-Factor Auth
                                    </h1>
                                    <p className="text-slate-400 text-[0.88rem] leading-relaxed">
                                        Open your authenticator app and enter<br />the 6-digit code for this account.
                                    </p>
                                </div>

                                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
                                    <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[0.78rem] text-blue-700 font-medium leading-snug">
                                        Your account has two-factor authentication enabled. Enter the rotating 6-digit code from your authenticator app to complete sign-in.
                                    </p>
                                </div>

                                <div className="mb-2">
                                    <label className="block text-[0.78rem] font-bold text-slate-700 mb-3 text-center uppercase tracking-widest">
                                        Authenticator Code
                                    </label>
                                    <motion.div animate={shake ? { x: [-7, 7, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.55 }}>
                                        <input
                                            id="mfa-input"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={mfaCode}
                                            disabled={mfaLoading}
                                            onChange={e => {
                                                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                                                setMfaCode(v);
                                                setErrors(p => ({ ...p, mfa: undefined }));
                                                if (v.length === 6) submitMfa(v);
                                            }}
                                            placeholder="000000"
                                            className="w-full text-center font-black text-slate-900 bg-white rounded-2xl outline-none transition-all disabled:opacity-40"
                                            style={{
                                                fontSize: "2.2rem", letterSpacing: "0.35em",
                                                padding: "20px 16px",
                                                border: errors.mfa ? "1.5px solid #ef4444" : mfaCode ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                                                background: mfaLoading ? "#f8fafc" : mfaCode ? "#f0f7ff" : "white",
                                                boxShadow: errors.mfa ? "0 0 0 3px rgba(239,68,68,0.08)" : mfaCode ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                                                fontFamily: "Syne, sans-serif",
                                            }} />
                                    </motion.div>
                                    <AnimatePresence>
                                        {errors.mfa && (
                                            <motion.p key="mfa-error"
                                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="text-[0.75rem] text-red-500 text-center font-semibold mt-2">
                                                {errors.mfa}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <AnimatePresence>
                                    {mfaLoading && (
                                        <motion.div key="mfa-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="flex items-center justify-center gap-2 my-3">
                                            <Loader2 size={14} className="animate-spin text-blue-500" />
                                            <span className="text-[0.78rem] text-blue-500 font-semibold">Verifying…</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button onClick={() => submitMfa()} disabled={mfaLoading || mfaCode.length !== 6}
                                    className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                    style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)", fontFamily: "Syne, sans-serif", fontSize: "0.92rem" }}>
                                    {mfaLoading && (
                                        <span className="absolute inset-0 pointer-events-none"
                                            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                    )}
                                    {mfaLoading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={16} />Verify & Sign In</>}
                                </button>

                                <p className="text-center text-[0.75rem] text-slate-400 mt-4 leading-relaxed">
                                    The code rotates every 30 seconds.<br />Make sure your device clock is accurate.
                                </p>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </main>
            </div>
        </>
    );
}