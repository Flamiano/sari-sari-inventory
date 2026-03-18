"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
    LayoutDashboard, Package, Users, ShoppingCart,
    BarChart3, History, X, ChevronRight, Zap,
    UserRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";

interface NavItem {
    id: string;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    accent: string;
    accentRgb: string;
    badge?: string;
}

interface SidebarProps {
    activeTab: string;
    setActiveTab: (id: string) => void;
    closeMobile: () => void;
    mounted?: boolean;
}

const NAV: NavItem[] = [
    {
        id: "dashboard",
        label: "Overview",
        sublabel: "Store at a glance",
        icon: LayoutDashboard,
        accent: "#3b82f6",
        accentRgb: "59,130,246",
    },
    {
        id: "products",
        label: "Inventory",
        sublabel: "Manage your stocks",
        icon: Package,
        accent: "#8b5cf6",
        accentRgb: "139,92,246",
        badge: "New",
    },
    {
        id: "pos",
        label: "Point of Sale",
        sublabel: "Process transactions",
        icon: ShoppingCart,
        accent: "#f59e0b",
        accentRgb: "245,158,11",
    },
    {
        id: "suppliers",
        label: "Suppliers",
        sublabel: "Vendor directory",
        icon: Users,
        accent: "#10b981",
        accentRgb: "16,185,129",
    },
    {
        id: "sales",
        label: "Sales History",
        sublabel: "All transactions",
        icon: History,
        accent: "#f43f5e",
        accentRgb: "244,63,94",
    },
    {
        id: "reports",
        label: "Analytics",
        sublabel: "Reports & insights",
        icon: BarChart3,
        accent: "#06b6d4",
        accentRgb: "6,182,212",
    },
    {
        id: "staffs",
        label: "Staff Management",
        sublabel: "Staff members",
        icon: UserRound,
        accent: "#6366f1",
        accentRgb: "99,102,241",
    },
];

