"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    Receipt, Search, X, ChevronLeft, ChevronRight,
    Loader2, ChefHat, Store, UtensilsCrossed, Package,
    Calendar, TrendingUp, DollarSign, ShoppingBag,
    ChevronDown, ChevronUp, FileText, FileSpreadsheet,
    Eye, Tag, Filter, ArrowUpRight, Banknote, User, UserCheck,
    CheckCircle2, RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { supabase } from "@/app/utils/supabase";
import SecurePageGate from "./SecurePageGate";

// Types

interface TransactionItem {
    id: string;
    transaction_id: string;
    product_name: string;
    category: string;
    subcategory: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    subtotal: number;
    profit: number;
}

interface Transaction {
    id: string;
    created_at: string;
    transaction_ref: string;
    total_amount: number;
    amount_paid: number;
    change_amount: number;
    item_count: number;
    sold_by_name: string | null;
    sold_by_staff_id: string | null;
}

type DateFilter = "today" | "week" | "month" | "custom";
type CategoryFilter = "All" | "Almusal" | "Sari-Sari" | "Meryenda";
type SellerFilter = "all" | "owner" | "cashier";

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAGE_SIZE = 15;

const SARI_SARI_SUBCATEGORIES = [
    "Canned Goods", "Instant Noodles", "Rice & Grains", "Snacks", "Biscuits",
    "Bread", "Condiments", "Spreads", "Cooking Essentials", "Soft Drinks",
    "Bottled Water", "Juice Drinks", "Coffee", "Milk & Dairy", "Energy Drinks",
    "Powdered Drinks", "Candies", "Chocolates", "Ice Cream", "Laundry Detergent",
    "Dishwashing Liquid", "Bath Soap", "Shampoo", "Toothpaste", "Tissue & Wipes",
    "Cleaning Supplies", "Vitamins", "Basic Medicines", "Feminine Care",
    "Baby Products", "Cigarettes", "School Supplies", "Kitchenware", "Frozen Goods",
] as const;

const CAT_STYLE: Record<string, {
    bg: string; text: string; activeBg: string; border: string;
    icon: React.ElementType; fill: string; swatch: string;
}> = {
    All: { bg: "bg-slate-100", text: "text-slate-600", activeBg: "bg-slate-900", border: "border-slate-200", icon: Package, fill: "#64748b", swatch: "#e2e8f0" },
    Almusal: { bg: "bg-amber-50", text: "text-amber-700", activeBg: "bg-amber-500", border: "border-amber-200", icon: ChefHat, fill: "#f59e0b", swatch: "#fde68a" },
    "Sari-Sari": { bg: "bg-blue-50", text: "text-blue-700", activeBg: "bg-blue-600", border: "border-blue-200", icon: Store, fill: "#2563eb", swatch: "#bfdbfe" },
    Meryenda: { bg: "bg-orange-50", text: "text-orange-700", activeBg: "bg-orange-500", border: "border-orange-200", icon: UtensilsCrossed, fill: "#f97316", swatch: "#fed7aa" },
};

// DropdownSelect — reusable dropdown with dot/swatch indicators

interface DropdownOption {
    value: string;
    label: string;
    dot?: string;
    swatch?: string;
}

