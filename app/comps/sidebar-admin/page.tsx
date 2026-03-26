"use client";

import { useState } from "react";
import {
    LayoutDashboard, Store, Package, Users,
    ShieldAlert, FileText, LogOut, X, ChevronRight,
    HelpCircle, Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import SignOutModal from "@/app/comps/signoutmodal/page";
import HelpModal from "@/app/comps/help/HelpModal";

interface NavItem {
    id: string;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    accent: string;
    accentRgb: string;
}

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (id: string) => void;
    closeMobile: () => void;
    mounted?: boolean;
    notifCount?: number;
}

const NAV: NavItem[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        sublabel: "Platform overview",
        icon: LayoutDashboard,
        accent: "#3b82f6",
        accentRgb: "59,130,246",
    },
    {
        id: "stores",
        label: "Store Owners",
        sublabel: "Owner accounts",
        icon: Store,
        accent: "#10b981",
        accentRgb: "16,185,129",
    },
    {
        id: "inventory",
        label: "Inventory",
        sublabel: "All store products",
        icon: Package,
        accent: "#8b5cf6",
        accentRgb: "139,92,246",
    },
    {
        id: "staff",
        label: "Staff Oversight",
        sublabel: "All staff members",
        icon: Users,
        accent: "#f59e0b",
        accentRgb: "245,158,11",
    },
    {
        id: "feedback",
        label: "Feedback Hub",
        sublabel: "User feedback",
        icon: ShieldAlert,
        accent: "#f43f5e",
        accentRgb: "244,63,94",
    },
    {
        id: "reports",
        label: "Reports",
        sublabel: "Analytics & insights",
        icon: FileText,
        accent: "#06b6d4",
        accentRgb: "6,182,212",
    },
];

const ADMIN_EMAIL = "sarisariims77@gmail.com";

