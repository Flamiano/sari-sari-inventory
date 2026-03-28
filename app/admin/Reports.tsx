"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import {
    FileText, RefreshCw, Download, TrendingUp,
    BarChart3, Calendar, Store,
} from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import toast, { Toaster } from "react-hot-toast";

interface DailyRev {
    date: string;
    revenue: number;
    transactions: number;
    owner: number;
    cashier: number;
}

interface StoreSummary {
    store_name: string;
    revenue: number;
    txCount: number;
    staffCount: number;
}

function Skeleton({ style }: { style?: React.CSSProperties }) {
    return <div style={{ background: "#f1f5f9", borderRadius: 8, animation: "skelPulse 1.8s ease-in-out infinite", ...style }} />;
}

const php = (n: number) => `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const phpShort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
};

const CHART_TOOLTIP = {
    contentStyle: {
        border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 11,
        fontFamily: "'DM Sans', sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,.08)",
        padding: "10px 14px",
    },
    itemStyle: { fontSize: 11, fontWeight: 600 },
    labelStyle: { fontWeight: 700, color: "#0f172a", marginBottom: 4 },
};

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309", "#e2e8f0"];

export default function Reports() {
    const [dailyData, setDailyData] = useState<DailyRev[]>([]);
    const [storeData, setStoreData] = useState<StoreSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<7 | 30 | 90>(30);
    const [exporting, setExporting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const start = new Date();
            start.setDate(start.getDate() - (period - 1));
            start.setHours(0, 0, 0, 0);

            const [txnRes, profilesRes, staffRes] = await Promise.all([
                supabase.from("sales_transactions")
                    .select("created_at, total_amount, sold_by_staff_id, user_id")
                    .gte("created_at", start.toISOString())
                    .order("created_at", { ascending: true }),
                supabase.from("profiles").select("id, store_name, email").eq("role", "owner"),
                supabase.from("staff_members").select("owner_id").eq("status", "active"),
            ]);

            const txns = txnRes.data ?? [];
            const profiles = profilesRes.data ?? [];
            const storeMap: Record<string, string> = {};
            profiles.forEach((p: any) => { storeMap[p.id] = p.store_name ?? p.email; });
            const staffMap: Record<string, number> = {};
            (staffRes.data ?? []).forEach((s: any) => { staffMap[s.owner_id] = (staffMap[s.owner_id] ?? 0) + 1; });

            const dayMap: Record<string, DailyRev> = {};
            for (let i = 0; i < period; i++) {
                const d = new Date(); d.setDate(d.getDate() - (period - 1 - i));
                const key = d.toISOString().split("T")[0];
                dayMap[key] = { date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }), revenue: 0, transactions: 0, owner: 0, cashier: 0 };
            }

            txns.forEach((t: any) => {
                const key = t.created_at?.split("T")[0];
                if (!key || !dayMap[key]) return;
                const amt = Number(t.total_amount ?? 0);
                dayMap[key].revenue += amt;
                dayMap[key].transactions += 1;
                if (t.sold_by_staff_id) dayMap[key].cashier += amt;
                else dayMap[key].owner += amt;
            });

            setDailyData(Object.values(dayMap));

            const storeRevMap: Record<string, { revenue: number; txCount: number }> = {};
            txns.forEach((t: any) => {
                if (!storeRevMap[t.user_id]) storeRevMap[t.user_id] = { revenue: 0, txCount: 0 };
                storeRevMap[t.user_id].revenue += Number(t.total_amount ?? 0);
                storeRevMap[t.user_id].txCount += 1;
            });

            setStoreData(
                profiles
                    .map((p: any) => ({
                        store_name: p.store_name ?? p.email,
                        revenue: storeRevMap[p.id]?.revenue ?? 0,
                        txCount: storeRevMap[p.id]?.txCount ?? 0,
                        staffCount: staffMap[p.id] ?? 0,
                    }))
                    .sort((a: StoreSummary, b: StoreSummary) => b.revenue - a.revenue)
            );
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const exportPDF = async () => {
        setExporting(true);
        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text("SariSari IMS — Admin Report", 14, 20);
            doc.setFontSize(9); doc.setFont("helvetica", "normal");
            doc.text(`Generated: ${new Date().toLocaleString("en-PH")} · Period: Last ${period} days`, 14, 28);
            const totalRev = dailyData.reduce((s, d) => s + d.revenue, 0);
            const totalTx = dailyData.reduce((s, d) => s + d.transactions, 0);
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Revenue Summary", 14, 40);
            autoTable(doc, {
                startY: 44, head: [["Metric", "Value"]],
                body: [["Total Revenue", php(totalRev)], ["Total Transactions", totalTx.toLocaleString()], ["Avg. Daily Revenue", php(totalRev / period)], ["Stores Reporting", storeData.length.toString()]],
                styles: { fontSize: 10 }, headStyles: { fillColor: [245, 158, 11] },
            });
            const y1 = (doc as any).lastAutoTable.finalY + 12;
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Store Revenue Breakdown", 14, y1);
            autoTable(doc, {
                startY: y1 + 4, head: [["Store", "Revenue", "Transactions", "Active Staff"]],
                body: storeData.map(s => [s.store_name, php(s.revenue), s.txCount.toLocaleString(), s.staffCount.toString()]),
                styles: { fontSize: 10 }, headStyles: { fillColor: [245, 158, 11] },
            });
            const y2 = (doc as any).lastAutoTable.finalY + 12;
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Daily Revenue Trend", 14, y2);
            autoTable(doc, {
                startY: y2 + 4, head: [["Date", "Revenue", "Transactions", "Owner", "Cashier"]],
                body: dailyData.map(d => [d.date, php(d.revenue), d.transactions.toString(), php(d.owner), php(d.cashier)]),
                styles: { fontSize: 9 }, headStyles: { fillColor: [245, 158, 11] },
            });
            doc.save(`admin-report-${new Date().toISOString().split("T")[0]}.pdf`);
            toast.success("PDF exported successfully");
        } catch {
            toast.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    const totalRev = dailyData.reduce((s, d) => s + d.revenue, 0);
    const totalTx = dailyData.reduce((s, d) => s + d.transactions, 0);
    const avgDaily = period > 0 ? totalRev / period : 0;
    const topStore = storeData[0];

    const kpiCards = [
        { label: "Total Revenue", value: phpShort(totalRev), icon: TrendingUp, accent: "#10b981", light: "#d1fae5" },
        { label: "Transactions", value: totalTx.toLocaleString(), icon: BarChart3, accent: "#3b82f6", light: "#dbeafe" },
        { label: "Avg / Day", value: phpShort(avgDaily), icon: Calendar, accent: "#f59e0b", light: "#fef3c7" },
        { label: "Top Store", value: topStore?.store_name ?? "—", icon: Store, accent: "#8b5cf6", light: "#ede9fe" },
    ];

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f8fafc", padding: "32px 24px" }}>
            <Toaster position="top-right" toastOptions={{ style: { fontFamily: "'DM Sans', sans-serif", fontSize: 13 } }} />
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .period-tab { padding:7px 16px; border:1.5px solid #e2e8f0; border-radius:999px; background:white; font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; }
        .period-tab:hover { background:#f8fafc; border-color:#cbd5e1; }
        .period-tab.on { background:#fef3c7; border-color:#f59e0b; color:#92400e; }
        .chart-card { background:white; border:1.5px solid #f1f5f9; border-radius:20px; box-shadow:0 4px 24px rgba(0,0,0,.05); overflow:hidden; margin-bottom:20px; }
        .chart-header { padding:18px 24px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:12px; }
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#10b981", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4 }}>Analytics</p>
                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, fontWeight: 400, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>Reports</h1>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Platform-wide revenue analytics</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={fetchData} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "white", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={exportPDF} disabled={exporting || loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "#f59e0b", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: exporting ? 0.75 : 1 }}>
                        <Download size={13} />
                        {exporting ? "Exporting…" : "Export PDF"}
                    </motion.button>
                </div>
            </div>

            {/* Period picker */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginRight: 4 }}>Period</span>
                {([7, 30, 90] as const).map(p => (
                    <button key={p} className={`period-tab ${period === p ? "on" : ""}`} onClick={() => setPeriod(p)}>
                        Last {p}d
                    </button>
                ))}
            </div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 14, marginBottom: 24 }}>
                {kpiCards.map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <motion.div
                            key={c.label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.4 }}
                            style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 18, padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,.04)" }}
                        >
                            <div style={{ width: 38, height: 38, borderRadius: 11, background: c.light, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                                <Icon size={17} style={{ color: c.accent }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#94a3b8", marginBottom: 4 }}>{c.label}</div>
                            {loading
                                ? <Skeleton style={{ width: 80, height: 22 }} />
                                : <div style={{ fontSize: c.label === "Top Store" ? 13 : 22, fontWeight: 800, color: c.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.value}</div>
                            }
                        </motion.div>
                    );
                })}
            </div>

            {/* Revenue line chart */}
            <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                <div className="chart-header">
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <TrendingUp size={16} style={{ color: "#3b82f6" }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Daily Revenue Trend</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Last {period} days · Owner vs Cashier</div>
                    </div>
                </div>
                <div style={{ padding: "20px 20px 16px" }}>
                    {loading ? <Skeleton style={{ height: 220 }} /> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dailyData} margin={{ left: 0, right: 12, top: 5, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'DM Sans',sans-serif" }} tickLine={false} axisLine={false} interval={Math.floor(period / 7)} />
                                <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'DM Sans',sans-serif" }} tickLine={false} axisLine={false} tickFormatter={v => phpShort(v)} width={58} />
                                <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => php(v)} />
                                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans',sans-serif", paddingTop: 8 }} />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Total" />
                                <Line type="monotone" dataKey="owner" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Owner" strokeDasharray="5 3" />
                                <Line type="monotone" dataKey="cashier" stroke="#10b981" strokeWidth={1.5} dot={false} name="Cashier" strokeDasharray="5 3" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </motion.div>

            {/* Store bar chart */}
            <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.4 }}>
                <div className="chart-header">
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BarChart3 size={16} style={{ color: "#f59e0b" }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Store Revenue Comparison</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Last {period} days</div>
                    </div>
                </div>
                <div style={{ padding: "20px 20px 16px" }}>
                    {loading ? <Skeleton style={{ height: 200 }} /> : storeData.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 0" }}>No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(180, storeData.length * 40)}>
                            <BarChart data={storeData} layout="vertical" margin={{ left: 0, right: 70, top: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'DM Sans',sans-serif" }} tickLine={false} axisLine={false} tickFormatter={v => phpShort(v)} />
                                <YAxis type="category" dataKey="store_name" tick={{ fontSize: 11, fill: "#475569", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }} tickLine={false} axisLine={false} width={120} />
                                <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => php(v)} />
                                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </motion.div>

            {/* Store detail table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46, duration: 0.4 }}
                style={{ background: "white", border: "1.5px solid #f1f5f9", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,.05)", overflow: "hidden" }}
            >
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Detailed Store Breakdown</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Last {period} days · sorted by revenue</div>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#fafbff" }}>
                                {["Rank", "Store", "Revenue", "Transactions", "Avg. Order", "Active Staff"].map(h => (
                                    <th key={h} style={{ padding: "11px 20px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8", textAlign: "left", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(6)].map((_, j) => (
                                            <td key={j} style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
                                                <Skeleton style={{ height: 13, width: j === 1 ? 110 : 65 }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : storeData.map((s, i) => (
                                <tr
                                    key={s.store_name}
                                    style={{ transition: "background .12s" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#fafbff")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                    <td style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
                                        <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: i < 3 ? "white" : "#64748b", background: RANK_COLORS[Math.min(i, 3)] }}>
                                            {i + 1}
                                        </div>
                                    </td>
                                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>{s.store_name}</td>
                                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 800, color: "#f59e0b", borderBottom: "1px solid #f1f5f9", fontVariantNumeric: "tabular-nums" }}>{php(s.revenue)}</td>
                                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#475569", borderBottom: "1px solid #f1f5f9", fontVariantNumeric: "tabular-nums" }}>{s.txCount.toLocaleString()}</td>
                                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#475569", borderBottom: "1px solid #f1f5f9", fontVariantNumeric: "tabular-nums" }}>{s.txCount > 0 ? php(s.revenue / s.txCount) : "—"}</td>
                                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#475569", borderBottom: "1px solid #f1f5f9" }}>{s.staffCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}