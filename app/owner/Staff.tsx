"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    UserRound, Plus, X, Check, Loader2, Trash2,
    Pencil, Mail, KeyRound, Search, MoreVertical,
    UserX, UserCheck, BadgeCheck, ChevronRight,
    Flame, Clock, CalendarDays, LogIn, LogOut,
    CheckCircle2, ChevronDown, RotateCcw, AlertCircle,
    TrendingUp, BarChart2, Wifi, WifiOff,
    Filter, Table2, Download, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
    AreaChart, Area, PieChart, Pie, Legend,
    RadialBarChart, RadialBar,
} from "recharts";
import { getDayStatus, isPastNoon, localDateString, type DayStatus } from "@/app/utils/attendanceOff";

// Types
type StaffRole = "staff" | "cashier";
type StaffStatus = "active" | "inactive" | "pending";
type AttendanceStatus = "present" | "absent" | "late";

interface StaffMember {
    id: string;
    owner_id: string;
    staff_user_id: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    pin_code: string | null;
    role: StaffRole;
    status: StaffStatus;
    avatar_url: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface AttendanceRecord {
    id: string;
    staff_id: string;
    staff_name: string;
    staff_role: StaffRole;
    owner_id: string;
    time_in: string;
    time_out: string | null;
    date: string;
    attendance_status: AttendanceStatus;
    duration_minutes: number | null;
    notes: string | null;
    created_at: string;
}

type FormData = {
    full_name: string;
    email: string;
    phone: string;
    pin_code: string;
    role: StaffRole;
    status: StaffStatus;
    notes: string;
};

interface DropdownOption {
    value: string;
    label: string;
    dot?: string;
}

// Config
const ROLE_META: Record<StaffRole, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    cashier: { label: "Cashier", color: "text-teal-700", bg: "bg-teal-100", icon: BadgeCheck },
    staff: { label: "Staff", color: "text-orange-700", bg: "bg-orange-100", icon: UserRound },
};

const STATUS_META: Record<StaffStatus, { label: string; dot: string }> = {
    active: { label: "Active", dot: "bg-emerald-500" },
    inactive: { label: "Inactive", dot: "bg-slate-300" },
    pending: { label: "Pending", dot: "bg-amber-400" },
};

const ATTENDANCE_META: Record<AttendanceStatus, { label: string; color: string; bg: string; dot: string; barColor: string }> = {
    present: { label: "Present", color: "text-emerald-700", bg: "bg-emerald-50", dot: "#10b981", barColor: "#10b981" },
    absent: { label: "Absent", color: "text-red-600", bg: "bg-red-50", dot: "#ef4444", barColor: "#ef4444" },
    late: { label: "Late", color: "text-amber-700", bg: "bg-amber-50", dot: "#f59e0b", barColor: "#f59e0b" },
};

// Helpers
function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    if (local.length <= 4) return `${local[0]}****@${domain}`;
    return `${local.slice(0, 2)}****${local.slice(-2)}@${domain}`;
}

function formatPHPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    const withZero = digits.startsWith("0") ? digits : "0" + digits;
    return withZero.slice(0, 11);
}

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(minutes: number | null) {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function initials(name: string) {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
    "from-teal-500 to-cyan-600",
    "from-orange-500 to-amber-500",
    "from-rose-500 to-orange-500",
    "from-cyan-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-cyan-600",
];

function avatarGradient(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

// PH Flag
function PHFlag() {
    return (
        <svg viewBox="0 0 20 14" width="20" height="14" className="rounded-sm shrink-0" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="7" fill="#0038A8" />
            <rect y="7" width="20" height="7" fill="#CE1126" />
            <polygon points="0,0 10,7 0,14" fill="white" />
            <circle cx="3.8" cy="7" r="1.3" fill="#FCD116" />
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * 45 * Math.PI) / 180;
                return <line key={i} x1={3.8 + 1.5 * Math.cos(angle)} y1={7 + 1.5 * Math.sin(angle)} x2={3.8 + 2.2 * Math.cos(angle)} y2={7 + 2.2 * Math.sin(angle)} stroke="#FCD116" strokeWidth="0.5" />;
            })}
            {[{ cx: 1.3, cy: 2.2 }, { cx: 1.3, cy: 11.8 }, { cx: 6.8, cy: 7 }].map((s, i) => (
                <text key={i} x={s.cx} y={s.cy} fontSize="1.6" fill="#FCD116" textAnchor="middle" dominantBaseline="middle">★</text>
            ))}
        </svg>
    );
}

