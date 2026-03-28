"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import {
    ShieldAlert, Search, RefreshCw, CheckCircle,
    Clock, MessageSquare, Star,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface FeedbackItem {
    id: string;
    title: string;
    message: string;
    category: string;
    rating: number | null;
    status: string;
    created_at: string;
    user_id: string;
    user_email: string;
    store_name: string;
}

function Skeleton({ style }: { style?: React.CSSProperties }) {
    return <div style={{ background: "#f1f5f9", borderRadius: 7, animation: "skelPulse 1.8s ease-in-out infinite", ...style }} />;
}

function timeAgo(d: string) {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

const CAT = {
    general: { bg: "#dbeafe", text: "#1d4ed8", label: "General" },
    bug_report: { bg: "#fecaca", text: "#b91c1c", label: "Bug Report" },
    feature_request: { bg: "#d1fae5", text: "#065f46", label: "Feature Request" },
    improvement: { bg: "#fde68a", text: "#92400e", label: "Improvement" },
    praise: { bg: "#ddd6fe", text: "#4c1d95", label: "Praise" },
};

const STATUS = {
    open: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", dot: "#f97316" },
    in_review: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd", dot: "#3b82f6" },
    resolved: { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7", dot: "#10b981" },
    closed: { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0", dot: "#94a3b8" },
};

function StarRating({ rating }: { rating: number }) {
    return (
        <span style={{ display: "inline-flex", gap: 1 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ fontSize: 12, color: i <= rating ? "#f59e0b" : "#e2e8f0" }}>★</span>
            ))}
        </span>
    );
}