export default function AdminSidebar({
    activeTab,
    setActiveTab,
    closeMobile,
    mounted = true,
    notifCount = 0,
}: AdminSidebarProps) {
    const router = useRouter();
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [showSignOut, setShowSignOut] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/auth/admin-login");
    };

    const handleNav = (id: string) => {
        setActiveTab(id);
        if (typeof window !== "undefined" && window.innerWidth < 768) closeMobile();
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');

                @keyframes admin-ping {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    60%       { transform: scale(2); opacity: 0;   }
                }

                /* ── root ── */
                .admin-sidebar-root {
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

                /* ambient glow blobs */
                .admin-sidebar-root::before {
                    content: '';
                    position: absolute;
                    top: -60px; left: -60px;
                    width: 200px; height: 200px;
                    background: radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%);
                    pointer-events: none; z-index: 0;
                }
                .admin-sidebar-root::after {
                    content: '';
                    position: absolute;
                    bottom: 80px; right: -40px;
                    width: 160px; height: 160px;
                    background: radial-gradient(circle, rgba(244,63,94,0.05) 0%, transparent 70%);
                    pointer-events: none; z-index: 0;
                }

                .admin-sidebar-inner {
                    position: relative; z-index: 1;
                    display: flex; flex-direction: column;
                    height: 100%;
                }

                /* ── brand ── */
                .admin-brand-area {
                    padding: 22px 16px 0;
                    display: flex; align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                .admin-logo-ring {
                    width: 38px; height: 38px; border-radius: 11px;
                    flex-shrink: 0;
                    background: linear-gradient(135deg, #1d4ed8, #6d28d9);
                    display: flex; align-items: center; justify-content: center;
                    box-shadow:
                        0 0 0 1px rgba(255,255,255,0.08),
                        0 4px 16px rgba(37,99,235,0.35),
                        inset 0 1px 0 rgba(255,255,255,0.12);
                }

                .admin-brand-text-main {
                    font-family: 'Syne', sans-serif;
                    font-weight: 900; font-size: 0.92rem;
                    color: #f8fafc; letter-spacing: -0.03em; line-height: 1;
                }
                .admin-brand-text-main span { color: #3b82f6; }

                .admin-brand-text-sub {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.48rem; font-weight: 600;
                    text-transform: uppercase; letter-spacing: 0.22em;
                    color: #f43f5e; margin-top: 4px;
                }

                .admin-close-btn {
                    width: 28px; height: 28px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer; color: #475569; transition: all 0.15s;
                }
                .admin-close-btn:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }
                .admin-close-mobile { display: flex; }
                @media (min-width: 768px) { .admin-close-mobile { display: none; } }

                /* ── divider / section label ── */
                .admin-section-label {
                    font-size: 0.52rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.26em;
                    color: #2d3748; padding: 0 16px; margin-bottom: 6px;
                }

                .admin-divider {
                    height: 1px; margin: 0 14px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
                    flex-shrink: 0;
                }

                /* ── nav scroll ── */
                .admin-nav-scroll {
                    flex: 1; overflow-y: auto;
                    padding: 0 8px 8px;
                    scrollbar-width: none;
                }
                .admin-nav-scroll::-webkit-scrollbar { display: none; }

                /* ── nav buttons ── */
                .admin-nav-btn {
                    width: 100%; position: relative;
                    display: flex; align-items: center; gap: 11px;
                    padding: 9px 10px; border-radius: 11px;
                    border: 1px solid transparent; background: transparent;
                    cursor: pointer; text-align: left; outline: none;
                    transition: background 0.15s, border-color 0.15s;
                    margin-bottom: 1px;
                }
                .admin-nav-btn.active       { border-color: rgba(255,255,255,0.07); }
                .admin-nav-btn:not(.active):hover { background: rgba(255,255,255,0.03); }

                .admin-icon-wrap {
                    width: 32px; height: 32px; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; transition: all 0.2s;
                }

                .admin-nav-label {
                    font-size: 0.8rem; font-weight: 600;
                    line-height: 1; color: #475569; transition: color 0.15s;
                }
                .admin-nav-btn.active .admin-nav-label,
                .admin-nav-btn:hover  .admin-nav-label { color: #e2e8f0; }

                .admin-nav-sublabel {
                    font-size: 0.58rem; color: #1e293b;
                    margin-top: 3px; line-height: 1; transition: color 0.15s;
                }
                .admin-nav-btn:hover .admin-nav-sublabel { color: #334155; }

                .admin-notif-badge {
                    font-size: 0.52rem; font-weight: 800;
                    padding: 2px 7px; border-radius: 99px; flex-shrink: 0;
                    background: linear-gradient(135deg, rgba(244,63,94,0.2), rgba(244,63,94,0.1));
                    border: 1px solid rgba(244,63,94,0.3); color: #fb7185;
                }

                .admin-nav-chevron {
                    flex-shrink: 0; color: #1e293b;
                    transition: all 0.15s; opacity: 0;
                }
                .admin-nav-btn:hover .admin-nav-chevron,
                .admin-nav-btn.active .admin-nav-chevron { opacity: 1; color: #334155; }
                .admin-nav-btn.active .admin-nav-chevron { transform: translateX(1px); }

                /* ── help + settings utility row ── */
                .admin-util-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                    margin: 0 10px 10px;
                    flex-shrink: 0;
                }

                .admin-util-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    padding: 10px 8px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(255,255,255,0.03);
                    cursor: pointer;
                    transition: background 0.15s, border-color 0.15s;
                    font-family: 'DM Sans', sans-serif;
                }
                .admin-util-btn:hover {
                    background: rgba(255,255,255,0.07);
                    border-color: rgba(255,255,255,0.12);
                }

                .admin-util-icon {
                    width: 28px; height: 28px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                }

                .admin-util-label {
                    font-size: 0.58rem;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                }

                /* ── user card ── */
                .admin-user-card {
                    margin: 0 10px 8px;
                    padding: 11px 12px; border-radius: 13px;
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.05);
                    display: flex; align-items: center; gap: 11px;
                    flex-shrink: 0;
                }

                .admin-user-avatar {
                    width: 34px; height: 34px; border-radius: 9px;
                    flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Syne', sans-serif; font-weight: 900;
                    font-size: 0.72rem; color: #fff;
                    background: linear-gradient(135deg, #dc2626, #9333ea);
                    box-shadow: 0 3px 10px rgba(220,38,38,0.25);
                }

                .admin-user-name {
                    font-size: 0.76rem; font-weight: 600; color: #cbd5e1;
                    line-height: 1; overflow: hidden;
                    text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px;
                }

                .admin-user-email {
                    font-size: 0.58rem; color: #334155;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }

                .admin-online-dot-wrap {
                    flex-shrink: 0; position: relative;
                    width: 7px; height: 7px; margin-left: auto;
                }
                .admin-online-ping {
                    position: absolute; inset: 0; border-radius: 50%;
                    background: #22c55e; opacity: 0.5;
                    animation: admin-ping 2s ease-in-out infinite;
                }
                .admin-online-solid {
                    position: absolute; inset: 0; border-radius: 50%;
                    background: #22c55e;
                }

                /* ── logout ── */
                .admin-logout-btn {
                    margin: 0 10px 16px;
                    padding: 9px 12px; border-radius: 10px;
                    border: 1px solid rgba(244,63,94,0.15);
                    background: rgba(244,63,94,0.06);
                    display: flex; align-items: center; gap: 8px;
                    cursor: pointer; font-family: 'DM Sans', sans-serif;
                    font-size: 0.75rem; font-weight: 600; color: #f87171;
                    transition: all 0.15s; flex-shrink: 0; width: calc(100% - 20px);
                }
                .admin-logout-btn:hover {
                    background: rgba(244,63,94,0.12);
                    border-color: rgba(244,63,94,0.3);
                    color: #fca5a5;
                }
            `}</style>

            <aside className="admin-sidebar-root">
                <div className="admin-sidebar-inner">

                    {/* ── Brand ── */}
                    <div className="admin-brand-area">
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                            <div className="admin-logo-ring">
                                <Store size={18} color="white" />
                            </div>
                            <div>
                                <p className="admin-brand-text-main">SariSari<span>.</span>IMS</p>
                                <p className="admin-brand-text-sub">Super Admin</p>
                            </div>
                        </div>
                        <button className="admin-close-btn admin-close-mobile" onClick={closeMobile}>
                            <X size={13} />
                        </button>
                    </div>

                    <div style={{ height: 20 }} />
                    <div className="admin-divider" />
                    <div style={{ height: 16 }} />

                    {/* ── Nav ── */}
                    <div className="admin-nav-scroll">
                        <p className="admin-section-label">Main Menu</p>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {NAV.map((item, i) => {
                                const Icon = item.icon;
                                const isActive = mounted && activeTab === item.id;
                                const isHovered = hoveredId === item.id;
                                const showBadge = item.id === "feedback" && notifCount > 0;

                                return (
                                    <motion.button
                                        key={item.id}
                                        className={`admin-nav-btn ${isActive ? "active" : ""}`}
                                        onClick={() => handleNav(item.id)}
                                        onMouseEnter={() => setHoveredId(item.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.25 }}
                                        style={isActive ? {
                                            background: `linear-gradient(105deg, rgba(${item.accentRgb},0.1) 0%, rgba(${item.accentRgb},0.04) 100%)`,
                                            borderColor: `rgba(${item.accentRgb},0.18)`,
                                        } : {}}
                                    >
                                        {/* active bar */}
                                        <AnimatePresence>
                                            {isActive && (
                                                <motion.span
                                                    layoutId="adminActiveBar"
                                                    style={{
                                                        position: "absolute", left: 0,
                                                        top: "50%", transform: "translateY(-50%)",
                                                        width: 3, height: 20,
                                                        borderRadius: "0 3px 3px 0",
                                                        background: item.accent,
                                                        boxShadow: `0 0 8px ${item.accent}80`,
                                                    }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* icon */}
                                        <div
                                            className="admin-icon-wrap"
                                            style={isActive
                                                ? { background: `rgba(${item.accentRgb},0.12)`, boxShadow: `0 0 0 1px rgba(${item.accentRgb},0.15)` }
                                                : { background: "rgba(255,255,255,0.03)" }
                                            }
                                        >
                                            <Icon size={14} style={{
                                                color: isActive ? item.accent : (isHovered ? "#94a3b8" : "#374151"),
                                                transition: "color 0.15s",
                                            }} />
                                        </div>

                                        {/* text */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p className="admin-nav-label">{item.label}</p>
                                            <p className="admin-nav-sublabel">{item.sublabel}</p>
                                        </div>

                                        {/* badge / chevron */}
                                        {showBadge
                                            ? <span className="admin-notif-badge">{notifCount}</span>
                                            : <ChevronRight size={11} className="admin-nav-chevron" />
                                        }
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Divider ── */}
                    <div style={{ marginBottom: 12 }}>
                        <div className="admin-divider" />
                    </div>

                    {/* ── Help + Settings ── */}
                    <div className="admin-util-row">
                        <button
                            className="admin-util-btn"
                            onClick={() => setShowHelp(true)}
                            title="Help"
                        >
                            <div className="admin-util-icon" style={{ background: "rgba(59,130,246,0.12)" }}>
                                <HelpCircle size={14} style={{ color: "#60a5fa" }} />
                            </div>
                            <span className="admin-util-label" style={{ color: "#60a5fa" }}>Help</span>
                        </button>

                        <button
                            className="admin-util-btn"
                            onClick={() => handleNav("settings")}
                            title="Settings"
                        >
                            <div className="admin-util-icon" style={{ background: "rgba(139,92,246,0.12)" }}>
                                <Settings size={14} style={{ color: "#a78bfa" }} />
                            </div>
                            <span className="admin-util-label" style={{ color: "#a78bfa" }}>Settings</span>
                        </button>
                    </div>

                    {/* ── User card ── */}
                    <div className="admin-user-card">
                        <div className="admin-user-avatar">SA</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="admin-user-name">Superadmin</p>
                            <p className="admin-user-email">{ADMIN_EMAIL}</p>
                        </div>
                        <div className="admin-online-dot-wrap">
                            <span className="admin-online-ping" />
                            <span className="admin-online-solid" />
                        </div>
                    </div>

                    {/* ── Sign out (opens modal) ── */}
                    <button className="admin-logout-btn" onClick={() => setShowSignOut(true)}>
                        <LogOut size={13} />
                        Sign Out
                    </button>

                </div>
            </aside>

            {/* Modals */}
            <SignOutModal
                isOpen={showSignOut}
                onClose={() => setShowSignOut(false)}
                onConfirm={handleLogout}
            />

            <HelpModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
            />
        </>
    );
}