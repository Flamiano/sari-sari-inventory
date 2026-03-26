"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import {
  Store, Package, Users, TrendingUp,
  AlertTriangle, ShoppingBag, Receipt, Banknote,
  BarChart3, RefreshCw, ArrowUpRight, Clock, Flame,
  Loader2, Check, ClipboardCheck,
  Wallet, ShieldAlert, Activity, Bell, Settings,
} from "lucide-react";

// types
interface GlobalStats {
  totalStores: number;
  totalProducts: number;
  totalStaff: number;
  totalRevenue: number;
  totalTransactions: number;
  openFeedback: number;
  unpaidUtang: number;
  lowStockCount: number;
  absentToday: number;
  lateToday: number;
  totalSuppliers: number;
}

interface StoreStat {
  owner_id: string;
  store_name: string;
  email: string;
  revenue: number;
  txCount: number;
  productCount: number;
  staffCount: number;
  color: string;
}

interface RecentTransaction {
  id: string;
  transaction_ref: string;
  total_amount: number;
  item_count: number;
  created_at: string;
  sold_by_name: string | null;
  store_name: string;
}

interface FeedbackItem {
  id: string;
  title: string;
  category: string;
  rating: number | null;
  status: string;
  created_at: string;
  user_email: string;
}

interface PeriodSales {
  total: number;
  txCount: number;
  ownerSales: number;
  cashierSales: number;
}

// helpers
const php = (n: number | null | undefined) =>
  `₱${Number(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const phpShort = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₱${(v / 1_000).toFixed(1)}k`;
  return `₱${v.toFixed(0)}`;
};

const safeNum = (v: unknown) => Number(v ?? 0);

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="skel" style={style} />;
}

// donut chart
function SvgDonut({ stores, total }: { stores: StoreStat[]; total: number }) {
  const SIZE = 120, RADIUS = 46, CX = SIZE / 2, CY = SIZE / 2, STROKE = 16;
  const CIRCUM = 2 * Math.PI * RADIUS;
  let cumulative = 0;
  const segments = stores.map((s) => {
    const pct = total > 0 ? s.revenue / total : 1 / stores.length;
    const offset = CIRCUM * (1 - cumulative);
    const dash = CIRCUM * pct;
    cumulative += pct;
    return { ...s, dash, offset };
  });

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#f0f0f0" strokeWidth={STROKE} />
        {segments.map((s, i) => (
          <circle key={i} cx={CX} cy={CY} r={RADIUS} fill="none"
            stroke={s.color} strokeWidth={STROKE}
            strokeDasharray={`${s.dash} ${CIRCUM - s.dash}`}
            strokeDashoffset={s.offset}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        ))}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Rev
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#111827", lineHeight: 1.2, marginTop: 1 }}>
          {phpShort(total)}
        </span>
      </div>
    </div>
  );
}

