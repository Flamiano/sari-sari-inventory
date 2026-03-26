"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    FileText, RefreshCw, Download, TrendingUp,
    BarChart3, Calendar, Store, Users,
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
    return <div style={{ background: "#e5e7eb", borderRadius: 6, animation: "skelPulse 1.5s ease-in-out infinite", ...style }} />;
}

const php = (n: number) => `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const phpShort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
};

const TOOLTIP_STYLE = {
    contentStyle: { border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 12px rgba(0,0,0,.08)" },
    itemStyle: { fontSize: 11 },
};

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

            // Daily aggregation
            const dayMap: Record<string, DailyRev> = {};
            for (let i = 0; i < period; i++) {
                const d = new Date(); d.setDate(d.getDate() - (period - 1 - i));
                const key = d.toISOString().split("T")[0];
                dayMap[key] = {
                    date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
                    revenue: 0, transactions: 0, owner: 0, cashier: 0,
                };
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

            // Per-store aggregation
            const storeRevMap: Record<string, { revenue: number; txCount: number }> = {};
            txns.forEach((t: any) => {
                if (!storeRevMap[t.user_id]) storeRevMap[t.user_id] = { revenue: 0, txCount: 0 };
                storeRevMap[t.user_id].revenue += Number(t.total_amount ?? 0);
                storeRevMap[t.user_id].txCount += 1;
            });

            const sd: StoreSummary[] = profiles
                .map((p: any) => ({
                    store_name: p.store_name ?? p.email,
                    revenue: storeRevMap[p.id]?.revenue ?? 0,
                    txCount: storeRevMap[p.id]?.txCount ?? 0,
                    staffCount: staffMap[p.id] ?? 0,
                }))
                .sort((a: StoreSummary, b: StoreSummary) => b.revenue - a.revenue);

            setStoreData(sd);
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

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("SariSari IMS — Admin Report", 14, 20);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Generated: ${new Date().toLocaleString("en-PH")} · Period: Last ${period} days`, 14, 28);

            // Summary
            const totalRev = dailyData.reduce((s, d) => s + d.revenue, 0);
            const totalTx = dailyData.reduce((s, d) => s + d.transactions, 0);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Revenue Summary", 14, 40);
            autoTable(doc, {
                startY: 44,
                head: [["Metric", "Value"]],
                body: [
                    ["Total Revenue", php(totalRev)],
                    ["Total Transactions", totalTx.toLocaleString()],
                    ["Avg. Daily Revenue", php(totalRev / period)],
                    ["Stores Reporting", storeData.length.toString()],
                ],
                styles: { fontSize: 10 },
                headStyles: { fillColor: [37, 99, 235] },
            });

            // Store breakdown
            const y1 = (doc as any).lastAutoTable.finalY + 12;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Store Revenue Breakdown", 14, y1);
            autoTable(doc, {
                startY: y1 + 4,
                head: [["Store", "Revenue", "Transactions", "Active Staff"]],
                body: storeData.map(s => [s.store_name, php(s.revenue), s.txCount.toLocaleString(), s.staffCount.toString()]),
                styles: { fontSize: 10 },
                headStyles: { fillColor: [37, 99, 235] },
            });

            // Daily trend
            const y2 = (doc as any).lastAutoTable.finalY + 12;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Daily Revenue Trend", 14, y2);
            autoTable(doc, {
                startY: y2 + 4,
                head: [["Date", "Revenue", "Transactions", "Owner", "Cashier"]],
                body: dailyData.map(d => [d.date, php(d.revenue), d.transactions.toString(), php(d.owner), php(d.cashier)]),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [37, 99, 235] },
            });

            doc.save(`admin-report-${new Date().toISOString().split("T")[0]}.pdf`);
            toast.success("PDF exported successfully");
        } catch (e) {
            toast.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    const totalRev = dailyData.reduce((s, d) => s + d.revenue, 0);
    const totalTx = dailyData.reduce((s, d) => s + d.transactions, 0);
    const avgDaily = period > 0 ? totalRev / period : 0;
    const topStore = storeData[0];

    return (
        <>
            <Toaster position="top-right" />
            <style>{`
        @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .rpt-card { background:white; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.05); overflow:hidden; animation:fadeUp .3s ease both; }
        .period-tab { padding:6px 14px; border:1px solid #e5e7eb; border-radius:8px; background:white; font-family:inherit; font-size:11px; font-weight:600; color:#6b7280; cursor:pointer; transition:all .12s; }
        .period-tab.active { background:#eff6ff; border-color:#bfdbfe; color:#2563eb; }
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Reports</h1>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Platform-wide analytics and revenue reports</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={fetchData} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", border: "1px solid #e5e7eb", borderRadius: 9, fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
                        <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </button>
                    <button onClick={exportPDF} disabled={exporting || loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#2563eb", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer", opacity: exporting ? 0.7 : 1 }}>
                        <Download size={12} />
                        {exporting ? "Exporting…" : "Export PDF"}
                    </button>
                </div>
            </div>

            {/* Period picker */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", alignSelf: "center", marginRight: 4 }}>Period:</span>
                {([7, 30, 90] as const).map(p => (
                    <button key={p} className={`period-tab ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>
                        Last {p} days
                    </button>
                ))}
            </div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
                {[
                    { label: "Total Revenue", value: loading ? null : phpShort(totalRev), icon: TrendingUp, color: "#d97706", bg: "#fffbeb" },
                    { label: "Transactions", value: loading ? null : totalTx.toLocaleString(), icon: BarChart3, color: "#2563eb", bg: "#eff6ff" },
                    { label: "Avg/Day", value: loading ? null : phpShort(avgDaily), icon: Calendar, color: "#16a34a", bg: "#f0fdf4" },
                    { label: "Top Store", value: loading ? null : (topStore?.store_name ?? "—"), icon: Store, color: "#7c3aed", bg: "#f5f3ff" },
                ].map(c => {
                    const Icon = c.icon;
                    return (
                        <div key={c.label} className="rpt-card" style={{ padding: "16px 18px" }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                                <Icon size={15} style={{ color: c.color }} />
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af", marginBottom: 2 }}>{c.label}</div>
                            {loading ? <Skeleton style={{ width: 80, height: 20 }} /> : (
                                <div style={{ fontSize: c.label === "Top Store" ? 13 : 18, fontWeight: 800, color: c.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.value}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Revenue line chart */}
            <div className="rpt-card" style={{ marginBottom: 20 }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <TrendingUp size={15} style={{ color: "#2563eb" }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Daily Revenue Trend</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Last {period} days · Owner vs Cashier</div>
                    </div>
                </div>
                <div style={{ padding: "20px" }}>
                    {loading ? <Skeleton style={{ height: 220 }} /> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dailyData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                                    interval={Math.floor(period / 7)} />
                                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                                    tickFormatter={v => phpShort(v)} width={55} />
                                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => php(v)} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Total" />
                                <Line type="monotone" dataKey="owner" stroke="#7c3aed" strokeWidth={1.5} dot={false} name="Owner" strokeDasharray="4 2" />
                                <Line type="monotone" dataKey="cashier" stroke="#16a34a" strokeWidth={1.5} dot={false} name="Cashier" strokeDasharray="4 2" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Store bar chart */}
            <div className="rpt-card" style={{ marginBottom: 20 }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BarChart3 size={15} style={{ color: "#d97706" }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Store Revenue Comparison</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Last {period} days · all stores</div>
                    </div>
                </div>
                <div style={{ padding: "20px" }}>
                    {loading ? <Skeleton style={{ height: 200 }} /> : storeData.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: "40px 0" }}>No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(160, storeData.length * 36)}>
                            <BarChart data={storeData} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={v => phpShort(v)} />
                                <YAxis type="category" dataKey="store_name" tick={{ fontSize: 10, fill: "#374151" }} tickLine={false} axisLine={false} width={110} />
                                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => php(v)} />
                                <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Store table */}
            <div className="rpt-card">
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Detailed Store Breakdown</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Last {period} days</div>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#fafafa" }}>
                                {["Rank", "Store", "Revenue", "Transactions", "Avg. Order", "Active Staff"].map(h => (
                                    <th key={h} style={{ padding: "10px 16px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af", textAlign: "left", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        {[0, 1, 2, 3, 4, 5].map(j => (
                                            <td key={j} style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                                                <Skeleton style={{ height: 12, width: j === 1 ? 100 : 60 }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : storeData.map((s, i) => (
                                <tr key={s.store_name} style={{ transition: "background .12s" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                                        <div style={{
                                            width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 9, fontWeight: 800, color: "white",
                                            background: i === 0 ? "#d97706" : i === 1 ? "#6b7280" : i === 2 ? "#92400e" : "#d1d5db",
                                        }}>{i + 1}</div>
                                    </td>
                                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#111827", borderBottom: "1px solid #f3f4f6" }}>{s.store_name}</td>
                                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "#d97706", borderBottom: "1px solid #f3f4f6", fontVariantNumeric: "tabular-nums" }}>{php(s.revenue)}</td>
                                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>{s.txCount.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>{s.txCount > 0 ? php(s.revenue / s.txCount) : "—"}</td>
                                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>{s.staffCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}