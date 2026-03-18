"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
    TrendingUp, DollarSign, ShoppingBag, Loader2,
    Receipt, BarChart2, Calendar, ChefHat, Store,
    UtensilsCrossed, Package, ChevronLeft, ChevronRight,
    ArrowUpRight, Zap, Target, Star, Users, Trophy,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import SecurePageGate from "./SecurePageGate";

// Types
type QuickFilter = "today" | "week" | "month";

interface CategoryData { category: string; sales: number; profit: number; qty: number; }
interface DailyData { date: string; label: string; sales: number; profit: number; count: number; }
interface TopProduct { name: string; category: string; qty: number; sales: number; }
interface SellerStat {
    name: string;
    revenue: number;
    txCount: number;
    isOwner: boolean;
    color: string;
}

// Helpers
const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const phpShort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
};

const safeNum = (v: any) => Number(v ?? 0);

const CAT_STYLE: Record<string, { bg: string; lightBg: string; text: string; fill: string; icon: React.ElementType; border: string }> = {
    Almusal: { bg: "bg-amber-500", lightBg: "bg-amber-50", text: "text-amber-700", fill: "#f59e0b", icon: ChefHat, border: "border-amber-200" },
    "Sari-Sari": { bg: "bg-blue-600", lightBg: "bg-blue-50", text: "text-blue-700", fill: "#2563eb", icon: Store, border: "border-blue-200" },
    Meryenda: { bg: "bg-orange-500", lightBg: "bg-orange-50", text: "text-orange-700", fill: "#f97316", icon: UtensilsCrossed, border: "border-orange-200" },
};

