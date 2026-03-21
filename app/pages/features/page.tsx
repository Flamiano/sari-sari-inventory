"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
    LayoutDashboard, Package, ShoppingCart, BarChart3,
    Users, Zap, ArrowRight, ChevronRight, Shield,
    Menu, X,
} from "lucide-react";
import Navbar from "@/app/comps/navbar/page";
import Footer from "@/app/comps/footer/page";
import DashboardFeature from "./Dashboard";
import AnalyticsFeature from "./Analytics";
import InventoryFeature from "./Inventory";
import PosFeature from "./Pos";
import StaffFeature from "./Staff";
import AuthFeature from "./Auth";

export const TABS = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard size={16} />,
        color: "#3B82F6",
        bg: "rgba(59,130,246,0.1)",
        desc: "Real-time store overview",
    },
    {
        id: "analytics",
        label: "Analytics",
        icon: <BarChart3 size={16} />,
        color: "#8B5CF6",
        bg: "rgba(139,92,246,0.1)",
        desc: "Revenue & profit insights",
    },
    {
        id: "inventory",
        label: "Inventory",
        icon: <Package size={16} />,
        color: "#10B981",
        bg: "rgba(16,185,129,0.1)",
        desc: "Product & stock control",
    },
    {
        id: "pos",
        label: "Point of Sale",
        icon: <ShoppingCart size={16} />,
        color: "#F59E0B",
        bg: "rgba(245,158,11,0.1)",
        desc: "Fast sales processing",
    },
    {
        id: "staff",
        label: "Staff & Access",
        icon: <Users size={16} />,
        color: "#EF4444",
        bg: "rgba(239,68,68,0.1)",
        desc: "Roles, CRUD & attendance",
    },
    {
        id: "auth",
        label: "Auth & Security",
        icon: <Shield size={16} />,
        color: "#6366F1",
        bg: "rgba(99,102,241,0.1)",
        desc: "Login, 2FA, MFA & reset",
    },
];

