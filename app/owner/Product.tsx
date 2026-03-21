"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Package, Search, Image as ImageIcon,
    Loader2, Pencil, Trash2, X, Upload, Eye, FileSpreadsheet,
    FileText, ChevronLeft, ChevronRight, ShoppingCart,
    TrendingUp, DollarSign, BarChart2,
    Store, UtensilsCrossed, ChefHat, CircleAlert, Info,
    CheckCircle2, Layers, BookOpen, ChevronDown, RotateCcw, Tag,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { supabase } from "@/app/utils/supabase";

// Types

type MainCategory = "Almusal" | "Sari-Sari" | "Meryenda";
type ModalMode = "create" | "edit" | "view" | "delete" | null;
type Tab = "All" | MainCategory;

const TABS: Tab[] = ["All", "Almusal", "Sari-Sari", "Meryenda"];
const PAGE_SIZE = 10;

const SARI_SARI_SUBCATEGORIES = [
    "Canned Goods", "Instant Noodles", "Rice & Grains", "Snacks", "Biscuits",
    "Bread", "Condiments", "Spreads", "Cooking Essentials", "Soft Drinks",
    "Bottled Water", "Juice Drinks", "Coffee", "Milk & Dairy", "Energy Drinks",
    "Powdered Drinks", "Candies", "Chocolates", "Ice Cream", "Laundry Detergent",
    "Dishwashing Liquid", "Bath Soap", "Shampoo", "Toothpaste", "Tissue & Wipes",
    "Cleaning Supplies", "Vitamins", "Basic Medicines", "Feminine Care",
    "Baby Products", "Cigarettes", "School Supplies", "Kitchenware", "Frozen Goods",
] as const;
type SariSariSub = typeof SARI_SARI_SUBCATEGORIES[number];

interface Product {
    id: string;
    name: string;
    image_url: string;
    price: number;
    market_price: number;
    stock_quantity: number;
    category: MainCategory;
    subcategory?: SariSariSub | null;
    source: "products" | "prepared_meals";
}

const CATEGORY_STYLE: Record<MainCategory, string> = {
    Almusal: "bg-amber-100 text-amber-700",
    "Sari-Sari": "bg-blue-100 text-blue-700",
    Meryenda: "bg-orange-100 text-orange-700",
};

const CATEGORY_BG: Record<MainCategory, string> = {
    Almusal: "bg-amber-500",
    "Sari-Sari": "bg-blue-600",
    Meryenda: "bg-orange-500",
};

const CATEGORY_SWATCH: Record<Tab, string> = {
    All: "#e2e8f0",
    Almusal: "#fde68a",
    "Sari-Sari": "#bfdbfe",
    Meryenda: "#fed7aa",
};

// Calc helpers

const calcProfit = (p: Product): number => {
    if (p.source === "prepared_meals") {
        if (!p.stock_quantity) return 0;
        return p.price - p.market_price / p.stock_quantity;
    }
    return p.price - p.market_price;
};

const calcPotentialEarn = (p: Product): number => calcProfit(p) * p.stock_quantity;

const calcTotalCost = (p: Product): number =>
    p.source === "prepared_meals" ? p.market_price : p.market_price * p.stock_quantity;

// Currency helpers

