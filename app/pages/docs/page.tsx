"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard, Package, ShoppingCart, BarChart3, Users, Shield,
    Book, ChevronRight, CheckCircle2, Menu, X, ArrowRight,
    Zap, Lock, KeyRound, Bell, FileText, TrendingUp,
    RefreshCw, Eye, AlertTriangle, Settings, HelpCircle, Copy, Check,
    Database,
} from "lucide-react";
import Navbar from "@/app/comps/navbar/page";
import Footer from "@/app/comps/footer/page";

// Types
interface DocItem {
    id: string;
    title: string;
    content: React.ReactNode;
}
interface DocSection {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    accent: string;
    items: DocItem[];
}

// Code block with copy
function CodeBlock({ children }: { children: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="relative rounded-xl overflow-hidden my-3"
            style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)" }}>
            <button
                onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[0.65rem] font-bold transition-all"
                style={{ background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", color: copied ? "#10b981" : "#64748b" }}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy"}
            </button>
            <pre className="px-5 py-4 text-[0.78rem] leading-relaxed overflow-x-auto"
                style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
                <code>{children}</code>
            </pre>
        </div>
    );
}

// Callout box
function Callout({ type = "info", children }: { type?: "info" | "warning" | "success" | "danger"; children: React.ReactNode }) {
    const map = {
        info: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)", icon: <Zap size={14} />, color: "#3b82f6" },
        warning: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", icon: <AlertTriangle size={14} />, color: "#f59e0b" },
        success: { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", icon: <CheckCircle2 size={14} />, color: "#10b981" },
        danger: { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", icon: <Shield size={14} />, color: "#ef4444" },
    };
    const s = map[type];
    return (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3 my-3"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <span className="mt-0.5 flex-shrink-0" style={{ color: s.color }}>{s.icon}</span>
            <div className="text-[0.82rem] leading-relaxed" style={{ color: "#475569" }}>{children}</div>
        </div>
    );
}

// Numbered steps
function Steps({ items, color = "#3b82f6" }: { items: string[]; color?: string }) {
    return (
        <div className="space-y-2.5 my-3">
            {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-black flex-shrink-0 mt-0.5"
                        style={{ background: color, color: "white" }}>{i + 1}</div>
                    <p className="text-[0.84rem] leading-relaxed pt-0.5" style={{ color: "#374151" }}>{item}</p>
                </div>
            ))}
        </div>
    );
}

