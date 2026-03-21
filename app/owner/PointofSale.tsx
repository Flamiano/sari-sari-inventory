"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    ShoppingCart, Search, CreditCard, Trash2, Plus, Minus,
    X, Loader2, ChefHat, Store,
    UtensilsCrossed, CheckCircle2, Package,
    Banknote, RotateCcw, ChevronDown, Tag,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { supabase } from "@/app/utils/supabase";

// Types

type MainCategory = "Almusal" | "Sari-Sari" | "Meryenda";
type ProductSource = "products" | "prepared_meals";

const SARI_SARI_SUBCATEGORIES = [
    "All Sari-Sari",
    "Canned Goods", "Instant Noodles", "Rice & Grains", "Snacks", "Biscuits",
    "Bread", "Condiments", "Spreads", "Cooking Essentials", "Soft Drinks",
    "Bottled Water", "Juice Drinks", "Coffee", "Milk & Dairy", "Energy Drinks",
    "Powdered Drinks", "Candies", "Chocolates", "Ice Cream", "Laundry Detergent",
    "Dishwashing Liquid", "Bath Soap", "Shampoo", "Toothpaste", "Tissue & Wipes",
    "Cleaning Supplies", "Vitamins", "Basic Medicines", "Feminine Care",
    "Baby Products", "Cigarettes", "School Supplies", "Kitchenware", "Frozen Goods",
] as const;

interface POSProduct {
    id: string;
    name: string;
    price: number;
    market_price: number;
    stock_quantity: number;
    image_url: string | null;
    category: MainCategory;
    subcategory?: string | null;
    source: ProductSource;
}

interface CartItem extends POSProduct {
    qty: number;
}

// Helpers

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const cartKey = (p: POSProduct) => `${p.source}-${p.id}`;

// Category config

const CAT_CONFIG: Record<MainCategory | "All", {
    icon: React.ElementType;
    bg: string; text: string; activeBg: string; border: string; fill: string;
}> = {
    All: { icon: Package, bg: "bg-slate-100", text: "text-slate-600", activeBg: "bg-slate-900", border: "border-slate-200", fill: "#64748b" },
    Almusal: { icon: ChefHat, bg: "bg-amber-50", text: "text-amber-600", activeBg: "bg-amber-500", border: "border-amber-200", fill: "#f59e0b" },
    "Sari-Sari": { icon: Store, bg: "bg-blue-50", text: "text-blue-600", activeBg: "bg-blue-600", border: "border-blue-200", fill: "#2563eb" },
    Meryenda: { icon: UtensilsCrossed, bg: "bg-orange-50", text: "text-orange-600", activeBg: "bg-orange-500", border: "border-orange-200", fill: "#f97316" },
};

// Subcategory dropdown for Sari-Sari

function SubcategoryDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    return (
        <div className="relative shrink-0" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-xl text-left transition-all"
                style={{
                    border: open ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                    boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                }}>
                <Tag size={11} className="text-blue-400 shrink-0" />
                <span className="text-[0.72rem] font-black text-slate-700 truncate max-w-[120px]">
                    {value === "All Sari-Sari" ? "All" : value}
                </span>
                <ChevronDown size={11} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                        style={{ minWidth: "200px", maxHeight: "240px", overflowY: "auto" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1 text-[0.58rem] font-bold text-slate-400 uppercase tracking-widest">Subcategory</p>
                            {SARI_SARI_SUBCATEGORIES.map(sub => (
                                <button key={sub} type="button"
                                    onClick={() => { onSelect(sub); setOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left">
                                    <span className={`text-[0.8rem] flex-1 ${value === sub ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                        {sub === "All Sari-Sari" ? "All Subcategories" : sub}
                                    </span>
                                    {value === sub && <CheckCircle2 size={12} className="text-blue-500 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Receipt modal

function ReceiptModal({ cart, total, amountPaid, onClose, transactionRef }: {
    cart: CartItem[];
    total: number;
    amountPaid: number;
    onClose: () => void;
    transactionRef: string;
}) {
    const change = amountPaid - total;
    const now = new Date();

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: "90dvh" }}>
                {/* drag handle */}
                <div className="flex justify-center pt-3 sm:hidden">
                    <div className="w-9 h-1 rounded-full bg-emerald-200" />
                </div>

                <div className="bg-emerald-600 p-6 text-white text-center shrink-0">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={28} className="text-white" />
                    </div>
                    <h2 className="text-lg font-black">Payment Successful!</h2>
                    <p className="text-emerald-100 text-xs mt-1">Transaction #{transactionRef}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">
                        <span>{now.toLocaleDateString("en-PH", { dateStyle: "medium" })}</span>
                        <span>{now.toLocaleTimeString("en-PH", { timeStyle: "short" })}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                        {cart.map(item => (
                            <div key={cartKey(item)} className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">{item.qty} × {php(item.price)}</p>
                                </div>
                                <p className="text-sm font-bold text-slate-800 shrink-0">{php(item.price * item.qty)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-3" />

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold text-slate-500">
                            <span>Subtotal</span><span>{php(total)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-slate-500">
                            <span>Amount Paid</span><span>{php(amountPaid)}</span>
                        </div>
                        <div className="flex justify-between text-base font-black text-emerald-700 border-t border-slate-100 pt-2">
                            <span>Change</span><span>{php(change)}</span>
                        </div>
                    </div>

                    <p className="text-center text-[10px] text-slate-300 mt-5 font-medium">
                        Thank you for your purchase! — Sari-Store
                    </p>
                </div>

                <div className="p-4 border-t border-slate-100 shrink-0"
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}>
                    <button onClick={onClose}
                        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95">
                        <RotateCcw size={14} /> New Sale
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Checkout modal

function CheckoutModal({ cart, total, onClose, onSuccess }: {
    cart: CartItem[];
    total: number;
    onClose: () => void;
    onSuccess: (amountPaid: number, ref: string) => void;
}) {
    const [amountPaid, setAmountPaid] = useState("");
    const [processing, setProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

    const paid = parseFloat(amountPaid || "0");
    const change = paid - total;
    const isValid = paid >= total;

    const presets = [total, 20, 50, 100, 200, 500, 1000]
        .filter((v, i, a) => v >= total && a.indexOf(v) === i)
        .slice(0, 4);

    const handleConfirm = async () => {
        if (!isValid) return;
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const now = new Date();
            const ref = `TXN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
            const totalQty = cart.reduce((s, c) => s + c.qty, 0);

            const { data: txn, error: txnErr } = await supabase
                .from("sales_transactions")
                .insert({
                    user_id: user.id,
                    transaction_ref: ref,
                    total_amount: total,
                    amount_paid: paid,
                    change_amount: change,
                    item_count: totalQty,
                })
                .select("id")
                .single();
            if (txnErr) throw txnErr;

            await Promise.all(cart.map(async (item) => {
                const costPerUnit = item.source === "prepared_meals"
                    ? item.market_price / item.stock_quantity
                    : item.market_price;
                const profitTotal = (item.price - costPerUnit) * item.qty;

                const { error: liErr } = await supabase.from("sales_transaction_items").insert({
                    transaction_id: txn.id,
                    product_id: item.id,
                    product_source: item.source,
                    product_name: item.name,
                    category: item.category,
                    subcategory: item.subcategory ?? null,
                    quantity: item.qty,
                    unit_price: item.price,
                    unit_cost: costPerUnit,
                    subtotal: item.price * item.qty,
                    profit: profitTotal,
                });
                if (liErr) throw liErr;

                const { error: stockErr } = await supabase
                    .from(item.source)
                    .update({ stock_quantity: item.stock_quantity - item.qty })
                    .eq("id", item.id);
                if (stockErr) throw stockErr;
            }));

            onSuccess(paid, ref);
        } catch (err: any) {
            toast.error(err.message || "Transaction failed.");
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden">
                {/* drag handle */}
                <div className="flex justify-center pt-3 sm:hidden">
                    <div className="w-9 h-1 rounded-full bg-blue-200" />
                </div>

                <div className="bg-blue-600 p-5 text-white shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Banknote size={18} />
                            <h2 className="text-base font-black">Confirm Payment</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                            <X size={16} className="text-white" />
                        </button>
                    </div>
                    <p className="text-blue-100 text-xs">{cart.length} item{cart.length !== 1 ? "s" : ""} · Total due</p>
                    <p className="text-3xl font-black mt-2">{php(total)}</p>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                            Amount Tendered (₱)
                        </label>
                        <input
                            ref={inputRef}
                            type="number"
                            min={total}
                            step="0.01"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            placeholder={`Min. ${php(total)}`}
                            className={`w-full px-4 py-3 border rounded-xl text-xl font-black outline-none transition-all ${amountPaid && !isValid
                                ? "bg-red-50 border-red-400 ring-2 ring-red-200 text-red-600"
                                : amountPaid && isValid
                                    ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 text-emerald-700"
                                    : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500"
                                }`}
                        />
                        {amountPaid && !isValid && (
                            <p className="text-[11px] text-red-500 font-bold mt-1 pl-1">Amount is less than total due.</p>
                        )}
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick Amount</p>
                        <div className="grid grid-cols-4 gap-1.5">
                            {presets.map(v => (
                                <button key={v} onClick={() => setAmountPaid(String(v))}
                                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${parseFloat(amountPaid) === v
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                                        }`}>
                                    {v === total ? "Exact" : `₱${v}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isValid && paid > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex justify-between items-center">
                            <span className="text-sm font-bold text-emerald-700">Change</span>
                            <span className="text-xl font-black text-emerald-700">{php(change)}</span>
                        </div>
                    )}

                    <button onClick={handleConfirm} disabled={!isValid || processing}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {processing ? "Processing…" : "Confirm Payment"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Product card

function ProductCard({ product, inCart, onAdd }: {
    product: POSProduct;
    inCart: number;
    onAdd: () => void;
}) {
    const cfg = CAT_CONFIG[product.category];
    const outOfStock = product.stock_quantity === 0;
    const lowStock = product.stock_quantity > 0 && product.stock_quantity < 5;

    return (
        <button
            onClick={!outOfStock ? onAdd : undefined}
            disabled={outOfStock}
            className={`group relative bg-white rounded-xl sm:rounded-2xl border text-left flex flex-col transition-all overflow-hidden ${outOfStock
                ? "border-slate-100 opacity-50 cursor-not-allowed"
                : inCart > 0
                    ? "border-blue-300 shadow-md ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-95"
                }`}
        >
            <div className={`w-full aspect-square flex items-center justify-center overflow-hidden ${cfg.bg}`}>
                {product.image_url ? (
                    <img src={product.image_url} alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        {React.createElement(cfg.icon, { size: 24, className: cfg.text })}
                    </div>
                )}
                {inCart > 0 && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-[9px] font-black text-white">{inCart}</span>
                    </div>
                )}
                {lowStock && (
                    <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Low
                    </div>
                )}
            </div>

            <div className="p-2 flex flex-col flex-1">
                <p className="text-[11px] font-bold text-slate-700 leading-tight line-clamp-2 flex-1">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-black text-slate-900">{php(product.price)}</p>
                    <span className="text-[8px] text-slate-400 font-bold">
                        {product.stock_quantity}{product.source === "prepared_meals" ? "s" : ""}
                    </span>
                </div>
            </div>
        </button>
    );
}

// Cart item row

function CartRow({ item, onIncrease, onDecrease, onRemove }: {
    item: CartItem;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
}) {
    const cfg = CAT_CONFIG[item.category];
    const Icon = cfg.icon;
    return (
        <div className="flex items-center gap-2.5 py-2.5 border-b border-slate-50 last:border-0">
            <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 overflow-hidden`}>
                {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : <Icon size={14} className={cfg.text} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{php(item.price)} each</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button onClick={onDecrease}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                    <Minus size={9} />
                </button>
                <span className="w-5 text-center text-xs font-black text-slate-800">{item.qty}</span>
                <button onClick={onIncrease}
                    disabled={item.qty >= item.stock_quantity}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40">
                    <Plus size={9} />
                </button>
            </div>
            <div className="text-right shrink-0 min-w-[46px]">
                <p className="text-xs font-black text-slate-800">{php(item.price * item.qty)}</p>
                <button onClick={onRemove} className="text-[9px] text-red-400 hover:text-red-600 font-bold transition-colors">
                    remove
                </button>
            </div>
        </div>
    );
}

// Main POS component

export default function PointofSaleView() {
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<MainCategory | "All">("All");
    const [activeSub, setActiveSub] = useState<string>("All Sari-Sari");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [receiptData, setReceiptData] = useState<{ amountPaid: number; ref: string } | null>(null);

    // mobile: "products" | "cart"
    const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const results: POSProduct[] = [];
            const [sariRes, mealRes] = await Promise.all([
                supabase.from("products").select("id,name,price,market_price,stock_quantity,image_url,category,subcategory").order("name"),
                supabase.from("prepared_meals").select("id,name,price,market_price,stock_quantity,image_url,category").order("name"),
            ]);
            if (sariRes.error) throw sariRes.error;
            if (mealRes.error) throw mealRes.error;
            (sariRes.data ?? []).forEach((r: any) => results.push({ ...r, source: "products" }));
            (mealRes.data ?? []).forEach((r: any) => results.push({ ...r, source: "prepared_meals" }));
            setProducts(results);
        } catch {
            toast.error("Failed to load products.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.subcategory ?? "").toLowerCase().includes(search.toLowerCase());
        if (activeCategory === "All") return matchSearch;
        if (activeCategory !== p.category) return false;
        if (activeCategory === "Sari-Sari" && activeSub !== "All Sari-Sari")
            return matchSearch && p.subcategory === activeSub;
        return matchSearch;
    });

    const addToCart = (product: POSProduct) => {
        setCart(prev => {
            const existing = prev.find(c => cartKey(c) === cartKey(product));
            if (existing) {
                if (existing.qty >= product.stock_quantity) { toast.error("No more stock available."); return prev; }
                return prev.map(c => cartKey(c) === cartKey(product) ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (key: string, delta: number) => {
        setCart(prev => prev.map(c => cartKey(c) === key ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
    };

    const removeFromCart = (key: string) => setCart(prev => prev.filter(c => cartKey(c) !== key));
    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const cartItemCount = cart.reduce((s, c) => s + c.qty, 0);

    const handlePaymentSuccess = (amountPaid: number, ref: string) => {
        setShowCheckout(false);
        setReceiptData({ amountPaid, ref });
        fetchProducts();
    };

    const handleReceiptClose = () => {
        setReceiptData(null);
        clearCart();
        setSearch("");
        setMobileTab("products");
    };

    // Products panel — shared between desktop and mobile

    const ProductsPanel = (
        <div className="flex flex-col gap-2 min-w-0 flex-1 overflow-hidden">

            {/* Search + subcategory row */}
            <div className="flex gap-2 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products…"
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-sm outline-none focus:ring-2 ring-blue-500/30 transition-all" />
                    {search && (
                        <button onClick={() => setSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <X size={12} />
                        </button>
                    )}
                </div>
                {activeCategory === "Sari-Sari" && (
                    <SubcategoryDropdown value={activeSub} onSelect={setActiveSub} />
                )}
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 shrink-0" style={{ scrollbarWidth: "none" }}>
                {(["All", "Almusal", "Sari-Sari", "Meryenda"] as (MainCategory | "All")[]).map(cat => {
                    const cfg = CAT_CONFIG[cat];
                    const Icon = cfg.icon;
                    const active = activeCategory === cat;
                    return (
                        <button key={cat}
                            onClick={() => {
                                setActiveCategory(cat);
                                if (cat !== "Sari-Sari") setActiveSub("All Sari-Sari");
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap border ${active
                                ? `${cfg.activeBg} text-white border-transparent shadow-sm`
                                : `bg-white ${cfg.text} ${cfg.border} hover:opacity-80`
                                }`}>
                            <Icon size={11} /> {cat}
                        </button>
                    );
                })}
            </div>

            {/* Product grid — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                        <Loader2 size={24} className="animate-spin text-slate-400" />
                        <p className="text-sm text-slate-400 font-medium">Loading products…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Package size={36} className="opacity-20" />
                        <p className="text-sm font-medium">No products found.</p>
                        {search && (
                            <button onClick={() => setSearch("")} className="text-xs text-blue-500 font-bold hover:underline">
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 pb-3">
                        {filtered.map(product => {
                            const inCart = cart.find(c => cartKey(c) === cartKey(product))?.qty ?? 0;
                            return (
                                <ProductCard key={cartKey(product)} product={product} inCart={inCart} onAdd={() => addToCart(product)} />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Count bar */}
            <div className="bg-white border border-slate-100 rounded-xl px-3 py-2 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
                <span><strong className="text-slate-600">{filtered.length}</strong> shown</span>
                <span><strong className="text-slate-600">{products.length}</strong> total</span>
            </div>
        </div>
    );

    // Cart panel — shared between desktop and mobile

    const CartPanel = (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Cart header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                        <ShoppingCart size={14} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-800 text-sm uppercase tracking-tight">Current Order</h2>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {cartItemCount > 0 ? `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""}` : "Empty"}
                        </p>
                    </div>
                </div>
                {cart.length > 0 && (
                    <button onClick={clearCart}
                        className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 font-bold hover:bg-red-50 px-2 py-1.5 rounded-lg transition-all">
                        <Trash2 size={11} /> Clear
                    </button>
                )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 min-h-0">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100">
                            <ShoppingCart size={22} className="text-slate-200" />
                        </div>
                        <p className="text-slate-400 text-sm font-semibold">Cart is empty</p>
                        <p className="text-slate-300 text-xs mt-1">Tap a product to add it</p>
                    </div>
                ) : (
                    <div className="py-1">
                        <AnimatePresence initial={false}>
                            {cart.map(item => (
                                <motion.div key={cartKey(item)}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.18 }}>
                                    <CartRow item={item}
                                        onIncrease={() => {
                                            if (item.qty >= item.stock_quantity) { toast.error("No more stock."); return; }
                                            updateQty(cartKey(item), 1);
                                        }}
                                        onDecrease={() => updateQty(cartKey(item), -1)}
                                        onRemove={() => removeFromCart(cartKey(item))}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Totals + pay button */}
            <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-3 shrink-0"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}>
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                        <span>Items</span><span>{cartItemCount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                        <span>Subtotal</span><span>{php(cartTotal)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center">
                        <span className="text-sm font-black text-slate-900">Total</span>
                        <span className="text-xl font-black text-slate-900">{php(cartTotal)}</span>
                    </div>
                </div>

                <button
                    onClick={() => { if (cart.length === 0) return; setShowCheckout(true); }}
                    disabled={cart.length === 0}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <CreditCard size={15} />
                    {cart.length === 0 ? "Add items to pay" : `PAY ${php(cartTotal)}`}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* ── Desktop layout — side by side, fixed height ── */}
            <div className="hidden lg:flex gap-4 animate-in fade-in duration-500"
                style={{ height: "calc(100vh - 120px)" }}>
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {ProductsPanel}
                </div>
                <div className="w-80 xl:w-96 flex flex-col shrink-0">
                    {CartPanel}
                </div>
            </div>

            {/* ── Mobile layout — tab switcher, full height ── */}
            <div className="flex flex-col lg:hidden animate-in fade-in duration-500"
                style={{ height: "calc(100dvh - 110px)" }}>

                {/* Tab bar */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3 shrink-0">
                    <button
                        onClick={() => setMobileTab("products")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black transition-all ${mobileTab === "products"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                            }`}>
                        <Package size={13} />
                        Products
                        <span className="ml-0.5 text-[10px] text-slate-400 font-bold">({filtered.length})</span>
                    </button>
                    <button
                        onClick={() => setMobileTab("cart")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black transition-all relative ${mobileTab === "cart"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                            }`}>
                        <ShoppingCart size={13} />
                        Cart
                        {cartItemCount > 0 && (
                            <span className="ml-0.5 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Panels */}
                <div className="flex-1 overflow-hidden">
                    {mobileTab === "products" ? (
                        <div className="flex flex-col h-full">
                            {ProductsPanel}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {CartPanel}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating cart badge on mobile when on products tab */}
            {mobileTab === "products" && cartItemCount > 0 && (
                <div className="lg:hidden fixed bottom-6 right-4 z-40">
                    <button
                        onClick={() => setMobileTab("cart")}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white pl-4 pr-3 py-3 rounded-2xl shadow-xl shadow-blue-600/40 font-bold text-sm transition-all active:scale-95">
                        <ShoppingCart size={16} />
                        <span>{php(cartTotal)}</span>
                        <span className="bg-white text-blue-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                            {cartItemCount}
                        </span>
                    </button>
                </div>
            )}

            <AnimatePresence>
                {showCheckout && (
                    <CheckoutModal
                        key="checkout"
                        cart={cart}
                        total={cartTotal}
                        onClose={() => setShowCheckout(false)}
                        onSuccess={handlePaymentSuccess}
                    />
                )}
                {receiptData && (
                    <ReceiptModal
                        key="receipt"
                        cart={cart}
                        total={cartTotal}
                        amountPaid={receiptData.amountPaid}
                        transactionRef={receiptData.ref}
                        onClose={handleReceiptClose}
                    />
                )}
            </AnimatePresence>
        </>
    );
}