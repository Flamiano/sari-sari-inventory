"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Eye, EyeOff, Loader2, ShieldAlert, Terminal,
    Lock, AtSign, ChevronRight, AlertOctagon, KeyRound,
    RefreshCw, CheckCircle2, XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "sarisariims77@gmail.com";
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
    const [typedChars, setTypedChars] = useState(0);
    const autoSubmitRef = useRef(false);
    const cursorRef = useRef<NodeJS.Timeout | null>(null);
    const [showCursor, setShowCursor] = useState(true);

    // Blinking cursor effect
    useEffect(() => {
        cursorRef.current = setInterval(() => setShowCursor(v => !v), 530);
        return () => { if (cursorRef.current) clearInterval(cursorRef.current); };
    }, []);

    // Auto-submit OTP when all digits filled
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
        if (!form.email) errs.email = "Email required.";
        else if (form.email !== ADMIN_EMAIL) errs.email = "Unauthorized. Access denied.";
        if (!form.password) errs.password = "Password required.";
        return errs;
    };

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); triggerShake(); return; }
        setErrors({});
        setLoading(true);

        // Extra guard: block non-admin emails at network level too
        if (form.email !== ADMIN_EMAIL) {
            setLoading(false);
            triggerShake();
            toast.error("Access denied.");
            setErrors({ email: "This portal is restricted to administrators only." });
            return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
        });

        if (signInError) {
            setLoading(false);
            triggerShake();
            toast.error("Authentication failed.");
            setErrors({ password: "Invalid credentials. Access denied." });
            return;
        }

        await supabase.auth.signOut();

        const { error: otpError } = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { shouldCreateUser: false },
        });

        setLoading(false);

        if (otpError) {
            toast.error("Failed to dispatch verification token.");
            return;
        }

        toast.success("Verification token dispatched.");
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
                toast.error("Maximum attempts exceeded. Session terminated.", { duration: 3500 });
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
                toast.error(`Token mismatch — ${remaining} attempt${remaining === 1 ? "" : "s"} left.`);
                setErrors({ otp: `Invalid token. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` });
                setOtp(Array(OTP_LENGTH).fill(""));
                autoSubmitRef.current = false;
                setTimeout(() => document.getElementById("otp-0")?.focus(), 80);
            }
            return;
        }

        setLoading(false);
        toast.success("Access granted. Redirecting...");
        setTimeout(() => router.push("/admin"), 1000);
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = otp.join("");
        if (token.length < OTP_LENGTH) {
            setErrors({ otp: `Enter all ${OTP_LENGTH} digits.` });
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
        if (error) { toast.error("Failed to resend token."); return; }
        toast.success("New token dispatched.");
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

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap');

        * { box-sizing: border-box; }

        body { background: #060a0f; }

        .admin-root {
          font-family: 'Space Grotesk', sans-serif;
          min-height: 100vh;
          background: #060a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 24px 16px;
        }

        .mono { font-family: 'IBM Plex Mono', monospace; }
        .bebas { font-family: 'Bebas Neue', sans-serif; }

        /* Animated grid background */
        .grid-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px);
          background-size: 44px 44px;
          animation: gridDrift 30s linear infinite;
        }

        @keyframes gridDrift {
          0% { background-position: 0 0; }
          100% { background-position: 44px 44px; }
        }

        /* Scanline overlay */
        .scanlines {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.08) 3px,
            rgba(0,0,0,0.08) 4px
          );
          z-index: 0;
        }

        /* Glow blobs */
        .blob-1 {
          position: fixed;
          top: -120px; left: -120px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(0,255,136,0.07) 0%, transparent 70%);
          pointer-events: none;
          animation: blobPulse 8s ease-in-out infinite;
        }
        .blob-2 {
          position: fixed;
          bottom: -100px; right: -100px;
          width: 450px; height: 450px;
          background: radial-gradient(circle, rgba(255,60,60,0.05) 0%, transparent 70%);
          pointer-events: none;
          animation: blobPulse 10s ease-in-out infinite reverse;
        }

        @keyframes blobPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        /* Card */
        .card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          background: rgba(10, 16, 26, 0.92);
          border: 1px solid rgba(0,255,136,0.12);
          border-radius: 4px;
          padding: 40px 36px;
          backdrop-filter: blur(20px);
          box-shadow:
            0 0 0 1px rgba(0,255,136,0.05),
            0 32px 64px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        @media (max-width: 520px) {
          .card { padding: 28px 20px; }
        }

        /* Corner accents */
        .card::before, .card::after {
          content: '';
          position: absolute;
          width: 16px; height: 16px;
          border-color: rgba(0,255,136,0.4);
          border-style: solid;
        }
        .card::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
        .card::after  { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }

        /* Status bar */
        .status-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0,255,136,0.05);
          border: 1px solid rgba(0,255,136,0.1);
          border-radius: 2px;
          padding: 6px 12px;
          margin-bottom: 28px;
        }

        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88;
          animation: statusBlink 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Input field */
        .field-wrap {
          position: relative;
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem;
          font-weight: 600;
          color: rgba(0,255,136,0.6);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .field-input {
          width: 100%;
          background: rgba(0,255,136,0.03);
          border: 1px solid rgba(0,255,136,0.15);
          border-radius: 2px;
          color: #e2ffe9;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.88rem;
          padding: 12px 44px 12px 44px;
          outline: none;
          transition: all 0.2s;
        }

        .field-input::placeholder { color: rgba(255,255,255,0.15); }

        .field-input:focus {
          border-color: rgba(0,255,136,0.45);
          background: rgba(0,255,136,0.05);
          box-shadow: 0 0 0 3px rgba(0,255,136,0.07), 0 0 20px rgba(0,255,136,0.05);
        }

        .field-input.error {
          border-color: rgba(255,60,60,0.5);
          background: rgba(255,60,60,0.03);
          box-shadow: 0 0 0 3px rgba(255,60,60,0.07);
        }

        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0,255,136,0.4);
          pointer-events: none;
        }

        .field-icon.err { color: rgba(255,60,60,0.6); }

        .field-error {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          color: #ff5555;
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,200,100,0.1));
          border: 1px solid rgba(0,255,136,0.3);
          border-radius: 2px;
          color: #00ff88;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(0,255,136,0.22), rgba(0,200,100,0.16));
          border-color: rgba(0,255,136,0.5);
          box-shadow: 0 0 24px rgba(0,255,136,0.12);
        }

        .submit-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .submit-btn .shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(0,255,136,0.08), transparent);
          animation: shimmer 1.5s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* OTP boxes */
        .otp-box {
          width: 48px; height: 56px;
          background: rgba(0,255,136,0.03);
          border: 1px solid rgba(0,255,136,0.15);
          border-radius: 2px;
          color: #00ff88;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.3rem;
          font-weight: 700;
          text-align: center;
          outline: none;
          transition: all 0.15s;
          caret-color: #00ff88;
        }

        .otp-box:focus {
          border-color: rgba(0,255,136,0.5);
          background: rgba(0,255,136,0.07);
          box-shadow: 0 0 12px rgba(0,255,136,0.1);
        }

        .otp-box.filled {
          border-color: rgba(0,255,136,0.35);
          background: rgba(0,255,136,0.06);
        }

        .otp-box.err {
          border-color: rgba(255,60,60,0.45);
          background: rgba(255,60,60,0.04);
        }

        .otp-box:disabled { opacity: 0.35; cursor: not-allowed; }

        @media (max-width: 480px) {
          .otp-box { width: 38px; height: 46px; font-size: 1rem; }
          .otp-wrap { gap: 5px !important; }
        }

        @media (max-width: 360px) {
          .otp-box { width: 30px; height: 38px; font-size: 0.85rem; }
          .otp-wrap { gap: 3px !important; }
        }

        /* Divider */
        .divider {
          border: none;
          border-top: 1px solid rgba(0,255,136,0.07);
          margin: 24px 0;
        }

        /* Back btn */
        .back-btn {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 2px;
          color: rgba(255,255,255,0.3);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          padding: 10px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }

        .back-btn:hover:not(:disabled) {
          color: rgba(255,255,255,0.6);
          border-color: rgba(255,255,255,0.12);
        }

        .back-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Attempt indicators */
        .attempt-pip {
          width: 8px; height: 8px;
          border-radius: 50%;
          transition: all 0.3s;
        }

        /* Resend btn */
        .resend-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem;
          font-weight: 600;
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0;
        }

        /* Restricted notice */
        .restricted-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,60,60,0.07);
          border: 1px solid rgba(255,60,60,0.15);
          border-radius: 2px;
          padding: 5px 10px;
          margin-bottom: 20px;
        }

        /* Owner portal link */
        .portal-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: rgba(255,255,255,0.2);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-decoration: none;
          transition: color 0.2s;
          margin-top: 16px;
        }

        .portal-link:hover { color: rgba(255,255,255,0.45); }
      `}</style>

            <div className="admin-root">
                <div className="grid-bg" />
                <div className="scanlines" />
                <div className="blob-1" />
                <div className="blob-2" />

                <AnimatePresence mode="wait">

                    {/* ── STEP 1: Credentials ── */}
                    {step === "credentials" && (
                        <motion.div
                            key="creds"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="card"
                        >
                            {/* Status bar */}
                            <div className="status-bar">
                                <span className="status-dot" />
                                <span className="mono" style={{ fontSize: "0.65rem", color: "rgba(0,255,136,0.6)", letterSpacing: "0.12em" }}>
                                    SARI-IMS ADMIN PORTAL — SECURE SESSION
                                </span>
                            </div>

                            {/* Logo + title */}
                            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
                                <div style={{
                                    position: "relative", width: 44, height: 44, flexShrink: 0,
                                    border: "1px solid rgba(0,255,136,0.2)", borderRadius: "4px", padding: "4px",
                                    background: "rgba(0,255,136,0.04)"
                                }}>
                                    <Image src="/images/logo.png" alt="SariSari IMS" fill className="object-contain" style={{ borderRadius: "3px" }} sizes="44px" />
                                </div>
                                <div>
                                    <div className="bebas" style={{ fontSize: "1.8rem", color: "#e2ffe9", letterSpacing: "0.06em", lineHeight: 1 }}>
                                        ADMIN ACCESS
                                    </div>
                                    <div className="mono" style={{ fontSize: "0.58rem", color: "rgba(0,255,136,0.45)", letterSpacing: "0.25em", marginTop: "3px" }}>
                                        SARISARI.IMS // RESTRICTED
                                    </div>
                                </div>
                            </div>

                            {/* Restricted badge */}
                            <div className="restricted-badge">
                                <ShieldAlert size={12} style={{ color: "#ff5555", flexShrink: 0 }} />
                                <span className="mono" style={{ fontSize: "0.62rem", color: "rgba(255,85,85,0.8)", letterSpacing: "0.08em" }}>
                                    AUTHORIZED PERSONNEL ONLY
                                </span>
                            </div>

                            {/* Form */}
                            <motion.form
                                onSubmit={handleCredentialsSubmit}
                                noValidate
                                animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="field-wrap">
                                    <label className="field-label">
                                        <span style={{ opacity: 0.5 }}>$</span> Identity
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <AtSign size={15} className={`field-icon${errors.email ? " err" : ""}`} />
                                        <input
                                            type="email"
                                            className={`field-input${errors.email ? " error" : ""}`}
                                            placeholder="admin@domain.com"
                                            value={form.email}
                                            autoComplete="username"
                                            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(v => ({ ...v, email: undefined })); }}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="field-error">
                                            <XCircle size={11} style={{ flexShrink: 0 }} /> {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="field-wrap">
                                    <label className="field-label">
                                        <span style={{ opacity: 0.5 }}>$</span> Passphrase
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <Lock size={15} className={`field-icon${errors.password ? " err" : ""}`} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className={`field-input${errors.password ? " error" : ""}`}
                                            placeholder="••••••••••••"
                                            value={form.password}
                                            autoComplete="current-password"
                                            style={{ paddingRight: "44px" }}
                                            onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(v => ({ ...v, password: undefined })); }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(0,255,136,0.35)", padding: 0, transition: "color 0.2s" }}
                                        >
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="field-error">
                                            <XCircle size={11} style={{ flexShrink: 0 }} /> {errors.password}
                                        </p>
                                    )}
                                </div>

                                <button type="submit" disabled={loading} className="submit-btn">
                                    {loading && <span className="shimmer" />}
                                    {loading
                                        ? <><Loader2 size={15} className="animate-spin" /> AUTHENTICATING…</>
                                        : <><Terminal size={14} /> AUTHENTICATE<ChevronRight size={14} /></>
                                    }
                                </button>
                            </motion.form>

                            <hr className="divider" />

                            {/* Footer */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>
                                    SESSION ENCRYPTED
                                </span>
                                <span className="mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff88", display: "inline-block", boxShadow: "0 0 6px #00ff88" }} />
                                    SARI-IMS v1.0
                                </span>
                            </div>

                            <Link href="/auth/login" className="portal-link">
                                <ChevronRight size={11} style={{ transform: "rotate(180deg)" }} />
                                Owner Portal
                            </Link>
                        </motion.div>
                    )}

                    {/* ── STEP 2: OTP Verification ── */}
                    {step === "otp" && (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="card"
                        >
                            {/* Status bar */}
                            <div className="status-bar">
                                <span className="status-dot" />
                                <span className="mono" style={{ fontSize: "0.65rem", color: "rgba(0,255,136,0.6)", letterSpacing: "0.12em" }}>
                                    TOKEN VERIFICATION REQUIRED
                                </span>
                            </div>

                            {/* Icon */}
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                                <motion.div
                                    animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                    transition={{ duration: 0.5 }}
                                    style={{
                                        width: 64, height: 64,
                                        border: attempts > 0 ? "1px solid rgba(255,60,60,0.35)" : "1px solid rgba(0,255,136,0.25)",
                                        borderRadius: "4px",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: attempts > 0 ? "rgba(255,60,60,0.05)" : "rgba(0,255,136,0.05)",
                                        transition: "all 0.3s ease",
                                    }}
                                >
                                    {attempts > 0
                                        ? <AlertOctagon size={28} style={{ color: "#ff5555" }} />
                                        : <KeyRound size={28} style={{ color: "#00ff88" }} />}
                                </motion.div>
                            </div>

                            {/* Title */}
                            <div style={{ textAlign: "center", marginBottom: "20px" }}>
                                <div className="bebas" style={{ fontSize: "2rem", color: "#e2ffe9", letterSpacing: "0.06em", lineHeight: 1, marginBottom: "8px" }}>
                                    TOKEN VERIFICATION
                                </div>
                                <p className="mono" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, letterSpacing: "0.05em" }}>
                                    Token dispatched to<br />
                                    <span style={{ color: "rgba(0,255,136,0.7)", fontWeight: 600 }}>{form.email}</span>
                                </p>
                            </div>

                            {/* Attempt indicators */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
                                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="attempt-pip"
                                        style={{
                                            background: i < attempts ? "#ff5555" : "rgba(255,255,255,0.12)",
                                            boxShadow: i < attempts ? "0 0 8px rgba(255,85,85,0.6)" : "none",
                                            transform: i < attempts ? "scale(1.3)" : "scale(1)",
                                        }}
                                    />
                                ))}
                                <span className="mono" style={{ fontSize: "0.62rem", marginLeft: "6px", letterSpacing: "0.06em", color: attempts === 0 ? "rgba(255,255,255,0.25)" : attempts === 1 ? "#f97316" : "#ff5555" }}>
                                    {attempts === 0
                                        ? `${MAX_ATTEMPTS} attempts`
                                        : `${MAX_ATTEMPTS - attempts} remaining`}
                                </span>
                            </div>

                            {/* OTP form */}
                            <form onSubmit={handleOtpSubmit} noValidate>
                                <label className="field-label" style={{ display: "block", textAlign: "center", marginBottom: "12px" }}>
                                    <span style={{ opacity: 0.5 }}>$</span> Enter 8-digit token
                                </label>

                                <motion.div
                                    animate={shake ? { x: [-7, 7, -6, 6, -4, 4, 0] } : { x: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="otp-wrap"
                                    style={{ display: "flex", justifyContent: "center", gap: "7px", marginBottom: "8px" }}
                                    onPaste={handleOtpPaste}
                                >
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
                                            className={`otp-box${errors.otp ? " err" : ""}${digit ? " filled" : ""}`}
                                        />
                                    ))}
                                </motion.div>

                                <AnimatePresence>
                                    {errors.otp && (
                                        <motion.p
                                            key="otp-err"
                                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="field-error"
                                            style={{ justifyContent: "center", marginBottom: "4px" }}
                                        >
                                            <XCircle size={11} /> {errors.otp}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {loading && (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", margin: "10px 0" }}
                                        >
                                            <Loader2 size={13} className="animate-spin" style={{ color: "#00ff88" }} />
                                            <span className="mono" style={{ fontSize: "0.7rem", color: "#00ff88", letterSpacing: "0.1em" }}>
                                                {attempts >= MAX_ATTEMPTS - 1 && attempts > 0 ? "TERMINATING SESSION…" : "VERIFYING TOKEN…"}
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Resend */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", margin: "12px 0" }}>
                                    <span className="mono" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>No token received?</span>
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={resendCooldown > 0 || loading}
                                        className="resend-btn"
                                        style={{ color: resendCooldown > 0 || loading ? "rgba(255,255,255,0.2)" : "rgba(0,255,136,0.7)" }}
                                    >
                                        <RefreshCw size={11} />
                                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend token"}
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.join("").length < OTP_LENGTH}
                                    className="submit-btn"
                                >
                                    {loading && <span className="shimmer" />}
                                    {loading
                                        ? <><Loader2 size={15} className="animate-spin" /> VERIFYING…</>
                                        : <><CheckCircle2 size={14} /> CONFIRM ACCESS<ChevronRight size={14} /></>
                                    }
                                </button>
                            </form>

                            <button
                                onClick={() => { setStep("credentials"); setOtp(Array(OTP_LENGTH).fill("")); setAttempts(0); setErrors({}); autoSubmitRef.current = false; }}
                                disabled={loading}
                                className="back-btn"
                            >
                                ← ABORT — Return to auth
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </>
    );
}