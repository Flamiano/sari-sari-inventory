"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    ShoppingCart, Search, CreditCard, Trash2, Plus, Minus,
    X, Loader2, ChefHat, Store,
    UtensilsCrossed, CheckCircle2, Package,
    Banknote, RotateCcw, Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/app/utils/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Currency helper ──────────────────────────────────────────────────────────

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<MainCategory | "All", {
    icon: React.ElementType;
    bg: string; text: string; activeBg: string; activeText: string;
}> = {
    All: { icon: Package, bg: "bg-slate-100", text: "text-slate-600", activeBg: "bg-slate-900", activeText: "text-white" },
    Almusal: { icon: ChefHat, bg: "bg-amber-100", text: "text-amber-600", activeBg: "bg-amber-500", activeText: "text-white" },
    "Sari-Sari": { icon: Store, bg: "bg-blue-100", text: "text-blue-600", activeBg: "bg-blue-600", activeText: "text-white" },
    Meryenda: { icon: UtensilsCrossed, bg: "bg-orange-100", text: "text-orange-600", activeBg: "bg-orange-500", activeText: "text-white" },
};

// ─── Receipt Modal ────────────────────────────────────────────────────────────

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col" style={{ maxHeight: "90vh" }}>
                <div className="bg-emerald-600 rounded-t-2xl p-6 text-white text-center">
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
                            <div key={`${item.source}-${item.id}`} className="flex justify-between items-start gap-2">
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

                <div className="p-4 border-t border-slate-100">
                    <button onClick={onClose}
                        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                        <RotateCcw size={14} /> New Sale
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Checkout Modal ───────────────────────────────────────────────────────────

