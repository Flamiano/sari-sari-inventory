"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    Shield, Lock, Mail, KeyRound, UserCheck, Bell,
    CheckCircle2, Smartphone, RefreshCw, Eye, AlertTriangle,
    Fingerprint, Users, Store,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
    id: string;
    full_name: string | null;
    email: string;
    store_name: string | null;
    role: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const visible = local.slice(0, 2);
    const masked = "*".repeat(Math.max(local.length - 4, 2));
    const tail = local.slice(-2);
    return `${visible}${masked}${tail}@${domain}`;
}

function getInitials(name: string | null, email: string): string {
    if (name) {
        return name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B",
    "#EF4444", "#06B6D4", "#EC4899", "#6366F1",
];
function avatarColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Owner Feed Component ───────────────────────────────────────────────────────
function OwnerFeed() {
    const [owners, setOwners] = useState<Profile[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [newEntry, setNewEntry] = useState<string | null>(null);

    useEffect(() => {
        async function fetchOwners() {
            // Count all owners
            const { count, error: countErr } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("role", "owner");

            if (countErr) {
                console.error("[OwnerFeed] count error:", countErr.message);
            }
            setTotal(count ?? 0);

            // Fetch first 10, ordered newest first
            const { data, error: dataErr } = await supabase
                .from("profiles")
                .select("id, full_name, email, store_name, role")
                .eq("role", "owner")
                .order("updated_at", { ascending: false })
                .limit(10);

            if (dataErr) {
                console.error("[OwnerFeed] data error:", dataErr.message);
            }
            setOwners(data ?? []);
            setLoading(false);
        }

        fetchOwners();

        // Real-time subscription
        const channel = supabase
            .channel("profiles-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "profiles",
                    filter: "role=eq.owner",
                },
                (payload) => {
                    const newProfile = payload.new as Profile;
                    setNewEntry(newProfile.id);
                    setTimeout(() => setNewEntry(null), 3000);

                    setOwners((prev) => {
                        const updated = [newProfile, ...prev].slice(0, 10);
                        return updated;
                    });
                    setTotal((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: "#E2E8F0" }} />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 rounded-full w-2/3" style={{ background: "#E2E8F0" }} />
                            <div className="h-2.5 rounded-full w-1/2" style={{ background: "#F1F5F9" }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold" style={{ color: "#64748B" }}>
                        Live Registrations
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <Users size={11} style={{ color: "#3B82F6" }} />
                    <span className="text-[0.65rem] font-black" style={{ color: "#3B82F6" }}>
                        {total.toLocaleString()} owner{total !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            {/* Owner list */}
            <div className="space-y-2">
                <AnimatePresence initial={false}>
                    {owners.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="py-6 text-center rounded-xl"
                            style={{ background: "#F8FAFC", border: "1px dashed #E2E8F0" }}>
                            <Users size={20} className="mx-auto mb-2" style={{ color: "#CBD5E1" }} />
                            <p className="text-xs font-semibold" style={{ color: "#94A3B8" }}>
                                No registrations yet
                            </p>
                            <p className="text-[0.65rem] mt-0.5" style={{ color: "#CBD5E1" }}>
                                Make sure anon read is enabled on <code>profiles</code>
                            </p>
                        </motion.div>
                    ) : owners.map((owner) => {
                        const isNew = newEntry === owner.id;
                        const color = avatarColor(owner.id);
                        return (
                            <motion.div
                                key={owner.id}
                                initial={{ opacity: 0, x: -12, scale: 0.97 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 12 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                                style={{
                                    background: isNew ? "rgba(16,185,129,0.06)" : "rgba(248,250,252,0.8)",
                                    border: `1px solid ${isNew ? "rgba(16,185,129,0.2)" : "#F1F5F9"}`,
                                }}>
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                    style={{ background: color }}>
                                    {getInitials(owner.full_name, owner.email)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs font-bold truncate" style={{ color: "#0F172A" }}>
                                            {owner.store_name ?? owner.full_name ?? "Store Owner"}
                                        </span>
                                        {isNew && (
                                            <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                                                style={{ background: "#10B981", color: "white" }}>
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0">
                                        <Store size={9} style={{ color: "#94A3B8", flexShrink: 0 }} />
                                        <span className="text-[0.65rem] truncate" style={{ color: "#94A3B8" }}>
                                            {maskEmail(owner.email)}
                                        </span>
                                    </div>
                                </div>

                                {/* Verified badge */}
                                <CheckCircle2 size={14} style={{ color: "#10B981", flexShrink: 0 }} />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* More owners indicator */}
            {total > 10 && (
                <div className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                    style={{ background: "#F8FAFC", border: "1px dashed #E2E8F0" }}>
                    <Users size={12} style={{ color: "#94A3B8" }} />
                    <span className="text-[0.72rem] font-semibold" style={{ color: "#94A3B8" }}>
                        +{(total - 10).toLocaleString()} more owner{total - 10 !== 1 ? "s" : ""}...
                    </span>
                </div>
            )}
        </div>
    );
}

// ── Feature data ──────────────────────────────────────────────────────────────
const LOGIN_FEATURES = [
    { icon: <KeyRound size={15} />, title: "Email & Password Login", desc: "Secure login with hashed credentials — no plaintext passwords stored anywhere.", color: "#3B82F6" },
    { icon: <Fingerprint size={15} />, title: "2FA (All Users)", desc: "Every user completes a one-time code verification via email after password entry.", color: "#8B5CF6" },
    { icon: <Shield size={15} />, title: "MFA for Owners", desc: "Store owners can enable multi-factor authentication in Settings for an extra security layer.", color: "#EF4444" },
    { icon: <RefreshCw size={15} />, title: "Session Idle Timeout", desc: "Inactive sessions auto-logout after a set period — preventing unauthorized access.", color: "#F59E0B" },
    { icon: <Eye size={15} />, title: "Re-Authentication", desc: "Sensitive dashboard actions require password confirmation before proceeding.", color: "#10B981" },
    { icon: <AlertTriangle size={15} />, title: "Privilege Escalation Prevention", desc: "Cashiers and staff workers cannot elevate their own permissions — ever.", color: "#06B6D4" },
];

const FORGOT_FEATURES = [
    { icon: <Mail size={15} />, title: "Password Reset Email", desc: "Enter your email and a secure reset link is sent instantly to your inbox.", color: "#3B82F6" },
    { icon: <KeyRound size={15} />, title: "2FA Before Reset", desc: "Identity is verified with a one-time code before the new password is accepted.", color: "#8B5CF6" },
    { icon: <Bell size={15} />, title: "Change Notification Email", desc: "An alert email is fired the moment your password is successfully changed.", color: "#F59E0B" },
    { icon: <Shield size={15} />, title: "Secure Token Expiry", desc: "Reset links expire after a short window — stale tokens cannot be reused.", color: "#EF4444" },
];

const REGISTER_FEATURES = [
    { icon: <UserCheck size={15} />, title: "Email Confirmation", desc: "After sign-up, a verification email is sent — accounts are not activated until confirmed.", color: "#10B981" },
    { icon: <CheckCircle2 size={15} />, title: "Verified Before Login", desc: "Unconfirmed emails cannot log in — preventing fake or disposable account abuse.", color: "#3B82F6" },
    { icon: <Lock size={15} />, title: "Hashed Password Storage", desc: "Passwords are bcrypt-hashed on registration — never stored in plaintext.", color: "#8B5CF6" },
    { icon: <Smartphone size={15} />, title: "2FA Enrollment on First Login", desc: "New owners are guided through 2FA setup immediately after their first successful login.", color: "#F59E0B" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthFeature() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Shield size={24} style={{ color: "#EF4444" }} />
                </div>
                <div>
                    <h2 className="font-black text-2xl sm:text-3xl mb-1"
                        style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Authentication & Security
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: "#64748B", maxWidth: 540 }}>
                        Enterprise-grade security for your tindahan — 2FA, MFA, email verification, and smart session control built in.
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                LOGIN SECTION
            ═══════════════════════════════════════════ */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6" }}>
                        <Lock size={14} />
                    </div>
                    <h3 className="font-black text-lg" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Login & Two-Factor Authentication
                    </h3>
                </div>

                {/* Screenshots — Balanced 2-col images with desktop-optimized styling */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                    {/* Card 1: Login */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className="group relative rounded-2xl overflow-hidden border shadow-lg flex flex-col transition-all duration-300"
                        style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>

                        <div className="absolute top-3 left-3 z-10">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full shadow-sm"
                                style={{ background: "#3B82F6", color: "white" }}>Login Screen</span>
                        </div>

                        <div className="relative overflow-hidden" style={{ height: "340px" }}>
                            <Image src="/images/auth/login2.png" alt="Login page"
                                fill priority
                                sizes="(max-width:768px) 100vw, 500px"
                                className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
                        </div>

                        <div className="px-4 py-2.5 border-t mt-auto" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
                                Email + password → 2FA code → dashboard
                            </span>
                        </div>
                    </motion.div>

                    {/* Card 2: 2FA */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.1 }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className="group relative rounded-2xl overflow-hidden border shadow-lg flex flex-col transition-all duration-300"
                        style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>

                        <div className="absolute top-3 left-3 z-10">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full shadow-sm"
                                style={{ background: "#8B5CF6", color: "white" }}>2FA / MFA</span>
                        </div>

                        <div className="relative overflow-hidden" style={{ height: "340px" }}>
                            <Image src="/images/auth/2FA.png" alt="2FA verification"
                                fill
                                sizes="(max-width:768px) 100vw, 500px"
                                className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
                        </div>

                        <div className="px-4 py-3 border-t mt-auto" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black" style={{ color: "#0F172A" }}>
                                    Two-Factor & Multi-Factor Auth
                                </span>
                                <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
                                    Required
                                </span>
                            </div>
                            <p className="text-[0.72rem] leading-relaxed" style={{ color: "#64748B" }}>
                                After entering your password, a one-time code is sent to your email. Owners can upgrade to full MFA in Settings for an extra layer of protection.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Feature bullets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {LOGIN_FEATURES.map((b, i) => (
                        <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                            className="rounded-xl p-4 border bg-white"
                            style={{ borderColor: "#E2E8F0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                                style={{ background: `${b.color}18`, color: b.color }}>
                                {b.icon}
                            </div>
                            <div className="font-bold text-sm mb-1" style={{ color: "#0F172A" }}>{b.title}</div>
                            <div className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{b.desc}</div>
                        </motion.div>
                    ))}
                </div>

                {/* MFA callout */}
                <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="rounded-xl p-4 border flex items-start gap-3"
                    style={{ background: "linear-gradient(135deg,#FFF5F5,#FEF2F2)", borderColor: "#FECACA" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "#EF4444", color: "white" }}>
                        <Fingerprint size={17} />
                    </div>
                    <div>
                        <div className="font-black text-sm mb-1" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#7F1D1D" }}>
                            MFA — Owner-Exclusive Setting
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "#991B1B" }}>
                            Store owners can enable Multi-Factor Authentication in their account settings. When active, login requires email + password + 2FA code + a second authenticator method.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* ═══════════════════════════════════════════
                FORGOT PASSWORD SECTION
            ═══════════════════════════════════════════ */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                        <KeyRound size={14} />
                    </div>
                    <h3 className="font-black text-lg" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Forgot Password & Reset Flow
                    </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Full image */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-2xl overflow-hidden border shadow-lg"
                        style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
                        <div className="absolute top-3 left-3 z-10">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: "#F59E0B", color: "white" }}>Reset Password</span>
                        </div>
                        <Image src="/images/auth/forgot.png" alt="Forgot password"
                            width={0} height={0} sizes="(max-width:768px) 100vw, 450px"
                            style={{ width: "100%", height: "auto", display: "block" }} />
                        <div className="px-4 py-2.5 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
                                Email → 2FA verify → new password → notification
                            </span>
                        </div>
                    </motion.div>

                    {/* Step-by-step panel */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.08 }}
                        className="rounded-2xl p-5 border flex flex-col justify-center gap-3.5"
                        style={{ background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", borderColor: "#FDE68A" }}>
                        <div className="font-black text-sm" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#78350F" }}>
                            Reset Flow — Step by Step
                        </div>
                        {[
                            { step: "1", label: "Enter your email address", icon: <Mail size={13} /> },
                            { step: "2", label: "Receive secure reset link via email", icon: <Bell size={13} /> },
                            { step: "3", label: "Complete 2FA identity verification", icon: <Shield size={13} /> },
                            { step: "4", label: "Set your new password", icon: <KeyRound size={13} /> },
                            { step: "5", label: "Password change alert email sent", icon: <CheckCircle2 size={13} /> },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-black flex-shrink-0"
                                    style={{ background: "#F59E0B", color: "white" }}>{s.step}</div>
                                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#92400E" }}>
                                    <span style={{ color: "#D97706" }}>{s.icon}</span>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {FORGOT_FEATURES.map((b, i) => (
                        <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                            className="rounded-xl p-4 border bg-white"
                            style={{ borderColor: "#E2E8F0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                                style={{ background: `${b.color}18`, color: b.color }}>
                                {b.icon}
                            </div>
                            <div className="font-bold text-sm mb-1" style={{ color: "#0F172A" }}>{b.title}</div>
                            <div className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{b.desc}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                REGISTER SECTION + LIVE OWNER FEED
            ═══════════════════════════════════════════ */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                        <UserCheck size={14} />
                    </div>
                    <h3 className="font-black text-lg" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                        Registration & Email Verification
                    </h3>
                </div>

                {/* 3-col: image | info panel | live feed */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    {/* Cashier/staff screenshot */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-2xl overflow-hidden border shadow-lg"
                        style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
                        <div className="absolute top-3 left-3 z-10">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: "#10B981", color: "white" }}>Cashier / Staff</span>
                        </div>
                        <Image src="/images/auth/cashier-staff.jpeg" alt="Cashier staff access"
                            width={0} height={0} sizes="(max-width:768px) 100vw, 350px"
                            style={{ width: "100%", height: "auto", display: "block" }} />
                        <div className="px-4 py-2.5 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
                                PIN login — created by owner only
                            </span>
                        </div>
                    </motion.div>

                    {/* Owner registration flow */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.08 }}
                        className="rounded-2xl p-5 border flex flex-col justify-center gap-3"
                        style={{ background: "linear-gradient(135deg,#F0FDF4,#ECFDF5)", borderColor: "#A7F3D0" }}>
                        <div className="font-black text-sm" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#065F46" }}>
                            Owner Registration Flow
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "#047857" }}>
                            Only store owners self-register. Staff and cashiers are created by the owner from within the dashboard.
                        </p>
                        {[
                            { step: "1", label: "Fill in store name, email & password", icon: <UserCheck size={13} /> },
                            { step: "2", label: "Confirmation email sent automatically", icon: <Mail size={13} /> },
                            { step: "3", label: "Click the verification link in email", icon: <CheckCircle2 size={13} /> },
                            { step: "4", label: "Account activated — proceed to login", icon: <Lock size={13} /> },
                            { step: "5", label: "2FA enrollment on first login", icon: <Fingerprint size={13} /> },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-black flex-shrink-0"
                                    style={{ background: "#10B981", color: "white" }}>{s.step}</div>
                                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#065F46" }}>
                                    <span style={{ color: "#059669" }}>{s.icon}</span>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Live Owner Feed */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.12 }}
                        className="rounded-2xl p-4 border"
                        style={{ borderColor: "#E2E8F0", background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                        <OwnerFeed />
                    </motion.div>
                </div>

                {/* Register feature bullets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {REGISTER_FEATURES.map((b, i) => (
                        <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                            className="rounded-xl p-4 border bg-white"
                            style={{ borderColor: "#E2E8F0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                                style={{ background: `${b.color}18`, color: b.color }}>
                                {b.icon}
                            </div>
                            <div className="font-bold text-sm mb-1" style={{ color: "#0F172A" }}>{b.title}</div>
                            <div className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{b.desc}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                SECURITY MATRIX
            ═══════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: "#E2E8F0" }}>
                <div className="px-5 py-3.5 border-b flex items-center gap-2"
                    style={{ borderColor: "#F1F5F9", background: "#F8FAFC" }}>
                    <Shield size={14} style={{ color: "#8B5CF6" }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#64748B" }}>
                        Security Feature Matrix
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#F8FAFC" }}>
                                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #F1F5F9" }}>
                                    Security Feature
                                </th>
                                {["Owner", "Cashier", "Staff Worker"].map(role => (
                                    <th key={role} style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #F1F5F9" }}>
                                        {role}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { feature: "2FA on Login", owner: true, cashier: false, staff: false },
                                { feature: "MFA (extra layer)", owner: true, cashier: false, staff: false },
                                { feature: "Email Verification", owner: true, cashier: false, staff: false },
                                { feature: "Password Reset", owner: true, cashier: false, staff: false },
                                { feature: "Change Alert Email", owner: true, cashier: false, staff: false },
                                { feature: "Session Auto-Logout", owner: true, cashier: true, staff: true },
                                { feature: "PIN-Based Login", owner: false, cashier: true, staff: true },
                            ].map((row, i) => (
                                <tr key={row.feature} style={{ background: i % 2 === 0 ? "white" : "#FAFBFC" }}>
                                    <td style={{ padding: "10px 16px", fontWeight: 600, color: "#0F172A", borderBottom: "1px solid #F1F5F9" }}>
                                        {row.feature}
                                    </td>
                                    {[row.owner, row.cashier, row.staff].map((has, j) => (
                                        <td key={j} style={{ padding: "10px 16px", textAlign: "center", borderBottom: "1px solid #F1F5F9" }}>
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                width: 22, height: 22, borderRadius: 8,
                                                background: has ? "#DCFCE7" : "#FEF2F2",
                                                color: has ? "#16A34A" : "#DC2626",
                                                fontSize: 13, fontWeight: 700,
                                            }}>
                                                {has ? "✓" : "✕"}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}