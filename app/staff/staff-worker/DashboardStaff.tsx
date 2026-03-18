"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Package, TrendingUp, ClipboardList, BarChart3,
    LogOut, AlertTriangle, Tag, Box, ShoppingCart,
    Clock, Activity, Menu, X, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import SignOutModal from "@/app/comps/signoutmodal/page";
import Inventory from "./Inventory";
import Reports from "./Reports";

interface StaffData {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    owner_id: string;
    avatar_url: string | null;
}

interface OwnerStats {
    total_products: number;
    total_meals: number;
    low_stock_products: number;
    low_stock_meals: number;
    today_orders: number;
}

const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={16} /> },
    { id: "inventory", label: "Inventory", icon: <Package size={16} /> },
    { id: "reports", label: "Reports", icon: <TrendingUp size={16} /> },
];

export async function logStaffAction(params: {
    staff_id: string; staff_name: string; staff_role: string; owner_id: string;
    action_type: string; description: string; reference_id?: string; metadata?: object;
}) {
    try {
        await supabase.rpc("log_staff_action", {
            p_staff_id: params.staff_id, p_staff_name: params.staff_name,
            p_staff_role: params.staff_role, p_owner_id: params.owner_id,
            p_action_type: params.action_type, p_description: params.description,
            p_reference_id: params.reference_id ?? null,
            p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        });
    } catch (err) { console.warn("log_staff_action failed:", err); }
}

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

function Logo({ size = 28 }: { size?: number }) {
    const [err, setErr] = useState(false);
    if (err) {
        return (
            <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: size, height: size, background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                <ShoppingCart size={size * 0.48} className="text-white" strokeWidth={2.2} />
            </div>
        );
    }
    return (
        <img src="/images/logo.png" alt="SariSari IMS" onError={() => setErr(true)}
            className="rounded-lg object-contain flex-shrink-0"
            style={{ width: size, height: size }} />
    );
}

