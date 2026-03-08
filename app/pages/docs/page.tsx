"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    Book, ChevronDown, LayoutDashboard, Package, ShoppingCart,
    Users, BarChart3, History, Shield, Zap, HelpCircle,
    CheckCircle2, ArrowRight, Lock, Search
} from "lucide-react";
import Navbar from "@/app/comps/navbar/page";
import Footer from "@/app/comps/footer/page";

const DOCS = [
    {
        id: "getting-started",
        icon: <Zap size={18} />,
        title: "Getting Started",
        color: "text-blue-500",
        bg: "bg-blue-50",
        items: [
            {
                q: "How do I log in to the dashboard?",
                a: "Navigate to the login page via /auth/login. Enter your registered email and password. Owners have full access, while staff accounts have limited permissions set by the owner.",
            },
            {
                q: "What's the difference between Owner and Staff roles?",
                a: "Owners have full access to all features including reports, analytics, supplier management, and user settings. Staff accounts can access the POS and inventory but may have restricted access to financial reports.",
            },
            {
                q: "Can I use the platform on mobile?",
                a: "Yes! Marilyn's Retail Pro is fully responsive and works on any device with a modern browser — phone, tablet, or desktop. No app download required.",
            },
        ],
    },
    {
        id: "inventory",
        icon: <Package size={18} />,
        title: "Inventory Management",
        color: "text-violet-500",
        bg: "bg-violet-50",
        items: [
            {
                q: "How do I add a new product?",
                a: "Go to Inventory → click 'Add Product'. Fill in the product name, category, subcategory, selling price, market price (cost), and stock quantity. You can also upload a product image.",
            },
            {
                q: "What categories are available?",
                a: "Products are organized into main categories (e.g., Grocery, Beverages, Personal Care, Snacks) and over 30 subcategories including Canned Goods, Shampoo, Soft Drinks, Frozen Goods, and more.",
            },
            {
                q: "How does stock auto-deduction work?",
                a: "When you complete a transaction in the POS, the system automatically deducts the sold quantity from the corresponding product's stock. No manual updates needed.",
            },
        ],
    },
    {
        id: "pos",
        icon: <ShoppingCart size={18} />,
        title: "Point of Sale",
        color: "text-amber-500",
        bg: "bg-amber-50",
        items: [
            {
                q: "How do I process a sale?",
                a: "Open the POS screen. Search or browse for products, add them to the cart with quantities. Enter the amount paid by the customer — the system computes the change automatically. Tap 'Complete Sale' to record the transaction.",
            },
            {
                q: "Can I sell prepared meals (like fishball)?",
                a: "Yes! Prepared meals are a separate category in the system. You can add your fishball and other cooked items with their own pricing and stock tracking.",
            },
            {
                q: "What happens to stock when I make a sale?",
                a: "Each sale automatically deducts the quantity from inventory. You'll see updated stock levels immediately in the Inventory section after a transaction is completed.",
            },
        ],
    },
    {
        id: "suppliers",
        icon: <Users size={18} />,
        title: "Suppliers",
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        items: [
            {
                q: "How do I add a supplier?",
                a: "Go to the Suppliers section → click 'Add Supplier'. Enter the supplier's name, type (e.g., Distributor, Direct, Store), phone number, address, main items they supply, and any notes.",
            },
            {
                q: "Can I track what each supplier provides?",
                a: "Yes, each supplier record has a 'Main Items' field where you can list the products they supply. This helps you quickly find who to contact when you need to restock.",
            },
        ],
    },
    {
        id: "reports",
        icon: <BarChart3 size={18} />,
        title: "Reports & Analytics",
        color: "text-cyan-500",
        bg: "bg-cyan-50",
        items: [
            {
                q: "What analytics does the platform provide?",
                a: "The Analytics section shows revenue trends over time, top-selling products, profit margins by category, total transactions, and comparison periods so you can measure growth.",
            },
            {
                q: "How do I view my profit per sale?",
                a: "Every transaction item records the unit cost (market price) and selling price. The system automatically calculates profit per item and per transaction. View this in Sales History or Reports.",
            },
        ],
    },
    {
        id: "security",
        icon: <Shield size={18} />,
        title: "Security & Access",
        color: "text-slate-500",
        bg: "bg-slate-100",
        items: [
            {
                q: "Is my data safe?",
                a: "Yes. The platform uses Supabase as its backend, which includes Row Level Security (RLS) policies. Each user can only see data linked to their own account. All connections are encrypted via HTTPS.",
            },
            {
                q: "How do I reset my password?",
                a: "On the login page, click 'Forgot Password' and enter your email. You'll receive a password reset link. For admin-level resets, contact the platform owner.",
            },
        ],
    },
];