// Reusable dropdown
function DropdownSelect({ label, value, options, onSelect, icon }: {
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
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
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
                        {current?.value === "all" ? `All ${label}s` : (current?.label ?? "All")}
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
                        transition={{ duration: 0.13 }}
                        className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                        style={{ minWidth: "200px" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                            {options.map(o => (
                                <button key={o.value} type="button"
                                    onClick={() => { onSelect(o.value); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                    {o.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />}
                                    <span className={`text-[0.82rem] flex-1 ${value === o.value ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>{o.label}</span>
                                    {value === o.value && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Attendance Modal — 3 tabs: Bar chart, Overview (donut + area + radial), Table
function AttendanceModal({ member, onClose }: { member: StaffMember; onClose: () => void }) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"bar" | "overview" | "table">("bar");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("staff_attendance")
                .select("*")
                .eq("staff_id", member.id)
                .order("time_in", { ascending: false })
                .limit(30);
            if (!error) setRecords(data ?? []);
            setLoading(false);
        };
        load();
    }, [member.id]);

    // Core stats
    const totalSessions = records.length;
    const presentDays = records.filter(r => r.attendance_status === "present").length;
    const lateDays = records.filter(r => r.attendance_status === "late").length;
    const absentDays = records.filter(r => r.attendance_status === "absent").length;
    const totalMinutes = records.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const avgMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const attendanceRate = totalSessions > 0 ? Math.round(((presentDays + lateDays) / totalSessions) * 100) : 0;
    const punctualRate = totalSessions > 0 ? Math.round((presentDays / totalSessions) * 100) : 0;

    // Bar chart — last 14 days
    const barData = (() => {
        const days: { date: string; label: string; hours: number; status: AttendanceStatus | null }[] = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const rec = records.find(r => r.date === dateStr);
            days.push({
                date: dateStr,
                label: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
                hours: rec?.duration_minutes ? parseFloat((rec.duration_minutes / 60).toFixed(1)) : 0,
                status: rec?.attendance_status ?? null,
            });
        }
        return days;
    })();

    // Area chart — daily + cumulative hours trend
    const areaData = (() => {
        let cumulative = 0;
        return barData.map(d => {
            cumulative += d.hours;
            return { label: d.label, hours: parseFloat(d.hours.toFixed(1)), cumulative: parseFloat(cumulative.toFixed(1)) };
        });
    })();

    // Donut breakdown
    const donutData = [
        { name: "Present", value: presentDays, fill: "#10b981" },
        { name: "Late", value: lateDays, fill: "#f59e0b" },
        { name: "Absent", value: absentDays, fill: "#ef4444" },
    ].filter(d => d.value > 0);

    // Radial bar — attendance + punctuality rates
    const radialData = [
        { name: "Attendance", value: attendanceRate, fill: "#14b8a6" },
        { name: "On Time", value: punctualRate, fill: "#6366f1" },
    ];

    // Shared dark tooltip
    const DarkTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const item = payload[0].payload;
        return (
            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl text-xs space-y-0.5" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="font-black text-slate-200 mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.color ?? p.fill ?? "#fff" }}>
                        {p.name}: <span className="font-black">{p.value}{(p.dataKey === "hours" || p.dataKey === "cumulative") ? "h" : ""}</span>
                    </p>
                ))}
                {item?.status && (
                    <p style={{ color: ATTENDANCE_META[item.status as AttendanceStatus]?.dot }}>
                        {ATTENDANCE_META[item.status as AttendanceStatus]?.label}
                    </p>
                )}
            </div>
        );
    };

    const DonutTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl text-xs" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ color: payload[0].payload.fill }} className="font-black">{payload[0].name}</p>
                <p className="text-slate-300">{payload[0].value} day{payload[0].value !== 1 ? "s" : ""}</p>
            </div>
        );
    };

    const tabs = [
        { id: "bar" as const, label: "Daily Hours", icon: <BarChart2 size={11} /> },
        { id: "overview" as const, label: "Overview", icon: <TrendingUp size={11} /> },
        { id: "table" as const, label: "Records", icon: <CalendarDays size={11} /> },
    ];

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">

                {/* Mobile drag handle */}
                <div className="flex justify-center pt-3 sm:hidden shrink-0">
                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                </div>

                {/* Header */}
                <div className="shrink-0" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #134e4a 100%)" }}>
                    <div className="p-5 pb-3">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarGradient(member.full_name)} flex items-center justify-center shrink-0 shadow-lg`}>
                                    <span className="text-sm font-black text-white">{initials(member.full_name)}</span>
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white">{member.full_name}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-slate-400 text-[11px] capitalize">{member.role}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                        <span className="text-[10px] font-black text-teal-400">{attendanceRate}% attendance</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Stats strip */}
                        <div className="grid grid-cols-5 gap-1.5">
                            {[
                                { label: "Sessions", value: String(totalSessions), color: "text-white" },
                                { label: "Present", value: String(presentDays), color: "text-emerald-400" },
                                { label: "Late", value: String(lateDays), color: "text-amber-400" },
                                { label: "Absent", value: String(absentDays), color: "text-red-400" },
                                { label: "Total Hrs", value: `${totalHours}h`, color: "text-cyan-300" },
                            ].map(s => (
                                <div key={s.label} className="rounded-xl px-1.5 py-2 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                                    <p className="text-[7.5px] text-slate-500 uppercase tracking-wider font-bold leading-none mb-1">{s.label}</p>
                                    <p className={`text-base font-black leading-none ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-5 pb-0 gap-0.5">
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setView(t.id)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-black rounded-t-xl transition-all ${view === t.id
                                    ? "bg-white text-slate-800"
                                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5"}`}>
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm font-medium">Loading records…</span>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-slate-300">
                            <CalendarDays size={40} className="mb-3 opacity-40" />
                            <p className="text-sm font-bold text-slate-400">No attendance records yet</p>
                            <p className="text-xs mt-1 text-slate-300">Records are logged automatically on login.</p>
                        </div>
                    ) : view === "bar" ? (

                        // BAR CHART tab
                        <div className="p-5 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-black text-slate-700">Hours Worked — Last 14 Days</p>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                        Avg {formatDuration(avgMinutes)}/session
                                    </span>
                                </div>
                                <p className="text-[9px] text-slate-400 mb-4">Bar color reflects attendance status</p>
                                <div style={{ height: 190 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barCategoryGap="28%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize: 8.5, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} interval={1} />
                                            <YAxis tick={{ fontSize: 8.5, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
                                            <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(148,163,184,0.07)", radius: 4 }} />
                                            <Bar dataKey="hours" radius={[6, 6, 0, 0]} name="hours">
                                                {barData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.status ? ATTENDANCE_META[entry.status].barColor : "#e2e8f0"} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap mt-3 pt-3 border-t border-slate-50">
                                    {(["present", "late", "absent"] as AttendanceStatus[]).map(s => (
                                        <div key={s} className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded" style={{ background: ATTENDANCE_META[s].barColor }} />
                                            <span className="text-[10px] font-bold text-slate-500 capitalize">{s}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded bg-slate-200" />
                                        <span className="text-[10px] font-bold text-slate-400">No record</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent sessions list */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                                <p className="text-xs font-black text-slate-700 mb-3">Recent Sessions</p>
                                <div className="space-y-2">
                                    {records.slice(0, 7).map(r => {
                                        const meta = ATTENDANCE_META[r.attendance_status];
                                        const isOpen = !r.time_out;
                                        return (
                                            <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${meta.bg}`}>
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.dot }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-700">{formatDate(r.date)}</p>
                                                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                        <LogIn size={8} /> {formatTime(r.time_in)}
                                                        {r.time_out && <><LogOut size={8} /> {formatTime(r.time_out)}</>}
                                                        {isOpen && <span className="text-emerald-600 font-black animate-pulse">● Active now</span>}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-[10px] font-black ${meta.color}`}>{meta.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{formatDuration(r.duration_minutes)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    ) : view === "overview" ? (

                        // OVERVIEW tab — donut + radial + area
                        <div className="p-5 space-y-4">

                            {/* Top row: Donut + Radial */}
                            <div className="grid grid-cols-2 gap-4">

                                {/* Donut — session breakdown */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Breakdown</p>
                                    <p className="text-[9px] text-slate-400 mb-1">{totalSessions} total sessions</p>
                                    <div style={{ height: 148 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={donutData}
                                                    cx="50%" cy="50%"
                                                    innerRadius={42} outerRadius={62}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    strokeWidth={0}
                                                >
                                                    {donutData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<DonutTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-1.5 mt-1">
                                        {donutData.map(d => (
                                            <div key={d.name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                                                    <span className="text-[10px] font-bold text-slate-500">{d.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-700">{d.value}d</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Radial — attendance + punctuality rates */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Rates</p>
                                    <p className="text-[9px] text-slate-400 mb-1">Based on {totalSessions} sessions</p>
                                    <div style={{ height: 148 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart
                                                cx="50%" cy="50%"
                                                innerRadius={28} outerRadius={64}
                                                data={radialData}
                                                startAngle={90} endAngle={-270}
                                                barSize={13}
                                            >
                                                <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f1f5f9" }} />
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload?.length) return null;
                                                        return (
                                                            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                                                                <p style={{ color: payload[0].payload.fill }} className="font-black">{payload[0].payload.name}</p>
                                                                <p className="text-slate-300">{payload[0].value}%</p>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-1.5 mt-1">
                                        {radialData.map(d => (
                                            <div key={d.name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                                                    <span className="text-[10px] font-bold text-slate-500">{d.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black" style={{ color: d.fill }}>{d.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Area chart — daily + cumulative hours */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-xs font-black text-slate-700">Hours Trend — Last 14 Days</p>
                                    <span className="text-[10px] font-black text-teal-600">{totalHours}h total</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mb-3">Daily hours vs cumulative hours logged</p>
                                <div style={{ height: 165 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                                                </linearGradient>
                                                <linearGradient id="gradDaily" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize: 8.5, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} interval={1} />
                                            <YAxis tick={{ fontSize: 8.5, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
                                            <Tooltip content={<DarkTooltip />} cursor={{ stroke: "rgba(148,163,184,0.3)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                                            <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke="#14b8a6" strokeWidth={2} fill="url(#gradCumulative)" dot={false} activeDot={{ r: 4, fill: "#14b8a6", strokeWidth: 0 }} />
                                            <Area type="monotone" dataKey="hours" name="Daily hrs" stroke="#6366f1" strokeWidth={2} fill="url(#gradDaily)" dot={false} activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-0.5 rounded-full bg-teal-400" />
                                        <span className="text-[10px] font-bold text-slate-500">Cumulative</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-0.5 rounded-full bg-indigo-400" />
                                        <span className="text-[10px] font-bold text-slate-500">Daily hours</span>
                                    </div>
                                </div>
                            </div>

                            {/* Insight strip */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Avg Session", value: formatDuration(avgMinutes), sub: "per login", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-100" },
                                    { label: "Attendance", value: `${attendanceRate}%`, sub: "show-up rate", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-100" },
                                    { label: "On Time", value: `${punctualRate}%`, sub: "punctuality", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
                                ].map(c => (
                                    <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl p-3 text-center`}>
                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
                                        <p className={`text-base font-black ${c.color}`}>{c.value}</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">{c.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    ) : (

                        // TABLE tab
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-black text-slate-700">All Records</p>
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                    {records.length} entries · {totalHours}h total
                                </span>
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                                            {["Date", "Status", "Time In", "Time Out", "Duration"].map(h => (
                                                <th key={h} className="px-3 py-3 text-left font-black text-slate-500 text-[10px] uppercase tracking-wider whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {records.map((r, i) => {
                                            const meta = ATTENDANCE_META[r.attendance_status];
                                            const isOpen = !r.time_out;
                                            return (
                                                <tr key={r.id} className={`transition-colors hover:bg-slate-50/80 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                                                    <td className="px-3 py-2.5 font-bold text-slate-700 whitespace-nowrap">{formatDate(r.date)}</td>
                                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black ${meta.bg} ${meta.color}`}>
                                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.dot }} />
                                                            {meta.label}
                                                            {isOpen && <span className="text-[8px] font-black text-emerald-500 ml-0.5">LIVE</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <LogIn size={9} className="text-slate-300" /> {formatTime(r.time_in)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                                        {r.time_out ? (
                                                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                                                                <LogOut size={9} className="text-slate-300" /> {formatTime(r.time_out)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-500 font-black flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                                        <span className={`font-black ${r.duration_minutes ? "text-teal-600" : "text-slate-300"}`}>
                                                            {formatDuration(r.duration_minutes)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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


// Staff Card
function StaffCard({ member, index, onEdit, onDelete, onToggleStatus, onViewAttendance, lastAttendance, isOnline }: {
    member: StaffMember;
    index: number;
    onEdit: (m: StaffMember) => void;
    onDelete: (m: StaffMember) => void;
    onToggleStatus: (m: StaffMember) => void;
    onViewAttendance: (m: StaffMember) => void;
    lastAttendance: AttendanceRecord | null;
    isOnline: boolean;
}) {
    const role = ROLE_META[member.role];
    const status = STATUS_META[member.status];
    const RoleIcon = role.icon;
    const [menuOpen, setMenuOpen] = useState(false);
    const isClockedIn = lastAttendance && !lastAttendance.time_out;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group w-full"
        >
            <div className={`h-1 w-full bg-gradient-to-r ${member.role === "cashier" ? "from-teal-500 to-cyan-500" : "from-orange-400 to-amber-500"}`} />
            <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div
                                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarGradient(member.full_name)} flex items-center justify-center shadow-sm transition-all`}
                                style={isOnline ? { boxShadow: "0 0 0 2.5px #22c55e, 0 0 0 4.5px rgba(34,197,94,0.2)" } : {}}>
                                <span className="text-sm font-black text-white">{initials(member.full_name)}</span>
                            </div>
                            {/* Online/Offline indicator dot — bottom-right corner */}
                            <span
                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full transition-colors"
                                style={{ background: isOnline ? "#22c55e" : "#94a3b8" }}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 leading-tight">{member.full_name}</p>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">{status.label}</span>
                                {/* Online/Offline badge */}
                                <span
                                    className="text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded-full border flex items-center gap-0.5"
                                    style={isOnline
                                        ? { color: "#16a34a", background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)" }
                                        : { color: "#94a3b8", background: "rgba(148,163,184,0.08)", borderColor: "rgba(148,163,184,0.2)" }}>
                                    {isOnline
                                        ? <><span className="w-1 h-1 rounded-full bg-green-500 inline-block" style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} /> Online</>
                                        : <><WifiOff size={7} /> Offline</>
                                    }
                                </span>
                                {isClockedIn && (
                                    <span className="text-[8px] sm:text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 sm:px-1.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                                        ● In
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <button onClick={() => setMenuOpen(v => !v)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <MoreVertical size={14} />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.92, y: -4 }} transition={{ duration: 0.12 }}
                                        className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden w-48"
                                    >
                                        <button onClick={() => { onEdit(member); setMenuOpen(false); }}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                            <Pencil size={12} className="text-slate-400" /> Edit Details
                                        </button>
                                        <button onClick={() => { onViewAttendance(member); setMenuOpen(false); }}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                            <CalendarDays size={12} className="text-teal-500" /> View Attendance
                                        </button>
                                        <button onClick={() => { onToggleStatus(member); setMenuOpen(false); }}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                            {member.status === "active"
                                                ? <><UserX size={12} className="text-amber-500" /> Deactivate</>
                                                : <><UserCheck size={12} className="text-emerald-500" /> Activate</>}
                                        </button>
                                        <div className="h-px bg-slate-100 mx-3" />
                                        <button onClick={() => { onDelete(member); setMenuOpen(false); }}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
                                            <Trash2 size={12} /> Remove Staff
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl ${role.bg} mb-2 sm:mb-3`}>
                    <RoleIcon size={10} className={role.color} />
                    <span className={`text-[10px] font-black ${role.color}`}>{role.label}</span>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Mail size={9} className="shrink-0 text-slate-300" />
                        <span className="truncate font-medium font-mono">{maskEmail(member.email)}</span>
                    </div>
                    {member.phone && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <PHFlag />
                            <span className="font-medium">{member.phone}</span>
                        </div>
                    )}
                    {member.pin_code && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <KeyRound size={9} className="shrink-0 text-slate-300" />
                            <span className="tracking-[0.3em] text-slate-400 font-mono">••••</span>
                            <span className="text-[9px] text-slate-300">PIN set</span>
                        </div>
                    )}
                </div>

                {/* Last attendance snippet */}
                {lastAttendance && (
                    <div className={`mt-2 sm:mt-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] ${ATTENDANCE_META[lastAttendance.attendance_status].bg} flex items-center gap-1.5`}>
                        <Clock size={9} className={ATTENDANCE_META[lastAttendance.attendance_status].color} />
                        <span className={`font-bold ${ATTENDANCE_META[lastAttendance.attendance_status].color}`}>
                            {isClockedIn
                                ? `In since ${formatTime(lastAttendance.time_in)}`
                                : `${formatDate(lastAttendance.date)} · ${formatTime(lastAttendance.time_in)}${lastAttendance.time_out ? ` – ${formatTime(lastAttendance.time_out)}` : ""}`}
                        </span>
                    </div>
                )}

                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] text-slate-300 font-medium">Added {timeAgo(member.created_at)}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onViewAttendance(member)}
                            className="text-[10px] font-black text-slate-400 hover:text-teal-600 flex items-center gap-0.5 transition-colors">
                            <CalendarDays size={9} /> Attendance
                        </button>
                        <span className="text-slate-200">·</span>
                        <button onClick={() => onEdit(member)}
                            className="text-[10px] font-black text-teal-600 hover:text-teal-700 flex items-center gap-0.5 transition-colors">
                            Edit <ChevronRight size={9} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Staff Form Modal (Add / Edit)
function StaffModal({ mode, initial, onClose, onSaved }: {
    mode: "add" | "edit";
    initial?: StaffMember;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<FormData>({
        full_name: initial?.full_name ?? "",
        email: initial?.email ?? "",
        phone: initial?.phone ?? "",
        pin_code: "",
        role: initial?.role ?? "staff",
        status: initial?.status ?? "active",
        notes: initial?.notes ?? "",
    });
    const [saving, setSaving] = useState(false);

    const set = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));
    const handlePhoneChange = (raw: string) => set("phone", formatPHPhone(raw));

    const validate = () => {
        if (!form.full_name.trim()) { toast.error("Full name is required."); return false; }
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            toast.error("Enter a valid email address."); return false;
        }
        if (form.phone && form.phone.length !== 11) {
            toast.error("Phone number must be exactly 11 digits (e.g. 09XXXXXXXXX)."); return false;
        }
        if (form.pin_code && (form.pin_code.length !== 4 || !/^\d{4}$/.test(form.pin_code))) {
            toast.error("PIN must be exactly 4 digits."); return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Not logged in."); return; }

            const payload: Record<string, any> = {
                full_name: form.full_name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim() || null,
                role: form.role,
                status: form.status,
                notes: form.notes.trim() || null,
            };
            if (form.pin_code.trim()) payload.pin_code = form.pin_code;

            if (mode === "add") {
                const { error } = await supabase.from("staff_members").insert({ ...payload, owner_id: user.id });
                if (error) throw error;
                toast.success(`${form.full_name} added to your team! 🎉`);
            } else {
                const { error } = await supabase.from("staff_members").update(payload).eq("id", initial!.id);
                if (error) throw error;
                toast.success("Staff details updated.");
            }
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    const isEdit = mode === "edit";

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
            >
                <div className="flex justify-center pt-3 sm:hidden shrink-0">
                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                </div>

                <div className={`p-5 text-white shrink-0 ${isEdit ? "bg-gradient-to-br from-teal-600 to-cyan-700" : "bg-gradient-to-br from-orange-500 to-amber-600"}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
                                {isEdit ? <Pencil size={17} /> : <UserRound size={17} />}
                            </div>
                            <div>
                                <h2 className="text-base font-black tracking-tight">
                                    {isEdit ? "Edit Staff" : "Add New Staff"}
                                </h2>
                                <p className="text-white/70 text-[11px] mt-0.5">
                                    {isEdit ? `Editing ${initial?.full_name}` : "Add a team member to your store"}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-xl transition-colors"><X size={16} /></button>
                    </div>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Full Name <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={form.full_name} onChange={e => set("full_name", e.target.value)}
                            placeholder="e.g. Miguel Santos"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all" />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Email Address <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                            <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                                placeholder="staff@example.com"
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Phone Number <span className="text-slate-300 font-normal normal-case">(optional · 11 digits)</span>
                        </label>
                        <div className="relative flex items-center">
                            <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none">
                                <PHFlag />
                                <span className="text-xs font-bold text-slate-400">+63</span>
                                <div className="w-px h-4 bg-slate-200 ml-0.5" />
                            </div>
                            <input type="tel" inputMode="numeric" value={form.phone} onChange={e => handlePhoneChange(e.target.value)}
                                placeholder="09XXXXXXXXX" maxLength={11}
                                className="w-full pl-[4.5rem] pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all" />
                            <span className={`absolute right-3 text-[10px] font-bold transition-colors ${form.phone.length === 11 ? "text-emerald-500" : "text-slate-300"}`}>
                                {form.phone.length}/11
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            POS PIN{" "}
                            <span className="text-slate-300 font-normal normal-case">
                                {isEdit ? "(leave blank to keep current PIN)" : "(4 digits, optional)"}
                            </span>
                        </label>
                        <div className="relative">
                            <KeyRound size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                            <input type="password" inputMode="numeric" value={form.pin_code}
                                onChange={e => set("pin_code", e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder={isEdit && initial?.pin_code ? "Enter new PIN to replace" : "e.g. 1234"}
                                maxLength={4} autoComplete="new-password"
                                className="w-full pl-9 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all tracking-[0.4em]" />
                            {form.pin_code.length > 0 && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black transition-colors ${form.pin_code.length === 4 ? "text-emerald-500" : "text-slate-300"}`}>
                                    {form.pin_code.length}/4
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                            <KeyRound size={8} className="text-slate-300" />
                            PIN is stored securely and never shown after saving.
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Role <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {(["staff", "cashier"] as StaffRole[]).map(r => {
                                const meta = ROLE_META[r];
                                const RIcon = meta.icon;
                                const active = form.role === r;
                                return (
                                    <button key={r} type="button" onClick={() => set("role", r)}
                                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${active ? `${meta.bg} border-current ${meta.color}` : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"}`}>
                                        <RIcon size={16} />
                                        <span className="text-[10px] font-black">{meta.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["active", "inactive", "pending"] as StaffStatus[]).map(s => {
                                const meta = STATUS_META[s];
                                const active = form.status === s;
                                return (
                                    <button key={s} type="button" onClick={() => set("status", s)}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 text-[11px] font-black transition-all ${active
                                            ? s === "active" ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                                                : s === "inactive" ? "bg-slate-100 border-slate-400 text-slate-600"
                                                    : "bg-amber-50 border-amber-400 text-amber-700"
                                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Notes <span className="text-slate-300 font-normal normal-case">(optional)</span>
                        </label>
                        <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                            placeholder="Schedule, responsibilities, etc." rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all resize-none" />
                    </div>
                </div>

                <div className="px-5 flex gap-3 shrink-0"
                    style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 1.25rem))", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className={`flex-1 py-2.5 rounded-xl text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${isEdit ? "bg-teal-600 hover:bg-teal-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Staff"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Delete Modal
function DeleteModal({ member, onClose, onConfirm }: {
    member: StaffMember; onClose: () => void; onConfirm: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.from("staff_members").delete().eq("id", member.id);
            if (error) throw error;
            toast.success(`${member.full_name} removed from your team.`);
            onConfirm(); onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to delete.");
        } finally { setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
                <div className="flex justify-center pt-3 sm:hidden">
                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                </div>
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={22} className="text-red-500" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1">Remove Staff Member?</h3>
                    <p className="text-sm text-slate-500">
                        Are you sure you want to remove{" "}
                        <span className="font-black text-slate-800">{member.full_name}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3 mt-6" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
                        <button onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {deleting ? "Removing…" : "Remove"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Empty State
function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-3xl flex items-center justify-center">
                    <UserRound size={32} className="text-teal-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Plus size={14} className="text-white" />
                </div>
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">No Staff Members Yet</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
                Add your team members so they can access the POS and help run your store.
            </p>
            <button onClick={onAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-black rounded-2xl transition-all shadow-md">
                <Plus size={15} /> Add First Staff Member
            </button>
        </motion.div>
    );
}


// Today's Attendance panel — shows OFF for Sunday/holidays, Mark Absent at noon
function TodayAttendancePanel({ staffList, attendanceMap, onlineIds, clockedInCount, onMemberClick, onMarkAbsent }: {
    staffList: StaffMember[];
    attendanceMap: Record<string, AttendanceRecord | null>;
    onlineIds: Set<string>;
    clockedInCount: number;
    onMemberClick: (m: StaffMember) => void;
    onMarkAbsent: () => void;
}) {
    const [markingAbsent, setMarkingAbsent] = useState(false);
    const today = localDateString();
    const todayStatus = getDayStatus();
    const pastNoon = isPastNoon();
    const isOff = todayStatus.type !== "workday";

    const handleMarkAbsent = async () => {
        setMarkingAbsent(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const today = localDateString();
            // Mark absent for every active staff with no record today
            for (const m of staffList) {
                if (m.status !== "active") continue;
                const existing = attendanceMap[m.id];
                const hasToday = existing && existing.date === today;
                if (!hasToday) {
                    await supabase.from("staff_attendance").insert({
                        staff_id: m.id,
                        staff_name: m.full_name,
                        staff_role: m.role,
                        owner_id: m.owner_id,
                        time_in: `${today}T12:00:00+08:00`,
                        date: today,
                        attendance_status: "absent",
                    });
                }
            }
            toast.success("Absent records created for staff with no login today.");
            onMarkAbsent();
        } catch {
            toast.error("Failed to mark absences.");
        } finally {
            setMarkingAbsent(false);
        }
    };

    // OFF screen for Sunday / holidays
    if (isOff) {
        const offColor = todayStatus.type === "sunday" ? "#7c3aed" : "#0891b2";
        const offEmoji = todayStatus.type === "sunday" ? "🌙" : "🎉";
        const offLabel = todayStatus.type === "sunday" ? "REST DAY" : (todayStatus as any).label;
        const offSub = todayStatus.type === "sunday"
            ? "Today is Sunday — no attendance is recorded."
            : `${(todayStatus as any).label} — Philippine public holiday. No attendance recorded.`;

        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                            <CalendarDays size={15} className="text-teal-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800">Today's Attendance</p>
                            <p className="text-[10px] text-slate-400 font-medium">{new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full"
                        style={{ background: `${offColor}10`, color: offColor, border: `1px solid ${offColor}25` }}>
                        <span>{offEmoji}</span> {offLabel}
                    </div>
                </div>
                <div className="rounded-2xl p-5 text-center" style={{ background: `${offColor}06`, border: `1.5px solid ${offColor}18` }}>
                    <div className="text-3xl mb-2">{offEmoji}</div>
                    <p className="font-black text-slate-800 text-sm mb-1">{offLabel}</p>
                    <p className="text-[0.72rem] text-slate-400 leading-relaxed">{offSub}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {staffList.map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                style={{ background: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" }}>
                                <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black text-white bg-gradient-to-br"
                                    style={{ background: "linear-gradient(135deg,#94a3b8,#64748b)" }}>
                                    {initials(m.full_name)}
                                </span>
                                {m.full_name.split(" ")[0]}
                                <span className="text-[8px] font-black uppercase tracking-wider opacity-60">OFF</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Normal workday attendance panel
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                        <CalendarDays size={15} className="text-teal-600" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800">Today's Attendance</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Mark Absent button — only shows at or after noon for active staff with no record */}
                    {pastNoon && staffList.some(m => m.status === "active" && (!attendanceMap[m.id] || attendanceMap[m.id]?.date !== today)) && (
                        <button onClick={handleMarkAbsent} disabled={markingAbsent}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all disabled:opacity-60"
                            style={{ background: "rgba(239,68,68,0.07)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                            {markingAbsent ? <Loader2 size={9} className="animate-spin" /> : <AlertCircle size={9} />}
                            Mark Absent
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <TrendingUp size={10} />
                        {clockedInCount} clocked in
                    </div>
                </div>
            </div>

            {/* Noon cutoff banner */}
            {pastNoon && (
                <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-[10px]"
                    style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
                    <span>🕛</span>
                    <span className="text-red-600 font-bold">12:00 PM cutoff passed.</span>
                    <span className="text-slate-500">Staff without a login today are marked <span className="font-black text-red-500">Absent</span>.</span>
                </div>
            )}

            <div className="space-y-1.5">
                {staffList.map(member => {
                    const att = attendanceMap[member.id];
                    const isClockedIn = att && !att.time_out;
                    const isToday = att && att.date === today;
                    const isAbsent = pastNoon && member.status === "active" && (!att || att.date !== today);

                    return (
                        <button key={member.id}
                            onClick={() => onMemberClick(member)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarGradient(member.full_name)} flex items-center justify-center shrink-0`}>
                                <span className="text-[11px] font-black text-white">{initials(member.full_name)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-slate-700 truncate">{member.full_name}</p>
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ background: onlineIds.has(member.id) ? "#22c55e" : "#cbd5e1" }} />
                                </div>
                                <p className="text-[10px] text-slate-400 capitalize">{member.role}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                {isAbsent ? (
                                    <span className="text-[10px] font-black text-red-500 flex items-center gap-1">
                                        <AlertCircle size={9} /> Absent
                                    </span>
                                ) : isToday && isClockedIn ? (
                                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        In {formatTime(att!.time_in)}
                                    </div>
                                ) : isToday && att ? (
                                    <div className="text-[10px] font-medium text-slate-400">
                                        {formatTime(att.time_in)} – {formatTime(att.time_out!)}
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                                        <AlertCircle size={9} /> No record
                                    </span>
                                )}
                            </div>
                            <ChevronRight size={11} className="text-slate-200 group-hover:text-teal-400 transition-colors shrink-0" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}


// ─── Attendance Log View ───────────────────────────────────────────────────────
// Full date-range attendance table for all staff, including OFF days

interface FullAttRecord {
    id: string;
    staff_id: string;
    staff_name: string;
    staff_role: string;
    date: string;
    time_in: string;
    time_out: string | null;
    attendance_status: "present" | "late" | "absent";
    duration_minutes: number | null;
}

type DayType = "present" | "late" | "absent" | "sunday" | "holiday" | "no_record";

interface DaySummary {
    date: string;           // YYYY-MM-DD
    type: DayType;
    label: string;          // readable status label
    timeIn?: string;
    timeOut?: string;
    duration?: number | null;
}

interface StaffSummaryRow {
    member: StaffMember;
    days: Record<string, DaySummary>; // keyed by YYYY-MM-DD
    presentCount: number;
    lateCount: number;
    absentCount: number;
    offCount: number;
    totalHours: number;
}

// Generate array of YYYY-MM-DD strings between two dates inclusive
// Uses local date arithmetic to avoid UTC timezone shift
function dateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const cur = new Date(from + "T12:00:00"); // noon avoids DST/timezone edge cases
    const end = new Date(to + "T12:00:00");
    while (cur <= end) {
        // Use local date parts — never toISOString() which is UTC
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

// Friendly label for a date type
function dayTypeLabel(t: DayType): string {
    switch (t) {
        case "present": return "Present";
        case "late": return "Late";
        case "absent": return "Absent";
        case "sunday": return "REST DAY";
        case "holiday": return "Holiday";
        case "no_record": return "—";
    }
}

function dayTypeDot(t: DayType): string {
    switch (t) {
        case "present": return "#10b981";
        case "late": return "#f59e0b";
        case "absent": return "#ef4444";
        case "sunday": return "#7c3aed";
        case "holiday": return "#0891b2";
        case "no_record": return "#e2e8f0";
    }
}

function dayTypeBg(t: DayType): string {
    switch (t) {
        case "present": return "rgba(16,185,129,0.08)";
        case "late": return "rgba(245,158,11,0.08)";
        case "absent": return "rgba(239,68,68,0.08)";
        case "sunday": return "rgba(124,58,237,0.08)";
        case "holiday": return "rgba(8,145,178,0.08)";
        case "no_record": return "transparent";
    }
}

function dayTypeText(t: DayType): string {
    switch (t) {
        case "present": return "#059669";
        case "late": return "#d97706";
        case "absent": return "#dc2626";
        case "sunday": return "#7c3aed";
        case "holiday": return "#0891b2";
        case "no_record": return "#cbd5e1";
    }
}

function AttendanceLogView({ staffList }: { staffList: StaffMember[] }) {
    const today = localDateString();
    // Default: current month
    const monthStart = today.slice(0, 8) + "01";

    const [fromDate, setFromDate] = useState(monthStart);
    const [toDate, setToDate] = useState(today);
    const [filterStaff, setFilterStaff] = useState<string>("all");
    const [filterRole, setFilterRole] = useState<"all" | "staff" | "cashier">("all");
    const [records, setRecords] = useState<FullAttRecord[]>([]);
    const [loadingLog, setLoadingLog] = useState(false);
    const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

    const fetchLog = useCallback(async () => {
        if (!fromDate || !toDate) return;
        setLoadingLog(true);
        try {
            const ids = staffList
                .filter(m => filterStaff === "all" || m.id === filterStaff)
                .filter(m => filterRole === "all" || m.role === filterRole)
                .map(m => m.id);

            if (!ids.length) { setRecords([]); return; }

            const { data, error } = await supabase
                .from("staff_attendance")
                .select("id, staff_id, staff_name, staff_role, date, time_in, time_out, attendance_status, duration_minutes")
                .in("staff_id", ids)
                .gte("date", fromDate)
                .lte("date", toDate)
                .order("date", { ascending: false });

            if (!error) setRecords((data ?? []) as FullAttRecord[]);
        } catch { /* silent */ }
        finally { setLoadingLog(false); }
    }, [staffList, fromDate, toDate, filterStaff, filterRole]);

    useEffect(() => { if (staffList.length) fetchLog(); }, [fetchLog, staffList.length]);

    // Build date range array
    const dates = fromDate && toDate ? dateRange(fromDate, toDate) : [];

    // Only show dates that fit in the range (cap at 31 for column sanity)
    const visibleDates = dates.slice(0, 62);

    // Build summary rows per staff
    const filteredStaff = staffList
        .filter(m => filterStaff === "all" || m.id === filterStaff)
        .filter(m => filterRole === "all" || m.role === filterRole);

    const rows: StaffSummaryRow[] = filteredStaff.map(member => {
        const memberRecords = records.filter(r => r.staff_id === member.id);
        const recByDate: Record<string, FullAttRecord> = {};
        memberRecords.forEach(r => { recByDate[r.date] = r; });

        const days: Record<string, DaySummary> = {};
        let presentCount = 0, lateCount = 0, absentCount = 0, offCount = 0, totalMins = 0;

        visibleDates.forEach(dateStr => {
            const d = new Date(dateStr + "T12:00:00"); // noon prevents UTC midnight shift
            const dayStatus = getDayStatus(d);
            const rec = recByDate[dateStr];

            if (dayStatus.type === "sunday") {
                days[dateStr] = { date: dateStr, type: "sunday", label: "REST DAY" };
                offCount++;
            } else if (dayStatus.type === "holiday") {
                days[dateStr] = { date: dateStr, type: "holiday", label: dayStatus.label };
                offCount++;
            } else if (rec) {
                const t = rec.attendance_status as DayType;
                days[dateStr] = {
                    date: dateStr, type: t, label: dayTypeLabel(t),
                    timeIn: rec.time_in, timeOut: rec.time_out ?? undefined,
                    duration: rec.duration_minutes,
                };
                if (t === "present") presentCount++;
                else if (t === "late") lateCount++;
                else if (t === "absent") absentCount++;
                if (rec.duration_minutes) totalMins += rec.duration_minutes;
            } else {
                // Future dates or genuinely no record
                const isFuture = new Date(dateStr + "T12:00:00") > new Date();
                days[dateStr] = { date: dateStr, type: "no_record", label: isFuture ? "—" : "—" };
            }
        });

        return { member, days, presentCount, lateCount, absentCount, offCount, totalHours: totalMins / 60 };
    });

    // Summary totals
    const totalPresent = rows.reduce((s, r) => s + r.presentCount, 0);
    const totalLate = rows.reduce((s, r) => s + r.lateCount, 0);
    const totalAbsent = rows.reduce((s, r) => s + r.absentCount, 0);
    const totalOff = rows.reduce((s, r) => s + r.offCount, 0) / Math.max(rows.length, 1);

    const showScrollTable = visibleDates.length <= 31;

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-1.5">
                        <Table2 size={15} className="text-teal-600 shrink-0" />
                        Attendance Log
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                        Filter by date range — includes Sunday (REST) and holiday (OFF) days
                    </p>
                </div>
                <button onClick={fetchLog} disabled={loadingLog}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[0.72rem] sm:text-[0.75rem] font-black text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 transition-all disabled:opacity-50">
                    {loadingLog ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">

                    {/* From */}
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">From</p>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-teal-400 transition-all" />
                    </div>

                    {/* To */}
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">To</p>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-teal-400 transition-all" />
                    </div>

                    {/* Staff */}
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Staff Member</p>
                        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-teal-400 transition-all cursor-pointer">
                            <option value="all">All Staff</option>
                            {staffList.map(m => (
                                <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
                            ))}
                        </select>
                    </div>

                    {/* Role */}
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Role</p>
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-teal-400 transition-all cursor-pointer">
                            <option value="all">All Roles</option>
                            <option value="staff">Staff Worker</option>
                            <option value="cashier">Cashier</option>
                        </select>
                    </div>
                </div>

                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest self-center mr-1">Quick:</p>
                    {[
                        { label: "This Week", from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return localDateString(d); })(), to: today },
                        { label: "This Month", from: today.slice(0, 8) + "01", to: today },
                        { label: "Last Month", from: (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return localDateString(d); })(), to: (() => { const d = new Date(); d.setDate(0); return localDateString(d); })() },
                        { label: "Last 7 Days", from: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return localDateString(d); })(), to: today },
                        { label: "Last 30 Days", from: (() => { const d = new Date(); d.setDate(d.getDate() - 29); return localDateString(d); })(), to: today },
                    ].map(p => (
                        <button key={p.label}
                            onClick={() => { setFromDate(p.from); setToDate(p.to); }}
                            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black transition-all border ${fromDate === p.from && toDate === p.to
                                ? "bg-teal-600 text-white border-teal-600"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary stat cards */}
            {rows.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Present Days", value: totalPresent, dot: "#10b981", bg: "rgba(16,185,129,0.07)", text: "#059669", border: "rgba(16,185,129,0.15)" },
                        { label: "Late Days", value: totalLate, dot: "#f59e0b", bg: "rgba(245,158,11,0.07)", text: "#d97706", border: "rgba(245,158,11,0.15)" },
                        { label: "Absent Days", value: totalAbsent, dot: "#ef4444", bg: "rgba(239,68,68,0.07)", text: "#dc2626", border: "rgba(239,68,68,0.15)" },
                        { label: "OFF Days (avg/staff)", value: Math.round(totalOff), dot: "#7c3aed", bg: "rgba(124,58,237,0.07)", text: "#7c3aed", border: "rgba(124,58,237,0.15)" },
                    ].map(c => (
                        <div key={c.label} className="bg-white rounded-2xl p-2.5 sm:p-3.5 border shadow-sm" style={{ borderColor: c.border }}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
                                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">{c.label}</p>
                            </div>
                            <p className="text-xl sm:text-2xl font-black" style={{ color: c.text, fontFamily: "Syne, sans-serif" }}>{c.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Main table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-teal-600" />
                        <p className="font-black text-slate-800 text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">
                            {fromDate} → {toDate}
                        </p>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                            {visibleDates.length}d · {filteredStaff.length} staff
                        </span>
                    </div>

                    {/* Legend */}
                    <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-wrap">
                        {[
                            { dot: "#10b981", label: "Present" },
                            { dot: "#f59e0b", label: "Late" },
                            { dot: "#ef4444", label: "Absent" },
                            { dot: "#7c3aed", label: "REST" },
                            { dot: "#0891b2", label: "Holiday" },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ background: l.dot }} />
                                <span className="text-[9px] font-bold text-slate-500">{l.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {loadingLog ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm font-medium">Loading attendance log…</span>
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-slate-300">
                        <Table2 size={32} className="mb-2 opacity-40" />
                        <p className="text-sm font-bold text-slate-400">No staff to display</p>
                    </div>
                ) : showScrollTable ? (
                    /* ── Scrollable day-by-day grid (≤31 days) ── */
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse" style={{ minWidth: `${Math.max(320, 140 + visibleDates.length * 44)}px` }}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    <th className="sticky left-0 bg-slate-50 z-10 px-2 sm:px-4 py-2 sm:py-3 text-left font-black text-slate-600 text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap border-b border-r border-slate-100" style={{ minWidth: "130px" }}>
                                        Staff Member
                                    </th>
                                    {visibleDates.map(dateStr => {
                                        // Use noon to avoid midnight UTC shift for display
                                        const d = new Date(dateStr + "T12:00:00");
                                        const ds = getDayStatus(d);
                                        const isOff = ds.type !== "workday";
                                        const dayName = d.toLocaleDateString("en-PH", { weekday: "short" });
                                        const dayNum = d.getDate();
                                        const isToday = dateStr === today;
                                        return (
                                            <th key={dateStr} className="px-1 py-2 text-center font-bold border-b border-slate-100 whitespace-nowrap" style={{ minWidth: "40px", background: isOff ? (ds.type === "sunday" ? "rgba(124,58,237,0.05)" : "rgba(8,145,178,0.05)") : isToday ? "rgba(20,184,166,0.05)" : "#f8fafc" }}>
                                                <p className="text-[9px] font-bold" style={{ color: isOff ? (ds.type === "sunday" ? "#7c3aed" : "#0891b2") : isToday ? "#0d9488" : "#94a3b8" }}>{dayName}</p>
                                                <p className="text-[11px] font-black" style={{ color: isOff ? (ds.type === "sunday" ? "#7c3aed" : "#0891b2") : isToday ? "#0d9488" : "#475569" }}>{dayNum}</p>
                                                {isOff && <p className="text-[7px] font-black leading-none mt-0.5" style={{ color: ds.type === "sunday" ? "#7c3aed" : "#0891b2" }}>OFF</p>}
                                                {isToday && !isOff && <p className="text-[7px] font-black text-teal-500 leading-none mt-0.5">TODAY</p>}
                                            </th>
                                        );
                                    })}
                                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-center font-black text-slate-600 text-[9px] sm:text-[10px] uppercase tracking-wider border-b border-l border-slate-100 whitespace-nowrap bg-slate-50">
                                        Summary
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {rows.map((row, ri) => (
                                    <tr key={row.member.id} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                        {/* Staff name cell — sticky */}
                                        <td className="sticky left-0 bg-white z-10 px-2 sm:px-3 py-2 border-r border-slate-100 whitespace-nowrap" style={{ background: ri % 2 === 0 ? "white" : "#fafafa" }}>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-gradient-to-br ${avatarGradient(row.member.full_name)} flex items-center justify-center shrink-0`}>
                                                    <span className="text-[8px] sm:text-[9px] font-black text-white">{initials(row.member.full_name)}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] sm:text-[11px] font-black text-slate-800 leading-tight truncate max-w-[80px] sm:max-w-none">{row.member.full_name}</p>
                                                    <p className="text-[8px] sm:text-[9px] text-slate-400 capitalize">{row.member.role}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Day cells */}
                                        {visibleDates.map(dateStr => {
                                            const day = row.days[dateStr];
                                            if (!day) return <td key={dateStr} className="px-1 py-2 text-center border-slate-50"><span className="text-[9px] text-slate-200">—</span></td>;
                                            return (
                                                <td key={dateStr} className="px-0.5 py-1.5 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <span
                                                            className="inline-flex items-center justify-center w-7 h-6 rounded-lg text-[8.5px] font-black"
                                                            style={{ background: dayTypeBg(day.type), color: dayTypeText(day.type) }}
                                                            title={day.type === "holiday" ? day.label : dayTypeLabel(day.type)}>
                                                            {day.type === "present" ? "P" :
                                                                day.type === "late" ? "L" :
                                                                    day.type === "absent" ? "A" :
                                                                        day.type === "sunday" ? "R" :
                                                                            day.type === "holiday" ? "H" : "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        {/* Summary cell */}
                                        <td className="px-3 py-2.5 border-l border-slate-100 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                                {[
                                                    { val: row.presentCount, dot: "#10b981", tip: "Present" },
                                                    { val: row.lateCount, dot: "#f59e0b", tip: "Late" },
                                                    { val: row.absentCount, dot: "#ef4444", tip: "Absent" },
                                                    { val: row.offCount, dot: "#7c3aed", tip: "OFF" },
                                                ].map(s => (
                                                    <span key={s.tip} className="flex items-center gap-0.5 text-[9px] font-black" style={{ color: s.dot }} title={s.tip}>
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                                                        {s.val}
                                                    </span>
                                                ))}
                                                <span className="text-[9px] text-slate-400 font-bold ml-1">{row.totalHours.toFixed(1)}h</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ── Summary table for longer ranges (>31 days) ── */
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                                    {["Staff Member", "Present", "Late", "Absent", "OFF Days", "Total Hours", "Attendance %"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-black text-slate-500 text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {rows.map((row, i) => {
                                    const workDays = visibleDates.filter(d => getDayStatus(new Date(d + "T12:00:00")).type === "workday").length;
                                    const showRate = workDays > 0 ? Math.round(((row.presentCount + row.lateCount) / workDays) * 100) : 0;
                                    return (
                                        <tr key={row.member.id} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${avatarGradient(row.member.full_name)} flex items-center justify-center shrink-0`}>
                                                        <span className="text-[9px] font-black text-white">{initials(row.member.full_name)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 text-[11px]">{row.member.full_name}</p>
                                                        <p className="text-[9px] text-slate-400 capitalize">{row.member.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{row.presentCount}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{row.lateCount}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{row.absentCount}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                                                    style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />{row.offCount}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-black text-teal-600 text-[11px]">
                                                {row.totalHours.toFixed(1)}h
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ width: "60px" }}>
                                                        <div className="h-full rounded-full" style={{ width: `${showRate}%`, background: showRate >= 90 ? "#10b981" : showRate >= 70 ? "#f59e0b" : "#ef4444" }} />
                                                    </div>
                                                    <span className="text-[10px] font-black" style={{ color: showRate >= 90 ? "#059669" : showRate >= 70 ? "#d97706" : "#dc2626" }}>
                                                        {showRate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table legend footer */}
                {showScrollTable && rows.length > 0 && (
                    <div className="px-3 sm:px-4 py-3 border-t border-slate-50 bg-slate-50/50 flex flex-wrap gap-2 sm:gap-3 items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Key:</span>
                        {[
                            { code: "P", label: "Present", dot: "#10b981" },
                            { code: "L", label: "Late", dot: "#f59e0b" },
                            { code: "A", label: "Absent", dot: "#ef4444" },
                            { code: "R", label: "REST (Sunday)", dot: "#7c3aed" },
                            { code: "H", label: "Holiday (OFF)", dot: "#0891b2" },
                            { code: "—", label: "No record", dot: "#cbd5e1" },
                        ].map(k => (
                            <div key={k.code} className="flex items-center gap-1.5">
                                <span className="w-5 h-4 rounded text-[8px] font-black flex items-center justify-center"
                                    style={{ background: k.dot + "18", color: k.dot }}>{k.code}</span>
                                <span className="text-[9px] text-slate-500 font-medium">{k.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Main StaffView
export default function StaffView() {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord | null>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<StaffRole | "all">("all");
    const [filterStatus, setFilterStatus] = useState<StaffStatus | "all">("all");
    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
    const [attendanceTarget, setAttendanceTarget] = useState<StaffMember | null>(null);
    const [storeName, setStoreName] = useState("My Store");
    // Set of staff ids currently online (tracked via Supabase Realtime Presence)
    const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

    // Fetch staff + latest attendance for each member
    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setStoreName(user.user_metadata?.store_name ?? "My Store");

            const { data, error } = await supabase
                .from("staff_members")
                .select("*")
                .eq("owner_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;

            const list: StaffMember[] = data ?? [];
            setStaffList(list);

            if (list.length > 0) {
                const ids = list.map(m => m.id);
                const { data: attData } = await supabase
                    .from("staff_attendance")
                    .select("*")
                    .in("staff_id", ids)
                    .order("time_in", { ascending: false });

                const map: Record<string, AttendanceRecord | null> = {};
                ids.forEach(id => { map[id] = null; });
                (attData ?? []).forEach(r => {
                    if (!map[r.staff_id]) map[r.staff_id] = r;
                });
                setAttendanceMap(map);
            }
        } catch {
            toast.error("Could not load staff members.");
        } finally { setLoading(false); }
    }, []);

    // Lightweight re-fetch: only updates the attendance map for given staff ids
    const fetchAttendanceOnly = useCallback(async (staffIds: string[]) => {
        if (!staffIds.length) return;
        try {
            const { data: attData } = await supabase
                .from("staff_attendance")
                .select("*")
                .in("staff_id", staffIds)
                .order("time_in", { ascending: false });

            setAttendanceMap(prev => {
                const next = { ...prev };
                staffIds.forEach(id => { next[id] = null; });
                (attData ?? []).forEach((r: AttendanceRecord) => {
                    if (!next[r.staff_id]) next[r.staff_id] = r;
                });
                return next;
            });
        } catch {
            // Silent — non-critical
        }
    }, []);

    useEffect(() => {
        // Initial data load
        fetchStaff();

        let staffChannel: ReturnType<typeof supabase.channel> | null = null;
        let attChannel: ReturnType<typeof supabase.channel> | null = null;

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            const ownerId = user.id;

            // Realtime: staff_members changes (add, edit, delete, status toggle)
            staffChannel = supabase
                .channel("rt:staff_members")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "staff_members", filter: `owner_id=eq.${ownerId}` },
                    () => fetchStaff()
                )
                .subscribe();

            // Realtime: staff_attendance changes (clock-in, clock-out)
            attChannel = supabase
                .channel("rt:staff_attendance")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "staff_attendance", filter: `owner_id=eq.${ownerId}` },
                    (payload) => {
                        const row = (payload.new ?? payload.old) as { staff_id?: string } | null;
                        const sid = row?.staff_id;
                        if (sid) {
                            // Only refresh attendance for the affected staff member
                            fetchAttendanceOnly([sid]);
                        } else {
                            fetchStaff();
                        }
                    }
                )
                .subscribe();
        });

        return () => {
            if (staffChannel) supabase.removeChannel(staffChannel);
            if (attChannel) supabase.removeChannel(attChannel);
        };
    }, [fetchStaff, fetchAttendanceOnly]);

    // Presence channel — tracks which staff are online right now
    useEffect(() => {
        let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            const ownerId = user.id;

            // Channel name is scoped per owner so staff from different stores don't bleed through
            presenceChannel = supabase.channel(`presence:staff:${ownerId}`);

            presenceChannel
                .on("presence", { event: "sync" }, () => {
                    const state = presenceChannel!.presenceState<{ staff_id: string }>();
                    const ids = new Set<string>();
                    Object.values(state).forEach(presences =>
                        presences.forEach(p => { if (p.staff_id) ids.add(p.staff_id); })
                    );
                    setOnlineIds(ids);
                })
                .on("presence", { event: "join" }, ({ newPresences }) => {
                    setOnlineIds(prev => {
                        const next = new Set(prev);
                        newPresences.forEach((p: any) => { if (p.staff_id) next.add(p.staff_id); });
                        return next;
                    });
                })
                .on("presence", { event: "leave" }, ({ leftPresences }) => {
                    setOnlineIds(prev => {
                        const next = new Set(prev);
                        leftPresences.forEach((p: any) => { if (p.staff_id) next.delete(p.staff_id); });
                        return next;
                    });
                })
                .subscribe();
        });

        return () => {
            if (presenceChannel) supabase.removeChannel(presenceChannel);
        };
    }, []);

    const handleToggleStatus = async (member: StaffMember) => {
        const newStatus: StaffStatus = member.status === "active" ? "inactive" : "active";
        const { error } = await supabase.from("staff_members").update({ status: newStatus }).eq("id", member.id);
        if (error) { toast.error("Failed to update status."); return; }
        toast.success(`${member.full_name} is now ${newStatus}.`);
        fetchStaff();
    };

    const filtered = staffList.filter(m => {
        const matchSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === "all" || m.role === filterRole;
        const matchStatus = filterStatus === "all" || m.status === filterStatus;
        return matchSearch && matchRole && matchStatus;
    });

    const anyFilterActive = search.trim() !== "" || filterRole !== "all" || filterStatus !== "all";
    const resetFilters = () => { setSearch(""); setFilterRole("all"); setFilterStatus("all"); };

    const activeCount = staffList.filter(m => m.status === "active").length;
    const inactiveCount = staffList.filter(m => m.status === "inactive").length;
    const clockedInCount = Object.values(attendanceMap).filter(r => r && !r.time_out).length;
    const onlineCount = staffList.filter(m => onlineIds.has(m.id)).length;

    return (
        <>
            <div className="space-y-4 sm:space-y-6 pb-10">

                {/* Banner */}
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl"
                    style={{ background: "linear-gradient(135deg,#0f2027 0%,#134e4a 55%,#0f4c3a 100%)" }}>
                    {/* Ambient blobs */}
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 15% 80%,rgba(20,184,166,.32) 0%,transparent 45%),radial-gradient(circle at 85% 15%,rgba(245,158,11,.2) 0%,transparent 40%),radial-gradient(circle at 60% 90%,rgba(8,145,178,.18) 0%,transparent 35%)" }} />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />

                    <div className="relative p-4 sm:p-6 md:p-7">
                        {/* Top row — title + button */}
                        <div className="flex items-start justify-between gap-3 mb-5">
                            <div className="min-w-0">
                                <p className="text-teal-300 text-[10px] font-bold mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                                    <Flame size={11} className="text-amber-400" /> Team Management
                                </p>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">{storeName}&apos;s Staff</h1>
                                <p className="text-white/40 text-[11px] font-medium mt-1.5 hidden sm:block">Manage access to your POS and inventory</p>
                            </div>
                            <button onClick={() => setShowAdd(true)}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-teal-50 active:scale-95 text-teal-700 text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl transition-all shadow-lg">
                                <Plus size={13} /> Staff
                            </button>
                        </div>

                        {/* Recharts stat cards */}
                        {(() => {
                            // ── Card 1: Staff composition donut ──────────────────
                            const donutData = [
                                { name: "Active", value: activeCount, fill: "#10b981" },
                                { name: "Inactive", value: inactiveCount, fill: "rgba(255,255,255,0.15)" },
                                { name: "Pending", value: staffList.filter(m => m.status === "pending").length, fill: "#f59e0b" },
                            ].filter(d => d.value > 0);
                            if (donutData.length === 0) donutData.push({ name: "None", value: 1, fill: "rgba(255,255,255,0.08)" });

                            // ── Card 2: Role split bar ───────────────────────────
                            const cashierCount = staffList.filter(m => m.role === "cashier").length;
                            const workerCount = staffList.filter(m => m.role === "staff").length;
                            const roleData = [
                                { role: "Staff", count: workerCount },
                                { role: "Cashier", count: cashierCount },
                            ];

                            // ── Card 3: Clocked-in radial gauge ─────────────────
                            const gaugeTotal = activeCount || 1;
                            const gaugePct = Math.round((clockedInCount / gaugeTotal) * 100);
                            const radialData = [
                                { name: "In", value: gaugePct, fill: "#22d3ee" },
                                { name: "Out", value: 100 - gaugePct, fill: "rgba(255,255,255,0.08)" },
                            ];

                            // ── Card 4: Online radial gauge ──────────────────────
                            const onlinePct = Math.round((onlineCount / (staffList.length || 1)) * 100);
                            const onlineData = [
                                { name: "Online", value: onlinePct, fill: "#4ade80" },
                                { name: "Offline", value: 100 - onlinePct, fill: "rgba(255,255,255,0.08)" },
                            ];

                            return (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">

                                    {/* Card 1 — Staff Composition Donut */}
                                    <div className="rounded-2xl p-3 sm:p-4 flex flex-col"
                                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)" }}>
                                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Team Split</p>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div style={{ width: 64, height: 64, flexShrink: 0 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={18} outerRadius={30}
                                                            dataKey="value" strokeWidth={0} paddingAngle={2}>
                                                            {donutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <p className="text-2xl font-black text-white leading-none">{staffList.length}</p>
                                                <p className="text-white/35 text-[9px]">total staff</p>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    {[
                                                        { dot: "#10b981", label: `${activeCount} active` },
                                                        { dot: "rgba(255,255,255,0.3)", label: `${inactiveCount} inactive` },
                                                    ].map(l => (
                                                        <div key={l.label} className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: l.dot }} />
                                                            <span className="text-[9px] text-white/50 truncate">{l.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 2 — Role Bar Chart */}
                                    <div className="rounded-2xl p-3 sm:p-4 flex flex-col"
                                        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)" }}>
                                        <p className="text-[9px] font-black text-emerald-300/60 uppercase tracking-widest mb-1">By Role</p>
                                        <div style={{ height: 60 }} className="flex-1">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={roleData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap="30%">
                                                    <XAxis dataKey="role" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.45)", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                    <YAxis hide allowDecimals={false} />
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                        <Cell fill="#f97316" />
                                                        <Cell fill="#14b8a6" />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                <span className="text-[8px] text-white/40">{workerCount} worker{workerCount !== 1 ? "s" : ""}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                                <span className="text-[8px] text-white/40">{cashierCount} cashier{cashierCount !== 1 ? "s" : ""}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 3 — Clocked-In Radial Gauge */}
                                    <div className="rounded-2xl p-3 sm:p-4 flex flex-col"
                                        style={{ background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.22)" }}>
                                        <p className="text-[9px] font-black text-cyan-300/60 uppercase tracking-widest mb-0.5">On Shift</p>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={30}
                                                        startAngle={90} endAngle={-270} data={radialData} barSize={10}>
                                                        <RadialBar dataKey="value" cornerRadius={4} background={false}>
                                                            {radialData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                                        </RadialBar>
                                                    </RadialBarChart>
                                                </ResponsiveContainer>
                                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <span style={{ fontSize: 11, fontWeight: 900, color: "#22d3ee", lineHeight: 1 }}>{gaugePct}%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-black text-cyan-300 leading-none">{clockedInCount}</p>
                                                <p className="text-cyan-300/35 text-[9px] mt-0.5">of {activeCount} active</p>
                                                <p className="text-white/25 text-[8px] mt-1">clocked in today</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 4 — Online Radial Gauge */}
                                    <div className="rounded-2xl p-3 sm:p-4 flex flex-col relative overflow-hidden"
                                        style={{ background: onlineCount > 0 ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", border: onlineCount > 0 ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.1)" }}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: onlineCount > 0 ? "rgba(134,239,172,0.6)" : "rgba(255,255,255,0.3)" }}>Live Now</p>
                                            {onlineCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />}
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={30}
                                                        startAngle={90} endAngle={-270} data={onlineData} barSize={10}>
                                                        <RadialBar dataKey="value" cornerRadius={4} background={false}>
                                                            {onlineData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                                        </RadialBar>
                                                    </RadialBarChart>
                                                </ResponsiveContainer>
                                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <span style={{ fontSize: 11, fontWeight: 900, lineHeight: 1, color: onlineCount > 0 ? "#4ade80" : "rgba(255,255,255,0.2)" }}>{onlinePct}%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-black leading-none" style={{ color: onlineCount > 0 ? "#86efac" : "rgba(255,255,255,0.2)" }}>{onlineCount}</p>
                                                <p className="text-[9px] mt-0.5" style={{ color: onlineCount > 0 ? "rgba(134,239,172,0.35)" : "rgba(255,255,255,0.2)" }}>
                                                    of {staffList.length} staff
                                                </p>
                                                <p className="text-[8px] mt-1" style={{ color: onlineCount > 0 ? "rgba(134,239,172,0.25)" : "rgba(255,255,255,0.15)" }}>
                                                    {onlineCount > 0 ? "online now" : "all offline"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            );
                        })()}
                    </div>
                </motion.div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    {[
                        { label: "Total Staff", value: staffList.length, icon: UserRound, bg: "bg-teal-50", ic: "text-teal-500", val: "text-teal-700", border: "border-teal-100" },
                        { label: "Active Now", value: activeCount, icon: UserCheck, bg: "bg-emerald-50", ic: "text-emerald-500", val: "text-emerald-700", border: "border-emerald-100" },
                        { label: "Inactive", value: inactiveCount, icon: UserX, bg: "bg-slate-50", ic: "text-slate-400", val: "text-slate-600", border: "border-slate-100" },
                        { label: "Clocked In Today", value: clockedInCount, icon: Clock, bg: "bg-cyan-50", ic: "text-cyan-500", val: "text-cyan-700", border: "border-cyan-100" },
                        { label: "Online Now", value: onlineCount, icon: Wifi, bg: "bg-green-50", ic: "text-green-500", val: "text-green-700", border: "border-green-100" },
                    ].map((c, i) => {
                        const Icon = c.icon;
                        return (
                            <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className={`bg-white rounded-2xl border ${c.border} p-3 sm:p-4 shadow-sm`}>
                                <div className={`w-8 h-8 sm:w-9 sm:h-9 ${c.bg} rounded-xl flex items-center justify-center mb-2`}>
                                    <Icon size={15} className={c.ic} />
                                </div>
                                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">{c.label}</p>
                                {loading ? <Skeleton className="h-5 sm:h-6 w-8 sm:w-10 mt-1" /> :
                                    <p className={`text-lg sm:text-xl font-black mt-0.5 ${c.val}`}>{c.value}</p>}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2.5">
                        <div className="relative w-full sm:min-w-[200px] sm:flex-1 sm:max-w-xs">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text" value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or email…"
                                className="w-full pl-8 pr-4 py-2.5 bg-white rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none transition-all"
                                style={{
                                    border: search ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                                    boxShadow: search ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                                }}
                            />
                        </div>
                        <DropdownSelect
                            label="Role" value={filterRole}
                            onSelect={v => setFilterRole(v as StaffRole | "all")}
                            options={[
                                { value: "all", label: "All Roles" },
                                { value: "cashier", label: "Cashier", dot: "#0d9488" },
                                { value: "staff", label: "Staff", dot: "#f97316" },
                            ]}
                        />
                        <DropdownSelect
                            label="Status" value={filterStatus}
                            onSelect={v => setFilterStatus(v as StaffStatus | "all")}
                            options={[
                                { value: "all", label: "All Statuses" },
                                { value: "active", label: "Active", dot: "#10b981" },
                                { value: "inactive", label: "Inactive", dot: "#94a3b8" },
                                { value: "pending", label: "Pending", dot: "#f59e0b" },
                            ]}
                        />
                        {anyFilterActive && (
                            <button onClick={resetFilters}
                                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[0.75rem] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-colors w-full sm:w-auto">
                                <RotateCcw size={12} /> Reset filters
                            </button>
                        )}
                    </div>
                    {anyFilterActive && (
                        <p className="text-[0.68rem] text-slate-400 font-medium px-1">
                            Showing <span className="font-black text-slate-700">{filtered.length}</span> of{" "}
                            <span className="font-black text-slate-700">{staffList.length}</span> staff members
                        </p>
                    )}
                </div>

                {/* Staff Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                                <div className="h-1 bg-slate-100 w-full" />
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-3 w-3/4" />
                                            <Skeleton className="h-2 w-1/2" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-xl" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-2 w-full" />
                                        <Skeleton className="h-2 w-3/4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : staffList.length === 0 ? (
                    <EmptyState onAdd={() => setShowAdd(true)} />
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <Search size={28} className="text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400">No matching staff found</p>
                        <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filters</p>
                        <button onClick={resetFilters}
                            className="mt-4 text-xs font-black text-teal-600 hover:text-teal-700 transition-colors">
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {filtered.map((member, i) => (
                            <StaffCard
                                key={member.id}
                                member={member}
                                index={i}
                                onEdit={setEditTarget}
                                onDelete={setDeleteTarget}
                                onToggleStatus={handleToggleStatus}
                                onViewAttendance={setAttendanceTarget}
                                lastAttendance={attendanceMap[member.id] ?? null}
                                isOnline={onlineIds.has(member.id)}
                            />
                        ))}
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <p className="text-center text-[10px] font-bold text-slate-300">
                        Showing {filtered.length} of {staffList.length} staff member{staffList.length !== 1 ? "s" : ""}
                    </p>
                )}

                {/* Today's attendance overview */}
                {!loading && staffList.length > 0 && (
                    <TodayAttendancePanel
                        staffList={staffList}
                        attendanceMap={attendanceMap}
                        onlineIds={onlineIds}
                        clockedInCount={clockedInCount}
                        onMemberClick={setAttendanceTarget}
                        onMarkAbsent={fetchStaff}
                    />
                )}

                {/* Full attendance log with date range filter */}
                {!loading && staffList.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                        <AttendanceLogView staffList={staffList} />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showAdd && <StaffModal mode="add" onClose={() => setShowAdd(false)} onSaved={fetchStaff} />}
                {editTarget && <StaffModal mode="edit" initial={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchStaff} />}
                {deleteTarget && <DeleteModal member={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={fetchStaff} />}
                {attendanceTarget && <AttendanceModal member={attendanceTarget} onClose={() => setAttendanceTarget(null)} />}
            </AnimatePresence>
        </>
    );
}