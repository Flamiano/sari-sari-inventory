"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, AlertTriangle, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast from "react-hot-toast";
import { secureSession } from "@/app/utils/secureSession";
import SignOutModal from "@/app/comps/signoutmodal/page";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;

// ── Props ─────────────────────────────────────────────────────────────────────
interface SecurePageGateProps {
    children: React.ReactNode;
    pageName: string;
    pageIcon?: React.ReactNode;
    accentClass?: string;
    gradientStyle?: React.CSSProperties;
}

// ── Session timer hook ────────────────────────────────────────────────────────
function useSessionTimeLeft() {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        // Sync immediately on mount
        setTimeLeft(secureSession.timeLeftMs());
        const interval = setInterval(() => {
            setTimeLeft(secureSession.timeLeftMs());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return timeLeft;
}

// ── Format mm:ss ──────────────────────────────────────────────────────────────
function formatTime(ms: number) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, "0")}`;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SecurePageGate({
    children,
    pageName,
    pageIcon,
    gradientStyle,
}: SecurePageGateProps) {
    // Start false — don't know real state until client-side hydration
    const [unlocked, setUnlocked] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // 1. Restore session from sessionStorage (survives refresh)
        secureSession.hydrate();
        setHydrated(true);
        setUnlocked(secureSession.isUnlocked);

        // 2. Subscribe to future lock/unlock changes
        const unsub = secureSession.subscribe(() => {
            setUnlocked(secureSession.isUnlocked);
        });
        return unsub;
    }, []);

    // ── Global activity listeners — only when unlocked ────────────────────
    useEffect(() => {
        if (!unlocked) return;
        const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];
        const handler = () => secureSession.resetActivity();
        events.forEach(e => window.addEventListener(e, handler, { passive: true }));
        return () => events.forEach(e => window.removeEventListener(e, handler));
    }, [unlocked]);

    // ── Watch for Supabase sign-out ───────────────────────────────────────
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") secureSession.lock();
        });
        return () => subscription.unsubscribe();
    }, []);

    // ── Gate form state ───────────────────────────────────────────────────
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [attempts, setAttempts] = useState(0);
    const [shake, setShake] = useState(false);
    const [lockedOut, setLockedOut] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState(0);
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const lockoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-focus password input whenever the gate is visible (not unlocked + hydrated)
    useEffect(() => {
        if (!hydrated) return;
        if (!unlocked) {
            // Small delay so the animation completes before focus
            const t = setTimeout(() => {
                inputRef.current?.focus();
            }, 350);
            return () => clearTimeout(t);
        }
    }, [unlocked, hydrated]);

    // Lockout countdown
    useEffect(() => {
        if (!lockedOut) return;
        if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
        lockoutIntervalRef.current = setInterval(() => {
            setLockoutTimer(prev => {
                if (prev <= 1) {
                    clearInterval(lockoutIntervalRef.current!);
                    setLockedOut(false);
                    setAttempts(0);
                    setError("");
                    // Re-focus after lockout ends
                    setTimeout(() => inputRef.current?.focus(), 80);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current); };
    }, [lockedOut]);

    // ── Submit handler ────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lockedOut || loading) return;
        if (!password) { setError("Password is required."); return; }

        setLoading(true);
        setError("");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            setLoading(false);
            toast.error("Session expired. Please log in again.");
            return;
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password,
        });

        setLoading(false);

        if (authError) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPassword("");
            setShake(true);
            setTimeout(() => setShake(false), 600);

            if (newAttempts >= MAX_ATTEMPTS) {
                setLockedOut(true);
                setLockoutTimer(30);
                setError("Too many wrong attempts. Locked for 30 seconds.");
                toast.error("Too many failed attempts. Locked out for 30s.");
            } else {
                const remaining = MAX_ATTEMPTS - newAttempts;
                setError(`Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
                toast.error("Incorrect password.");
                setTimeout(() => inputRef.current?.focus(), 80);
            }
            return;
        }

        // ✅ Success — unlock globally, stored in sessionStorage
        toast.success("Access granted! Session active for 15 minutes.", {
            icon: "🔓",
            style: { borderLeft: "4px solid #10b981" },
        });
        setAttempts(0);
        setError("");
        setPassword("");
        secureSession.unlock();
    };

    const handleManualLock = useCallback(() => {
        secureSession.lock();
        toast("Dashboard locked.", { icon: "🔒", style: { fontWeight: 600, fontSize: "0.875rem" } });
    }, []);

    // ── Loading state while hydrating (avoids flash of lock screen on refresh) ─
    if (!hydrated) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-slate-400" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400">Checking session…</p>
                </div>
            </div>
        );
    }

    // ── If unlocked: render children with session bar ─────────────────────
    if (unlocked) {
        return <UnlockedWrapper pageName={pageName} onLock={handleManualLock}>{children}</UnlockedWrapper>;
    }

    // ── Gate screen ───────────────────────────────────────────────────────
    return (
        <div className="min-h-[70vh] flex items-center justify-center py-12">
            <AnimatePresence mode="wait">
                <motion.div
                    key="gate"
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[420px]"
                >
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">

                        {/* Top strip */}
                        <div className="px-7 pt-8 pb-6 text-center relative overflow-hidden"
                            style={gradientStyle ?? { background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
                            <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                                style={{ backgroundImage: "linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

                            <motion.div
                                animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                transition={{ duration: 0.55 }}
                                className="inline-flex"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center mx-auto mb-4">
                                    {attempts > 0
                                        ? <AlertTriangle size={28} className="text-red-500" />
                                        : (pageIcon ?? <Lock size={28} className="text-slate-600" />)
                                    }
                                </div>
                            </motion.div>

                            <h2 className="font-black text-slate-900 text-xl leading-tight mb-1"
                                style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.02em" }}>
                                {pageName}
                            </h2>
                            <p className="text-slate-500 text-[0.82rem] font-medium">
                                Enter your password to access this page
                            </p>

                            {/* One-login note */}
                            <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                                <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
                                <span className="text-[10px] font-bold text-emerald-700">
                                    One login unlocks all pages for 15 min
                                </span>
                            </div>
                        </div>

                        {/* Form body */}
                        <div className="px-7 pb-7 pt-5">
                            {/* Attempt dots */}
                            <div className="flex items-center justify-center gap-2 mb-5">
                                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                                    <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            background: i < attempts ? "#ef4444" : "#e2e8f0",
                                            boxShadow: i < attempts ? "0 0 6px rgba(239,68,68,0.5)" : "none",
                                            transform: i < attempts ? "scale(1.3)" : "scale(1)",
                                        }}
                                    />
                                ))}
                                <span className="text-[0.7rem] font-semibold ml-1.5"
                                    style={{ color: attempts === 0 ? "#94a3b8" : attempts <= 2 ? "#f97316" : "#ef4444" }}>
                                    {attempts === 0
                                        ? `${MAX_ATTEMPTS} attempts allowed`
                                        : lockedOut
                                            ? `Locked · ${lockoutTimer}s`
                                            : `${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} left`
                                    }
                                </span>
                            </div>

                            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                <div>
                                    <label className="block text-[0.77rem] font-bold text-slate-700 mb-1.5">
                                        Account Password
                                    </label>
                                    <motion.div
                                        animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55 }}
                                        className="relative"
                                    >
                                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                            style={{ color: error ? "#ef4444" : "#94a3b8" }} />
                                        <input
                                            ref={inputRef}
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            disabled={lockedOut || loading}
                                            onChange={e => { setPassword(e.target.value); setError(""); }}
                                            onKeyDown={e => { if (e.key === "Enter") handleSubmit(e as any); }}
                                            className="w-full pl-10 pr-11 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                border: error ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                                                boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                                                fontFamily: "Plus Jakarta Sans, sans-serif",
                                            }}
                                        />
                                        <button type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </motion.div>
                                    <AnimatePresence>
                                        {error && (
                                            <motion.p
                                                key="err"
                                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="text-[0.73rem] text-red-500 font-semibold mt-1.5">
                                                {error}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || lockedOut}
                                    className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{
                                        background: "linear-gradient(135deg, #1e293b, #334155)",
                                        boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
                                        fontFamily: "Syne, sans-serif",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    {loading && (
                                        <span className="absolute inset-0 pointer-events-none"
                                            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                    )}
                                    {loading
                                        ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                                        : lockedOut
                                            ? <><AlertTriangle size={16} /> Locked · {lockoutTimer}s</>
                                            : <><ShieldCheck size={16} /> Unlock {pageName}</>
                                    }
                                </button>
                            </form>

                            {/* Info note */}
                            <div className="mt-4 flex items-start gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3">
                                <ShieldCheck size={13} className="text-slate-400 mt-0.5 shrink-0" />
                                <p className="text-[0.72rem] text-slate-400 font-medium leading-relaxed">
                                    Unlocking here gives access to <span className="font-bold text-slate-600">Dashboard, Sales History &amp; Analytics</span> for 15 minutes. Session auto-locks after inactivity.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sign out hint */}
                    <p className="text-center text-[0.78rem] text-slate-400 mt-5 flex items-center justify-center gap-1.5">
                        <LogOut size={11} />
                        Not you?{" "}
                        <button
                            onClick={() => setShowSignOutModal(true)}
                            className="font-bold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            Sign out
                        </button>
                    </p>

                    <SignOutModal
                        isOpen={showSignOutModal}
                        onCancel={() => setShowSignOutModal(false)}
                        onConfirm={async () => {
                            await supabase.auth.signOut();
                            setShowSignOutModal(false);
                            toast("Signed out successfully.");
                        }}
                        storeName="your store"
                    />
                </motion.div>
            </AnimatePresence>

            <style>{`
        @keyframes shimmerBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
        </div>
    );
}

// ─── Unlocked wrapper: session bar + children ─────────────────────────────────

function UnlockedWrapper({
    children,
    pageName,
    onLock,
}: {
    children: React.ReactNode;
    pageName: string;
    onLock: () => void;
}) {
    const timeLeft = useSessionTimeLeft();
    const isWarning = timeLeft < 3 * 60 * 1000;  // < 3 min → amber
    const isCritical = timeLeft < 60 * 1000;      // < 1 min → red

    return (
        <div className="relative">
            {/* Session status bar */}
            <div className={`mb-4 flex items-center justify-between rounded-2xl px-4 py-2.5 shadow-sm border transition-all duration-500 ${isCritical
                    ? "bg-red-50 border-red-200"
                    : isWarning
                        ? "bg-amber-50 border-amber-200"
                        : "bg-white border-slate-200"
                }`}>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={13} className={
                        isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-emerald-500"
                    } />
                    <span className="text-[11px] font-bold text-slate-500">
                        {pageName} unlocked · Session expires in{" "}
                        <span className={`font-black ${isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                            }`}>
                            {formatTime(timeLeft)}
                        </span>
                    </span>
                </div>
                <button
                    onClick={onLock}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                >
                    <Lock size={11} /> Lock
                </button>
            </div>

            {children}
        </div>
    );
}