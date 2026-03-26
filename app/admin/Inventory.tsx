"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    Package, Search, RefreshCw, AlertTriangle,
    ChevronDown, Filter, Store, TrendingDown,
    BarChart3, Box, ShoppingBag,
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

const phpShort = (n: number) => {
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${Number(n).toFixed(2)}`;
};

function Skeleton({ style }: { style?: React.CSSProperties }) {
    return <div style={{ background: "#e5e7eb", borderRadius: 6, animation: "skelPulse 1.5s ease-in-out infinite", ...style }} />;
}

const STATUS_COLORS = {
    out: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", label: "Out of Stock" },
    low: { bg: "#fffbeb", text: "#d97706", border: "#fde68a", label: "Low Stock" },
    ok: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", label: "In Stock" },
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
            if (sortBy === "price") return b.price - a.price;
            return 0;
        });

    const lowCount = items.filter(it => stockStatus(it.stock_quantity, it.type) === "low").length;
    const outCount = items.filter(it => it.stock_quantity === 0).length;
    const totalValue = items.reduce((s, it) => s + it.price * it.stock_quantity, 0);

    return (
        <>
            <style>{`
        @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .inv-card { background:white; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.05); overflow:hidden; animation:fadeUp .3s ease both; }
        .inv-row { display:grid; grid-template-columns:2fr 1fr 80px 80px 90px 90px; gap:12px; padding:12px 20px; border-bottom:1px solid #f3f4f6; align-items:center; transition:background .12s; }
        .inv-row:last-child{border-bottom:none}
        .inv-row:hover{background:#fafafa}
        .filter-select { padding:6px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:11px; font-family:inherit; color:#374151; background:white; cursor:pointer; outline:none; }
        .filter-select:focus{border-color:#2563eb}
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Inventory</h1>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                        {items.length} total SKUs across all stores
                    </p>
                </div>
                <button onClick={fetchData} disabled={loading} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    background: "white", border: "1px solid #e5e7eb", borderRadius: 9,
                    fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer",
                }}>
                    <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </button>
            </div>

            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
                {[
                    { label: "Total SKUs", value: items.length, icon: Package, color: "#2563eb", bg: "#eff6ff" },
                    { label: "Products", value: items.filter(i => i.type === "product").length, icon: Box, color: "#7c3aed", bg: "#f5f3ff" },
                    { label: "Meals", value: items.filter(i => i.type === "meal").length, icon: ShoppingBag, color: "#0891b2", bg: "#ecfeff" },
                    { label: "Low Stock", value: lowCount, icon: AlertTriangle, color: lowCount > 0 ? "#d97706" : "#9ca3af", bg: lowCount > 0 ? "#fffbeb" : "#f9fafb" },
                    { label: "Out of Stock", value: outCount, icon: TrendingDown, color: outCount > 0 ? "#dc2626" : "#9ca3af", bg: outCount > 0 ? "#fef2f2" : "#f9fafb" },
                ].map(c => {
                    const Icon = c.icon;
                    return (
                        <div key={c.label} className="inv-card" style={{ padding: "16px 18px" }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                                <Icon size={15} style={{ color: c.color }} />
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af", marginBottom: 2 }}>{c.label}</div>
                            {loading ? <Skeleton style={{ width: 50, height: 18 }} /> : <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{c.value}</div>}
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            <div className="inv-card">
                {/* Toolbar */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search items, stores, categories…"
                            style={{ width: "100%", padding: "7px 12px 7px 30px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151", outline: "none", fontFamily: "inherit" }}
                        />
                    </div>
                    <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                        <option value="all">All Types</option>
                        <option value="product">Products</option>
                        <option value="meal">Meals</option>
                    </select>
                    <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                        <option value="all">All Stock</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                    <select className="filter-select" value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                        <option value="all">All Stores</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                        <option value="stock">Sort: Stock ↑</option>
                        <option value="name">Sort: Name</option>
                        <option value="price">Sort: Price ↓</option>
                    </select>
                </div>

                {/* Column headers */}
                <div className="inv-row" style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                    {["Item / Store", "Category", "Price", "Cost", "Stock", "Status"].map(h => (
                        <div key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af" }}>{h}</div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: 40 }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No items found</div>
                ) : (
                    filtered.map(it => {
                        const st = stockStatus(it.stock_quantity, it.type);
                        const sc = STATUS_COLORS[st];
                        return (
                            <div className="inv-row" key={it.id}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{it.store_name}</div>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.category}</div>
                                    {it.subcategory && <div style={{ fontSize: 9, color: "#9ca3af" }}>{it.subcategory}</div>}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>₱{Number(it.price).toFixed(2)}</div>
                                <div style={{ fontSize: 11, color: "#6b7280" }}>₱{Number(it.market_price).toFixed(2)}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: st === "out" ? "#dc2626" : st === "low" ? "#d97706" : "#111827" }}>
                                    {it.stock_quantity}
                                </div>
                                <div>
                                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                        {sc.label}
                                    </span>
                                    <span style={{ marginLeft: 5, padding: "2px 6px", borderRadius: 5, fontSize: 9, fontWeight: 600, background: it.type === "meal" ? "#ecfeff" : "#f5f3ff", color: it.type === "meal" ? "#0891b2" : "#7c3aed" }}>
                                        {it.type === "meal" ? "Meal" : "Product"}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}

                {!loading && filtered.length > 0 && (
                    <div style={{ padding: "10px 20px", borderTop: "1px solid #f3f4f6", background: "#fafafa", fontSize: 11, color: "#9ca3af" }}>
                        Showing {filtered.length} of {items.length} items
                    </div>
                )}
            </div>
        </>
    );
}