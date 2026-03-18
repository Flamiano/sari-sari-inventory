"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ShoppingCart, LogOut, Package, TrendingUp, Clock,
    Receipt, Search, Plus, Minus, Trash2, CreditCard,
    Banknote, CheckCircle2, Loader2, AlertTriangle,
    X, BarChart3, Grid3x3, Calendar, ChevronDown,
    DollarSign, ShoppingBag, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast, { Toaster } from "react-hot-toast";
import { logStaffAction } from "../staff-worker/DashboardStaff";

// ─── Types ────────────────────────────────────────────────────────
interface StaffData {
    id: string; full_name: string; email: string;
    role: string; status: string; owner_id: string; avatar_url: string | null;
}
interface Product {
    id: string; name: string; image_url: string | null;
    price: number; market_price: number; stock_quantity: number;
    category: string; subcategory?: string | null;
    source: "products" | "prepared_meals";
}
interface CartItem extends Product { qty: number; }
interface Transaction {
    id: string; created_at: string; transaction_ref: string;
    total_amount: number; amount_paid: number; change_amount: number;
    item_count: number; sold_by_name: string | null; sold_by_staff_id: string | null;
}
interface TxItem {
    transaction_id: string;
    product_id: string;
    product_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    profit: number;
}
type DatePreset = "today" | "week" | "month" | "custom";