function CheckoutModal({ cart, total, onClose, onSuccess }: {
    cart: CartItem[];
    total: number;
    onClose: () => void;
    onSuccess: (amountPaid: number, ref: string) => void;
}) {
    const [amountPaid, setAmountPaid] = useState("");
    const [processing, setProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

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

            // 1. Insert transaction header
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

            // 2. Insert line items + deduct stock simultaneously
            await Promise.all(cart.map(async (item) => {
                // Calc profit per unit (meals use batch cost / servings)
                const costPerUnit = item.source === "prepared_meals"
                    ? item.market_price / item.stock_quantity   // batch cost ÷ total servings
                    : item.market_price;
                const profitTotal = (item.price - costPerUnit) * item.qty;

                // Insert line item
                const { error: liErr } = await supabase
                    .from("sales_transaction_items")
                    .insert({
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

                // Deduct stock
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="bg-blue-600 rounded-t-2xl p-5 text-white">
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
                            className={`w-full px-4 py-3 border rounded-xl text-lg font-black outline-none transition-all ${amountPaid && !isValid
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
                                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${parseFloat(amountPaid) === v
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
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {processing ? "Processing…" : "Confirm Payment"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

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
            className={`group relative bg-white rounded-2xl border text-left flex flex-col transition-all overflow-hidden ${outOfStock
                ? "border-slate-100 opacity-50 cursor-not-allowed"
                : inCart > 0
                    ? "border-blue-300 shadow-md ring-2 ring-blue-500/20 hover:shadow-lg"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-95"
                }`}
        >
            <div className={`w-full aspect-square flex items-center justify-center overflow-hidden ${cfg.bg}`}>
                {product.image_url ? (
                    <img src={product.image_url} alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        {React.createElement(cfg.icon, { size: 28, className: cfg.text })}
                    </div>
                )}
                {inCart > 0 && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-[10px] font-black text-white">{inCart}</span>
                    </div>
                )}
                {lowStock && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Low
                    </div>
                )}
            </div>

            <div className="p-2.5 flex flex-col flex-1">
                <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2 flex-1">{product.name}</p>
                {product.subcategory && (
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">{product.subcategory}</p>
                )}
                <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm font-black text-slate-900">{php(product.price)}</p>
                    <span className="text-[9px] text-slate-400 font-bold">
                        {product.source === "prepared_meals" ? `${product.stock_quantity} svng` : `${product.stock_quantity} pcs`}
                    </span>
                </div>
            </div>
        </button>
    );
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────

function CartRow({ item, onIncrease, onDecrease, onRemove }: {
    item: CartItem;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
}) {
    const cfg = CAT_CONFIG[item.category];
    const Icon = cfg.icon;
    return (
        <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 overflow-hidden`}>
                {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : <Icon size={16} className={cfg.text} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                <p className="text-[10px] text-slate-400">{php(item.price)} each</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button onClick={onDecrease}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                    <Minus size={10} />
                </button>
                <span className="w-5 text-center text-xs font-black text-slate-800">{item.qty}</span>
                <button onClick={onIncrease}
                    disabled={item.qty >= item.stock_quantity}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40">
                    <Plus size={10} />
                </button>
            </div>
            <div className="text-right shrink-0 min-w-[52px]">
                <p className="text-xs font-black text-slate-800">{php(item.price * item.qty)}</p>
                <button onClick={onRemove} className="text-[9px] text-red-400 hover:text-red-600 font-bold mt-0.5 transition-colors">
                    remove
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN POS COMPONENT ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function PointofSaleView() {
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<MainCategory | "All">("All");
    const [activeSub, setActiveSub] = useState<string>("All Sari-Sari");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [receiptData, setReceiptData] = useState<{ amountPaid: number; ref: string } | null>(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const results: POSProduct[] = [];
            const [sariRes, mealRes] = await Promise.all([
                supabase.from("products").select("id, name, price, market_price, stock_quantity, image_url, category, subcategory").order("name"),
                supabase.from("prepared_meals").select("id, name, price, market_price, stock_quantity, image_url, category").order("name"),
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
        if (activeCategory === "Sari-Sari" && activeSub !== "All Sari-Sari") {
            return matchSearch && p.subcategory === activeSub;
        }
        return matchSearch;
    });

    const cartKey = (p: POSProduct) => `${p.source}-${p.id}`;

    const addToCart = (product: POSProduct) => {
        setCart(prev => {
            const existing = prev.find(c => cartKey(c) === cartKey(product));
            if (existing) {
                if (existing.qty >= product.stock_quantity) {
                    toast.error("No more stock available.");
                    return prev;
                }
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
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)] animate-in fade-in duration-500">

            {/* ═══════════════ LEFT: Product Panel ═══════════════ */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search product name…"
                        className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm outline-none focus:ring-2 ring-blue-500/30 transition-all" />
                    {search && (
                        <button onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Category tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide shrink-0">
                    {(["All", "Almusal", "Sari-Sari", "Meryenda"] as (MainCategory | "All")[]).map(cat => {
                        const cfg = CAT_CONFIG[cat];
                        const Icon = cfg.icon;
                        const active = activeCategory === cat;
                        return (
                            <button key={cat}
                                onClick={() => { setActiveCategory(cat); if (cat !== "Sari-Sari") setActiveSub("All Sari-Sari"); }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap border ${active
                                    ? `${cfg.activeBg} ${cfg.activeText} border-transparent shadow-sm`
                                    : `bg-white ${cfg.text} border-slate-200 hover:${cfg.bg}`
                                    }`}>
                                <Icon size={12} /> {cat}
                            </button>
                        );
                    })}
                </div>

                {/* Sari-Sari subcategory strip */}
                {activeCategory === "Sari-Sari" && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide shrink-0">
                        {SARI_SARI_SUBCATEGORIES.map(sub => (
                            <button key={sub} onClick={() => setActiveSub(sub)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${activeSub === sub
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                    }`}>
                                {sub}
                            </button>
                        ))}
                    </div>
                )}

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3">
                            <Loader2 size={28} className="animate-spin text-slate-400" />
                            <p className="text-sm text-slate-400 font-medium">Loading products…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Package size={40} className="opacity-20" />
                            <p className="text-sm font-medium">No products found.</p>
                            {search && <button onClick={() => setSearch("")} className="text-xs text-blue-500 font-bold hover:underline">Clear search</button>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 pb-2">
                            {filtered.map(product => {
                                const inCart = cart.find(c => cartKey(c) === cartKey(product))?.qty ?? 0;
                                return (
                                    <ProductCard key={cartKey(product)} product={product} inCart={inCart} onAdd={() => addToCart(product)} />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 font-medium shrink-0">
                    <span><strong className="text-slate-600">{filtered.length}</strong> product{filtered.length !== 1 ? "s" : ""} shown</span>
                    <span><strong className="text-slate-600">{products.length}</strong> total in inventory</span>
                </div>
            </div>

            {/* ═══════════════ RIGHT: Cart Panel ═══════════════ */}
            <div className="w-full lg:w-80 xl:w-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                            <ShoppingCart size={15} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 text-sm uppercase tracking-tight">Current Order</h2>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {cartItemCount > 0 ? `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""}` : "Empty cart"}
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

                <div className="flex-1 overflow-y-auto px-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-10">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100">
                                <ShoppingCart size={24} className="text-slate-200" />
                            </div>
                            <p className="text-slate-400 text-sm font-semibold">Cart is empty</p>
                            <p className="text-slate-300 text-xs mt-1">Tap a product to add it</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {cart.map(item => (
                                <CartRow key={cartKey(item)} item={item}
                                    onIncrease={() => {
                                        if (item.qty >= item.stock_quantity) { toast.error("No more stock available."); return; }
                                        updateQty(cartKey(item), 1);
                                    }}
                                    onDecrease={() => updateQty(cartKey(item), -1)}
                                    onRemove={() => removeFromCart(cartKey(item))}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-3 shrink-0">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                            <span>Items</span><span>{cartItemCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
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
                        <CreditCard size={16} />
                        {cart.length === 0 ? "Add items to pay" : `PAY ${php(cartTotal)}`}
                    </button>
                </div>
            </div>

            {showCheckout && (
                <CheckoutModal cart={cart} total={cartTotal} onClose={() => setShowCheckout(false)} onSuccess={handlePaymentSuccess} />
            )}
            {receiptData && (
                <ReceiptModal cart={cart} total={cartTotal} amountPaid={receiptData.amountPaid}
                    transactionRef={receiptData.ref} onClose={handleReceiptClose} />
            )}
        </div>
    );
}