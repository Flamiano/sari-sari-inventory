"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Package, Search, Filter, AlertTriangle,
    ChefHat, Store, UtensilsCrossed, RefreshCw,
    Tag, Eye, ArrowUpDown, ChevronDown,
    Box, Layers, TrendingDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";

// ─── Types ────────────────────────────────────────────────────────

interface InventoryItem {
    id: string;
    name: string;
    image_url: string | null;
    price: number;
    market_price: number;
    stock_quantity: number;
    category: string;
    subcategory: string | null;
    source: "products" | "prepared_meals";
    created_at: string;
}

type CategoryFilter = "All" | "Almusal" | "Sari-Sari" | "Meryenda";
type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type SortBy = "name" | "stock_asc" | "stock_desc" | "price_asc" | "price_desc";

// ─── Helpers ──────────────────────────────────────────────────────

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CAT_META: Record<string, { icon: React.ElementType; bg: string; text: string; border: string; pill: string }> = {
    Almusal: { icon: ChefHat, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", pill: "bg-amber-100 text-amber-700" },
    "Sari-Sari": { icon: Store, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", pill: "bg-blue-100 text-blue-700" },
    Meryenda: { icon: UtensilsCrossed, bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", pill: "bg-orange-100 text-orange-700" },
};

function getStockStatus(qty: number) {
    if (qty === 0) return { label: "Out of Stock", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" };
    if (qty <= 5) return { label: "Low Stock", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" };
    return { label: "In Stock", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" };
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

// ─── Item Card ────────────────────────────────────────────────────

function ItemCard({ item, index }: { item: InventoryItem; index: number }) {
    const [imgErr, setImgErr] = useState(false);
    const status = getStockStatus(item.stock_quantity);
    const catMeta = CAT_META[item.category];
    const CatIcon = catMeta?.icon ?? Package;

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.22 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
        >
            {/* Image */}
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                {item.image_url && !imgErr ? (
                    <img src={item.image_url} alt={item.name} onError={() => setImgErr(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-300">
                        <CatIcon size={28} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">{item.category}</span>
                    </div>
                )}
                {/* Stock badge */}
                <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${status.bg} ${status.color} border ${item.stock_quantity === 0 ? "border-red-200" : item.stock_quantity <= 5 ? "border-amber-200" : "border-emerald-200"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {item.stock_quantity === 0 ? "OUT" : item.stock_quantity <= 5 ? `${item.stock_quantity} left` : item.stock_quantity}
                </div>
                {/* Category pill */}
                <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-black ${catMeta?.pill ?? "bg-slate-100 text-slate-600"}`}>
                    {item.source === "prepared_meals" ? "Meal" : item.category}
                </div>
                {/* Out-of-stock overlay */}
                {item.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-2">
                        <span className="text-[8px] font-black text-white bg-red-600 px-2 py-0.5 rounded-lg tracking-wider">OUT OF STOCK</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3.5">
                <p className="text-[11px] font-black text-slate-800 truncate leading-tight mb-0.5" title={item.name}>
                    {item.name}
                </p>
                {item.subcategory && (
                    <p className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5 mb-1.5">
                        <Tag size={8} /> {item.subcategory}
                    </p>
                )}
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-black text-slate-900">{php(item.price)}</p>
                    {item.market_price > 0 && item.market_price !== item.price && (
                        <p className="text-[9px] text-slate-400 line-through">{php(item.market_price)}</p>
                    )}
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${item.stock_quantity === 0 ? "bg-red-300" :
                                item.stock_quantity <= 5 ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                        style={{ width: item.stock_quantity === 0 ? "4%" : `${Math.min(100, (item.stock_quantity / 50) * 100)}%` }}
                    />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-medium">
                    {item.stock_quantity} unit{item.stock_quantity !== 1 ? "s" : ""} available
                </p>
            </div>
        </motion.div>
    );
}

// ─── MAIN ─────────────────────────────────────────────────────────

interface InventoryProps {
    ownerIdProp?: string;
    ownerStoreName?: string;
}

export default function Inventory({ ownerIdProp, ownerStoreName = "your store" }: InventoryProps = {}) {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState<CategoryFilter>("All");
    const [stockFilter, setStockFilter] = useState<StockFilter>("all");
    const [sortBy, setSortBy] = useState<SortBy>("name");
    const [showFilters, setShowFilters] = useState(false);

    const getOwnerId = useCallback((): string | null => {
        if (ownerIdProp) return ownerIdProp;
        try {
            const raw = sessionStorage.getItem("staff_session");
            if (!raw) return null;
            return JSON.parse(raw)?.owner_id ?? null;
        } catch { return null; }
    }, [ownerIdProp]);

    // ── Fetch via RPCs (bypasses RLS) ─────────────────────────────
    const fetchInventory = useCallback(async () => {
        const ownerId = getOwnerId();
        if (!ownerId) { setLoading(false); return; }
        setLoading(true);
        try {
            const [prodRes, mealRes] = await Promise.all([
                supabase.rpc("get_owner_products", { p_owner_id: ownerId }),
                supabase.rpc("get_owner_meals", { p_owner_id: ownerId }),
            ]);

            const products: InventoryItem[] = (prodRes.data ?? []).map((p: any) => ({
                ...p,
                subcategory: p.subcategory ?? null,
                source: "products" as const,
            }));
            const meals: InventoryItem[] = (mealRes.data ?? []).map((m: any) => ({
                ...m,
                subcategory: null,
                source: "prepared_meals" as const,
            }));
            setItems([...products, ...meals]);
        } catch (err) {
            console.error("Inventory fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [getOwnerId]);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    // ── Filter + sort ─────────────────────────────────────────────
    const filtered = items
        .filter(item => {
            const matchSearch = !search ||
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                (item.subcategory?.toLowerCase() ?? "").includes(search.toLowerCase());
            const matchCat = catFilter === "All" || item.category === catFilter;
            const matchStock =
                stockFilter === "all" ? true :
                    stockFilter === "out-of-stock" ? item.stock_quantity === 0 :
                        stockFilter === "low-stock" ? item.stock_quantity > 0 && item.stock_quantity <= 5 :
                            item.stock_quantity > 5;
            return matchSearch && matchCat && matchStock;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "stock_asc": return a.stock_quantity - b.stock_quantity;
                case "stock_desc": return b.stock_quantity - a.stock_quantity;
                case "price_asc": return a.price - b.price;
                case "price_desc": return b.price - a.price;
                default: return a.name.localeCompare(b.name);
            }
        });

    const totalItems = items.length;
    const outOfStock = items.filter(i => i.stock_quantity === 0).length;
    const lowStock = items.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 5).length;
    const inStock = items.filter(i => i.stock_quantity > 5).length;

    const stockFilterOpts: { id: StockFilter; label: string; count: number; color: string }[] = [
        { id: "all", label: "All", count: totalItems, color: "text-slate-600" },
        { id: "in-stock", label: "In Stock", count: inStock, color: "text-emerald-600" },
        { id: "low-stock", label: "Low Stock", count: lowStock, color: "text-amber-600" },
        { id: "out-of-stock", label: "Out of Stock", count: outOfStock, color: "text-red-600" },
    ];

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
                        Inventory
                    </h2>
                    <p className="text-[0.78rem] text-slate-400 mt-0.5">
                        Viewing <span className="font-bold text-slate-600">{ownerStoreName}</span>'s products — read only
                    </p>
                </div>
                <button onClick={fetchInventory} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-[0.8rem] font-bold text-slate-500 hover:text-violet-600 hover:border-violet-200 transition-all disabled:opacity-50 self-start sm:self-auto">
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Items", val: totalItems, icon: <Layers size={16} />, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
                    { label: "In Stock", val: inStock, icon: <Box size={16} />, color: "#059669", bg: "rgba(5,150,105,0.08)" },
                    { label: "Low Stock", val: lowStock, icon: <AlertTriangle size={16} />, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
                    { label: "Out of Stock", val: outOfStock, icon: <TrendingDown size={16} />, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
                ].map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                            style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                        {loading
                            ? <Skeleton className="h-6 w-10 mb-1" />
                            : <p className="text-xl font-black leading-none mb-1" style={{ fontFamily: "Syne, sans-serif", color: s.color }}>{s.val}</p>
                        }
                        <p className="text-[0.68rem] text-slate-400 font-medium">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Search + filter bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search product or subcategory…"
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-violet-400 focus:border-violet-300 transition-all" />
                    </div>
                    <div className="relative">
                        <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
                            className="pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 ring-violet-400 transition-all cursor-pointer appearance-none">
                            <option value="name">Name A–Z</option>
                            <option value="stock_asc">Stock: Low first</option>
                            <option value="stock_desc">Stock: High first</option>
                            <option value="price_asc">Price: Low first</option>
                            <option value="price_desc">Price: High first</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <button onClick={() => setShowFilters(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${showFilters ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-300"}`}>
                        <Filter size={13} /> Filters
                        {(catFilter !== "All" || stockFilter !== "all") && (
                            <span className={`w-1.5 h-1.5 rounded-full ${showFilters ? "bg-white" : "bg-violet-600"}`} />
                        )}
                    </button>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                            className="overflow-hidden border-t border-slate-100">
                            <div className="p-4 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(["All", "Almusal", "Sari-Sari", "Meryenda"] as CategoryFilter[]).map(cat => {
                                            const meta = cat !== "All" ? CAT_META[cat] : null;
                                            const Icon = meta?.icon ?? Package;
                                            const active = catFilter === cat;
                                            return (
                                                <button key={cat} onClick={() => setCatFilter(cat)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active
                                                            ? cat === "All" ? "bg-slate-900 text-white border-slate-900"
                                                                : `${meta?.bg} ${meta?.text} ${meta?.border}`
                                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                                        }`}>
                                                    {cat !== "All" && <Icon size={11} />}
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {stockFilterOpts.map(opt => {
                                            const active = stockFilter === opt.id;
                                            return (
                                                <button key={opt.id} onClick={() => setStockFilter(opt.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-slate-900 text-white border-slate-900"
                                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                                        }`}>
                                                    {opt.label}
                                                    <span className={`text-[10px] font-black ${active ? "text-white/70" : opt.color}`}>{opt.count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {(catFilter !== "All" || stockFilter !== "all" || search) && (
                    <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400">Showing:</span>
                        {catFilter !== "All" && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CAT_META[catFilter]?.pill} ${CAT_META[catFilter]?.border}`}>{catFilter}</span>
                        )}
                        {stockFilter !== "all" && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 capitalize">{stockFilter.replace("-", " ")}</span>
                        )}
                        {search && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">"{search}"</span>
                        )}
                        <button onClick={() => { setCatFilter("All"); setStockFilter("all"); setSearch(""); }}
                            className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors ml-1">Clear all</button>
                        <span className="ml-auto text-[10px] font-bold text-slate-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                    </div>
                )}
            </div>

            {/* Read-only notice */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <Eye size={14} className="text-blue-400 shrink-0" />
                <p className="text-[0.78rem] text-blue-700 font-medium">
                    <span className="font-black">View only.</span> You can monitor stock levels and browse products. Contact your store owner to make changes.
                </p>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <Skeleton className="h-32 rounded-none" />
                            <div className="p-3.5 space-y-2">
                                <Skeleton className="h-2.5 w-3/4" />
                                <Skeleton className="h-2 w-1/2" />
                                <Skeleton className="h-1 w-full mt-1" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-100">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                        <Package size={22} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">
                        {items.length === 0 ? "No products found for this store." : "No items match your filters."}
                    </p>
                    {items.length > 0 && (
                        <button onClick={() => { setCatFilter("All"); setStockFilter("all"); setSearch(""); }}
                            className="mt-3 text-xs font-black text-violet-600 hover:text-violet-700 transition-colors">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <p className="text-[11px] font-bold text-slate-400">{filtered.length} of {items.length} items</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filtered.map((item, i) => (
                            <ItemCard key={`${item.source}-${item.id}`} item={item} index={i} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}