// Seller colors palette
const SELLER_COLORS = ["#7c3aed", "#0891b2", "#059669", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#10b981"];

// Tooltip for area/bar charts
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl text-xs min-w-[140px]">
            <p className="font-black text-slate-700 mb-2 text-[11px]">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-slate-500 font-medium capitalize flex-1">{p.name}:</span>
                    <span className="font-black text-slate-800">{phpShort(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

// Tooltip for pie chart
function PieTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = d.payload.pct ?? "—";
    return (
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-xl text-xs">
            <p className="font-black text-slate-800 mb-1">{d.name}</p>
            <p className="text-slate-500">Sales: <span className="font-black text-slate-800">{php(d.value)}</span></p>
            <p className="text-slate-500">Share: <span className="font-black text-slate-800">{pct}%</span></p>
        </div>
    );
}

// Stat card component
function StatCard({ label, value, sub, icon: Icon, trend, color }: {
    label: string; value: string; sub?: string; icon: React.ElementType;
    trend?: { value: string; positive: boolean };
    color: { bg: string; icon: string; gradient: string };
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-6 translate-x-6 ${color.bg} group-hover:opacity-10 transition-opacity`} />
            <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${color.bg}`}>
                    <Icon size={18} className={color.icon} />
                </div>
                {trend && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-1 rounded-full ${trend.positive ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                        <ArrowUpRight size={10} className={trend.positive ? "" : "rotate-180"} />
                        {trend.value}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
            {sub && <p className="text-[10px] text-slate-400 font-medium mt-1.5">{sub}</p>}
        </div>
    );
}

// Date navigation bar
function DateNavBar({ quickFilter, useCustom, customFrom, customTo, activeDateLabel, onQuickFilter, onShift, onCustomFrom, onCustomTo }: {
    quickFilter: QuickFilter; useCustom: boolean; customFrom: string; customTo: string;
    activeDateLabel: string; onQuickFilter: (f: QuickFilter) => void; onShift: (d: -1 | 1) => void;
    onCustomFrom: (v: string) => void; onCustomTo: (v: string) => void;
}) {
    const filters: { key: QuickFilter; label: string }[] = [
        { key: "today", label: "Today" },
        { key: "week", label: "Week" },
        { key: "month", label: "Month" },
    ];
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                    {filters.map(f => (
                        <button key={f.key} onClick={() => onQuickFilter(f.key)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${!useCustom && quickFilter === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 flex-1">
                    <button onClick={() => onShift(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors border border-slate-200"><ChevronLeft size={14} /></button>
                    <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <input type="date" value={useCustom ? customFrom : ""} onChange={e => onCustomFrom(e.target.value)}
                            className="text-xs font-bold text-slate-600 bg-transparent outline-none flex-1 cursor-pointer" />
                        <span className="text-slate-300 font-bold text-xs shrink-0">→</span>
                        <input type="date" value={useCustom ? customTo : ""} onChange={e => onCustomTo(e.target.value)}
                            className="text-xs font-bold text-slate-600 bg-transparent outline-none flex-1 cursor-pointer" />
                    </div>
                    <button onClick={() => onShift(1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors border border-slate-200"><ChevronRight size={14} /></button>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl whitespace-nowrap">{activeDateLabel}</span>
            </div>
        </div>
    );
}

// SVG donut pie chart for seller breakdown — no external lib
function SellerDonut({ sellers, total }: { sellers: SellerStat[]; total: number }) {
    const SIZE = 150;
    const RADIUS = 55;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const STROKE = 24;
    const CIRCUM = 2 * Math.PI * RADIUS;

    let cumulative = 0;
    const segments = sellers.map(s => {
        const pct = total > 0 ? s.revenue / total : 1 / sellers.length;
        const offset = CIRCUM * (1 - cumulative);
        const dash = CIRCUM * pct;
        cumulative += pct;
        return { ...s, dash, offset };
    });

    return (
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
                {segments.map((s, i) => (
                    <circle key={i} cx={CX} cy={CY} r={RADIUS}
                        fill="none" stroke={s.color} strokeWidth={STROKE}
                        strokeDasharray={`${s.dash} ${CIRCUM - s.dash}`}
                        strokeDashoffset={s.offset} strokeLinecap="butt"
                        style={{ transition: "stroke-dasharray 0.6s ease" }} />
                ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">{phpShort(total)}</p>
            </div>
        </div>
    );
}

// Inner analytics content — gate wraps this below
function AnalyticsContent() {
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [useCustom, setUseCustom] = useState(false);
    const [loading, setLoading] = useState(true);

    const [totalSales, setTotalSales] = useState(0);
    const [totalProfit, setTotalProfit] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [totalItemsSold, setTotalItemsSold] = useState(0);
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

    // All-time seller leaderboard state
    const [sellerStats, setSellerStats] = useState<SellerStat[]>([]);
    const [allTimeRevenue, setAllTimeRevenue] = useState(0);
    const [allTimeOrders, setAllTimeOrders] = useState(0);
    const [sellerLoading, setSellerLoading] = useState(true);

    const getQuickRange = (filter: QuickFilter): { from: string; to: string } => {
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        if (filter === "today") return { from: `${today}T00:00:00`, to: `${today}T23:59:59` };
        if (filter === "week") {
            const s = new Date(now); s.setDate(now.getDate() - 6);
            return { from: `${s.toISOString().split("T")[0]}T00:00:00`, to: `${today}T23:59:59` };
        }
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: `${s.toISOString().split("T")[0]}T00:00:00`, to: `${today}T23:59:59` };
    };

    const getActiveRange = useCallback((): { from: string; to: string } => {
        if (useCustom && customFrom && customTo)
            return { from: `${customFrom}T00:00:00`, to: `${customTo}T23:59:59` };
        return getQuickRange(quickFilter);
    }, [quickFilter, useCustom, customFrom, customTo]);

    const shiftDate = (dir: -1 | 1) => {
        if (useCustom && customFrom && customTo) {
            const from = new Date(customFrom); const to = new Date(customTo);
            const days = Math.round((to.getTime() - from.getTime()) / 86400000);
            from.setDate(from.getDate() + dir * (days + 1));
            to.setDate(to.getDate() + dir * (days + 1));
            setCustomFrom(from.toISOString().split("T")[0]);
            setCustomTo(to.toISOString().split("T")[0]);
        } else if (quickFilter === "today") {
            const d = new Date(); d.setDate(d.getDate() + dir);
            const s = d.toISOString().split("T")[0];
            setCustomFrom(s); setCustomTo(s); setUseCustom(true);
        } else if (quickFilter === "week") {
            const to = new Date(); to.setDate(to.getDate() + dir * 7);
            const from = new Date(to); from.setDate(to.getDate() - 6);
            setCustomFrom(from.toISOString().split("T")[0]);
            setCustomTo(to.toISOString().split("T")[0]); setUseCustom(true);
        } else {
            const now = new Date();
            const m = now.getMonth() + dir;
            const y = now.getFullYear() + Math.floor(m / 12);
            const adjM = ((m % 12) + 12) % 12;
            const from = new Date(y, adjM, 1);
            const to = new Date(y, adjM + 1, 0);
            setCustomFrom(from.toISOString().split("T")[0]);
            setCustomTo(to.toISOString().split("T")[0]); setUseCustom(true);
        }
    };

    // Fetch period-specific analytics (charts, totals)
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { from, to } = getActiveRange();

            const { data: txns } = await supabase
                .from("sales_transactions")
                .select("id, total_amount, item_count, created_at")
                .eq("user_id", user.id)
                .gte("created_at", from).lte("created_at", to);

            const txnList = txns ?? [];
            const txnIds = txnList.map((t: any) => t.id);

            setTotalSales(txnList.reduce((s: number, t: any) => s + Number(t.total_amount), 0));
            setTotalOrders(txnList.length);
            setTotalItemsSold(txnList.reduce((s: number, t: any) => s + t.item_count, 0));

            if (txnIds.length === 0) {
                setTotalProfit(0); setCategoryData([]); setDailyData([]); setTopProducts([]);
                setLoading(false); return;
            }

            const { data: items } = await supabase
                .from("sales_transaction_items")
                .select("category, subtotal, profit, quantity, product_name, transaction_id")
                .in("transaction_id", txnIds);

            const itemList = items ?? [];
            setTotalProfit(itemList.reduce((s: number, i: any) => s + Number(i.profit), 0));

            // Category breakdown
            const catMap: Record<string, CategoryData> = {};
            itemList.forEach((i: any) => {
                if (!catMap[i.category]) catMap[i.category] = { category: i.category, sales: 0, profit: 0, qty: 0 };
                catMap[i.category].sales += Number(i.subtotal);
                catMap[i.category].profit += Number(i.profit);
                catMap[i.category].qty += i.quantity;
            });
            setCategoryData(Object.values(catMap).sort((a, b) => b.sales - a.sales));

            // Daily breakdown
            const dayMap: Record<string, DailyData> = {};
            txnList.forEach((t: any) => {
                const date = t.created_at.split("T")[0];
                if (!dayMap[date]) {
                    const d = new Date(date + "T00:00:00");
                    dayMap[date] = { date, label: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }), sales: 0, profit: 0, count: 0 };
                }
                dayMap[date].sales += Number(t.total_amount);
                dayMap[date].count += 1;
            });
            itemList.forEach((i: any) => {
                const txn = txnList.find((t: any) => t.id === i.transaction_id);
                if (txn) { const date = txn.created_at.split("T")[0]; if (dayMap[date]) dayMap[date].profit += Number(i.profit); }
            });
            setDailyData(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));

            // Top products
            const prodMap: Record<string, TopProduct> = {};
            itemList.forEach((i: any) => {
                if (!prodMap[i.product_name]) prodMap[i.product_name] = { name: i.product_name, category: i.category, qty: 0, sales: 0 };
                prodMap[i.product_name].qty += i.quantity;
                prodMap[i.product_name].sales += Number(i.subtotal);
            });
            setTopProducts(Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 7));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [getActiveRange]);

    // Fetch all-time seller leaderboard — separate from period filter
    const fetchSellerLeaderboard = useCallback(async () => {
        setSellerLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("sales_transactions")
                .select("id, total_amount, sold_by_staff_id, sold_by_name")
                .eq("user_id", user.id);

            const allTxns = data ?? [];
            setAllTimeRevenue(allTxns.reduce((s: number, t: any) => s + safeNum(t.total_amount), 0));
            setAllTimeOrders(allTxns.length);

            // Group by seller name
            const sellerMap: Record<string, { revenue: number; txCount: number; isOwner: boolean }> = {};
            const ownerTxns = allTxns.filter((t: any) => !t.sold_by_staff_id);
            const cashierTxns = allTxns.filter((t: any) => !!t.sold_by_staff_id);

            if (ownerTxns.length > 0) {
                sellerMap["Store Owner"] = {
                    revenue: ownerTxns.reduce((s: number, t: any) => s + safeNum(t.total_amount), 0),
                    txCount: ownerTxns.length,
                    isOwner: true,
                };
            }
            cashierTxns.forEach((t: any) => {
                const name = t.sold_by_name ?? "Cashier";
                if (!sellerMap[name]) sellerMap[name] = { revenue: 0, txCount: 0, isOwner: false };
                sellerMap[name].revenue += safeNum(t.total_amount);
                sellerMap[name].txCount += 1;
            });

            const sorted: SellerStat[] = Object.entries(sellerMap)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([name, val], idx) => ({
                    name,
                    revenue: val.revenue,
                    txCount: val.txCount,
                    isOwner: val.isOwner,
                    color: SELLER_COLORS[idx % SELLER_COLORS.length],
                }));
            setSellerStats(sorted);
        } catch (err) { console.error(err); }
        finally { setSellerLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchSellerLeaderboard(); }, [fetchSellerLeaderboard]);

    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : "0.0";
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const pieData = categoryData.map(c => {
        const total = categoryData.reduce((s, x) => s + x.sales, 0);
        return { ...c, pct: total > 0 ? ((c.sales / total) * 100).toFixed(1) : "0" };
    });
    const PIE_COLORS = categoryData.map(c => CAT_STYLE[c.category]?.fill ?? "#94a3b8");

    const activeDateLabel = (() => {
        if (useCustom && customFrom && customTo) {
            return customFrom === customTo
                ? new Date(customFrom + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "long" })
                : `${new Date(customFrom + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "medium" })} – ${new Date(customTo + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "medium" })}`;
        }
        if (quickFilter === "today") return new Date().toLocaleDateString("en-PH", { dateStyle: "long" });
        if (quickFilter === "week") return "Last 7 Days";
        return new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    })();

    return (
        <div className="space-y-6 pb-8">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Analytics</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Track revenue, profit, and bestsellers at a glance.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-500 font-medium">Live data</span>
                </div>
            </div>

            {/* Date navigation */}
            <DateNavBar
                quickFilter={quickFilter} useCustom={useCustom}
                customFrom={customFrom} customTo={customTo} activeDateLabel={activeDateLabel}
                onQuickFilter={f => { setQuickFilter(f); setUseCustom(false); setCustomFrom(""); setCustomTo(""); }}
                onShift={shiftDate}
                onCustomFrom={v => { setCustomFrom(v); setUseCustom(true); }}
                onCustomTo={v => { setCustomTo(v); setUseCustom(true); }}
            />

            {/* All-Time Seller Leaderboard — always visible, not affected by date filter */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                            <Trophy size={15} className="text-violet-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800">All-Time Seller Leaderboard</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Who contributed the most to store revenue</p>
                        </div>
                    </div>
                    {!sellerLoading && (
                        <div className="text-right">
                            <p className="text-xs font-black text-slate-900">{phpShort(allTimeRevenue)}</p>
                            <p className="text-[10px] text-slate-400">{allTimeOrders} total orders</p>
                        </div>
                    )}
                </div>

                <div className="p-5">
                    {sellerLoading ? (
                        <div className="flex gap-6 flex-wrap">
                            <div className="w-36 h-36 rounded-full bg-slate-100 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-3 min-w-[160px]">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="animate-pulse space-y-1.5">
                                        <div className="h-3 bg-slate-100 rounded-xl w-3/4" />
                                        <div className="h-2 bg-slate-100 rounded-xl w-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : sellerStats.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                                <Users size={20} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400">No sales data yet</p>
                            <p className="text-xs text-slate-300 mt-1">Make a sale to see who's performing best</p>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6 items-start">

                            {/* Donut chart */}
                            <div className="flex flex-col items-center shrink-0">
                                <SellerDonut sellers={sellerStats} total={allTimeRevenue} />
                                {/* Color legend below donut */}
                                <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 justify-center max-w-[160px]">
                                    {sellerStats.map(s => (
                                        <div key={s.name} className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                            <span className="text-[9px] font-bold text-slate-500 truncate max-w-[70px]">{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Leaderboard rows */}
                            <div className="flex-1 min-w-0 w-full">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ranked by Revenue</p>
                                <div className="space-y-3">
                                    {sellerStats.map((s, i) => {
                                        const pct = allTimeRevenue > 0 ? (s.revenue / allTimeRevenue) * 100 : 0;
                                        const rankColors = ["#f59e0b", "#94a3b8", "#b45309"];
                                        return (
                                            <div key={s.name}>
                                                <div className="flex items-center gap-2.5 mb-1.5">
                                                    {/* Rank badge */}
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                                                        style={{ background: i < 3 ? rankColors[i] : "#e2e8f0", color: i < 3 ? "white" : "#94a3b8" }}>
                                                        {i + 1}
                                                    </div>
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                                                    <span className="text-[11px] font-black text-slate-800 flex-1 truncate">{s.name}</span>
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${s.isOwner ? "bg-violet-50 text-violet-600" : "bg-cyan-50 text-cyan-600"}`}>
                                                        {s.isOwner ? "Owner" : "Cashier"}
                                                    </span>
                                                    <span className="text-[11px] font-black text-slate-900 shrink-0">{phpShort(s.revenue)}</span>
                                                </div>
                                                {/* Animated revenue bar */}
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-7">
                                                    <div className="h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${pct}%`, background: s.color }} />
                                                </div>
                                                <div className="flex items-center justify-between ml-7 mt-0.5">
                                                    <span className="text-[9px] text-slate-400">{s.txCount} order{s.txCount !== 1 ? "s" : ""}</span>
                                                    <span className="text-[9px] text-slate-400">{pct.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary footer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                        <p className="text-sm font-black text-slate-900 mt-0.5">{phpShort(allTimeRevenue)}</p>
                                        <p className="text-[9px] text-slate-400">{allTimeOrders} orders</p>
                                    </div>
                                    <div className="bg-violet-50 rounded-xl p-2.5 border border-violet-100">
                                        <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest">Owner</p>
                                        <p className="text-sm font-black text-violet-700 mt-0.5">{phpShort(sellerStats.find(s => s.isOwner)?.revenue ?? 0)}</p>
                                        <p className="text-[9px] text-violet-400">{sellerStats.find(s => s.isOwner)?.txCount ?? 0} orders</p>
                                    </div>
                                    <div className="bg-cyan-50 rounded-xl p-2.5 border border-cyan-100">
                                        <p className="text-[9px] font-black text-cyan-600 uppercase tracking-widest">Cashiers</p>
                                        <p className="text-sm font-black text-cyan-700 mt-0.5">{phpShort(sellerStats.filter(s => !s.isOwner).reduce((acc, s) => acc + s.revenue, 0))}</p>
                                        <p className="text-[9px] text-cyan-400">{sellerStats.filter(s => !s.isOwner).reduce((acc, s) => acc + s.txCount, 0)} orders</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Period analytics below — filtered by date nav */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-32 gap-3">
                    <Loader2 size={28} className="animate-spin text-blue-500" />
                    <p className="text-sm text-slate-400 font-medium">Loading analytics…</p>
                </div>
            ) : totalOrders === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-32 text-center px-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                        <BarChart2 size={28} className="text-slate-300" />
                    </div>
                    <p className="font-black text-slate-500 text-sm">No sales data for this period</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Record a sale in the Point of Sale to see your analytics here.</p>
                </div>
            ) : (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon={DollarSign} label="Total Sales" value={php(totalSales)} sub={`${totalOrders} orders`}
                            color={{ bg: "bg-emerald-500", icon: "text-white", gradient: "from-emerald-400" }} />
                        <StatCard icon={TrendingUp} label="Total Profit" value={php(totalProfit)} sub={`${profitMargin}% margin`}
                            trend={{ value: profitMargin + "%", positive: parseFloat(profitMargin) >= 20 }}
                            color={{ bg: "bg-blue-600", icon: "text-white", gradient: "from-blue-400" }} />
                        <StatCard icon={Receipt} label="Avg. Order" value={php(avgOrderValue)} sub="per transaction"
                            color={{ bg: "bg-violet-500", icon: "text-white", gradient: "from-violet-400" }} />
                        <StatCard icon={ShoppingBag} label="Items Sold" value={String(totalItemsSold)} sub={`${totalOrders} transactions`}
                            color={{ bg: "bg-amber-500", icon: "text-white", gradient: "from-amber-400" }} />
                    </div>

                    {/* Area chart */}
                    {dailyData.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                        <TrendingUp size={15} className="text-blue-500" /> Revenue & Profit Over Time
                                    </h3>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{activeDateLabel}</p>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-blue-500 block" /> Sales</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-emerald-500 block" /> Profit</span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={phpShort} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="sales" name="Sales" stroke="#2563eb" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ fill: "#2563eb", r: 3, strokeWidth: 0 }} />
                                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Category bar + pie */}
                    {categoryData.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-5">
                                    <BarChart2 size={15} className="text-slate-400" /> Sales by Category
                                </h3>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={categoryData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={6}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={phpShort} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="sales" name="Sales" radius={[6, 6, 0, 0]}>
                                            {categoryData.map((e, i) => <Cell key={i} fill={CAT_STYLE[e.category]?.fill ?? "#94a3b8"} />)}
                                        </Bar>
                                        <Bar dataKey="profit" name="Profit" radius={[6, 6, 0, 0]}>
                                            {categoryData.map((e, i) => <Cell key={i} fill={CAT_STYLE[e.category]?.fill ?? "#94a3b8"} fillOpacity={0.35} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                                    {categoryData.map(cat => {
                                        const style = CAT_STYLE[cat.category] ?? { lightBg: "bg-slate-100", text: "text-slate-600", fill: "#94a3b8", icon: Package, border: "border-slate-200" };
                                        const CatIcon = style.icon;
                                        const maxSale = Math.max(...categoryData.map(c => c.sales), 1);
                                        const pct = (cat.sales / maxSale) * 100;
                                        const total = categoryData.reduce((s, c) => s + c.sales, 0);
                                        const share = total > 0 ? ((cat.sales / total) * 100).toFixed(0) : "0";
                                        return (
                                            <div key={cat.category}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-xl ${style.lightBg} flex items-center justify-center border ${style.border}`}>
                                                            <CatIcon size={13} className={style.text} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-700">{cat.category}</p>
                                                            <p className="text-[9px] text-slate-400 font-medium">{cat.qty} items · {share}% share</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-slate-900">{php(cat.sales)}</p>
                                                        <p className={`text-[9px] font-bold ${cat.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                            {cat.profit >= 0 ? "+" : ""}{php(cat.profit)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: style.fill }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
                                    <Target size={15} className="text-slate-400" /> Revenue Share
                                </h3>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={pieData} dataKey="sales" nameKey="category"
                                            cx="50%" cy="50%" innerRadius={45} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                        </Pie>
                                        <Tooltip content={<PieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2.5 mt-4">
                                    {pieData.map((c, i) => {
                                        const style = CAT_STYLE[c.category];
                                        const CatIcon = style?.icon ?? Package;
                                        return (
                                            <div key={c.category} className="flex items-center gap-3">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                                                <div className={`w-6 h-6 rounded-lg ${style?.lightBg ?? "bg-slate-50"} flex items-center justify-center`}>
                                                    <CatIcon size={11} className={style?.text ?? "text-slate-500"} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 flex-1">{c.category}</span>
                                                <span className="text-xs font-black text-slate-800">{c.pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-5 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-4 border border-emerald-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Zap size={12} className="text-emerald-600" />
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Profit Margin</p>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900">{profitMargin}%</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                        {php(totalProfit)} profit on {php(totalSales)} sales
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top products + orders per day */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {topProducts.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-5">
                                    <Star size={15} className="text-amber-400 fill-amber-400" /> Top Products by Units Sold
                                </h3>
                                <div className="space-y-4">
                                    {topProducts.map((p, i) => {
                                        const style = CAT_STYLE[p.category] ?? { lightBg: "bg-slate-100", text: "text-slate-600", fill: "#94a3b8", icon: Package };
                                        const CatIcon = style.icon;
                                        const maxQty = Math.max(...topProducts.map(x => x.qty), 1);
                                        const pct = (p.qty / maxQty) * 100;
                                        const medals = ["🥇", "🥈", "🥉"];
                                        return (
                                            <div key={p.name}>
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <span className="text-sm w-5 shrink-0 text-center">
                                                        {i < 3 ? medals[i] : <span className="text-[10px] font-black text-slate-300">#{i + 1}</span>}
                                                    </span>
                                                    <div className={`w-7 h-7 rounded-lg ${style.lightBg} flex items-center justify-center shrink-0`}>
                                                        <CatIcon size={12} className={style.text} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{p.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-medium">{p.category}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs font-black text-slate-800">{php(p.sales)}</p>
                                                        <p className="text-[9px] text-slate-500 font-bold">{p.qty} sold</p>
                                                    </div>
                                                </div>
                                                <div className="ml-8 w-full bg-slate-100 rounded-full h-1.5">
                                                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: style.fill }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {dailyData.length > 1 && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-5">
                                    <Receipt size={15} className="text-slate-400" /> Orders Per Day
                                </h3>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip formatter={(val: any) => [val, "Orders"]}
                                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11, boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }} />
                                        <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
                                            {dailyData.map((_, i) => <Cell key={i} fill={`hsl(${230 + i * 10}, 80%, ${55 + i * 3}%)`} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-3 gap-3 mt-5 border-t border-slate-100 pt-4">
                                    {[
                                        { label: "Peak Day", value: dailyData.reduce((m, d) => d.count > m.count ? d : m, dailyData[0]).label, sub: `${dailyData.reduce((m, d) => d.count > m.count ? d : m, dailyData[0]).count} orders` },
                                        { label: "Best Sales", value: phpShort(Math.max(...dailyData.map(d => d.sales))), sub: "single day" },
                                        { label: "Avg/Day", value: phpShort(dailyData.reduce((s, d) => s + d.sales, 0) / dailyData.length), sub: "revenue" },
                                    ].map(item => (
                                        <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">{item.label}</p>
                                            <p className="text-xs font-black text-slate-800">{item.value}</p>
                                            <p className="text-[9px] text-slate-400 font-medium">{item.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {dailyData.length === 1 && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-5">
                                    <Receipt size={15} className="text-slate-400" /> Today's Summary
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: "Revenue", value: php(totalSales), color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
                                        { label: "Profit", value: php(totalProfit), color: "bg-blue-50 border-blue-100", text: "text-blue-700" },
                                        { label: "Orders", value: String(totalOrders), color: "bg-violet-50 border-violet-100", text: "text-violet-700" },
                                        { label: "Items Sold", value: String(totalItemsSold), color: "bg-amber-50 border-amber-100", text: "text-amber-700" },
                                    ].map(item => (
                                        <div key={item.label} className={`${item.color} border rounded-2xl p-4 text-center`}>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{item.label}</p>
                                            <p className={`text-lg font-black ${item.text}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// Default export wrapped with auth gate
export default function AnalyticsView() {
    return (
        <SecurePageGate
            pageName="Sales Analytics"
            pageIcon={<BarChart2 size={28} className="text-slate-700" />}
            gradientStyle={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}
        >
            <AnalyticsContent />
        </SecurePageGate>
    );
}