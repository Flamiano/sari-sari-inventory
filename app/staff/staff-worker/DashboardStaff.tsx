"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Package, TrendingUp, ClipboardList, BarChart3,
    LogOut, AlertTriangle, Tag, Box, ShoppingCart,
    Clock, Activity, Menu, X, ChevronRight,
    CalendarDays, LogIn, LogOut as LogOutIcon,
    Fingerprint, Loader2, Wifi, WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import SignOutModal from "@/app/comps/signoutmodal/page";
import Inventory from "./Inventory";
import Reports from "./Reports";

// Types
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

interface AttendanceRecord {
    id: string;
    staff_id: string;
    time_in: string;
    time_out: string | null;
    date: string;
    attendance_status: "present" | "late" | "absent";
    duration_minutes: number | null;
}

const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={16} /> },
    { id: "inventory", label: "Inventory", icon: <Package size={16} /> },
    { id: "reports", label: "Reports", icon: <TrendingUp size={16} /> },
];

const ATT_META = {
    present: { label: "Present", color: "#10b981", bg: "rgba(16,185,129,0.1)", text: "text-emerald-700" },
    late: { label: "Late", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "text-amber-700" },
    absent: { label: "Absent", color: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "text-red-700" },
};

// Log a staff action to the activity log
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

// Returns today as YYYY-MM-DD in local time
function todayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Format a timestamp to readable time
function fmtTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Format a date string to readable date
function fmtDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// Format duration in minutes to Xh Ym
function formatDuration(minutes: number | null) {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60), m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

// Format elapsed seconds to Xh Ym
function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

// Live elapsed counter — ticks every 10s
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

