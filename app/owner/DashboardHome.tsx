"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    Package, AlertTriangle, TrendingUp, ShoppingBag,
    ChevronRight, Clock, Flame, Store, ChefHat,
    UtensilsCrossed, Receipt, Banknote, Users,
    Plus, X, Check, Loader2, ArrowUpRight,
    Calendar, FileText, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

// Types

interface StockItem {
    id: string;
    name: string;
    image_url: string | null;
    stock_quantity: number;
    price: number;
    category: string;
    source: "products" | "prepared_meals";
}

interface RecentSale {
    id: string;
    transaction_ref: string;
    total_amount: number;
    item_count: number;
    created_at: string;
}

interface UtangRecord {
    id: string;
    customer_name: string;
    item_desc: string;
    amount: number;
    amount_paid: number;
    is_paid: boolean;
    due_date: string | null;
    notes: string | null;
    created_at: string;
}

interface Stats {
    totalProducts: number;
    lowStockCount: number;
    todaySales: number;
    todayTransactions: number;
}

// Helpers

const CAT_ICON: Record<string, React.ElementType> = {
    Almusal: ChefHat,
    "Sari-Sari": Store,
    Meryenda: UtensilsCrossed,
};

const CAT_PILL: Record<string, string> = {
    Almusal: "bg-amber-100 text-amber-700",
    "Sari-Sari": "bg-blue-100 text-blue-700",
    Meryenda: "bg-orange-100 text-orange-700",
};

const php = (n: number | null | undefined) =>
    `₱${Number(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const phpShort = (n: number | null | undefined) => {
    const v = Number(n ?? 0);
    if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `₱${(v / 1_000).toFixed(1)}k`;
    return `₱${v.toFixed(0)}`;
};

const safeNum = (v: any) => Number(v ?? 0);

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// Skeleton

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

// Product Image Card

function ProductCard({ item, index }: { item: StockItem; index: number }) {
    const isOut = item.stock_quantity === 0;
    const isLow = !isOut && item.stock_quantity <= 5;
    const CatIcon = CAT_ICON[item.category] ?? Package;
    const catPill = CAT_PILL[item.category] ?? "bg-slate-100 text-slate-600";
    const [imgErr, setImgErr] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-default"
        >
            {/* Image */}
            <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden">
                {item.image_url && !imgErr ? (
                    <img
                        src={item.image_url}
                        alt={item.name}
                        onError={() => setImgErr(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-300">
                        <CatIcon size={26} />
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">{item.category}</span>
                    </div>
                )}

                {/* Stock badge */}
                <span className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm ${isOut ? "bg-red-500 text-white" :
                        isLow ? "bg-amber-400 text-white" :
                            "bg-emerald-500 text-white"
                    }`}>
                    {isOut ? "OUT" : isLow ? `${item.stock_quantity} left` : `${item.stock_quantity}`}
                </span>

                {/* Category pill */}
                <span className={`absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none ${catPill}`}>
                    {item.source === "prepared_meals" ? "Meal" : item.category.split("-")[0]}
                </span>

                {/* Out-of-stock dim overlay */}
                {isOut && (
                    <div className="absolute inset-0 bg-black/25 flex items-end justify-center pb-2">
                        <span className="text-[9px] font-black text-white bg-red-600 px-2 py-0.5 rounded-lg tracking-wider">
                            OUT OF STOCK
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                <p className="text-[11px] font-black text-slate-800 leading-snug truncate" title={item.name}>
                    {item.name}
                </p>
                <p className="text-sm font-black text-slate-900 mt-1">{php(item.price)}</p>
                {/* Stock bar */}
                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isOut ? "bg-red-300" : isLow ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                        style={{ width: isOut ? "4%" : `${Math.min(100, (item.stock_quantity / 30) * 100)}%` }}
                    />
                </div>
            </div>
        </motion.div>
    );
}

// Low Stock Row