const phpCompact = (n: number): string => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
    return `${sign}${abs.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const phpFull = (n: number): string =>
    `PHP ${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// PhpDisplay — tiny PHP label + compact number on mobile, full on sm+

function PhpDisplay({ amount, className = "" }: { amount: number; className?: string }) {
    return (
        <>
            <span className={`sm:hidden ${className}`}>
                <span className="text-[0.6em] font-bold opacity-50 mr-0.5">PHP</span>
                {phpCompact(amount)}
            </span>
            <span className={`hidden sm:inline ${className}`}>
                {phpFull(amount)}
            </span>
        </>
    );
}

// DropdownSelect — same style as FeedbackView

interface DropdownOption {
    value: string;
    label: string;
    dot?: string;
    swatch?: string;
}

function DropdownSelect({
    label, value, options, onSelect, icon,
}: {
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
                        {current?.value === "All" || current?.value === "all"
                            ? `All ${label}s`
                            : (current?.label ?? "All")}
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
                        transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
                        style={{ minWidth: "200px" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                            {options.map(o => (
                                <button key={o.value} type="button"
                                    onClick={() => { onSelect(o.value); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                    {o.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />}
                                    {o.swatch && <span className="w-3 h-3 rounded shrink-0 border border-slate-200" style={{ background: o.swatch }} />}
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

// SubcategoryDropdown — scrollable list

function SubcategoryDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

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
                    minWidth: "160px",
                }}>
                <Tag size={13} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Subcategory</p>
                    <p className="text-[0.8rem] font-black text-slate-800 leading-tight truncate">
                        {value === "All" ? "All Subcategories" : value}
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
                        transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
                        style={{ minWidth: "210px", maxHeight: "260px", overflowY: "auto" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-white">Subcategory</p>
                            {["All", ...SARI_SARI_SUBCATEGORIES].map(sub => (
                                <button key={sub} type="button"
                                    onClick={() => { onSelect(sub); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left">
                                    <span className={`text-[0.82rem] flex-1 ${value === sub ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                        {sub === "All" ? "All Subcategories" : sub}
                                    </span>
                                    {value === sub && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// PDF export

async function exportPDF(products: Product[], tabLabel: string) {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-PH", { dateStyle: "long" });
    const refNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const C = {
        black: [10, 10, 10] as [number, number, number], dark: [30, 30, 30] as [number, number, number],
        mid: [80, 80, 80] as [number, number, number], light: [150, 150, 150] as [number, number, number],
        rule: [210, 210, 210] as [number, number, number], bg: [247, 247, 247] as [number, number, number],
        white: [255, 255, 255] as [number, number, number], positive: [22, 101, 52] as [number, number, number],
        negative: [153, 27, 27] as [number, number, number],
    };
    const drawPageFrame = () => {
        doc.setDrawColor(...C.rule); doc.setLineWidth(0.25); doc.rect(8, 8, pw - 16, ph - 16);
        doc.setFillColor(...C.black); doc.rect(8, 8, 3.5, ph - 16, "F");
    };
    drawPageFrame();
    doc.setFillColor(...C.bg); doc.rect(11.5, 8, pw - 19.5, 26, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...C.black); doc.text("SARI-STORE", 17, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid); doc.text("Inventory Management System", 17, 26.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...C.black); doc.text("INVENTORY REPORT", pw - 12, 20, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid); doc.text(`Reference No: ${refNumber}`, pw - 12, 26.5, { align: "right" });
    const metaY = 42;
    const colW = (pw - 26) / 4;
    [["DATE EXPORTED", dateStr], ["CATEGORY", tabLabel], ["TOTAL ITEMS", String(products.length)], ["PREPARED BY", "Store Owner"]].forEach(([label, value], i) => {
        const x = 16 + i * colW;
        doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...C.light); doc.text(label, x, metaY - 3.5);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.dark); doc.text(value, x, metaY + 2);
    });
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.line(16, metaY + 5.5, pw - 10, metaY + 5.5);
    const summY = metaY + 10;
    const totalCost = products.reduce((s, p) => s + calcTotalCost(p), 0);
    const totalEarn = products.reduce((s, p) => s + calcPotentialEarn(p), 0);
    const lowStock = products.filter(p => p.stock_quantity < 10).length;
    const boxW = (pw - 26) / 4 - 1;
    [{ label: "TOTAL PRODUCTS", value: String(products.length), note: "items tracked" }, { label: "TOTAL CAPITAL", value: `PHP ${totalCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, note: "amount invested" }, { label: "POTENTIAL EARNINGS", value: `PHP ${totalEarn.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, note: "if all items sold" }, { label: "LOW STOCK ITEMS", value: String(lowStock), note: "items below qty 10", warn: lowStock > 0 }].forEach((item, i) => {
        const x = 16 + i * (boxW + 1.5);
        doc.setFillColor(...C.bg); doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.rect(x, summY, boxW, 15, "FD");
        doc.setFillColor(...((item as any).warn ? C.negative : C.black)); doc.rect(x, summY, 2, 15, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...C.light); doc.text(item.label, x + 4.5, summY + 4.5);
        doc.setFont("helvetica", "bold"); doc.setFontSize(item.value.length > 12 ? 7.5 : 9.5); doc.setTextColor(...((item as any).warn ? C.negative : C.dark)); doc.text(item.value, x + 4.5, summY + 10);
        doc.setFont("helvetica", "normal"); doc.setFontSize(5); doc.setTextColor(...C.light); doc.text(item.note, x + 4.5, summY + 13.5);
    });
    const isSariSari = products.some(p => p.source === "products");
    const isMixed = products.some(p => p.source === "products") && products.some(p => p.source === "prepared_meals");
    const head = ["#", "Product Name", ...(isSariSari ? ["Subcategory"] : []), ...(isMixed ? ["Category"] : []), "Market Price", "Selling Price", isSariSari ? "Qty" : "Servings", "Total Cost", "Profit / Unit", "Pot. Earnings", "Status"];
    const statusCol = head.length - 1; const earnCol = head.length - 2; const profitCol = head.length - 3;
    autoTable(doc, {
        startY: summY + 19,
        head: [head],
        body: products.map((p, i) => [i + 1, p.name, ...(isSariSari ? [p.subcategory || "—"] : []), ...(isMixed ? [p.category] : []), `PHP ${Number(p.market_price).toFixed(2)}`, `PHP ${Number(p.price).toFixed(2)}`, p.stock_quantity, `PHP ${calcTotalCost(p).toFixed(2)}`, `PHP ${calcProfit(p).toFixed(2)}`, `PHP ${calcPotentialEarn(p).toFixed(2)}`, p.stock_quantity < 10 ? "LOW STOCK" : "OK"]),
        theme: "grid",
        styles: { font: "helvetica", fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 3.5, right: 3.5 }, lineColor: C.rule, lineWidth: 0.15, textColor: C.dark },
        headStyles: { fillColor: C.black, textColor: C.white, fontStyle: "bold", fontSize: 7, cellPadding: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 } },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: { 0: { halign: "center", cellWidth: 7, textColor: C.light }, 1: { fontStyle: "bold", cellWidth: isSariSari ? 42 : 52 }, [statusCol]: { halign: "center", cellWidth: 17, fontStyle: "bold" } },
        didParseCell(data: any) {
            if (data.section !== "body") return;
            if (data.column.index === statusCol) { const v = String(data.cell.raw); data.cell.styles.textColor = v === "LOW STOCK" ? [...C.negative] : [...C.positive]; data.cell.styles.fontStyle = "bold"; }
            if (data.column.index === earnCol || data.column.index === profitCol) { const n = parseFloat(String(data.cell.raw).replace("PHP ", "").replace(/,/g, "")); data.cell.styles.textColor = n >= 0 ? [...C.positive] : [...C.negative]; data.cell.styles.fontStyle = "bold"; data.cell.styles.halign = "right"; }
        },
        didDrawPage() { drawPageFrame(); const pg = (doc as any).internal.getCurrentPageInfo().pageNumber; doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...C.light); doc.text("Sari-Store Inventory Management System", 16, ph - 12); doc.text(`Ref: ${refNumber}`, pw / 2, ph - 12, { align: "center" }); doc.text(`Page ${pg}  ·  ${dateStr}`, pw - 12, ph - 12, { align: "right" }); doc.setDrawColor(...C.rule); doc.setLineWidth(0.15); doc.line(16, ph - 15, pw - 10, ph - 15); },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY < ph - 30) {
        doc.setDrawColor(...C.rule); doc.setLineWidth(0.3); doc.line(16, finalY + 10, 70, finalY + 10); doc.line(pw / 2 + 5, finalY + 10, pw / 2 + 60, finalY + 10);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid);
        doc.text("Prepared by:", 16, finalY + 5); doc.text("Store Owner / Manager", 16, finalY + 14.5);
        doc.text("Noted by:", pw / 2 + 5, finalY + 5); doc.text("Date Reviewed", pw / 2 + 5, finalY + 14.5);
    }
    doc.save(`inventory-${tabLabel.toLowerCase().replace(/[\s/]+/g, "-")}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`);
}

// Excel export

async function exportExcel(products: Product[], tabLabel: string) {
    const XLSXmod = await import("xlsx");
    const XLSX = XLSXmod.default ?? XLSXmod;
    const now = new Date();
    const refNum = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const isSariSari = products.some(p => p.source === "products");
    const isMixed = products.some(p => p.source === "products") && products.some(p => p.source === "prepared_meals");
    const headers = ["#", "Product Name", ...(isSariSari ? ["Subcategory"] : []), ...(isMixed ? ["Category"] : []), "Market Price (PHP)", "Selling Price (PHP)", isSariSari ? "Stock Qty" : "Servings", "Total Cost (PHP)", "Profit per Unit (PHP)", "Potential Earnings (PHP)", "Status"];
    const rows = products.map((p, i) => [i + 1, p.name, ...(isSariSari ? [p.subcategory || "—"] : []), ...(isMixed ? [p.category] : []), Number(p.market_price).toFixed(2), Number(p.price).toFixed(2), p.stock_quantity, calcTotalCost(p).toFixed(2), calcProfit(p).toFixed(2), calcPotentialEarn(p).toFixed(2), p.stock_quantity < 10 ? "Low Stock" : "OK"]);
    const totalCost = products.reduce((s, p) => s + calcTotalCost(p), 0);
    const totalEarn = products.reduce((s, p) => s + calcPotentialEarn(p), 0);
    const aoa: any[][] = [[`SARI-STORE INVENTORY REPORT`], [`Reference No: ${refNum}`], [`Category: ${tabLabel}`, "", "", `Date: ${now.toLocaleDateString("en-PH", { dateStyle: "long" })}`], [`Total Items: ${products.length}`], [], headers, ...rows, [], ["SUMMARY"], ["Total Products", "", products.length], ["Total Capital (PHP)", "", totalCost.toFixed(2)], ["Potential Earnings (PHP)", "", totalEarn.toFixed(2)], ["Low Stock Items", "", products.filter(p => p.stock_quantity < 10).length], [], [], ["Prepared by:", "", "", "Noted by:"], ["___________________________", "", "", "___________________________"], ["Store Owner / Manager", "", "", "Date Reviewed"]];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 4 }, { wch: 30 }, ...(isSariSari ? [{ wch: 22 }] : []), ...(isMixed ? [{ wch: 14 }] : []), { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 24 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Report");
    XLSX.writeFile(wb, `inventory-${tabLabel.toLowerCase().replace(/[\s/]+/g, "-")}-${refNum}.xlsx`);
}

// Modal shell — bottom-sheet on mobile, centered on sm+

function Modal({ open, onClose, children, wide }: {
    open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={`bg-white w-full sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
                style={{ maxHeight: "92dvh" }}>
                <div className="flex justify-center pt-3 sm:hidden shrink-0">
                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                </div>
                {children}
            </motion.div>
        </div>
    );
}

// Image uploader

function ImageUploader({ preview, onFile }: { preview: string; onFile: (f: File) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col items-center mb-4">
            <div onClick={() => ref.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-all overflow-hidden group relative">
                {preview ? (
                    <>
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload size={16} className="text-white" />
                        </div>
                    </>
                ) : (
                    <>
                        <Upload size={18} className="text-slate-300 mb-1" />
                        <span className="text-[9px] text-slate-400 font-bold tracking-wider">UPLOAD</span>
                    </>
                )}
            </div>
            <input ref={ref} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            <p className="text-[10px] text-slate-400 mt-1">Click to upload photo</p>
        </div>
    );
}

async function uploadImage(file: File, cat: MainCategory, userId: string): Promise<string> {
    const ext = file.name.split(".").pop();
    const folder = cat === "Sari-Sari" ? "sari-sari" : cat === "Almusal" ? "almusal" : "meryenda";
    const path = `${userId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

// Field error

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="text-[11px] text-red-500 font-bold mt-1 pl-1 flex items-center gap-1.5">
            <CircleAlert size={11} className="shrink-0" />
            {message}
        </p>
    );
}

function inputCls(error?: string) {
    return `w-full px-4 py-3 border rounded-xl text-sm outline-none font-medium transition-all ${error
        ? "bg-red-50 border-red-400 ring-2 ring-red-200"
        : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
        }`;
}

function ModalFooter({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-5 sm:px-6 py-4 flex gap-3 border-t border-slate-100 bg-white rounded-b-2xl shrink-0"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}>
            {children}
        </div>
    );
}

// Sari-Sari form modal

interface SariSariForm {
    name: string; price: string; market_price: string; stock_quantity: string;
    subcategory: SariSariSub | "";
    image_file: File | null; image_preview: string;
}
type SariSariErrors = Partial<Record<keyof SariSariForm, string>>;

function SariSariFormModal({ mode, product, onClose, onSuccess, allProducts }: {
    mode: "create" | "edit"; product?: Product;
    onClose: () => void; onSuccess: () => void; allProducts: Product[];
}) {
    const [form, setForm] = useState<SariSariForm>(() => product ? {
        name: product.name, price: String(product.price),
        market_price: String(product.market_price),
        stock_quantity: String(product.stock_quantity),
        subcategory: (product.subcategory as SariSariSub) || "",
        image_file: null, image_preview: product.image_url || "",
    } : { name: "", price: "", market_price: "", stock_quantity: "", subcategory: "", image_file: null, image_preview: "" });
    const [errors, setErrors] = useState<SariSariErrors>({});
    const [saving, setSaving] = useState(false);

    const set = (k: keyof SariSariForm, v: any) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => ({ ...e, [k]: undefined }));
    };

    const mp = parseFloat(form.market_price || "0");
    const sp = parseFloat(form.price || "0");
    const qty = parseInt(form.stock_quantity || "0");
    const profitPerItem = sp - mp;
    const potentialEarn = profitPerItem * qty;
    const totalCapital = mp * qty;

    const validate = (): SariSariErrors => {
        const errs: SariSariErrors = {};
        if (!form.name.trim()) errs.name = "Product name is required.";
        if (!form.subcategory) errs.subcategory = "Please select a subcategory.";
        if (!form.price || isNaN(Number(form.price))) errs.price = "Enter a valid selling price.";
        if (!form.market_price || isNaN(Number(form.market_price))) errs.market_price = "Enter a valid market price.";
        if (!form.stock_quantity || isNaN(Number(form.stock_quantity))) errs.stock_quantity = "Enter valid stock quantity.";
        const isDupe = allProducts.some(p =>
            p.source === "products" &&
            p.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
            (mode === "edit" ? p.id !== product!.id : true)
        );
        if (isDupe) errs.name = `"${form.name}" already exists in Sari-Sari.`;
        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            let image_url = product?.image_url || "";
            if (form.image_file) image_url = await uploadImage(form.image_file, "Sari-Sari", user.id);
            const payload = { name: form.name.trim(), price: parseFloat(form.price), market_price: parseFloat(form.market_price), stock_quantity: parseInt(form.stock_quantity), category: "Sari-Sari" as MainCategory, subcategory: form.subcategory || null, image_url };
            if (mode === "create") {
                const { error } = await supabase.from("products").insert({ ...payload, user_id: user.id });
                if (error) throw error;
                toast.success("Item added to Sari-Sari store!");
            } else {
                const { error } = await supabase.from("products").update(payload).eq("id", product!.id);
                if (error) throw error;
                toast.success("Sari-Sari item updated!");
            }
            onSuccess(); onClose();
        } catch (err: any) { toast.error(err.message || "Something went wrong."); }
        finally { setSaving(false); }
    };

    return (
        <Modal open onClose={onClose} wide>
            <div className="flex flex-col overflow-hidden">
                <div className="bg-blue-600 rounded-t-3xl sm:rounded-t-2xl p-5 sm:p-6 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <Store size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-black">{mode === "create" ? "Add Sari-Sari Item" : "Edit Sari-Sari Item"}</h2>
                                <p className="text-blue-100 text-xs font-medium flex items-center gap-1.5"><Layers size={10} /> Sari-Sari Store · per-item pricing</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={18} className="text-white" /></button>
                    </div>
                    {(form.price || form.market_price) && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {[
                                { label: "Capital / item", value: phpFull(mp) },
                                { label: "Profit / item", value: phpFull(profitPerItem), warn: profitPerItem < 0 },
                                { label: "Pot. Earnings", value: phpFull(potentialEarn), warn: potentialEarn < 0 },
                            ].map(r => (
                                <div key={r.label} className="bg-white/10 rounded-xl px-3 py-2">
                                    <p className="text-[9px] text-blue-200 uppercase tracking-widest font-bold">{r.label}</p>
                                    <p className={`text-sm font-black ${r.warn ? "text-red-300" : "text-white"}`}>{r.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
                    <ImageUploader preview={form.image_preview} onFile={(f) => { set("image_file", f); set("image_preview", URL.createObjectURL(f)); }} />
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Subcategory <span className="text-red-400">*</span></label>
                        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1 rounded-xl p-2 ${errors.subcategory ? "bg-red-50 border-2 border-red-300" : "bg-slate-50 border border-slate-200"}`}>
                            {SARI_SARI_SUBCATEGORIES.map((sub) => (
                                <button key={sub} type="button" onClick={() => set("subcategory", sub)}
                                    className={`px-2 py-2 rounded-lg text-[10px] font-bold text-left transition-all border ${form.subcategory === sub ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:bg-blue-50"}`}>
                                    {sub}
                                </button>
                            ))}
                        </div>
                        {form.subcategory
                            ? <p className="text-xs text-blue-600 font-bold mt-1.5 flex items-center gap-1"><CheckCircle2 size={12} /> {form.subcategory}</p>
                            : <FieldError message={errors.subcategory} />}
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Product Name <span className="text-red-400">*</span></label>
                        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Mega Sardines, Lucky Me Pancit Canton…" className={inputCls(errors.name)} />
                        <FieldError message={errors.name} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Market Price (PHP) <span className="text-red-400">*</span></label>
                            <input type="number" min="0" step="0.01" value={form.market_price} onChange={(e) => set("market_price", e.target.value)} placeholder="0.00" className={inputCls(errors.market_price)} />
                            <FieldError message={errors.market_price} />
                            <p className="text-[9px] text-slate-400 mt-1 pl-1">Cost per piece</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Selling Price (PHP) <span className="text-red-400">*</span></label>
                            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" className={inputCls(errors.price)} />
                            <FieldError message={errors.price} />
                            <p className="text-[9px] text-slate-400 mt-1 pl-1">Retail per piece</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Stock Quantity (pieces) <span className="text-red-400">*</span></label>
                        <input type="number" min="0" value={form.stock_quantity} onChange={(e) => set("stock_quantity", e.target.value)} placeholder="0" className={inputCls(errors.stock_quantity)} />
                        <FieldError message={errors.stock_quantity} />
                    </div>
                    {qty > 0 && (form.price || form.market_price) && (
                        <div className={`rounded-xl border p-4 ${profitPerItem >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><BarChart2 size={11} className="text-slate-400" /> Breakdown</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[{ label: "Market Price / item", value: phpFull(mp) }, { label: "Selling Price / item", value: phpFull(sp) }, { label: "Profit / item", value: phpFull(profitPerItem), warn: profitPerItem < 0 }, { label: "Total Capital", value: phpFull(totalCapital) }, { label: "Potential Earnings", value: phpFull(potentialEarn), span: true, warn: potentialEarn < 0 }].map(r => (
                                    <div key={r.label} className={`bg-white rounded-xl p-3 border border-slate-100 ${(r as any).span ? "col-span-2" : ""}`}>
                                        <p className="text-[9px] text-slate-400 font-medium">{r.label}</p>
                                        <p className={`text-sm font-black ${r.warn ? "text-red-600" : "text-slate-800"}`}>{r.value}</p>
                                    </div>
                                ))}
                            </div>
                            {profitPerItem < 0 && <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1"><CircleAlert size={11} /> Selling price is below market price — loss!</p>}
                        </div>
                    )}
                    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-700 font-medium leading-relaxed"><strong>Example:</strong> Bought at PHP 17 each → Sell at PHP 30 → <strong>PHP 13 profit/item</strong>.</p>
                    </div>
                </div>

                <ModalFooter>
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={15} className="animate-spin" />}
                        {saving ? "Saving…" : mode === "create" ? "Add to Store" : "Save Changes"}
                    </button>
                </ModalFooter>
            </div>
        </Modal>
    );
}

// Meal form modal

interface MealForm {
    name: string; price: string; market_price: string; stock_quantity: string;
    category: "Almusal" | "Meryenda";
    image_file: File | null; image_preview: string;
}
type MealErrors = Partial<Record<keyof MealForm, string>>;

function MealFormModal({ mode, product, defaultCategory, onClose, onSuccess, allProducts }: {
    mode: "create" | "edit"; product?: Product;
    defaultCategory: "Almusal" | "Meryenda";
    onClose: () => void; onSuccess: () => void; allProducts: Product[];
}) {
    const [form, setForm] = useState<MealForm>(() => product ? {
        name: product.name, price: String(product.price), market_price: String(product.market_price),
        stock_quantity: String(product.stock_quantity),
        category: (product.category as "Almusal" | "Meryenda") || defaultCategory,
        image_file: null, image_preview: product.image_url || "",
    } : { name: "", price: "", market_price: "", stock_quantity: "", category: defaultCategory, image_file: null, image_preview: "" });
    const [errors, setErrors] = useState<MealErrors>({});
    const [saving, setSaving] = useState(false);

    const set = (k: keyof MealForm, v: any) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => ({ ...e, [k]: undefined }));
    };

    const batchCost = parseFloat(form.market_price || "0");
    const sellPerSrv = parseFloat(form.price || "0");
    const servings = parseInt(form.stock_quantity || "0");
    const costPerSrv = servings > 0 ? batchCost / servings : 0;
    const profitPerSrv = sellPerSrv - costPerSrv;
    const potentialEarn = profitPerSrv * servings;

    const isAlmusal = form.category === "Almusal";
    const headerBg = isAlmusal ? "bg-amber-500" : "bg-orange-500";
    const accentBtn = isAlmusal ? "bg-amber-500 hover:bg-amber-600" : "bg-orange-500 hover:bg-orange-600";
    const breakdownBg = isAlmusal ? "bg-amber-50 border-amber-200" : "bg-orange-50 border-orange-200";
    const stepDot = isAlmusal ? "bg-amber-500" : "bg-orange-500";
    const boldColor = isAlmusal ? "text-amber-700" : "text-orange-700";

    const validate = (): MealErrors => {
        const errs: MealErrors = {};
        if (!form.name.trim()) errs.name = "Meal name is required.";
        if (!form.price || isNaN(Number(form.price))) errs.price = "Enter a valid selling price per serving.";
        if (!form.market_price || isNaN(Number(form.market_price))) errs.market_price = "Enter total batch cost.";
        if (!form.stock_quantity || isNaN(Number(form.stock_quantity)) || parseInt(form.stock_quantity) < 1) errs.stock_quantity = "Enter number of servings (minimum 1).";
        const isDupe = allProducts.some(p => p.source === "prepared_meals" && p.category === form.category && p.name.trim().toLowerCase() === form.name.trim().toLowerCase() && (mode === "edit" ? p.id !== product!.id : true));
        if (isDupe) errs.name = `"${form.name}" already exists in ${form.category}.`;
        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            let image_url = product?.image_url || "";
            if (form.image_file) image_url = await uploadImage(form.image_file, form.category, user.id);
            const payload = { name: form.name.trim(), price: parseFloat(form.price), market_price: parseFloat(form.market_price), stock_quantity: parseInt(form.stock_quantity), category: form.category, image_url };
            if (mode === "create") {
                const { error } = await supabase.from("prepared_meals").insert({ ...payload, user_id: user.id });
                if (error) throw error;
                toast.success(`${form.category} meal added!`);
            } else {
                const { error } = await supabase.from("prepared_meals").update(payload).eq("id", product!.id);
                if (error) throw error;
                toast.success("Meal updated!");
            }
            onSuccess(); onClose();
        } catch (err: any) { toast.error(err.message || "Something went wrong."); }
        finally { setSaving(false); }
    };

    return (
        <Modal open onClose={onClose}>
            <div className="flex flex-col overflow-hidden">
                <div className={`${headerBg} rounded-t-3xl sm:rounded-t-2xl p-5 sm:p-6 text-white shrink-0`}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                {isAlmusal ? <ChefHat size={20} className="text-white" /> : <UtensilsCrossed size={20} className="text-white" />}
                            </div>
                            <div>
                                <h2 className="text-base font-black">{mode === "create" ? `Add ${form.category} Meal` : `Edit ${form.category} Meal`}</h2>
                                <p className="text-white/80 text-xs font-medium flex items-center gap-1.5"><BookOpen size={10} /> {isAlmusal ? "Breakfast · batch costing" : "Snack / meryenda · batch costing"}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={18} className="text-white" /></button>
                    </div>
                    {mode === "create" && (
                        <div className="flex gap-2 mt-4">
                            {(["Almusal", "Meryenda"] as const).map(cat => (
                                <button key={cat} type="button" onClick={() => set("category", cat)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.category === cat ? "bg-white text-slate-800 shadow-md" : "bg-white/20 text-white hover:bg-white/30"}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                    {servings > 0 && (form.price || form.market_price) && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            {[{ label: "Cost / serving", value: phpFull(costPerSrv) }, { label: "Profit / serving", value: phpFull(profitPerSrv), warn: profitPerSrv < 0 }, { label: "Total Earnings", value: phpFull(potentialEarn), warn: potentialEarn < 0 }].map(r => (
                                <div key={r.label} className="bg-white/15 rounded-xl px-3 py-2">
                                    <p className="text-[9px] text-white/70 uppercase tracking-widest font-bold">{r.label}</p>
                                    <p className={`text-sm font-black ${r.warn ? "text-red-200" : "text-white"}`}>{r.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
                    <ImageUploader preview={form.image_preview} onFile={(f) => { set("image_file", f); set("image_preview", URL.createObjectURL(f)); }} />
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Meal Name <span className="text-red-400">*</span></label>
                        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={isAlmusal ? "e.g. Sopas, Champorado…" : "e.g. Kwekwek, Fishball, Biko…"} className={inputCls(errors.name)} />
                        <FieldError message={errors.name} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Total Batch Cost / Gastos (PHP) <span className="text-red-400">*</span></label>
                        <input type="number" min="0" step="0.01" value={form.market_price} onChange={(e) => set("market_price", e.target.value)} placeholder="0.00" className={inputCls(errors.market_price)} />
                        <FieldError message={errors.market_price} />
                        <p className="text-[9px] text-slate-400 mt-1 pl-1">Total cost for all servings</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">No. of Servings <span className="text-red-400">*</span></label>
                            <input type="number" min="1" value={form.stock_quantity} onChange={(e) => set("stock_quantity", e.target.value)} placeholder="0" className={inputCls(errors.stock_quantity)} />
                            <FieldError message={errors.stock_quantity} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Selling Price / Serving <span className="text-red-400">*</span></label>
                            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" className={inputCls(errors.price)} />
                            <FieldError message={errors.price} />
                        </div>
                    </div>
                    {servings > 0 && (form.price || form.market_price) && (
                        <div className={`rounded-xl border p-4 ${breakdownBg}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><BarChart2 size={11} className="text-slate-400" /> Step-by-Step</p>
                            <div className="space-y-2">
                                {[{ step: "1", label: "Total batch cost", value: phpFull(batchCost), note: "entered by you" }, { step: "2", label: "Cost per serving", value: `${phpFull(batchCost)} ÷ ${servings} = ${phpFull(costPerSrv)}`, note: "auto-calculated" }, { step: "3", label: "Selling price / serving", value: phpFull(sellPerSrv), note: "entered by you" }, { step: "4", label: "Profit per serving", value: `${phpFull(sellPerSrv)} − ${phpFull(costPerSrv)} = ${phpFull(profitPerSrv)}`, note: profitPerSrv >= 0 ? "profit" : "loss", warn: profitPerSrv < 0 }, { step: "5", label: "Potential earnings", value: `${phpFull(profitPerSrv)} × ${servings} = ${phpFull(potentialEarn)}`, note: "if all sold", bold: true }].map(r => (
                                    <div key={r.step} className="flex items-start gap-3">
                                        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${stepDot} text-white`}>{r.step}</span>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-slate-400 font-medium">{r.label} <span className="text-slate-300">({r.note})</span></p>
                                            <p className={`text-xs font-bold ${(r as any).warn ? "text-red-600" : (r as any).bold ? boldColor : "text-slate-700"}`}>{r.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className={`flex gap-2 p-3 rounded-xl border ${breakdownBg}`}>
                        <Info size={13} className={`shrink-0 mt-0.5 ${isAlmusal ? "text-amber-500" : "text-orange-500"}`} />
                        <p className={`text-[11px] font-medium leading-relaxed ${isAlmusal ? "text-amber-700" : "text-orange-700"}`}>
                            {isAlmusal ? <><strong>Example:</strong> Tapsilog — PHP 150 batch, 5 servings, sell PHP 45 → <strong>PHP 15 profit/serving</strong>.</> : <><strong>Example:</strong> Kwekwek — PHP 80 batch, 20 pcs, sell PHP 8 each → <strong>PHP 4 profit/pc</strong>.</>}
                        </p>
                    </div>
                </div>

                <ModalFooter>
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className={`flex-1 py-3 rounded-xl ${accentBtn} text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2`}>
                        {saving && <Loader2 size={15} className="animate-spin" />}
                        {saving ? "Saving…" : mode === "create" ? `Add ${form.category}` : "Save Changes"}
                    </button>
                </ModalFooter>
            </div>
        </Modal>
    );
}

// Stat card — accepts valueNum for PHP amounts, renders PhpDisplay

function StatCard({ icon: Icon, label, value, valueNum, sub, palette }: {
    icon: any; label: string; value?: string; valueNum?: number; sub?: string;
    palette: { icon: string; border: string };
}) {
    return (
        <div className={`rounded-2xl p-4 sm:p-5 border bg-white shadow-sm flex items-center gap-3 sm:gap-4 ${palette.border}`}>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${palette.icon}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                {valueNum !== undefined ? (
                    <p className="text-sm sm:text-base font-black text-slate-800 leading-tight">
                        <PhpDisplay amount={valueNum} />
                    </p>
                ) : (
                    <p className="text-sm sm:text-base font-black text-slate-800 leading-tight truncate">{value}</p>
                )}
                {sub && <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block">{sub}</p>}
            </div>
        </div>
    );
}

// View modal

function ViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
    const isMeal = product.source === "prepared_meals";
    const profit = calcProfit(product);
    const potEarn = calcPotentialEarn(product);
    const cost = calcTotalCost(product);
    const costPerSrv = isMeal && product.stock_quantity > 0 ? product.market_price / product.stock_quantity : 0;

    return (
        <Modal open onClose={onClose}>
            <div className="flex flex-col overflow-hidden">
                <div className={`${CATEGORY_BG[product.category]} rounded-t-3xl sm:rounded-t-2xl p-5 sm:p-6 shrink-0`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-white/80 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                            {isMeal ? <ChefHat size={12} /> : <Store size={12} />}
                            {isMeal ? "Prepared Meal" : "Store Item"}
                        </span>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={16} className="text-white" /></button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center shrink-0">
                            {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-white/60" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white leading-tight">{product.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-bold">{product.category}</span>
                                {product.subcategory && <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-bold">{product.subcategory}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                        {[
                            { label: isMeal ? "Batch Cost" : "Market Price / item", amount: product.market_price, cls: "bg-slate-50 text-slate-700" },
                            { label: isMeal ? "Sell Price / serving" : "Selling Price / item", amount: product.price, cls: "bg-blue-50 text-blue-700" },
                            { label: isMeal ? "Profit / serving" : "Profit / item", amount: profit, cls: profit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600" },
                            { label: isMeal ? "Total Batch Cost" : "Total Capital", amount: cost, cls: "bg-purple-50 text-purple-700" },
                            { label: "Potential Earnings", amount: potEarn, cls: "bg-emerald-50 text-emerald-700" },
                        ].map(r => (
                            <div key={r.label} className={`rounded-xl p-3 ${r.cls}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{r.label}</p>
                                <p className="text-sm font-black"><PhpDisplay amount={r.amount} /></p>
                            </div>
                        ))}
                        <div className="rounded-xl p-3 bg-slate-50 text-slate-700">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{isMeal ? "Servings available" : "Stock Qty"}</p>
                            <p className={`text-sm font-black ${product.stock_quantity < 10 ? "text-red-500" : ""}`}>{product.stock_quantity} {isMeal ? "serving(s)" : "pcs"}</p>
                        </div>
                    </div>

                    {isMeal && product.stock_quantity > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1 flex items-center gap-1"><BarChart2 size={10} /> Cost Breakdown</p>
                            <p className="text-xs text-amber-700 font-medium">
                                {phpFull(product.market_price)} ÷ {product.stock_quantity} servings = {phpFull(costPerSrv)} cost/serving · Sell {phpFull(product.price)} · Profit {phpFull(profit)}/serving
                            </p>
                        </div>
                    )}

                    <button onClick={onClose} className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// Delete modal

function DeleteModal({ product, onClose, onSuccess }: {
    product: Product; onClose: () => void; onSuccess: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const removeImage = async (url: string) => {
        if (!url) return;
        const idx = url.indexOf("/product-images/");
        if (idx === -1) return;
        await supabase.storage.from("product-images").remove([url.substring(idx + "/product-images/".length)]);
    };
    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.from(product.source).delete().eq("id", product.id);
            if (error) throw error;
            await removeImage(product.image_url);
            toast.success(`"${product.name}" deleted.`);
            onSuccess(); onClose();
        } catch (err: any) { toast.error(err.message || "Failed to delete."); }
        finally { setDeleting(false); }
    };

    return (
        <Modal open onClose={onClose}>
            <div className="px-5 sm:px-6 py-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={26} className="text-red-500" />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Delete Product?</h2>
                <p className="text-sm text-slate-500 mb-1">You're about to permanently delete</p>
                <p className="text-base font-bold text-slate-800 mb-3">"{product.name}"</p>
                <div className="flex gap-2 items-start p-3 bg-red-50 border border-red-100 rounded-xl mb-5 text-left">
                    <CircleAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-500 font-medium leading-relaxed">This cannot be undone. The product and its image will be permanently removed.</p>
                </div>
                <div className="flex gap-3" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                        {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// Mobile product card — compact card layout for small screens

function ProductMobileCard({ product, onView, onEdit, onDelete }: {
    product: Product;
    onView(): void; onEdit(): void; onDelete(): void;
}) {
    const isMeal = product.source === "prepared_meals";
    const profit = calcProfit(product);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 flex gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-300" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                    <p className="font-bold text-slate-800 text-sm leading-tight truncate flex-1">{product.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${CATEGORY_STYLE[product.category]}`}>{product.category}</span>
                </div>
                {product.subcategory && <p className="text-[10px] text-slate-400 mt-0.5">{product.subcategory}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 items-baseline">
                    <span className="text-[10px] text-slate-500 font-medium">
                        Sell: <span className="font-black text-slate-700 text-xs"><PhpDisplay amount={product.price} /></span>
                    </span>
                    <span className={`text-xs font-black ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        <PhpDisplay amount={profit} /> profit
                    </span>
                    <span className={`text-[10px] font-bold ${product.stock_quantity < 10 ? "text-red-500" : "text-slate-400"}`}>
                        {product.stock_quantity} {isMeal ? "svng" : "pcs"}{product.stock_quantity < 10 && " ⚠"}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
                <button onClick={onView} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Eye size={14} /></button>
                <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><Pencil size={14} /></button>
                <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
            </div>
        </div>
    );
}

// Main component

export default function ProductView() {
    const [activeTab, setActiveTab] = useState<Tab>("All");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearch] = useState("");
    const [filterSubcategory, setFilterSubcategory] = useState("All");
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<{ mode: ModalMode; product?: Product; formType?: "sari-sari" | "almusal" | "meryenda" }>({ mode: null });

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const results: Product[] = [];
            const fetchSariSari = async () => {
                const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
                if (error) throw error;
                (data || []).forEach((r: any) => results.push({ ...r, source: "products" }));
            };
            const fetchMeals = async (cat?: "Almusal" | "Meryenda") => {
                let q = supabase.from("prepared_meals").select("*");
                if (cat) q = q.eq("category", cat); else q = q.in("category", ["Almusal", "Meryenda"]);
                const { data, error } = await q.order("created_at", { ascending: false });
                if (error) throw error;
                (data || []).forEach((r: any) => results.push({ ...r, source: "prepared_meals" }));
            };
            if (activeTab === "All") await Promise.all([fetchSariSari(), fetchMeals()]);
            else if (activeTab === "Sari-Sari") await fetchSariSari();
            else await fetchMeals(activeTab as "Almusal" | "Meryenda");
            setProducts(results); setPage(1);
        } catch { toast.error("Failed to load products."); }
        finally { setLoading(false); }
    }, [activeTab]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    useEffect(() => { setPage(1); }, [searchQuery, filterSubcategory]);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setSearch("");
        setFilterSubcategory("All");
    };

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchSub = filterSubcategory === "All" || p.subcategory === filterSubcategory;
        return matchSearch && matchSub;
    });

    const anyFilterActive = searchQuery.trim() !== "" || filterSubcategory !== "All";

    const resetFilters = () => {
        setSearch("");
        setFilterSubcategory("All");
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalExpense = filtered.reduce((s, p) => s + calcTotalCost(p), 0);
    const totalEarn = filtered.reduce((s, p) => s + calcPotentialEarn(p), 0);
    const lowStock = filtered.filter(p => p.stock_quantity < 10).length;

    const closeModal = () => setModal({ mode: null });
    const editFormType = (p: Product): "sari-sari" | "almusal" | "meryenda" =>
        p.source === "products" ? "sari-sari" : p.category === "Almusal" ? "almusal" : "meryenda";

    const renderAddButtons = () => {
        if (activeTab === "Sari-Sari") return (
            <button onClick={() => setModal({ mode: "create", formType: "sari-sari" })}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-all active:scale-95 shrink-0">
                <Store size={15} />
                <span className="hidden xs:inline">Add Sari-Sari Item</span><span className="xs:hidden">Add Item</span>
            </button>
        );
        if (activeTab === "Almusal") return (
            <button onClick={() => setModal({ mode: "create", formType: "almusal" })}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0">
                <ChefHat size={15} />
                <span className="hidden xs:inline">Add Almusal Meal</span><span className="xs:hidden">Add Almusal</span>
            </button>
        );
        if (activeTab === "Meryenda") return (
            <button onClick={() => setModal({ mode: "create", formType: "meryenda" })}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-95 shrink-0">
                <UtensilsCrossed size={15} />
                <span className="hidden xs:inline">Add Meryenda</span><span className="xs:hidden">Add Meryenda</span>
            </button>
        );
        return (
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setModal({ mode: "create", formType: "almusal" })}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all">
                    <ChefHat size={13} /><span className="hidden sm:inline">Almusal</span><span className="sm:hidden">+A</span>
                </button>
                <button onClick={() => setModal({ mode: "create", formType: "sari-sari" })}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all">
                    <Store size={13} /><span className="hidden sm:inline">Sari-Sari</span><span className="sm:hidden">+S</span>
                </button>
                <button onClick={() => setModal({ mode: "create", formType: "meryenda" })}
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all">
                    <UtensilsCrossed size={13} /><span className="hidden sm:inline">Meryenda</span><span className="sm:hidden">+M</span>
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-5 sm:space-y-6 pb-8 animate-in fade-in duration-500"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                        {activeTab === "All" ? "All Products" : `${activeTab} Inventory`}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">Track costs, servings, and potential earnings.</p>
                </div>
                {renderAddButtons()}
            </div>

            {/* Category tabs — scrollable on mobile */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                {TABS.map(tab => (
                    <button key={tab} onClick={() => handleTabChange(tab)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 border ${activeTab === tab
                            ? "bg-slate-900 text-white border-transparent shadow-md"
                            : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                            }`}>
                        {tab === "Almusal" && <ChefHat size={11} />}
                        {tab === "Sari-Sari" && <Store size={11} />}
                        {tab === "Meryenda" && <UtensilsCrossed size={11} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <StatCard icon={ShoppingCart} label="Total Products" value={String(filtered.length)} sub={`${lowStock} low stock`}
                    palette={{ icon: "bg-blue-100 text-blue-600", border: "border-blue-100" }} />
                <StatCard icon={DollarSign} label="Total Capital" valueNum={totalExpense} sub="Gastos sa stock"
                    palette={{ icon: "bg-purple-100 text-purple-600", border: "border-purple-100" }} />
                <StatCard icon={TrendingUp} label="Pot. Earnings" valueNum={totalEarn} sub="Kung maubos lahat"
                    palette={{ icon: "bg-emerald-100 text-emerald-600", border: "border-emerald-100" }} />
                <StatCard icon={BarChart2} label="Avg Profit" valueNum={filtered.length ? totalEarn / filtered.length : 0} sub="Per product"
                    palette={{ icon: "bg-amber-100 text-amber-600", border: "border-amber-100" }} />
            </div>

            {/* Filters — Feedback-style dropdowns */}
            <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2.5">

                    {/* Search */}
                    <div className="relative sm:min-w-[200px] sm:flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search product name…"
                            className="w-full pl-8 pr-4 py-2.5 bg-white rounded-xl text-sm outline-none transition-all"
                            style={{
                                border: searchQuery ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                                boxShadow: searchQuery ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                            }}
                        />
                    </div>

                    {/* Category dropdown */}
                    <DropdownSelect
                        label="Category"
                        value={activeTab}
                        onSelect={v => handleTabChange(v as Tab)}
                        options={[
                            { value: "All", label: "All Categories" },
                            { value: "Almusal", label: "Almusal", swatch: CATEGORY_SWATCH["Almusal"] },
                            { value: "Sari-Sari", label: "Sari-Sari", swatch: CATEGORY_SWATCH["Sari-Sari"] },
                            { value: "Meryenda", label: "Meryenda", swatch: CATEGORY_SWATCH["Meryenda"] },
                        ]}
                    />

                    {/* Subcategory — only when Sari-Sari tab active */}
                    {activeTab === "Sari-Sari" && (
                        <SubcategoryDropdown value={filterSubcategory} onSelect={setFilterSubcategory} />
                    )}

                    {/* Export buttons inline with filters */}
                    <button
                        onClick={() => { if (!filtered.length) return toast.error("No products to export."); toast.promise(exportExcel(filtered, activeTab), { loading: "Generating Excel…", success: "Excel exported!", error: "Export failed." }); }}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[0.75rem] font-bold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors w-full sm:w-auto">
                        <FileSpreadsheet size={13} /> Excel
                    </button>
                    <button
                        onClick={() => { if (!filtered.length) return toast.error("No products to export."); toast.promise(exportPDF(filtered, activeTab), { loading: "Generating PDF…", success: "PDF exported!", error: "Export failed." }); }}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[0.75rem] font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-colors w-full sm:w-auto">
                        <FileText size={13} /> PDF
                    </button>

                    {/* Reset */}
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
                        <span className="font-black text-slate-700">{products.length}</span> products
                    </p>
                )}
            </div>

            {/* Desktop table — hidden on mobile */}
            <div className="hidden sm:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                {["#", "Product", "Category", "Market Price", "Selling Price", "Profit / Unit", "Stock", "Pot. Earn", "Actions"].map(h => (
                                    <th key={h} className="px-4 py-3.5 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {loading ? (
                                <tr><td colSpan={9} className="p-16 text-center">
                                    <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" size={26} />
                                    <p className="text-slate-400 text-sm font-medium">Loading inventory…</p>
                                </td></tr>
                            ) : paginated.length > 0 ? (
                                paginated.map((product, idx) => {
                                    const profit = calcProfit(product);
                                    const potEarn = calcPotentialEarn(product);
                                    const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                                    const isMeal = product.source === "prepared_meals";
                                    return (
                                        <tr key={`${product.source}-${product.id}`} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-3.5 text-xs font-black text-slate-300">{rowNum}</td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-300" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">{product.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{isMeal ? "Prepared Meal" : (product.subcategory || "Sari-Sari")}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${CATEGORY_STYLE[product.category]}`}>{product.category}</span>
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-slate-500 text-sm">
                                                {phpFull(product.market_price)}
                                                {isMeal && <span className="block text-[9px] text-slate-300 font-medium">batch</span>}
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-slate-700 text-sm">
                                                {phpFull(product.price)}
                                                {isMeal && <span className="block text-[9px] text-slate-300 font-medium">/ serving</span>}
                                            </td>
                                            <td className={`px-4 py-3.5 font-black text-sm ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                {phpFull(profit)}
                                                {isMeal && <span className="block text-[9px] font-medium opacity-60">/ serving</span>}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`font-bold ${product.stock_quantity < 10 ? "text-red-500" : "text-slate-700"}`}>
                                                    {product.stock_quantity}
                                                    <span className="text-[10px] font-medium text-slate-400 ml-1">{isMeal ? "svng" : "pcs"}</span>
                                                </span>
                                                {product.stock_quantity < 10 && <span className="block text-[9px] text-red-400 font-black uppercase">Low Stock</span>}
                                            </td>
                                            <td className={`px-4 py-3.5 font-black text-sm ${potEarn >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                {phpFull(potEarn)}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-0.5">
                                                    <button onClick={() => setModal({ mode: "view", product })} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Eye size={14} /></button>
                                                    <button onClick={() => setModal({ mode: "edit", product, formType: editFormType(product) })} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><Pencil size={14} /></button>
                                                    <button onClick={() => setModal({ mode: "delete", product })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={9}>
                                    <div className="flex flex-col items-center py-16">
                                        <Package size={40} className="mb-3 opacity-10" />
                                        <p className="font-medium text-slate-400 text-sm">No products found.</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-400">
                            {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${p === page ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-200"}`}>{p}</button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile card list — shown below sm */}
            <div className="sm:hidden space-y-2.5">
                {loading ? (
                    <div className="flex flex-col items-center py-16 gap-3">
                        <Loader2 size={26} className="animate-spin text-blue-400" />
                        <p className="text-sm text-slate-400 font-medium">Loading inventory…</p>
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="flex flex-col items-center py-16">
                        <Package size={40} className="mb-3 opacity-10" />
                        <p className="font-medium text-slate-400 text-sm">No products found.</p>
                    </div>
                ) : (
                    <>
                        <AnimatePresence initial={false}>
                            {paginated.map((product) => (
                                <motion.div key={`${product.source}-${product.id}`}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18 }}>
                                    <ProductMobileCard
                                        product={product}
                                        onView={() => setModal({ mode: "view", product })}
                                        onEdit={() => setModal({ mode: "edit", product, formType: editFormType(product) })}
                                        onDelete={() => setModal({ mode: "delete", product })}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <p className="text-xs font-bold text-slate-400">
                                    {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                                        <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${p === page ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-200"}`}>{p}</button>
                                    ))}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {modal.mode === "create" && modal.formType === "sari-sari" && (
                    <SariSariFormModal key="ss-create" mode="create" onClose={closeModal} onSuccess={fetchProducts} allProducts={products} />
                )}
                {modal.mode === "create" && (modal.formType === "almusal" || modal.formType === "meryenda") && (
                    <MealFormModal key="meal-create" mode="create" defaultCategory={modal.formType === "almusal" ? "Almusal" : "Meryenda"}
                        onClose={closeModal} onSuccess={fetchProducts} allProducts={products} />
                )}
                {modal.mode === "edit" && modal.product && modal.formType === "sari-sari" && (
                    <SariSariFormModal key="ss-edit" mode="edit" product={modal.product} onClose={closeModal} onSuccess={fetchProducts} allProducts={products} />
                )}
                {modal.mode === "edit" && modal.product && (modal.formType === "almusal" || modal.formType === "meryenda") && (
                    <MealFormModal key="meal-edit" mode="edit" product={modal.product}
                        defaultCategory={modal.product.category as "Almusal" | "Meryenda"}
                        onClose={closeModal} onSuccess={fetchProducts} allProducts={products} />
                )}
                {modal.mode === "view" && modal.product && <ViewModal key="view" product={modal.product} onClose={closeModal} />}
                {modal.mode === "delete" && modal.product && <DeleteModal key="delete" product={modal.product} onClose={closeModal} onSuccess={fetchProducts} />}
            </AnimatePresence>
        </div>
    );
}