// Role permission table
function PermTable({ rows }: { rows: { feature: string; owner: boolean; cashier: boolean; staff: boolean }[] }) {
    return (
        <div className="rounded-xl overflow-hidden border my-4" style={{ borderColor: "#E2E8F0" }}>
            <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                        <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #F1F5F9" }}>Feature</th>
                        {["Owner", "Cashier", "Staff"].map(r => (
                            <th key={r} style={{ padding: "8px 14px", textAlign: "center", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #F1F5F9" }}>{r}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={row.feature} style={{ background: i % 2 === 0 ? "white" : "#FAFBFC" }}>
                            <td style={{ padding: "8px 14px", fontWeight: 600, color: "#0F172A", borderBottom: "1px solid #F1F5F9" }}>{row.feature}</td>
                            {[row.owner, row.cashier, row.staff].map((has, j) => (
                                <td key={j} style={{ padding: "8px 14px", textAlign: "center", borderBottom: "1px solid #F1F5F9" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: has ? "#DCFCE7" : "#FEF2F2", color: has ? "#16A34A" : "#DC2626", fontSize: 12, fontWeight: 700 }}>
                                        {has ? "✓" : "✕"}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Full-width doc image
function DocImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
    return (
        <div className="my-5 rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: "#E2E8F0" }}>
            <Image src={src} alt={alt} width={0} height={0} sizes="100vw"
                style={{ width: "100%", height: "auto", display: "block" }} />
            {caption && (
                <div className="px-4 py-2.5 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                    <span className="text-xs font-semibold" style={{ color: "#64748B" }}>{caption}</span>
                </div>
            )}
        </div>
    );
}

// Two-col image grid
function DocImageGrid({ images }: { images: { src: string; alt: string; caption?: string; badge?: string; badgeColor?: string }[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
            {images.map((img, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: "#E2E8F0" }}>
                    {img.badge && (
                        <div className="absolute top-3 left-3 z-10">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: img.badgeColor ?? "#3B82F6", color: "white" }}>
                                {img.badge}
                            </span>
                        </div>
                    )}
                    <Image src={img.src} alt={img.alt} width={0} height={0} sizes="(max-width:768px) 100vw, 50vw"
                        style={{ width: "100%", height: "auto", display: "block" }} />
                    {img.caption && (
                        <div className="px-4 py-2.5 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                            <span className="text-xs font-semibold" style={{ color: "#64748B" }}>{img.caption}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// Video embed
function DocVideo({ src, caption }: { src: string; caption?: string }) {
    return (
        <div className="my-5 rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: "#E2E8F0" }}>
            <video src={src} controls className="w-full" style={{ display: "block", background: "#000" }} />
            {caption && (
                <div className="px-4 py-2.5 border-t" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                    <span className="text-xs font-semibold" style={{ color: "#64748B" }}>{caption}</span>
                </div>
            )}
        </div>
    );
}

// All doc sections and their content
const DOCS: DocSection[] = [
    {
        id: "getting-started",
        label: "Getting Started",
        icon: <Zap size={15} />,
        color: "#3B82F6",
        accent: "rgba(59,130,246,0.08)",
        items: [
            {
                id: "overview",
                title: "What is SariSari.IMS?",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.9rem] leading-relaxed" style={{ color: "#374151" }}>
                            <strong>SariSari.IMS</strong> is a secure, cloud-based inventory management and sales analytics system built specifically for Filipino sari-sari stores. It replaces paper notebooks and manual ledgers with a centralized digital platform.
                        </p>
                        <Callout type="success">
                            All features are free to use. No credit card required, no contract. Just sign up and start managing your store.
                        </Callout>
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#64748B" }}>
                            Built on <strong>Next.js + Supabase</strong>, it handles everything from real-time inventory to multi-role authentication, batch cost calculations, and professional report exports.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                            {[
                                { icon: <Package size={16} />, title: "Smart Inventory", desc: "Real-time stock tracking across all categories", color: "#10B981" },
                                { icon: <ShoppingCart size={16} />, title: "Fast POS", desc: "Process sales in seconds with auto change", color: "#F59E0B" },
                                { icon: <Shield size={16} />, title: "Secure by Default", desc: "2FA, MFA, RLS & encrypted sessions", color: "#EF4444" },
                            ].map(f => (
                                <div key={f.title} className="rounded-xl p-4 border" style={{ borderColor: "#E2E8F0", background: "#FAFBFC" }}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
                                    <div className="font-bold text-sm text-slate-800 mb-0.5">{f.title}</div>
                                    <div className="text-[0.75rem] text-slate-500">{f.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ),
            },
            {
                id: "roles",
                title: "User Roles & Permissions",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            SariSari.IMS has three distinct user roles. Each role only sees what their job requires.
                        </p>
                        <PermTable rows={[
                            { feature: "Overview Dashboard", owner: true, cashier: false, staff: false },
                            { feature: "Business Analytics", owner: true, cashier: false, staff: false },
                            { feature: "Inventory Management", owner: true, cashier: false, staff: true },
                            { feature: "Point of Sale (POS)", owner: true, cashier: true, staff: false },
                            { feature: "Sales History", owner: true, cashier: false, staff: false },
                            { feature: "Staff Management", owner: true, cashier: false, staff: false },
                            { feature: "Supplier Directory", owner: true, cashier: false, staff: false },
                            { feature: "Utang / Debt Tracker", owner: true, cashier: false, staff: false },
                            { feature: "Export Reports (PDF/Excel)", owner: true, cashier: false, staff: true },
                        ]} />
                        <Callout type="warning">
                            Staff and Cashier accounts are created by the Owner from within the dashboard. They cannot self-register.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "first-login",
                title: "First Login & Setup",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            New owners follow this registration and first-login sequence:
                        </p>
                        <Steps color="#3B82F6" items={[
                            "Go to /auth/register and fill in your store name, email, and password.",
                            "Check your email — click the verification link sent by SariSari.IMS.",
                            "Once verified, go to /auth/login and sign in with your credentials.",
                            "Complete 2FA enrollment — an 8-digit code is sent to your email.",
                            "You're in! Configure your store, add products, and create staff accounts.",
                        ]} />
                        <Callout type="info">
                            If you're a Cashier or Staff Worker, your account is created by your store owner. You log in via <strong>/auth/staff-cashier-worker-login</strong> using your email and PIN.
                        </Callout>
                        <DocVideo src="/images/auth/register.mov" caption="Registration & email verification walkthrough" />
                    </div>
                ),
            },
        ],
    },
    {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard size={15} />,
        color: "#3B82F6",
        accent: "rgba(59,130,246,0.08)",
        items: [
            {
                id: "dashboard-overview",
                title: "Dashboard Overview",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            The Dashboard is the Owner's control center. It surfaces the most important metrics the moment you log in.
                        </p>
                        <DocImage src="/images/dashboard/1.png" alt="Dashboard overview" caption="Main overview panel — live revenue, alerts, top products" />
                        <div className="space-y-2">
                            {[
                                { icon: <TrendingUp size={14} />, title: "Live Revenue Snapshot", desc: "Today's total sales and profit updated after every transaction.", color: "#3B82F6" },
                                { icon: <AlertTriangle size={14} />, title: "Low Stock Alerts", desc: "Products nearing zero are highlighted so you can reorder before running out.", color: "#F59E0B" },
                                { icon: <ShoppingCart size={14} />, title: "Daily Transaction Count", desc: "How many sales have been completed today, broken down by cashier.", color: "#10B981" },
                                { icon: <Eye size={14} />, title: "Top-Selling Products", desc: "Which items are moving fastest and making the most profit.", color: "#8B5CF6" },
                            ].map(f => (
                                <div key={f.title} className="flex items-start gap-3 p-3.5 rounded-xl border" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800 mb-0.5">{f.title}</div>
                                        <div className="text-[0.78rem] text-slate-500">{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Callout type="success">
                            The dashboard refreshes in real-time — every completed sale immediately updates all counters.
                        </Callout>
                    </div>
                ),
            },
        ],
    },
    {
        id: "inventory",
        label: "Inventory",
        icon: <Package size={15} />,
        color: "#10B981",
        accent: "rgba(16,185,129,0.08)",
        items: [
            {
                id: "add-product",
                title: "Adding a Product",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Products are organized into three main categories: <strong>Almusal</strong>, <strong>Meryenda</strong>, and <strong>Sari-Sari</strong>, each with over 30 subcategories.
                        </p>
                        <DocImageGrid images={[
                            { src: "/images/inventory/1.png", alt: "Product catalog", caption: "Product catalog view", badge: "Live", badgeColor: "#10B981" },
                            { src: "/images/inventory/2.png", alt: "Stock and pricing detail", caption: "Stock & pricing detail", badge: "Editable", badgeColor: "#3B82F6" },
                        ]} />
                        <Steps color="#10B981" items={[
                            "Go to Inventory and click the Add Product button.",
                            "Enter the product name, category, and subcategory.",
                            "Set the Selling Price and Market Price (your cost). Profit margin is calculated automatically.",
                            "Enter the starting stock quantity.",
                            "Optionally upload a product image for quick counter identification.",
                            "Save — the product is now live in your catalog and POS.",
                        ]} />
                        <Callout type="info">
                            <strong>Profit margin</strong> is automatically calculated as: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">Selling Price − Market Price</code> per unit.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "stock-management",
                title: "Stock Management",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Stock levels update automatically when sales are processed through the POS. Manual adjustments can be made by the Owner or Staff at any time.
                        </p>
                        <div className="space-y-2">
                            {[
                                { label: "Auto-Deduction", desc: "Every completed sale deducts quantity from the product's stock_quantity field in real time." },
                                { label: "Out-of-Stock Guard", desc: "POS item buttons are disabled when stock reaches zero — over-selling is impossible." },
                                { label: "Low-Stock Alert", desc: "Products below threshold appear highlighted on the dashboard and inventory list." },
                            ].map(i => (
                                <div key={i.label} className="flex items-start gap-2.5 py-2.5 border-b" style={{ borderColor: "#F1F5F9" }}>
                                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#10B981" }} />
                                    <div>
                                        <span className="text-sm font-bold text-slate-800">{i.label} — </span>
                                        <span className="text-[0.82rem] text-slate-500">{i.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ),
            },
            {
                id: "export-inventory",
                title: "Exporting Inventory",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Download your full product catalog for external record keeping or supplier orders.
                        </p>
                        <DocImageGrid images={[
                            { src: "/images/inventory/pdf.png", alt: "PDF export", caption: "PDF export — formatted printable report", badge: "PDF", badgeColor: "#EF4444" },
                            { src: "/images/inventory/excel.png", alt: "Excel export", caption: "Excel export — full .xlsx spreadsheet", badge: "Excel", badgeColor: "#10B981" },
                        ]} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { label: "PDF Export", desc: "Formatted printable report with all products, prices, and stock levels.", icon: <FileText size={15} />, color: "#EF4444" },
                                { label: "Excel Export", desc: "Full spreadsheet (.xlsx) compatible with Google Sheets and Microsoft Excel.", icon: <Database size={15} />, color: "#10B981" },
                            ].map(e => (
                                <div key={e.label} className="p-4 rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span style={{ color: e.color }}>{e.icon}</span>
                                        <span className="font-bold text-sm text-slate-800">{e.label}</span>
                                    </div>
                                    <p className="text-[0.78rem] text-slate-500">{e.desc}</p>
                                </div>
                            ))}
                        </div>
                        <Callout type="warning">
                            Export buttons are visible to both Owner and Staff roles. Cashiers cannot access inventory exports.
                        </Callout>
                    </div>
                ),
            },
        ],
    },
    {
        id: "pos",
        label: "Point of Sale",
        icon: <ShoppingCart size={15} />,
        color: "#F59E0B",
        accent: "rgba(245,158,11,0.08)",
        items: [
            {
                id: "process-sale",
                title: "Processing a Sale",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            The POS is designed for speed. A full transaction takes under 15 seconds once products are set up.
                        </p>
                        <DocImage src="/images/pos/1.png" alt="POS interface" caption="Main POS interface — cart, search, totals, and payment" />
                        <Steps color="#F59E0B" items={[
                            "Open the POS from the sidebar or top navigation.",
                            "Search by product name or browse by category.",
                            "Click a product to add it to the cart. Adjust quantity using the + / − buttons.",
                            "Click Checkout when the cart is ready.",
                            "Enter the amount paid by the customer — change is calculated instantly.",
                            "Tap Complete Sale. Stock auto-deducts and the transaction is logged.",
                        ]} />
                        <Callout type="success">
                            Out-of-stock products are automatically disabled — you cannot accidentally add them to a cart.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "receipts",
                title: "Receipts & Transaction Log",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Every transaction generates a printable receipt and a permanent log entry with full item breakdown, cashier name, and timestamp.
                        </p>
                        <div className="space-y-2">
                            {[
                                "Transaction reference number (auto-generated)",
                                "Item list with quantities and unit prices",
                                "Total amount, amount paid, and change given",
                                "Cashier or owner name who processed the sale",
                                "Date and exact time of the transaction",
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#F59E0B" }} />
                                    <span className="text-[0.83rem] text-slate-600">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: "analytics",
        label: "Analytics",
        icon: <BarChart3 size={15} />,
        color: "#8B5CF6",
        accent: "rgba(139,92,246,0.08)",
        items: [
            {
                id: "reports",
                title: "Sales Reports & Charts",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            The Analytics module transforms raw transaction data into visual insights available only to the Owner.
                        </p>
                        <DocImage src="/images/analytics/1.png" alt="Analytics overview" caption="Revenue overview — charts and trend analysis" />
                        <div className="space-y-2">
                            {[
                                { title: "Revenue Over Time", desc: "Daily, weekly, and monthly line and bar charts showing revenue trends.", color: "#8B5CF6" },
                                { title: "Category Breakdown", desc: "Which categories (Almusal, Meryenda, Sari-Sari) contribute the most profit.", color: "#3B82F6" },
                                { title: "Best-Selling Products", desc: "Ranked list of top earners by quantity sold and profit generated.", color: "#F59E0B" },
                                { title: "Cashier Efficiency", desc: "Transaction count per cashier to evaluate staff performance.", color: "#10B981" },
                                { title: "Date Range Filter", desc: "Filter all charts and reports by any custom date range.", color: "#EF4444" },
                            ].map(f => (
                                <div key={f.title} className="flex items-start gap-2.5 py-2.5 border-b last:border-0" style={{ borderColor: "#F1F5F9" }}>
                                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: f.color }} />
                                    <div>
                                        <span className="text-sm font-bold text-slate-800">{f.title} — </span>
                                        <span className="text-[0.82rem] text-slate-500">{f.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <DocImageGrid images={[
                            { src: "/images/analytics/2.png", alt: "Category performance", caption: "Category performance breakdown" },
                            { src: "/images/analytics/3.png", alt: "Product profit breakdown", caption: "Product profit breakdown" },
                        ]} />
                        <DocImage src="/images/analytics/4.png" alt="Date range filter" caption="Date range filter view — select any period" />
                        <Callout type="info">
                            Reports can be exported as <strong>PDF</strong>, <strong>Excel (.xlsx)</strong>, or <strong>CSV</strong> from the Analytics export button.
                        </Callout>
                    </div>
                ),
            },
        ],
    },
    {
        id: "staff",
        label: "Staff & Access",
        icon: <Users size={15} />,
        color: "#EF4444",
        accent: "rgba(239,68,68,0.08)",
        items: [
            {
                id: "create-staff",
                title: "Creating Staff Accounts",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Only the Owner can create staff accounts. Staff never self-register.
                        </p>
                        <DocImage src="/images/staff/1.png" alt="Staff directory" caption="Staff directory — view and manage all team members" />
                        <Steps color="#EF4444" items={[
                            "Go to Staff Management in the sidebar.",
                            "Click Add Staff Member.",
                            "Enter the staff member's full name, email, and phone number.",
                            "Assign a role: Cashier or Staff Worker.",
                            "Set a 4-digit PIN code — this is what they use to sign in.",
                            "Save. The staff member can now log in via /auth/staff-cashier-worker-login.",
                        ]} />
                        <Callout type="warning">
                            Keep PIN codes confidential. PINs are hashed in the database and cannot be retrieved — only reset by the Owner.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "attendance",
                title: "Attendance Tracking",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Staff attendance is recorded automatically — no manual check-in forms required.
                        </p>
                        <DocImage src="/images/staff/2.png" alt="Attendance log" caption="Attendance log — time in & time out per staff member" />
                        <div className="space-y-2.5">
                            {[
                                { dot: "#10b981", label: "On Time", desc: "Staff member logs in at or before 8:00 AM" },
                                { dot: "#f59e0b", label: "Late", desc: "Login time is between 8:01 AM and 12:00 PM" },
                                { dot: "#ef4444", label: "Absent", desc: "No login recorded by 12:00 PM — automatically marked absent" },
                                { dot: "#94a3b8", label: "OFF", desc: "Every Sunday (REST DAY) or Philippine public holiday" },
                            ].map(r => (
                                <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FAFBFC", border: "1px solid #F1F5F9" }}>
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.dot }} />
                                    <span className="text-sm font-bold text-slate-800 w-16 flex-shrink-0">{r.label}</span>
                                    <span className="text-[0.8rem] text-slate-500">{r.desc}</span>
                                </div>
                            ))}
                        </div>
                        <Callout type="info">
                            The Owner can view the full attendance log per staff member — date, time in, time out, and duration.
                        </Callout>
                    </div>
                ),
            },
        ],
    },
    {
        id: "auth",
        label: "Auth & Security",
        icon: <Shield size={15} />,
        color: "#6366F1",
        accent: "rgba(99,102,241,0.08)",
        items: [
            {
                id: "2fa-login",
                title: "Owner Login — 2FA Flow",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Owner login uses a two-step process — credentials first, then an 8-digit one-time code sent to their email.
                        </p>
                        <DocImage src="/images/auth/2FA.png" alt="2FA verification screen" caption="Email OTP verification — 8-digit code, 3 attempts allowed" />
                        <Steps color="#6366F1" items={[
                            "Go to /auth/login and enter your email and password.",
                            "The system verifies your credentials against Supabase Auth.",
                            "An 8-digit verification code is sent to your registered email.",
                            "Enter the code on the verification screen. It auto-submits when all 8 digits are filled.",
                            "If your account has MFA enabled, an additional authenticator app code is required.",
                            "Access is granted — you are redirected to the Owner dashboard.",
                        ]} />
                        <Callout type="danger">
                            After <strong>3 failed OTP attempts</strong>, the session is reset and you are returned to the login screen. Request a new code to try again.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "mfa",
                title: "Multi-Factor Authentication (MFA)",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            MFA is an owner-only feature that adds a third verification layer using an authenticator app (Google Authenticator, Authy, etc.).
                        </p>
                        <Steps color="#6366F1" items={[
                            "Go to Account Settings → Security.",
                            "Enable Two-Factor Authentication.",
                            "Scan the QR code with your authenticator app.",
                            "Confirm setup by entering the 6-digit code from the app.",
                            "MFA is now active — every login will require the rotating code after 2FA.",
                        ]} />
                        <Callout type="warning">
                            MFA is exclusive to Owner accounts. Cashiers and Staff use PIN-based login only.
                        </Callout>
                        <div className="rounded-xl p-4 border" style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.15)" }}>
                            <p className="text-[0.78rem] font-bold text-indigo-800 mb-2">Login flow with MFA enabled</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {["Email + Password", "→", "8-digit Email OTP", "→", "6-digit Authenticator Code", "→", "Dashboard"].map((s, i) => (
                                    <span key={i} className={`text-[0.75rem] font-semibold ${s === "→" ? "text-slate-400" : "px-2 py-0.5 rounded-full"}`}
                                        style={s !== "→" ? { background: "rgba(99,102,241,0.1)", color: "#4338CA" } : {}}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: "forgot-password",
                title: "Forgot Password & Reset",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Password resets are available for Owner accounts only. Staff PINs are reset by the Owner from the Staff Management module.
                        </p>
                        <Steps color="#6366F1" items={[
                            "Click Forgot Password? on the login page.",
                            "Enter your registered email address.",
                            "A secure reset link is sent to your inbox (expires in a short window).",
                            "Click the link and complete 2FA identity verification.",
                            "Set your new password.",
                            "An automatic email alert is sent to confirm the password change.",
                        ]} />
                        <Callout type="info">
                            You will receive an email notification <strong>any time your password is changed</strong> — even if you didn't initiate the change. This is your early warning against unauthorized access.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "cashier-2fa",
                title: "Cashier Login — PIN + 2FA",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Cashiers go through a two-step process: PIN verification first, then an 8-digit email code. Staff Workers use PIN only.
                        </p>
                        <DocImage src="/images/auth/cashier-staff.jpeg" alt="Cashier staff login" caption="Team Sign In — role selector with PIN and 2FA for cashiers" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { role: "Staff Worker", steps: ["Select Staff Worker role", "Enter email + PIN", "Redirected to Staff dashboard"], color: "#7C3AED", badge: "PIN Only" },
                                { role: "Cashier", steps: ["Select Cashier role", "Enter email + PIN", "Enter 8-digit email OTP", "Redirected to POS"], color: "#0891B2", badge: "PIN + 2FA" },
                            ].map(r => (
                                <div key={r.role} className="rounded-xl p-4 border" style={{ borderColor: "#E2E8F0" }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="font-bold text-sm text-slate-800">{r.role}</span>
                                        <span className="text-[0.6rem] font-black px-2 py-0.5 rounded-full"
                                            style={{ background: `${r.color}15`, color: r.color }}>{r.badge}</span>
                                    </div>
                                    {r.steps.map((s, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-1.5">
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[0.55rem] font-black flex-shrink-0"
                                                style={{ background: r.color, color: "white" }}>{i + 1}</div>
                                            <span className="text-[0.78rem] text-slate-600">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <Callout type="warning">
                            The staff portal is only accessible on working days before <strong>12:00 PM</strong>. It locks automatically on Sundays and Philippine public holidays.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "session-security",
                title: "Session Security & Idle Timeout",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            The system protects against unattended sessions and physical access threats through automatic logout and session monitoring.
                        </p>
                        <div className="space-y-2">
                            {[
                                { icon: <RefreshCw size={13} />, title: "Idle Timeout", desc: "Users are automatically logged out after a period of inactivity.", color: "#6366F1" },
                                { icon: <Lock size={13} />, title: "Re-Authentication", desc: "Accessing the dashboard and sales history requires password confirmation.", color: "#EF4444" },
                                { icon: <Shield size={13} />, title: "Row Level Security (RLS)", desc: "Database-level policies ensure users can only read/write their own data.", color: "#10B981" },
                                { icon: <Eye size={13} />, title: "Encrypted Sessions", desc: "All session tokens are encrypted. Connections use HTTPS/TLS.", color: "#3B82F6" },
                            ].map(f => (
                                <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: "#F1F5F9", background: "#FAFBFC" }}>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800 mb-0.5">{f.title}</div>
                                        <div className="text-[0.78rem] text-slate-500">{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: "other",
        label: "Other Modules",
        icon: <Settings size={15} />,
        color: "#64748B",
        accent: "rgba(100,116,139,0.08)",
        items: [
            {
                id: "utang",
                title: "Utang / Debt Tracker",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            The Utang module lets you track customer credit digitally — no more lost notebooks.
                        </p>
                        <div className="space-y-2">
                            {[
                                "Record customer name, items purchased on credit, amount owed, and optional due date.",
                                "Track partial payments — amount_paid is updated as the customer pays back.",
                                "Mark entries as is_paid = true when fully settled.",
                                "The system shows overdue balances and upcoming due dates.",
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <CheckCircle2 size={13} className="mt-1 flex-shrink-0" style={{ color: "#10B981" }} />
                                    <span className="text-[0.83rem] text-slate-600">{s}</span>
                                </div>
                            ))}
                        </div>
                        <Callout type="warning">
                            Utang records are only accessible to the Owner. Staff and Cashiers cannot view customer debt data.
                        </Callout>
                    </div>
                ),
            },
            {
                id: "suppliers",
                title: "Supplier Directory",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Keep all your supplier contacts in one place — market vendors, direct contacts, and distributors.
                        </p>
                        <div className="space-y-2">
                            {[
                                { label: "Supplier Name", desc: "Full name of the supplier or company." },
                                { label: "Type", desc: "Store, Distributor, Market Vendor, or Direct Contact." },
                                { label: "Phone & Address", desc: "Contact number and physical location or delivery address." },
                                { label: "Main Items", desc: "List of products this supplier typically provides." },
                                { label: "Notes", desc: "Any additional notes — payment terms, visit schedule, etc." },
                            ].map(f => (
                                <div key={f.label} className="flex items-start gap-2.5 py-2 border-b last:border-0" style={{ borderColor: "#F1F5F9" }}>
                                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: "#64748B" }} />
                                    <div>
                                        <span className="text-sm font-bold text-slate-800">{f.label} — </span>
                                        <span className="text-[0.82rem] text-slate-500">{f.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ),
            },
            {
                id: "sales-history",
                title: "Sales History & Audit",
                content: (
                    <div className="space-y-4">
                        <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>
                            Every transaction is permanently stored with a full audit trail — who sold it, when, and what was in the cart.
                        </p>
                        <div className="space-y-2">
                            {[
                                "Filter transactions by date range, cashier, or category.",
                                "Each entry shows: transaction ref, items, total, cashier name, and timestamp.",
                                "Export filtered results as PDF, Excel, or CSV for external auditing.",
                                "Sales History is read-only — no one can delete or edit past transactions.",
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <CheckCircle2 size={13} className="mt-1 flex-shrink-0" style={{ color: "#64748B" }} />
                                    <span className="text-[0.83rem] text-slate-600">{s}</span>
                                </div>
                            ))}
                        </div>
                        <Callout type="info">
                            Sales History is accessible to the Owner only. It serves as the primary tool for reconciling cash drawers and evaluating staff performance.
                        </Callout>
                    </div>
                ),
            },
        ],
    },
];

// Build flat list for prev/next navigation
const ALL_ITEMS = DOCS.flatMap(s =>
    s.items.map(i => ({ sectionId: s.id, itemId: i.id, title: i.title }))
);

// Sidebar navigation component
function SidebarNav({
    active,
    onSelect,
}: {
    active: { section: string; item: string };
    onSelect: (section: string, item: string) => void;
}) {
    return (
        <nav className="space-y-0.5">
            {DOCS.map(section => (
                <div key={section.id} className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                        <span style={{ color: section.color }}>{section.icon}</span>
                        <span className="text-[0.68rem] font-black uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                            {section.label}
                        </span>
                    </div>
                    {section.items.map(item => {
                        const isActive = active.section === section.id && active.item === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelect(section.id, item.id)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[0.82rem] transition-all"
                                style={{
                                    background: isActive ? section.accent : "transparent",
                                    color: isActive ? section.color : "#64748B",
                                    fontWeight: isActive ? 700 : 500,
                                }}>
                                {isActive && <ChevronRight size={12} style={{ color: section.color, flexShrink: 0 }} />}
                                <span className={isActive ? "" : "ml-4"}>{item.title}</span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}

// Inner component — uses useSearchParams, must be inside Suspense
function DocsContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Read section/item from URL, default to first page
    const [active, setActive] = useState(() => {
        const s = searchParams.get("section") ?? "getting-started";
        const i = searchParams.get("item") ?? "overview";
        return { section: s, item: i };
    });
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Sync URL → state when URL changes (back/forward, fresh load)
    useEffect(() => {
        const s = searchParams.get("section") ?? "getting-started";
        const i = searchParams.get("item") ?? "overview";
        setActive({ section: s, item: i });
    }, [searchParams]);

    // When navigating away and back, reset to top of first page
    useEffect(() => {
        // If we're on the docs page and there are no params, reset to top
        if (pathname === "/pages/docs" && !searchParams.get("section")) {
            setActive({ section: "getting-started", item: "overview" });
        }
    }, [pathname, searchParams]);

    const handleSelect = useCallback((section: string, item: string) => {
        setDrawerOpen(false);
        // Push to URL so refresh keeps state, but don't hard-reload
        router.push(`/pages/docs?section=${section}&item=${item}`, { scroll: false });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [router]);

    const activeSection = DOCS.find(s => s.id === active.section) ?? DOCS[0];
    const activeItem = activeSection.items.find(i => i.id === active.item) ?? activeSection.items[0];

    const currentIdx = ALL_ITEMS.findIndex(i => i.sectionId === active.section && i.itemId === active.item);
    const prev = ALL_ITEMS[currentIdx - 1] ?? null;
    const next = ALL_ITEMS[currentIdx + 1] ?? null;

    return (
        <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Familjen+Grotesk:wght@700;800&display=swap');
                * { box-sizing: border-box; }
                h1,h2,h3,h4 { font-family: 'Familjen Grotesk', sans-serif; }
            `}</style>

            <Navbar />

            {/* Hero */}
            <div style={{ background: "linear-gradient(135deg, #050E1F 0%, #0c1a3a 60%, #050E1F 100%)", paddingTop: "80px", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-8 relative">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 border text-xs font-bold uppercase tracking-widest"
                        style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)", color: "#60A5FA" }}>
                        <Book size={11} /> Documentation
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
                        className="text-white font-black leading-tight mb-3"
                        style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.7rem,4vw,2.6rem)" }}>
                        SariSari.IMS Docs
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                        className="text-sm sm:text-base"
                        style={{ color: "rgba(255,255,255,0.5)", maxWidth: 480 }}>
                        Everything you need to set up, manage, and secure your tindahan — from first login to advanced analytics.
                    </motion.p>
                </div>
            </div>

            {/* Body: sidebar + content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex gap-8 items-start">

                    {/* Desktop sidebar */}
                    <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-24">
                        <div className="rounded-2xl border p-3" style={{ borderColor: "#E2E8F0", background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                            <SidebarNav active={active} onSelect={handleSelect} />
                        </div>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 min-w-0">

                        {/* Mobile nav trigger */}
                        <div className="lg:hidden flex items-center justify-between mb-5 p-3.5 rounded-2xl border"
                            style={{ background: "white", borderColor: "#E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                            <div className="flex items-center gap-2 min-w-0">
                                <span style={{ color: activeSection.color, flexShrink: 0 }}>{activeSection.icon}</span>
                                <span className="text-sm font-bold text-slate-800 truncate">{activeItem.title}</span>
                            </div>
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-xl text-xs font-bold flex-shrink-0 ml-3"
                                style={{ background: activeSection.accent, color: activeSection.color, border: `1px solid ${activeSection.color}30` }}>
                                <Menu size={14} /> Nav
                            </button>
                        </div>

                        {/* Content card with animation */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${active.section}-${active.item}`}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="rounded-2xl border p-6 sm:p-8 mb-5"
                                style={{ background: "white", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>

                                {/* Breadcrumb */}
                                <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold mb-5" style={{ color: "#94A3B8" }}>
                                    <span style={{ color: activeSection.color }}>{activeSection.label}</span>
                                    <ChevronRight size={11} />
                                    <span style={{ color: "#475569" }}>{activeItem.title}</span>
                                </div>

                                {/* Page title */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: activeSection.accent, color: activeSection.color }}>
                                        {activeSection.icon}
                                    </div>
                                    <h2 className="font-black text-xl sm:text-2xl" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
                                        {activeItem.title}
                                    </h2>
                                </div>

                                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "1.5rem" }}>
                                    {activeItem.content}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Prev / Next navigation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            {prev ? (
                                <button
                                    onClick={() => handleSelect(prev.sectionId, prev.itemId)}
                                    className="flex items-center gap-3 p-4 rounded-xl border text-left hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                                    style={{ borderColor: "#E2E8F0", background: "white" }}>
                                    <ArrowRight size={14} className="rotate-180 text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                                    <div>
                                        <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Previous</div>
                                        <div className="text-sm font-semibold text-slate-700">{prev.title}</div>
                                    </div>
                                </button>
                            ) : <div />}
                            {next ? (
                                <button
                                    onClick={() => handleSelect(next.sectionId, next.itemId)}
                                    className="flex items-center justify-end gap-3 p-4 rounded-xl border text-right hover:border-blue-200 hover:bg-blue-50/30 transition-all group sm:col-start-2"
                                    style={{ borderColor: "#E2E8F0", background: "white" }}>
                                    <div>
                                        <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Next</div>
                                        <div className="text-sm font-semibold text-slate-700">{next.title}</div>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                                </button>
                            ) : <div />}
                        </div>

                        {/* Help CTA */}
                        <div className="rounded-2xl p-6 border flex flex-col sm:flex-row items-center gap-4"
                            style={{ background: "linear-gradient(135deg,#EFF6FF,#EEF2FF)", borderColor: "#BFDBFE" }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                style={{ background: "#2563EB", color: "white" }}>
                                <HelpCircle size={22} />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <div className="font-black text-slate-900 mb-0.5" style={{ fontFamily: "'Familjen Grotesk',sans-serif" }}>
                                    Still need help?
                                </div>
                                <p className="text-[0.82rem] text-slate-500">Can't find what you're looking for? Reach out and we'll get back to you.</p>
                            </div>
                            <Link href="/pages/contact"
                                className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex-shrink-0"
                                style={{ background: "#2563EB", color: "white", boxShadow: "0 4px 14px rgba(37,99,235,0.25)" }}>
                                Contact Support <ArrowRight size={13} />
                            </Link>
                        </div>
                    </main>
                </div>
            </div>

            {/* Mobile bottom drawer */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        <motion.div key="overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm lg:hidden"
                            onClick={() => setDrawerOpen(false)} />
                        <motion.div key="drawer"
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ duration: 0.3, ease: [0.77, 0, 0.175, 1] }}
                            className="fixed bottom-0 left-0 right-0 z-[901] bg-white rounded-t-3xl lg:hidden overflow-hidden"
                            style={{ maxHeight: "80vh", boxShadow: "0 -20px 60px rgba(0,0,0,0.18)" }}>
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full" style={{ background: "#E2E8F0" }} />
                            </div>
                            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#F1F5F9" }}>
                                <span className="font-black text-slate-900" style={{ fontFamily: "'Familjen Grotesk',sans-serif" }}>
                                    Documentation
                                </span>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: "#F1F5F9" }}>
                                    <X size={15} style={{ color: "#64748B" }} />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(80vh - 80px)" }}>
                                <SidebarNav active={active} onSelect={handleSelect} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}


export default function DocsPage() {
    return (
        <Suspense fallback={
            <div style={{ background: "#F8FAFC", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
        }>
            <DocsContent />
        </Suspense>
    );
}