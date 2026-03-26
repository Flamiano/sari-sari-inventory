"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    ShieldAlert, Search, RefreshCw, CheckCircle,
    Clock, MessageSquare, Star, Filter,
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
    return <div style={{ background: "#e5e7eb", borderRadius: 6, animation: "skelPulse 1.5s ease-in-out infinite", ...style }} />;
}

function timeAgo(d: string) {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

const CAT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    general: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    bug_report: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
    feature_request: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    improvement: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
    praise: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    open: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    in_review: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    resolved: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    closed: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
};

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

            setItems(
                (feedbackRes.data ?? []).map((f: any) => ({
                    ...f,
                    user_email: emailMap[f.user_id] ?? "—",
                    store_name: nameMap[f.user_id] ?? "—",
                }))
            );
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

    return (
        <>
            <Toaster position="top-right" />
            <style>{`
        @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fb-card { background:white; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.05); margin-bottom:10px; animation:fadeUp .3s ease both; transition:box-shadow .15s; overflow:hidden; }
        .fb-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.07)}
        .fb-header { display:flex; gap:12px; padding:14px 16px; cursor:pointer; align-items:flex-start; }
        .fb-body { padding:0 16px 16px; border-top:1px solid #f3f4f6; }
        .status-select { padding:5px 8px; border:1px solid #e5e7eb; border-radius:7px; font-size:11px; font-family:inherit; color:#374151; background:white; cursor:pointer; outline:none; }
        .filter-sel { padding:6px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:11px; font-family:inherit; color:#374151; background:white; cursor:pointer; outline:none; }
      `}</style>

            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Feedback Hub</h1>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                        {openCount} open · {inReviewCount} in review · {resolvedCount} resolved
                    </p>
                </div>
                <button onClick={fetchData} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", border: "1px solid #e5e7eb", borderRadius: 9, fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
                    <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </button>
            </div>

            {/* KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
                {[
                    { label: "Total", value: items.length, icon: MessageSquare, color: "#374151", bg: "#f9fafb" },
                    { label: "Open", value: openCount, icon: ShieldAlert, color: openCount > 0 ? "#c2410c" : "#9ca3af", bg: openCount > 0 ? "#fff7ed" : "#f9fafb" },
                    { label: "In Review", value: inReviewCount, icon: Clock, color: "#2563eb", bg: "#eff6ff" },
                    { label: "Resolved", value: resolvedCount, icon: CheckCircle, color: "#16a34a", bg: "#f0fdf4" },
                ].map(c => {
                    const Icon = c.icon;
                    return (
                        <div key={c.label} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                                <Icon size={15} style={{ color: c.color }} />
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af", marginBottom: 2 }}>{c.label}</div>
                            {loading ? <Skeleton style={{ width: 40, height: 18 }} /> : <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>}
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                    <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feedback, stores…"
                        style={{ width: "100%", padding: "7px 12px 7px 30px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151", outline: "none", fontFamily: "inherit", background: "white" }}
                    />
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
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[0, 1, 2, 3].map(i => <Skeleton key={i} style={{ height: 80 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "48px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    No feedback found
                </div>
            ) : (
                filtered.map(f => {
                    const cat = CAT_STYLES[f.category] ?? CAT_STYLES.general;
                    const st = STATUS_STYLES[f.status] ?? STATUS_STYLES.closed;
                    const isOpen = expanded === f.id;
                    return (
                        <div className="fb-card" key={f.id}>
                            <div className="fb-header" onClick={() => setExpanded(isOpen ? null : f.id)}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
                                        <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: cat.bg, color: cat.text, border: `1px solid ${cat.border}`, textTransform: "uppercase", letterSpacing: ".06em" }}>
                                            {f.category.replace("_", " ")}
                                        </span>
                                        <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: st.bg, color: st.text, border: `1px solid ${st.border}`, textTransform: "uppercase", letterSpacing: ".06em" }}>
                                            {f.status.replace("_", " ")}
                                        </span>
                                        {f.rating && (
                                            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#d97706" }}>
                                                {"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{f.title}</div>
                                    <div style={{ fontSize: 10, color: "#9ca3af" }}>
                                        {f.store_name} · {f.user_email} · {timeAgo(f.created_at)}
                                    </div>
                                </div>
                                <div style={{ color: "#9ca3af", fontSize: 16, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</div>
                            </div>

                            {isOpen && (
                                <div className="fb-body" style={{ paddingTop: 14 }}>
                                    <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, marginBottom: 16, background: "#f9fafb", borderRadius: 8, padding: "12px 14px", border: "1px solid #f3f4f6" }}>
                                        {f.message}
                                    </p>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Update status:</span>
                                        <select
                                            className="status-select"
                                            value={f.status}
                                            disabled={updating === f.id}
                                            onChange={e => updateStatus(f.id, e.target.value)}
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_review">In Review</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                        {updating === f.id && <span style={{ fontSize: 11, color: "#9ca3af" }}>Saving…</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </>
    );
}