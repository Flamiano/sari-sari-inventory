"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X, Loader2, ShieldAlert } from "lucide-react";

interface SignOutModalProps {
    isOpen: boolean;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    storeName?: string;
}

const COUNTDOWN = 5;

export default function SignOutModal({ isOpen, onConfirm, onCancel, storeName }: SignOutModalProps) {
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoading(false);
            setCountdown(COUNTDOWN);
            intervalRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) { clearInterval(intervalRef.current!); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isOpen]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !loading) onCancel();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, loading, onCancel]);

    const handleConfirm = async () => {
        if (countdown > 0 || loading) return;
        setLoading(true);
        await onConfirm();
    };

    const progress = ((COUNTDOWN - countdown) / COUNTDOWN) * 100;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => !loading && onCancel()}
                        className="fixed inset-0 z-[9998]"
                        style={{ background: "rgba(2, 8, 23, 0.55)", backdropFilter: "blur(4px)" }}
                    />

                    {/* Modal — bottom sheet on mobile, centered on desktop */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ type: "spring", stiffness: 340, damping: 32 }}
                        className="fixed z-[9999] inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
                        style={{ pointerEvents: "none" }}
                    >
                        <div
                            className="pointer-events-auto w-full sm:w-auto sm:min-w-[380px] sm:max-w-[420px] bg-white overflow-hidden"
                            style={{ borderRadius: "20px 20px 0 0" }}
                        >
                            {/* sm: override to full rounded */}
                            <style>{`@media(min-width:640px){.signout-card{border-radius:20px!important}}`}</style>
                            <div className="signout-card w-full bg-white overflow-hidden" style={{ borderRadius: "inherit" }}>

                                {/* Progress bar */}
                                <div className="h-1 w-full bg-slate-100 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-red-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: loading ? "100%" : `${progress}%` }}
                                        transition={loading ? { duration: 1.4, ease: "easeInOut" } : { duration: 1, ease: "linear" }}
                                    />
                                </div>

                                {/* Mobile drag handle */}
                                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                                </div>

                                <div className="px-6 pt-4 pb-6">

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: loading ? "linear-gradient(135deg,#fee2e2,#fecaca)" : "linear-gradient(135deg,#fff1f2,#fee2e2)",
                                                    border: "1.5px solid #fecaca",
                                                    transition: "background 0.3s"
                                                }}>
                                                <AnimatePresence mode="wait">
                                                    {loading
                                                        ? <motion.div key="spin" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                                                            <Loader2 size={20} className="text-red-500 animate-spin" />
                                                        </motion.div>
                                                        : <motion.div key="icon" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                                                            <ShieldAlert size={20} className="text-red-500" />
                                                        </motion.div>
                                                    }
                                                </AnimatePresence>
                                            </div>
                                            <div>
                                                <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-red-500 mb-0.5">Sign Out</p>
                                                <h2 className="text-[1rem] font-black text-slate-900 leading-tight"
                                                    style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.02em" }}>
                                                    {loading ? "Signing you out…" : "Leave your store?"}
                                                </h2>
                                            </div>
                                        </div>
                                        {!loading && (
                                            <button onClick={onCancel}
                                                className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors -mt-0.5 -mr-1 flex-shrink-0">
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <AnimatePresence mode="wait">
                                        {loading ? (
                                            <motion.div key="loading-body"
                                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="mb-5 rounded-2xl p-3.5 flex items-center gap-3"
                                                style={{ background: "linear-gradient(135deg,#fff1f2,#fff5f5)", border: "1px solid #fecaca" }}>
                                                <Loader2 size={15} className="text-red-400 animate-spin flex-shrink-0" />
                                                <p className="text-[0.8rem] font-semibold text-red-600 leading-snug">
                                                    Clearing session and redirecting to login…
                                                </p>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="confirm-body"
                                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="mb-5">
                                                <p className="text-[0.85rem] text-slate-500 leading-relaxed mb-4">
                                                    You're about to sign out of{" "}
                                                    <span className="font-bold text-slate-700">{storeName || "your store"}</span>.
                                                    Any unsaved changes will be lost.
                                                </p>

                                                {/* Countdown pill */}
                                                <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
                                                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
                                                    {/* SVG ring */}
                                                    <div className="relative w-8 h-8 flex-shrink-0">
                                                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                                                            <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                                                            <motion.circle
                                                                cx="18" cy="18" r="14"
                                                                fill="none"
                                                                stroke={countdown === 0 ? "#ef4444" : "#94a3b8"}
                                                                strokeWidth="3.5"
                                                                strokeLinecap="round"
                                                                strokeDasharray={`${2 * Math.PI * 14}`}
                                                                strokeDashoffset={`${2 * Math.PI * 14 * (countdown / COUNTDOWN)}`}
                                                                transition={{ duration: 1, ease: "linear" }}
                                                            />
                                                        </svg>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] font-black"
                                                            style={{ color: countdown === 0 ? "#ef4444" : "#64748b" }}>
                                                            {countdown === 0 ? "✓" : countdown}
                                                        </span>
                                                    </div>
                                                    <p className="text-[0.76rem] font-semibold leading-snug"
                                                        style={{ color: countdown === 0 ? "#ef4444" : "#64748b" }}>
                                                        {countdown > 0
                                                            ? <><span className="font-black text-slate-800">Sign Out</span> unlocks in {countdown}s</>
                                                            : <><span className="font-black text-red-600">Ready</span> — tap Sign Out below</>
                                                        }
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Buttons */}
                                    {!loading && (
                                        <div className="flex flex-col-reverse sm:flex-row gap-2">
                                            <button onClick={onCancel}
                                                className="flex-1 py-2.5 rounded-2xl text-[0.875rem] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">
                                                Cancel
                                            </button>
                                            <motion.button
                                                onClick={handleConfirm}
                                                disabled={countdown > 0}
                                                whileTap={countdown === 0 ? { scale: 0.97 } : {}}
                                                className="flex-1 relative overflow-hidden py-2.5 rounded-2xl text-[0.875rem] font-black text-white flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                                                style={{
                                                    background: countdown > 0
                                                        ? "linear-gradient(135deg,#fca5a5,#f87171)"
                                                        : "linear-gradient(135deg,#ef4444,#dc2626)",
                                                    boxShadow: countdown === 0 ? "0 6px 18px rgba(239,68,68,0.3)" : "none",
                                                    opacity: countdown > 0 ? 0.65 : 1,
                                                    fontFamily: "Syne, sans-serif",
                                                    transition: "all 0.3s ease",
                                                }}>
                                                {countdown === 0 && (
                                                    <span className="absolute inset-0 pointer-events-none"
                                                        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)", animation: "shimmerBar 2s ease-in-out infinite" }} />
                                                )}
                                                <LogOut size={14} />
                                                Sign Out
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}