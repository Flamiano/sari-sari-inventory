"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import Sidebar from "@/app/comps/sidebar/page";
import {
    Menu, X, User, Bell, Search, LogOut, Settings, ChevronDown,
    AlertTriangle, ChevronRight, Loader2, Package, Store,
    ChefHat, UtensilsCrossed, ArrowRight, ShoppingCart, MessageSquarePlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { useIdleTimeout } from "@/app/utils/useIdleTimeout";
import SignOutModal from "@/app/comps/signoutmodal/page";

import ProductView from "./Product";
import SupplierView from "./Suppliers";
import PointofSaleView from "./PointofSale";
import AnalyticsView from "./Analytics";
import DashboardHome from "./DashboardHome";
import SalesHistoryView from "./SalesHistory";
import StaffView from "./Staff";
import FeedbackView from "./feedback/page";

interface Notif {
    id: string;
    type: "low_stock" | "sale";
    title: string;
    desc: string;
    time: Date;
    dot: string;
}

interface SearchResult {
    id: string;
    name: string;
    category: string;
    subcategory?: string | null;
    price: number;
    stock_quantity: number;
    source: "products" | "prepared_meals";
}

const CAT_ICON: Record<string, React.ElementType> = {
    Almusal: ChefHat,
    "Sari-Sari": Store,
    Meryenda: UtensilsCrossed,
};

const CAT_COLOR: Record<string, string> = {
    Almusal: "bg-amber-100 text-amber-600",
    "Sari-Sari": "bg-blue-100 text-blue-600",
    Meryenda: "bg-orange-100 text-orange-600",
};

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SearchDropdown({ results, query, loading, onNavigate, onClose }: {
    results: SearchResult[];
    query: string;
    loading: boolean;
    onNavigate: (tab: string) => void;
    onClose: () => void;
}) {
    if (!query.trim()) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 z-50 overflow-hidden"
            style={{ maxHeight: "420px" }}
        >
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Results for "{query}"
                </p>
                {!loading && <span className="text-[10px] font-bold text-slate-400">{results.length} found</span>}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
                {loading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs font-medium">Searching…</span>
                    </div>
                ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                        <Package size={28} className="mb-2 opacity-40" />
                        <p className="text-xs font-bold">No products found</p>
                        <p className="text-[10px] mt-0.5">Try a different keyword</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {results.map(r => {
                            const Icon = CAT_ICON[r.category] ?? Package;
                            const clr = CAT_COLOR[r.category] ?? "bg-slate-100 text-slate-600";
                            return (
                                <button key={`${r.source}-${r.id}`}
                                    onClick={() => { onNavigate("products"); onClose(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                                    <div className={`w-8 h-8 rounded-xl ${clr} flex items-center justify-center shrink-0`}>
                                        <Icon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate">{r.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {r.category}{r.subcategory ? ` · ${r.subcategory}` : ""} ·{" "}
                                            {r.source === "prepared_meals" ? `${r.stock_quantity} servings` : `${r.stock_quantity} pcs`}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-black text-slate-900">{php(r.price)}</p>
                                        {r.stock_quantity < 5 && r.stock_quantity > 0 && (
                                            <p className="text-[9px] font-black text-red-500 uppercase">Low stock</p>
                                        )}
                                        {r.stock_quantity === 0 && (
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Out of stock</p>
                                        )}
                                    </div>
                                    <ArrowRight size={12} className="text-slate-300 shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            {results.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-2.5">
                    <button onClick={() => { onNavigate("products"); onClose(); }}
                        className="w-full text-xs font-black text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 transition-colors">
                        View all in Inventory <ChevronRight size={11} />
                    </button>
                </div>
            )}
        </motion.div>
    );
}

function NotificationPanel({ notifs, loading, onViewAll, onClose, seenIds }: {
    notifs: Notif[];
    loading: boolean;
    onViewAll: () => void;
    onClose: () => void;
    seenIds: Set<string>;
}) {
    const [showAll, setShowAll] = useState(false);
    const INITIAL_SHOW = 5;
    const displayed = showAll ? notifs : notifs.slice(0, INITIAL_SHOW);
    const unseenCount = notifs.filter(n => !seenIds.has(n.id)).length;

    const formatRelative = (d: Date) => {
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
        return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 z-50 overflow-hidden"
            style={{ width: "22rem" }}
        >
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <p className="text-sm font-black text-slate-800">Notifications</p>
                    {unseenCount > 0 && (
                        <span className="text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none">
                            {unseenCount} new
                        </span>
                    )}
                </div>
                {unseenCount === 0 && notifs.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">All caught up</span>
                )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: showAll ? "480px" : "auto" }}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs font-medium">Loading…</span>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                        <Bell size={32} className="mb-2 opacity-30" />
                        <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                        <p className="text-[10px] mt-0.5 text-slate-300">You're all caught up!</p>
                    </div>
                ) : (
                    <div>
                        {unseenCount > 0 && (
                            <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">New</p>
                        )}
                        {displayed.map((n, idx) => {
                            const seen = seenIds.has(n.id);
                            const prevSeen = idx > 0 ? seenIds.has(displayed[idx - 1].id) : false;
                            const showDivider = seen && !prevSeen && unseenCount > 0 && idx > 0;

                            return (
                                <div key={n.id}>
                                    {showDivider && (
                                        <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100">
                                            Earlier
                                        </p>
                                    )}
                                    <div className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${seen ? "bg-white hover:bg-slate-50" : "bg-blue-50/70 hover:bg-blue-50"}`}>
                                        <div className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.type === "low_stock" ? seen ? "bg-slate-100" : "bg-red-100" : seen ? "bg-slate-100" : "bg-green-100"}`}>
                                            {n.type === "low_stock"
                                                ? <AlertTriangle size={16} className={seen ? "text-slate-400" : "text-red-500"} />
                                                : <ShoppingCart size={16} className={seen ? "text-slate-400" : "text-green-600"} />
                                            }
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${n.dot}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs leading-snug ${seen ? "font-medium text-slate-500" : "font-bold text-slate-800"}`}>
                                                {n.title}
                                            </p>
                                            <p className={`text-[0.67rem] mt-0.5 leading-snug ${seen ? "text-slate-400" : "text-slate-500"}`}>
                                                {n.desc}
                                            </p>
                                            <p className={`text-[0.62rem] mt-1 font-semibold ${seen ? "text-slate-400" : "text-blue-500"}`}>
                                                {formatRelative(n.time)}
                                            </p>
                                        </div>
                                        {!seen && (
                                            <div className="shrink-0 mt-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {notifs.length > 0 && (
                <div className="border-t border-slate-100">
                    {notifs.length > INITIAL_SHOW && (
                        <button
                            onClick={() => setShowAll(v => !v)}
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors border-b border-slate-100"
                        >
                            {showAll ? "Show less" : `See all ${notifs.length} notifications`}
                            <ChevronDown size={12} className={`transition-transform duration-200 ${showAll ? "rotate-180" : ""}`} />
                        </button>
                    )}
                    <button
                        onClick={() => { onViewAll(); onClose(); }}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-black text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                        Go to Sales History <ChevronRight size={11} />
                    </button>
                </div>
            )}
        </motion.div>
    );
}

// Tracks the count of times the staff tab has been activated
// so StaffView remounts with a fresh key each visit
function useTabMountKey(activeTab: string, tabName: string) {
    const countRef = useRef(0);
    const prevTab = useRef(activeTab);

    if (prevTab.current !== activeTab) {
        if (activeTab === tabName) countRef.current += 1;
        prevTab.current = activeTab;
    }

    return countRef.current;
}

export default function OwnerLayout() {
    const [activeTab, setActiveTab] = useState<string>("dashboard");
    const [tabRestored, setTabRestored] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isProfileOpen, setProfileOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);
    const [isSignOutOpen, setSignOutOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [storeName, setStoreName] = useState("My Store");
    const [authReady, setAuthReady] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [seenNotifIds, setSeenNotifIds] = useState<Set<string>>(new Set());

    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Each time the owner navigates TO the staffs tab, this increments.
    // We use it as the key for <StaffView> so React fully remounts it,
    // triggering a fresh fetch + realtime channel setup every single time.
    const staffMountKey = useTabMountKey(activeTab, "staffs");

    const handleSetActiveTab = (tab: string) => {
        setActiveTab(tab);
        sessionStorage.setItem("activeTab", tab);
    };

    const handleSignOut = async () => {
        sessionStorage.clear();
        setActiveTab("dashboard");
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    const handleIdle = useCallback(async () => {
        await supabase.auth.signOut();
        sessionStorage.clear();
        toast.error("Session expired. Please sign in again.", {
            duration: 4000,
            style: {
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontWeight: 600,
                fontSize: "0.875rem",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                borderLeft: "4px solid #ef4444",
                background: "#fff",
                color: "#0f172a",
            },
            iconTheme: { primary: "#ef4444", secondary: "#fef2f2" },
        });
        setTimeout(() => router.push("/auth/login"), 1500);
    }, [router]);

    useIdleTimeout({
        timeoutMs: 5 * 60 * 1000,
        onIdle: handleIdle,
        disabled: !authReady,
    });

    useEffect(() => {
        const saved = sessionStorage.getItem("activeTab");
        if (saved) setActiveTab(saved);
        setTabRestored(true);
    }, []);

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/auth/login");
            } else {
                setUser(session.user);
                const name = session.user.user_metadata?.store_name || "My Store";
                setStoreName(name.trim().split(" ")[0]);
                setAuthReady(true);
            }
        };
        getUser();
    }, []);

    const runSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setSearchResults([]); setSearchLoading(false); return; }
        setSearchLoading(true);
        try {
            const [prodRes, mealRes, subRes] = await Promise.all([
                supabase.from("products").select("id, name, category, subcategory, price, stock_quantity").ilike("name", `%${q}%`).limit(8),
                supabase.from("prepared_meals").select("id, name, category, price, stock_quantity").ilike("name", `%${q}%`).limit(5),
                supabase.from("products").select("id, name, category, subcategory, price, stock_quantity").ilike("subcategory", `%${q}%`).limit(5),
            ]);
            const combined: SearchResult[] = [
                ...(prodRes.data ?? []).map((r: any) => ({ ...r, source: "products" as const })),
                ...(mealRes.data ?? []).map((r: any) => ({ ...r, source: "prepared_meals" as const })),
            ];
            const seenIds = new Set(combined.map(r => r.id));
            (subRes.data ?? []).forEach((r: any) => { if (!seenIds.has(r.id)) combined.push({ ...r, source: "products" as const }); });
            setSearchResults(combined.slice(0, 12));
        } catch { setSearchResults([]); }
        finally { setSearchLoading(false); }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!searchQuery.trim()) { setSearchResults([]); setSearchLoading(false); return; }
        setSearchLoading(true);
        debounceRef.current = setTimeout(() => runSearch(searchQuery), 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, runSearch]);

    const fetchNotifs = useCallback(async () => {
        setNotifLoading(true);
        try {
            const { data: { user: u } } = await supabase.auth.getUser();
            if (!u) return;

            const all: Notif[] = [];
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

            const [lowProds, lowMeals, todaySales] = await Promise.all([
                supabase.from("products").select("id, name, stock_quantity, category").eq("user_id", u.id).lt("stock_quantity", 5).gt("stock_quantity", 0).order("stock_quantity", { ascending: true }).limit(10),
                supabase.from("prepared_meals").select("id, name, stock_quantity, category").eq("user_id", u.id).lt("stock_quantity", 3).gt("stock_quantity", 0).order("stock_quantity", { ascending: true }).limit(5),
                supabase.from("sales_transactions").select("id, transaction_ref, total_amount, created_at, item_count").eq("user_id", u.id).gte("created_at", todayStart).lte("created_at", todayEnd).order("created_at", { ascending: false }).limit(20),
            ]);

            (lowProds.data ?? []).forEach((p: any) => all.push({
                id: `low-prod-${p.id}`, type: "low_stock",
                title: `Low stock: ${p.name}`,
                desc: `Only ${p.stock_quantity} ${p.stock_quantity === 1 ? "pc" : "pcs"} remaining · ${p.category}`,
                time: new Date(), dot: "bg-red-500",
            }));

            (lowMeals.data ?? []).forEach((m: any) => all.push({
                id: `low-meal-${m.id}`, type: "low_stock",
                title: `Low servings: ${m.name}`,
                desc: `Only ${m.stock_quantity} serving${m.stock_quantity !== 1 ? "s" : ""} left · ${m.category}`,
                time: new Date(), dot: "bg-orange-500",
            }));

            const salesList = todaySales.data ?? [];
            if (salesList.length > 0) {
                const txnIds = salesList.map((t: any) => t.id);
                const { data: itemsData } = await supabase
                    .from("sales_transaction_items")
                    .select("transaction_id, product_name")
                    .in("transaction_id", txnIds);

                const itemsByTxn: Record<string, string[]> = {};
                (itemsData ?? []).forEach((item: any) => {
                    if (!itemsByTxn[item.transaction_id]) itemsByTxn[item.transaction_id] = [];
                    if (!itemsByTxn[item.transaction_id].includes(item.product_name))
                        itemsByTxn[item.transaction_id].push(item.product_name);
                });

                salesList.forEach((t: any) => {
                    const names = itemsByTxn[t.id] ?? [];
                    const preview = names.length === 0
                        ? `${t.item_count} item${t.item_count !== 1 ? "s" : ""}`
                        : names.length <= 2 ? names.join(", ")
                            : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
                    all.push({
                        id: `sale-${t.id}`, type: "sale",
                        title: `Sold: ${preview}`,
                        desc: `${php(Number(t.total_amount))} · ${t.item_count} item${t.item_count !== 1 ? "s" : ""} · ${new Date(t.created_at).toLocaleTimeString("en-PH", { timeStyle: "short" })}`,
                        time: new Date(t.created_at), dot: "bg-green-500",
                    });
                });
            }

            all.sort((a, b) => {
                if (a.type === "low_stock" && b.type !== "low_stock") return -1;
                if (a.type !== "low_stock" && b.type === "low_stock") return 1;
                return b.time.getTime() - a.time.getTime();
            });

            setNotifs(all);
        } catch (err) {
            console.error("Failed to load notifications", err);
        } finally {
            setNotifLoading(false);
        }
    }, []);

    useEffect(() => { fetchNotifs(); }, [fetchNotifs, activeTab]);

    useEffect(() => {
        const interval = setInterval(fetchNotifs, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchNotifs]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    const handleBellClick = () => {
        if (!isNotifOpen) {
            fetchNotifs();
            setSeenNotifIds(prev => {
                const next = new Set(prev);
                notifs.forEach(n => next.add(n.id));
                return next;
            });
        }
        setNotifOpen(!isNotifOpen);
        setProfileOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case "products": return <ProductView />;
            case "suppliers": return <SupplierView />;
            case "pos": return <PointofSaleView />;
            case "reports": return <AnalyticsView />;
            case "sales": return <SalesHistoryView />;
            case "feedback": return <FeedbackView />;

            // KEY is critical here: every time the owner navigates to the staffs tab,
            // staffMountKey increments → React destroys and recreates StaffView →
            // fetchStaff() runs fresh + realtime channels re-subscribe cleanly.
            case "staffs": return <StaffView key={`staff-view-${staffMountKey}`} />;

            default: return <DashboardHome onViewAll={(tab) => handleSetActiveTab(tab)} />;
        }
    };

    const unseenCount = notifs.filter(n => !seenNotifIds.has(n.id)).length;
    const urgentUnseen = notifs.filter(n => !seenNotifIds.has(n.id) && n.type === "low_stock").length;

    return (
        <>
            <SignOutModal
                isOpen={isSignOutOpen}
                storeName={storeName}
                onConfirm={handleSignOut}
                onCancel={() => setSignOutOpen(false)}
            />

            <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">

                <motion.div
                    initial={false}
                    animate={{ width: isSidebarOpen ? 288 : 0, x: isSidebarOpen ? 0 : -288 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed inset-y-0 left-0 z-50 md:relative md:z-auto bg-[#0d1117] overflow-hidden shadow-2xl md:shadow-none flex-shrink-0"
                >
                    <Sidebar
                        activeTab={activeTab}
                        mounted={tabRestored}
                        setActiveTab={handleSetActiveTab}
                        closeMobile={() => setSidebarOpen(false)}
                    />
                </motion.div>

                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 bg-black/40 z-40 md:hidden" />
                    )}
                </AnimatePresence>

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    <header className="h-[68px] bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <motion.button whileTap={{ scale: 0.92 }}
                                onClick={() => setSidebarOpen(!isSidebarOpen)}
                                className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
                                <AnimatePresence mode="wait">
                                    <motion.div key={isSidebarOpen ? "close" : "open"}
                                        initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                                    </motion.div>
                                </AnimatePresence>
                            </motion.button>

                            <div className="hidden md:flex items-center gap-2">
                                <span className="text-slate-400 text-sm font-medium">{storeName}</span>
                                <ChevronDown size={14} className="text-slate-300" />
                                <span className="text-slate-800 text-sm font-black capitalize">
                                    {activeTab === "pos" ? "Point of Sale"
                                        : activeTab === "sales" ? "Sales History"
                                            : activeTab === "feedback" ? "Feedback"
                                                : activeTab === "staffs" ? "Staff Management"
                                                    : activeTab.replace("-", " ")}
                                </span>
                                {/* Live indicator — only shown on staffs tab */}
                                {activeTab === "staffs" && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 ml-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                                            style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
                                        Live
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">

                            <div className="relative hidden sm:block" ref={searchRef}>
                                <motion.div animate={{ width: searchOpen || searchQuery ? 300 : 210 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }} className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={14} />
                                    <input type="text" value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                                        onFocus={() => setSearchOpen(true)}
                                        placeholder="Search products, subcategory…"
                                        className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 ring-blue-500/30 focus:bg-white focus:border-slate-200 outline-none transition-all" />
                                    {searchQuery ? (
                                        <button onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 text-slate-400 transition-colors">
                                            <X size={11} />
                                        </button>
                                    ) : null}
                                </motion.div>
                                <AnimatePresence>
                                    {searchOpen && searchQuery.trim() && (
                                        <SearchDropdown results={searchResults} query={searchQuery} loading={searchLoading}
                                            onNavigate={tab => handleSetActiveTab(tab)}
                                            onClose={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }} />
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative" ref={notifRef}>
                                <motion.button whileTap={{ scale: 0.92 }} onClick={handleBellClick}
                                    className="relative w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
                                    {urgentUnseen > 0
                                        ? <AlertTriangle size={18} className="text-red-500" />
                                        : <Bell size={18} />
                                    }
                                    <AnimatePresence>
                                        {unseenCount > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                                <span className="text-[9px] font-black text-white px-0.5">
                                                    {unseenCount > 9 ? "9+" : unseenCount}
                                                </span>
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.button>

                                <AnimatePresence>
                                    {isNotifOpen && (
                                        <NotificationPanel
                                            notifs={notifs}
                                            loading={notifLoading}
                                            seenIds={seenNotifIds}
                                            onViewAll={() => handleSetActiveTab("sales")}
                                            onClose={() => setNotifOpen(false)}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative" ref={profileRef}>
                                <motion.button whileTap={{ scale: 0.96 }}
                                    onClick={() => { setProfileOpen(!isProfileOpen); setNotifOpen(false); }}
                                    className="flex items-center gap-2.5 pl-1 pr-3 py-1 hover:bg-slate-100 rounded-2xl transition-all">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md"
                                        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                                        {user?.email?.charAt(0).toUpperCase() || "M"}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-xs font-black text-slate-700 leading-none">{storeName}</p>
                                        <p className="text-[0.6rem] text-slate-400 font-medium mt-0.5">Store Owner</p>
                                    </div>
                                    <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 hidden sm:block ${isProfileOpen ? "rotate-180" : ""}`} />
                                </motion.button>

                                <AnimatePresence>
                                    {isProfileOpen && (
                                        <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 p-2 z-50">
                                            <div className="px-3 py-3 mb-1">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm mx-auto mb-2"
                                                    style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                                                    {user?.email?.charAt(0).toUpperCase() || "M"}
                                                </div>
                                                <p className="text-xs font-black text-slate-800 text-center">{storeName}</p>
                                                <p className="text-[0.65rem] text-slate-400 font-medium text-center truncate mt-0.5">{user?.email}</p>
                                            </div>
                                            <div className="border-t border-slate-100 pt-1 space-y-0.5">
                                                <button
                                                    onClick={() => { setProfileOpen(false); router.push("/owner/settings"); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Settings size={13} /></div>
                                                    Settings
                                                </button>
                                                <button
                                                    onClick={() => { setProfileOpen(false); handleSetActiveTab("feedback"); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                                                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><MessageSquarePlus size={13} className="text-blue-500" /></div>
                                                    Feedback
                                                </button>
                                            </div>
                                            <div className="border-t border-slate-100 pt-1 mt-1">
                                                <button
                                                    onClick={() => { setProfileOpen(false); setSignOutOpen(true); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"><LogOut size={13} className="text-red-500" /></div>
                                                    Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto">
                        <div className="max-w-7xl mx-auto p-4 md:p-6">
                            <AnimatePresence mode="wait">
                                <motion.div key={activeTab}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                                    {renderContent()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}