function LowStockRow({ item, index }: { item: StockItem; index: number }) {
    const CatIcon = CAT_ICON[item.category] ?? Package;
    const isOut = item.stock_quantity === 0;
    const [imgErr, setImgErr] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${isOut ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                }`}
        >
            <div className="relative shrink-0">
                {item.image_url && !imgErr ? (
                    <img src={item.image_url} alt={item.name} onError={() => setImgErr(true)}
                        className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isOut ? "bg-red-100" : "bg-amber-100"}`}>
                        <CatIcon size={14} className={isOut ? "text-red-500" : "text-amber-600"} />
                    </div>
                )}
                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] font-black text-white flex items-center justify-center ${isOut ? "bg-red-500" : "bg-amber-500"}`}>
                    !
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-800 truncate">{item.name}</p>
                <p className={`text-[9px] font-bold ${isOut ? "text-red-500" : "text-amber-600"}`}>
                    {isOut ? "Out of stock" : `${item.stock_quantity} remaining`}
                </p>
            </div>
            <p className="text-[10px] font-black text-slate-600 shrink-0">{php(item.price)}</p>
        </motion.div>
    );
}

// Add Utang Modal

function AddUtangModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({
        customer_name: "",
        item_desc: "",
        amount: "",
        due_date: "",
        notes: "",
    });
    const [saving, setSaving] = useState(false);

    const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async () => {
        if (!form.customer_name.trim()) { toast.error("Customer name is required."); return; }
        if (!form.item_desc.trim()) { toast.error("Item description is required."); return; }
        const amt = parseFloat(form.amount);
        if (!form.amount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount."); return; }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Not logged in."); return; }

            const { error } = await supabase.from("utang_list").insert({
                user_id: user.id,
                customer_name: form.customer_name.trim(),
                item_desc: form.item_desc.trim(),
                amount: amt,
                amount_paid: 0,
                is_paid: false,
                due_date: form.due_date || null,
                notes: form.notes.trim() || null,
            });

            if (error) throw error;
            toast.success("Utang recorded successfully!");
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.18 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
                                <Users size={18} />
                            </div>
                            <div>
                                <h2 className="text-base font-black">Add Utang</h2>
                                <p className="text-violet-200 text-[11px] mt-0.5">Record a customer's debt</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-xl transition-colors mt-0.5">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Fields */}
                <div className="p-5 space-y-4">
                    {/* Customer Name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Customer Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.customer_name}
                            onChange={e => set("customer_name", e.target.value)}
                            placeholder="e.g. Juan dela Cruz"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-violet-400 focus:border-violet-300 transition-all"
                        />
                    </div>

                    {/* Item Description */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Items / Description <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.item_desc}
                            onChange={e => set("item_desc", e.target.value)}
                            placeholder="e.g. Lucky Me x5, C2 x3"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-violet-400 focus:border-violet-300 transition-all"
                        />
                    </div>

                    {/* Amount + Due Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                Amount (₱) <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={e => set("amount", e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-violet-400 focus:border-violet-300 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                Due Date <span className="text-slate-300 font-normal normal-case">(optional)</span>
                            </label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={e => set("due_date", e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:ring-2 ring-violet-400 focus:border-violet-300 transition-all"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Notes <span className="text-slate-300 font-normal normal-case">(optional)</span>
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={e => set("notes", e.target.value)}
                            placeholder="Any extra notes…"
                            rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-violet-400 focus:border-violet-300 transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? "Saving…" : "Save Utang"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Record Payment Modal

function MarkPaidModal({ record, onClose, onSaved }: {
    record: UtangRecord;
    onClose: () => void;
    onSaved: () => void;
}) {
    const remaining = safeNum(record.amount) - safeNum(record.amount_paid);
    const [amtStr, setAmtStr] = useState(remaining.toFixed(2));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const paid = parseFloat(amtStr);
        if (isNaN(paid) || paid <= 0) { toast.error("Enter a valid amount."); return; }
        if (paid > remaining) { toast.error(`Max payable is ${php(remaining)}.`); return; }

        setSaving(true);
        try {
            const newPaid = safeNum(record.amount_paid) + paid;
            const isPaid = newPaid >= safeNum(record.amount);
            const { error } = await supabase.from("utang_list")
                .update({ amount_paid: Math.min(newPaid, safeNum(record.amount)), is_paid: isPaid })
                .eq("id", record.id);
            if (error) throw error;
            toast.success(isPaid ? `${record.customer_name}'s utang is fully paid! ✅` : `${php(paid)} payment recorded.`);
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to update.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="font-black text-base">Record Payment</h2>
                            <p className="text-emerald-200 text-[11px] mt-0.5">{record.customer_name}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-xl transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="mt-4 bg-white/15 rounded-2xl p-3 text-center">
                        <p className="text-emerald-200 text-[9px] font-black uppercase tracking-widest">Remaining Balance</p>
                        <p className="text-2xl font-black text-white mt-0.5">{php(remaining)}</p>
                        <p className="text-emerald-300 text-[10px] mt-0.5">
                            {php(record.amount_paid)} paid of {php(record.amount)}
                        </p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Payment Amount (₱)
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={remaining}
                            value={amtStr}
                            onChange={e => setAmtStr(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-emerald-400 transition-all"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            Items: <span className="font-bold text-slate-600">{record.item_desc}</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            {saving ? "Saving…" : "Record"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardHome({ onViewAll }: { onViewAll?: (tab: string) => void } = {}) {
    const [stats, setStats] = useState<Stats>({
        totalProducts: 0,
        lowStockCount: 0,
        todaySales: 0,
        todayTransactions: 0,
    });
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
    const [utangList, setUtangList] = useState<UtangRecord[]>([]);
    const [utangTotal, setUtangTotal] = useState(0);
    const [utangEnabled, setUtangEnabled] = useState(false); // true once table confirmed to exist
    const [loading, setLoading] = useState(true);
    const [utangLoading, setUtangLoading] = useState(true);
    const [greeting, setGreeting] = useState("Good morning");
    const [showAddUtang, setShowAddUtang] = useState(false);
    const [payRecord, setPayRecord] = useState<UtangRecord | null>(null);

    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting("Good morning");
        else if (h < 17) setGreeting("Good afternoon");
        else setGreeting("Good evening");
    }, []);

    // Fetch utang (separate so it doesn't block main load)
    const fetchUtang = useCallback(async (uid: string) => {
        setUtangLoading(true);
        try {
            const { data, error } = await supabase
                .from("utang_list")
                .select("id, customer_name, item_desc, amount, amount_paid, is_paid, due_date, notes, created_at")
                .eq("user_id", uid)
                .eq("is_paid", false)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) {
                // Table doesn't exist yet — not an app error
                setUtangEnabled(false);
                setUtangList([]);
                setUtangTotal(0);
            } else {
                setUtangEnabled(true);
                const list: UtangRecord[] = data ?? [];
                setUtangList(list);
                setUtangTotal(list.reduce((s, r) => s + safeNum(r.amount) - safeNum(r.amount_paid), 0));
            }
        } catch {
            setUtangEnabled(false);
        } finally {
            setUtangLoading(false);
        }
    }, []);

    // Main dashboard data
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

            const [
                prodCount,
                mealCount,
                lowProdRes,
                lowMealRes,
                todayTxnRes,
                recentTxnRes,
                stockProdRes,
                stockMealRes,
            ] = await Promise.all([
                supabase.from("products")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user.id),

                supabase.from("prepared_meals")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user.id),

                // Low stock products (≤5 pcs)
                supabase.from("products")
                    .select("id, name, image_url, stock_quantity, price, category")
                    .eq("user_id", user.id)
                    .lte("stock_quantity", 5)
                    .order("stock_quantity", { ascending: true })
                    .limit(6),

                // Low stock meals (≤2 servings)
                supabase.from("prepared_meals")
                    .select("id, name, image_url, stock_quantity, price, category")
                    .eq("user_id", user.id)
                    .lte("stock_quantity", 2)
                    .order("stock_quantity", { ascending: true })
                    .limit(4),

                // Today's transactions (for stats)
                supabase.from("sales_transactions")
                    .select("id, total_amount")
                    .eq("user_id", user.id)
                    .gte("created_at", todayStart)
                    .lte("created_at", todayEnd),

                // Recent 6 transactions for sidebar
                supabase.from("sales_transactions")
                    .select("id, transaction_ref, total_amount, item_count, created_at")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(6),

                // Top-stocked products for image grid — hard limit 5 (combined with meals → max 6)
                supabase.from("products")
                    .select("id, name, image_url, stock_quantity, price, category")
                    .eq("user_id", user.id)
                    .gt("stock_quantity", 0)
                    .order("stock_quantity", { ascending: false })
                    .limit(6),

                // Meals for image grid — up to 3 (combined with products, still capped at 6)
                supabase.from("prepared_meals")
                    .select("id, name, image_url, stock_quantity, price, category")
                    .eq("user_id", user.id)
                    .gt("stock_quantity", 0)
                    .order("created_at", { ascending: false })
                    .limit(3),
            ]);

            // Stats
            const txns = todayTxnRes.data ?? [];
            setStats({
                totalProducts: (prodCount.count ?? 0) + (mealCount.count ?? 0),
                lowStockCount: (lowProdRes.data?.length ?? 0) + (lowMealRes.data?.length ?? 0),
                todaySales: txns.reduce((s: number, t: any) => s + safeNum(t.total_amount), 0),
                todayTransactions: txns.length,
            });

            // Recent sales
            setRecentSales(recentTxnRes.data ?? []);

            // Stock image grid — max 6 total
            const combined: StockItem[] = [
                ...(stockProdRes.data ?? []).map((p: any) => ({ ...p, source: "products" as const })),
                ...(stockMealRes.data ?? []).map((m: any) => ({ ...m, source: "prepared_meals" as const })),
            ];
            setStockItems(combined.slice(0, 6));

            // Low stock list — max 6
            const lowCombined: StockItem[] = [
                ...(lowProdRes.data ?? []).map((p: any) => ({ ...p, source: "products" as const })),
                ...(lowMealRes.data ?? []).map((m: any) => ({ ...m, source: "prepared_meals" as const })),
            ];
            setLowStockItems(lowCombined.slice(0, 6));

            // Utang (separate fetch so it silently handles missing table)
            fetchUtang(user.id);

        } catch (err) {
            console.error("Dashboard error:", err);
        } finally {
            setLoading(false);
        }
    }, [fetchUtang]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Re-fetch utang after add/pay
    const refreshUtang = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) fetchUtang(user.id);
    }, [fetchUtang]);

    const handleDeleteUtang = async (id: string) => {
        if (!confirm("Delete this utang record?")) return;
        const { error } = await supabase.from("utang_list").delete().eq("id", id);
        if (error) { toast.error("Failed to delete."); return; }
        toast.success("Record deleted.");
        refreshUtang();
    };

    // Values for render
    const now = new Date();
    const dateLabel = now.toLocaleDateString("en-PH", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const statCards = [
        {
            label: "Total Products",
            value: loading ? null : String(stats.totalProducts),
            sub: loading ? null : `${stats.totalProducts} SKU${stats.totalProducts !== 1 ? "s" : ""} tracked`,
            icon: Package,
            lightBg: "bg-blue-50", iconColor: "text-blue-500",
            valColor: "text-blue-700", border: "border-blue-100",
        },
        {
            label: "Today's Sales",
            value: loading ? null : phpShort(stats.todaySales),
            sub: loading ? null : `${stats.todayTransactions} order${stats.todayTransactions !== 1 ? "s" : ""} today`,
            icon: ShoppingBag,
            lightBg: "bg-emerald-50", iconColor: "text-emerald-500",
            valColor: "text-emerald-700", border: "border-emerald-100",
        },
        {
            label: "Low Stock",
            value: loading ? null : String(stats.lowStockCount),
            sub: loading ? null : stats.lowStockCount > 0 ? "Items need restock" : "All stocked up!",
            icon: AlertTriangle,
            lightBg: loading || stats.lowStockCount === 0 ? "bg-slate-50" : "bg-red-50",
            iconColor: loading || stats.lowStockCount === 0 ? "text-slate-300" : "text-red-500",
            valColor: loading || stats.lowStockCount === 0 ? "text-slate-400" : "text-red-600",
            border: loading || stats.lowStockCount === 0 ? "border-slate-100" : "border-red-100",
        },
        {
            label: "Utang Total",
            value: utangLoading ? null : !utangEnabled ? "—" : utangList.length === 0 ? "₱0" : phpShort(utangTotal),
            sub: utangLoading ? null : !utangEnabled ? "Run SQL to enable" : utangList.length === 0 ? "No unpaid debts" : `${utangList.length} unpaid`,
            icon: Users,
            lightBg: "bg-violet-50", iconColor: "text-violet-500",
            valColor: "text-violet-700", border: "border-violet-100",
        },
    ];

    return (
        <>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: "12px", fontSize: "13px", fontWeight: 600 } }} />

            <div className="space-y-6 pb-10">

                {/* ── Welcome Banner ── */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 55%,#0c2a4a 100%)" }}
                >
                    {/* Glow */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: "radial-gradient(circle at 15% 60%,rgba(59,130,246,.22) 0%,transparent 45%),radial-gradient(circle at 85% 20%,rgba(124,58,237,.18) 0%,transparent 40%)",
                    }} />
                    {/* Grid */}
                    <div className="absolute inset-0 opacity-[0.035]" style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                        backgroundSize: "40px 40px",
                    }} />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-blue-300 text-sm font-bold mb-1 flex items-center gap-1.5">
                                <Flame size={13} className="text-amber-400" />
                                {greeting} 👋
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                Marilyn&apos;s Store
                            </h1>
                            <p className="text-slate-400 text-xs font-medium mt-1.5">{dateLabel}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                                    Today&apos;s Revenue
                                </p>
                                {loading ? (
                                    <div className="h-7 w-24 bg-white/10 rounded-xl animate-pulse mt-1" />
                                ) : (
                                    <p className="text-white font-black text-2xl">{php(stats.todaySales)}</p>
                                )}
                                <p className="text-emerald-400 text-[10px] font-bold mt-0.5">
                                    {!loading && `${stats.todayTransactions} sale${stats.todayTransactions !== 1 ? "s" : ""} today`}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                                <TrendingUp size={24} className="text-emerald-400" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                    {statCards.map((c, i) => {
                        const Icon = c.icon;
                        return (
                            <motion.div
                                key={c.label}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className={`bg-white rounded-2xl border ${c.border} p-4 shadow-sm hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl ${c.lightBg} flex items-center justify-center`}>
                                        <Icon size={18} className={c.iconColor} />
                                    </div>
                                    <ArrowUpRight size={12} className="text-slate-200 mt-0.5" />
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
                                {c.value === null ? (
                                    <Skeleton className="h-6 w-20 mt-1 mb-1" />
                                ) : (
                                    <p className={`text-xl font-black ${c.valColor}`}>{c.value}</p>
                                )}
                                {c.sub === null ? (
                                    <Skeleton className="h-2.5 w-28 mt-1.5" />
                                ) : (
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.sub}</p>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                    {/* ─ LEFT: Stock image grid + Utang ─ */}
                    <div className="xl:col-span-2 space-y-5">

                        {/* Stock Overview — max 6 cards */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-black text-slate-900">Stock Overview</h2>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        Showing top 6 in-stock items
                                    </p>
                                </div>
                                <button
                                    onClick={() => onViewAll?.("products")}
                                    className="flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors"
                                >
                                    View All <ChevronRight size={11} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                            <Skeleton className="h-28 w-full rounded-none" />
                                            <div className="p-3 space-y-2">
                                                <Skeleton className="h-2.5 w-3/4" />
                                                <Skeleton className="h-2 w-1/2" />
                                                <Skeleton className="h-1 w-full mt-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : stockItems.length === 0 ? (
                                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                                        <Package size={22} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">No products yet</p>
                                    <p className="text-xs text-slate-300 mt-1">Add products in the Inventory tab</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {stockItems.map((item, i) => (
                                        <ProductCard key={`${item.source}-${item.id}`} item={item} index={i} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ─ Utang List ─ */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                                        <Users size={15} className="text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800">Utang List</h3>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {utangLoading
                                                ? "Loading…"
                                                : !utangEnabled
                                                    ? "Run SQL setup to enable"
                                                    : utangList.length === 0
                                                        ? "No unpaid debts 🎉"
                                                        : `${utangList.length} unpaid · Total: ${php(utangTotal)}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAddUtang(true)}
                                    disabled={!utangEnabled}
                                    title={!utangEnabled ? "Run utang_list.sql in Supabase first" : "Add utang"}
                                    className="flex items-center gap-1.5 text-[11px] font-black text-white bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl transition-all"
                                >
                                    <Plus size={12} /> Add Utang
                                </button>
                            </div>

                            {/* Table not set up */}
                            {!utangLoading && !utangEnabled && (
                                <div className="flex flex-col items-center py-12 text-center px-6">
                                    <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
                                        <FileText size={20} className="text-violet-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">Utang table not set up</p>
                                    <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                                        Run the <span className="font-black text-violet-500">utang_list.sql</span> file in your Supabase SQL Editor to enable this feature.
                                    </p>
                                </div>
                            )}

                            {/* Loading skeleton */}
                            {utangLoading && (
                                <div className="p-4 space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-pulse">
                                            <Skeleton className="w-9 h-9 shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-2.5 w-1/2" />
                                                <Skeleton className="h-2 w-3/4" />
                                            </div>
                                            <Skeleton className="h-4 w-14 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* All paid / empty */}
                            {!utangLoading && utangEnabled && utangList.length === 0 && (
                                <div className="flex flex-col items-center py-12 text-center">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                                        <Check size={22} className="text-emerald-400" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">All clear!</p>
                                    <p className="text-xs text-slate-300 mt-1">No unpaid customer debts.</p>
                                </div>
                            )}

                            {/* Utang rows */}
                            {!utangLoading && utangEnabled && utangList.length > 0 && (
                                <div className="divide-y divide-slate-50">
                                    {utangList.map((r, i) => {
                                        const remaining = safeNum(r.amount) - safeNum(r.amount_paid);
                                        const isOverdue = !!r.due_date && new Date(r.due_date) < now;
                                        return (
                                            <motion.div
                                                key={r.id}
                                                initial={{ opacity: 0, x: -6 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group"
                                            >
                                                {/* Avatar */}
                                                <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-xs font-black text-violet-600">
                                                        {r.customer_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-xs font-black text-slate-800">{r.customer_name}</p>
                                                        {isOverdue && (
                                                            <span className="text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full uppercase">
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{r.item_desc}</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {r.due_date && (
                                                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                                                <Calendar size={8} />
                                                                {new Date(r.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] text-slate-400">{timeAgo(r.created_at)}</span>
                                                        {safeNum(r.amount_paid) > 0 && (
                                                            <span className="text-[9px] text-emerald-600 font-bold">
                                                                Partial: {php(r.amount_paid)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Amount + Actions */}
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-black text-violet-700">{php(remaining)}</p>
                                                    <p className="text-[9px] text-slate-400">of {php(r.amount)}</p>
                                                    {/* Action buttons — visible on row hover */}
                                                    <div className="flex items-center gap-1 mt-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setPayRecord(r)}
                                                            title="Record payment"
                                                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                                                        >
                                                            <Check size={11} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUtang(r.id)}
                                                            title="Delete record"
                                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Footer total */}
                            {!utangLoading && utangEnabled && utangList.length > 0 && (
                                <div className="px-5 py-3 bg-violet-50/60 border-t border-violet-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">
                                        Total Receivable
                                    </span>
                                    <span className="text-sm font-black text-violet-700">{php(utangTotal)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─ RIGHT Sidebar ─ */}
                    <div className="space-y-4">

                        {/* Recent Sales */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Receipt size={14} className="text-slate-400" />
                                    <h3 className="text-sm font-black text-slate-800">Recent Sales</h3>
                                </div>
                                <button
                                    onClick={() => onViewAll?.("sales")}
                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
                                >
                                    View All <ChevronRight size={10} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="p-4 space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-pulse">
                                            <Skeleton className="w-9 h-9 shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-2.5 w-3/4" />
                                                <Skeleton className="h-2 w-1/2" />
                                            </div>
                                            <Skeleton className="h-3 w-10 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : recentSales.length === 0 ? (
                                <div className="flex flex-col items-center py-10 text-center">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-2">
                                        <Banknote size={16} className="text-slate-300" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">No sales yet</p>
                                    <p className="text-[10px] text-slate-300 mt-0.5">
                                        Use the POS to start selling
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {recentSales.map((sale, i) => (
                                        <motion.div
                                            key={sale.id}
                                            initial={{ opacity: 0, x: 6 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 + i * 0.05 }}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                <span className="text-[9px] font-black text-blue-500">#{i + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate">
                                                    {sale.transaction_ref}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5 mt-0.5">
                                                    <Clock size={8} />
                                                    {timeAgo(sale.created_at)} · {sale.item_count} item{sale.item_count !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 shrink-0">
                                                {php(sale.total_amount)}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Low Stock Alerts */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className={`px-4 py-3.5 border-b flex items-center justify-between ${!loading && lowStockItems.length > 0
                                    ? "bg-red-50/60 border-red-100"
                                    : "border-slate-100"
                                }`}>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={14} className={
                                        !loading && lowStockItems.length > 0 ? "text-red-500" : "text-slate-300"
                                    } />
                                    <h3 className={`text-sm font-black ${!loading && lowStockItems.length > 0 ? "text-red-700" : "text-slate-500"
                                        }`}>
                                        Low Stock Alert
                                    </h3>
                                </div>
                                {!loading && lowStockItems.length > 0 && (
                                    <span className="text-[9px] font-black text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                                        {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>

                            {loading ? (
                                <div className="p-3 space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 animate-pulse">
                                            <Skeleton className="w-9 h-9 shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-2.5 w-3/4" />
                                                <Skeleton className="h-2 w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : lowStockItems.length === 0 ? (
                                <div className="flex flex-col items-center py-10 text-center">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-2">
                                        <Check size={16} className="text-emerald-400" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">All stocked up!</p>
                                    <p className="text-[10px] text-slate-300 mt-0.5">No low stock alerts</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-1.5">
                                    {lowStockItems.map((item, i) => (
                                        <LowStockRow
                                            key={`${item.source}-${item.id}`}
                                            item={item}
                                            index={i}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showAddUtang && (
                    <AddUtangModal
                        onClose={() => setShowAddUtang(false)}
                        onSaved={refreshUtang}
                    />
                )}
                {payRecord && (
                    <MarkPaidModal
                        record={payRecord}
                        onClose={() => setPayRecord(null)}
                        onSaved={refreshUtang}
                    />
                )}
            </AnimatePresence>
        </>
    );
}