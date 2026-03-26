"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    Store, Users, Package, TrendingUp, Search,
    RefreshCw, Mail, MapPin, Calendar, Phone,
    ChevronDown, ChevronUp, ArrowUpRight,
} from "lucide-react";

interface Owner {
    id: string;
    email: string;
    full_name: string | null;
    store_name: string | null;
    address: string | null;
    created_at?: string;
    revenue: number;
    txCount: number;
    staffCount: number;
    productCount: number;
    mealCount: number;
}

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const phpShort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
};

function Skeleton({ style }: { style?: React.CSSProperties }) {
    return <div style={{ background: "#e5e7eb", borderRadius: 6, animation: "skelPulse 1.5s ease-in-out infinite", ...style }} />;
}

export default function StoreOwners() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"revenue" | "name" | "staff">("revenue");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
    const [expanded, setExpanded] = useState<string | null>(null);

    const fetchOwners = useCallback(async () => {
        setLoading(true);
        try {
            const [profilesRes, txnRes, staffRes, prodRes, mealRes] = await Promise.all([
                supabase.from("profiles").select("id, email, full_name, store_name, address").eq("role", "owner"),
                supabase.from("sales_transactions").select("user_id, total_amount"),
                supabase.from("staff_members").select("owner_id").eq("status", "active"),
                supabase.from("products").select("user_id"),
                supabase.from("prepared_meals").select("user_id"),
            ]);

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

            const built: Owner[] = profiles.map((p: any) => ({
                id: p.id,
                email: p.email,
                full_name: p.full_name,
                store_name: p.store_name,
                address: p.address,
                revenue: revMap[p.id]?.rev ?? 0,
                txCount: revMap[p.id]?.cnt ?? 0,
                staffCount: staffMap[p.id] ?? 0,
                productCount: prodMap[p.id] ?? 0,
                mealCount: mealMap[p.id] ?? 0,
            }));

            setOwners(built);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOwners(); }, [fetchOwners]);

    const toggleSort = (col: "revenue" | "name" | "staff") => {
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
            let av = 0, bv = 0;
            if (sortBy === "revenue") { av = a.revenue; bv = b.revenue; }
            else if (sortBy === "name") { return sortDir === "asc" ? (a.store_name ?? "").localeCompare(b.store_name ?? "") : (b.store_name ?? "").localeCompare(a.store_name ?? ""); }
            else if (sortBy === "staff") { av = a.staffCount; bv = b.staffCount; }
            return sortDir === "asc" ? av - bv : bv - av;
        });

    const totalRevenue = owners.reduce((s, o) => s + o.revenue, 0);

    return (
        <>
            <style>{`
        @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .so-card { background:white; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.05); overflow:hidden; animation:fadeUp .3s ease both; }
        .so-row { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background .12s; }
        .so-row:last-child{border-bottom:none}
        .so-row:hover{background:#fafafa}
        .so-row.open{background:#eff6ff; border-left:3px solid #2563eb;}
        .so-expand { padding:16px 20px 20px; background:#fafafa; border-top:1px solid #e5e7eb; animation:fadeUp .2s ease both; }
        .stat-pill { display:flex; flex-direction:column; align-items:center; padding:10px 14px; background:white; border:1px solid #e5e7eb; border-radius:8px; }
        .sort-btn { display:flex; align-items:center; gap:4px; padding:6px 12px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-size:11px; font-weight:600; cursor:pointer; color:#374151; transition:all .12s; }
        .sort-btn:hover{background:#f9fafb; border-color:#d1d5db}
        .sort-btn.active{background:#eff6ff; border-color:#bfdbfe; color:#2563eb}
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Store Owners</h1>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                        {owners.length} registered stores · {phpShort(totalRevenue)} all-time platform revenue
                    </p>
                </div>
                <button onClick={fetchOwners} disabled={loading} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    background: "white", border: "1px solid #e5e7eb", borderRadius: 9,
                    fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer",
                }}>
                    <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
                {[
                    { label: "Total Stores", value: owners.length, icon: Store, color: "#2563eb", bg: "#eff6ff" },
                    { label: "Total Revenue", value: phpShort(totalRevenue), icon: TrendingUp, color: "#d97706", bg: "#fffbeb" },
                    { label: "Total Staff", value: owners.reduce((s, o) => s + o.staffCount, 0), icon: Users, color: "#16a34a", bg: "#f0fdf4" },
                    { label: "Total SKUs", value: owners.reduce((s, o) => s + o.productCount + o.mealCount, 0), icon: Package, color: "#7c3aed", bg: "#f5f3ff" },
                ].map(c => {
                    const Icon = c.icon;
                    return (
                        <div key={c.label} className="so-card" style={{ padding: "16px 18px" }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                                <Icon size={16} style={{ color: c.color }} />
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af", marginBottom: 3 }}>{c.label}</div>
                            {loading ? <Skeleton style={{ width: 60, height: 20 }} /> : <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{c.value}</div>}
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            <div className="so-card">
                {/* Toolbar */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search stores, emails…"
                            style={{
                                width: "100%", padding: "7px 12px 7px 30px",
                                border: "1px solid #e5e7eb", borderRadius: 8,
                                fontSize: 12, color: "#374151", outline: "none",
                                fontFamily: "inherit",
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                        <span style={{ fontSize: 11, color: "#9ca3af", alignSelf: "center", marginRight: 4 }}>Sort:</span>
                        {(["revenue", "name", "staff"] as const).map(col => (
                            <button key={col} className={`sort-btn ${sortBy === col ? "active" : ""}`} onClick={() => toggleSort(col)}>
                                {col.charAt(0).toUpperCase() + col.slice(1)}
                                {sortBy === col && (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column headers */}
                <div style={{ padding: "8px 20px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px 110px 32px", gap: 12, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af" }}>
                    <span>Store</span><span>Owner / Email</span><span>Revenue</span><span>Orders</span><span>Staff · SKUs</span><span />
                </div>

                {loading ? (
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} style={{ height: 44 }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                        No stores found
                    </div>
                ) : (
                    filtered.map((o, idx) => (
                        <div key={o.id}>
                            <div
                                className={`so-row ${expanded === o.id ? "open" : ""}`}
                                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px 110px 32px", gap: 12, borderLeft: expanded === o.id ? "3px solid #2563eb" : "3px solid transparent" }}
                                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 800, color: "#2563eb" }}>
                                        {(o.store_name ?? o.email ?? "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.store_name ?? "—"}</div>
                                    </div>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.full_name ?? "—"}</div>
                                    <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.email}</div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", alignSelf: "center" }}>{phpShort(o.revenue)}</div>
                                <div style={{ fontSize: 12, color: "#374151", alignSelf: "center" }}>{o.txCount.toLocaleString()}</div>
                                <div style={{ fontSize: 11, color: "#374151", alignSelf: "center" }}>
                                    <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "2px 6px", borderRadius: 5, fontSize: 10, fontWeight: 600, marginRight: 5 }}>{o.staffCount} staff</span>
                                    <span style={{ background: "#f5f3ff", color: "#7c3aed", padding: "2px 6px", borderRadius: 5, fontSize: 10, fontWeight: 600 }}>{o.productCount + o.mealCount} SKU</span>
                                </div>
                                <div style={{ alignSelf: "center", color: "#9ca3af" }}>
                                    {expanded === o.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </div>

                            {expanded === o.id && (
                                <div className="so-expand">
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 14 }}>
                                        {[
                                            { label: "All-Time Revenue", value: php(o.revenue), color: "#d97706" },
                                            { label: "Transactions", value: o.txCount.toLocaleString(), color: "#2563eb" },
                                            { label: "Active Staff", value: o.staffCount, color: "#16a34a" },
                                            { label: "Products", value: o.productCount, color: "#7c3aed" },
                                            { label: "Meals", value: o.mealCount, color: "#0891b2" },
                                        ].map(s => (
                                            <div key={s.label} className="stat-pill">
                                                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                                                <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 2 }}>{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {o.address && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
                                            <MapPin size={12} /> {o.address}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}