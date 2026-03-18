"use client";
import { useState, useEffect, useCallback } from "react";
import {
    FileText, FileSpreadsheet, TrendingUp, DollarSign,
    ShoppingBag, Receipt, Calendar,
    RefreshCw, Package, ChefHat, Store, UtensilsCrossed,
    ArrowUpRight, BarChart3, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────

interface StaffSession {
    id: string; full_name: string; email: string; role: string; owner_id: string;
}
interface Transaction {
    id: string; created_at: string; transaction_ref: string;
    total_amount: number; item_count: number; sold_by_name: string | null;
}
interface TransactionItem {
    transaction_id: string; product_name: string; category: string;
    quantity: number; unit_price: number; subtotal: number; profit: number;
}
type DateRange = "today" | "week" | "month";

// ─── Helpers ──────────────────────────────────────────────────────

const php = (n: number) =>
    `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const phpShort = (n: number) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
};

const CAT_COLOR: Record<string, string> = { Almusal: "#f59e0b", "Sari-Sari": "#2563eb", Meryenda: "#f97316" };
const CAT_ICON: Record<string, React.ElementType> = { Almusal: ChefHat, "Sari-Sari": Store, Meryenda: UtensilsCrossed };

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

function getDateRange(range: DateRange): { from: string; to: string; label: string } {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (range === "today") return {
        from: `${today}T00:00:00+08:00`, to: `${today}T23:59:59+08:00`,
        label: now.toLocaleDateString("en-PH", { dateStyle: "long" }),
    };
    if (range === "week") {
        const s = new Date(now); s.setDate(now.getDate() - 6);
        const start = s.toISOString().split("T")[0];
        return {
            from: `${start}T00:00:00+08:00`, to: `${today}T23:59:59+08:00`,
            label: `${s.toLocaleDateString("en-PH", { dateStyle: "medium" })} – ${now.toLocaleDateString("en-PH", { dateStyle: "medium" })}`,
        };
    }
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        from: `${s.toISOString().split("T")[0]}T00:00:00+08:00`, to: `${today}T23:59:59+08:00`,
        label: now.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
    };
}

// ─── PDF Export ───────────────────────────────────────────────────

async function exportPDF(
    transactions: Transaction[], allItems: (TransactionItem & { transaction_id: string })[],
    storeName: string, ownerName: string, staffName: string, staffRole: string, dateLabel: string, rangeLabel: string,
) {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const now = new Date();
    const refNo = `RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getTime()).slice(-4)}`;

    const C = {
        black: [10, 10, 10] as [number, number, number], dark: [30, 30, 30] as [number, number, number],
        mid: [80, 80, 80] as [number, number, number], light: [150, 150, 150] as [number, number, number],
        rule: [210, 210, 210] as [number, number, number], bg: [247, 247, 247] as [number, number, number],
        white: [255, 255, 255] as [number, number, number], green: [22, 101, 52] as [number, number, number],
        red: [153, 27, 27] as [number, number, number], accent: [124, 58, 237] as [number, number, number],
    };

    const drawFrame = () => {
        doc.setDrawColor(...C.rule); doc.setLineWidth(0.25); doc.rect(8, 8, pw - 16, ph - 16);
        doc.setFillColor(...C.accent); doc.rect(8, 8, 3.5, ph - 16, "F");
    };

    drawFrame();
    doc.setFillColor(...C.bg); doc.rect(11.5, 8, pw - 19.5, 28, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...C.black); doc.text("SariSari.IMS", 17, 19);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid);
    doc.text("Inventory Management System", 17, 25); doc.text("Staff Sales Report", 17, 30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...C.black); doc.text("SALES REPORT", pw - 12, 18, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid);
    doc.text(`Ref: ${refNo}`, pw - 12, 24, { align: "right" });
    doc.text(`Generated: ${now.toLocaleString("en-PH")}`, pw - 12, 29, { align: "right" });

    const metaY = 44;
    const colW = (pw - 26) / 5;
    [["DATE RANGE", rangeLabel], ["PERIOD", dateLabel], ["STORE", storeName], ["STORE OWNER", ownerName], ["PREPARED BY", `${staffName} (${staffRole})`]].forEach(([lbl, val], i) => {
        const x = 16 + i * colW;
        doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...C.light); doc.text(lbl, x, metaY - 3.5);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.dark); doc.text(val.length > 24 ? val.slice(0, 22) + "…" : val, x, metaY + 2);
    });
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.line(16, metaY + 5.5, pw - 10, metaY + 5.5);

    const summY = metaY + 10;
    const boxW = (pw - 26) / 4 - 1;
    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalProfit = allItems.reduce((s, i) => s + Number(i.profit), 0);
    const totalItems = transactions.reduce((s, t) => s + t.item_count, 0);
    [{ label: "TOTAL SALES", value: `PHP ${totalSales.toFixed(2)}`, note: "revenue" },
    { label: "TOTAL PROFIT", value: `PHP ${totalProfit.toFixed(2)}`, note: "earned" },
    { label: "TRANSACTIONS", value: String(transactions.length), note: "orders" },
    { label: "ITEMS SOLD", value: String(totalItems), note: "units" }].forEach((item, i) => {
        const x = 16 + i * (boxW + 1.5);
        doc.setFillColor(...C.bg); doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.rect(x, summY, boxW, 15, "FD");
        doc.setFillColor(...C.accent); doc.rect(x, summY, 2, 15, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...C.light); doc.text(item.label, x + 4.5, summY + 4.5);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.dark); doc.text(item.value, x + 4.5, summY + 10);
        doc.setFont("helvetica", "normal"); doc.setFontSize(5); doc.setTextColor(...C.light); doc.text(item.note, x + 4.5, summY + 13.5);
    });

    autoTable(doc, {
        startY: summY + 20,
        head: [["#", "Ref", "Date & Time", "Product", "Category", "Qty", "Unit Price", "Subtotal", "Profit", "Staff"]],
        body: allItems.map((item, i) => {
            const txn = transactions.find(t => t.id === item.transaction_id);
            return [i + 1, txn?.transaction_ref ?? "—",
            txn ? new Date(txn.created_at).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" }) : "—",
            item.product_name, item.category, item.quantity,
            `PHP ${Number(item.unit_price).toFixed(2)}`, `PHP ${Number(item.subtotal).toFixed(2)}`,
            `PHP ${Number(item.profit).toFixed(2)}`, txn?.sold_by_name ?? staffName];
        }),
        theme: "grid",
        styles: { font: "helvetica", fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, lineColor: C.rule, lineWidth: 0.15, textColor: C.dark },
        headStyles: { fillColor: C.black, textColor: C.white, fontStyle: "bold", fontSize: 6.5 },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: { 0: { halign: "center", cellWidth: 7, textColor: C.light }, 1: { fontStyle: "bold", cellWidth: 28 }, 8: { halign: "right", fontStyle: "bold" } },
        didParseCell(data: any) {
            if (data.section !== "body" || data.column.index !== 8) return;
            const n = parseFloat(String(data.cell.raw).replace("PHP ", ""));
            data.cell.styles.textColor = n >= 0 ? [...C.green] : [...C.red];
        },
        didDrawPage() {
            drawFrame();
            const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
            doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...C.light);
            doc.text(`SariSari.IMS — ${storeName}`, 16, ph - 12);
            doc.text(`Staff: ${staffName} (${staffRole})`, pw / 2, ph - 12, { align: "center" });
            doc.text(`Ref: ${refNo}  ·  Page ${pg}  ·  ${now.toLocaleDateString("en-PH")}`, pw - 12, ph - 12, { align: "right" });
            doc.setDrawColor(...C.rule); doc.setLineWidth(0.15); doc.line(16, ph - 15, pw - 10, ph - 15);
        },
    });
    doc.save(`sari-ims-report-${rangeLabel.toLowerCase().replace(/\s+/g, "-")}-${refNo}.pdf`);
}

// ─── Excel Export ─────────────────────────────────────────────────

async function exportExcel(
    transactions: Transaction[], allItems: (TransactionItem & { transaction_id: string })[],
    storeName: string, ownerName: string, staffName: string, staffRole: string, dateLabel: string, rangeLabel: string,
) {
    const XLSXmod = await import("xlsx");
    const XLSX = XLSXmod.default ?? XLSXmod;
    const now = new Date();
    const refNo = `RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalProfit = allItems.reduce((s, i) => s + Number(i.profit), 0);

    const rows = allItems.map((item, i) => {
        const txn = transactions.find(t => t.id === item.transaction_id);
        const d = txn ? new Date(txn.created_at) : new Date();
        return [i + 1, txn?.transaction_ref ?? "—", d.toLocaleDateString("en-PH"), d.toLocaleTimeString("en-PH", { timeStyle: "short" }),
        item.product_name, item.category, item.quantity, Number(item.unit_price).toFixed(2),
        Number(item.subtotal).toFixed(2), Number(item.profit).toFixed(2), txn?.sold_by_name ?? staffName];
    });

    const aoa: any[][] = [
        ["SariSari.IMS — STAFF SALES REPORT"], [`Reference: ${refNo}`],
        [`Store: ${storeName}`, "", "", `Date Range: ${rangeLabel}`],
        [`Store Owner: ${ownerName}`, "", "", `Period: ${dateLabel}`],
        [`Prepared by: ${staffName} (${staffRole})`, "", "", `Total Sales: PHP ${totalSales.toFixed(2)}`],
        [`Exported: ${now.toLocaleString("en-PH")}`, "", "", `Total Profit: PHP ${totalProfit.toFixed(2)}`],
        ["", "", "", `Transactions: ${transactions.length}`],
        [],
        ["#", "Transaction Ref", "Date", "Time", "Product", "Category", "Qty", "Unit Price (PHP)", "Subtotal (PHP)", "Profit (PHP)", "Staff"],
        ...rows, [],
        ["SUMMARY"], ["Total Sales (PHP)", "", totalSales.toFixed(2)], ["Total Profit (PHP)", "", totalProfit.toFixed(2)],
        ["Total Transactions", "", transactions.length], ["Total Items Sold", "", allItems.reduce((s, i) => s + i.quantity, 0)],
        [], ["Store:", storeName], ["Store Owner:", ownerName],
        ["Prepared by:", staffName], ["Role:", staffRole.charAt(0).toUpperCase() + staffRole.slice(1)],
        ["Generated:", now.toLocaleString("en-PH")], ["System:", "SariSari.IMS — Inventory Management System"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 4 }, { wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 14 }, { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `sari-ims-${rangeLabel.toLowerCase().replace(/\s+/g, "-")}-${refNo}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface ReportsProps {
    ownerStoreName?: string;
    ownerFullName?: string;   // owner's real name — shown as "Store Owner" in exports
}

export default function Reports({ ownerStoreName, ownerFullName }: ReportsProps = {}) {
    // ── session from sessionStorage — has the STAFF's data (id, full_name, role, owner_id) ──
    // NEVER use session.full_name as the store name or owner name
    const [session, setSession] = useState<StaffSession | null>(null);
    const [range, setRange] = useState<DateRange>("today");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [allItems, setAllItems] = useState<(TransactionItem & { transaction_id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

    // storeName = owner's store, from prop (set from profiles row in page.tsx)
    // staffName = this staff member's name, from sessionStorage
    const storeName = ownerStoreName || "My Store";
    const ownerName = ownerFullName || "—";          // owner's real name for display

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("staff_session");
            if (raw) setSession(JSON.parse(raw));
        } catch { /* ignore */ }
    }, []);

    const fetchData = useCallback(async () => {
        if (!session?.owner_id) return;
        setLoading(true);
        try {
            const { from, to } = getDateRange(range);
            const { data: txnData, error: txnErr } = await supabase
                .rpc("get_owner_transactions", { p_owner_id: session.owner_id, p_from: from, p_to: to });
            if (txnErr) console.error("Transactions RPC error:", txnErr);
            const txns: Transaction[] = txnData ?? [];
            setTransactions(txns);
            if (txns.length > 0) {
                const { data: itemData, error: itemErr } = await supabase
                    .rpc("get_transaction_items", { p_transaction_ids: txns.map(t => t.id) });
                if (itemErr) console.error("Items RPC error:", itemErr);
                setAllItems((itemData ?? []) as (TransactionItem & { transaction_id: string })[]);
            } else {
                setAllItems([]);
            }
        } catch (err) {
            console.error("Reports fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [session?.owner_id, range]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalSales = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const totalProfit = allItems.reduce((s, i) => s + Number(i.profit), 0);
    const totalOrders = transactions.length;
    const margin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : "0.0";

    const catBreakdown = Object.entries(
        allItems.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = { sales: 0, qty: 0 };
            acc[item.category].sales += Number(item.subtotal);
            acc[item.category].qty += item.quantity;
            return acc;
        }, {} as Record<string, { sales: number; qty: number }>)
    ).map(([cat, v]) => ({ category: cat, ...v })).sort((a, b) => b.sales - a.sales);

    const dailyData = Object.entries(
        transactions.reduce((acc, t) => {
            const d = t.created_at.split("T")[0];
            if (!acc[d]) acc[d] = { date: d, label: new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" }), sales: 0, count: 0 };
            acc[d].sales += Number(t.total_amount); acc[d].count += 1;
            return acc;
        }, {} as Record<string, { date: string; label: string; sales: number; count: number }>)
    ).map(([, v]) => v).sort((a, b) => a.date.localeCompare(b.date));

    const rangeLabel = range === "today" ? "Today" : range === "week" ? "This Week" : "This Month";

    const handleExportPDF = async () => {
        if (!session || !transactions.length) return;
        setExporting("pdf");
        await exportPDF(transactions, allItems, storeName, ownerName, session.full_name, session.role, getDateRange(range).label, rangeLabel);
        setExporting(null);
    };
    const handleExportExcel = async () => {
        if (!session || !transactions.length) return;
        setExporting("excel");
        await exportExcel(transactions, allItems, storeName, ownerName, session.full_name, session.role, getDateRange(range).label, rangeLabel);
        setExporting(null);
    };

    const { label: dateLabel } = getDateRange(range);

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>Reports</h2>
                    <p className="text-[0.78rem] text-slate-400 mt-0.5">
                        Sales overview for <span className="font-bold text-slate-600">{storeName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={fetchData} disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[0.78rem] font-bold text-slate-500 hover:text-violet-600 hover:border-violet-200 transition-all disabled:opacity-50">
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button onClick={handleExportExcel} disabled={!transactions.length || !!exporting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[0.78rem] font-bold transition-all disabled:opacity-40 active:scale-95">
                        {exporting === "excel" ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel
                    </button>
                    <button onClick={handleExportPDF} disabled={!transactions.length || !!exporting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[0.78rem] font-bold transition-all disabled:opacity-40 active:scale-95">
                        {exporting === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF
                    </button>
                </div>
            </div>

            {/* Date range tabs */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
                {(["today", "week", "month"] as DateRange[]).map(r => (
                    <button key={r} onClick={() => setRange(r)}
                        className="px-5 py-2 rounded-xl text-[0.8rem] font-bold uppercase tracking-wide transition-all"
                        style={{ background: range === r ? "#7c3aed" : "transparent", color: range === r ? "white" : "#64748b" }}>
                        {r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-slate-500">
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-violet-400" />
                    <span className="font-bold">{dateLabel}</span>
                </div>
                <span className="text-slate-200">·</span>
                <span>
                    <span className="text-slate-400">Staff: </span>
                    <span className="font-bold text-slate-700">{session?.full_name ?? "—"}</span>
                    <span className="text-slate-400"> ({session?.role})</span>
                </span>
                <span className="text-slate-200">·</span>
                <span>
                    <span className="text-slate-400">Store: </span>
                    <span className="font-bold text-slate-700">{storeName}</span>
                </span>
                {ownerName !== "—" && (
                    <>
                        <span className="text-slate-200">·</span>
                        <span>
                            <span className="text-slate-400">Owner: </span>
                            <span className="font-bold text-slate-700">{ownerName}</span>
                        </span>
                    </>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Sales", val: loading ? null : php(totalSales), sub: `${totalOrders} orders`, icon: <DollarSign size={18} />, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
                    { label: "Total Profit", val: loading ? null : php(totalProfit), sub: `${margin}% margin`, icon: <TrendingUp size={18} />, color: "#059669", bg: "rgba(5,150,105,0.08)" },
                    { label: "Transactions", val: loading ? null : String(totalOrders), sub: "completed orders", icon: <Receipt size={18} />, color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
                    { label: "Avg. Order", val: loading ? null : phpShort(totalOrders > 0 ? totalSales / totalOrders : 0), sub: "per transaction", icon: <ShoppingBag size={18} />, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                            <ArrowUpRight size={12} className="text-slate-200 mt-1" />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                        {s.val === null ? <Skeleton className="h-6 w-20 mb-1" /> : <p className="text-xl font-black text-slate-900" style={{ fontFamily: "Syne,sans-serif" }}>{s.val}</p>}
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts */}
            {!loading && dailyData.length > 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={14} className="text-violet-500" />
                            <h3 className="font-black text-slate-800 text-sm" style={{ fontFamily: "Syne,sans-serif" }}>Sales Over Time</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={phpShort} />
                                <Tooltip formatter={(v: any) => [php(v), "Sales"]}
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11, boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }} />
                                <Area type="monotone" dataKey="sales" stroke="#7c3aed" strokeWidth={2.5} fill="url(#salesGrad)"
                                    dot={{ fill: "#7c3aed", r: 3, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {catBreakdown.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h3 className="font-black text-slate-800 text-sm mb-4" style={{ fontFamily: "Syne,sans-serif" }}>By Category</h3>
                            <ResponsiveContainer width="100%" height={110}>
                                <BarChart data={catBreakdown} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={phpShort} />
                                    <Tooltip formatter={(v: any) => [php(v), "Sales"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }} />
                                    <Bar dataKey="sales" radius={[5, 5, 0, 0]}>
                                        {catBreakdown.map((e, i) => <Cell key={i} fill={CAT_COLOR[e.category] ?? "#94a3b8"} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                                {catBreakdown.map(cat => {
                                    const Icon = CAT_ICON[cat.category] ?? Package;
                                    const pct = totalSales > 0 ? ((cat.sales / totalSales) * 100).toFixed(0) : "0";
                                    return (
                                        <div key={cat.category} className="flex items-center gap-2">
                                            <Icon size={11} style={{ color: CAT_COLOR[cat.category] ?? "#94a3b8", flexShrink: 0 }} />
                                            <span className="text-[10px] font-bold text-slate-600 flex-1">{cat.category}</span>
                                            <span className="text-[10px] font-black text-slate-800">{phpShort(cat.sales)}</span>
                                            <span className="text-[9px] text-slate-400">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Transactions table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-sm" style={{ fontFamily: "Syne,sans-serif" }}>Transaction Log</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {transactions.length} record{transactions.length !== 1 ? "s" : ""}
                    </span>
                </div>
                {loading ? (
                    <div className="p-5 space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <Skeleton className="w-10 h-10 shrink-0" />
                                <div className="flex-1 space-y-2"><Skeleton className="h-2.5 w-1/2" /><Skeleton className="h-2 w-1/3" /></div>
                                <Skeleton className="h-4 w-16 shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <Receipt size={20} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No transactions for this period.</p>
                        <p className="text-xs text-slate-300">Try selecting a different date range.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                            <div className="w-8" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">Items</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-28 text-right">Seller</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {transactions.map((txn, i) => {
                                const d = new Date(txn.created_at);
                                return (
                                    <div key={txn.id} className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-start px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] font-black text-violet-500">#{i + 1}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate">{txn.transaction_ref}</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                {d.toLocaleDateString("en-PH", { dateStyle: "medium" })} · {d.toLocaleTimeString("en-PH", { timeStyle: "short" })}
                                            </p>
                                        </div>
                                        <div className="text-center w-12 shrink-0">
                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-lg text-xs font-black text-slate-600">{txn.item_count}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-slate-900">{php(txn.total_amount)}</p>
                                        </div>
                                        <div className="hidden sm:block text-right shrink-0 w-28">
                                            {txn.sold_by_name ? (
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{txn.sold_by_name}</p>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-cyan-600 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded-full">Cashier</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <p className="text-[10px] font-bold text-slate-500">{ownerName !== "—" ? ownerName : "Owner"}</p>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">Owner</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="px-5 py-3.5 bg-violet-50/60 border-t border-violet-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Period Total</span>
                            <span className="text-sm font-black text-violet-700">{php(totalSales)}</span>
                        </div>
                    </>
                )}
            </div>

            {transactions.length > 0 && (
                <p className="text-center text-[10px] text-slate-300 font-medium">
                    Reports include store name, staff name, role, and date — formatted for formal submission.
                </p>
            )}
        </div>
    );
}