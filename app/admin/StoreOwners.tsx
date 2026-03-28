"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import {
    Store, Users, Package, TrendingUp, Search,
    RefreshCw, MapPin, ChevronDown, ChevronUp,
    Plus, Edit2, Trash2, Download, Eye, EyeOff,
    X, Check, AlertTriangle, FileText, Table2,
    Calendar, Clock, Shield, Mail, Phone,
    User, Lock, LogIn
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* ─── Types ──────────────────────────────────────────────── */
interface Owner {
    id: string;
    email: string;
    full_name: string | null;
    store_name: string | null;
    address: string | null;
    created_at?: string;
    last_sign_in_at?: string | null;
    revenue: number;
    txCount: number;
    staffCount: number;
    productCount: number;
    mealCount: number;
}

interface OwnerFormData {
    email: string;
    password: string;
    full_name: string;
    store_name: string;
    address: string;
}

/* ─── Helpers ─────────────────────────────────────────────── */
const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const phpShort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
};
const fmtDate = (d?: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};
const fmtDateTime = (d?: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
};

const AVATAR_COLORS = [
    ["#f59e0b", "#fef3c7"], ["#3b82f6", "#dbeafe"], ["#10b981", "#d1fae5"],
    ["#8b5cf6", "#ede9fe"], ["#ef4444", "#fee2e2"], ["#06b6d4", "#cffafe"],
];
function getAvatarColors(name: string) {
    const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

/* ─── Sub-components ─────────────────────────────────────── */
function SkeletonRow() {
    return (
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f1f5f9", flexShrink: 0 }} className="skel" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ width: "40%", height: 13, borderRadius: 6, background: "#f1f5f9" }} className="skel" />
                <div style={{ width: "25%", height: 10, borderRadius: 6, background: "#f1f5f9" }} className="skel" />
            </div>
            <div style={{ width: 80, height: 18, borderRadius: 6, background: "#f1f5f9" }} className="skel" />
        </div>
    );
}

/* ─── Modal ──────────────────────────────────────────────── */
function Modal({
    open, onClose, title, children
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
                    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 500, boxShadow: "0 24px 80px rgba(0,0,0,.18)", overflow: "hidden" }}
                    >
                        <div style={{ padding: "22px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, color: "#0f172a" }}>{title}</h2>
                            <button
                                onClick={onClose}
                                style={{ width: 32, height: 32, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div style={{ padding: "24px 28px" }}>{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ─── Form Field ─────────────────────────────────────────── */
function Field({
    label, icon: Icon, type = "text", value, onChange, placeholder, required, hint
}: {
    label: string; icon: any; type?: string; value: string;
    onChange: (v: string) => void; placeholder?: string; required?: boolean; hint?: string;
}) {
    const [show, setShow] = useState(false);
    const isPass = type === "password";
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#64748b", marginBottom: 6 }}>
                {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
            </label>
            <div style={{ position: "relative" }}>
                <Icon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input
                    type={isPass ? (show ? "text" : "password") : type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{
                        width: "100%", padding: "10px 36px 10px 36px", border: "1.5px solid #e2e8f0",
                        borderRadius: 12, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                        color: "#1e293b", outline: "none", background: "white",
                        boxSizing: "border-box", transition: "border-color .15s"
                    }}
                    onFocus={e => (e.target.style.borderColor = "#f59e0b")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                />
                {isPass && (
                    <button
                        type="button"
                        onClick={() => setShow(s => !s)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
                    >
                        {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                )}
            </div>
            {hint && <p style={{ fontSize: 10, color: "#94a3b8", margin: "4px 0 0", paddingLeft: 2 }}>{hint}</p>}
        </div>
    );
}

/* ─── Delete Confirm Modal ───────────────────────────────── */
function DeleteConfirm({ owner, onConfirm, onClose, loading }: {
    owner: Owner | null; onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
    return (
        <Modal open={!!owner} onClose={onClose} title="Delete Store Owner">
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <AlertTriangle size={24} style={{ color: "#ef4444" }} />
                </div>
                <p style={{ fontSize: 14, color: "#334155", margin: "0 0 6px", fontWeight: 600 }}>
                    Delete <span style={{ color: "#ef4444" }}>{owner?.store_name ?? owner?.email}</span>?
                </p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                    This will permanently remove the account, profile, and all associated data from Supabase Auth. This cannot be undone.
                </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={onClose} style={{ flex: 1, padding: "11px", border: "1.5px solid #e2e8f0", borderRadius: 12, background: "white", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    style={{ flex: 1, padding: "11px", border: "none", borderRadius: 12, background: loading ? "#fca5a5" : "#ef4444", fontSize: 13, fontWeight: 700, color: "white", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                    {loading ? "Deleting…" : "Yes, Delete"}
                </button>
            </div>
        </Modal>
    );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function StoreOwnersCRUD() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"revenue" | "name" | "staff" | "created" | "lastLogin">("revenue");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
    const [expanded, setExpanded] = useState<string | null>(null);

    // Modal states
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState<Owner | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);
    const [viewModal, setViewModal] = useState<Owner | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const BLANK: OwnerFormData = { email: "", password: "", full_name: "", store_name: "", address: "" };
    const [form, setForm] = useState<OwnerFormData>(BLANK);
    const [editForm, setEditForm] = useState<Partial<OwnerFormData & { id: string }>>({});

    /* ── Fetch ── */
    const fetchOwners = useCallback(async () => {
        setLoading(true);
        try {
            const [profilesRes, txnRes, staffRes, prodRes, mealRes] = await Promise.all([
                supabase.from("profiles").select("id, email, full_name, store_name, address, updated_at").eq("role", "owner"),
                supabase.from("sales_transactions").select("user_id, total_amount"),
                supabase.from("staff_members").select("owner_id").eq("status", "active"),
                supabase.from("products").select("user_id"),
                supabase.from("prepared_meals").select("user_id"),
            ]);

            // Fetch auth users metadata via admin API (last_sign_in_at, created_at)
            // We'll call the Supabase admin.listUsers via a server action or use the service role
            // For client-side, we store created_at / last_sign_in_at in a separate call
            // Note: requires service role key on a server action — here we use profiles.updated_at as fallback
            // and expect you to expose an API route /api/admin/users that returns auth user metadata

            let authMetaMap: Record<string, { created_at: string; last_sign_in_at: string | null }> = {};
            try {
                const res = await fetch("/api/admin/users");
                if (res.ok) {
                    const data: { id: string; created_at: string; last_sign_in_at: string | null }[] = await res.json();
                    data.forEach(u => { authMetaMap[u.id] = { created_at: u.created_at, last_sign_in_at: u.last_sign_in_at }; });
                }
            } catch { /* graceful fallback */ }

            const profiles = profilesRes.data ?? [];
            const txns = txnRes.data ?? [];
            const staff = staffRes.data ?? [];
            const prods = prodRes.data ?? [];
            const meals = mealRes.data ?? [];

            const revMap: Record<string, { rev: number; cnt: number }> = {};
            txns.forEach((t: any) => {
                if (!revMap[t.user_id]) revMap[t.user_id] = { rev: 0, cnt: 0 };
                revMap[t.user_id].rev += Number(t.total_amount ?? 0);
                revMap[t.user_id].cnt += 1;
            });
            const staffMap: Record<string, number> = {};
            staff.forEach((s: any) => { staffMap[s.owner_id] = (staffMap[s.owner_id] ?? 0) + 1; });
            const prodMap: Record<string, number> = {};
            prods.forEach((p: any) => { prodMap[p.user_id] = (prodMap[p.user_id] ?? 0) + 1; });
            const mealMap: Record<string, number> = {};
            meals.forEach((m: any) => { mealMap[m.user_id] = (mealMap[m.user_id] ?? 0) + 1; });

            setOwners(profiles.map((p: any) => ({
                id: p.id,
                email: p.email,
                full_name: p.full_name,
                store_name: p.store_name,
                address: p.address,
                created_at: authMetaMap[p.id]?.created_at ?? p.updated_at,
                last_sign_in_at: authMetaMap[p.id]?.last_sign_in_at ?? null,
                revenue: revMap[p.id]?.rev ?? 0,
                txCount: revMap[p.id]?.cnt ?? 0,
                staffCount: staffMap[p.id] ?? 0,
                productCount: prodMap[p.id] ?? 0,
                mealCount: mealMap[p.id] ?? 0,
            })));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOwners(); }, [fetchOwners]);

    /* ── Create ── */
    const handleCreate = async () => {
        if (!form.email || !form.password) return toast.error("Email and password are required.");
        setSubmitting(true);
        try {
            // Call server-side API to create user with admin rights (bypasses email verification)
            const res = await fetch("/api/admin/create-owner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    full_name: form.full_name,
                    store_name: form.store_name,
                    address: form.address,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Failed to create owner");
            toast.success(`Store owner "${form.store_name || form.email}" created!`);
            setAddModal(false);
            setForm(BLANK);
            fetchOwners();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Update ── */
    const handleUpdate = async () => {
        if (!editModal) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from("profiles").update({
                full_name: editForm.full_name,
                store_name: editForm.store_name,
                address: editForm.address,
            }).eq("id", editModal.id);
            if (error) throw error;

            // If password provided, update via admin API
            if (editForm.password) {
                const res = await fetch("/api/admin/update-owner", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editModal.id, password: editForm.password }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Failed to update password");
            }

            toast.success("Owner updated successfully.");
            setEditModal(null);
            fetchOwners();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Delete ── */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch("/api/admin/delete-owner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deleteTarget.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Failed to delete owner");
            toast.success(`"${deleteTarget.store_name ?? deleteTarget.email}" deleted.`);
            setDeleteTarget(null);
            fetchOwners();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setDeleting(false);
        }
    };

    /* ── Export PDF ── */
    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Store Owners Report", 14, 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, 26);
        doc.text(`Total Stores: ${owners.length}`, 14, 32);
        autoTable(doc, {
            startY: 40,
            head: [["Store Name", "Owner", "Email", "Revenue", "Orders", "Staff", "SKUs", "Registered", "Last Sign In"]],
            body: filtered.map(o => [
                o.store_name ?? "—",
                o.full_name ?? "—",
                o.email,
                php(o.revenue),
                o.txCount.toString(),
                o.staffCount.toString(),
                (o.productCount + o.mealCount).toString(),
                fmtDate(o.created_at),
                fmtDateTime(o.last_sign_in_at),
            ]),
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [255, 251, 235] },
        });
        doc.save("store-owners.pdf");
        toast.success("PDF exported!");
    };

    /* ── Export Excel ── */
    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtered.map(o => ({
            "Store Name": o.store_name ?? "—",
            "Owner Name": o.full_name ?? "—",
            "Email": o.email,
            "Address": o.address ?? "—",
            "Revenue (₱)": o.revenue,
            "Transactions": o.txCount,
            "Active Staff": o.staffCount,
            "Products": o.productCount,
            "Meals": o.mealCount,
            "Total SKUs": o.productCount + o.mealCount,
            "Registered": fmtDate(o.created_at),
            "Last Sign In": fmtDateTime(o.last_sign_in_at),
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Store Owners");
        XLSX.writeFile(wb, "store-owners.xlsx");
        toast.success("Excel exported!");
    };

    /* ── Sort / Filter ── */
    const toggleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortDir("desc"); }
    };

    const filtered = owners
        .filter(o =>
            (o.store_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (o.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (o.full_name ?? "").toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === "name") return sortDir === "asc"
                ? (a.store_name ?? "").localeCompare(b.store_name ?? "")
                : (b.store_name ?? "").localeCompare(a.store_name ?? "");
            if (sortBy === "created") {
                const av = new Date(a.created_at ?? 0).getTime();
                const bv = new Date(b.created_at ?? 0).getTime();
                return sortDir === "asc" ? av - bv : bv - av;
            }
            if (sortBy === "lastLogin") {
                const av = new Date(a.last_sign_in_at ?? 0).getTime();
                const bv = new Date(b.last_sign_in_at ?? 0).getTime();
                return sortDir === "asc" ? av - bv : bv - av;
            }
            const av = sortBy === "revenue" ? a.revenue : a.staffCount;
            const bv = sortBy === "revenue" ? b.revenue : b.staffCount;
            return sortDir === "asc" ? av - bv : bv - av;
        });

    const totalRevenue = owners.reduce((s, o) => s + o.revenue, 0);
    const totalStaff = owners.reduce((s, o) => s + o.staffCount, 0);
    const totalSKUs = owners.reduce((s, o) => s + o.productCount + o.mealCount, 0);

    const summaryCards = [
        { label: "Stores", value: owners.length, icon: Store, accent: "#f59e0b", light: "#fef3c7" },
        { label: "Revenue", value: phpShort(totalRevenue), icon: TrendingUp, accent: "#10b981", light: "#d1fae5" },
        { label: "Staff", value: totalStaff, icon: Users, accent: "#3b82f6", light: "#dbeafe" },
        { label: "Total SKUs", value: totalSKUs, icon: Package, accent: "#8b5cf6", light: "#ede9fe" },
    ];

    /* ── Render ── */
    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f8fafc", padding: "32px 24px" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        .skel { animation: skelPulse 1.8s ease-in-out infinite; }
        @keyframes skelPulse { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sort-chip { padding: 6px 14px; border: 1.5px solid #e2e8f0; border-radius: 999px; background: white; font-size: 11px; font-weight: 600; cursor: pointer; color: #64748b; transition: all .15s; font-family: 'DM Sans', sans-serif; letter-spacing: .02em; }
        .sort-chip:hover { border-color: #cbd5e1; background: #f8fafc; }
        .sort-chip.active { border-color: #f59e0b; background: #fef3c7; color: #92400e; }
        .owner-row { padding: 14px 24px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background .12s; display: grid; grid-template-columns: 1.4fr 1.2fr 100px 80px 110px 100px 90px 90px 80px; gap: 12px; align-items: center; }
        .owner-row:hover { background: #fafbff; }
        .owner-row.active-row { background: #fffbeb; }
        .search-input { width: 100%; padding: 10px 14px 10px 38px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #1e293b; outline: none; background: white; transition: border-color .15s; box-sizing: border-box; }
        .search-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.1); }
        .stat-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px 12px; background: white; border: 1.5px solid #f1f5f9; border-radius: 14px; gap: 4px; }
        .badge { padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .04em; }
        .action-btn { width: 30px; height: 30px; border-radius: 9px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
        .action-btn:hover { border-color: #cbd5e1; background: #f8fafc; }
        .action-btn.danger:hover { border-color: #fca5a5; background: #fee2e2; color: #ef4444; }
        .action-btn.primary:hover { border-color: #93c5fd; background: #dbeafe; color: #1d4ed8; }
        .action-btn.warn:hover { border-color: #fcd34d; background: #fef3c7; color: #92400e; }
        .export-btn { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: white; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s; }
        .export-btn:hover { border-color: #cbd5e1; background: #f8fafc; }
        .add-btn { display: flex; align-items: center; gap: 7px; padding: 9px 18px; border: none; border-radius: 12px; background: #f59e0b; font-size: 12px; font-weight: 700; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s; box-shadow: 0 2px 12px rgba(245,158,11,.3); }
        .add-btn:hover { background: #d97706; box-shadow: 0 4px 20px rgba(245,158,11,.4); }
        .submit-btn { width: 100%; padding: 12px; border: none; border-radius: 12px; background: #f59e0b; font-size: 13px; font-weight: 700; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s; margin-top: 8px; }
        .submit-btn:hover { background: #d97706; }
        .submit-btn:disabled { background: #fcd34d; cursor: not-allowed; }
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Shield size={12} style={{ color: "#f59e0b" }} />
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase", letterSpacing: ".12em", margin: 0 }}>Super Admin · Platform Overview</p>
                    </div>
                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, fontWeight: 400, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>Store Owners</h1>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                        {owners.length} registered · {phpShort(totalRevenue)} platform revenue
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="export-btn" onClick={exportPDF}><FileText size={13} />Export PDF</button>
                    <button className="export-btn" onClick={exportExcel}><Table2 size={13} />Export Excel</button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={fetchOwners} disabled={loading} className="export-btn">
                        <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setForm(BLANK); setAddModal(true); }} className="add-btn">
                        <Plus size={14} />
                        Add Owner
                    </motion.button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginBottom: 24 }}>
                {summaryCards.map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 18, padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,.04)" }}>
                            <div style={{ width: 38, height: 38, borderRadius: 11, background: c.light, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                                <Icon size={17} style={{ color: c.accent }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#94a3b8", marginBottom: 4 }}>{c.label}</div>
                            {loading
                                ? <div style={{ width: 64, height: 22, borderRadius: 7, background: "#f1f5f9" }} className="skel" />
                                : <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
                            }
                        </motion.div>
                    );
                })}
            </div>

            {/* Table Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,.05)", overflow: "hidden" }}>

                {/* Toolbar */}
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                        <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stores, owners, emails…" />
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Sort</span>
                        {(["revenue", "name", "staff", "created", "lastLogin"] as const).map(col => (
                            <button key={col} className={`sort-chip ${sortBy === col ? "active" : ""}`} onClick={() => toggleSort(col)}>
                                {col === "lastLogin" ? "Last Login" : col === "created" ? "Registered" : col.charAt(0).toUpperCase() + col.slice(1)}
                                {sortBy === col && (sortDir === "asc" ? <ChevronUp size={10} style={{ marginLeft: 3, display: "inline" }} /> : <ChevronDown size={10} style={{ marginLeft: 3, display: "inline" }} />)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column Headers */}
                <div style={{ padding: "10px 24px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1.4fr 1.2fr 100px 80px 110px 100px 90px 90px 80px", gap: 12, background: "#fafbff" }}>
                    {["Store", "Owner / Email", "Revenue", "Orders", "Staff · SKUs", "Registered", "Last Sign In", "", "Actions"].map((h, i) => (
                        <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8" }}>{h}</div>
                    ))}
                </div>

                {/* Rows */}
                {loading ? (
                    <div>{[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: "60px 24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No stores found</div>
                ) : (
                    filtered.map(o => {
                        const initials = (o.store_name ?? o.email ?? "?").charAt(0).toUpperCase();
                        const [accent, light] = getAvatarColors(initials);
                        const isExpanded = expanded === o.id;
                        return (
                            <div key={o.id}>
                                <div
                                    className={`owner-row ${isExpanded ? "active-row" : ""}`}
                                    style={{ borderLeft: isExpanded ? "3px solid #f59e0b" : "3px solid transparent" }}
                                >
                                    {/* Store */}
                                    <div
                                        style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, cursor: "pointer" }}
                                        onClick={() => setExpanded(isExpanded ? null : o.id)}
                                    >
                                        <div style={{ width: 36, height: 36, borderRadius: 11, background: light, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800, color: accent }}>
                                            {initials}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.store_name ?? "—"}</div>
                                        </div>
                                    </div>

                                    {/* Owner */}
                                    <div style={{ minWidth: 0, cursor: "pointer" }} onClick={() => setExpanded(isExpanded ? null : o.id)}>
                                        <div style={{ fontSize: 12, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{o.full_name ?? "—"}</div>
                                        <div style={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{o.email}</div>
                                    </div>

                                    {/* Revenue */}
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{phpShort(o.revenue)}</div>

                                    {/* Orders */}
                                    <div style={{ fontSize: 12, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{o.txCount.toLocaleString()}</div>

                                    {/* Staff + SKUs */}
                                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                        <span className="badge" style={{ background: "#d1fae5", color: "#065f46" }}>{o.staffCount} staff</span>
                                        <span className="badge" style={{ background: "#ede9fe", color: "#4c1d95" }}>{o.productCount + o.mealCount} SKU</span>
                                    </div>

                                    {/* Registered */}
                                    <div style={{ fontSize: 11, color: "#64748b" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <Calendar size={10} style={{ color: "#94a3b8" }} />
                                            {fmtDate(o.created_at)}
                                        </div>
                                    </div>

                                    {/* Last Sign In */}
                                    <div style={{ fontSize: 11, color: o.last_sign_in_at ? "#64748b" : "#cbd5e1" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <LogIn size={10} style={{ color: o.last_sign_in_at ? "#94a3b8" : "#cbd5e1" }} />
                                            {o.last_sign_in_at ? fmtDate(o.last_sign_in_at) : "Never"}
                                        </div>
                                    </div>

                                    {/* Expand toggle */}
                                    <div style={{ color: "#94a3b8", cursor: "pointer" }} onClick={() => setExpanded(isExpanded ? null : o.id)}>
                                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                                        <button
                                            className="action-btn primary"
                                            title="View Details"
                                            onClick={() => setViewModal(o)}
                                        >
                                            <Eye size={13} style={{ color: "#3b82f6" }} />
                                        </button>
                                        <button
                                            className="action-btn warn"
                                            title="Edit"
                                            onClick={() => { setEditModal(o); setEditForm({ id: o.id, full_name: o.full_name ?? "", store_name: o.store_name ?? "", address: o.address ?? "", password: "" }); }}
                                        >
                                            <Edit2 size={13} style={{ color: "#f59e0b" }} />
                                        </button>
                                        <button
                                            className="action-btn danger"
                                            title="Delete"
                                            onClick={() => setDeleteTarget(o)}
                                        >
                                            <Trash2 size={13} style={{ color: "#ef4444" }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded row */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            key="expand"
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }}
                                            style={{ overflow: "hidden", background: "#fffbeb", borderBottom: "1px solid #fef3c7" }}
                                        >
                                            <div style={{ padding: "18px 24px 20px" }}>
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
                                                    {[
                                                        { label: "Revenue", value: php(o.revenue), color: "#92400e", bg: "#fef3c7" },
                                                        { label: "Transactions", value: o.txCount.toLocaleString(), color: "#1d4ed8", bg: "#dbeafe" },
                                                        { label: "Active Staff", value: o.staffCount, color: "#065f46", bg: "#d1fae5" },
                                                        { label: "Products", value: o.productCount, color: "#4c1d95", bg: "#ede9fe" },
                                                        { label: "Meals", value: o.mealCount, color: "#164e63", bg: "#cffafe" },
                                                    ].map(s => (
                                                        <div key={s.label} className="stat-tile">
                                                            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                                                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8" }}>{s.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                                                    {o.address && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#78716c" }}>
                                                            <MapPin size={12} style={{ color: "#f59e0b" }} />
                                                            {o.address}
                                                        </div>
                                                    )}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#78716c" }}>
                                                        <Calendar size={12} style={{ color: "#94a3b8" }} />
                                                        Registered {fmtDate(o.created_at)}
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#78716c" }}>
                                                        <Clock size={12} style={{ color: "#94a3b8" }} />
                                                        Last login: {fmtDateTime(o.last_sign_in_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}

                {!loading && filtered.length > 0 && (
                    <div style={{ padding: "12px 24px", borderTop: "1px solid #f1f5f9", background: "#fafbff", fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                        Showing {filtered.length} of {owners.length} stores
                    </div>
                )}
            </motion.div>

            {/* ── Add Modal ── */}
            <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Store Owner">
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 20px" }}>
                    Account will be created immediately — no email verification required.
                </p>
                <Field label="Email" icon={Mail} type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="owner@store.com" required />
                <Field label="Password" icon={Lock} type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Min. 8 characters" required hint="Must be at least 8 characters." />
                <Field label="Full Name" icon={User} value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Juan dela Cruz" />
                <Field label="Store Name" icon={Store} value={form.store_name} onChange={v => setForm(f => ({ ...f, store_name: v }))} placeholder="Dela Cruz Sari-sari Store" />
                <Field label="Address" icon={MapPin} value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Brgy. San Jose, Quezon City" />
                <button className="submit-btn" onClick={handleCreate} disabled={submitting}>
                    {submitting ? "Creating…" : "Create Store Owner"}
                </button>
            </Modal>

            {/* ── Edit Modal ── */}
            <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Store Owner">
                {editModal && (
                    <>
                        <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
                            <Mail size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#64748b" }}>{editModal.email}</span>
                        </div>
                        <Field label="Full Name" icon={User} value={editForm.full_name ?? ""} onChange={v => setEditForm(f => ({ ...f, full_name: v }))} placeholder="Juan dela Cruz" />
                        <Field label="Store Name" icon={Store} value={editForm.store_name ?? ""} onChange={v => setEditForm(f => ({ ...f, store_name: v }))} placeholder="Store name" />
                        <Field label="Address" icon={MapPin} value={editForm.address ?? ""} onChange={v => setEditForm(f => ({ ...f, address: v }))} placeholder="Address" />
                        <Field label="New Password" icon={Lock} type="password" value={editForm.password ?? ""} onChange={v => setEditForm(f => ({ ...f, password: v }))} placeholder="Leave blank to keep current" hint="Only fill if you want to reset the password." />
                        <button className="submit-btn" onClick={handleUpdate} disabled={submitting}>
                            {submitting ? "Saving…" : "Save Changes"}
                        </button>
                    </>
                )}
            </Modal>

            {/* ── View Modal ── */}
            <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Owner Details">
                {viewModal && (() => {
                    const o = viewModal;
                    const initials = (o.store_name ?? o.email ?? "?").charAt(0).toUpperCase();
                    const [accent, light] = getAvatarColors(initials);
                    return (
                        <div>
                            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 22 }}>
                                <div style={{ width: 52, height: 52, borderRadius: 16, background: light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: accent, flexShrink: 0 }}>{initials}</div>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{o.store_name ?? "—"}</div>
                                    <div style={{ fontSize: 12, color: "#64748b" }}>{o.full_name ?? "—"}</div>
                                </div>
                            </div>
                            {[
                                { icon: Mail, label: "Email", value: o.email },
                                { icon: MapPin, label: "Address", value: o.address ?? "—" },
                                { icon: Calendar, label: "Registered", value: fmtDate(o.created_at) },
                                { icon: LogIn, label: "Last Sign In", value: fmtDateTime(o.last_sign_in_at) },
                                { icon: TrendingUp, label: "Revenue", value: php(o.revenue) },
                                { icon: Package, label: "Orders", value: o.txCount.toLocaleString() },
                                { icon: Users, label: "Active Staff", value: o.staffCount.toString() },
                                { icon: Package, label: "Total SKUs", value: (o.productCount + o.mealCount).toString() },
                            ].map(r => {
                                const Icon = r.icon;
                                return (
                                    <div key={r.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Icon size={13} style={{ color: "#94a3b8" }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#94a3b8", marginBottom: 2 }}>{r.label}</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{r.value}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </Modal>

            {/* ── Delete Modal ── */}
            <DeleteConfirm owner={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} loading={deleting} />
        </div>
    );
}