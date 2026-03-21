"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ShoppingCart, LogOut, Package, TrendingUp, Clock,
    Receipt, Search, Plus, Minus, Trash2, CreditCard,
    Banknote, CheckCircle2, Loader2, AlertTriangle,
    X, BarChart3, Grid3x3, Calendar, ChevronDown,
    DollarSign, ShoppingBag, Filter, LogIn, LogOut as LogOutIcon,
    Timer, CalendarDays, Fingerprint,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast from "react-hot-toast";
import SignOutModal from "@/app/comps/signoutmodal/page";

// Types
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
interface AttendanceRecord {
    id: string;
    staff_id: string;
    time_in: string;
    time_out: string | null;
    date: string;
    attendance_status: "present" | "late" | "absent";
    duration_minutes: number | null;
}
type DatePreset = "today" | "week" | "month" | "custom";

// Generate a unique transaction reference
function generateRef() {
    const n = new Date();
    return `TXN-${String(n.getFullYear()).slice(-2)}${String(n.getMonth() + 1).padStart(2, "0")}${String(n.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

// Format seconds as Xh Ym
function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Format elapsed minutes nicely
function formatDuration(minutes: number | null) {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60), m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

// Human-readable relative time
function timeAgo(d: string) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// Format a timestamp to a readable time string
function fmtTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Format a date string to readable date
function fmtDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// Full peso format
const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Compact peso format for stat cards
function phpShort(n: number): string {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
    return `₱${n.toFixed(2)}`;
}

// Compact integer format
function numShort(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

// Compute ISO date bounds for a given preset
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

// Category color map
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

// Logo with fallback
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

// Attendance status badge color
const ATT_META = {
    present: { label: "Present", color: "#10b981", bg: "rgba(16,185,129,0.1)", text: "text-emerald-700" },
    late: { label: "Late", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "text-amber-700" },
    absent: { label: "Absent", color: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "text-red-700" },
};

// Live clock-in duration counter
function useLiveElapsed(timeInStr: string | null) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!timeInStr) return;
        const base = new Date(timeInStr).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - base) / 1000));
        tick();
        const id = setInterval(tick, 10000);
        return () => clearInterval(id);
    }, [timeInStr]);
    return elapsed;
}

// Returns today's local date as YYYY-MM-DD
function todayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Main dashboard
export default function DashboardCashier({
    staff, ownerStoreName = "", ownerFullName = "",
}: { staff: StaffData; ownerStoreName?: string; ownerFullName?: string }) {
    const router = useRouter();

    const displayStoreName = ownerStoreName || "Your Store";
    const displayOwnerName = ownerFullName || "—";

    // Product state
    const [products, setProducts] = useState<Product[]>([]);
    const [prodLoad, setProdLoad] = useState(true);
    const [search, setSearch] = useState("");
    const [activeCat, setActiveCat] = useState("all");

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [payMethod, setPayMethod] = useState<"cash" | "card">("cash");
    const [tendered, setTendered] = useState("");
    const [processing, setProc] = useState(false);
    const [showSuccess, setSuccess] = useState(false);
    const [lastChange, setLastCh] = useState(0);
    const [lastTotal, setLastTot] = useState(0);

    // Sales history state
    const [transactions, setTxns] = useState<Transaction[]>([]);
    const [txItems, setTxItems] = useState<Record<string, TxItem[]>>({});
    const [txLoad, setTxLoad] = useState(true);
    const [salesPreset, setSalesPreset] = useState<DatePreset>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [showCustom, setShowCustom] = useState(false);
    const [expandedTx, setExpandedTx] = useState<string | null>(null);

    // Attendance state
    const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
    const [attHistory, setAttHistory] = useState<AttendanceRecord[]>([]);
    const [attLoad, setAttLoad] = useState(true);
    const [clockingOut, setCLockingOut] = useState(false);
    const [showAttModal, setShowAttModal] = useState(false);

    // Sign-out modal
    const [signOutOpen, setSignOutOpen] = useState(false);

    // Shift timer (client-side, resets on refresh)
    const shiftStart = useRef(Date.now());
    const [shiftSec, setShiftSec] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setShiftSec(Math.floor((Date.now() - shiftStart.current) / 1000)), 10000);
        return () => clearInterval(t);
    }, []);

    // Live elapsed time for the open attendance record
    const liveElapsed = useLiveElapsed(attendance && !attendance.time_out ? attendance.time_in : null);

    // Navigation state
    const [mob, setMob] = useState<"pos" | "cart" | "sales">("pos");
    const [desk, setDesk] = useState<"pos" | "sales">("pos");

    // Ensure a time-in record exists for today, then load attendance state
    const fetchAttendance = useCallback(async () => {
        setAttLoad(true);
        try {
            const today = todayDate();

            // Check if there is already an open (no time_out) record for today
            const { data: openRec } = await supabase
                .from("staff_attendance")
                .select("*")
                .eq("staff_id", staff.id)
                .eq("date", today)
                .is("time_out", null)
                .order("time_in", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (openRec) {
                // Already clocked in — just set it
                setAttendance(openRec);
            } else {
                // No open record for today — create one now
                // (handles the case where login-page insert failed or RLS blocked it)
                // On time = at or before 8:00 AM exactly
                // Late = 8:01 AM up to 11:59 AM (noon absent handled by scheduled job)
                const now = new Date();
                const status = (now.getHours() < 8 || (now.getHours() === 8 && now.getMinutes() === 0))
                    ? "present"
                    : "late";

                const { data: inserted, error: insertErr } = await supabase
                    .from("staff_attendance")
                    .insert({
                        staff_id: staff.id,
                        staff_name: staff.full_name,
                        staff_role: staff.role,
                        owner_id: staff.owner_id,
                        time_in: new Date().toISOString(),
                        date: today,
                        attendance_status: status,
                    })
                    .select()
                    .single();

                if (!insertErr && inserted) {
                    setAttendance(inserted);
                } else {
                    // Insert failed (e.g. duplicate from login page arriving late) — re-fetch
                    const { data: retry } = await supabase
                        .from("staff_attendance")
                        .select("*")
                        .eq("staff_id", staff.id)
                        .eq("date", today)
                        .is("time_out", null)
                        .order("time_in", { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    setAttendance(retry ?? null);
                }
            }

            // Fetch full history (last 14 records, all statuses)
            const { data: history } = await supabase
                .from("staff_attendance")
                .select("*")
                .eq("staff_id", staff.id)
                .order("time_in", { ascending: false })
                .limit(14);

            setAttHistory(history ?? []);
        } catch {
            // Non-critical — don't block the POS if attendance fails
        } finally {
            setAttLoad(false);
        }
    }, [staff.id, staff.full_name, staff.role, staff.owner_id]);

    // Clock out this cashier
    const handleClockOut = async () => {
        if (!attendance) return;
        setCLockingOut(true);
        try {
            const { error } = await supabase.rpc("record_staff_timeout", { p_staff_id: staff.id });
            if (error) throw error;
            toast.success("Clocked out successfully. See you next shift! 👋");
            await fetchAttendance();
        } catch (err: any) {
            // Fallback: direct update if RPC not available
            try {
                const now = new Date().toISOString();
                const minutes = Math.round((Date.now() - new Date(attendance.time_in).getTime()) / 60000);
                await supabase
                    .from("staff_attendance")
                    .update({ time_out: now, duration_minutes: minutes })
                    .eq("id", attendance.id);
                toast.success("Clocked out successfully!");
                await fetchAttendance();
            } catch {
                toast.error("Clock out failed. Please try again.");
            }
        } finally {
            setCLockingOut(false);
        }
    };

    // Fetch products
    const fetchProducts = useCallback(async () => {
        setProdLoad(true);
        try {
            const [{ data: p }, { data: m }] = await Promise.all([
                supabase.rpc("get_owner_products", { p_owner_id: staff.owner_id }),
                supabase.rpc("get_owner_meals", { p_owner_id: staff.owner_id }),
            ]);
            setProducts([
                ...((p ?? []) as any[]).map((x: any) => ({
                    id: x.id, name: x.name, image_url: x.image_url,
                    price: +x.price, market_price: +x.market_price,
                    stock_quantity: x.stock_quantity, category: x.category,
                    subcategory: x.subcategory ?? null, source: "products" as const,
                })),
                ...((m ?? []) as any[]).map((x: any) => ({
                    id: x.id, name: x.name, image_url: x.image_url,
                    price: +x.price, market_price: +x.market_price,
                    stock_quantity: x.stock_quantity, category: "Prepared Meal",
                    subcategory: null, source: "prepared_meals" as const,
                })),
            ]);
        } catch {
            toast.error("Failed to load products.");
        } finally {
            setProdLoad(false);
        }
    }, [staff.owner_id]);

    // Fetch sales
    const fetchSales = useCallback(async (preset: DatePreset, cFrom?: string, cTo?: string) => {
        setTxLoad(true);
        try {
            const bounds = getDateBounds(preset, cFrom, cTo);
            const { data } = await supabase.rpc("get_owner_transactions", {
                p_owner_id: staff.owner_id,
                p_from: bounds.from,
                p_to: bounds.to,
            });
            const all = (data ?? []) as Transaction[];
            const mine = all.filter(t => t.sold_by_staff_id === staff.id);
            setTxns(mine);
            if (mine.length > 0) {
                const { data: itemData } = await supabase
                    .rpc("get_transaction_items", { p_transaction_ids: mine.map(t => t.id) });
                if (itemData) {
                    const grouped: Record<string, TxItem[]> = {};
                    (itemData as TxItem[]).forEach(i => {
                        if (!grouped[i.transaction_id]) grouped[i.transaction_id] = [];
                        grouped[i.transaction_id].push(i);
                    });
                    setTxItems(grouped);
                }
            } else {
                setTxItems({});
            }
        } catch {
            // Silent
        } finally {
            setTxLoad(false);
        }
    }, [staff.owner_id, staff.id]);

    useEffect(() => {
        fetchProducts();
        fetchSales("today");
        fetchAttendance();
    }, [fetchProducts, fetchSales, fetchAttendance]);

    // Presence — broadcast this staff member as online to the owner's presence channel
    useEffect(() => {
        // Channel is scoped to the owner so only their staff show up
        const presenceChannel = supabase.channel(`presence:staff:${staff.owner_id}`);

        presenceChannel
            .on("presence", { event: "sync" }, () => { }) // owner listens; we just track here silently
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    // Track this staff member with their id so the owner can identify them
                    await presenceChannel.track({ staff_id: staff.id, name: staff.full_name, role: staff.role });
                }
            });

        // On unmount (tab close / sign-out) Supabase automatically removes presence
        return () => {
            presenceChannel.untrack();
            supabase.removeChannel(presenceChannel);
        };
    }, [staff.id, staff.owner_id, staff.full_name, staff.role]);

    const handlePresetChange = (p: DatePreset) => {
        setSalesPreset(p);
        setShowCustom(p === "custom");
        if (p !== "custom") fetchSales(p);
    };

    // Cart helpers
    const cKey = (p: Product) => `${p.source}-${p.id}`;

    const addToCart = (p: Product) => {
        if (p.stock_quantity <= 0) { toast.error(`${p.name} is out of stock.`); return; }
        setCart(prev => {
            const ex = prev.find(c => cKey(c) === cKey(p));
            if (ex) {
                if (ex.qty >= p.stock_quantity) { toast.error(`Maximum stock reached (${p.stock_quantity}).`); return prev; }
                return prev.map(c => cKey(c) === cKey(p) ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { ...p, qty: 1 }];
        });
    };

    const updQty = (key: string, d: number) => {
        setCart(prev => prev.map(c => {
            if (cKey(c) !== key) return c;
            if (d > 0 && c.qty >= c.stock_quantity) { toast.error(`Maximum stock reached (${c.stock_quantity}).`); return c; }
            return { ...c, qty: Math.max(0, c.qty + d) };
        }).filter(c => c.qty > 0));
    };

    const clearCart = () => { setCart([]); setTendered(""); };

    // Computed cart totals
    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const tenderedAmt = parseFloat(tendered) || 0;
    const change = tenderedAmt - cartTotal;

    // Product filtering
    const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];
    const filtered = products.filter(p =>
        (activeCat === "all" || p.category === activeCat) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    // Sales summary
    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalOrders = transactions.length;
    const totalItems = transactions.reduce((s, t) => s + t.item_count, 0);
    const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
    const productById = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Product>);

    // Process checkout
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
                product_id: i.id,
                product_source: i.source,
                product_name: i.name,
                category: i.category,
                subcategory: i.subcategory ?? null,
                quantity: i.qty,
                unit_price: i.price,
                unit_cost: i.market_price,
                subtotal: i.price * i.qty,
                profit: (i.price - i.market_price) * i.qty,
                stock_quantity: i.stock_quantity,
            }));
            const { error } = await supabase.rpc("staff_process_sale", {
                p_owner_id: staff.owner_id,
                p_staff_id: staff.id,
                p_staff_name: staff.full_name,
                p_transaction_ref: ref,
                p_total_amount: cartTotal,
                p_amount_paid: paid,
                p_change_amount: chng,
                p_item_count: cartCount,
                p_items: items,
            });
            if (error) throw error;
            setLastCh(chng);
            setLastTot(cartTotal);
            fetchProducts();
            fetchSales(salesPreset, customFrom, customTo);
            setProc(false);
            setSuccess(true);
            setTimeout(() => { setSuccess(false); clearCart(); setMob("pos"); }, 2600);
        } catch (e: any) {
            setProc(false);
            toast.error(e?.message ?? "Checkout failed.");
        }
    };

    // Sign out — always attempt to close any open attendance record first
    const handleSignOut = async () => {
        try {
            // Try RPC first — it handles the lookup internally
            const { error } = await supabase.rpc("record_staff_timeout", { p_staff_id: staff.id });
            if (error) throw error;
        } catch {
            // Fallback: direct update on any open record for this staff
            try {
                const now = new Date().toISOString();
                const today = todayDate();
                const { data: open } = await supabase
                    .from("staff_attendance")
                    .select("id, time_in")
                    .eq("staff_id", staff.id)
                    .eq("date", today)
                    .is("time_out", null)
                    .maybeSingle();
                if (open) {
                    const minutes = Math.round((Date.now() - new Date(open.time_in).getTime()) / 60000);
                    await supabase
                        .from("staff_attendance")
                        .update({ time_out: now, duration_minutes: minutes })
                        .eq("id", open.id);
                }
            } catch {
                // Best-effort — don't block sign-out
            }
        }
        sessionStorage.removeItem("staff_session");
        sessionStorage.removeItem("staff_active_nav");
        router.replace("/auth/staff-cashier-worker-login");
    };

    const initials = staff.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const bounds = getDateBounds(salesPreset, customFrom, customTo);

    // Determine if currently clocked in
    const isClockedIn = !!attendance && !attendance.time_out;
    const attMeta = attendance ? ATT_META[attendance.attendance_status] : null;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
                *, *::before, *::after { font-family:'Plus Jakarta Sans',sans-serif; box-sizing:border-box; }
                h1,h2,h3,.syne { font-family:'Syne',sans-serif; }
                @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                @keyframes attPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
                ::-webkit-scrollbar { width:3px; height:3px; }
                ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:8px; }
                .no-scroll { -ms-overflow-style:none; scrollbar-width:none; }
                .no-scroll::-webkit-scrollbar { display:none; }
                @supports (padding-bottom: env(safe-area-inset-bottom)) {
                    .safe-pad { padding-bottom: env(safe-area-inset-bottom); }
                    .content-safe { padding-bottom: calc(56px + env(safe-area-inset-bottom)); }
                }
                @media (max-width:1023px) { html,body { height:100%; overscroll-behavior:none; } }
            `}</style>

            {/* Sign-out confirmation modal */}
            <SignOutModal
                isOpen={signOutOpen}
                storeName={displayStoreName}
                onConfirm={handleSignOut}
                onCancel={() => setSignOutOpen(false)}
            />

            {/* Attendance details modal */}
            <AnimatePresence>
                {showAttModal && (
                    <AttendanceModal
                        attendance={attendance}
                        history={attHistory}
                        loading={attLoad}
                        liveElapsed={liveElapsed}
                        clockingOut={clockingOut}
                        onClockOut={handleClockOut}
                        onClose={() => setShowAttModal(false)}
                        staffName={staff.full_name}
                    />
                )}
            </AnimatePresence>

            {/* Sale complete overlay */}
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

            <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8" }}>

                {/* Header */}
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

                            {/* Desktop nav */}
                            <nav className="hidden md:flex items-center gap-1">
                                {([
                                    { id: "pos", label: "Point of Sale", icon: <Grid3x3 size={16} /> },
                                    { id: "sales", label: "My Sales", icon: <BarChart3 size={16} /> },
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

                            {/* Right controls — avatar + attendance chip + sign out */}
                            <div className="flex items-center gap-2 flex-shrink-0">

                                {/* Attendance clock-in chip — clickable to open modal */}
                                {!attLoad && (
                                    <button
                                        onClick={() => setShowAttModal(true)}
                                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all"
                                        style={{
                                            background: isClockedIn ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.06)",
                                            borderColor: isClockedIn ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)",
                                        }}>
                                        <span
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{
                                                background: isClockedIn ? "#10b981" : "#ef4444",
                                                animation: isClockedIn ? "attPulse 2s ease-in-out infinite" : "none",
                                            }}
                                        />
                                        <span className="text-[0.65rem] font-black" style={{ color: isClockedIn ? "#059669" : "#dc2626" }}>
                                            {isClockedIn
                                                ? `In · ${formatTime(liveElapsed)}`
                                                : "Not clocked in"}
                                        </span>
                                        <Clock size={10} style={{ color: isClockedIn ? "#059669" : "#dc2626" }} />
                                    </button>
                                )}

                                {/* Avatar chip */}
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

                                <button onClick={() => setSignOutOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.78rem] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-100 transition-all">
                                    <LogOut size={13} /><span className="hidden sm:block">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Metrics strip */}
                    <div className="border-t border-slate-100 px-3 sm:px-6 py-2 grid grid-cols-4 divide-x divide-slate-100 bg-slate-50/60">
                        {[
                            { label: "My Sales Today", val: txLoad ? "—" : php(totalSales), color: "#0891b2" },
                            { label: "My Orders", val: txLoad ? "—" : String(totalOrders), color: "#7c3aed" },
                            { label: "Shift Time", val: formatTime(shiftSec), color: "#059669" },
                            {
                                label: "Attendance",
                                val: attLoad ? "—" : isClockedIn ? formatTime(liveElapsed) : "—",
                                color: isClockedIn ? "#10b981" : "#94a3b8",
                                clickable: true,
                            },
                        ].map((s, i) => (
                            <div
                                key={s.label}
                                className={`text-center px-2 ${(s as any).clickable ? "cursor-pointer hover:bg-white/60 rounded-lg transition-colors" : ""}`}
                                onClick={(s as any).clickable ? () => setShowAttModal(true) : undefined}
                            >
                                <div className="font-black text-[0.88rem] sm:text-[0.95rem] syne flex items-center justify-center gap-1" style={{ color: s.color }}>
                                    {s.val}
                                    {(s as any).clickable && isClockedIn && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" style={{ animation: "attPulse 2s ease-in-out infinite" }} />
                                    )}
                                </div>
                                <div className="text-[0.55rem] sm:text-[0.62rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </header>

                {/* Mobile layout */}
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
                                    staffName={staff.full_name}
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

                    {/* Mobile bottom nav */}
                    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 safe-pad">
                        <div className="grid grid-cols-3" style={{ height: "56px" }}>
                            {([
                                { id: "pos", label: "Products", Icon: Grid3x3 },
                                { id: "cart", label: "Cart", Icon: ShoppingCart },
                                { id: "sales", label: "My Sales", Icon: BarChart3 },
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

                        {/* Mobile attendance bar — tap to open modal */}
                        {!attLoad && (
                            <button
                                onClick={() => setShowAttModal(true)}
                                className="w-full flex items-center justify-center gap-2 py-1 text-[0.62rem] font-bold border-t border-slate-100"
                                style={{
                                    background: isClockedIn ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.04)",
                                    color: isClockedIn ? "#059669" : "#dc2626",
                                }}>
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{
                                        background: isClockedIn ? "#10b981" : "#ef4444",
                                        animation: isClockedIn ? "attPulse 2s ease-in-out infinite" : "none",
                                    }} />
                                {isClockedIn
                                    ? `Clocked in · ${formatTime(liveElapsed)} elapsed · tap to view`
                                    : "Not clocked in · tap to view attendance"}
                                <Clock size={9} />
                            </button>
                        )}

                        <div className="safe-pad" style={{ background: "white" }} />
                    </nav>
                </div>

                {/* Desktop layout */}
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
                                        staffName={staff.full_name}
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

// Attendance modal — shown when cashier taps the clock chip
function AttendanceModal({ attendance, history, loading, liveElapsed, clockingOut, onClockOut, onClose, staffName }: {
    attendance: AttendanceRecord | null;
    history: AttendanceRecord[];
    loading: boolean;
    liveElapsed: number;
    clockingOut: boolean;
    onClockOut: () => void;
    onClose: () => void;
    staffName: string;
}) {
    const isClockedIn = !!attendance && !attendance.time_out;
    const attMeta = attendance ? ATT_META[attendance.attendance_status] : null;

    // Stats from history
    const totalSessions = history.length;
    const totalMinutes = history.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const presentCount = history.filter(r => r.attendance_status === "present").length;
    const lateCount = history.filter(r => r.attendance_status === "late").length;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">

                {/* Mobile drag handle */}
                <div className="flex justify-center pt-3 sm:hidden shrink-0">
                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                </div>

                {/* Header */}
                <div className="shrink-0" style={{ background: "linear-gradient(135deg, #0c4a6e 0%, #0891b2 70%, #06b6d4 100%)" }}>
                    <div className="p-5 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                                    style={{ background: "rgba(255,255,255,0.15)" }}>
                                    <Fingerprint size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-base syne">{staffName}</p>
                                    <p className="text-cyan-200 text-[10px] font-bold">Attendance Record</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Current session card */}
                        {loading ? (
                            <div className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.1)" }} />
                        ) : isClockedIn && attendance ? (
                            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: "attPulse 2s ease-in-out infinite" }} />
                                        <span className="text-emerald-300 text-[10px] font-black uppercase tracking-widest">Active Shift</span>
                                    </div>
                                    {attMeta && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
                                            {attMeta.label}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-cyan-200 text-[9px] font-bold uppercase tracking-wider mb-0.5">Clocked In</p>
                                        <p className="text-white font-black text-base syne">{fmtTime(attendance.time_in)}</p>
                                        <p className="text-cyan-300 text-[10px]">{fmtDate(attendance.date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-cyan-200 text-[9px] font-bold uppercase tracking-wider mb-0.5">Time Elapsed</p>
                                        <p className="text-white font-black text-base syne">{formatTime(liveElapsed)}</p>
                                        <p className="text-cyan-300 text-[10px]">and counting…</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                <Clock size={24} className="text-cyan-300 mx-auto mb-2" />
                                <p className="text-white font-bold text-sm">No active shift recorded</p>
                                <p className="text-cyan-200 text-[10px] mt-0.5">Your last clock-in was from a previous session</p>
                            </div>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-1.5 px-5 pb-4">
                        {[
                            { label: "Sessions", value: String(totalSessions), color: "text-white" },
                            { label: "Present", value: String(presentCount), color: "text-emerald-300" },
                            { label: "Late", value: String(lateCount), color: "text-amber-300" },
                            { label: "Total Hrs", value: `${totalHours}h`, color: "text-cyan-200" },
                        ].map(s => (
                            <div key={s.label} className="rounded-xl py-2 text-center" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">{s.label}</p>
                                <p className={`text-sm font-black mt-0.5 syne ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Clock out button — only if actively clocked in */}
                    {isClockedIn && (
                        <button
                            onClick={onClockOut}
                            disabled={clockingOut}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-white transition-all disabled:opacity-60 active:scale-[0.98] syne text-[0.9rem]"
                            style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", boxShadow: "0 6px 20px rgba(220,38,38,0.3)" }}>
                            {clockingOut
                                ? <><Loader2 size={16} className="animate-spin" /> Clocking Out…</>
                                : <><LogOutIcon size={16} /> Clock Out Now</>
                            }
                        </button>
                    )}

                    {/* Attendance history list */}
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Recent Attendance (Last 14)</p>
                        {loading ? (
                            <div className="space-y-2">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-slate-300">
                                <CalendarDays size={32} className="mb-2 opacity-40" />
                                <p className="text-sm font-bold text-slate-400">No attendance records yet</p>
                                <p className="text-xs text-slate-300 mt-0.5">Records are created automatically when you log in.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((r, i) => {
                                    const meta = ATT_META[r.attendance_status];
                                    const isOpen = !r.time_out;
                                    const isToday = r.date === new Date().toISOString().slice(0, 10);
                                    return (
                                        <motion.div
                                            key={r.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="rounded-2xl border p-3.5 transition-all"
                                            style={{
                                                background: isOpen ? "rgba(16,185,129,0.04)" : "#fafafa",
                                                borderColor: isOpen ? "rgba(16,185,129,0.2)" : "#f1f5f9",
                                            }}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-xs font-bold text-slate-700">{fmtDate(r.date)}</p>
                                                            {isToday && (
                                                                <span className="text-[8px] font-black text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded-full border border-cyan-100">Today</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium flex-wrap">
                                                            <span className="flex items-center gap-0.5">
                                                                <LogIn size={8} className="text-emerald-400" />
                                                                {fmtTime(r.time_in)}
                                                            </span>
                                                            {r.time_out ? (
                                                                <span className="flex items-center gap-0.5">
                                                                    <LogOutIcon size={8} className="text-red-400" />
                                                                    {fmtTime(r.time_out)}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-emerald-600 font-black animate-pulse">
                                                                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                                                    Active now
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.text}`}
                                                        style={{ background: meta.bg }}>
                                                        {meta.label}
                                                    </span>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                                                        {isOpen ? formatTime(liveElapsed) : formatDuration(r.duration_minutes)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <p className="text-center text-[9px] text-slate-300 font-medium pt-1">
                        Your attendance is visible to the store owner in the staff management panel.
                    </p>
                </div>

                {/* Footer */}
                <div className="px-5 shrink-0 bg-white" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                    <button onClick={onClose}
                        className="w-full py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all">
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Product grid panel
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
                    const active = activeCat === cat;
                    const c = cs(cat);
                    return (
                        <button key={cat} onClick={() => setActiveCat(cat)}
                            className="flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-[0.75rem] font-semibold transition-all capitalize whitespace-nowrap"
                            style={{
                                background: active ? c.bg : "white",
                                color: active ? c.color : "#64748b",
                                border: active ? `1.5px solid ${c.color}33` : "1.5px solid #e2e8f0",
                            }}>
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
                                    style={{
                                        borderColor: qty > 0 ? "#0891b2" : "#f1f5f9",
                                        opacity: oos ? .5 : 1,
                                        boxShadow: qty > 0 ? "0 0 0 2px rgba(8,145,178,.12)" : "0 1px 3px rgba(0,0,0,.04)",
                                    }}>
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

// Cart and checkout panel
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
                        const k = cKey(item);
                        const c = cs(item.category);
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
                    {([
                        { id: "cash", label: "Cash", icon: <Banknote size={13} /> },
                        { id: "card", label: "Card", icon: <CreditCard size={13} /> },
                    ] as const).map(pm => (
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
                            {tendered && tenderedAmt >= cartTotal && cartTotal > 0 && (
                                <div className="text-[0.73rem] text-emerald-600 font-bold text-right">Change: {php(change)}</div>
                            )}
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
                        {[cartTotal, 20, 50, 100, 200, 500, 1000]
                            .filter((v, i, a) => v >= cartTotal && a.indexOf(v) === i)
                            .slice(0, 4)
                            .map(v => (
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
                    {processing && (
                        <span className="absolute inset-0 pointer-events-none"
                            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)", animation: "shimmer 1.5s ease-in-out infinite" }} />
                    )}
                    {processing
                        ? <><Loader2 size={17} className="animate-spin" />Processing…</>
                        : <><CheckCircle2 size={17} />Charge {php(cartTotal)}</>
                    }
                </button>
            </div>
        </>
    );
}

// Sales history panel
function SalesPanel({ staffName, transactions, txItems, txLoad, totalSales, totalOrders, totalItems, avgOrder, salesPreset, onPreset, customFrom, setCustomFrom, customTo, setCustomTo, showCustom, onApplyCustom, expandedTx, setExpandedTx, bounds, productById }: {
    staffName: string;
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
            <div className="relative overflow-hidden rounded-none sm:rounded-2xl"
                style={{ background: "linear-gradient(135deg,#0c4a6e 0%,#0891b2 60%,#06b6d4 100%)" }}>
                <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="relative px-4 sm:px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-cyan-200 text-[0.62rem] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Calendar size={10} />{bounds.label}
                            </p>
                            <p className="text-white text-[0.72rem] font-semibold opacity-80">My Sales — {staffName}</p>
                            {txLoad
                                ? <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse mt-1" />
                                : <p className="text-white font-black text-[2.2rem] leading-none syne mt-0.5">{phpShort(totalSales)}</p>
                            }
                        </div>
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

                <div className="grid grid-cols-2 gap-2.5">
                    {[
                        { label: "Total Income", icon: <DollarSign size={15} />, color: "#0891b2", bg: "rgba(8,145,178,.08)", val: txLoad ? null : phpShort(totalSales), full: txLoad ? null : php(totalSales) },
                        { label: "Total Orders", icon: <Receipt size={15} />, color: "#059669", bg: "rgba(5,150,105,.08)", val: txLoad ? null : numShort(totalOrders), full: null },
                        { label: "Items Sold", icon: <ShoppingBag size={15} />, color: "#f59e0b", bg: "rgba(245,158,11,.08)", val: txLoad ? null : numShort(totalItems), full: null },
                        { label: "Avg. Order", icon: <TrendingUp size={15} />, color: "#7c3aed", bg: "rgba(124,58,237,.08)", val: txLoad ? null : phpShort(avgOrder), full: txLoad ? null : php(avgOrder) },
                    ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
                                    {s.icon}
                                </div>
                                <p className="text-[0.62rem] font-bold text-slate-400 uppercase tracking-wider leading-tight">{s.label}</p>
                            </div>
                            {s.val === null
                                ? <div className="h-7 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
                                : <p className="font-black text-slate-900 leading-none syne truncate" style={{ fontSize: "clamp(1.15rem,5vw,1.5rem)" }}>{s.val}</p>
                            }
                            {s.full && s.val && s.full !== s.val && (
                                <p className="text-[0.58rem] text-slate-300 font-medium mt-0.5 truncate">{s.full}</p>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                        <Receipt size={13} className="text-cyan-500" />
                        <h3 className="font-black text-slate-900 text-[0.9rem] syne">My Transaction Log</h3>
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
                                const d = new Date(t.created_at);
                                return (
                                    <div key={t.id}>
                                        <button onClick={() => setExpandedTx(isExp ? null : t.id)}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 active:bg-slate-100 transition-colors text-left">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-cyan-100"
                                                style={{ background: "rgba(8,145,178,.06)" }}>
                                                <span className="text-[0.62rem] font-black text-cyan-500 syne">#{i + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-800 text-[0.78rem] syne truncate max-w-[130px]">{t.transaction_ref}</p>
                                                <p className="text-[0.65rem] text-slate-400 font-medium mt-0.5 truncate">
                                                    {timeAgo(t.created_at)} · {t.item_count} item{t.item_count !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-black text-slate-900 text-[0.88rem] syne">{phpShort(Number(t.total_amount))}</p>
                                                <p className="text-[0.6rem] text-emerald-500 font-bold">chg {phpShort(Number(t.change_amount))}</p>
                                            </div>
                                            <ChevronDown size={13} className="text-slate-300 flex-shrink-0 transition-transform duration-200"
                                                style={{ transform: isExp ? "rotate(180deg)" : "rotate(0deg)" }} />
                                        </button>
                                        <AnimatePresence>
                                            {isExp && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .18 }} className="overflow-hidden">
                                                    <div className="px-4 pb-4 pt-1 bg-slate-50/60 border-t border-slate-100">
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
                                                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: c.bg }}>
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