"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Mail, Phone, Star, Book, Zap, ArrowRight, CheckCircle2,
    Shield, MessageCircle, Store, Copy, Check, ChevronRight, Users,
} from "lucide-react";
import Navbar from "@/app/comps/navbar/page";
import Footer from "@/app/comps/footer/page";
import { supabase } from "@/app/utils/supabase";

// Types
interface FeedbackItem {
    id: string;
    title: string;
    message: string;
    rating: number | null;
    category: string;
    created_at: string;
    user_id: string;
    owner_name: string | null;
    owner_store: string | null;
    owner_email: string | null;
}

// Helpers
const maskEmail = (email: string): string => {
    const [user, domain] = email.split("@");
    if (!domain) return email;
    return `${user.slice(0, 2)}${"*".repeat(Math.max(2, Math.min(user.length - 2, 4)))}@${domain}`;
};

const timeAgo = (date: string): string => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const getReviewerInfo = (r: FeedbackItem) => {
    const masked = r.owner_email ? maskEmail(r.owner_email) : null;
    const name = r.owner_name || masked || "Member";
    const sub = [r.owner_store, masked].filter(Boolean).join(" · ") || r.category.replace(/_/g, " ");
    const avatar = (r.owner_name || r.owner_email || "M").charAt(0).toUpperCase();
    return { name, sub, avatar };
};

// Live feedback hook
function useLiveFeedback() {
    const [reviews, setReviews] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchReviews = useCallback(async () => {
        try {
            const { data: feedbackData } = await supabase
                .from("feedback")
                .select("id,title,message,rating,category,created_at,user_id")
                .in("status", ["open", "in_review", "resolved"])
                .not("rating", "is", null)
                .gte("rating", 4)
                .order("created_at", { ascending: false })
                .limit(6);

            if (!feedbackData || feedbackData.length === 0) {
                setReviews([]);
                setLoading(false);
                return;
            }

            const userIds = [...new Set(feedbackData.map(r => r.user_id))];
            const { data: profileData } = await supabase
                .from("profiles")
                .select("id,full_name,store_name,email")
                .in("id", userIds);

            const pMap: Record<string, { full_name: string | null; store_name: string | null; email: string }> =
                Object.fromEntries((profileData ?? []).map(p => [p.id, p]));

            setReviews(feedbackData.map(r => {
                const p = pMap[r.user_id];
                return {
                    ...r,
                    owner_name: p?.full_name?.trim() || null,
                    owner_store: p?.store_name?.trim() || null,
                    owner_email: p?.email || null,
                };
            }));
        } catch (err) {
            console.error("useLiveFeedback error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedFetch = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => fetchReviews(), 300);
    }, [fetchReviews]);

    useEffect(() => {
        fetchReviews();
        const channelName = `contact-feedback-${Date.now()}`;
        const ch = supabase.channel(channelName)
            .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, debouncedFetch)
            .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, debouncedFetch)
            .subscribe((status) => {
                if (status === "SUBSCRIBED") fetchReviews();
            });
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            supabase.removeChannel(ch);
        };
    }, [fetchReviews, debouncedFetch]);

    return { reviews, loading };
}

// Copy button
function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all flex-shrink-0"
            style={{ background: copied ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.08)", color: copied ? "#10b981" : "#94A3B8" }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
    );
}