export default function DashboardStaff({
    staff,
    ownerStoreName = "",
    ownerFullName = "",
}: {
    staff: StaffData;
    ownerStoreName?: string;
    ownerFullName?: string;
}) {
    const router = useRouter();

    const [activeNav, setActiveNavState] = useState(() => {
        if (typeof window !== "undefined") return sessionStorage.getItem("staff_active_nav") ?? "dashboard";
        return "dashboard";
    });
    const setActiveNav = (id: string) => { setActiveNavState(id); sessionStorage.setItem("staff_active_nav", id); };

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);
    const [stats, setStats] = useState<OwnerStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    const dateStr = now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    const initials = staff.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const displayStoreName = ownerStoreName || "Your Store";
    const displayOwnerName = ownerFullName || "—";

    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const { data, error } = await supabase.rpc("get_owner_stats", { p_owner_id: staff.owner_id });
                if (!error && data) setStats(data as OwnerStats);
            } catch (err) { console.error("Stats error:", err); }
            finally { setStatsLoading(false); }
        };
        fetchStats();
    }, [staff.owner_id]);

    useEffect(() => {
        const fetchActivity = async () => {
            setActivityLoading(true);
            try {
                const { data, error } = await supabase
                    .from("staff_activity_log")
                    .select("id, created_at, action_type, description")
                    .eq("staff_id", staff.id)
                    .order("created_at", { ascending: false })
                    .limit(8);
                if (!error) setRecentActivity(data ?? []);
            } catch (err) { console.error("Activity error:", err); }
            finally { setActivityLoading(false); }
        };
        fetchActivity();
    }, [staff.id]);

    const handleSignOut = async () => {
        sessionStorage.removeItem("staff_session");
        sessionStorage.removeItem("staff_active_nav");
        router.replace("/auth/staff-cashier-worker-login");
    };

    const handleNavClick = (id: string) => { setActiveNav(id); setMobileMenuOpen(false); };

    const totalLowStock = (stats?.low_stock_products ?? 0) + (stats?.low_stock_meals ?? 0);
    const totalProducts = (stats?.total_products ?? 0) + (stats?.total_meals ?? 0);

    const statCards = [
        { label: "Total Products", val: statsLoading ? null : String(totalProducts), icon: <Package size={18} />, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
        { label: "Low Stock Alerts", val: statsLoading ? null : String(totalLowStock), icon: <AlertTriangle size={18} />, color: totalLowStock > 0 ? "#ef4444" : "#f59e0b", bg: totalLowStock > 0 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)" },
        { label: "Today's Orders", val: statsLoading ? null : String(stats?.today_orders ?? 0), icon: <ClipboardList size={18} />, color: "#059669", bg: "rgba(5,150,105,0.08)" },
        { label: "Prepared Meals", val: statsLoading ? null : String(stats?.total_meals ?? 0), icon: <Box size={18} />, color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
    ];

    const actionTypeLabel: Record<string, { label: string; color: string }> = {
        sale: { label: "Sale", color: "#059669" },
        inventory_add: { label: "Added Stock", color: "#7c3aed" },
        inventory_edit: { label: "Edited Item", color: "#0891b2" },
        inventory_delete: { label: "Removed Item", color: "#ef4444" },
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
                *, *::before, *::after { font-family:'Plus Jakarta Sans',sans-serif; box-sizing:border-box; }
                h1,h2,h3,.syne { font-family:'Syne',sans-serif; }
                @keyframes shimmerBar { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
            `}</style>

            <SignOutModal
                isOpen={signOutOpen}
                storeName={displayStoreName}
                onConfirm={handleSignOut}
                onCancel={() => setSignOutOpen(false)}
            />

            <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8" }}>

                {/* ── TOP NAVBAR ── */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="flex items-center justify-between h-14">

                            <div className="flex items-center gap-2.5">
                                <Logo size={28} />
                                <div className="hidden sm:block">
                                    <div className="font-black text-slate-900 text-[0.9rem] leading-none syne">
                                        SariSari<span className="text-violet-600">.</span>IMS
                                    </div>
                                    <div className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400 mt-0.5">· Staff Portal</div>
                                </div>
                            </div>

                            <nav className="hidden md:flex items-center gap-1">
                                {NAV.map(item => {
                                    const active = activeNav === item.id;
                                    return (
                                        <button key={item.id} onClick={() => handleNavClick(item.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[0.82rem] font-semibold transition-all"
                                            style={{ background: active ? "rgba(124,58,237,0.08)" : "transparent", color: active ? "#7c3aed" : "#64748b" }}>
                                            {item.icon} {item.label}
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-white text-[0.6rem] flex-shrink-0 syne"
                                        style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                                        {initials}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[0.75rem] font-bold text-slate-800 leading-none">{staff.full_name}</p>
                                        <p className="text-[0.6rem] text-slate-400 capitalize mt-0.5">{staff.role}</p>
                                    </div>
                                </div>

                                <button onClick={() => setSignOutOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.78rem] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-100 transition-all">
                                    <LogOut size={13} />
                                    <span className="hidden sm:block">Sign Out</span>
                                </button>

                                <button onClick={() => setMobileMenuOpen(v => !v)}
                                    className="md:hidden w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 transition-all">
                                    {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {mobileMenuOpen && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                                className="md:hidden border-t border-slate-100 bg-white overflow-hidden">
                                <div className="px-4 py-2 space-y-0.5">
                                    {NAV.map(item => {
                                        const active = activeNav === item.id;
                                        return (
                                            <button key={item.id} onClick={() => handleNavClick(item.id)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[0.85rem] transition-all text-left"
                                                style={{ background: active ? "rgba(124,58,237,0.08)" : "transparent", color: active ? "#7c3aed" : "#64748b" }}>
                                                {item.icon} {item.label}
                                                {active && <ChevronRight size={13} className="ml-auto" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                {/* ── PAGE CONTENT ── */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

                        <p className="text-[0.72rem] text-slate-400 font-medium mb-5">{dateStr} · {timeStr}</p>

                        {/* ── DASHBOARD ── */}
                        {activeNav === "dashboard" && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>

                                {/* Welcome banner */}
                                <div className="mb-6 rounded-2xl text-white relative overflow-hidden"
                                    style={{ background: "linear-gradient(135deg,#1e0a3c 0%,#4c1d95 60%,#7c3aed 100%)" }}>
                                    <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
                                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
                                    <div className="absolute pointer-events-none"
                                        style={{ top: -60, right: -60, width: 300, height: 300, background: "radial-gradient(circle,rgba(167,139,250,0.25) 0%,transparent 65%)" }} />

                                    <div className="relative p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                                            <div>
                                                <p className="text-violet-300 text-[0.7rem] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 6px #a78bfa" }} />
                                                    {greeting}
                                                </p>
                                                <h2 className="font-black text-2xl leading-tight mb-1 syne">{staff.full_name} 👋</h2>
                                                <p className="text-violet-300 text-[0.82rem]">
                                                    Logged in as{" "}
                                                    <span className="capitalize font-black text-white px-2 py-0.5 rounded-lg bg-white/10">{staff.role}</span>
                                                    {" "}· Activity tracked
                                                </p>
                                            </div>

                                            <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 shrink-0 min-w-[200px]">
                                                <p className="text-violet-300 text-[0.58rem] font-black uppercase tracking-[0.18em] mb-2">Store You Work At</p>
                                                <p className="text-white font-black text-xl leading-tight mb-1 syne">{displayStoreName}</p>
                                                <div className="h-px bg-white/15 mb-2" />
                                                <p className="text-violet-300 text-[0.6rem] font-black uppercase tracking-[0.15em] mb-0.5">Store Owner</p>
                                                <p className="text-white font-bold text-[0.85rem]">{displayOwnerName}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: "Store", value: displayStoreName },
                                                { label: "Owner", value: displayOwnerName },
                                                { label: "Role", value: staff.role ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1) : "—" },
                                                { label: "Status", value: staff.status ? staff.status.charAt(0).toUpperCase() + staff.status.slice(1) : "—" },
                                            ].map(pill => (
                                                <div key={pill.label} className="flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-3 py-1">
                                                    <span className="text-violet-300 text-[0.6rem] font-bold uppercase tracking-wider">{pill.label}:</span>
                                                    <span className="text-white text-[0.75rem] font-black">{pill.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Stat cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    {statCards.map((s, i) => (
                                        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                                            {s.val === null
                                                ? <Skeleton className="h-7 w-14 mb-1" />
                                                : <div className="font-black text-2xl leading-none mb-1 syne" style={{ color: s.color }}>{s.val}</div>
                                            }
                                            <div className="text-[0.7rem] text-slate-400 font-medium">{s.label}</div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Two-column: account + activity */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-slate-100">
                                            <h3 className="font-black text-slate-900 text-[0.95rem] syne">Your Account</h3>
                                        </div>
                                        <div className="p-5 grid grid-cols-2 gap-4">
                                            {[
                                                { label: "Full Name", value: staff.full_name ?? "—" },
                                                { label: "Email", value: staff.email ?? "—" },
                                                { label: "Role", value: staff.role ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1) : "—" },
                                                { label: "Status", value: staff.status ? staff.status.charAt(0).toUpperCase() + staff.status.slice(1) : "—" },
                                            ].map(item => (
                                                <div key={item.label}>
                                                    <p className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                                                    <p className="text-[0.85rem] font-bold text-slate-800 truncate">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Activity size={14} className="text-violet-500" />
                                                <h3 className="font-black text-slate-900 text-[0.95rem] syne">My Activity</h3>
                                            </div>
                                            <span className="text-[0.62rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Actions I performed</span>
                                        </div>

                                        {activityLoading ? (
                                            <div className="p-5 space-y-3">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                                        <Skeleton className="w-8 h-8 shrink-0" />
                                                        <div className="flex-1 space-y-1.5"><Skeleton className="h-2.5 w-3/4" /><Skeleton className="h-2 w-1/2" /></div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : recentActivity.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.07)", color: "#7c3aed" }}>
                                                    <Tag size={18} />
                                                </div>
                                                <p className="text-slate-400 text-sm font-medium">No activity yet.</p>
                                                <p className="text-slate-300 text-xs">Actions you perform will appear here.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {recentActivity.map(act => {
                                                    const meta = actionTypeLabel[act.action_type] ?? { label: act.action_type, color: "#64748b" };
                                                    return (
                                                        <div key={act.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                                                style={{ background: `${meta.color}14`, color: meta.color }}>
                                                                <Activity size={13} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[0.8rem] font-bold text-slate-800 truncate">{act.description}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[0.62rem] font-bold px-1.5 py-0.5 rounded"
                                                                        style={{ background: `${meta.color}14`, color: meta.color }}>{meta.label}</span>
                                                                    <span className="text-[0.62rem] text-slate-400 flex items-center gap-0.5">
                                                                        <Clock size={9} /> {timeAgo(act.created_at)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeNav === "inventory" && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
                                <Inventory ownerIdProp={staff.owner_id} ownerStoreName={displayStoreName} />
                            </motion.div>
                        )}

                        {activeNav === "reports" && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
                                <Reports ownerStoreName={displayStoreName} ownerFullName={displayOwnerName} />
                            </motion.div>
                        )}

                    </div>
                </main>
            </div>
        </>
    );
}