// ── Mobile Tab Drawer ──────────────────────────────────────────────────────────
function TabDrawer({
    activeTab,
    onSelect,
    onClose,
}: {
    activeTab: string;
    onSelect: (id: string) => void;
    onClose: () => void;
}) {
    const activeData = TABS.find(t => t.id === activeTab)!;

    return (
        <AnimatePresence>
            <>
                {/* Backdrop */}
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm"
                />

                {/* Drawer */}
                <motion.div
                    key="drawer"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.32, ease: [0.77, 0, 0.175, 1] }}
                    className="fixed bottom-0 left-0 right-0 z-[901] bg-white rounded-t-3xl overflow-hidden"
                    style={{ boxShadow: "0 -20px 60px rgba(0,0,0,0.18)" }}
                >
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full" style={{ background: "#E2E8F0" }} />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b"
                        style={{ borderColor: "#F1F5F9" }}>
                        <div className="flex items-center gap-2">
                            <span style={{ color: activeData.color }}>{activeData.icon}</span>
                            <span className="font-black text-base" style={{ color: "#0F172A", fontFamily: "'Familjen Grotesk',sans-serif" }}>
                                Choose Feature
                            </span>
                        </div>
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "#F1F5F9" }}>
                            <X size={15} style={{ color: "#64748B" }} />
                        </button>
                    </div>

                    {/* Tab list */}
                    <div className="px-4 py-3 space-y-2 pb-8">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { onSelect(tab.id); onClose(); }}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left"
                                    style={{
                                        background: isActive ? tab.bg : "transparent",
                                        border: `1px solid ${isActive ? tab.color + "30" : "#F1F5F9"}`,
                                    }}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: isActive ? tab.color : "#F8FAFC",
                                            color: isActive ? "white" : "#94A3B8",
                                        }}>
                                        {tab.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm" style={{ color: isActive ? tab.color : "#0F172A" }}>
                                            {tab.label}
                                        </div>
                                        <div className="text-xs" style={{ color: "#94A3B8" }}>{tab.desc}</div>
                                    </div>
                                    {isActive && (
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tab.color }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
}

export default function FeaturesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Sync tab with URL param — works on initial load AND when navbar link changes
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && TABS.find(t => t.id === tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = useCallback((id: string) => {
        setActiveTab(id);
        router.push(`/pages/features?tab=${id}`, { scroll: false });
    }, [router]);

    const activeTabData = TABS.find(t => t.id === activeTab)!;

    const renderContent = () => {
        switch (activeTab) {
            case "dashboard": return <DashboardFeature />;
            case "analytics": return <AnalyticsFeature />;
            case "inventory": return <InventoryFeature />;
            case "pos": return <PosFeature />;
            case "staff": return <StaffFeature />;
            case "auth": return <AuthFeature />;
            default: return <DashboardFeature />;
        }
    };

    return (
        <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Familjen+Grotesk:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        h1,h2,h3,h4 { font-family: 'Familjen Grotesk', sans-serif; }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

            <Navbar />

            {/* ── Hero ── */}
            <div style={{ background: "linear-gradient(135deg, #050E1F 0%, #0c1a3a 60%, #050E1F 100%)", paddingTop: "96px", position: "relative", overflow: "hidden" }}>
                {/* Grid bg */}
                <div style={{
                    position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
                    backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }} />

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-0">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs font-medium mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <Link href="/" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Home</Link>
                        <ChevronRight size={12} />
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>Features</span>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div>
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 border text-xs font-bold uppercase tracking-widest"
                                style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)", color: "#60A5FA" }}>
                                <Zap size={11} /> Platform Features
                            </motion.div>

                            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
                                className="text-white font-black leading-tight mb-4"
                                style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.9rem,5vw,3.2rem)" }}>
                                Everything your tindahan<br />
                                <span style={{ WebkitTextFillColor: "transparent", background: "linear-gradient(135deg,#60A5FA,#818CF8)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
                                    needs in one platform.
                                </span>
                            </motion.h1>

                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                                className="text-sm sm:text-base leading-relaxed"
                                style={{ color: "rgba(255,255,255,0.5)", maxWidth: 480 }}>
                                From real-time inventory and POS to analytics, staff management, and attendance tracking — built specifically for Filipino sari-sari store operations.
                            </motion.p>
                        </div>
                    </div>

                    {/* ── Desktop Tab bar ── */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="hidden lg:flex items-center gap-1 overflow-x-auto mt-10"
                        style={{ scrollbarWidth: "none" }}>
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                                    className="flex items-center gap-2 px-4 py-3 rounded-t-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 flex-shrink-0"
                                    style={{
                                        background: isActive ? "#F8FAFC" : "transparent",
                                        color: isActive ? tab.color : "rgba(255,255,255,0.5)",
                                        fontFamily: "'Outfit',sans-serif",
                                    }}>
                                    <span style={{
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        width: 28, height: 28, borderRadius: 8,
                                        background: isActive ? tab.bg : "rgba(255,255,255,0.06)",
                                        color: isActive ? tab.color : "rgba(255,255,255,0.4)",
                                        transition: "all 0.2s",
                                    }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </motion.div>

                    {/* ── Mobile: current tab pill + hamburger trigger ── */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="lg:hidden flex items-center justify-between mt-8 mb-0 pb-4">
                        {/* Active tab pill */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background: activeTabData.bg, color: activeTabData.color }}>
                                {activeTabData.icon}
                            </div>
                            <div>
                                <div className="font-bold text-sm text-white">{activeTabData.label}</div>
                                <div className="text-[0.65rem]" style={{ color: "rgba(255,255,255,0.4)" }}>{activeTabData.desc}</div>
                            </div>
                        </div>

                        {/* Hamburger open button */}
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all"
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                color: "rgba(255,255,255,0.75)",
                                fontFamily: "'Outfit',sans-serif",
                            }}>
                            <Menu size={15} />
                            <span>All Features</span>
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Mobile tab drawer */}
            {drawerOpen && (
                <TabDrawer
                    activeTab={activeTab}
                    onSelect={handleTabChange}
                    onClose={() => setDrawerOpen(false)}
                />
            )}

            {/* ── Feature content ── */}
            <div style={{ background: "#F8FAFC", minHeight: "60vh" }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Bottom CTA ── */}
            <div style={{ background: "#050E1F", padding: "80px 24px" }}>
                <div className="max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border text-xs font-bold uppercase tracking-widest"
                        style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)", color: "#60A5FA" }}>
                        <Zap size={11} /> Start Today — It's Free
                    </div>
                    <h2 className="text-white font-black leading-tight mb-4"
                        style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.7rem,4vw,2.8rem)" }}>
                        Ready to modernize your tindahan?
                    </h2>
                    <p className="mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.05rem", maxWidth: 420, margin: "0 auto 2rem" }}>
                        All features included. No credit card. No contract. Just better store management.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/auth/register"
                            className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl transition-all duration-200 text-sm"
                            style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)", color: "white", boxShadow: "0 8px 32px rgba(37,99,235,0.35)" }}>
                            Create Free Account <ArrowRight size={15} />
                        </Link>
                        <Link href="/pages/docs"
                            className="inline-flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-2xl transition-all duration-200 text-sm border"
                            style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
                            Read the Docs
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}