// Review card
function ReviewCard({ r, index }: { r: FeedbackItem; index: number }) {
    const d = getReviewerInfo(r);
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl p-5 border bg-white flex flex-col"
            style={{ borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex gap-0.5">
                    {[...Array(5)].map((_, si) => (
                        <Star key={si} size={11}
                            className={si < (r.rating ?? 5) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
                    ))}
                </div>
                <span className="text-[0.62rem] font-semibold" style={{ color: "#94A3B8" }}>{timeAgo(r.created_at)}</span>
            </div>
            <span className="inline-block text-[0.58rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-2.5 self-start"
                style={{ background: "rgba(37,99,235,0.07)", color: "#2563EB" }}>
                {r.category.replace(/_/g, " ")}
            </span>
            {r.title && (
                <div className="font-bold text-sm mb-1.5" style={{ color: "#0F172A" }}>{r.title}</div>
            )}
            <p className="text-[0.8rem] leading-relaxed italic mb-4 flex-1" style={{ color: "#64748B" }}>
                "{r.message.length > 140 ? `${r.message.slice(0, 140)}…` : r.message}"
            </p>
            <div className="flex items-center gap-2.5 pt-3.5 border-t" style={{ borderColor: "#F1F5F9" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}>
                    {d.avatar}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate" style={{ color: "#0F172A" }}>{d.name}</div>
                    <div className="text-[0.62rem] truncate" style={{ color: "#94A3B8" }}>{d.sub}</div>
                </div>
                <CheckCircle2 size={12} style={{ color: "#10B981", flexShrink: 0 }} />
            </div>
        </motion.div>
    );
}

// Review skeleton
function ReviewSkeleton() {
    return (
        <div className="rounded-2xl p-5 border bg-white animate-pulse" style={{ borderColor: "#E2E8F0" }}>
            <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <div key={i} className="w-3 h-3 rounded-full" style={{ background: "#E2E8F0" }} />)}</div>
            <div className="h-2.5 rounded-full w-2/3 mb-2" style={{ background: "#F1F5F9" }} />
            <div className="h-2 rounded-full w-full mb-1.5" style={{ background: "#F1F5F9" }} />
            <div className="h-2 rounded-full w-4/5 mb-4" style={{ background: "#F1F5F9" }} />
            <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "#F1F5F9" }}>
                <div className="w-8 h-8 rounded-full" style={{ background: "#E2E8F0" }} />
                <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded-full w-20" style={{ background: "#E2E8F0" }} />
                    <div className="h-2 rounded-full w-14" style={{ background: "#F1F5F9" }} />
                </div>
            </div>
        </div>
    );
}

