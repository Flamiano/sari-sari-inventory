"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    User, Lock, Shield, Trash2, ChevronRight, Eye, EyeOff,
    Check, X, Loader2, AlertTriangle, Bell, KeyRound,
    RefreshCw, Store, Mail, Calendar, MapPin,
    ShieldCheck, ShieldOff, LogOut, ArrowLeft, Save,
    Hash, Smartphone, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast, { Toaster } from "react-hot-toast";

// Toaster style matching the login page
const TOAST_OPTS = {
    style: {
        fontFamily: "Plus Jakarta Sans, sans-serif",
        fontWeight: 600,
        fontSize: "0.875rem",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
    },
    success: { iconTheme: { primary: "#2563eb", secondary: "#fff" }, style: { borderLeft: "4px solid #2563eb" } },
    error: { iconTheme: { primary: "#ef4444", secondary: "#fff" }, style: { borderLeft: "4px solid #ef4444" } },
};

// Types
interface Profile {
    id: string;
    full_name: string | null;
    email: string;
    age: number | null;
    address: string | null;
    birthdate: string | null;
    role: string | null;
    store_name: string | null;
    updated_at: string | null;
}

type SettingsSection = "profile" | "security" | "mfa" | "notifications" | "danger";

const OTP_LEN = 8;

// Skeleton placeholder
function Sk({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

// Labelled field wrapper
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <div>
            <label className="block text-[0.75rem] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{label}</label>
            {children}
            {hint && <p className="text-[0.7rem] text-slate-400 mt-1">{hint}</p>}
        </div>
    );
}