function DropdownSelect({
    label, value, options, onSelect, icon,
}: {
    label: string;
    value: string;
    options: DropdownOption[];
    onSelect: (v: string) => void;
    icon?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find(o => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border rounded-xl text-left transition-all w-full sm:w-auto"
                style={{
                    border: open ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                    boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                    minWidth: "150px",
                }}>
                {icon && <span className="text-slate-400">{icon}</span>}
                <div className="flex-1 min-w-0">
                    <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">{label}</p>
                    <p className="text-[0.8rem] font-black text-slate-800 leading-tight truncate">
                        {current?.value === "all" || current?.value === "All" ? `All ${label}s` : (current?.label ?? "All")}
                    </p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
                        style={{ minWidth: "200px" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">
                                {label}
                            </p>
                            {options.map(o => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => { onSelect(o.value); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                    {o.dot && (
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />
                                    )}
                                    {o.swatch && (
                                        <span className="w-3 h-3 rounded shrink-0 border border-slate-200" style={{ background: o.swatch }} />
                                    )}
                                    <span className={`text-[0.82rem] flex-1 ${value === o.value ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                        {o.label}
                                    </span>
                                    {value === o.value && (
                                        <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// DateDropdown — date range with custom inputs

function DateDropdown({
    value, onSelect, customFrom, customTo, onFromChange, onToChange, onApply,
}: {
    value: DateFilter;
    onSelect: (v: DateFilter) => void;
    customFrom: string; customTo: string;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
    onApply: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const DATE_OPTIONS: { id: DateFilter; label: string }[] = [
        { id: "today", label: "Today" },
        { id: "week", label: "This week" },
        { id: "month", label: "This month" },
        { id: "custom", label: "Custom range" },
    ];

    const displayLabel = (() => {
        if (value === "custom" && customFrom && customTo) {
            const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });
            return `${fmt(customFrom)} – ${fmt(customTo)}`;
        }
        return DATE_OPTIONS.find(o => o.id === value)?.label ?? "Today";
    })();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border rounded-xl text-left transition-all w-full sm:w-auto"
                style={{
                    border: open ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                    boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                    minWidth: "150px",
                }}>
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Date</p>
                    <p className="text-[0.8rem] font-black text-slate-800 leading-tight truncate">{displayLabel}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
                        style={{ minWidth: "220px" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Date range</p>
                            {DATE_OPTIONS.map(o => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => onSelect(o.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                    <span className={`text-[0.82rem] flex-1 ${value === o.id ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                        {o.label}
                                    </span>
                                    {value === o.id && (
                                        <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {value === "custom" && (
                            <div className="border-t border-slate-100 p-3 space-y-2">
                                <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Custom range</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customFrom}
                                        onChange={e => onFromChange(e.target.value)}
                                        className="flex-1 text-[0.75rem] font-medium text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-white"
                                        style={{ minWidth: 0 }}
                                    />
                                    <span className="text-[0.7rem] text-slate-300 font-bold shrink-0">—</span>
                                    <input
                                        type="date"
                                        value={customTo}
                                        onChange={e => onToChange(e.target.value)}
                                        className="flex-1 text-[0.75rem] font-medium text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-white"
                                        style={{ minWidth: 0 }}
                                    />
                                </div>
                                <button
                                    onClick={() => { onApply(); setOpen(false); }}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-[0.75rem] font-black hover:bg-blue-700 transition-colors">
                                    Apply
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// SubcategoryDropdown — scrollable subcategory list for Sari-Sari

function SubcategoryDropdown({
    value, onSelect,
}: {
    value: string;
    onSelect: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border rounded-xl text-left transition-all w-full sm:w-auto"
                style={{
                    border: open ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                    boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                    minWidth: "160px",
                }}>
                <Tag size={13} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Subcategory</p>
                    <p className="text-[0.8rem] font-black text-slate-800 leading-tight truncate">
                        {value === "All" ? "All Subcategories" : value}
                    </p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
                        style={{ minWidth: "210px", maxHeight: "260px", overflowY: "auto" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-white">Subcategory</p>
                            {["All", ...SARI_SARI_SUBCATEGORIES].map(sub => (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => { onSelect(sub); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left">
                                    <span className={`text-[0.82rem] flex-1 ${value === sub ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                        {sub === "All" ? "All Subcategories" : sub}
                                    </span>
                                    {value === sub && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Seller badge

function SellerBadge({ soldByName, soldByStaffId, small = false }: {
    soldByName: string | null;
    soldByStaffId: string | null;
    small?: boolean;
}) {
    const isCashier = !!soldByStaffId;
    const label = isCashier ? (soldByName ?? "Cashier") : "Store Owner";
    const sz = small ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-1";
    return (
        <span className={`inline-flex items-center gap-1 font-black rounded-md uppercase tracking-wide whitespace-nowrap ${sz} ${isCashier
            ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
            : "bg-violet-50 text-violet-700 border border-violet-200"
            }`}>
            {isCashier ? <UserCheck size={small ? 7 : 9} /> : <User size={small ? 7 : 9} />}
            {label}
        </span>
    );
}

// Transaction detail modal

function TransactionDetailModal({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
    const [items, setItems] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from("sales_transaction_items")
            .select("*")
            .eq("transaction_id", txn.id)
            .order("category")
            .then(({ data }) => { setItems(data ?? []); setLoading(false); });
    }, [txn.id]);

    const d = new Date(txn.created_at);
    const totalProfit = items.reduce((s, i) => s + Number(i.profit), 0);
    const isCashier = !!txn.sold_by_staff_id;
    const sellerLabel = isCashier ? (txn.sold_by_name ?? "Cashier") : "Store Owner";

    const grouped = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, TransactionItem[]>);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Receipt size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-black tracking-tight">{txn.transaction_ref}</h2>
                                <p className="text-slate-400 text-[11px] mt-0.5">
                                    {d.toLocaleDateString("en-PH", { dateStyle: "long" })} · {d.toLocaleTimeString("en-PH", { timeStyle: "short" })}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                            <X size={16} className="text-white" />
                        </button>
                    </div>

                    <div className="mb-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${isCashier
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                            }`}>
                            {isCashier ? <UserCheck size={10} /> : <User size={10} />}
                            Sold by: {sellerLabel}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: "Total", value: php(txn.total_amount), accent: false },
                            { label: "Profit", value: php(totalProfit), accent: true },
                            { label: "Items", value: String(txn.item_count), accent: false },
                        ].map(r => (
                            <div key={r.label} className={`rounded-2xl px-3 py-3 text-center ${r.accent ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-white/10"}`}>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{r.label}</p>
                                <p className={`text-sm font-black mt-1 ${r.accent ? "text-emerald-300" : "text-white"}`}>{r.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-slate-300" />
                        </div>
                    ) : Object.keys(grouped).length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-8">No items found.</p>
                    ) : (
                        Object.entries(grouped).map(([cat, catItems]) => {
                            const cs = CAT_STYLE[cat] ?? CAT_STYLE.All;
                            const CatIcon = cs.icon;
                            return (
                                <div key={cat}>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${cs.bg} mb-3`}>
                                        <CatIcon size={11} className={cs.text} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${cs.text}`}>{cat}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {catItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{item.product_name}</p>
                                                    {item.subcategory && (
                                                        <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                            <Tag size={8} /> {item.subcategory}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] text-slate-500">
                                                        <span className="font-black text-slate-700">{item.quantity}</span> × {php(item.unit_price)}
                                                    </p>
                                                    <p className="text-sm font-black text-slate-900">{php(item.subtotal)}</p>
                                                    <p className={`text-[9px] font-bold ${item.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                        +{php(item.profit)} profit
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-2 rounded-b-3xl">
                    {[
                        { label: "Total Amount", value: php(txn.total_amount) },
                        { label: "Amount Paid", value: php(txn.amount_paid) },
                        { label: "Change Given", value: php(txn.change_amount) },
                    ].map(r => (
                        <div key={r.label} className="flex justify-between text-xs text-slate-500 font-semibold">
                            <span>{r.label}</span><span className="text-slate-700">{r.value}</span>
                        </div>
                    ))}
                    <div className="flex justify-between text-sm font-black text-emerald-700 border-t border-slate-200 pt-2 mt-2">
                        <span>Total Profit</span><span>{php(totalProfit)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stat card

function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: string; sub?: string;
    icon: React.ElementType;
    color: { bg: string; icon: string; text: string };
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.bg}`}>
                    <Icon size={18} className={color.icon} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className={`text-xl font-black ${color.text}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-400 font-medium mt-1">{sub}</p>}
        </div>
    );
}

// PDF export

async function exportSalesPDF(transactions: Transaction[], allItems: TransactionItem[], label: string, dateLabel: string) {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const now = new Date();
    const refNumber = `RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const C = {
        black: [10, 10, 10] as [number, number, number], dark: [30, 30, 30] as [number, number, number],
        mid: [80, 80, 80] as [number, number, number], light: [150, 150, 150] as [number, number, number],
        rule: [210, 210, 210] as [number, number, number], bg: [247, 247, 247] as [number, number, number],
        white: [255, 255, 255] as [number, number, number], positive: [22, 101, 52] as [number, number, number],
        negative: [153, 27, 27] as [number, number, number],
    };
    const drawFrame = () => {
        doc.setDrawColor(...C.rule); doc.setLineWidth(0.25); doc.rect(8, 8, pw - 16, ph - 16);
        doc.setFillColor(...C.black); doc.rect(8, 8, 3.5, ph - 16, "F");
    };
    drawFrame();
    doc.setFillColor(...C.bg); doc.rect(11.5, 8, pw - 19.5, 26, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...C.black); doc.text("SARI-STORE", 17, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid); doc.text("Sales Report", 17, 26.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...C.black); doc.text("SALES REPORT", pw - 12, 20, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid); doc.text(`Ref: ${refNumber}`, pw - 12, 26.5, { align: "right" });
    const metaY = 42;
    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalProfit = allItems.reduce((s, i) => s + Number(i.profit), 0);
    const colW = (pw - 26) / 4;
    [["DATE RANGE", dateLabel], ["FILTER", label], ["TRANSACTIONS", String(transactions.length)], ["TOTAL SALES", `PHP ${totalSales.toFixed(2)}`]]
        .forEach(([lbl, val], i) => {
            const x = 16 + i * colW;
            doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...C.light); doc.text(lbl, x, metaY - 3.5);
            doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.dark); doc.text(val, x, metaY + 2);
        });
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.line(16, metaY + 5.5, pw - 10, metaY + 5.5);
    const summY = metaY + 10; const boxW = (pw - 26) / 4 - 1;
    [{ label: "TOTAL SALES", value: `PHP ${totalSales.toFixed(2)}`, note: "revenue" }, { label: "TOTAL PROFIT", value: `PHP ${totalProfit.toFixed(2)}`, note: "earned" }, { label: "TRANSACTIONS", value: String(transactions.length), note: "orders" }, { label: "ITEMS SOLD", value: String(transactions.reduce((s, t) => s + t.item_count, 0)), note: "units" }]
        .forEach((item, i) => {
            const x = 16 + i * (boxW + 1.5);
            doc.setFillColor(...C.bg); doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.rect(x, summY, boxW, 15, "FD");
            doc.setFillColor(...C.black); doc.rect(x, summY, 2, 15, "F");
            doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...C.light); doc.text(item.label, x + 4.5, summY + 4.5);
            doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.dark); doc.text(item.value, x + 4.5, summY + 10);
            doc.setFont("helvetica", "normal"); doc.setFontSize(5); doc.setTextColor(...C.light); doc.text(item.note, x + 4.5, summY + 13.5);
        });
    autoTable(doc, {
        startY: summY + 19,
        head: [["#", "Transaction Ref", "Date & Time", "Sold By", "Product", "Category", "Subcategory", "Qty", "Unit Price", "Subtotal", "Profit"]],
        body: allItems.map((item, i) => {
            const txn = transactions.find(t => t.id === item.transaction_id);
            const seller = txn?.sold_by_staff_id ? (txn?.sold_by_name ?? "Cashier") : "Store Owner";
            return [i + 1, txn?.transaction_ref ?? "—", txn ? new Date(txn.created_at).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" }) : "—", seller, item.product_name, item.category, item.subcategory ?? "—", item.quantity, `PHP ${Number(item.unit_price).toFixed(2)}`, `PHP ${Number(item.subtotal).toFixed(2)}`, `PHP ${Number(item.profit).toFixed(2)}`];
        }),
        theme: "grid",
        styles: { font: "helvetica", fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, lineColor: C.rule, lineWidth: 0.15, textColor: C.dark },
        headStyles: { fillColor: C.black, textColor: C.white, fontStyle: "bold", fontSize: 6.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: { 0: { halign: "center", cellWidth: 7, textColor: C.light }, 1: { fontStyle: "bold", cellWidth: 28 }, 10: { halign: "right", fontStyle: "bold" } },
        didParseCell(data: any) { if (data.section !== "body" || data.column.index !== 10) return; const n = parseFloat(String(data.cell.raw).replace("PHP ", "")); data.cell.styles.textColor = n >= 0 ? [...C.positive] : [...C.negative]; },
        didDrawPage() { drawFrame(); const pg = (doc as any).internal.getCurrentPageInfo().pageNumber; doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...C.light); doc.text("Sari-Store Sales Report", 16, ph - 12); doc.text(`Ref: ${refNumber}`, pw / 2, ph - 12, { align: "center" }); doc.text(`Page ${pg}  ·  ${now.toLocaleDateString("en-PH")}`, pw - 12, ph - 12, { align: "right" }); doc.setDrawColor(...C.rule); doc.setLineWidth(0.15); doc.line(16, ph - 15, pw - 10, ph - 15); },
    });
    doc.save(`sales-report-${label.toLowerCase().replace(/[\s/]+/g, "-")}-${refNumber}.pdf`);
}

async function exportSalesExcel(transactions: Transaction[], allItems: TransactionItem[], label: string, dateLabel: string) {
    const XLSXmod = await import("xlsx");
    const XLSX = XLSXmod.default ?? XLSXmod;
    const now = new Date();
    const ref = `RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalProfit = allItems.reduce((s, i) => s + Number(i.profit), 0);
    const rows = allItems.map((item, i) => {
        const txn = transactions.find(t => t.id === item.transaction_id);
        const d = txn ? new Date(txn.created_at) : new Date();
        const seller = txn?.sold_by_staff_id ? (txn?.sold_by_name ?? "Cashier") : "Store Owner";
        return [i + 1, txn?.transaction_ref ?? "—", d.toLocaleDateString("en-PH"), d.toLocaleTimeString("en-PH", { timeStyle: "short" }), seller, item.product_name, item.category, item.subcategory ?? "—", item.quantity, Number(item.unit_price).toFixed(2), Number(item.subtotal).toFixed(2), Number(item.profit).toFixed(2)];
    });
    const aoa: any[][] = [
        ["SARI-STORE — SALES REPORT"], [`Reference: ${ref}`],
        [`Filter: ${label}`, "", "", `Date Range: ${dateLabel}`],
        [`Total Sales: PHP ${totalSales.toFixed(2)}`, "", "", `Total Profit: PHP ${totalProfit.toFixed(2)}`],
        [`Transactions: ${transactions.length}`, "", "", `Date Exported: ${now.toLocaleDateString("en-PH", { dateStyle: "long" })}`],
        [],
        ["#", "Transaction Ref", "Date", "Time", "Sold By", "Product Name", "Category", "Subcategory", "Qty", "Unit Price (PHP)", "Subtotal (PHP)", "Profit (PHP)"],
        ...rows, [],
        ["SUMMARY"],
        ["Total Sales (PHP)", "", totalSales.toFixed(2)],
        ["Total Profit (PHP)", "", totalProfit.toFixed(2)],
        ["Total Transactions", "", transactions.length],
        ["Total Items Sold", "", allItems.reduce((s, i) => s + i.quantity, 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 4 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `sales-${label.toLowerCase().replace(/[\s/]+/g, "-")}-${ref}.xlsx`);
}

// Inner content

function SalesHistoryContent() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [allLineItems, setAllLineItems] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState<DateFilter>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
    const [subcategoryFilter, setSubcategoryFilter] = useState<string>("All");
    const [sellerFilter, setSellerFilter] = useState<SellerFilter>("all");
    const [page, setPage] = useState(1);
    const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
    const [detailTxn, setDetailTxn] = useState<Transaction | null>(null);
    const [expandedItems, setExpandedItems] = useState<Record<string, TransactionItem[]>>({});
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
    const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; sales: number; profit: number; qty: number }[]>([]);

    const getDateRange = useCallback((): { from: string; to: string; label: string } => {
        const now = new Date(); const todayStr = now.toISOString().split("T")[0];
        if (dateFilter === "today") return { from: `${todayStr}T00:00:00`, to: `${todayStr}T23:59:59`, label: `Today · ${now.toLocaleDateString("en-PH", { dateStyle: "medium" })}` };
        if (dateFilter === "week") { const s = new Date(now); s.setDate(now.getDate() - 6); return { from: `${s.toISOString().split("T")[0]}T00:00:00`, to: `${todayStr}T23:59:59`, label: `${s.toLocaleDateString("en-PH", { dateStyle: "medium" })} – ${now.toLocaleDateString("en-PH", { dateStyle: "medium" })}` }; }
        if (dateFilter === "month") { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { from: `${s.toISOString().split("T")[0]}T00:00:00`, to: `${todayStr}T23:59:59`, label: now.toLocaleDateString("en-PH", { month: "long", year: "numeric" }) }; }
        if (dateFilter === "custom" && customFrom && customTo) return { from: `${customFrom}T00:00:00`, to: `${customTo}T23:59:59`, label: `${customFrom} to ${customTo}` };
        return { from: `${todayStr}T00:00:00`, to: `${todayStr}T23:59:59`, label: "Today" };
    }, [dateFilter, customFrom, customTo]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { from, to } = getDateRange();

            const { data: txnData, error: txnErr } = await supabase
                .from("sales_transactions")
                .select("id,created_at,transaction_ref,total_amount,amount_paid,change_amount,item_count,sold_by_name,sold_by_staff_id")
                .eq("user_id", user.id)
                .gte("created_at", from)
                .lte("created_at", to)
                .order("created_at", { ascending: false });
            if (txnErr) throw txnErr;

            let txnList: Transaction[] = (txnData ?? []) as Transaction[];
            if (sellerFilter === "owner") txnList = txnList.filter(t => !t.sold_by_staff_id);
            if (sellerFilter === "cashier") txnList = txnList.filter(t => !!t.sold_by_staff_id);

            const txnIds = txnList.map(t => t.id);
            if (txnIds.length === 0) {
                setTransactions([]); setAllLineItems([]); setCategoryBreakdown([]);
                setPage(1); setExpandedTxn(null); setExpandedItems({});
                setLoading(false); return;
            }

            const { data: allItemsRaw } = await supabase.from("sales_transaction_items").select("*").in("transaction_id", txnIds);
            const allItems = (allItemsRaw ?? []) as TransactionItem[];

            let filteredItems = allItems;
            if (categoryFilter !== "All") {
                filteredItems = allItems.filter(i => i.category === categoryFilter);
                if (categoryFilter === "Sari-Sari" && subcategoryFilter !== "All")
                    filteredItems = filteredItems.filter(i => i.subcategory === subcategoryFilter);
            }
            const matchingTxnIds = new Set(filteredItems.map(i => (i as any).transaction_id));
            const visibleTxns = categoryFilter === "All" ? txnList : txnList.filter(t => matchingTxnIds.has(t.id));

            setTransactions(visibleTxns);
            setAllLineItems(allItems);
            setPage(1); setExpandedTxn(null); setExpandedItems({});

            const breakdown: Record<string, { sales: number; profit: number; qty: number }> = {};
            allItems.forEach((item: any) => { if (!breakdown[item.category]) breakdown[item.category] = { sales: 0, profit: 0, qty: 0 }; breakdown[item.category].sales += Number(item.subtotal); breakdown[item.category].profit += Number(item.profit); breakdown[item.category].qty += item.quantity; });
            setCategoryBreakdown(Object.entries(breakdown).map(([category, vals]) => ({ category, ...vals })).sort((a, b) => b.sales - a.sales));
        } catch { toast.error("Failed to load transactions."); }
        finally { setLoading(false); }
    }, [getDateRange, categoryFilter, subcategoryFilter, sellerFilter]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const toggleExpand = async (txnId: string) => {
        if (expandedTxn === txnId) { setExpandedTxn(null); return; }
        setExpandedTxn(txnId);
        if (expandedItems[txnId]) return;
        setLoadingItems(prev => ({ ...prev, [txnId]: true }));
        const { data } = await supabase.from("sales_transaction_items").select("*").eq("transaction_id", txnId).order("category");
        let items = (data ?? []) as TransactionItem[];
        if (categoryFilter !== "All") { items = items.filter(i => i.category === categoryFilter); if (categoryFilter === "Sari-Sari" && subcategoryFilter !== "All") items = items.filter(i => i.subcategory === subcategoryFilter); }
        setExpandedItems(prev => ({ ...prev, [txnId]: items }));
        setLoadingItems(prev => ({ ...prev, [txnId]: false }));
    };

    const filtered = transactions.filter(t =>
        t.transaction_ref.toLowerCase().includes(search.toLowerCase()) ||
        (t.sold_by_name ?? "").toLowerCase().includes(search.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const avgSale = transactions.length > 0 ? totalSales / transactions.length : 0;
    const filteredItems = categoryFilter === "All" ? allLineItems : allLineItems.filter((i: any) => i.category === categoryFilter && (categoryFilter !== "Sari-Sari" || subcategoryFilter === "All" || i.subcategory === subcategoryFilter));
    const totalProfit = filteredItems.reduce((s, i) => s + Number(i.profit), 0);
    const { label: dateLabel } = getDateRange();

    const filterLabel = categoryFilter === "All" ? "All Categories" : categoryFilter === "Sari-Sari" && subcategoryFilter !== "All" ? `${categoryFilter} › ${subcategoryFilter}` : categoryFilter;
    const exportItems = filteredItems.map(i => ({ ...i, transaction_id: (i as any).transaction_id ?? "" }));

    // check if any non-default filter is active
    const anyFilterActive = dateFilter !== "today" || categoryFilter !== "All" || sellerFilter !== "all" || subcategoryFilter !== "All";

    const resetFilters = () => {
        setDateFilter("today");
        setCategoryFilter("All");
        setSubcategoryFilter("All");
        setSellerFilter("all");
        setCustomFrom("");
        setCustomTo("");
    };

    const handleExportCSV = () => {
        if (!transactions.length) return toast.error("No data to export.");
        const rows = [["Transaction Ref", "Date", "Time", "Sold By", "Total Amount", "Amount Paid", "Change", "Items"], ...transactions.map(t => { const d = new Date(t.created_at); const seller = t.sold_by_staff_id ? (t.sold_by_name ?? "Cashier") : "Store Owner"; return [t.transaction_ref, d.toLocaleDateString("en-PH"), d.toLocaleTimeString("en-PH", { timeStyle: "short" }), seller, t.total_amount.toFixed(2), t.amount_paid.toFixed(2), t.change_amount.toFixed(2), t.item_count]; })];
        const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `sales-${Date.now()}.csv`; a.click();
        toast.success("CSV exported!");
    };
    const handleExportPDF = () => { if (!transactions.length) return toast.error("No data to export."); toast.promise(exportSalesPDF(transactions, exportItems, filterLabel, dateLabel), { loading: "Generating PDF…", success: "PDF exported!", error: "Export failed." }); };
    const handleExportExcel = () => { if (!transactions.length) return toast.error("No data to export."); toast.promise(exportSalesExcel(transactions, exportItems, filterLabel, dateLabel), { loading: "Generating Excel…", success: "Excel exported!", error: "Export failed." }); };

    const sellerBreakdown = transactions.reduce((acc, t) => {
        const isCashier = !!t.sold_by_staff_id;
        const key = isCashier ? (t.sold_by_name ?? "Unknown Cashier") : "Store Owner";
        if (!acc[key]) acc[key] = { name: key, count: 0, total: 0, isCashier };
        acc[key].count += 1; acc[key].total += Number(t.total_amount); return acc;
    }, {} as Record<string, { name: string; count: number; total: number; isCashier: boolean }>);
    const sellerList = Object.values(sellerBreakdown).sort((a, b) => b.total - a.total);

    return (
        <div className="space-y-6 pb-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales History</h1>
                    <p className="text-sm text-slate-500 mt-0.5">View transactions, filter by category & date, export reports.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"><FileSpreadsheet size={13} /> Excel</button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"><FileText size={13} /> PDF</button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"><FileSpreadsheet size={13} /> CSV</button>
                </div>
            </div>

            {/* Filters — dropdown style matching FeedbackView */}
            <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2.5">

                    {/* Date */}
                    <DateDropdown
                        value={dateFilter}
                        onSelect={v => setDateFilter(v)}
                        customFrom={customFrom}
                        customTo={customTo}
                        onFromChange={setCustomFrom}
                        onToChange={setCustomTo}
                        onApply={fetchTransactions}
                    />

                    {/* Category */}
                    <DropdownSelect
                        label="Category"
                        value={categoryFilter}
                        onSelect={v => { setCategoryFilter(v as CategoryFilter); setSubcategoryFilter("All"); }}
                        options={[
                            { value: "All", label: "All Categories" },
                            { value: "Almusal", label: "Almusal", swatch: "#fde68a" },
                            { value: "Sari-Sari", label: "Sari-Sari", swatch: "#bfdbfe" },
                            { value: "Meryenda", label: "Meryenda", swatch: "#fed7aa" },
                        ]}
                    />

                    {/* Subcategory — only visible when Sari-Sari is selected */}
                    {categoryFilter === "Sari-Sari" && (
                        <SubcategoryDropdown
                            value={subcategoryFilter}
                            onSelect={setSubcategoryFilter}
                        />
                    )}

                    {/* Seller */}
                    <DropdownSelect
                        label="Sold By"
                        value={sellerFilter}
                        onSelect={v => setSellerFilter(v as SellerFilter)}
                        options={[
                            { value: "all", label: "All Sales" },
                            { value: "owner", label: "Owner Only", dot: "#7c3aed" },
                            { value: "cashier", label: "Cashier Only", dot: "#0891b2" },
                        ]}
                    />

                    {/* Reset */}
                    {anyFilterActive && (
                        <button onClick={resetFilters}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[0.75rem] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-colors w-full sm:w-auto">
                            <RotateCcw size={12} />
                            Reset filters
                        </button>
                    )}
                </div>

                {/* Active filter summary */}
                {anyFilterActive && (
                    <p className="text-[0.68rem] text-slate-400 font-medium px-1">
                        Showing <span className="font-black text-slate-700">{filtered.length}</span> of{" "}
                        <span className="font-black text-slate-700">{transactions.length}</span> transactions
                        {dateFilter === "custom" && customFrom && customTo && (
                            <span className="ml-1">
                                · <span className="text-slate-600 font-semibold">{customFrom}</span>
                                {" – "}
                                <span className="text-slate-600 font-semibold">{customTo}</span>
                            </span>
                        )}
                    </p>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={DollarSign} label="Total Sales" value={php(totalSales)} sub="revenue collected" color={{ bg: "bg-emerald-100", icon: "text-emerald-600", text: "text-emerald-700" }} />
                <StatCard icon={TrendingUp} label="Total Profit" value={php(totalProfit)} sub="net earned" color={{ bg: "bg-blue-100", icon: "text-blue-600", text: "text-blue-700" }} />
                <StatCard icon={Receipt} label="Transactions" value={String(transactions.length)} sub="completed orders" color={{ bg: "bg-violet-100", icon: "text-violet-600", text: "text-violet-700" }} />
                <StatCard icon={ShoppingBag} label="Avg. Sale" value={php(avgSale)} sub="per transaction" color={{ bg: "bg-amber-100", icon: "text-amber-600", text: "text-amber-700" }} />
            </div>

            {/* Category + Seller breakdown */}
            {!loading && transactions.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {categoryFilter === "All" && categoryBreakdown.length > 0 && (
                        <div className={`${sellerList.length > 0 ? "lg:col-span-2" : "lg:col-span-3"} grid grid-cols-1 sm:grid-cols-${Math.min(categoryBreakdown.length, 3)} gap-3`}>
                            {categoryBreakdown.map(cat => {
                                const style = CAT_STYLE[cat.category] ?? CAT_STYLE.All; const CatIcon = style.icon;
                                const totalCatSales = categoryBreakdown.reduce((s, c) => s + c.sales, 0);
                                const pct = totalCatSales > 0 ? (cat.sales / totalCatSales * 100).toFixed(0) : "0";
                                return (
                                    <div key={cat.category} className={`bg-white rounded-2xl border ${style.border} p-5 shadow-sm`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-11 h-11 rounded-2xl ${style.bg} flex items-center justify-center`}><CatIcon size={20} className={style.text} /></div>
                                            <div className="flex-1"><p className={`text-sm font-black ${style.text}`}>{cat.category}</p><p className="text-[10px] text-slate-400 font-medium">{cat.qty} items · {pct}% of sales</p></div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3"><div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: style.fill }} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Sales</p><p className="text-sm font-black text-slate-800">{php(cat.sales)}</p></div>
                                            <div className={`rounded-xl p-3 ${cat.profit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Profit</p><p className={`text-sm font-black ${cat.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{php(cat.profit)}</p></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {sellerList.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center"><UserCheck size={14} className="text-slate-600" /></div>
                                <div><h3 className="text-sm font-black text-slate-800">Sold By</h3><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Cashier / Owner</p></div>
                            </div>
                            <div className="space-y-3">
                                {sellerList.map(s => {
                                    const pct = totalSales > 0 ? (s.total / totalSales * 100) : 0;
                                    return (
                                        <div key={s.name}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white flex-shrink-0 ${s.isCashier ? "bg-cyan-500" : "bg-violet-600"}`}>{s.isCashier ? "C" : "O"}</div>
                                                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{s.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-800 shrink-0">{php(s.total)}</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${s.isCashier ? "bg-cyan-400" : "bg-violet-500"}`} style={{ width: `${pct}%` }} /></div>
                                            <div className="flex justify-between mt-0.5"><span className="text-[9px] text-slate-400">{s.count} order{s.count !== 1 ? "s" : ""}</span><span className="text-[9px] text-slate-400">{pct.toFixed(0)}%</span></div>
                                        </div>
                                    );
                                })}
                                <div className="flex gap-3 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-violet-500" /><span className="text-[9px] text-slate-400 font-bold">Owner</span></div>
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-cyan-400" /><span className="text-[9px] text-slate-400 font-bold">Cashier</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Transaction list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search ref or seller name…"
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500 focus:bg-white transition-colors" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 ml-auto shrink-0">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
                </div>

                {!loading && paginated.length > 0 && (
                    <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                        <div className="w-7" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sold By</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Items</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</p>
                        <div className="w-9" />
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={28} className="animate-spin text-blue-400" />
                        <p className="text-sm text-slate-400 font-medium">Loading transactions…</p>
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3"><Receipt size={28} className="opacity-30" /></div>
                        <p className="text-sm font-bold">No transactions found</p>
                        <p className="text-xs mt-1 text-slate-300">Try a different date range or filter</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {paginated.map(txn => {
                            const d = new Date(txn.created_at); const isExpanded = expandedTxn === txn.id; const txnItems = expandedItems[txn.id] ?? [];
                            return (
                                <div key={txn.id}>
                                    <div className={`grid grid-cols-[auto_1fr_auto_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors ${isExpanded ? "bg-blue-50/40" : ""}`}>
                                        <button onClick={() => toggleExpand(txn.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${isExpanded ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600"}`}>
                                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800">{txn.transaction_ref}</p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{d.toLocaleDateString("en-PH", { dateStyle: "medium" })} · {d.toLocaleTimeString("en-PH", { timeStyle: "short" })}</p>
                                        </div>
                                        <div className="hidden sm:block shrink-0">
                                            <SellerBadge soldByName={txn.sold_by_name} soldByStaffId={txn.sold_by_staff_id} small />
                                        </div>
                                        <div className="text-center w-12 shrink-0">
                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-lg text-xs font-black text-slate-600">{txn.item_count}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-slate-900">{php(txn.total_amount)}</p>
                                            <p className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-0.5"><Banknote size={9} />{php(txn.change_amount)} change</p>
                                        </div>
                                        <button onClick={() => setDetailTxn(txn)} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0">
                                            <Eye size={15} />
                                        </button>
                                    </div>
                                    {isExpanded && (
                                        <div className="bg-blue-50/30 px-5 pb-4 pt-1">
                                            {loadingItems[txn.id] ? (
                                                <div className="flex items-center gap-2 py-4 text-slate-400"><Loader2 size={13} className="animate-spin" /><span className="text-xs font-medium">Loading items…</span></div>
                                            ) : txnItems.length === 0 ? (
                                                <p className="text-xs text-slate-400 py-3">No items match current filter.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {txnItems.map(item => {
                                                        const cs = CAT_STYLE[item.category] ?? CAT_STYLE.All;
                                                        return (
                                                            <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-slate-100 shadow-sm">
                                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${cs.bg} ${cs.text} shrink-0`}>{item.category}</span>
                                                                <p className="text-xs font-bold text-slate-700 flex-1 truncate">{item.product_name}</p>
                                                                {item.subcategory && <p className="text-[9px] text-slate-400 hidden md:flex items-center gap-1 shrink-0"><Tag size={7} />{item.subcategory}</p>}
                                                                <p className="text-[10px] text-slate-500 shrink-0"><span className="font-black text-slate-700">{item.quantity}</span> × {php(item.unit_price)}</p>
                                                                <p className="text-xs font-black text-slate-900 shrink-0">{php(item.subtotal)}</p>
                                                                <p className={`text-[9px] font-black shrink-0 ${item.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>+{php(item.profit)}</p>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="flex justify-end pt-1">
                                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-right">
                                                            <p className="text-[10px] text-emerald-600 font-bold">Subtotal <span className="font-black text-emerald-800">{php(txnItems.reduce((s, i) => s + Number(i.subtotal), 0))}</span><span className="mx-2 text-emerald-300">·</span>Profit <span className="font-black text-emerald-800">{php(txnItems.reduce((s, i) => s + Number(i.profit), 0))}</span></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && filtered.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-400">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${p === page ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-200"}`}>{p}</button>))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {detailTxn && <TransactionDetailModal txn={detailTxn} onClose={() => setDetailTxn(null)} />}
        </div>
    );
}

// Default export

export default function SalesHistoryView() {
    return (
        <SecurePageGate
            pageName="Sales History"
            pageIcon={<Receipt size={28} className="text-slate-700" />}
            gradientStyle={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}
        >
            <SalesHistoryContent />
        </SecurePageGate>
    );
}