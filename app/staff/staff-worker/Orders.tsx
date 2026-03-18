"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Receipt, Calendar, RefreshCw, TrendingUp,
    DollarSign, ShoppingBag, Users, Filter,
    ArrowUpRight, Search, Clock, Package,
    BarChart3, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────

interface Transaction {
    id: string;
    created_at: string;
    transaction_ref: string;
    total_amount: number;
    amount_paid: number;
    change_amount: number;
    item_count: number;
    sold_by_name: string | null;
    sold_by_staff_id: string | null;  // present only when fetched directly
    is_staff_sale: boolean;            // derived field we add client-side
}

type RangePreset = "today" | "week" | "month" | "year" | "custom";
interface DateBounds { from: string; to: string; label: string; }

// ─── Helpers ──────────────────────────────────────────────────────

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const phpShort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
};

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

function getPresetBounds(preset: RangePreset, customFrom?: string, customTo?: string): DateBounds {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    switch (preset) {
        case "today": return {
            from: `${today}T00:00:00+08:00`,
            to: `${today}T23:59:59+08:00`,
            label: now.toLocaleDateString("en-PH", { dateStyle: "long" }),
        };
        case "week": {
            const s = new Date(now); s.setDate(now.getDate() - 6);
            const start = s.toISOString().split("T")[0];
            return {
                from: `${start}T00:00:00+08:00`,
                to: `${today}T23:59:59+08:00`,
                label: `${s.toLocaleDateString("en-PH", { dateStyle: "medium" })} – ${now.toLocaleDateString("en-PH", { dateStyle: "medium" })}`,
            };
        }
        case "month": {
            const s = new Date(now.getFullYear(), now.getMonth(), 1);
            return {
                from: `${s.toISOString().split("T")[0]}T00:00:00+08:00`,
                to: `${today}T23:59:59+08:00`,
                label: now.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
            };
        }
        case "year": {
            const s = new Date(now.getFullYear(), 0, 1);
            return {
                from: `${s.toISOString().split("T")[0]}T00:00:00+08:00`,
                to: `${today}T23:59:59+08:00`,
                label: String(now.getFullYear()),
            };
        }
        case "custom": return {
            from: customFrom ? `${customFrom}T00:00:00+08:00` : `${today}T00:00:00+08:00`,
            to: customTo ? `${customTo}T23:59:59+08:00` : `${today}T23:59:59+08:00`,
            label: customFrom && customTo ? `${customFrom} to ${customTo}` : today,
        };
        default: return { from: `${today}T00:00:00+08:00`, to: `${today}T23:59:59+08:00`, label: today };
    }
}