// ─── Helpers ──────────────────────────────────────────────────────
function generateRef() {
    const n = new Date();
    return `TXN-${String(n.getFullYear()).slice(-2)}${String(n.getMonth() + 1).padStart(2, "0")}${String(n.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}
function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function timeAgo(d: string) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Compact: ₱1.7K / ₱2.3M — used in stat cards to prevent overflow
function phpShort(n: number): string {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
    return `₱${n.toFixed(2)}`;
}
// Compact integer (items, orders)
function numShort(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function getDateBounds(preset: DatePreset, cFrom?: string, cTo?: string) {
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
            const st = s.toISOString().split("T")[0];
            return {
                from: `${st}T00:00:00+08:00`,
                to: `${today}T23:59:59+08:00`,
                label: `${s.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`,
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
        case "custom": return {
            from: cFrom ? `${cFrom}T00:00:00+08:00` : `${today}T00:00:00+08:00`,
            to: cTo ? `${cTo}T23:59:59+08:00` : `${today}T23:59:59+08:00`,
            label: cFrom && cTo ? `${cFrom} → ${cTo}` : today,
        };
    }
}

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
    food: { bg: "rgba(234,179,8,.08)", color: "#ca8a04" },
    beverages: { bg: "rgba(8,145,178,.08)", color: "#0891b2" },
    snacks: { bg: "rgba(249,115,22,.08)", color: "#ea580c" },
    household: { bg: "rgba(16,185,129,.08)", color: "#059669" },
    personal_care: { bg: "rgba(168,85,247,.08)", color: "#9333ea" },
    prepared_meal: { bg: "rgba(239,68,68,.08)", color: "#dc2626" },
    almusal: { bg: "rgba(245,158,11,.08)", color: "#d97706" },
    "sari-sari": { bg: "rgba(59,130,246,.08)", color: "#3b82f6" },
    meryenda: { bg: "rgba(249,115,22,.08)", color: "#f97316" },
    default: { bg: "rgba(100,116,139,.08)", color: "#64748b" },
};
function cs(cat: string) {
    const k = cat.toLowerCase().replace(/\s+/g, "_");
    return CAT_COLORS[k] ?? CAT_COLORS[cat.toLowerCase()] ?? CAT_COLORS.default;
}

// ─── Logo ─────────────────────────────────────────────────────────
function Logo({ size = 32 }: { size?: number }) {
    const [err, setErr] = useState(false);
    if (err) {
        return (
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ width: size, height: size, background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                <ShoppingCart size={size * 0.48} className="text-white" strokeWidth={2.2} />
            </div>
        );
    }
    return (
        <img src="/images/logo.png" alt="Logo" onError={() => setErr(true)}
            className="rounded-xl object-contain flex-shrink-0"
            style={{ width: size, height: size }} />
    );
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function DashboardCashier({
    staff, ownerStoreName = "your store", ownerFullName = "",
}: { staff: StaffData; ownerStoreName?: string; ownerFullName?: string }) {
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [prodLoad, setProdLoad] = useState(true);
    const [search, setSearch] = useState("");
    const [activeCat, setActiveCat] = useState("all");

    const [cart, setCart] = useState<CartItem[]>([]);
    const [payMethod, setPayMethod] = useState<"cash" | "card">("cash");
    const [tendered, setTendered] = useState("");
    const [processing, setProc] = useState(false);
    const [showSuccess, setSuccess] = useState(false);
    const [lastChange, setLastCh] = useState(0);
    const [lastTotal, setLastTot] = useState(0);

    const [transactions, setTxns] = useState<Transaction[]>([]);
    const [txItems, setTxItems] = useState<Record<string, TxItem[]>>({});
    const [txLoad, setTxLoad] = useState(true);
    const [salesPreset, setSalesPreset] = useState<DatePreset>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [showCustom, setShowCustom] = useState(false);
    const [expandedTx, setExpandedTx] = useState<string | null>(null);

    const shiftStart = useRef(Date.now());
    const [shiftSec, setShiftSec] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setShiftSec(Math.floor((Date.now() - shiftStart.current) / 1000)), 10000);
        return () => clearInterval(t);
    }, []);

    const [mob, setMob] = useState<"pos" | "cart" | "sales">("pos");
    const [desk, setDesk] = useState<"pos" | "sales">("pos");
    const [confirmOut, setConfirmOut] = useState(false);

    // ── Fetch products ─────────────────────────────────────────
    const fetchProducts = useCallback(async () => {
        setProdLoad(true);
        try {
            const [{ data: p }, { data: m }] = await Promise.all([
                supabase.rpc("get_owner_products", { p_owner_id: staff.owner_id }),
                supabase.rpc("get_owner_meals", { p_owner_id: staff.owner_id }),
            ]);
            setProducts([
                ...((p ?? []) as any[]).map((x: any) => ({ id: x.id, name: x.name, image_url: x.image_url, price: +x.price, market_price: +x.market_price, stock_quantity: x.stock_quantity, category: x.category, subcategory: x.subcategory ?? null, source: "products" as const })),
                ...((m ?? []) as any[]).map((x: any) => ({ id: x.id, name: x.name, image_url: x.image_url, price: +x.price, market_price: +x.market_price, stock_quantity: x.stock_quantity, category: "Prepared Meal", subcategory: null, source: "prepared_meals" as const })),
            ]);
        } catch { toast.error("Failed to load products."); }
        finally { setProdLoad(false); }
    }, [staff.owner_id]);

    // ── Fetch sales ────────────────────────────────────────────
    const fetchSales = useCallback(async (preset: DatePreset, cFrom?: string, cTo?: string) => {
        setTxLoad(true);
        try {
            const bounds = getDateBounds(preset, cFrom, cTo);
            const { data } = await supabase.rpc("get_owner_transactions", {
                p_owner_id: staff.owner_id, p_from: bounds.from, p_to: bounds.to,
            });
            const list = (data ?? []) as Transaction[];
            setTxns(list);
            if (list.length > 0) {
                const { data: itemData } = await supabase.rpc("get_transaction_items", { p_transaction_ids: list.map(t => t.id) });
                if (itemData) {
                    const grouped: Record<string, TxItem[]> = {};
                    (itemData as TxItem[]).forEach(i => {
                        if (!grouped[i.transaction_id]) grouped[i.transaction_id] = [];
                        grouped[i.transaction_id].push(i);
                    });
                    setTxItems(grouped);
                }
            } else { setTxItems({}); }
        } catch { /* silent */ }
        finally { setTxLoad(false); }
    }, [staff.owner_id]);

    useEffect(() => { fetchProducts(); fetchSales("today"); }, [fetchProducts, fetchSales]);

    const handlePresetChange = (p: DatePreset) => {
        setSalesPreset(p);
        setShowCustom(p === "custom");
        if (p !== "custom") fetchSales(p);
    };

    // ── Cart ──────────────────────────────────────────────────
    const cKey = (p: Product) => `${p.source}-${p.id}`;

    const addToCart = (p: Product) => {
        if (p.stock_quantity <= 0) { toast.error(`${p.name} is out of stock.`); return; }
        setCart(prev => {
            const ex = prev.find(c => cKey(c) === cKey(p));
            if (ex) {
                if (ex.qty >= p.stock_quantity) {
                    toast.error(`Maximum stock reached (${p.stock_quantity}).`);
                    return prev;
                }
                return prev.map(c => cKey(c) === cKey(p) ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { ...p, qty: 1 }];
        });
    };

    const updQty = (key: string, d: number) => {
        setCart(prev => prev.map(c => {
            if (cKey(c) !== key) return c;
            if (d > 0 && c.qty >= c.stock_quantity) {
                toast.error(`Maximum stock reached (${c.stock_quantity}).`);
                return c;
            }
            return { ...c, qty: Math.max(0, c.qty + d) };
        }).filter(c => c.qty > 0));
    };

    const clearCart = () => { setCart([]); setTendered(""); };

    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const tenderedAmt = parseFloat(tendered) || 0;
    const change = tenderedAmt - cartTotal;
    const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];
    const filtered = products.filter(p =>
        (activeCat === "all" || p.category === activeCat) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalOrders = transactions.length;
    const totalItems = transactions.reduce((s, t) => s + t.item_count, 0);
    const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
    const productById = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Product>);

    // ── Checkout ──────────────────────────────────────────────
    const checkout = async () => {
        if (!cart.length) { toast.error("Cart is empty."); return; }
        if (payMethod === "cash" && !tendered) { toast.error("Enter cash tendered."); return; }
        if (payMethod === "cash" && tenderedAmt < cartTotal) { toast.error("Cash is less than total."); return; }
        setProc(true);
        try {
            const ref = generateRef();
            const paid = payMethod === "cash" ? tenderedAmt : cartTotal;
            const chng = payMethod === "cash" ? Math.max(0, change) : 0;
            const items = cart.map(i => ({
                product_id: i.id, product_source: i.source, product_name: i.name,
                category: i.category, subcategory: i.subcategory ?? null,
                quantity: i.qty, unit_price: i.price, unit_cost: i.market_price,
                subtotal: i.price * i.qty, profit: (i.price - i.market_price) * i.qty,
                stock_quantity: i.stock_quantity,
            }));
            const { error } = await supabase.rpc("staff_process_sale", {
                p_owner_id: staff.owner_id, p_staff_id: staff.id, p_staff_name: staff.full_name,
                p_transaction_ref: ref, p_total_amount: cartTotal,
                p_amount_paid: paid, p_change_amount: chng,
                p_item_count: cartCount, p_items: items,
            });
            if (error) throw error;
            setLastCh(chng); setLastTot(cartTotal);
            fetchProducts();
            fetchSales(salesPreset, customFrom, customTo);
            setProc(false); setSuccess(true);
            setTimeout(() => { setSuccess(false); clearCart(); setMob("pos"); }, 2600);
        } catch (e: any) { setProc(false); toast.error(e?.message ?? "Checkout failed."); }
    };

    const signOut = () => { sessionStorage.removeItem("staff_session"); router.replace("/auth/staff-cashier-worker-login"); };
    const initials = staff.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const bounds = getDateBounds(salesPreset, customFrom, customTo);

    return (
        <>
            <Toaster position="top-center" toastOptions={{
                style: { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: "0.875rem", borderRadius: "12px", border: "1px solid #e2e8f0" }
            }} />

            {/*
             * Font pairing — mirrors DashboardStaff exactly:
             *   body/ui  → Plus Jakarta Sans (same weights)
             *   headings/display numbers → Syne (700-900)
             */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
                *, *::before, *::after { font-family:'Plus Jakarta Sans',sans-serif; box-sizing:border-box; }
                h1,h2,h3,.syne { font-family:'Syne',sans-serif; }
                @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                ::-webkit-scrollbar { width:3px; height:3px; }
                ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:8px; }
                .no-scroll { -ms-overflow-style:none; scrollbar-width:none; }
                .no-scroll::-webkit-scrollbar { display:none; }
                @supports (padding-bottom: env(safe-area-inset-bottom)) {
                    .safe-pad  { padding-bottom: env(safe-area-inset-bottom); }
                    .content-safe { padding-bottom: calc(56px + env(safe-area-inset-bottom)); }
                }
                @media (max-width:1023px) { html,body { height:100%; overscroll-behavior:none; } }
            `}</style>

            {/* ── Sale complete overlay ─────────────────────── */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,.5)", backdropFilter: "blur(8px)" }}>
                        <motion.div initial={{ scale: .88, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .88 }}
                            transition={{ type: "spring", stiffness: 340, damping: 24 }}
                            className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl w-full max-w-xs">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .1, type: "spring", stiffness: 300 }}
                                className="w-20 h-20 rounded-full flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                                <CheckCircle2 size={38} className="text-white" />
                            </motion.div>
                            <div className="text-center">
                                <h2 className="text-xl font-black text-slate-900 syne">Sale Complete!</h2>
                                <p className="text-slate-400 text-sm mt-1">Transaction recorded successfully.</p>
                            </div>
                            <div className="w-full space-y-2">
                                <div className="bg-slate-50 rounded-xl px-5 py-3 border border-slate-100 flex justify-between items-center">
                                    <span className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                                    <span className="text-lg font-black text-slate-900 syne">{php(lastTotal)}</span>
                                </div>
                                {payMethod === "cash" && (
                                    <div className="bg-cyan-50 rounded-xl px-5 py-3 border border-cyan-100 flex justify-between items-center">
                                        <span className="text-[0.68rem] font-bold text-cyan-500 uppercase tracking-wider">Change</span>
                                        <span className="text-lg font-black text-cyan-700 syne">{php(lastChange)}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Sign-out confirm ──────────────────────────── */}
            <AnimatePresence>
                {confirmOut && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)" }}
                        onClick={() => setConfirmOut(false)}>
                        <motion.div initial={{ scale: .92 }} animate={{ scale: 1 }} exit={{ scale: .92 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <h3 className="font-black text-slate-900 text-base syne mb-1">Sign Out?</h3>
                            <p className="text-sm text-slate-400 mb-5">Your session will end. You'll need to log in again.</p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmOut(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
                                    Cancel
                                </button>
                                <button onClick={signOut}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all">
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8" }}>

                {/* ══════ HEADER ══════ */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                    <div className="px-3 sm:px-6">
                        <div className="flex items-center justify-between gap-3 h-14">

                            {/* Brand */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Logo size={30} />
                                <div className="hidden sm:block">
                                    <div className="font-black text-slate-900 text-[0.9rem] leading-none syne">
                                        SariSari<span className="text-cyan-600">.</span>POS
                                    </div>
                                    <div className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                                        Cashier Terminal
                                    </div>
                                </div>
                            </div>

                            {/* Desktop nav tabs */}
                            <nav className="hidden md:flex items-center gap-1">
                                {([
                                    { id: "pos", label: "Point of Sale", icon: <Grid3x3 size={16} /> },
                                    { id: "sales", label: "Sales Report", icon: <BarChart3 size={16} /> },
                                ] as const).map(t => (
                                    <button key={t.id} onClick={() => setDesk(t.id)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[0.82rem] font-semibold transition-all"
                                        style={{
                                            background: desk === t.id ? "rgba(8,145,178,0.08)" : "transparent",
                                            color: desk === t.id ? "#0891b2" : "#64748b",
                                        }}>
                                        {t.icon}{t.label}
                                    </button>
                                ))}
                            </nav>

                            {/* Right: avatar + sign out */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-white text-[0.6rem] flex-shrink-0 syne"
                                        style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                                        {initials}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[0.75rem] font-bold text-slate-800 leading-none">{staff.full_name}</p>
                                        <p className="text-[0.6rem] text-slate-400 capitalize mt-0.5">{staff.role}</p>
                                    </div>
                                </div>
                                <button onClick={() => setConfirmOut(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.78rem] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-100 transition-all">
                                    <LogOut size={13} /><span className="hidden sm:block">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Metrics strip */}
                    <div className="border-t border-slate-100 px-3 sm:px-6 py-2 grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/60">
                        {[
                            { label: "Today's Sales", val: txLoad ? "—" : php(totalSales), color: "#0891b2" },
                            { label: "Transactions", val: txLoad ? "—" : String(totalOrders), color: "#7c3aed" },
                            { label: "Shift Time", val: formatTime(shiftSec), color: "#059669" },
                        ].map(s => (
                            <div key={s.label} className="text-center px-2">
                                <div className="font-black text-[0.88rem] sm:text-[0.95rem] syne" style={{ color: s.color }}>{s.val}</div>
                                <div className="text-[0.55rem] sm:text-[0.62rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </header>

                {/* ══════ MOBILE (< lg) ══════ */}
                <div className="lg:hidden flex-1 flex flex-col overflow-hidden content-safe">
                    <AnimatePresence mode="wait">
                        {mob === "pos" && (
                            <motion.div key="mp" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .15 }}
                                className="flex-1 flex flex-col overflow-hidden">
                                <POSPanel products={filtered} loading={prodLoad} search={search} setSearch={setSearch}
                                    cats={categories} activeCat={activeCat} setActiveCat={setActiveCat}
                                    cart={cart} cKey={cKey} addToCart={addToCart} mobile />
                            </motion.div>
                        )}
                        {mob === "cart" && (
                            <motion.div key="mc" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: .15 }}
                                className="flex-1 flex flex-col overflow-hidden bg-white">
                                <CartPanel cart={cart} cartTotal={cartTotal} cartCount={cartCount}
                                    payMethod={payMethod} setPayMethod={setPayMethod}
                                    tendered={tendered} setTendered={setTendered}
                                    change={change} tenderedAmt={tenderedAmt}
                                    processing={processing} clearCart={clearCart} checkout={checkout}
                                    updQty={updQty} cKey={cKey} />
                            </motion.div>
                        )}
                        {mob === "sales" && (
                            <motion.div key="ms" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: .15 }}
                                className="flex-1 overflow-y-auto">
                                <SalesPanel
                                    transactions={transactions} txItems={txItems} txLoad={txLoad}
                                    totalSales={totalSales} totalOrders={totalOrders} totalItems={totalItems} avgOrder={avgOrder}
                                    salesPreset={salesPreset} onPreset={handlePresetChange}
                                    customFrom={customFrom} setCustomFrom={setCustomFrom}
                                    customTo={customTo} setCustomTo={setCustomTo}
                                    showCustom={showCustom} onApplyCustom={() => fetchSales("custom", customFrom, customTo)}
                                    expandedTx={expandedTx} setExpandedTx={setExpandedTx}
                                    bounds={bounds} productById={productById} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bottom nav */}
                    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 safe-pad">
                        <div className="grid grid-cols-3" style={{ height: "56px" }}>
                            {([
                                { id: "pos", label: "Products", Icon: Grid3x3 },
                                { id: "cart", label: "Cart", Icon: ShoppingCart },
                                { id: "sales", label: "Sales", Icon: BarChart3 },
                            ] as const).map(({ id, label, Icon }) => {
                                const active = mob === id;
                                return (
                                    <button key={id} onClick={() => setMob(id)}
                                        className="flex flex-col items-center justify-center gap-0.5 relative transition-all"
                                        style={{ color: active ? "#0891b2" : "#94a3b8" }}>
                                        <div className="relative">
                                            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                                            {id === "cart" && cartCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[0.55rem] font-black flex items-center justify-center">
                                                    {cartCount > 9 ? "9+" : cartCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[0.6rem] font-bold">{label}</span>
                                        {active && (
                                            <motion.div layoutId="mbnav"
                                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                                                style={{ background: "#0891b2" }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="safe-pad" style={{ background: "white" }} />
                    </nav>
                </div>

                {/* ══════ DESKTOP (≥ lg) ══════ */}
                <div className="hidden lg:flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 96px)" }}>
                    <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 gap-3">
                        <AnimatePresence mode="wait">
                            {desk === "pos" ? (
                                <motion.div key="dp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden gap-3">
                                    <POSPanel products={filtered} loading={prodLoad} search={search} setSearch={setSearch}
                                        cats={categories} activeCat={activeCat} setActiveCat={setActiveCat}
                                        cart={cart} cKey={cKey} addToCart={addToCart} mobile={false} />
                                </motion.div>
                            ) : (
                                <motion.div key="ds" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                                    <SalesPanel
                                        transactions={transactions} txItems={txItems} txLoad={txLoad}
                                        totalSales={totalSales} totalOrders={totalOrders} totalItems={totalItems} avgOrder={avgOrder}
                                        salesPreset={salesPreset} onPreset={handlePresetChange}
                                        customFrom={customFrom} setCustomFrom={setCustomFrom}
                                        customTo={customTo} setCustomTo={setCustomTo}
                                        showCustom={showCustom} onApplyCustom={() => fetchSales("custom", customFrom, customTo)}
                                        expandedTx={expandedTx} setExpandedTx={setExpandedTx}
                                        bounds={bounds} productById={productById} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="w-[320px] xl:w-[360px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                        <CartPanel cart={cart} cartTotal={cartTotal} cartCount={cartCount}
                            payMethod={payMethod} setPayMethod={setPayMethod}
                            tendered={tendered} setTendered={setTendered}
                            change={change} tenderedAmt={tenderedAmt}
                            processing={processing} clearCart={clearCart} checkout={checkout}
                            updQty={updQty} cKey={cKey} />
                    </div>
                </div>
            </div>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════
// POSPanel
// ═════════════════════════════════════════════════════════════════
function POSPanel({ products, loading, search, setSearch, cats, activeCat, setActiveCat, cart, cKey, addToCart, mobile }: {
    products: Product[]; loading: boolean; search: string; setSearch: (v: string) => void;
    cats: string[]; activeCat: string; setActiveCat: (v: string) => void;
    cart: CartItem[]; cKey: (p: Product) => string; addToCart: (p: Product) => void; mobile: boolean;
}) {
    return (
        <div className={`flex-1 flex flex-col overflow-hidden gap-3 ${mobile ? "p-3" : "p-0"}`}>
            <div className="relative flex-shrink-0">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 outline-none text-[0.87rem] text-slate-700 focus:border-cyan-400 transition-all shadow-sm" />
                {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"><X size={13} /></button>}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scroll flex-shrink-0">
                {cats.map(cat => {
                    const active = activeCat === cat; const c = cs(cat);
                    return (
                        <button key={cat} onClick={() => setActiveCat(cat)}
                            className="flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-[0.75rem] font-semibold transition-all capitalize whitespace-nowrap"
                            style={{ background: active ? c.bg : "white", color: active ? c.color : "#64748b", border: active ? `1.5px solid ${c.color}33` : "1.5px solid #e2e8f0" }}>
                            {cat === "all" ? "All Items" : cat}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                        {[...Array(12)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 animate-pulse aspect-[3/4]" />)}
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                        <Package size={32} className="text-slate-200" />
                        <p className="text-slate-400 text-sm font-medium">No products found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 pb-3">
                        {products.map(p => {
                            const c = cs(p.category);
                            const qty = cart.find(x => cKey(x) === cKey(p))?.qty ?? 0;
                            const oos = p.stock_quantity <= 0;
                            const low = !oos && p.stock_quantity < 5;
                            const atMax = qty >= p.stock_quantity;
                            return (
                                <motion.button key={cKey(p)} whileTap={{ scale: oos ? 1 : .94 }} onClick={() => addToCart(p)} disabled={oos}
                                    className="bg-white rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col"
                                    style={{ borderColor: qty > 0 ? "#0891b2" : "#f1f5f9", opacity: oos ? .5 : 1, boxShadow: qty > 0 ? "0 0 0 2px rgba(8,145,178,.12)" : "0 1px 3px rgba(0,0,0,.04)" }}>
                                    {qty > 0 && (
                                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.6rem] font-black z-10 syne"
                                            style={{ background: atMax ? "#ef4444" : "#0891b2" }}>
                                            {qty}
                                        </div>
                                    )}
                                    {low && <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[0.5rem] font-bold px-1 py-0.5 rounded-full z-10 uppercase tracking-wide">Low</div>}
                                    {oos && <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[0.5rem] font-bold px-1 py-0.5 rounded-full z-10 uppercase tracking-wide">Out</div>}
                                    <div className="w-full aspect-square flex items-center justify-center overflow-hidden rounded-t-2xl" style={{ background: c.bg }}>
                                        {p.image_url
                                            ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                            : <Package size={mobile ? 18 : 22} style={{ color: c.color }} />}
                                    </div>
                                    <div className="p-1.5 sm:p-2 flex flex-col flex-1">
                                        <p className="font-semibold text-slate-800 text-[0.7rem] sm:text-[0.78rem] leading-snug line-clamp-2 flex-1">{p.name}</p>
                                        <div className="flex items-end justify-between mt-1 gap-1">
                                            <p className="font-black text-[0.8rem] sm:text-[0.88rem] syne" style={{ color: "#0891b2" }}>{php(p.price)}</p>
                                            <p className="text-[0.58rem] text-slate-400 font-medium">{oos ? <span className="text-red-400">0</span> : p.stock_quantity}</p>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 flex justify-between text-[0.72rem] text-slate-400 font-medium px-0.5">
                <span><strong className="text-slate-600">{products.length}</strong> shown</span>
                {search && <button onClick={() => setSearch("")} className="text-cyan-500 font-bold hover:underline">Clear search</button>}
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════
// CartPanel
// ═════════════════════════════════════════════════════════════════
function CartPanel({ cart, cartTotal, cartCount, payMethod, setPayMethod, tendered, setTendered, change, tenderedAmt, processing, clearCart, checkout, updQty, cKey }: {
    cart: CartItem[]; cartTotal: number; cartCount: number;
    payMethod: "cash" | "card"; setPayMethod: (v: "cash" | "card") => void;
    tendered: string; setTendered: (v: string) => void;
    change: number; tenderedAmt: number;
    processing: boolean; clearCart: () => void; checkout: () => void;
    updQty: (k: string, d: number) => void; cKey: (p: Product) => string;
}) {
    return (
        <>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="font-black text-slate-900 text-[0.95rem] syne">Current Order</h2>
                    <p className="text-[0.68rem] text-slate-400 mt-0.5">
                        {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Empty cart"}
                    </p>
                </div>
                {cart.length > 0 && (
                    <button onClick={clearCart} className="text-[0.72rem] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                        <Trash2 size={10} /> Clear all
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <AnimatePresence>
                    {cart.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 gap-2">
                            <ShoppingCart size={34} className="text-slate-200" />
                            <p className="text-slate-300 text-sm font-semibold">Cart is empty</p>
                            <p className="text-slate-200 text-xs">Tap a product to add it</p>
                        </motion.div>
                    ) : cart.map(item => {
                        const k = cKey(item); const c = cs(item.category);
                        const atMax = item.qty >= item.stock_quantity;
                        return (
                            <motion.div key={k} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: c.bg }}>
                                    {item.image_url
                                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        : <Package size={14} style={{ color: c.color }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-[0.8rem] truncate">{item.name}</div>
                                    <div className="text-[0.68rem] text-slate-400">{php(item.price)} each</div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => updQty(k, -1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-red-200 hover:text-red-500 transition-all">
                                        {item.qty === 1 ? <Trash2 size={9} /> : <Minus size={9} />}
                                    </button>
                                    <span className="w-6 text-center font-black text-slate-800 text-[0.82rem] syne">{item.qty}</span>
                                    <button onClick={() => updQty(k, 1)} disabled={atMax}
                                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-200 hover:text-cyan-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Plus size={9} />
                                    </button>
                                </div>
                                <div className="text-[0.8rem] font-black text-slate-900 w-14 text-right syne flex-shrink-0">
                                    {php(item.price * item.qty)}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className="p-4 border-t border-slate-100 space-y-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold text-sm">Total</span>
                    <span className="font-black text-slate-900 text-2xl syne">{php(cartTotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {([{ id: "cash", label: "Cash", icon: <Banknote size={13} /> }, { id: "card", label: "Card", icon: <CreditCard size={13} /> }] as const).map(pm => (
                        <button key={pm.id} onClick={() => setPayMethod(pm.id)}
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[0.8rem] transition-all"
                            style={{
                                background: payMethod === pm.id ? "linear-gradient(135deg,#0891b2,#0e7490)" : "#f8fafc",
                                color: payMethod === pm.id ? "white" : "#64748b",
                                border: payMethod === pm.id ? "none" : "1.5px solid #e2e8f0",
                            }}>
                            {pm.icon}{pm.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence>
                    {payMethod === "cash" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-1.5">
                            <input type="number" inputMode="decimal" placeholder="Cash tendered (₱)" value={tendered} onChange={e => setTendered(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-[0.87rem] font-bold text-slate-800 focus:border-cyan-400 transition-all" />
                            {tendered && tenderedAmt >= cartTotal && cartTotal > 0 && <div className="text-[0.73rem] text-emerald-600 font-bold text-right">Change: {php(change)}</div>}
                            {tendered && tenderedAmt < cartTotal && cartTotal > 0 && (
                                <div className="text-[0.73rem] text-red-500 font-bold text-right flex items-center justify-end gap-1">
                                    <AlertTriangle size={9} />Short by {php(cartTotal - tenderedAmt)}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {payMethod === "cash" && cartTotal > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto no-scroll">
                        {[cartTotal, 20, 50, 100, 200, 500, 1000].filter((v, i, a) => v >= cartTotal && a.indexOf(v) === i).slice(0, 4).map(v => (
                            <button key={v} onClick={() => setTendered(String(v))}
                                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg border text-[0.72rem] font-bold transition-all"
                                style={{
                                    background: parseFloat(tendered) === v ? "#0891b2" : "white",
                                    color: parseFloat(tendered) === v ? "white" : "#64748b",
                                    borderColor: parseFloat(tendered) === v ? "#0891b2" : "#e2e8f0",
                                }}>
                                {v === cartTotal ? "Exact" : `₱${v}`}
                            </button>
                        ))}
                    </div>
                )}

                <button onClick={checkout}
                    disabled={processing || cart.length === 0 || (payMethod === "cash" && tendered !== "" && tenderedAmt < cartTotal)}
                    className="w-full relative overflow-hidden flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed syne text-[0.95rem]"
                    style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)", boxShadow: "0 8px 24px rgba(8,145,178,.35)" }}>
                    {processing && <span className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)", animation: "shimmer 1.5s ease-in-out infinite" }} />}
                    {processing ? <><Loader2 size={17} className="animate-spin" />Processing…</> : <><CheckCircle2 size={17} />Charge {php(cartTotal)}</>}
                </button>
            </div>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════
// SalesPanel — mobile-first redesign
// ═════════════════════════════════════════════════════════════════
function SalesPanel({ transactions, txItems, txLoad, totalSales, totalOrders, totalItems, avgOrder, salesPreset, onPreset, customFrom, setCustomFrom, customTo, setCustomTo, showCustom, onApplyCustom, expandedTx, setExpandedTx, bounds, productById }: {
    transactions: Transaction[]; txItems: Record<string, TxItem[]>; txLoad: boolean;
    totalSales: number; totalOrders: number; totalItems: number; avgOrder: number;
    salesPreset: DatePreset; onPreset: (p: DatePreset) => void;
    customFrom: string; setCustomFrom: (v: string) => void;
    customTo: string; setCustomTo: (v: string) => void;
    showCustom: boolean; onApplyCustom: () => void;
    expandedTx: string | null; setExpandedTx: (v: string | null) => void;
    bounds: { from: string; to: string; label: string };
    productById: Record<string, Product>;
}) {
    return (
        <div className="space-y-4 pb-4">

            {/* ── Hero total banner ── */}
            <div className="relative overflow-hidden rounded-none sm:rounded-2xl mx-0"
                style={{ background: "linear-gradient(135deg,#0c4a6e 0%,#0891b2 60%,#06b6d4 100%)" }}>
                {/* subtle grid texture */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="relative px-4 sm:px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-cyan-200 text-[0.62rem] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Calendar size={10} />
                                {bounds.label}
                            </p>
                            <p className="text-white text-[0.72rem] font-semibold opacity-80">Total Income</p>
                            {txLoad
                                ? <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse mt-1" />
                                : <p className="text-white font-black text-[2.2rem] leading-none syne mt-0.5">
                                    {phpShort(totalSales)}
                                </p>
                            }
                        </div>
                        {/* mini stats column */}
                        <div className="flex flex-col gap-2 text-right">
                            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 min-w-[80px]">
                                <p className="text-cyan-200 text-[0.55rem] font-bold uppercase tracking-wider">Orders</p>
                                {txLoad
                                    ? <div className="h-5 w-10 bg-white/10 rounded-lg animate-pulse mt-0.5 ml-auto" />
                                    : <p className="text-white font-black text-lg syne leading-tight">{numShort(totalOrders)}</p>
                                }
                            </div>
                            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 min-w-[80px]">
                                <p className="text-cyan-200 text-[0.55rem] font-bold uppercase tracking-wider">Items</p>
                                {txLoad
                                    ? <div className="h-5 w-10 bg-white/10 rounded-lg animate-pulse mt-0.5 ml-auto" />
                                    : <p className="text-white font-black text-lg syne leading-tight">{numShort(totalItems)}</p>
                                }
                            </div>
                        </div>
                    </div>

                    {/* Date filter pills inside banner */}
                    <div className="flex gap-1.5 overflow-x-auto no-scroll pb-0.5">
                        {([
                            { id: "today", label: "Today" },
                            { id: "week", label: "This Week" },
                            { id: "month", label: "This Month" },
                            { id: "custom", label: "Custom" },
                        ] as { id: DatePreset; label: string }[]).map(p => (
                            <button key={p.id} onClick={() => onPreset(p.id)}
                                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[0.72rem] font-bold uppercase tracking-wide transition-all whitespace-nowrap"
                                style={{
                                    background: salesPreset === p.id ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                                    color: salesPreset === p.id ? "white" : "rgba(255,255,255,0.6)",
                                    border: salesPreset === p.id ? "1.5px solid rgba(255,255,255,0.35)" : "1.5px solid rgba(255,255,255,0.12)",
                                }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-3 sm:px-4 space-y-4">

                {/* ── Custom range picker ── */}
                <AnimatePresence>
                    {showCustom && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap gap-2 items-end shadow-sm">
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[0.62rem] font-black text-slate-400 uppercase tracking-widest mb-1">From</p>
                                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-cyan-400 transition-all" />
                                </div>
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[0.62rem] font-black text-slate-400 uppercase tracking-widest mb-1">To</p>
                                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-cyan-400 transition-all" />
                                </div>
                                <button onClick={onApplyCustom} disabled={!customFrom || !customTo}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                                    style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                                    <Filter size={13} />Apply
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── 4 stat cards — 2×2 grid, compact numbers ── */}
                <div className="grid grid-cols-2 gap-2.5">
                    {[
                        {
                            label: "Total Income", icon: <DollarSign size={15} />,
                            color: "#0891b2", bg: "rgba(8,145,178,.08)",
                            val: txLoad ? null : phpShort(totalSales),
                            full: txLoad ? null : php(totalSales),
                        },
                        {
                            label: "Total Orders", icon: <Receipt size={15} />,
                            color: "#059669", bg: "rgba(5,150,105,.08)",
                            val: txLoad ? null : numShort(totalOrders),
                            full: null,
                        },
                        {
                            label: "Items Sold", icon: <ShoppingBag size={15} />,
                            color: "#f59e0b", bg: "rgba(245,158,11,.08)",
                            val: txLoad ? null : numShort(totalItems),
                            full: null,
                        },
                        {
                            label: "Avg. Order", icon: <TrendingUp size={15} />,
                            color: "#7c3aed", bg: "rgba(124,58,237,.08)",
                            val: txLoad ? null : phpShort(avgOrder),
                            full: txLoad ? null : php(avgOrder),
                        },
                    ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm overflow-hidden">
                            {/* Icon + label row */}
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: s.bg, color: s.color }}>
                                    {s.icon}
                                </div>
                                <p className="text-[0.62rem] font-bold text-slate-400 uppercase tracking-wider leading-tight">{s.label}</p>
                            </div>
                            {/* Big number — always fits because we use phpShort */}
                            {s.val === null
                                ? <div className="h-7 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
                                : <p className="font-black text-slate-900 leading-none syne truncate" style={{ fontSize: "clamp(1.15rem,5vw,1.5rem)" }}>
                                    {s.val}
                                </p>
                            }
                            {/* Full value subtitle when shortened */}
                            {s.full && s.val && s.full !== s.val && (
                                <p className="text-[0.58rem] text-slate-300 font-medium mt-0.5 truncate">{s.full}</p>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* ── Transaction log ── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                        <Receipt size={13} className="text-cyan-500" />
                        <h3 className="font-black text-slate-900 text-[0.9rem] syne">Transaction Log</h3>
                        <span className="text-[0.6rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">
                            {transactions.length} record{transactions.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {txLoad ? (
                        <div className="p-4 space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-9 h-9 bg-slate-100 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-2.5 bg-slate-100 rounded-xl w-1/2" />
                                        <div className="h-2 bg-slate-100 rounded-xl w-1/3" />
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-xl w-16 shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <Receipt size={20} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400">No transactions for this period.</p>
                            <p className="text-xs text-slate-300">Try adjusting the date range.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {transactions.map((t, i) => {
                                const items = txItems[t.id] ?? [];
                                const isExp = expandedTx === t.id;
                                const isStaff = !!t.sold_by_staff_id;
                                const seller = t.sold_by_name ?? "Store Owner";
                                const d = new Date(t.created_at);
                                return (
                                    <div key={t.id}>
                                        <button onClick={() => setExpandedTx(isExp ? null : t.id)}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 active:bg-slate-100 transition-colors text-left">
                                            {/* Index badge */}
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-cyan-100"
                                                style={{ background: "rgba(8,145,178,.06)" }}>
                                                <span className="text-[0.62rem] font-black text-cyan-500 syne">#{i + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Ref + badge */}
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-black text-slate-800 text-[0.78rem] syne truncate max-w-[130px]">{t.transaction_ref}</p>
                                                    <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isStaff ? "text-cyan-600 bg-cyan-50" : "text-violet-600 bg-violet-50"}`}>
                                                        {isStaff ? "Cashier" : "Owner"}
                                                    </span>
                                                </div>
                                                {/* Seller + time + items */}
                                                <p className="text-[0.65rem] text-slate-400 font-medium mt-0.5 truncate">
                                                    {seller} · {timeAgo(t.created_at)} · {t.item_count} item{t.item_count !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            {/* Amount */}
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-black text-slate-900 text-[0.88rem] syne">{phpShort(Number(t.total_amount))}</p>
                                                <p className="text-[0.6rem] text-emerald-500 font-bold">chg {phpShort(Number(t.change_amount))}</p>
                                            </div>
                                            <ChevronDown size={13} className="text-slate-300 flex-shrink-0 transition-transform duration-200"
                                                style={{ transform: isExp ? "rotate(180deg)" : "rotate(0deg)" }} />
                                        </button>

                                        {/* ── Expanded: items with images ── */}
                                        <AnimatePresence>
                                            {isExp && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .18 }} className="overflow-hidden">
                                                    <div className="px-4 pb-4 pt-1 bg-slate-50/60 border-t border-slate-100">
                                                        {/* Transaction meta */}
                                                        <div className="flex items-center justify-between mb-2.5 pt-1">
                                                            <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">Items Purchased</p>
                                                            <p className="text-[0.6rem] font-bold text-slate-400">
                                                                {d.toLocaleDateString("en-PH", { dateStyle: "medium" })} · {d.toLocaleTimeString("en-PH", { timeStyle: "short" })}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {items.length === 0 ? (
                                                                <p className="text-[0.72rem] text-slate-400 italic py-1">No item details available.</p>
                                                            ) : items.map((item, ii) => {
                                                                const prod = productById[item.product_id];
                                                                const imgUrl = prod?.image_url ?? null;
                                                                const c = cs(item.category);
                                                                return (
                                                                    <div key={ii} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-slate-100">
                                                                        {/* Product image — actual photo */}
                                                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                                                                            style={{ background: c.bg }}>
                                                                            {imgUrl
                                                                                ? <img src={imgUrl} alt={item.product_name} className="w-full h-full object-cover" />
                                                                                : <Package size={14} style={{ color: c.color }} />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-bold text-slate-800 text-[0.78rem] truncate">{item.product_name}</p>
                                                                            <p className="text-[0.65rem] text-slate-400">{item.quantity} × {php(item.unit_price)}</p>
                                                                        </div>
                                                                        <p className="font-black text-slate-900 text-[0.8rem] syne flex-shrink-0">{php(item.subtotal)}</p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Receipt total footer */}
                                                        <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                                                            <div>
                                                                <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-wider">Total</p>
                                                                <p className="text-[0.82rem] font-black text-slate-900 syne">{php(t.total_amount)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-wider">Paid</p>
                                                                <p className="text-[0.82rem] font-black text-slate-900 syne">{php(t.amount_paid)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[0.55rem] font-black text-emerald-500 uppercase tracking-wider">Change</p>
                                                                <p className="text-[0.82rem] font-black text-emerald-600 syne">{php(t.change_amount)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer summary bar */}
                    {!txLoad && transactions.length > 0 && (
                        <div className="px-4 py-3 bg-gradient-to-r from-cyan-50/80 to-sky-50/60 border-t border-cyan-100">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-[0.58rem] font-black text-cyan-400 uppercase tracking-widest">Period Total</p>
                                    <p className="font-black text-cyan-700 text-[0.88rem] syne">{phpShort(totalSales)}</p>
                                </div>
                                <div>
                                    <p className="text-[0.58rem] font-black text-cyan-400 uppercase tracking-widest">Orders</p>
                                    <p className="font-black text-cyan-700 text-[0.88rem] syne">{numShort(totalOrders)}</p>
                                </div>
                                <div>
                                    <p className="text-[0.58rem] font-black text-cyan-400 uppercase tracking-widest">Avg</p>
                                    <p className="font-black text-cyan-700 text-[0.88rem] syne">{phpShort(avgOrder)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}