function DocSection({ section }: { section: typeof DOCS[0] }) {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                <div className={`w-9 h-9 rounded-xl ${section.bg} ${section.color} flex items-center justify-center`}>{section.icon}</div>
                <h2 className="font-bold text-slate-900 text-[0.97rem]">{section.title}</h2>
                <span className="ml-auto text-[0.65rem] font-bold text-slate-400">{section.items.length} topics</span>
            </div>
            <div className="divide-y divide-slate-100">
                {section.items.map((item, i) => (
                    <div key={i}>
                        <button
                            onClick={() => setOpenIdx(openIdx === i ? null : i)}
                            className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-medium text-slate-800 text-[0.88rem] leading-snug">{item.q}</span>
                            <ChevronDown size={15} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${openIdx === i ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                            {openIdx === i && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 pb-5">
                                        <div className="flex gap-3">
                                            <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-slate-500 text-[0.85rem] leading-relaxed">{item.a}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DocsPage() {
    const [search, setSearch] = useState("");

    const filtered = DOCS.map(section => ({
        ...section,
        items: section.items.filter(
            item =>
                item.q.toLowerCase().includes(search.toLowerCase()) ||
                item.a.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(s => s.items.length > 0);

    return (
        <div className="min-h-screen bg-slate-50 font-syne">
            <Navbar />
            {/* Hero */}
            <div className="bg-[#0c1322] relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-48 pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)" }} />
                <div className="max-w-[860px] mx-auto px-6 py-16 relative z-10 text-center">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
                            <Book size={12} className="text-blue-400" />
                            <span className="text-blue-400 text-[0.68rem] font-bold uppercase tracking-[0.18em]">Documentation & Help</span>
                        </div>
                        <h1 className="text-white font-black text-3xl md:text-5xl leading-tight mb-4">
                            How can we <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">help you?</span>
                        </h1>
                        <p className="text-slate-400 text-lg mb-8 max-w-[460px] mx-auto">
                            Find answers about features, setup, security, and how to get the most out of Marilyn's Retail Pro.
                        </p>
                        {/* Search */}
                        <div className="relative max-w-[480px] mx-auto">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search documentation..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-[0.9rem] font-medium outline-none transition-all"
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Docs content */}
            <div className="max-w-[860px] mx-auto px-6 py-16">
                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <HelpCircle size={40} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No results found for "{search}"</p>
                        <p className="text-slate-400 text-sm mt-1">Try different keywords or browse the sections below.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {filtered.map((section, i) => (
                            <motion.div key={section.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                                <DocSection section={section} />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Still need help */}
                <div className="mt-14 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 text-center">
                    <HelpCircle size={32} className="text-blue-500 mx-auto mb-3" />
                    <h3 className="font-black text-slate-900 text-lg mb-2">Still need help?</h3>
                    <p className="text-slate-500 text-[0.88rem] mb-5">Can't find what you're looking for? Reach out and we'll get back to you.</p>
                    <Link href="/pages/contact" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-7 py-3 rounded-xl transition-colors">
                        Contact Support <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
            <Footer />
        </div>
    );
}