// Attendance Modal
function AttendanceModal({ staffId, staffName, onClose }: {
    staffId: string;
    staffName: string;
    onClose: () => void;
}) {
    const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [clockingOut, setClockingOut] = useState(false);

    const liveElapsed = useLiveElapsed(attendance && !attendance.time_out ? attendance.time_in : null);
    const isClockedIn = !!attendance && !attendance.time_out;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: open } = await supabase
                .from("staff_attendance")
                .select("*")
                .eq("staff_id", staffId)
                .is("time_out", null)
                .order("time_in", { ascending: false })
                .limit(1)
                .maybeSingle();
            setAttendance(open ?? null);

            const { data: hist } = await supabase
                .from("staff_attendance")
                .select("*")
                .eq("staff_id", staffId)
                .order("time_in", { ascending: false })
                .limit(14);
            setHistory(hist ?? []);
        } catch {
            // Non-critical
        } finally {
            setLoading(false);
        }
    }, [staffId]);

    useEffect(() => { load(); }, [load]);

    const handleClockOut = async () => {
        setClockingOut(true);
        try {
            const { error } = await supabase.rpc("record_staff_timeout", { p_staff_id: staffId });
            if (error) throw error;
            await load();
        } catch {
            // Fallback: direct update
            try {
                if (attendance) {
                    const now = new Date().toISOString();
                    const minutes = Math.round((Date.now() - new Date(attendance.time_in).getTime()) / 60000);
                    await supabase
                        .from("staff_attendance")
                        .update({ time_out: now, duration_minutes: minutes })
                        .eq("id", attendance.id);
                    await load();
                }
            } catch { /* silent */ }
        } finally {
            setClockingOut(false);
        }
    };

    const totalSessions = history.length;
    const presentCount = history.filter(r => r.attendance_status === "present").length;
    const lateCount = history.filter(r => r.attendance_status === "late").length;
    const totalMinutes = history.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

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
                <div className="shrink-0" style={{ background: "linear-gradient(135deg, #1e0a3c 0%, #4c1d95 60%, #7c3aed 100%)" }}>
                    <div className="p-5 pb-3">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                                    style={{ background: "rgba(255,255,255,0.15)" }}>
                                    <Fingerprint size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-base" style={{ fontFamily: "Syne, sans-serif" }}>{staffName}</p>
                                    <p className="text-violet-300 text-[10px] font-bold">Attendance Record</p>
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
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"
                                            style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
                                        <span className="text-emerald-300 text-[10px] font-black uppercase tracking-widest">Active Shift</span>
                                    </div>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
                                        {ATT_META[attendance.attendance_status].label}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-violet-300 text-[9px] font-bold uppercase tracking-wider mb-0.5">Clocked In</p>
                                        <p className="text-white font-black text-base" style={{ fontFamily: "Syne, sans-serif" }}>{fmtTime(attendance.time_in)}</p>
                                        <p className="text-violet-300 text-[10px]">{fmtDate(attendance.date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-violet-300 text-[9px] font-bold uppercase tracking-wider mb-0.5">Elapsed</p>
                                        <p className="text-white font-black text-base" style={{ fontFamily: "Syne, sans-serif" }}>{formatElapsed(liveElapsed)}</p>
                                        <p className="text-violet-300 text-[10px]">and counting…</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                <Clock size={22} className="text-violet-300 mx-auto mb-2" />
                                <p className="text-white font-bold text-sm">No active shift</p>
                                <p className="text-violet-300 text-[10px] mt-0.5">You are currently clocked out</p>
                            </div>
                        )}
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-4 gap-1.5 px-5 pb-4">
                        {[
                            { label: "Sessions", value: String(totalSessions), color: "text-white" },
                            { label: "Present", value: String(presentCount), color: "text-emerald-300" },
                            { label: "Late", value: String(lateCount), color: "text-amber-300" },
                            { label: "Total Hrs", value: `${totalHours}h`, color: "text-violet-200" },
                        ].map(s => (
                            <div key={s.label} className="rounded-xl py-2 text-center"
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">{s.label}</p>
                                <p className={`text-sm font-black mt-0.5 ${s.color}`} style={{ fontFamily: "Syne, sans-serif" }}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Clock out button */}
                    {isClockedIn && (
                        <button
                            onClick={handleClockOut}
                            disabled={clockingOut}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-white transition-all disabled:opacity-60 active:scale-[0.98]"
                            style={{
                                background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                                boxShadow: "0 6px 20px rgba(220,38,38,0.3)",
                                fontFamily: "Syne, sans-serif",
                                fontSize: "0.9rem",
                            }}>
                            {clockingOut
                                ? <><Loader2 size={16} className="animate-spin" /> Clocking Out…</>
                                : <><LogOutIcon size={16} /> Clock Out Now</>}
                        </button>
                    )}

                    {/* History */}
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Recent Attendance (Last 14)</p>
                        {loading ? (
                            <div className="space-y-2">
                                {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-slate-300">
                                <CalendarDays size={32} className="mb-2 opacity-40" />
                                <p className="text-sm font-bold text-slate-400">No attendance records yet</p>
                                <p className="text-xs text-slate-300 mt-0.5">Records are created automatically on login.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((r, i) => {
                                    const meta = ATT_META[r.attendance_status];
                                    const isOpen = !r.time_out;
                                    const isToday = r.date === todayDate();
                                    return (
                                        <motion.div key={r.id}
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="rounded-2xl border p-3.5"
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
                                                                <span className="text-[8px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-100">Today</span>
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
                                                        {isOpen ? formatElapsed(liveElapsed) : formatDuration(r.duration_minutes)}
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
                <div className="px-5 shrink-0 bg-white"
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                    <button onClick={onClose}
                        className="w-full py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all">
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Main DashboardStaff
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

    // Attendance state
    const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
    const [attLoad, setAttLoad] = useState(true);
    const [showAttModal, setShowAttModal] = useState(false);

    const liveElapsed = useLiveElapsed(attendance && !attendance.time_out ? attendance.time_in : null);
    const isClockedIn = !!attendance && !attendance.time_out;

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    const dateStr = now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    const initials = staff.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const displayStoreName = ownerStoreName || "Your Store";
    const displayOwnerName = ownerFullName || "—";

    // Fetch + auto-create today's attendance record
    const fetchAttendance = useCallback(async () => {
        setAttLoad(true);
        try {
            const today = todayDate();

            // Check for an existing open record today
            const { data: open } = await supabase
                .from("staff_attendance")
                .select("*")
                .eq("staff_id", staff.id)
                .eq("date", today)
                .is("time_out", null)
                .order("time_in", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (open) {
                setAttendance(open);
            } else {
                // No open record — create one now (this is the authoritative clock-in)
                // On time = at or before 8:00 AM, late = 8:01 AM onward (noon absent via scheduled job)
                const n = new Date();
                const status = (n.getHours() < 8 || (n.getHours() === 8 && n.getMinutes() === 0))
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
                    // Race condition — re-fetch
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
        } catch {
            // Non-critical
        } finally {
            setAttLoad(false);
        }
    }, [staff.id, staff.full_name, staff.role, staff.owner_id]);

    // Stats fetch
    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const { data, error } = await supabase.rpc("get_owner_stats", { p_owner_id: staff.owner_id });
                if (!error && data) setStats(data as OwnerStats);
            } catch { /* silent */ }
            finally { setStatsLoading(false); }
        };
        fetchStats();
    }, [staff.owner_id]);

    // Activity log fetch
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
            } catch { /* silent */ }
            finally { setActivityLoading(false); }
        };
        fetchActivity();
    }, [staff.id]);

    // Attendance on mount
    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    // Presence — broadcast this staff member as online to the owner's presence channel
    useEffect(() => {
        const presenceChannel = supabase.channel(`presence:staff:${staff.owner_id}`);

        presenceChannel
            .on("presence", { event: "sync" }, () => { })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await presenceChannel.track({
                        staff_id: staff.id,
                        name: staff.full_name,
                        role: staff.role,
                    });
                }
            });

        return () => {
            presenceChannel.untrack();
            supabase.removeChannel(presenceChannel);
        };
    }, [staff.id, staff.owner_id, staff.full_name, staff.role]);

    // Sign out — attempt clock-out first
    const handleSignOut = async () => {
        try {
            await supabase.rpc("record_staff_timeout", { p_staff_id: staff.id });
        } catch {
            try {
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
                        .update({ time_out: new Date().toISOString(), duration_minutes: minutes })
                        .eq("id", open.id);
                }
            } catch { /* best-effort */ }
        }
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
                @keyframes attPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
            `}</style>

            <SignOutModal
                isOpen={signOutOpen}
                storeName={displayStoreName}
                onConfirm={handleSignOut}
                onCancel={() => setSignOutOpen(false)}
            />

            <AnimatePresence>
                {showAttModal && (
                    <AttendanceModal
                        staffId={staff.id}
                        staffName={staff.full_name}
                        onClose={() => { setShowAttModal(false); fetchAttendance(); }}
                    />
                )}
            </AnimatePresence>

            <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8" }}>

                {/* TOP NAVBAR */}
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

                            <div className="flex items-center gap-2 flex-shrink-0">

                                {/* Attendance chip — desktop */}
                                {!attLoad && (
                                    <button
                                        onClick={() => setShowAttModal(true)}
                                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all"
                                        style={{
                                            background: isClockedIn ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.06)",
                                            borderColor: isClockedIn ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)",
                                        }}>
                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{
                                                background: isClockedIn ? "#10b981" : "#ef4444",
                                                animation: isClockedIn ? "attPulse 2s ease-in-out infinite" : "none",
                                            }} />
                                        <span className="text-[0.65rem] font-black"
                                            style={{ color: isClockedIn ? "#059669" : "#dc2626" }}>
                                            {isClockedIn ? `In · ${formatElapsed(liveElapsed)}` : "Not clocked in"}
                                        </span>
                                        <Clock size={10} style={{ color: isClockedIn ? "#059669" : "#dc2626" }} />
                                    </button>
                                )}

                                {/* Avatar chip */}
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

                    {/* Mobile menu */}
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

                                {/* Mobile attendance bar inside menu */}
                                {!attLoad && (
                                    <div className="px-4 pb-3">
                                        <button
                                            onClick={() => { setShowAttModal(true); setMobileMenuOpen(false); }}
                                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[0.72rem] font-bold border transition-all"
                                            style={{
                                                background: isClockedIn ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.05)",
                                                borderColor: isClockedIn ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)",
                                                color: isClockedIn ? "#059669" : "#dc2626",
                                            }}>
                                            <span className="w-1.5 h-1.5 rounded-full"
                                                style={{
                                                    background: isClockedIn ? "#10b981" : "#ef4444",
                                                    animation: isClockedIn ? "attPulse 2s ease-in-out infinite" : "none",
                                                }} />
                                            {isClockedIn
                                                ? `Clocked in · ${formatElapsed(liveElapsed)} elapsed · tap to view`
                                                : "Not clocked in · tap to view attendance"}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Metrics strip */}
                    <div className="border-t border-slate-100 px-4 sm:px-6 py-2 max-w-7xl mx-auto grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/60">
                        {[
                            { label: "Total Products", val: statsLoading ? "—" : String(totalProducts), color: "#7c3aed" },
                            { label: "Low Stock", val: statsLoading ? "—" : String(totalLowStock), color: totalLowStock > 0 ? "#ef4444" : "#f59e0b" },
                            {
                                label: "Attendance",
                                val: attLoad ? "—" : isClockedIn ? formatElapsed(liveElapsed) : "—",
                                color: isClockedIn ? "#10b981" : "#94a3b8",
                                clickable: true,
                            },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className={`text-center px-2 ${(s as any).clickable ? "cursor-pointer hover:bg-white/60 rounded-lg transition-colors" : ""}`}
                                onClick={(s as any).clickable ? () => setShowAttModal(true) : undefined}>
                                <div className="font-black text-[0.88rem] sm:text-[0.95rem] syne flex items-center justify-center gap-1" style={{ color: s.color }}>
                                    {s.val}
                                    {(s as any).clickable && isClockedIn && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                                            style={{ animation: "attPulse 2s ease-in-out infinite" }} />
                                    )}
                                </div>
                                <div className="text-[0.55rem] sm:text-[0.62rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

                        <p className="text-[0.72rem] text-slate-400 font-medium mb-5">{dateStr} · {timeStr}</p>

                        {/* DASHBOARD */}
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

                                                {/* Inline attendance status in banner */}
                                                {!attLoad && attendance && (
                                                    <button
                                                        onClick={() => setShowAttModal(true)}
                                                        className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                                        <span className="w-1.5 h-1.5 rounded-full"
                                                            style={{
                                                                background: isClockedIn ? "#10b981" : "#94a3b8",
                                                                animation: isClockedIn ? "attPulse 2s ease-in-out infinite" : "none",
                                                            }} />
                                                        <span className="text-[0.72rem] font-bold text-white/80">
                                                            {isClockedIn
                                                                ? `Clocked in at ${fmtTime(attendance.time_in)} · ${formatElapsed(liveElapsed)} elapsed`
                                                                : "Clocked out"}
                                                        </span>
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg"
                                                            style={{
                                                                background: ATT_META[attendance.attendance_status].bg,
                                                                color: ATT_META[attendance.attendance_status].color,
                                                            }}>
                                                            {ATT_META[attendance.attendance_status].label}
                                                        </span>
                                                    </button>
                                                )}
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
                                                <div key={pill.label} className="flex items-center gap-1.5 border border-white/15 rounded-full px-3 py-1"
                                                    style={{ background: "rgba(255,255,255,0.08)" }}>
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

                                        {/* Today's attendance row inside account card */}
                                        {!attLoad && attendance && (
                                            <div className="mx-5 mb-5 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:opacity-90 transition-all"
                                                style={{ background: ATT_META[attendance.attendance_status].bg }}
                                                onClick={() => setShowAttModal(true)}>
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays size={13} style={{ color: ATT_META[attendance.attendance_status].color }} />
                                                    <div>
                                                        <p className="text-[11px] font-black" style={{ color: ATT_META[attendance.attendance_status].color }}>
                                                            {ATT_META[attendance.attendance_status].label} · {fmtTime(attendance.time_in)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 font-medium">
                                                            {isClockedIn ? `${formatElapsed(liveElapsed)} elapsed` : `Clocked out ${attendance.time_out ? fmtTime(attendance.time_out) : ""}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={12} className="text-slate-400" />
                                            </div>
                                        )}
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