export default function Sidebar({ activeTab, setActiveTab, closeMobile, mounted = true }: SidebarProps) {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [storeName, setStoreName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data: profile } = await supabase
                .from("profiles")
                .select("store_name, email")
                .eq("id", user.id)
                .single();

            if (profile) {
                setStoreName(profile.store_name ?? null);
                setUserEmail(profile.email ?? user.email ?? null);
            } else {
                setUserEmail(user.email ?? null);
            }
            setLoading(false);
        };
        getProfile();
    }, []);

    const initials = storeName
        ? storeName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
        : userEmail
            ? userEmail.slice(0, 2).toUpperCase()
            : "SS";

    const activeItem = NAV.find(n => n.id === activeTab);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');

                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes ping {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    60% { transform: scale(2); opacity: 0; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-3px); }
                }

                .sidebar-root {
                    font-family: 'DM Sans', sans-serif;
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #07090f;
                    border-right: 1px solid rgba(255,255,255,0.06);
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                }

                /* Ambient glow blobs */
                .sidebar-root::before {
                    content: '';
                    position: absolute;
                    top: -60px;
                    left: -60px;
                    width: 200px;
                    height: 200px;
                    background: radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%);
                    pointer-events: none;
                    z-index: 0;
                }
                .sidebar-root::after {
                    content: '';
                    position: absolute;
                    bottom: 80px;
                    right: -40px;
                    width: 160px;
                    height: 160px;
                    background: radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%);
                    pointer-events: none;
                    z-index: 0;
                }

                .sidebar-inner {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }

                /* Brand */
                .brand-area {
                    padding: 22px 16px 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                .logo-ring {
                    width: 38px;
                    height: 38px;
                    border-radius: 11px;
                    overflow: hidden;
                    flex-shrink: 0;
                    position: relative;
                    background: linear-gradient(135deg, #1d4ed8, #6d28d9);
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.08),
                                0 4px 16px rgba(37,99,235,0.35),
                                inset 0 1px 0 rgba(255,255,255,0.12);
                }

                .brand-text-main {
                    font-family: 'Syne', sans-serif;
                    font-weight: 900;
                    font-size: 0.92rem;
                    color: #f8fafc;
                    letter-spacing: -0.03em;
                    line-height: 1;
                }

                .brand-text-main span {
                    color: #3b82f6;
                }

                .brand-text-sub {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.48rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.22em;
                    color: #334155;
                    margin-top: 4px;
                }

                .close-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer;
                    color: #475569;
                    transition: all 0.15s;
                }
                .close-btn:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }

                /* Show X only on mobile */
                .close-btn-mobile {
                    display: flex;
                }
                @media (min-width: 768px) {
                    .close-btn-mobile {
                        display: none;
                    }
                }

                /* Section label */
                .section-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.52rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.26em;
                    color: #2d3748;
                    padding: 0 16px;
                    margin-bottom: 6px;
                }

                /* Divider */
                .divider {
                    height: 1px;
                    margin: 0 14px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
                    flex-shrink: 0;
                }

                /* Nav scroll area */
                .nav-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 8px 8px;
                    scrollbar-width: none;
                }
                .nav-scroll::-webkit-scrollbar { display: none; }

                /* Nav button */
                .nav-btn {
                    width: 100%;
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 9px 10px;
                    border-radius: 11px;
                    border: 1px solid transparent;
                    background: transparent;
                    cursor: pointer;
                    text-align: left;
                    outline: none;
                    transition: background 0.15s, border-color 0.15s;
                    margin-bottom: 1px;
                }

                .nav-btn.active {
                    border-color: rgba(255,255,255,0.07);
                }

                .nav-btn:not(.active):hover {
                    background: rgba(255,255,255,0.03);
                }

                /* Icon wrapper */
                .icon-wrap {
                    width: 32px;
                    height: 32px;
                    border-radius: 9px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }

                /* Labels */
                .nav-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    font-weight: 600;
                    line-height: 1;
                    color: #475569;
                    transition: color 0.15s;
                }
                .nav-btn.active .nav-label,
                .nav-btn:hover .nav-label {
                    color: #e2e8f0;
                }

                .nav-sublabel {
                    font-size: 0.58rem;
                    color: #1e293b;
                    margin-top: 3px;
                    line-height: 1;
                    transition: color 0.15s;
                }
                .nav-btn:hover .nav-sublabel { color: #334155; }

                /* Badge */
                .nav-badge {
                    font-size: 0.46rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    padding: 2px 7px;
                    border-radius: 99px;
                    flex-shrink: 0;
                    background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15));
                    border: 1px solid rgba(139,92,246,0.3);
                    color: #a78bfa;
                }

                /* Chevron */
                .nav-chevron {
                    flex-shrink: 0;
                    color: #1e293b;
                    transition: all 0.15s;
                    opacity: 0;
                }
                .nav-btn:hover .nav-chevron,
                .nav-btn.active .nav-chevron {
                    opacity: 1;
                    color: #334155;
                }
                .nav-btn.active .nav-chevron { transform: translateX(1px); }

                /* User card */
                .user-card {
                    margin: 0 10px 16px;
                    padding: 11px 12px;
                    border-radius: 13px;
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    flex-shrink: 0;
                    transition: background 0.15s;
                    cursor: default;
                }
                .user-card:hover {
                    background: rgba(255,255,255,0.04);
                }

                .user-avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 9px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Syne', sans-serif;
                    font-weight: 900;
                    font-size: 0.72rem;
                    color: #fff;
                    background: linear-gradient(135deg, #1d4ed8, #6d28d9);
                    box-shadow: 0 3px 10px rgba(37,99,235,0.25);
                    letter-spacing: -0.01em;
                }

                .user-name {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.76rem;
                    font-weight: 600;
                    color: #cbd5e1;
                    line-height: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    margin-bottom: 4px;
                }

                .user-email {
                    font-size: 0.58rem;
                    color: #334155;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .online-dot-wrap {
                    flex-shrink: 0;
                    position: relative;
                    width: 7px;
                    height: 7px;
                    margin-left: auto;
                }

                .online-dot-ping {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    background: #22c55e;
                    opacity: 0.5;
                    animation: ping 2s ease-in-out infinite;
                }

                .online-dot-solid {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    background: #22c55e;
                }

                /* Skeleton */
                .skeleton {
                    border-radius: 5px;
                    background: rgba(255,255,255,0.05);
                    animation: pulse 1.6s ease-in-out infinite;
                }
            `}</style>

            <aside className="sidebar-root">
                <div className="sidebar-inner">

                    {/* ── BRAND ── */}
                    <div className="brand-area">
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                            <div className="logo-ring">
                                <Image
                                    src="/images/logo.png"
                                    alt="SariSari IMS"
                                    fill
                                    style={{ objectFit: "contain" }}
                                    sizes="38px"
                                    onError={e => {
                                        const t = e.currentTarget as HTMLImageElement;
                                        t.style.display = "none";
                                    }}
                                />
                            </div>
                            <div>
                                <p className="brand-text-main">
                                    SariSari<span>.</span>IMS
                                </p>
                                <p className="brand-text-sub">Management System</p>
                            </div>
                        </div>

                        <button className="close-btn close-btn-mobile" onClick={closeMobile}>
                            <X size={13} />
                        </button>
                    </div>

                    {/* Spacer + divider */}
                    <div style={{ height: 20 }} />
                    <div className="divider" />
                    <div style={{ height: 16 }} />

                    {/* ── NAV ── */}
                    <div className="nav-scroll">
                        <p className="section-label">Navigation</p>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {NAV.map((item, i) => {
                                const Icon = item.icon;
                                const isActive = mounted && activeTab === item.id;
                                const isHovered = hoveredId === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        className={`nav-btn ${isActive ? "active" : ""}`}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            if (typeof window !== "undefined" && window.innerWidth < 768) closeMobile();
                                        }}
                                        onMouseEnter={() => setHoveredId(item.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        suppressHydrationWarning
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.25 }}
                                        style={isActive ? {
                                            background: `linear-gradient(105deg, rgba(${item.accentRgb},0.1) 0%, rgba(${item.accentRgb},0.04) 100%)`,
                                            borderColor: `rgba(${item.accentRgb},0.18)`,
                                        } : {}}
                                    >
                                        {/* Active indicator bar */}
                                        <AnimatePresence>
                                            {isActive && (
                                                <motion.span
                                                    layoutId="activeBar"
                                                    style={{
                                                        position: "absolute",
                                                        left: 0,
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        width: 3,
                                                        height: 20,
                                                        borderRadius: "0 3px 3px 0",
                                                        background: item.accent,
                                                        boxShadow: `0 0 8px ${item.accent}80`,
                                                    }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Icon */}
                                        <div
                                            className="icon-wrap"
                                            style={isActive ? {
                                                background: `rgba(${item.accentRgb},0.12)`,
                                                boxShadow: `0 0 0 1px rgba(${item.accentRgb},0.15)`,
                                            } : {
                                                background: "rgba(255,255,255,0.03)",
                                            }}
                                        >
                                            <Icon
                                                size={14}
                                                style={{
                                                    color: isActive ? item.accent : (isHovered ? "#94a3b8" : "#374151"),
                                                    transition: "color 0.15s",
                                                }}
                                            />
                                        </div>

                                        {/* Text */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p className="nav-label">{item.label}</p>
                                            <p className="nav-sublabel">{item.sublabel}</p>
                                        </div>

                                        {/* Badge or chevron */}
                                        {item.badge ? (
                                            <span className="nav-badge">{item.badge}</span>
                                        ) : (
                                            <ChevronRight size={11} className="nav-chevron" />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ marginBottom: 12 }}>
                        <div className="divider" />
                    </div>

                    {/* ── STATUS BAR ── */}
                    <div style={{ padding: "0 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <Zap size={10} style={{ color: "#22c55e", flexShrink: 0 }} />
                        <span style={{ fontSize: "0.56rem", color: "#1e3a2f", fontWeight: 600, letterSpacing: "0.04em" }}>
                            All systems operational
                        </span>
                        <div style={{ marginLeft: "auto", height: 4, width: 40, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                            <div style={{ height: "100%", width: "72%", background: "linear-gradient(90deg, #22c55e, #10b981)", borderRadius: 99 }} />
                        </div>
                    </div>

                    {/* ── USER CARD ── */}
                    <div className="user-card">
                        <div className="user-avatar">
                            {loading ? (
                                <span style={{
                                    width: 13, height: 13, borderRadius: "50%",
                                    border: "2px solid rgba(255,255,255,0.15)",
                                    borderTopColor: "#fff",
                                    display: "inline-block",
                                    animation: "spin 0.7s linear infinite",
                                }} />
                            ) : initials}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            {loading ? (
                                <>
                                    <div className="skeleton" style={{ height: 9, width: 72, marginBottom: 6 }} />
                                    <div className="skeleton" style={{ height: 7, width: 108 }} />
                                </>
                            ) : (
                                <>
                                    <p className="user-name" title={storeName ?? undefined}>
                                        {storeName ?? "My Store"}
                                    </p>
                                    <p className="user-email" title={userEmail ?? undefined}>
                                        {userEmail ?? "—"}
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="online-dot-wrap">
                            <span className="online-dot-ping" />
                            <span className="online-dot-solid" />
                        </div>
                    </div>

                </div>
            </aside>
        </>
    );
}