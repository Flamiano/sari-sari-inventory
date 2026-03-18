"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Mail, Eye, EyeOff, ArrowRight, Loader2,
    Hash, Users, ShoppingCart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast from "react-hot-toast";

type PortalRole = "staff" | "cashier";

export default function StaffCashierLoginPage() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<PortalRole | null>(null);
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: "", pin: "" });
    const [errors, setErrors] = useState<{
        email?: string;
        pin?: string;
        role?: string;
        mismatch?: { actualRole: string };
    }>({});

    const validate = () => {
        const errs: typeof errors = {};
        if (!selectedRole) errs.role = "Please select your role first.";
        if (!form.email) errs.email = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email address.";
        if (!form.pin) errs.pin = "PIN code is required.";
        else if (form.pin.length < 4) errs.pin = "PIN must be at least 4 digits.";
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);

        try {
            const emailLower = form.email.trim().toLowerCase();

            // ── 1. Check if this is an owner email (safe function — no table dump) ──
            const { data: isOwner, error: ownerErr } = await supabase
                .rpc("is_owner_email", { p_email: emailLower });

            if (ownerErr) {
                // Function might not exist yet — fallback gracefully
                console.warn("is_owner_email RPC error:", ownerErr.message);
            } else if (isOwner === true) {
                setLoading(false);
                toast.error("This email belongs to an owner account. Use the Owner Portal.");
                setErrors({ email: "Owner accounts cannot log in here. Use the Owner Portal." });
                return;
            }

            // ── 2. Look up staff by email (safe function — returns 1 row only) ──
            const { data: staffRows, error: staffErr } = await supabase
                .rpc("get_staff_by_email", { p_email: emailLower });

            const staff = staffRows?.[0] ?? null;

            if (staffErr || !staff) {
                setLoading(false);
                toast.error("No staff account found for this email.");
                setErrors({ email: "Email not found. Check with your store owner." });
                return;
            }

            // ── 3. PIN check ──────────────────────────────────────────────────────
            if (staff.pin_code !== form.pin.trim()) {
                setLoading(false);
                toast.error("Incorrect PIN code.");
                setErrors({ pin: "Incorrect PIN. Try again." });
                return;
            }

            // ── 4. Account status ─────────────────────────────────────────────────
            if (staff.status === "inactive") {
                setLoading(false);
                toast.error("Your account is inactive. Contact your store owner.");
                setErrors({ email: "Account is inactive. Contact your store owner." });
                return;
            }
            if (staff.status === "pending") {
                setLoading(false);
                toast.error("Your account is pending approval. Contact your store owner.");
                setErrors({ email: "Account pending. Contact your store owner." });
                return;
            }

            // ── 5. Role mismatch ──────────────────────────────────────────────────
            const actualRole = staff.role as string;

            if (selectedRole === "staff" && actualRole === "cashier") {
                setLoading(false);
                toast.error("Correct PIN — but this is a Cashier account. Switch to Cashier.", { duration: 5000 });
                setErrors({ mismatch: { actualRole: "cashier" } });
                return;
            }
            if (selectedRole === "cashier" && actualRole === "staff") {
                setLoading(false);
                toast.error("Correct PIN — but this is a Staff account. Switch to Staff.", { duration: 5000 });
                setErrors({ mismatch: { actualRole: "staff" } });
                return;
            }

            // ── 6. Save session to sessionStorage ────────────────────────────────
            if (typeof window !== "undefined") {
                sessionStorage.setItem("staff_session", JSON.stringify({
                    id: staff.id,
                    full_name: staff.full_name,
                    email: staff.email,
                    role: staff.role,
                    owner_id: staff.owner_id,
                    logged_in_at: Date.now(),
                }));
            }

            toast.success(`Welcome, ${staff.full_name}! 🎉`);

            // ── 7. Redirect by role ───────────────────────────────────────────────
            setTimeout(() => {
                if (actualRole === "cashier") {
                    router.push("/staff/cashier");
                } else {
                    router.push("/staff/staff-worker");
                }
            }, 900);

        } catch (err: any) {
            setLoading(false);
            toast.error("Something went wrong. Please try again.");
            console.error("Staff login error:", err);
        }
    };

    const roles = [
        {
            id: "staff" as PortalRole,
            label: "Staff Worker",
            desc: "Inventory & operations",
            icon: <Users size={22} />,
            color: "#7c3aed",
            activeBg: "rgba(124,58,237,0.07)",
            activeBorder: "#7c3aed",
            activeGlow: "rgba(124,58,237,0.15)",
        },
        {
            id: "cashier" as PortalRole,
            label: "Cashier",
            desc: "POS & transactions",
            icon: <ShoppingCart size={22} />,
            color: "#0891b2",
            activeBg: "rgba(8,145,178,0.07)",
            activeBorder: "#0891b2",
            activeGlow: "rgba(8,145,178,0.15)",
        },
    ];

    const activeGrad = selectedRole === "cashier" ? "linear-gradient(135deg, #0891b2, #0e7490)" : "linear-gradient(135deg, #7c3aed, #6d28d9)";
    const activeShadow = selectedRole === "cashier" ? "0 8px 24px rgba(8,145,178,0.35)" : "0 8px 24px rgba(124,58,237,0.35)";

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
                * { font-family: 'Plus Jakarta Sans', sans-serif; }
                h1, h2, h3 { font-family: 'Syne', sans-serif; }
                @keyframes shimmerBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                @keyframes gridFloat  { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
            `}</style>

            <div className="min-h-screen flex" style={{ background: "#F7F9FC" }}>

                {/* Left panel */}
                <aside className="hidden lg:flex w-[440px] flex-shrink-0 flex-col relative overflow-hidden"
                    style={{ background: "linear-gradient(155deg, #1e0a3c 0%, #2d1060 55%, #4c1d95 100%)" }}>
                    <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "32px 32px", animation: "gridFloat 30s linear infinite" }} />
                    <div className="absolute pointer-events-none" style={{ top: -100, right: -100, width: 460, height: 460, background: "radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 65%)" }} />
                    <div className="absolute pointer-events-none" style={{ bottom: -80, left: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(8,145,178,0.14) 0%, transparent 65%)" }} />

                    <div className="relative z-10 flex flex-col h-full p-10">
                        <Link href="/" className="flex items-center gap-3 no-underline">
                            <div className="relative w-10 h-10 flex-shrink-0">
                                <Image src="/images/logo.png" alt="SariSari IMS" fill className="object-contain rounded-xl" sizes="40px" />
                            </div>
                            <div>
                                <div className="text-white font-black text-lg leading-none" style={{ fontFamily: "Syne, sans-serif" }}>SariSari<span className="text-violet-400">.</span>IMS</div>
                                <div className="text-white/30 text-[0.5rem] font-bold uppercase tracking-widest mt-0.5">Team Portal</div>
                            </div>
                        </Link>

                        <div className="my-auto">
                            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7"
                                style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 8px #a78bfa" }} />
                                <span className="text-violet-300 text-[0.65rem] font-bold uppercase tracking-[0.15em]">Staff &amp; Cashier Access</span>
                            </div>
                            <h2 className="font-black text-white leading-[1.08] mb-4"
                                style={{ fontFamily: "Syne, sans-serif", fontSize: "2.7rem", letterSpacing: "-0.03em" }}>
                                Ready for<br />
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #67e8f9)" }}>your shift?</span>
                            </h2>
                            <p className="text-slate-300/65 text-[0.9rem] leading-relaxed mb-10 max-w-[310px]">
                                Choose your role and sign in with your store email and assigned PIN code.
                            </p>
                            <div className="space-y-5">
                                {[
                                    { icon: <Users size={16} />, label: "Staff Worker", desc: "Manage inventory & daily operations", color: "#a78bfa" },
                                    { icon: <ShoppingCart size={16} />, label: "Cashier", desc: "Process sales & handle transactions", color: "#67e8f9" },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: "rgba(255,255,255,0.07)", color: item.color }}>{item.icon}</div>
                                        <div>
                                            <div className="text-white/80 text-[0.83rem] font-bold">{item.label}</div>
                                            <div className="text-white/35 text-[0.72rem]">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <p className="text-white/25 text-[0.7rem]">Having trouble? Contact your store owner for your PIN.</p>
                        </div>
                    </div>
                </aside>

                {/* Right: form */}
                <main className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-[430px]"
                    >
                        {/* Mobile logo */}
                        <Link href="/" className="lg:hidden flex items-center gap-2.5 no-underline mb-8">
                            <div className="relative w-8 h-8">
                                <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                            </div>
                            <span className="font-black text-slate-900 text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                                SariSari<span className="text-violet-600">.</span>IMS
                            </span>
                        </Link>

                        <div className="mb-7">
                            <h1 className="font-black text-slate-900 leading-[1.1] mb-1.5"
                                style={{ fontFamily: "Syne, sans-serif", fontSize: "1.95rem", letterSpacing: "-0.03em" }}>
                                Team Sign In
                            </h1>
                            <p className="text-slate-400 text-[0.88rem]">Select your role, then enter your email and PIN.</p>
                        </div>

                        {/* Role selector */}
                        <div className="mb-5">
                            <label className="block text-[0.75rem] font-bold text-slate-500 uppercase tracking-wider mb-2.5">I am a…</label>
                            <div className="grid grid-cols-2 gap-3">
                                {roles.map(r => {
                                    const isActive = selectedRole === r.id;
                                    return (
                                        <button key={r.id} type="button"
                                            onClick={() => { setSelectedRole(r.id); setErrors(v => ({ ...v, role: undefined, mismatch: undefined })); }}
                                            className="relative flex flex-col items-start p-4 rounded-2xl transition-all duration-200 text-left focus:outline-none"
                                            style={{
                                                background: isActive ? r.activeBg : "white",
                                                border: isActive ? `2px solid ${r.activeBorder}` : "2px solid #e8edf3",
                                                boxShadow: isActive ? `0 0 0 4px ${r.activeGlow}` : "0 1px 3px rgba(0,0,0,0.04)",
                                            }}>
                                            <AnimatePresence>
                                                {isActive && (
                                                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                                                        style={{ background: r.color }}>
                                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-200"
                                                style={{ background: isActive ? r.color : "#f1f5f9", color: isActive ? "white" : "#94a3b8" }}>
                                                {r.icon}
                                            </div>
                                            <div className="font-bold text-[0.85rem] text-slate-800 leading-tight">{r.label}</div>
                                            <div className="text-[0.71rem] text-slate-400 mt-0.5 leading-tight">{r.desc}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            <AnimatePresence>
                                {errors.role && (
                                    <motion.p key="role-err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="text-[0.75rem] text-red-500 font-semibold mt-2 pl-1">⚠ {errors.role}</motion.p>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {errors.mismatch && (
                                    <motion.div key="mismatch" initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }} className="mt-3 p-3.5 rounded-xl overflow-hidden"
                                        style={{ background: "#fff7ed", border: "1.5px solid #fed7aa" }}>
                                        <p className="text-[0.78rem] font-bold text-orange-700 mb-1">⚠ Wrong portal selected</p>
                                        <p className="text-[0.73rem] text-orange-600 mb-2">
                                            Your PIN is correct, but your account is a{" "}
                                            <strong className="capitalize">{errors.mismatch.actualRole}</strong>{" "}account. Switch to the correct portal:
                                        </p>
                                        <button type="button"
                                            onClick={() => { setSelectedRole(errors.mismatch!.actualRole === "cashier" ? "cashier" : "staff"); setErrors({}); }}
                                            className="text-[0.75rem] font-black text-orange-700 underline underline-offset-2 hover:text-orange-900 transition-colors">
                                            Switch to {errors.mismatch.actualRole === "cashier" ? "Cashier" : "Staff"} portal →
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                        style={{ color: errors.email ? "#ef4444" : "#94a3b8" }} />
                                    <input type="email" placeholder="your@email.com" value={form.email} autoComplete="email"
                                        onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(v => ({ ...v, email: undefined })); }}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                        style={{ border: errors.email ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: errors.email ? "0 0 0 3px rgba(239,68,68,0.08)" : "none" }} />
                                </div>
                                {errors.email && <p className="text-[0.74rem] text-red-500 font-semibold mt-1">{errors.email}</p>}
                            </div>

                            {/* PIN */}
                            <div>
                                <label className="block text-[0.78rem] font-bold text-slate-700 mb-1.5">PIN Code</label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                        style={{ color: errors.pin ? "#ef4444" : "#94a3b8" }} />
                                    <input type={showPin ? "text" : "password"} inputMode="numeric" placeholder="Enter your 4-digit PIN"
                                        value={form.pin} maxLength={4} autoComplete="current-password"
                                        onChange={e => { setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })); setErrors(v => ({ ...v, pin: undefined })); }}
                                        className="w-full pl-10 pr-11 py-3 rounded-xl text-[0.9rem] text-slate-800 bg-white outline-none transition-all"
                                        style={{ border: errors.pin ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0", boxShadow: errors.pin ? "0 0 0 3px rgba(239,68,68,0.08)" : "none", letterSpacing: form.pin && !showPin ? "0.4em" : "normal" }} />
                                    <button type="button" onClick={() => setShowPin(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.pin && <p className="text-[0.74rem] text-red-500 font-semibold mt-1">{errors.pin}</p>}
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={loading}
                                className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 font-bold text-white py-3.5 rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                                style={{ background: activeGrad, boxShadow: activeShadow, fontFamily: "Syne, sans-serif", fontSize: "0.93rem" }}>
                                {loading && (
                                    <span className="absolute inset-0 pointer-events-none"
                                        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)", animation: "shimmerBar 1.5s ease-in-out infinite" }} />
                                )}
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={16} /> Sign In</>}
                            </button>
                        </form>

                        <div className="flex items-center gap-3 my-6">
                            <div className="flex-1 h-px bg-slate-100" />
                            <span className="text-slate-300 text-[0.68rem] font-bold uppercase tracking-wider whitespace-nowrap">Not a staff member?</span>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>

                        <Link href="/auth/login"
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.83rem] font-bold text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all no-underline">
                            Go to Owner Portal →
                        </Link>
                    </motion.div>
                </main>
            </div>
        </>
    );
}