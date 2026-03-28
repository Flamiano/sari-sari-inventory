"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import {
    Package, Search, RefreshCw, AlertTriangle,
    TrendingDown, Box, ShoppingBag,
} from "lucide-react";

interface Product {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    price: number;
    market_price: number;
    stock_quantity: number;
    user_id: string;
    store_name: string;
    type: "product" | "meal";
}

function Skeleton({ style }: { style?: React.CSSProperties }) {
    return <div style={{ background: "#f1f5f9", borderRadius: 7, animation: "skelPulse 1.8s ease-in-out infinite", ...style }} />;
}

const STATUS = {
    out: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", label: "Out of Stock", dot: "#ef4444" },
    low: { bg: "#fffbeb", text: "#d97706", border: "#fde68a", label: "Low Stock", dot: "#f59e0b" },
    ok: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", label: "In Stock", dot: "#22c55e" },
};

function stockStatus(qty: number, type: "product" | "meal") {
    if (qty === 0) return "out";
    if (type === "meal" ? qty <= 2 : qty <= 5) return "low";
    return "ok";
}

export default function Inventory() {
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<"all" | "product" | "meal">("all");
    const [filterStatus, setFilterStatus] = useState<"all" | "low" | "out">("all");
    const [filterStore, setFilterStore] = useState("all");
    const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
    const [sortBy, setSortBy] = useState<"stock" | "name" | "price">("stock");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [profilesRes, productsRes, mealsRes] = await Promise.all([
                supabase.from("profiles").select("id, store_name, email").eq("role", "owner"),
                supabase.from("products").select("id, name, category, subcategory, price, market_price, stock_quantity, user_id"),
                supabase.from("prepared_meals").select("id, name, category, price, market_price, stock_quantity, user_id"),
            ]);
            const profiles = profilesRes.data ?? [];
            const storeMap: Record<string, string> = {};
            profiles.forEach((p: any) => { storeMap[p.id] = p.store_name ?? p.email; });
            setStores(profiles.map((p: any) => ({ id: p.id, name: p.store_name ?? p.email })));
            const prods: Product[] = (productsRes.data ?? []).map((p: any) => ({
                ...p, store_name: storeMap[p.user_id] ?? "—", type: "product" as const, subcategory: p.subcategory ?? null,
            }));
            const meals: Product[] = (mealsRes.data ?? []).map((m: any) => ({
                ...m, store_name: storeMap[m.user_id] ?? "—", type: "meal" as const, subcategory: null,
            }));
            setItems([...prods, ...meals]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = items
        .filter(it => {
            if (filterType !== "all" && it.type !== filterType) return false;
            if (filterStore !== "all" && it.user_id !== filterStore) return false;
            const st = stockStatus(it.stock_quantity, it.type);
            if (filterStatus === "low" && st !== "low") return false;
            if (filterStatus === "out" && st !== "out") return false;
            const q = search.toLowerCase();
            return it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q) || it.store_name.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (sortBy === "stock") return a.stock_quantity - b.stock_quantity;
            if (sortBy === "name") return a.name.localeCompare(b.name);
            return b.price - a.price;
        });

    const lowCount = items.filter(it => stockStatus(it.stock_quantity, it.type) === "low").length;
    const outCount = items.filter(it => it.stock_quantity === 0).length;

    const summaryCards = [
        { label: "Total SKUs", value: items.length, icon: Package, accent: "#3b82f6", light: "#dbeafe" },
        { label: "Products", value: items.filter(i => i.type === "product").length, icon: Box, accent: "#8b5cf6", light: "#ede9fe" },
        { label: "Meals", value: items.filter(i => i.type === "meal").length, icon: ShoppingBag, accent: "#06b6d4", light: "#cffafe" },
        { label: "Low Stock", value: lowCount, icon: AlertTriangle, accent: lowCount > 0 ? "#d97706" : "#94a3b8", light: lowCount > 0 ? "#fef3c7" : "#f8fafc" },
        { label: "Out of Stock", value: outCount, icon: TrendingDown, accent: outCount > 0 ? "#dc2626" : "#94a3b8", light: outCount > 0 ? "#fef2f2" : "#f8fafc" },
    ];

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f8fafc", padding: "32px 24px" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .search-inp { width:100%; padding:10px 14px 10px 38px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1e293b; outline:none; background:white; transition:border-color .15s; }
        .search-inp:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
        .filter-sel { padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#334155; background:white; cursor:pointer; outline:none; font-weight:500; }
        .filter-sel:focus { border-color:#3b82f6; }
        .inv-row { display:grid; grid-template-columns:2fr 1fr 80px 80px 90px 110px; gap:14px; padding:14px 24px; border-bottom:1px solid #f1f5f9; align-items:center; transition:background .12s; }
        .inv-row:hover { background:#fafbff; }
        .status-dot { width:7px; height:7px; border-radius:50%; display:inline-block; margin-right:5px; }
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4 }}>Stock Management</p>
                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, fontWeight: 400, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>Inventory</h1>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{items.length} total SKUs across all stores</p>
                </div>
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={fetchData}
                    disabled={loading}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "white", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                    <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </motion.button>
            </div>

            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 14, marginBottom: 24 }}>
                {summaryCards.map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <motion.div
                            key={c.label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.4 }}
                            style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 18, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,.04)" }}
                        >
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: c.light, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                                <Icon size={16} style={{ color: c.accent }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#94a3b8", marginBottom: 4 }}>{c.label}</div>
                            {loading
                                ? <div style={{ width: 50, height: 20, borderRadius: 6, background: "#f1f5f9", animation: "skelPulse 1.8s ease-in-out infinite" }} />
                                : <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{c.value}</div>
                            }
                        </motion.div>
                    );
                })}
            </div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.4 }}
                style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,.05)", overflow: "hidden" }}
            >
                {/* Toolbar */}
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                        <input className="search-inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items, stores, categories…" />
                    </div>
                    <select className="filter-sel" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                        <option value="all">All Types</option>
                        <option value="product">Products</option>
                        <option value="meal">Meals</option>
                    </select>
                    <select className="filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                        <option value="all">All Stock</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                    <select className="filter-sel" value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                        <option value="all">All Stores</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select className="filter-sel" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                        <option value="stock">Stock ↑</option>
                        <option value="name">Name A–Z</option>
                        <option value="price">Price ↓</option>
                    </select>
                </div>

                {/* Column headers */}
                <div className="inv-row" style={{ background: "#fafbff", borderBottom: "1px solid #e2e8f0" }}>
                    {["Item / Store", "Category", "Price", "Cost", "Stock", "Status"].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8" }}>{h}</div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: 44 }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No items found</div>
                ) : (
                    filtered.map((it, idx) => {
                        const st = stockStatus(it.stock_quantity, it.type);
                        const sc = STATUS[st];
                        return (
                            <motion.div
                                className="inv-row"
                                key={it.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.02 }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{it.store_name}</div>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{it.category}</div>
                                    {it.subcategory && <div style={{ fontSize: 9, color: "#94a3b8" }}>{it.subcategory}</div>}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>₱{Number(it.price).toFixed(2)}</div>
                                <div style={{ fontSize: 11, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>₱{Number(it.market_price).toFixed(2)}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: sc.dot, fontVariantNumeric: "tabular-nums" }}>
                                    {it.stock_quantity}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                        <span className="status-dot" style={{ background: sc.dot }} />
                                        {sc.label}
                                    </span>
                                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700, background: it.type === "meal" ? "#cffafe" : "#ede9fe", color: it.type === "meal" ? "#164e63" : "#4c1d95" }}>
                                        {it.type === "meal" ? "Meal" : "Product"}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })
                )}

                {!loading && filtered.length > 0 && (
                    <div style={{ padding: "12px 24px", borderTop: "1px solid #f1f5f9", background: "#fafbff", fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                        Showing {filtered.length} of {items.length} items
                    </div>
                )}
            </motion.div>
        </div>
    );
}