const STORE_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#be185d", "#059669",
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  general: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  bug_report: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  feature_request: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  improvement: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  praise: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
};

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<GlobalStats>({
    totalStores: 0, totalProducts: 0, totalStaff: 0,
    totalRevenue: 0, totalTransactions: 0, openFeedback: 0,
    unpaidUtang: 0, lowStockCount: 0, absentToday: 0,
    lateToday: 0, totalSuppliers: 0,
  });
  const [storeStats, setStoreStats] = useState<StoreStat[]>([]);
  const [recentTxns, setRecentTxns] = useState<RecentTransaction[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Good morning");
  const [salesPeriod, setSalesPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [periodData, setPeriodData] = useState<PeriodSales>({ total: 0, txCount: 0, ownerSales: 0, cashierSales: 0 });
  const [periodLoading, setPeriodLoading] = useState(false);
  const now = new Date();

  useEffect(() => {
    const h = now.getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const fetchPeriodSales = useCallback(async (period: "today" | "week" | "month" | "year") => {
    setPeriodLoading(true);
    try {
      const n = new Date();
      let start: Date;
      if (period === "today") {
        start = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0);
      } else if (period === "week") {
        start = new Date(n); start.setDate(n.getDate() - 6); start.setHours(0, 0, 0, 0);
      } else if (period === "month") {
        start = new Date(n.getFullYear(), n.getMonth(), 1, 0, 0, 0);
      } else {
        start = new Date(n.getFullYear(), 0, 1, 0, 0, 0);
      }
      const end = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59);

      const { data } = await supabase
        .from("sales_transactions")
        .select("id, total_amount, sold_by_staff_id")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      const rows = data ?? [];
      const ownerRows = rows.filter((t: any) => !t.sold_by_staff_id);
      const cashierRows = rows.filter((t: any) => !!t.sold_by_staff_id);

      setPeriodData({
        total: rows.reduce((s: number, t: any) => s + safeNum(t.total_amount), 0),
        txCount: rows.length,
        ownerSales: ownerRows.reduce((s: number, t: any) => s + safeNum(t.total_amount), 0),
        cashierSales: cashierRows.reduce((s: number, t: any) => s + safeNum(t.total_amount), 0),
      });
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = now.toISOString().split("T")[0];

      const [
        profilesRes, productsRes, mealsRes, staffRes, allTxnRes,
        recentTxnRes, feedbackRes, utangRes, lowProdRes, lowMealRes,
        attendanceRes, suppliersRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id, store_name, email").eq("role", "owner"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("prepared_meals").select("*", { count: "exact", head: true }),
        supabase.from("staff_members").select("id, owner_id, status").eq("status", "active"),
        supabase.from("sales_transactions").select("id, user_id, total_amount, sold_by_staff_id, transaction_ref, item_count, created_at, sold_by_name"),
        supabase.from("sales_transactions")
          .select("id, transaction_ref, total_amount, item_count, created_at, sold_by_name, user_id")
          .order("created_at", { ascending: false }).limit(8),
        supabase.from("feedback")
          .select("id, title, category, rating, status, created_at, user_id")
          .in("status", ["open", "in_review"])
          .order("created_at", { ascending: false }).limit(6),
        supabase.from("utang_list").select("amount, amount_paid").eq("is_paid", false),
        supabase.from("products").select("id").lte("stock_quantity", 5),
        supabase.from("prepared_meals").select("id").lte("stock_quantity", 2),
        supabase.from("staff_attendance").select("attendance_status").eq("date", todayStr),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
      ]);

      const profiles = profilesRes.data ?? [];
      const allTxns = allTxnRes.data ?? [];

      const storeRevenueMap: Record<string, { revenue: number; txCount: number }> = {};
      allTxns.forEach((t: any) => {
        if (!storeRevenueMap[t.user_id]) storeRevenueMap[t.user_id] = { revenue: 0, txCount: 0 };
        storeRevenueMap[t.user_id].revenue += safeNum(t.total_amount);
        storeRevenueMap[t.user_id].txCount += 1;
      });

      const staffByOwner: Record<string, number> = {};
      (staffRes.data ?? []).forEach((s: any) => {
        staffByOwner[s.owner_id] = (staffByOwner[s.owner_id] ?? 0) + 1;
      });

      const builtStores: StoreStat[] = profiles
        .map((p: any, idx: number) => ({
          owner_id: p.id,
          store_name: p.store_name ?? p.email?.split("@")[0] ?? "Store",
          email: p.email,
          revenue: storeRevenueMap[p.id]?.revenue ?? 0,
          txCount: storeRevenueMap[p.id]?.txCount ?? 0,
          productCount: 0,
          staffCount: staffByOwner[p.id] ?? 0,
          color: STORE_COLORS[idx % STORE_COLORS.length],
        }))
        .sort((a: StoreStat, b: StoreStat) => b.revenue - a.revenue);

      setStoreStats(builtStores);

      const profileMap: Record<string, string> = {};
      profiles.forEach((p: any) => { profileMap[p.id] = p.store_name ?? p.email ?? "—"; });

      setRecentTxns(
        (recentTxnRes.data ?? []).map((t: any) => ({ ...t, store_name: profileMap[t.user_id] ?? "—" }))
      );

      const emailMap: Record<string, string> = {};
      profiles.forEach((p: any) => { emailMap[p.id] = p.email ?? "—"; });
      setRecentFeedback(
        (feedbackRes.data ?? []).map((f: any) => ({ ...f, user_email: emailMap[f.user_id] ?? "unknown" }))
      );

      const attendance = attendanceRes.data ?? [];
      const utangRows = utangRes.data ?? [];
      const unpaidUtang = utangRows.reduce((s: number, r: any) => s + safeNum(r.amount) - safeNum(r.amount_paid), 0);
      const totalRevenue = allTxns.reduce((s: number, t: any) => s + safeNum(t.total_amount), 0);

      setStats({
        totalStores: profiles.length,
        totalProducts: (productsRes.count ?? 0) + (mealsRes.count ?? 0),
        totalStaff: staffRes.data?.length ?? 0,
        totalRevenue,
        totalTransactions: allTxns.length,
        openFeedback: feedbackRes.data?.length ?? 0,
        unpaidUtang,
        lowStockCount: (lowProdRes.data?.length ?? 0) + (lowMealRes.data?.length ?? 0),
        absentToday: attendance.filter((a: any) => a.attendance_status === "absent").length,
        lateToday: attendance.filter((a: any) => a.attendance_status === "late").length,
        totalSuppliers: suppliersRes.count ?? 0,
      });
    } catch (err) {
      console.error("Admin dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchPeriodSales(salesPeriod); }, [fetchPeriodSales, salesPeriod]);

  const dateLabel = now.toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const topStoreRevenue = storeStats[0]?.revenue ?? 1;
  const ownerPct = periodData.total > 0 ? (periodData.ownerSales / periodData.total) * 100 : 0;

  const STAT_CARDS = [
    { label: "Active Stores", value: stats.totalStores, sub: "Owner accounts", icon: Store, color: "#2563eb", bg: "#eff6ff" },
    { label: "Total SKUs", value: stats.totalProducts, sub: "Products + meals", icon: Package, color: "#0891b2", bg: "#ecfeff" },
    { label: "Active Staff", value: stats.totalStaff, sub: "Across all stores", icon: Users, color: "#16a34a", bg: "#f0fdf4" },
    { label: "All-Time Revenue", value: phpShort(stats.totalRevenue), sub: `${stats.totalTransactions} transactions`, icon: TrendingUp, color: "#d97706", bg: "#fffbeb" },
    { label: "Low Stock Items", value: stats.lowStockCount, sub: stats.lowStockCount > 0 ? "Needs restock" : "All good", icon: AlertTriangle, color: stats.lowStockCount > 0 ? "#dc2626" : "#9ca3af", bg: stats.lowStockCount > 0 ? "#fef2f2" : "#f9fafb", alert: stats.lowStockCount > 0 },
    { label: "Open Feedback", value: stats.openFeedback, sub: "Pending review", icon: ShoppingBag, color: stats.openFeedback > 0 ? "#d97706" : "#9ca3af", bg: stats.openFeedback > 0 ? "#fffbeb" : "#f9fafb", alert: stats.openFeedback > 0 },
    { label: "Unpaid Utang", value: phpShort(stats.unpaidUtang), sub: "Platform-wide", icon: Wallet, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Absent Today", value: stats.absentToday, sub: "Staff attendance", icon: ClipboardCheck, color: stats.absentToday > 0 ? "#dc2626" : "#9ca3af", bg: stats.absentToday > 0 ? "#fef2f2" : "#f9fafb", alert: stats.absentToday > 0 },
    { label: "Late Today", value: stats.lateToday, sub: "Staff attendance", icon: Clock, color: stats.lateToday > 0 ? "#d97706" : "#9ca3af", bg: stats.lateToday > 0 ? "#fffbeb" : "#f9fafb", alert: stats.lateToday > 0 },
    { label: "Total Suppliers", value: stats.totalSuppliers, sub: "System-wide", icon: Activity, color: "#059669", bg: "#ecfdf5" },
  ];

  return (
    <>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

                :root {
                    --font: 'DM Sans', sans-serif;
                    --mono: 'DM Mono', monospace;
                    --bg: #f5f6fa;
                    --card: #ffffff;
                    --border: #e5e7eb;
                    --border-strong: #d1d5db;
                    --text: #111827;
                    --text-2: #374151;
                    --text-3: #6b7280;
                    --text-4: #9ca3af;
                    --blue: #2563eb;
                    --blue-dim: #eff6ff;
                    --green: #16a34a;
                    --amber: #d97706;
                    --red: #dc2626;
                    --purple: #7c3aed;
                    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
                    --shadow: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
                }

                @keyframes skelPulse {
                    0%, 100% { opacity: 1 }
                    50% { opacity: 0.5 }
                }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(8px) }
                    to { opacity: 1; transform: translateY(0) }
                }

                .skel {
                    background: #e5e7eb;
                    border-radius: 6px;
                    animation: skelPulse 1.5s ease-in-out infinite;
                }

                /* topbar inside dashboard */
                .dash-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .dash-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text);
                    line-height: 1.2;
                }

                .dash-date {
                    font-size: 12px;
                    color: var(--text-4);
                    margin-top: 2px;
                }

                .refresh-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: white;
                    font-family: var(--font);
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-3);
                    cursor: pointer;
                    transition: all 0.14s ease;
                }
                .refresh-btn:hover {
                    background: var(--bg);
                    color: var(--text);
                    border-color: var(--border-strong);
                }

                /* banner */
                .banner {
                    background: var(--blue);
                    border-radius: 14px;
                    padding: 24px 28px;
                    margin-bottom: 24px;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    position: relative;
                    overflow: hidden;
                    animation: fadeUp 0.3s ease both;
                }

                .banner::after {
                    content: '';
                    position: absolute;
                    right: -40px;
                    top: -40px;
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.06);
                    pointer-events: none;
                }

                .banner-greeting {
                    font-size: 12px;
                    font-weight: 500;
                    color: rgba(255,255,255,0.7);
                    margin-bottom: 4px;
                }

                .banner-title {
                    font-size: 22px;
                    font-weight: 700;
                    color: white;
                    line-height: 1.1;
                }

                .banner-sub {
                    font-size: 12px;
                    color: rgba(255,255,255,0.6);
                    margin-top: 4px;
                }

                .period-bar {
                    display: flex;
                    gap: 2px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 10px;
                    padding: 3px;
                }

                .period-btn {
                    padding: 5px 12px;
                    border-radius: 7px;
                    border: none;
                    font-family: var(--font);
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    background: transparent;
                    color: rgba(255,255,255,0.6);
                }

                .period-btn.active {
                    background: white;
                    color: var(--blue);
                }

                .banner-rev-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.6);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 4px;
                    text-align: right;
                }

                .banner-rev-num {
                    font-size: 26px;
                    font-weight: 700;
                    color: white;
                    line-height: 1;
                    text-align: right;
                    font-variant-numeric: tabular-nums;
                }

                .banner-split-pills {
                    display: flex;
                    gap: 6px;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                    margin-top: 6px;
                }

                .split-pill {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: rgba(255,255,255,0.12);
                    border-radius: 6px;
                    padding: 3px 8px;
                    font-size: 10px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.85);
                }

                .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                /* stat grid */
                .stat-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
                    gap: 12px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    background: var(--card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 18px;
                    box-shadow: var(--shadow-sm);
                    animation: fadeUp 0.35s ease both;
                    transition: box-shadow 0.2s, border-color 0.2s;
                }

                .stat-card:hover {
                    box-shadow: var(--shadow);
                    border-color: var(--border-strong);
                }

                .stat-icon-wrap {
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 14px;
                }

                .stat-label {
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: var(--text-4);
                    margin-bottom: 4px;
                }

                .stat-value {
                    font-size: 22px;
                    font-weight: 700;
                    color: var(--text);
                    line-height: 1;
                    font-variant-numeric: tabular-nums;
                }

                .stat-value.alert { color: var(--red); }

                .stat-sub {
                    font-size: 11px;
                    color: var(--text-4);
                    margin-top: 4px;
                }

                /* section row */
                .section-row {
                    display: grid;
                    grid-template-columns: 1fr 340px;
                    gap: 20px;
                    align-items: start;
                    margin-bottom: 20px;
                }

                @media (max-width: 1100px) {
                    .section-row { grid-template-columns: 1fr; }
                }

                /* card */
                .card {
                    background: var(--card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                    animation: fadeUp 0.35s ease both;
                    animation-delay: 0.1s;
                }

                .card-hd {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .card-hd-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .card-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 9px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .card-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text);
                }

                .card-sub {
                    font-size: 11px;
                    color: var(--text-4);
                    margin-top: 1px;
                }

                .card-body { padding: 20px; }

                /* revenue card */
                .rev-main {
                    font-size: 30px;
                    font-weight: 700;
                    color: var(--text);
                    line-height: 1;
                    letter-spacing: -0.02em;
                    font-variant-numeric: tabular-nums;
                }

                .rev-tx-label {
                    font-size: 11px;
                    color: var(--text-4);
                    margin-top: 4px;
                }

                .split-bar-labels {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                    font-size: 11px;
                    color: var(--text-3);
                    font-weight: 500;
                }

                .split-bar-track {
                    height: 6px;
                    background: #f3f4f6;
                    border-radius: 999px;
                    overflow: hidden;
                    display: flex;
                }

                .split-seg {
                    height: 100%;
                    transition: width 0.5s ease;
                }

                .boxes-3 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-top: 16px;
                }

                .box3 {
                    background: #f9fafb;
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 12px;
                }

                .box3-label {
                    font-size: 9px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--text-4);
                    margin-bottom: 5px;
                }

                .box3-val {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text);
                    font-variant-numeric: tabular-nums;
                }

                .box3-sub {
                    font-size: 10px;
                    color: var(--text-4);
                    margin-top: 2px;
                }

                /* leaderboard */
                .lb-row {
                    padding: 12px 20px;
                    border-bottom: 1px solid #f3f4f6;
                    transition: background 0.12s;
                }

                .lb-row:last-child { border-bottom: none; }
                .lb-row:hover { background: #fafafa; }

                .lb-row-top {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .lb-rank {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 9px;
                    font-weight: 800;
                    flex-shrink: 0;
                    color: white;
                }

                .lb-name {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text);
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .lb-rev {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text);
                    flex-shrink: 0;
                    font-variant-numeric: tabular-nums;
                }

                .lb-email {
                    font-size: 10px;
                    color: var(--text-4);
                    margin-left: 28px;
                    margin-bottom: 5px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .lb-bar-track {
                    height: 4px;
                    background: #f3f4f6;
                    border-radius: 999px;
                    overflow: hidden;
                    margin-left: 28px;
                }

                .lb-bar { height: 100%; border-radius: 999px; transition: width 0.6s ease; }

                .lb-meta {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: var(--text-4);
                    margin-top: 3px;
                    margin-left: 28px;
                }

                .lb-footer {
                    padding: 12px 20px;
                    border-top: 1px solid var(--border);
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    text-align: center;
                    background: #fafafa;
                }

                .lbf-label {
                    font-size: 9px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--text-4);
                }

                .lbf-val {
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--text);
                    margin-top: 2px;
                    font-variant-numeric: tabular-nums;
                }

                /* transactions */
                .txn-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 11px 16px;
                    border-bottom: 1px solid #f3f4f6;
                    transition: background 0.12s;
                }

                .txn-row:last-child { border-bottom: none; }
                .txn-row:hover { background: #fafafa; }

                .txn-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 9px;
                    font-weight: 800;
                }

                .txn-ref {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--text);
                    font-family: var(--mono);
                }

                .txn-meta {
                    font-size: 10px;
                    color: var(--text-4);
                    margin-top: 2px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    flex-wrap: wrap;
                }

                .role-badge {
                    padding: 1px 5px;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: 600;
                }

                .txn-amt {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text);
                    flex-shrink: 0;
                    font-variant-numeric: tabular-nums;
                }

                /* feedback */
                .fb-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 11px 16px;
                    border-bottom: 1px solid #f3f4f6;
                    transition: background 0.12s;
                }

                .fb-row:last-child { border-bottom: none; }
                .fb-row:hover { background: #fafafa; }

                .fb-cat-pill {
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    padding: 3px 7px;
                    border-radius: 5px;
                    flex-shrink: 0;
                    margin-top: 1px;
                    border: 1px solid transparent;
                }

                .fb-title {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--text);
                    line-height: 1.35;
                }

                .fb-meta {
                    font-size: 10px;
                    color: var(--text-4);
                    margin-top: 3px;
                }

                .tag-open {
                    display: inline-block;
                    padding: 2px 7px;
                    border-radius: 5px;
                    font-size: 9px;
                    font-weight: 700;
                    background: #fff7ed;
                    color: #d97706;
                    border: 1px solid #fde68a;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                /* empty state */
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 20px;
                    text-align: center;
                    gap: 8px;
                }

                .empty-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    background: #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 4px;
                }

                .empty-title { font-size: 13px; font-weight: 600; color: var(--text-3); }
                .empty-sub { font-size: 11px; color: var(--text-4); }

                @media (max-width: 640px) {
                    .stat-grid { grid-template-columns: repeat(2, 1fr); }
                    .boxes-3 { grid-template-columns: 1fr 1fr; }
                }
            `}</style>

      {/* inner topbar — title + refresh only, no nav */}
      <div className="dash-topbar">
        <div>
          <div className="dash-title">System Dashboard</div>
          <div className="dash-date">{dateLabel}</div>
        </div>
        <button className="refresh-btn" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* banner */}
      <div className="banner">
        <div>
          <div className="banner-greeting">{greeting}, Superadmin 👋</div>
          <h1 className="banner-title">Platform Overview</h1>
          <p className="banner-sub">Here's what's happening across all stores today.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div className="period-bar">
            {(["today", "week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                className={`period-btn ${salesPeriod === p ? "active" : ""}`}
                onClick={() => setSalesPeriod(p)}
              >
                {p === "today" ? "Today" : p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
          <div>
            <div className="banner-rev-label">
              {salesPeriod === "today" ? "Today's" : salesPeriod === "week" ? "Weekly" : salesPeriod === "month" ? "Monthly" : "Yearly"} Revenue
            </div>
            {periodLoading || loading ? (
              <div className="skel" style={{ width: 140, height: 30, background: "rgba(255,255,255,0.15)" }} />
            ) : (
              <div className="banner-rev-num">{php(periodData.total)}</div>
            )}
            {!periodLoading && !loading && (
              <div className="banner-split-pills">
                <div className="split-pill">
                  <span className="dot" style={{ background: "#a5b4fc" }} />
                  Owner · {phpShort(periodData.ownerSales)}
                </div>
                <div className="split-pill">
                  <span className="dot" style={{ background: "#6ee7b7" }} />
                  Cashier · {phpShort(periodData.cashierSales)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* stat grid */}
      <div className="stat-grid">
        {STAT_CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <div className="stat-card" key={c.label} style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="stat-icon-wrap" style={{ background: c.bg }}>
                <Icon size={16} style={{ color: c.color }} />
              </div>
              <div className="stat-label">{c.label}</div>
              {loading ? (
                <Skeleton style={{ width: 60, height: 22, marginTop: 2 }} />
              ) : (
                <div className={`stat-value${c.alert ? " alert" : ""}`}>{c.value}</div>
              )}
              {loading ? (
                <Skeleton style={{ width: 80, height: 10, marginTop: 6 }} />
              ) : (
                <div className="stat-sub">{c.sub}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* revenue breakdown card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-hd">
          <div className="card-hd-left">
            <div className="card-icon" style={{ background: "#eff6ff" }}>
              <BarChart3 size={16} style={{ color: "#2563eb" }} />
            </div>
            <div>
              <div className="card-title">Revenue Breakdown</div>
              <div className="card-sub">
                {salesPeriod === "today" ? "Today" : salesPeriod === "week" ? "Last 7 days" : salesPeriod === "month" ? "This month" : "This year"} — Owner vs Cashier split
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {periodLoading || loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton style={{ width: 180, height: 34 }} />
              <Skeleton style={{ width: "100%", height: 6 }} />
              <div className="boxes-3">
                {[0, 1, 2].map(i => <Skeleton key={i} style={{ height: 60 }} />)}
              </div>
            </div>
          ) : (
            <>
              <div className="rev-main">{php(periodData.total)}</div>
              <div className="rev-tx-label">{periodData.txCount} transaction{periodData.txCount !== 1 ? "s" : ""} system-wide</div>

              {periodData.total > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="split-bar-labels">
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="dot" style={{ background: "#818cf8" }} />
                      Owner — {((periodData.ownerSales / periodData.total) * 100).toFixed(1)}%
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      Cashier — {((periodData.cashierSales / periodData.total) * 100).toFixed(1)}%
                      <span className="dot" style={{ background: "#34d399" }} />
                    </span>
                  </div>
                  <div className="split-bar-track">
                    <div className="split-seg" style={{ width: `${ownerPct}%`, background: "#818cf8" }} />
                    <div className="split-seg" style={{ flex: 1, background: "#34d399" }} />
                  </div>
                </div>
              )}

              <div className="boxes-3">
                <div className="box3">
                  <div className="box3-label">Total</div>
                  <div className="box3-val">{phpShort(periodData.total)}</div>
                  <div className="box3-sub">{periodData.txCount} orders</div>
                </div>
                <div className="box3">
                  <div className="box3-label" style={{ color: "#6d28d9" }}>Owner</div>
                  <div className="box3-val" style={{ color: "#6d28d9" }}>{phpShort(periodData.ownerSales)}</div>
                  <div className="box3-sub">Direct sales</div>
                </div>
                <div className="box3">
                  <div className="box3-label" style={{ color: "#059669" }}>Cashier</div>
                  <div className="box3-val" style={{ color: "#059669" }}>{phpShort(periodData.cashierSales)}</div>
                  <div className="box3-sub">Staff sales</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2-col grid: leaderboard + txns/feedback */}
      <div className="section-row">

        {/* leaderboard */}
        <div className="card">
          <div className="card-hd">
            <div className="card-hd-left">
              <div className="card-icon" style={{ background: "#eff6ff" }}>
                <Store size={15} style={{ color: "#2563eb" }} />
              </div>
              <div>
                <div className="card-title">Store Revenue Leaderboard</div>
                <div className="card-sub">All-time · sorted by revenue</div>
              </div>
            </div>
            {!loading && storeStats.length > 0 && (
              <SvgDonut stores={storeStats.slice(0, 6)} total={stats.totalRevenue} />
            )}
          </div>

          {loading ? (
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton style={{ width: "65%", height: 11 }} />
                  <Skeleton style={{ width: "100%", height: 4 }} />
                </div>
              ))}
            </div>
          ) : storeStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Store size={18} style={{ color: "#9ca3af" }} /></div>
              <div className="empty-title">No stores yet</div>
              <div className="empty-sub">Owner accounts will appear here</div>
            </div>
          ) : (
            <div>
              {storeStats.map((s, i) => {
                const pct = topStoreRevenue > 0 ? (s.revenue / topStoreRevenue) * 100 : 0;
                const revPct = stats.totalRevenue > 0 ? ((s.revenue / stats.totalRevenue) * 100).toFixed(1) : "0.0";
                const rankColors = ["#d97706", "#6b7280", "#92400e"];
                return (
                  <div className="lb-row" key={s.owner_id}>
                    <div className="lb-row-top">
                      <div className="lb-rank" style={{ background: rankColors[i] ?? "#d1d5db" }}>
                        {i + 1}
                      </div>
                      <span className="dot" style={{ background: s.color }} />
                      <span className="lb-name">{s.store_name}</span>
                      <span className="lb-rev">{phpShort(s.revenue)}</span>
                    </div>
                    <div className="lb-email">{s.email}</div>
                    <div className="lb-bar-track">
                      <div className="lb-bar" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                    <div className="lb-meta">
                      <span>{s.txCount} orders · {s.staffCount} staff</span>
                      <span>{revPct}% of total</span>
                    </div>
                  </div>
                );
              })}
              <div className="lb-footer">
                <div>
                  <div className="lbf-label">Stores</div>
                  <div className="lbf-val">{stats.totalStores}</div>
                </div>
                <div>
                  <div className="lbf-label" style={{ color: "#d97706" }}>Total Rev</div>
                  <div className="lbf-val" style={{ color: "#d97706" }}>{phpShort(stats.totalRevenue)}</div>
                </div>
                <div>
                  <div className="lbf-label">Transactions</div>
                  <div className="lbf-val">{stats.totalTransactions}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* right column: recent sales + feedback */}
        <div>
          {/* recent sales */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-hd" style={{ padding: "14px 16px" }}>
              <div className="card-hd-left">
                <div className="card-icon" style={{ background: "#eff6ff", width: 30, height: 30, borderRadius: 8 }}>
                  <Receipt size={14} style={{ color: "#2563eb" }} />
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: 12 }}>Recent Sales</div>
                  <div className="card-sub">Latest 8 system-wide</div>
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Skeleton style={{ width: 32, height: 32, borderRadius: 8 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                      <Skeleton style={{ width: "60%", height: 10 }} />
                      <Skeleton style={{ width: "40%", height: 8 }} />
                    </div>
                    <Skeleton style={{ width: 50, height: 12 }} />
                  </div>
                ))}
              </div>
            ) : recentTxns.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Banknote size={16} style={{ color: "#9ca3af" }} /></div>
                <div className="empty-title">No transactions yet</div>
              </div>
            ) : (
              <div>
                {recentTxns.map((t, i) => {
                  const isStaff = !!t.sold_by_name;
                  return (
                    <div className="txn-row" key={t.id}>
                      <div className="txn-avatar" style={{
                        background: isStaff ? "#f0fdf4" : "#f5f3ff",
                        color: isStaff ? "#16a34a" : "#7c3aed",
                      }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="txn-ref">{t.transaction_ref}</div>
                        <div className="txn-meta">
                          {t.store_name} · {timeAgo(t.created_at)}
                          <span className="role-badge" style={{
                            background: isStaff ? "#f0fdf4" : "#f5f3ff",
                            color: isStaff ? "#16a34a" : "#7c3aed",
                          }}>
                            {isStaff ? "Cashier" : "Owner"}
                          </span>
                        </div>
                      </div>
                      <div className="txn-amt">{php(t.total_amount)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* open feedback */}
          <div className="card">
            <div className="card-hd" style={{ padding: "14px 16px" }}>
              <div className="card-hd-left">
                <div className="card-icon" style={{ background: "#fff7ed", width: 30, height: 30, borderRadius: 8 }}>
                  <ShieldAlert size={14} style={{ color: "#d97706" }} />
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: 12 }}>Open Feedback</div>
                  <div className="card-sub">
                    {loading ? "…" : `${stats.openFeedback} item${stats.openFeedback !== 1 ? "s" : ""} pending review`}
                  </div>
                </div>
              </div>
              {!loading && stats.openFeedback > 0 && (
                <span className="tag-open">{stats.openFeedback} open</span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <Skeleton style={{ width: 50, height: 18, borderRadius: 5 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                      <Skeleton style={{ width: "70%", height: 10 }} />
                      <Skeleton style={{ width: "40%", height: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentFeedback.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Check size={16} style={{ color: "#9ca3af" }} /></div>
                <div className="empty-title">All clear!</div>
                <div className="empty-sub">No open feedback</div>
              </div>
            ) : (
              <div>
                {recentFeedback.map((f) => {
                  const catStyle = CATEGORY_STYLES[f.category] ?? CATEGORY_STYLES.general;
                  return (
                    <div className="fb-row" key={f.id}>
                      <span className="fb-cat-pill" style={{
                        background: catStyle.bg,
                        color: catStyle.text,
                        borderColor: catStyle.border,
                      }}>
                        {f.category.replace("_", " ")}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fb-title">{f.title}</div>
                        <div className="fb-meta">
                          {f.user_email} · {timeAgo(f.created_at)}
                          {f.rating && (
                            <span style={{ color: "#d97706", marginLeft: 4 }}>
                              {"★".repeat(f.rating)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}