function buildDailyChart(txns: Transaction[]) {
    const map: Record<string, { date: string; label: string; income: number; count: number }> = {};
    txns.forEach(t => {
        const d = t.created_at.split("T")[0];
        if (!map[d]) map[d] = {
            date: d,
            label: new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
            income: 0, count: 0,
        };
        map[d].income += Number(t.total_amount);
        map[d].count += 1;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface OrdersProps {
    ownerIdProp?: string;
    ownerStoreName?: string;
}

export default function Orders({ ownerIdProp, ownerStoreName = "your store" }: OrdersProps = {}) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [preset, setPreset] = useState<RangePreset>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [showCustom, setShowCustom] = useState(false);
    const [search, setSearch] = useState("");

    // ── Resolve owner_id ──────────────────────────────────────────
    const getOwnerId = useCallback((): string | null => {
        if (ownerIdProp) return ownerIdProp;
        try {
            const raw = sessionStorage.getItem("staff_session");
            if (!raw) return null;
            return JSON.parse(raw)?.owner_id ?? null;
        } catch { return null; }
    }, [ownerIdProp]);

    // ── Fetch transactions ────────────────────────────────────────
    // The get_owner_transactions RPC only returns sold_by_name, NOT sold_by_staff_id.
    // To correctly identify cashier vs owner sales we fetch the full column set
    // directly — this is safe because staff sessions always pass ownerIdProp,
    // and the RLS on sales_transactions allows SELECT for the owner.
    // For anon staff sessions we fall back to the RPC + heuristic detection.
    const fetchOrders = useCallback(async () => {
        const ownerId = getOwnerId();
        if (!ownerId) { setLoading(false); return; }
        setLoading(true);

        try {
            const bounds = getPresetBounds(preset, customFrom, customTo);

            // Try direct query first (works for owner sessions with auth).
            // For anon staff sessions this will be blocked by RLS, so we
            // fall back to the RPC which is SECURITY DEFINER.
            const { data: directData, error: directError } = await supabase
                .from("sales_transactions")
                .select("id, created_at, transaction_ref, total_amount, amount_paid, change_amount, item_count, sold_by_name, sold_by_staff_id")
                .eq("user_id", ownerId)
                .gte("created_at", bounds.from)
                .lte("created_at", bounds.to)
                .order("created_at", { ascending: false });

            if (!directError && directData) {
                // Direct query succeeded — sold_by_staff_id is available
                const mapped: Transaction[] = (directData as any[]).map(t => ({
                    ...t,
                    is_staff_sale: !!t.sold_by_staff_id,
                }));
                setTransactions(mapped);
                setLoading(false);
                return;
            }

            // Fallback: use the SECURITY DEFINER RPC (anon staff sessions)
            // The RPC doesn't return sold_by_staff_id, so we detect staff sales
            // by checking whether sold_by_name is non-null (owner sales have null name).
            const { data: rpcData, error: rpcError } = await supabase.rpc("get_owner_transactions", {
                p_owner_id: ownerId,
                p_from: bounds.from,
                p_to: bounds.to,
            });

            if (rpcError) {
                console.error("Orders RPC error:", rpcError);
            }

            const mapped: Transaction[] = ((rpcData ?? []) as any[]).map(t => ({
                id: t.id,
                created_at: t.created_at,
                transaction_ref: t.transaction_ref,
                total_amount: Number(t.total_amount),
                amount_paid: Number(t.amount_paid ?? t.total_amount),
                change_amount: Number(t.change_amount ?? 0),
                item_count: t.item_count,
                sold_by_name: t.sold_by_name ?? null,
                sold_by_staff_id: null,
                // If sold_by_name is not null → a cashier/staff made this sale
                is_staff_sale: !!t.sold_by_name,
            }));

            setTransactions(mapped);
        } catch (err) {
            console.error("Orders fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [getOwnerId, preset, customFrom, customTo]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // ── Derived stats ─────────────────────────────────────────────
    const totalIncome = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalOrders = transactions.length;
    const avgOrder = totalOrders > 0 ? totalIncome / totalOrders : 0;
    const totalItems = transactions.reduce((s, t) => s + t.item_count, 0);

    // ── Seller breakdown ──────────────────────────────────────────
    // is_staff_sale = true  → cashier sold it  (cyan "C" badge)
    // is_staff_sale = false → owner sold it    (violet "O" badge)
    const byStaff = transactions.reduce((acc, t) => {
        const isStaff = t.is_staff_sale;
        const key = isStaff
            ? (t.sold_by_name ?? "Unknown Cashier")
            : "Store Owner";
        if (!acc[key]) acc[key] = { name: key, count: 0, total: 0, isStaff };
        acc[key].count += 1;
        acc[key].total += Number(t.total_amount);
        return acc;
    }, {} as Record<string, { name: string; count: number; total: number; isStaff: boolean }>);

    const sellerList = Object.values(byStaff).sort((a, b) => b.total - a.total);
    const dailyChart = buildDailyChart(transactions);

    // ── Filter for table ──────────────────────────────────────────
    const filtered = transactions.filter(t => {
        if (!search) return true;
        const seller = t.is_staff_sale
            ? (t.sold_by_name ?? "Unknown Cashier")
            : "Store Owner";
        return (
            t.transaction_ref.toLowerCase().includes(search.toLowerCase()) ||
            seller.toLowerCase().includes(search.toLowerCase())
        );
    });

    const bounds = getPresetBounds(preset, customFrom, customTo);

    const PRESETS: { id: RangePreset; label: string }[] = [
        { id: "today", label: "Today" },
        { id: "week", label: "This Week" },
        { id: "month", label: "This Month" },
        { id: "year", label: "This Year" },
        { id: "custom", label: "Custom" },
    ];

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
                        Orders
                    </h2>
                    <p className="text-[0.78rem] text-slate-400 mt-0.5">
                        Income monitor for <span className="font-bold text-slate-600">{ownerStoreName}</span> — view only
                    </p>
                </div>
                <button onClick={fetchOrders} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-[0.8rem] font-bold text-slate-500 hover:text-violet-600 hover:border-violet-200 transition-all disabled:opacity-50 self-start sm:self-auto">
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* ── Date range presets ── */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm flex-wrap">
                    {PRESETS.map(p => (
                        <button key={p.id}
                            onClick={() => {
                                setPreset(p.id);
                                setShowCustom(p.id === "custom");
                            }}
                            className="px-4 py-2 rounded-xl text-[0.78rem] font-bold uppercase tracking-wide transition-all"
                            style={{
                                background: preset === p.id ? "#7c3aed" : "transparent",
                                color: preset === p.id ? "white" : "#64748b",
                            }}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Custom date picker ── */}
            <AnimatePresence>
                {showCustom && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                        className="overflow-hidden">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">From</p>
                                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-violet-400 transition-all" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">To</p>
                                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-violet-400 transition-all" />
                            </div>
                            <button onClick={fetchOrders} disabled={!customFrom || !customTo || loading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all disabled:opacity-40">
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <Filter size={13} />}
                                Apply
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Period label ── */}
            <div className="flex items-center gap-2 text-[0.75rem] text-slate-500">
                <Calendar size={12} className="text-violet-400" />
                <span className="font-bold">{bounds.label}</span>
            </div>

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Income", val: loading ? null : php(totalIncome), sub: "gross revenue", icon: <DollarSign size={18} />, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
                    { label: "Total Orders", val: loading ? null : String(totalOrders), sub: "transactions", icon: <Receipt size={18} />, color: "#059669", bg: "rgba(5,150,105,0.08)" },
                    { label: "Avg. Order", val: loading ? null : phpShort(avgOrder), sub: "per transaction", icon: <TrendingUp size={18} />, color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
                    { label: "Items Sold", val: loading ? null : String(totalItems), sub: "total units", icon: <ShoppingBag size={18} />, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                            <ArrowUpRight size={12} className="text-slate-200 mt-1" />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                        {s.val === null
                            ? <Skeleton className="h-6 w-20 mb-1" />
                            : <p className="text-xl font-black text-slate-900" style={{ fontFamily: "Syne,sans-serif" }}>{s.val}</p>
                        }
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Chart + Seller breakdown ── */}
            {!loading && transactions.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Income chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={14} className="text-violet-500" />
                            <h3 className="font-black text-slate-800 text-sm" style={{ fontFamily: "Syne,sans-serif" }}>
                                Income Over Time
                            </h3>
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={dailyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={phpShort} />
                                <Tooltip formatter={(v: any) => [php(v), "Income"]}
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11, boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }} />
                                <Area type="monotone" dataKey="income" stroke="#7c3aed" strokeWidth={2.5}
                                    fill="url(#incomeGrad)" dot={{ fill: "#7c3aed", r: 3, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Seller breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={14} className="text-violet-500" />
                            <h3 className="font-black text-slate-800 text-sm" style={{ fontFamily: "Syne,sans-serif" }}>
                                Sold By
                            </h3>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-3">
                            Cashier / Owner breakdown
                        </p>
                        {sellerList.length === 0 ? (
                            <p className="text-xs text-slate-300 text-center py-4">No data</p>
                        ) : (
                            <div className="space-y-3">
                                {sellerList.map(s => {
                                    const pct = totalIncome > 0 ? (s.total / totalIncome) * 100 : 0;
                                    return (
                                        <div key={s.name}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white ${s.isStaff ? "bg-cyan-500" : "bg-violet-600"}`}>
                                                        {s.isStaff ? "C" : "O"}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[110px]">{s.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-800">{phpShort(s.total)}</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${s.isStaff ? "bg-cyan-400" : "bg-violet-500"}`}
                                                    style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex justify-between mt-0.5">
                                                <span className="text-[9px] text-slate-400">{s.count} order{s.count !== 1 ? "s" : ""}</span>
                                                <span className="text-[9px] text-slate-400">{pct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Legend */}
                                <div className="flex gap-3 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded bg-violet-500" />
                                        <span className="text-[9px] text-slate-400 font-bold">Owner</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded bg-cyan-400" />
                                        <span className="text-[9px] text-slate-400 font-bold">Cashier</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Transaction table ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Receipt size={14} className="text-violet-500" />
                        <h3 className="font-black text-slate-900 text-sm" style={{ fontFamily: "Syne,sans-serif" }}>
                            Transaction Log
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search ref or seller…"
                            className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[0.78rem] font-medium text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 ring-violet-400 transition-all w-52" />
                    </div>
                </div>

                {loading ? (
                    <div className="p-5 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <Skeleton className="w-9 h-9 shrink-0" />
                                <div className="flex-1 space-y-2"><Skeleton className="h-2.5 w-1/2" /><Skeleton className="h-2 w-1/3" /></div>
                                <Skeleton className="h-4 w-20 shrink-0" />
                                <Skeleton className="h-4 w-16 shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <Receipt size={20} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">
                            {transactions.length === 0 ? "No orders for this period." : "No orders match your search."}
                        </p>
                        <p className="text-xs text-slate-300">Try adjusting the date range.</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                            <div className="w-9" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-14 text-center">Items</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-20">Change</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-28">Sold By</p>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {filtered.map((txn, i) => {
                                const d = new Date(txn.created_at);
                                const isStaff = txn.is_staff_sale;
                                // Display name: cashier shows their name, owner shows "Store Owner"
                                const sellerDisplay = isStaff
                                    ? (txn.sold_by_name ?? "Unknown Cashier")
                                    : "Store Owner";

                                return (
                                    <div key={txn.id}
                                        className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                                        {/* # */}
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] font-black text-violet-500">#{i + 1}</span>
                                        </div>
                                        {/* Ref + time */}
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate">{txn.transaction_ref}</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                <Clock size={8} />
                                                {d.toLocaleDateString("en-PH", { dateStyle: "medium" })} · {d.toLocaleTimeString("en-PH", { timeStyle: "short" })}
                                            </p>
                                        </div>
                                        {/* Items */}
                                        <div className="text-center w-14 shrink-0">
                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-lg text-xs font-black text-slate-600">
                                                {txn.item_count}
                                            </span>
                                        </div>
                                        {/* Amount */}
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-slate-900">{php(txn.total_amount)}</p>
                                            <p className="text-[9px] text-slate-400">paid {php(txn.amount_paid)}</p>
                                        </div>
                                        {/* Change */}
                                        <div className="hidden sm:block text-right shrink-0 w-20">
                                            <p className="text-[11px] font-bold text-emerald-600">{php(txn.change_amount)}</p>
                                        </div>
                                        {/* Sold by */}
                                        <div className="hidden sm:flex items-center justify-end gap-1.5 shrink-0 w-28">
                                            <div className={`w-4 h-4 rounded flex items-center justify-center text-[7px] font-black text-white flex-shrink-0 ${isStaff ? "bg-cyan-500" : "bg-violet-600"}`}>
                                                {isStaff ? "C" : "O"}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-600 truncate">{sellerDisplay}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer total */}
                        <div className="px-5 py-3.5 bg-violet-50/60 border-t border-violet-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Period Income</p>
                                    <p className="text-sm font-black text-violet-700">{php(totalIncome)}</p>
                                </div>
                                <div className="h-8 w-px bg-violet-200" />
                                <div>
                                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Orders</p>
                                    <p className="text-sm font-black text-violet-700">{totalOrders}</p>
                                </div>
                                <div className="h-8 w-px bg-violet-200" />
                                <div>
                                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Items</p>
                                    <p className="text-sm font-black text-violet-700">{totalItems}</p>
                                </div>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400">View only — sales are processed by cashiers</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}