// Person contact card
function PersonCard({ name, email, phone, role, color, delay = 0 }: {
    name: string; email: string; phone?: string; role: string; color: string; delay?: number;
}) {
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border bg-white overflow-hidden"
            style={{ borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div className="h-1 w-full" style={{ background: color }} />
            <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0"
                        style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 4px 16px ${color}30` }}>
                        {initials}
                    </div>
                    <div>
                        <div className="font-black text-sm leading-tight" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>{name}</div>
                        <span className="inline-block text-[0.6rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1"
                            style={{ background: `${color}12`, color }}>
                            {role}
                        </span>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "#F8FAFC" }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, color }}>
                            <Mail size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[0.58rem] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>Email</div>
                            <a href={`mailto:${email}`} className="text-[0.78rem] font-semibold hover:underline truncate block" style={{ color: "#0F172A" }}>{email}</a>
                        </div>
                        <CopyBtn text={email} />
                    </div>
                    {phone ? (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "#F8FAFC" }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, color }}>
                                <Phone size={12} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[0.58rem] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>Phone / SMS</div>
                                <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-[0.78rem] font-semibold hover:underline" style={{ color: "#0F172A" }}>{phone}</a>
                            </div>
                            <CopyBtn text={phone} />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "#F8FAFC" }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, color }}>
                                <Phone size={12} />
                            </div>
                            <span className="text-[0.78rem] font-semibold" style={{ color: "#94A3B8" }}>Email preferred</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Main page
export default function ContactPage() {
    const { reviews, loading } = useLiveFeedback();

    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + (r.rating ?? 5), 0) / reviews.length).toFixed(1)
        : null;

    return (
        <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Familjen+Grotesk:wght@700;800&display=swap');
                * { box-sizing: border-box; }
                h1,h2,h3,h4 { font-family: 'Familjen Grotesk', sans-serif; }
            `}</style>

            <Navbar />

            {/* Hero */}
            <div style={{ background: "linear-gradient(135deg, #050E1F 0%, #0c1a3a 60%, #050E1F 100%)", paddingTop: "80px", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-8 relative">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 border text-xs font-bold uppercase tracking-widest"
                        style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)", color: "#60A5FA" }}>
                        <Mail size={11} /> Contact & Support
                    </motion.div>

                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                        <div>
                            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
                                className="text-white font-black leading-tight mb-3"
                                style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.7rem,4vw,2.6rem)" }}>
                                Get in Touch
                            </motion.h1>
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                                className="text-sm sm:text-base mb-4"
                                style={{ color: "rgba(255,255,255,0.5)", maxWidth: 420 }}>
                                Questions about the platform, technical support, or just want to say hi — reach out directly.
                            </motion.p>
                            {/* IAS badge */}
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border"
                                style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.25)" }}>
                                <Shield size={13} style={{ color: "#A5B4FC" }} />
                                <div>
                                    <div className="text-[0.68rem] font-black uppercase tracking-widest leading-none" style={{ color: "#A5B4FC" }}>IAS Capstone Project</div>
                                    <div className="text-[0.62rem] mt-0.5" style={{ color: "rgba(165,180,252,0.5)" }}>Information Assurance and Security</div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Rating pill in hero */}
                        {!loading && reviews.length > 0 && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl border flex-shrink-0"
                                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}
                                </div>
                                <div>
                                    <div className="text-white font-black text-sm">{avgRating} / 5</div>
                                    <div className="text-[0.62rem]" style={{ color: "rgba(255,255,255,0.35)" }}>{reviews.length} verified {reviews.length === 1 ? "review" : "reviews"}</div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                MAIN CONTENT
                Mobile:  all sections stack top-to-bottom
                Desktop: 3-column grid — left | center | right
            ══════════════════════════════════════════════════════ */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold mb-8" style={{ color: "#94A3B8" }}>
                    <Link href="/" style={{ color: "#94A3B8", textDecoration: "none" }}>Home</Link>
                    <ChevronRight size={11} />
                    <span style={{ color: "#475569" }}>Contact</span>
                </div>

                {/* 3-column desktop / stacked mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 items-start">

                    {/* ── LEFT: Contact cards ── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: "#3B82F6" }} />
                            <span className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: "#94A3B8" }}>Direct Contact</span>
                        </div>

                        <PersonCard name="John Roel Flamiano" email="johnroelf17@gmail.com" phone="0994 595 3073" role="Technical Lead" color="#3B82F6" delay={0} />
                        <PersonCard name="Sari-Sari IMS" email="sarisariims77@gmail.com" role="Technical Support" color="#10B981" delay={0.06} />

                        {/* Quick links */}
                        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                            className="rounded-2xl p-4 border"
                            style={{ background: "linear-gradient(135deg,#EFF6FF,#EEF2FF)", borderColor: "#BFDBFE" }}>
                            <div className="font-bold text-xs text-slate-700 mb-2.5">Looking for something?</div>
                            <div className="space-y-2">
                                {[
                                    { icon: <Book size={11} />, label: "Read the Docs", href: "/pages/docs" },
                                    { icon: <Zap size={11} />, label: "Browse Features", href: "/pages/features" },
                                    { icon: <Shield size={11} />, label: "Auth & Security Guide", href: "/pages/docs?section=auth&item=2fa-login" },
                                ].map(l => (
                                    <Link key={l.label} href={l.href}
                                        className="flex items-center gap-2 text-[0.78rem] font-medium hover:underline"
                                        style={{ color: "#2563EB" }}>
                                        {l.icon} {l.label}
                                    </Link>
                                ))}
                            </div>
                        </motion.div>

                        {/* IAS project mini card */}
                        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.14 }}
                            className="rounded-2xl border overflow-hidden"
                            style={{ background: "white", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#6366F1,#8B5CF6,#3B82F6)" }} />
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
                                        <Shield size={13} />
                                    </div>
                                    <div className="font-black text-xs" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                                        IAS Capstone
                                    </div>
                                </div>
                                <p className="text-[0.74rem] leading-relaxed mb-3" style={{ color: "#64748B" }}>
                                    Built as a capstone for <strong style={{ color: "#374151" }}>Information Assurance and Security</strong>, demonstrating real-world MFA, RBAC, encryption, and audit trails.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {["2FA / MFA", "RBAC", "RLS", "Audit Trail", "Encryption"].map(tag => (
                                        <span key={tag} className="text-[0.58rem] font-bold px-2 py-0.5 rounded-full"
                                            style={{ background: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ── CENTER: Live reviews ── */}
                    <div className="min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#10B981" }} />
                                <span className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: "#94A3B8" }}>Live Owner Feedback</span>
                            </div>
                            {!loading && reviews.length > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.62rem] font-bold"
                                    style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                                    <Star size={9} className="fill-amber-400 text-amber-400" />
                                    {avgRating} · {reviews.length}
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...Array(4)].map((_, i) => <ReviewSkeleton key={i} />)}
                            </div>
                        ) : reviews.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="rounded-2xl border p-10 text-center"
                                style={{ borderColor: "#E2E8F0", background: "white" }}>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                                    style={{ background: "rgba(37,99,235,0.06)" }}>
                                    <MessageCircle size={22} style={{ color: "#2563EB" }} />
                                </div>
                                <div className="font-black text-sm mb-1.5" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>No reviews yet</div>
                                <p className="text-[0.8rem] max-w-xs mx-auto leading-relaxed mb-4" style={{ color: "#64748B" }}>
                                    Once store owners start using SariSari IMS, their feedback will appear here in real time.
                                </p>
                                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border"
                                    style={{ background: "#F8FAFC", borderColor: "#E2E8F0", color: "#64748B" }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Listening for new reviews live
                                </div>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {reviews.map((r, i) => <ReviewCard key={r.id} r={r} index={i} />)}
                            </div>
                        )}

                        {/* CTA */}
                        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="mt-5 rounded-2xl border p-5 flex flex-col sm:flex-row items-center gap-4"
                            style={{ background: "linear-gradient(135deg,#050E1F,#0c1a3a)", borderColor: "rgba(255,255,255,0.08)" }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(37,99,235,0.2)", color: "#60A5FA" }}>
                                <Store size={18} />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <div className="font-black text-sm text-white mb-0.5" style={{ fontFamily: "'Familjen Grotesk',sans-serif" }}>Ready to modernize your tindahan?</div>
                                <p className="text-[0.78rem]" style={{ color: "rgba(255,255,255,0.4)" }}>No credit card. No contract. Start free.</p>
                            </div>
                            <Link href="/auth/register"
                                className="inline-flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex-shrink-0"
                                style={{ background: "#2563EB", color: "white", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}>
                                Get Started <ArrowRight size={12} />
                            </Link>
                        </motion.div>
                    </div>

                    {/* ── RIGHT: Map + IAS security details ── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
                            <span className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: "#94A3B8" }}>Store Location</span>
                        </div>

                        {/* Map */}
                        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="rounded-2xl overflow-hidden border shadow-sm"
                            style={{ borderColor: "#E2E8F0" }}>
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!4v1774102255610!6m8!1m7!1sycoeS2eEgBkDMIoA7u3ZXQ!2m2!1d14.72666277553752!2d121.0374175250209!3f263.24543990499245!4f-5.619755912195345!5f0.7820865974627469"
                                width="100%"
                                height="220"
                                style={{ border: 0, display: "block" }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="BCP Store Location"
                            />
                            <div className="px-3.5 py-2.5 border-t flex items-center gap-2.5" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                </div>
                                <span className="text-[0.7rem] font-semibold" style={{ color: "#64748B" }}>BCP, Quezon City</span>
                            </div>
                        </motion.div>

                        {/* IAS security features */}
                        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
                            className="rounded-2xl border overflow-hidden"
                            style={{ background: "white", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#6366F1,#8B5CF6,#3B82F6)" }} />
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded-full" style={{ background: "#6366F1" }} />
                                    <span className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: "#94A3B8" }}>IAS Security Features</span>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { icon: "🔐", title: "Multi-Factor Auth", desc: "2FA + MFA for all accounts." },
                                        { icon: "🛡️", title: "Role-Based Access", desc: "Owner, Cashier, Staff permissions." },
                                        { icon: "🔒", title: "Row Level Security", desc: "Per-user database policies." },
                                        { icon: "📧", title: "Security Alerts", desc: "Email on password changes." },
                                        { icon: "🕐", title: "Idle Timeout", desc: "Auto-logout after inactivity." },
                                        { icon: "📋", title: "Audit Trail", desc: "Every action logged with timestamp." },
                                    ].map((item, i) => (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, x: 8 }} whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl"
                                            style={{ background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                                            <span className="text-sm flex-shrink-0">{item.icon}</span>
                                            <div className="min-w-0">
                                                <div className="font-bold text-[0.72rem] text-slate-800 leading-tight">{item.title}</div>
                                                <div className="text-[0.65rem] leading-tight mt-0.5" style={{ color: "#94A3B8" }}>{item.desc}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Stack badges */}
                                <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5" style={{ borderColor: "#F1F5F9" }}>
                                    {[
                                        { label: "Next.js", color: "#0F172A" },
                                        { label: "Supabase", color: "#3ECF8E" },
                                        { label: "TypeScript", color: "#3178C6" },
                                    ].map(b => (
                                        <span key={b.label} className="text-[0.6rem] font-black px-2 py-0.5 rounded-full border"
                                            style={{ background: `${b.color}0d`, color: b.color, borderColor: `${b.color}22` }}>
                                            {b.label}
                                        </span>
                                    ))}
                                    <span className="text-[0.6rem] font-semibold ml-auto" style={{ color: "#94A3B8" }}>
                                        Lead: John Roel F.
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}