// 8-digit OTP input row
function OtpRow({ otp, setOtp, disabled }: { otp: string[]; setOtp: (v: string[]) => void; disabled?: boolean }) {
    const handleChange = (i: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
        if (val && i < OTP_LEN - 1) document.getElementById(`sotp-${i + 1}`)?.focus();
    };
    const handleKey = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`sotp-${i - 1}`)?.focus();
    };
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
        if (p.length === OTP_LEN) { setOtp(p.split("")); document.getElementById(`sotp-${OTP_LEN - 1}`)?.focus(); }
    };
    return (
        <div className="flex gap-1.5 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
                <input key={i} id={`sotp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit}
                    disabled={disabled} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKey(i, e)}
                    placeholder="·"
                    className="text-center font-black text-slate-900 bg-white rounded-xl outline-none transition-all disabled:opacity-40"
                    style={{
                        width: "44px", height: "52px", fontSize: "1.15rem", fontFamily: "Syne, sans-serif",
                        border: digit ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                        background: digit ? "#f0f7ff" : "white",
                    }} />
            ))}
        </div>
    );
}

// Reusable confirm modal
function ConfirmModal({ open, title, desc, confirmLabel, confirmStyle, onConfirm, onCancel, loading, children }: {
    open: boolean; title: string; desc: string; confirmLabel: string;
    confirmStyle?: string; onConfirm: () => void; onCancel: () => void;
    loading?: boolean; children?: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
                onClick={e => e.target === e.currentTarget && onCancel()}>
                <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
                    transition={{ type: "spring", stiffness: 340, damping: 26 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="p-6">
                        <h3 className="font-black text-slate-900 text-base mb-1" style={{ fontFamily: "Syne, sans-serif" }}>{title}</h3>
                        <p className="text-[0.83rem] text-slate-500 mb-4">{desc}</p>
                        {children}
                    </div>
                    <div className="px-6 pb-6 flex gap-2.5">
                        <button onClick={onCancel} disabled={loading}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button onClick={onConfirm} disabled={loading}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${confirmStyle ?? "bg-blue-600 hover:bg-blue-700"}`}>
                            {loading ? <Loader2 size={14} className="animate-spin" /> : confirmLabel}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ══════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════════════════════
export default function SettingsPage() {
    const router = useRouter();

    // Auth / profile
    const [authUser, setAuthUser] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [section, setSection] = useState<SettingsSection>("profile");

    // Profile edit
    const [profForm, setProfForm] = useState({ full_name: "", age: "", address: "", birthdate: "", store_name: "" });
    const [profSaving, setProfSaving] = useState(false);

    // Password change via OTP
    const [pwOtpSent, setPwOtpSent] = useState(false);
    const [pwOtp, setPwOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
    const [pwOtpVerified, setPwOtpVerified] = useState(false);
    const [pwNew, setPwNew] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [pwLoading, setPwLoading] = useState(false);
    const [pwShowNew, setPwShowNew] = useState(false);
    const [pwShowConf, setPwShowConf] = useState(false);
    const [pwCooldown, setPwCooldown] = useState(0);

    // MFA
    const [mfaFactors, setMfaFactors] = useState<any[]>([]);
    const [mfaLoading, setMfaLoading] = useState(false);
    const [enrollData, setEnrollData] = useState<{ id: string; qr: string; secret: string } | null>(null);
    const [totpCode, setTotpCode] = useState("");
    const [mfaRemoving, setMfaRemoving] = useState<string | null>(null);
    const [showRemoveMfa, setShowRemoveMfa] = useState<string | null>(null);

    // Delete account
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteOtpSent, setDeleteOtpSent] = useState(false);
    const [deleteOtp, setDeleteOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteCooldown, setDeleteCooldown] = useState(0);

    // Notification prefs (preference stored in localStorage; Supabase handles actual delivery)
    const [notifPrefs, setNotifPrefs] = useState({
        identity_linked: true,
        mfa_added: true,
        mfa_removed: true,
    });

    // Load auth user + profile row
    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/auth/login"); return; }
            setAuthUser(user);

            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) {
                setProfile(data);
                setProfForm({
                    full_name: data.full_name ?? "",
                    age: data.age ? String(data.age) : "",
                    address: data.address ?? "",
                    birthdate: data.birthdate ?? "",
                    store_name: data.store_name ?? "",
                });
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [router]);

    // Load MFA TOTP factors
    const loadMfa = useCallback(async () => {
        setMfaLoading(true);
        try {
            const { data } = await supabase.auth.mfa.listFactors();
            setMfaFactors(data?.totp ?? []);
        } catch { }
        finally { setMfaLoading(false); }
    }, []);

    useEffect(() => { loadProfile(); loadMfa(); }, [loadProfile, loadMfa]);

    // Cooldown timer helper
    const startCooldown = (setter: (n: number) => void, secs = 60) => {
        setter(secs);
        const id = setInterval(() => setter(p => { if (p <= 1) { clearInterval(id); return 0; } return p - 1; }), 1000);
    };

    // Save profile to profiles table — email must be included to satisfy NOT NULL constraint
    const saveProfile = async () => {
        if (!authUser) return;
        setProfSaving(true);
        try {
            const { error } = await supabase.from("profiles").upsert({
                id: authUser.id,
                email: authUser.email,          // required — NOT NULL in schema
                full_name: profForm.full_name.trim() || null,
                age: profForm.age ? parseInt(profForm.age) : null,
                address: profForm.address.trim() || null,
                birthdate: profForm.birthdate || null,
                store_name: profForm.store_name.trim() || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
            if (error) throw error;
            toast.success("Profile updated successfully!");
            loadProfile();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to update profile.");
        } finally { setProfSaving(false); }
    };

    // Send OTP for password change
    const sendPwOtp = async () => {
        if (!authUser?.email || pwCooldown > 0) return;
        setPwLoading(true);
        const { error } = await supabase.auth.signInWithOtp({ email: authUser.email, options: { shouldCreateUser: false } });
        setPwLoading(false);
        if (error) { toast.error("Failed to send code. Try again."); return; }
        setPwOtpSent(true); setPwOtp(Array(OTP_LEN).fill(""));
        startCooldown(setPwCooldown);
        toast.success(`Code sent to ${authUser.email}`);
        setTimeout(() => document.getElementById("sotp-0")?.focus(), 300);
    };

    // Verify OTP before allowing password change
    const verifyPwOtp = async () => {
        const token = pwOtp.join("");
        if (token.length < OTP_LEN) { toast.error("Enter the full 8-digit code."); return; }
        setPwLoading(true);
        const { error } = await supabase.auth.verifyOtp({ email: authUser.email, token, type: "email" });
        setPwLoading(false);
        if (error) { toast.error("Invalid or expired code."); return; }
        setPwOtpVerified(true);
        toast.success("Code verified! Set your new password.");
    };

    // Commit the new password
    const changePassword = async () => {
        if (pwNew.length < 8) { toast.error("Password must be at least 8 characters."); return; }
        if (pwNew !== pwConfirm) { toast.error("Passwords don't match."); return; }
        setPwLoading(true);
        const { error } = await supabase.auth.updateUser({ password: pwNew });
        setPwLoading(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Password changed successfully! 🎉");
        setPwOtpSent(false); setPwOtpVerified(false);
        setPwOtp(Array(OTP_LEN).fill(""));
        setPwNew(""); setPwConfirm("");
    };

    // Start TOTP enroll — cancel any existing unverified factor first to avoid "already exists" error
    const startEnroll = async () => {
        setMfaLoading(true);
        try {
            // List all factors; unenroll any that are unverified (they block new enrollment)
            const { data: existing } = await supabase.auth.mfa.listFactors();
            const unverified = (existing?.totp ?? []).filter((f: any) => f.status !== "verified");
            for (const f of unverified) {
                await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
            const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
            if (error) throw error;
            setEnrollData({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to start MFA setup.");
        } finally { setMfaLoading(false); }
    };

    // Verify TOTP code to complete enroll
    const confirmEnroll = async () => {
        if (!enrollData || totpCode.length !== 6) { toast.error("Enter the 6-digit TOTP code."); return; }
        setMfaLoading(true);
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
            if (challenge.error) throw challenge.error;
            const verify = await supabase.auth.mfa.verify({ factorId: enrollData.id, challengeId: challenge.data.id, code: totpCode });
            if (verify.error) throw verify.error;
            toast.success("MFA enabled successfully! ✅");
            setEnrollData(null); setTotpCode(""); loadMfa();
        } catch (err: any) {
            toast.error(err?.message ?? "Invalid TOTP code.");
        } finally { setMfaLoading(false); }
    };

    // Remove a TOTP factor
    const removeMfa = async (factorId: string) => {
        setMfaRemoving(factorId);
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;
            toast.success("MFA method removed.");
            setShowRemoveMfa(null); loadMfa();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to remove MFA.");
        } finally { setMfaRemoving(null); }
    };

    // Send OTP for account deletion
    const sendDeleteOtp = async () => {
        if (!authUser?.email || deleteCooldown > 0) return;
        setDeleteLoading(true);
        const { error } = await supabase.auth.signInWithOtp({ email: authUser.email, options: { shouldCreateUser: false } });
        setDeleteLoading(false);
        if (error) { toast.error("Failed to send code."); return; }
        setDeleteOtpSent(true); setDeleteOtp(Array(OTP_LEN).fill(""));
        startCooldown(setDeleteCooldown);
        toast.success(`Verification code sent to ${authUser.email}`);
    };

    // Verify OTP then delete account
    const confirmDelete = async () => {
        const token = deleteOtp.join("");
        if (token.length < OTP_LEN) { toast.error("Enter the full 8-digit code."); return; }
        setDeleteLoading(true);
        try {
            const { error: verifyErr } = await supabase.auth.verifyOtp({ email: authUser.email, token, type: "email" });
            if (verifyErr) throw new Error("Invalid or expired code.");
            // Delete profile row; auth user CASCADE deletes automatically via FK
            await supabase.from("profiles").delete().eq("id", authUser.id);
            await supabase.auth.signOut();
            toast.success("Account deleted. Goodbye!");
            setTimeout(() => router.push("/auth/login"), 1500);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to delete account.");
            setDeleteLoading(false);
        }
    };

    // Save notification prefs to localStorage
    const saveNotifPrefs = () => {
        localStorage.setItem("notif_prefs", JSON.stringify(notifPrefs));
        toast.success("Notification preferences saved.");
    };

    useEffect(() => {
        const saved = localStorage.getItem("notif_prefs");
        if (saved) try { setNotifPrefs(JSON.parse(saved)); } catch { }
    }, []);

    const NAV: { id: SettingsSection; label: string; icon: React.ElementType; desc: string }[] = [
        { id: "profile", label: "Profile", icon: User, desc: "Personal info & store details" },
        { id: "security", label: "Security", icon: Lock, desc: "Password & account access" },
        { id: "mfa", label: "Two-Factor", icon: Shield, desc: "MFA methods linked" },
        { id: "notifications", label: "Notifications", icon: Bell, desc: "Email alert preferences" },
        { id: "danger", label: "Danger Zone", icon: AlertTriangle, desc: "Delete account" },
    ];

    const avatarInitial = (profile?.full_name || profile?.email || "?").charAt(0).toUpperCase();

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
                *, *::before, *::after { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
                h1,h2,h3,.syne { font-family: 'Syne', sans-serif; }
                input:focus, textarea:focus { outline: none; }
                .ring-focus:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.14); border-color: #93c5fd !important; }
            `}</style>

            <Toaster position="top-right" toastOptions={TOAST_OPTS} />

            {/* Delete account confirm modal */}
            <ConfirmModal
                open={deleteModal}
                title="Delete your account?"
                desc="This is permanent. Your store data, products, and sales history will be erased and cannot be recovered."
                confirmLabel={deleteLoading ? "Deleting…" : "Yes, delete forever"}
                confirmStyle="bg-red-600 hover:bg-red-700"
                onConfirm={confirmDelete}
                onCancel={() => { setDeleteModal(false); setDeleteOtpSent(false); setDeleteOtp(Array(OTP_LEN).fill("")); }}
                loading={deleteLoading}
            >
                {!deleteOtpSent ? (
                    <button onClick={sendDeleteOtp} disabled={deleteLoading}
                        className="w-full mb-3 py-2.5 rounded-xl border-2 border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100 flex items-center justify-center gap-2 transition-all">
                        {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                        Send verification code to {authUser?.email}
                    </button>
                ) : (
                    <div className="mb-3 space-y-3">
                        <p className="text-[0.75rem] text-slate-500 text-center">
                            Enter the 8-digit code sent to <strong>{authUser?.email}</strong>
                        </p>
                        <OtpRow otp={deleteOtp} setOtp={setDeleteOtp} disabled={deleteLoading} />
                        {deleteCooldown > 0
                            ? <p className="text-[0.7rem] text-slate-400 text-center">Resend in {deleteCooldown}s</p>
                            : <button onClick={sendDeleteOtp}
                                className="w-full text-[0.75rem] text-blue-600 font-bold flex items-center justify-center gap-1 hover:underline">
                                <RefreshCw size={11} />Resend code
                            </button>
                        }
                    </div>
                )}
            </ConfirmModal>

            {/* Remove MFA confirm modal */}
            <ConfirmModal
                open={!!showRemoveMfa}
                title="Remove this MFA method?"
                desc="Your account will be less secure without two-factor authentication. You can re-enable it anytime."
                confirmLabel="Remove MFA"
                confirmStyle="bg-orange-500 hover:bg-orange-600"
                onConfirm={() => showRemoveMfa && removeMfa(showRemoveMfa)}
                onCancel={() => setShowRemoveMfa(null)}
                loading={!!mfaRemoving}
            />

            <div className="min-h-screen bg-[#F0F4F8]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

                    {/* Page header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => router.back()}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="font-black text-slate-900 text-xl syne leading-none">Account Settings</h1>
                            <p className="text-[0.75rem] text-slate-400 font-medium mt-0.5">Manage your profile, security, and preferences</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

                        {/* Sidebar nav */}
                        <div className="space-y-1.5">

                            {/* Avatar card */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-3 flex flex-col items-center gap-3">
                                {loading ? (
                                    <>
                                        <Sk className="w-16 h-16 rounded-2xl" />
                                        <Sk className="h-4 w-28" />
                                        <Sk className="h-3 w-36" />
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md"
                                            style={{ fontFamily: "Syne, sans-serif", background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                                            {avatarInitial}
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-slate-900 text-sm syne">{profile?.store_name || "My Store"}</p>
                                            <p className="text-[0.7rem] text-slate-400 mt-0.5">{profile?.email}</p>
                                        </div>
                                        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                            {profile?.role ?? "Owner"}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Nav items */}
                            {NAV.map(n => {
                                const Icon = n.icon;
                                const active = section === n.id;
                                const isDanger = n.id === "danger";
                                return (
                                    <button key={n.id} onClick={() => setSection(n.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                                        style={{
                                            background: active ? (isDanger ? "rgba(239,68,68,0.06)" : "rgba(37,99,235,0.07)") : "transparent",
                                            border: active ? (isDanger ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(37,99,235,0.12)") : "1px solid transparent",
                                        }}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{
                                                background: active ? (isDanger ? "rgba(239,68,68,0.1)" : "rgba(37,99,235,0.1)") : "#f8fafc",
                                                color: active ? (isDanger ? "#dc2626" : "#2563eb") : "#94a3b8",
                                            }}>
                                            <Icon size={15} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[0.82rem] font-bold leading-none ${active ? (isDanger ? "text-red-600" : "text-blue-700") : "text-slate-700"}`}>
                                                {n.label}
                                            </p>
                                            <p className="text-[0.65rem] text-slate-400 font-medium mt-0.5 truncate">{n.desc}</p>
                                        </div>
                                        {active && <ChevronRight size={13} className={isDanger ? "text-red-400" : "text-blue-400"} />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content pane */}
                        <AnimatePresence mode="wait">
                            <motion.div key={section}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                                {/* ═══ PROFILE ═══ */}
                                {section === "profile" && (
                                    <div>
                                        <div className="px-6 py-5 border-b border-slate-100">
                                            <h2 className="font-black text-slate-900 text-base syne">Profile Information</h2>
                                            <p className="text-[0.75rem] text-slate-400 mt-0.5">Update your personal details and store information</p>
                                        </div>
                                        <div className="p-6 space-y-5">
                                            {loading ? (
                                                <div className="space-y-4">
                                                    {[...Array(5)].map((_, i) => <div key={i}><Sk className="h-3 w-24 mb-2" /><Sk className="h-11 w-full" /></div>)}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                        <Field label="Full Name">
                                                            <div className="relative">
                                                                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                <input type="text" value={profForm.full_name}
                                                                    onChange={e => setProfForm(f => ({ ...f, full_name: e.target.value }))}
                                                                    placeholder="Juan dela Cruz"
                                                                    className="ring-focus w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 transition-all" />
                                                            </div>
                                                        </Field>
                                                        <Field label="Store Name">
                                                            <div className="relative">
                                                                <Store size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                <input type="text" value={profForm.store_name}
                                                                    onChange={e => setProfForm(f => ({ ...f, store_name: e.target.value }))}
                                                                    placeholder="My Sari-Sari Store"
                                                                    className="ring-focus w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 transition-all" />
                                                            </div>
                                                        </Field>
                                                    </div>

                                                    <Field label="Email Address" hint="Your email is managed through Supabase Auth and cannot be changed here.">
                                                        <div className="relative">
                                                            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                            <input type="email" value={profile?.email ?? ""} disabled
                                                                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed" />
                                                        </div>
                                                    </Field>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                        <Field label="Age" hint="Auto-calculated from birthdate">
                                                            <input type="number" min={1} max={120} value={profForm.age}
                                                                onChange={e => setProfForm(f => ({ ...f, age: e.target.value }))}
                                                                placeholder="25"
                                                                className="ring-focus w-full px-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 transition-all" />
                                                        </Field>
                                                        <Field label="Birthdate">
                                                            <div className="relative">
                                                                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                <input type="date" value={profForm.birthdate}
                                                                    onChange={e => {
                                                                        const bd = e.target.value;
                                                                        // Auto-calculate age from birthdate
                                                                        let autoAge = "";
                                                                        if (bd) {
                                                                            const today = new Date();
                                                                            const birth = new Date(bd);
                                                                            let age = today.getFullYear() - birth.getFullYear();
                                                                            const m = today.getMonth() - birth.getMonth();
                                                                            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                                                                            autoAge = age >= 0 ? String(age) : "";
                                                                        }
                                                                        setProfForm(f => ({ ...f, birthdate: bd, age: autoAge }));
                                                                    }}
                                                                    className="ring-focus w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 transition-all" />
                                                            </div>
                                                        </Field>
                                                    </div>

                                                    <Field label="Address">
                                                        <div className="relative">
                                                            <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                                                            <textarea value={profForm.address} rows={2}
                                                                onChange={e => setProfForm(f => ({ ...f, address: e.target.value }))}
                                                                placeholder="Brgy. 123, Quezon City"
                                                                className="ring-focus w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 transition-all resize-none" />
                                                        </div>
                                                    </Field>

                                                    {profile?.updated_at && (
                                                        <p className="text-[0.7rem] text-slate-400 flex items-center gap-1">
                                                            <Info size={10} />
                                                            Last updated: {new Date(profile.updated_at).toLocaleDateString("en-PH", { dateStyle: "long" })}
                                                        </p>
                                                    )}

                                                    <div className="flex justify-end pt-2">
                                                        <button onClick={saveProfile} disabled={profSaving}
                                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                                                            style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.28)" }}>
                                                            {profSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                            {profSaving ? "Saving…" : "Save Changes"}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ═══ SECURITY ═══ */}
                                {section === "security" && (
                                    <div>
                                        <div className="px-6 py-5 border-b border-slate-100">
                                            <h2 className="font-black text-slate-900 text-base syne">Security</h2>
                                            <p className="text-[0.75rem] text-slate-400 mt-0.5">Change your password using email verification</p>
                                        </div>
                                        <div className="p-6 space-y-5">

                                            {/* Step indicator */}
                                            <div className="flex items-center gap-3 mb-2">
                                                {["Verify Email", "Set New Password"].map((label, i) => {
                                                    const done = i === 0 ? pwOtpVerified : false;
                                                    const active = i === 0 ? (pwOtpSent && !pwOtpVerified) : pwOtpVerified;
                                                    return (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-black"
                                                                    style={{ background: done ? "#2563eb" : active ? "#dbeafe" : "#f1f5f9", color: done ? "white" : active ? "#2563eb" : "#94a3b8" }}>
                                                                    {done ? <Check size={10} /> : i + 1}
                                                                </div>
                                                                <span className={`text-[0.72rem] font-bold ${active ? "text-blue-700" : done ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                                                            </div>
                                                            {i < 1 && <div className="w-8 h-px bg-slate-200" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Step 1: Send + enter OTP */}
                                            {!pwOtpVerified && (
                                                <div className="space-y-5">
                                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                                                        <Mail size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-bold text-blue-800">Email verification required</p>
                                                            <p className="text-[0.75rem] text-blue-600 mt-0.5">
                                                                We'll send an 8-digit code to <strong>{authUser?.email}</strong> before allowing a password change.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {!pwOtpSent ? (
                                                        <button onClick={sendPwOtp} disabled={pwLoading}
                                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                                                            style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.28)" }}>
                                                            {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                                                            {pwLoading ? "Sending code…" : "Send verification code"}
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <p className="text-sm text-slate-600 text-center font-medium">Enter the 8-digit code sent to your email</p>
                                                            <OtpRow otp={pwOtp} setOtp={setPwOtp} disabled={pwLoading} />
                                                            <div className="flex items-center justify-center gap-2 text-[0.75rem]">
                                                                <span className="text-slate-400">Didn't receive it?</span>
                                                                {pwCooldown > 0
                                                                    ? <span className="text-slate-400">Resend in {pwCooldown}s</span>
                                                                    : <button onClick={sendPwOtp} className="text-blue-600 font-bold flex items-center gap-1 hover:underline"><RefreshCw size={11} />Resend</button>
                                                                }
                                                            </div>
                                                            <button onClick={verifyPwOtp} disabled={pwLoading || pwOtp.join("").length < OTP_LEN}
                                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                                                                style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.28)" }}>
                                                                {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                                {pwLoading ? "Verifying…" : "Verify Code"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Step 2: New password */}
                                            {pwOtpVerified && (
                                                <div className="space-y-5">
                                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2 items-center">
                                                        <Check size={15} className="text-emerald-500 shrink-0" />
                                                        <p className="text-[0.8rem] font-bold text-emerald-700">Identity verified — set your new password below.</p>
                                                    </div>
                                                    <Field label="New Password" hint="Minimum 8 characters">
                                                        <div className="relative">
                                                            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                            <input type={pwShowNew ? "text" : "password"} value={pwNew}
                                                                onChange={e => setPwNew(e.target.value)} placeholder="••••••••"
                                                                className="ring-focus w-full pl-9 pr-10 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 transition-all" />
                                                            <button type="button" onClick={() => setPwShowNew(v => !v)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                                                {pwShowNew ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                    </Field>
                                                    <Field label="Confirm New Password">
                                                        <div className="relative">
                                                            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                            <input type={pwShowConf ? "text" : "password"} value={pwConfirm}
                                                                onChange={e => setPwConfirm(e.target.value)} placeholder="••••••••"
                                                                className="ring-focus w-full pl-9 pr-10 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 transition-all" />
                                                            <button type="button" onClick={() => setPwShowConf(v => !v)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                                                {pwShowConf ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                        {pwConfirm && pwNew !== pwConfirm && (
                                                            <p className="text-[0.72rem] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} />Passwords don't match</p>
                                                        )}
                                                        {pwConfirm && pwNew === pwConfirm && pwNew.length >= 8 && (
                                                            <p className="text-[0.72rem] text-emerald-500 mt-1 flex items-center gap-1"><Check size={10} />Passwords match</p>
                                                        )}
                                                    </Field>
                                                    <button onClick={changePassword} disabled={pwLoading || pwNew.length < 8 || pwNew !== pwConfirm}
                                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                                                        style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.28)" }}>
                                                        {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                                                        {pwLoading ? "Changing password…" : "Change Password"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ═══ MFA ═══ */}
                                {section === "mfa" && (
                                    <div>
                                        <div className="px-6 py-5 border-b border-slate-100">
                                            <h2 className="font-black text-slate-900 text-base syne">Two-Factor Authentication</h2>
                                            <p className="text-[0.75rem] text-slate-400 mt-0.5">Secure your account with an authenticator app</p>
                                        </div>
                                        <div className="p-6 space-y-5">

                                            {/* Supabase email notification events */}
                                            <div className="space-y-2.5">
                                                <p className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest">Supabase Email Events</p>
                                                {[
                                                    { icon: Shield, label: "Identity linked", desc: "You'll be notified when a new identity is linked to your account" },
                                                    { icon: ShieldCheck, label: "MFA method added", desc: "You'll be notified when a new MFA method is added to your account" },
                                                    { icon: ShieldOff, label: "MFA method removed", desc: "You'll be notified when an MFA method is removed from your account" },
                                                ].map(item => {
                                                    const Icon = item.icon;
                                                    return (
                                                        <div key={item.label} className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                                <Icon size={14} className="text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[0.8rem] font-bold text-slate-800">{item.label}</p>
                                                                <p className="text-[0.7rem] text-slate-500 mt-0.5">{item.desc}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Active factors */}
                                            {mfaLoading ? <Sk className="h-16 w-full" /> : mfaFactors.length === 0 ? (
                                                <div className="flex flex-col items-center py-8 text-center">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                                                        <Shield size={20} className="text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-500">No MFA methods linked</p>
                                                    <p className="text-[0.72rem] text-slate-400 mt-1">Add an authenticator app to secure your account</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest">Active Methods</p>
                                                    {mfaFactors.map(f => (
                                                        <div key={f.id} className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                                                <Smartphone size={14} className="text-emerald-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[0.82rem] font-bold text-slate-800 capitalize">{f.factor_type} Authenticator</p>
                                                                <p className="text-[0.68rem] text-slate-400">Status: <span className="text-emerald-600 font-bold capitalize">{f.status}</span></p>
                                                            </div>
                                                            <button onClick={() => setShowRemoveMfa(f.id)}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-red-200 text-red-500 text-[0.72rem] font-bold hover:bg-red-50 transition-all">
                                                                <X size={11} /> Remove
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Enroll flow */}
                                            {!enrollData ? (
                                                <button onClick={startEnroll} disabled={mfaLoading}
                                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50">
                                                    {mfaLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={15} />}
                                                    Add Authenticator App
                                                </button>
                                            ) : (
                                                <div className="space-y-4 border border-slate-200 rounded-2xl p-5 bg-slate-50">
                                                    <div className="flex items-center gap-2">
                                                        <Hash size={14} className="text-blue-500" />
                                                        <p className="text-sm font-black text-slate-800 syne">Set up Authenticator App</p>
                                                    </div>
                                                    <p className="text-[0.75rem] text-slate-500">Scan this QR code with Google Authenticator, Authy, or any TOTP app.</p>
                                                    <div className="flex justify-center">
                                                        <img src={enrollData.qr} alt="TOTP QR Code"
                                                            className="w-40 h-40 rounded-xl border-4 border-white shadow-md" />
                                                    </div>
                                                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                        <p className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">Manual Entry Key</p>
                                                        <p className="font-mono text-[0.78rem] font-bold text-slate-800 break-all select-all">{enrollData.secret}</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[0.72rem] font-bold text-slate-600 uppercase tracking-widest mb-2">Enter 6-digit code from your app</label>
                                                        <input type="text" inputMode="numeric" maxLength={6} value={totpCode}
                                                            onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                            placeholder="000000"
                                                            className="ring-focus w-full text-center text-2xl font-black tracking-widest py-3 rounded-xl bg-white border border-slate-200 transition-all"
                                                            style={{ fontFamily: "Syne, sans-serif", letterSpacing: "0.25em" }} />
                                                    </div>
                                                    <div className="flex gap-2.5">
                                                        <button onClick={() => { setEnrollData(null); setTotpCode(""); }}
                                                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">
                                                            Cancel
                                                        </button>
                                                        <button onClick={confirmEnroll} disabled={mfaLoading || totpCode.length !== 6}
                                                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                            style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                                                            {mfaLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                            Activate MFA
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ═══ NOTIFICATIONS ═══ */}
                                {section === "notifications" && (
                                    <div>
                                        <div className="px-6 py-5 border-b border-slate-100">
                                            <h2 className="font-black text-slate-900 text-base syne">Email Notifications</h2>
                                            <p className="text-[0.75rem] text-slate-400 mt-0.5">Control which security emails are sent to your account</p>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex gap-2.5">
                                                <Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
                                                <p className="text-[0.75rem] text-amber-700 font-medium leading-relaxed">
                                                    Supabase sends security emails automatically. Some events (like identity linking) cannot be disabled as they are critical security notifications.
                                                </p>
                                            </div>

                                            {[
                                                {
                                                    key: "identity_linked" as const,
                                                    icon: Shield,
                                                    label: "Identity linked",
                                                    desc: "Notify when a new identity (OAuth, magic link, etc.) is linked to your account",
                                                    alwaysOn: true,
                                                },
                                                {
                                                    key: "mfa_added" as const,
                                                    icon: ShieldCheck,
                                                    label: "Multi-factor authentication method added",
                                                    desc: "Notify when a new MFA method is added to your account",
                                                    alwaysOn: false,
                                                },
                                                {
                                                    key: "mfa_removed" as const,
                                                    icon: ShieldOff,
                                                    label: "Multi-factor authentication method removed",
                                                    desc: "Notify when an MFA method is removed from your account",
                                                    alwaysOn: false,
                                                },
                                            ].map(item => {
                                                const Icon = item.icon;
                                                const enabled = notifPrefs[item.key];
                                                return (
                                                    <div key={item.key} className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? "bg-blue-100 border border-blue-200" : "bg-slate-100 border border-slate-200"}`}>
                                                            <Icon size={16} className={enabled ? "text-blue-600" : "text-slate-400"} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-[0.85rem] font-bold text-slate-800">{item.label}</p>
                                                                {item.alwaysOn && (
                                                                    <span className="text-[0.6rem] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">Required</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[0.73rem] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => !item.alwaysOn && setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                                                            disabled={item.alwaysOn}
                                                            className={`relative w-10 h-6 rounded-full transition-all shrink-0 mt-1 ${item.alwaysOn ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                                                            style={{ background: enabled ? "#2563eb" : "#e2e8f0" }}>
                                                            <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                                                                style={{ transform: enabled ? "translateX(16px)" : "translateX(0)" }} />
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            <div className="flex justify-end pt-2">
                                                <button onClick={saveNotifPrefs}
                                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                                    style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.28)" }}>
                                                    <Save size={14} /> Save Preferences
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ═══ DANGER ZONE ═══ */}
                                {section === "danger" && (
                                    <div>
                                        <div className="px-6 py-5 border-b border-red-50 bg-red-50/40">
                                            <h2 className="font-black text-red-700 text-base syne flex items-center gap-2">
                                                <AlertTriangle size={16} className="text-red-500" />
                                                Danger Zone
                                            </h2>
                                            <p className="text-[0.75rem] text-red-400 mt-0.5">Irreversible actions — proceed with extreme caution</p>
                                        </div>
                                        <div className="p-6 space-y-4">

                                            {/* Sign out all sessions */}
                                            <div className="flex items-start gap-4 p-5 border border-orange-100 rounded-2xl bg-orange-50/40">
                                                <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                                                    <LogOut size={16} className="text-orange-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800 text-sm">Sign out from all sessions</p>
                                                    <p className="text-[0.73rem] text-slate-500 mt-0.5">Signs you out on all devices. You'll need to log in again everywhere.</p>
                                                </div>
                                                <button onClick={async () => {
                                                    await supabase.auth.signOut({ scope: "global" });
                                                    toast.success("Signed out from all sessions.");
                                                    setTimeout(() => router.push("/auth/login"), 1200);
                                                }} className="px-3.5 py-2 rounded-xl border border-orange-200 bg-white text-orange-600 text-[0.78rem] font-bold hover:bg-orange-50 transition-all shrink-0">
                                                    Sign Out All
                                                </button>
                                            </div>

                                            {/* Delete account */}
                                            <div className="flex items-start gap-4 p-5 border-2 border-red-200 rounded-2xl bg-red-50/60">
                                                <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                                                    <Trash2 size={16} className="text-red-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-red-800 text-sm">Delete my account</p>
                                                    <p className="text-[0.73rem] text-red-500 mt-0.5 leading-relaxed">
                                                        Permanently deletes your account and all store data. <strong>This cannot be undone.</strong>
                                                    </p>
                                                    <ul className="mt-2 space-y-0.5">
                                                        {["Your profile and store info", "All inventory and products", "All sales records and analytics"].map(item => (
                                                            <li key={item} className="text-[0.7rem] text-red-400 flex items-center gap-1.5">
                                                                <X size={9} className="shrink-0" /> {item} will be deleted
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <button onClick={() => setDeleteModal(true)}
                                                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[0.78rem] font-bold transition-all shrink-0 flex items-center gap-1.5">
                                                    <Trash2 size={12} /> Delete Account
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </>
    );
}