export default function FeedbackHub() {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterCat, setFilterCat] = useState("all");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [profilesRes, feedbackRes] = await Promise.all([
                supabase.from("profiles").select("id, email, store_name").eq("role", "owner"),
                supabase.from("feedback").select("*").order("created_at", { ascending: false }),
            ]);
            const profiles = profilesRes.data ?? [];
            const emailMap: Record<string, string> = {};
            const nameMap: Record<string, string> = {};
            profiles.forEach((p: any) => { emailMap[p.id] = p.email ?? "—"; nameMap[p.id] = p.store_name ?? p.email; });
            setItems((feedbackRes.data ?? []).map((f: any) => ({
                ...f,
                user_email: emailMap[f.user_id] ?? "—",
                store_name: nameMap[f.user_id] ?? "—",
            })));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const updateStatus = async (id: string, newStatus: string) => {
        setUpdating(id);
        const { error } = await supabase
            .from("feedback")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", id);
        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success("Status updated");
            setItems(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
        }
        setUpdating(null);
    };

    const filtered = items.filter(f => {
        if (filterStatus !== "all" && f.status !== filterStatus) return false;
        if (filterCat !== "all" && f.category !== filterCat) return false;
        const q = search.toLowerCase();
        return f.title.toLowerCase().includes(q) || f.user_email.toLowerCase().includes(q) || f.store_name.toLowerCase().includes(q);
    });

    const openCount = items.filter(f => f.status === "open").length;
    const inReviewCount = items.filter(f => f.status === "in_review").length;
    const resolvedCount = items.filter(f => f.status === "resolved").length;

    const kpiCards = [
        { label: "Total", value: items.length, icon: MessageSquare, accent: "#475569", light: "#f1f5f9" },
        { label: "Open", value: openCount, icon: ShieldAlert, accent: openCount > 0 ? "#c2410c" : "#94a3b8", light: openCount > 0 ? "#fff7ed" : "#f8fafc" },
        { label: "In Review", value: inReviewCount, icon: Clock, accent: "#1d4ed8", light: "#dbeafe" },
        { label: "Resolved", value: resolvedCount, icon: CheckCircle, accent: "#065f46", light: "#d1fae5" },
    ];

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f8fafc", padding: "32px 24px" }}>
            <Toaster position="top-right" toastOptions={{ style: { fontFamily: "'DM Sans', sans-serif", fontSize: 13 } }} />
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .search-inp { width:100%; padding:10px 14px 10px 38px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1e293b; outline:none; background:white; transition:border-color .15s; }
        .search-inp:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.1); }
        .filter-sel { padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#334155; background:white; cursor:pointer; outline:none; font-weight:500; }
        .filter-sel:focus { border-color:#8b5cf6; }
        .status-sel { padding:6px 10px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:11px; font-family:'DM Sans',sans-serif; color:#334155; background:white; cursor:pointer; outline:none; font-weight:600; }
        .status-sel:focus { border-color:#8b5cf6; }
        .fb-card { background:white; border:1.5px solid #f1f5f9; border-radius:18px; box-shadow:0 2px 12px rgba(0,0,0,.04); margin-bottom:12px; overflow:hidden; transition:box-shadow .15s, border-color .15s; }
        .fb-card:hover { box-shadow:0 6px 24px rgba(0,0,0,.08); border-color:#e2e8f0; }
        .fb-card.expanded { border-color:#8b5cf6; }
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4 }}>Support</p>
                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, fontWeight: 400, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>Feedback Hub</h1>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                        {openCount} open · {inReviewCount} in review · {resolvedCount} resolved
                    </p>
                </div>
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={fetchData}
                    disabled={loading}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "white", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                >
                    <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </motion.button>
            </div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 14, marginBottom: 24 }}>
                {kpiCards.map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <motion.div
                            key={c.label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.4 }}
                            style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 18, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,.04)" }}
                        >
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: c.light, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                                <Icon size={16} style={{ color: c.accent }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#94a3b8", marginBottom: 4 }}>{c.label}</div>
                            {loading
                                ? <div style={{ width: 40, height: 22, borderRadius: 6, background: "#f1f5f9", animation: "skelPulse 1.8s ease-in-out infinite" }} />
                                : <div style={{ fontSize: 24, fontWeight: 800, color: c.accent }}>{c.value}</div>
                            }
                        </motion.div>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input className="search-inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feedback, stores, emails…" />
                </div>
                <select className="filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
                <select className="filter-sel" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="all">All Categories</option>
                    <option value="general">General</option>
                    <option value="bug_report">Bug Report</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="improvement">Improvement</option>
                    <option value="praise">Praise</option>
                </select>
            </div>

            {/* Feedback list */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[0, 1, 2, 3].map(i => <Skeleton key={i} style={{ height: 88, borderRadius: 18 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 18, padding: "60px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    No feedback found
                </div>
            ) : (
                filtered.map((f, idx) => {
                    const cat = (CAT as any)[f.category] ?? CAT.general;
                    const st = (STATUS as any)[f.status] ?? STATUS.closed;
                    const isOpen = expanded === f.id;

                    return (
                        <motion.div
                            key={f.id}
                            className={`fb-card ${isOpen ? "expanded" : ""}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                        >
                            {/* Header row */}
                            <div
                                style={{ padding: "16px 20px", cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }}
                                onClick={() => setExpanded(isOpen ? null : f.id)}
                            >
                                {/* Status dot */}
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.dot, flexShrink: 0, marginTop: 5 }} />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Badges row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 7 }}>
                                        <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: cat.bg, color: cat.text, letterSpacing: ".04em", textTransform: "uppercase" }}>
                                            {cat.label}
                                        </span>
                                        <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: st.bg, color: st.text, border: `1px solid ${st.border}`, textTransform: "uppercase", letterSpacing: ".04em" }}>
                                            {f.status.replace("_", " ")}
                                        </span>
                                        {f.rating && <StarRating rating={f.rating} />}
                                    </div>

                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4, lineHeight: 1.3 }}>{f.title}</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                                        <span style={{ color: "#64748b", fontWeight: 600 }}>{f.store_name}</span>
                                        {" · "}{f.user_email}{" · "}{timeAgo(f.created_at)}
                                    </div>
                                </div>

                                <div style={{ color: isOpen ? "#8b5cf6" : "#94a3b8", flexShrink: 0, fontSize: 18, lineHeight: 1, marginTop: 2 }}>
                                    {isOpen ? "▲" : "▼"}
                                </div>
                            </div>

                            {/* Expanded body */}
                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        key="fbody"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.22, ease: "easeInOut" }}
                                        style={{ overflow: "hidden" }}
                                    >
                                        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f1f5f9" }}>
                                            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.75, margin: "16px 0", background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #f1f5f9" }}>
                                                {f.message}
                                            </p>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Update status</span>
                                                <select
                                                    className="status-sel"
                                                    value={f.status}
                                                    disabled={updating === f.id}
                                                    onChange={e => updateStatus(f.id, e.target.value)}
                                                >
                                                    <option value="open">Open</option>
                                                    <option value="in_review">In Review</option>
                                                    <option value="resolved">Resolved</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                                {updating === f.id && (
                                                    <motion.span
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 500 }}
                                                    >
                                                        Saving…
                                                    </motion.span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}