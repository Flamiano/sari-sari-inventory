"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import AdminDashboardHome from "./AdminDashboardHome";
import Inventory from "./Inventory";
import StaffOversight from "./StaffOversight";
import FeedbackHub from "./FeedbackHub";
import Reports from "./Reports";
import StoreOwners from "./StoreOwners";
import AdminSettings from "./settings/page";
import AdminSidebar from "@/app/comps/sidebar-admin/page";
import { Bell, ChevronRight, Menu, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const ADMIN_EMAIL = "sarisariims77@gmail.com";
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const WARN_BEFORE_MS = 30 * 1000;

const IDLE_EVENTS = [
    "mousemove", "mousedown", "keydown",
    "touchstart", "touchmove", "wheel",
    "scroll", "click",
] as const;

const NAV_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    stores: "Store Owners",
    inventory: "Inventory",
    staff: "Staff Oversight",
    feedback: "Feedback Hub",
    reports: "Reports",
    settings: "Settings",
};

function IdleWarning({ secondsLeft, onStay }: { secondsLeft: number; onStay: () => void }) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
        }}>
            <div style={{
                background: "white", borderRadius: 16, padding: "32px 36px",
                maxWidth: 380, width: "100%", textAlign: "center",
                boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                border: "1px solid #e5e7eb",
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "#fef2f2", border: "2px solid #fecaca",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                }}>
                    <span style={{ fontSize: 24 }}>⏱</span>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                    Session Expiring
                </h2>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                    You've been inactive. You'll be logged out in
                </p>
                <div style={{
                    fontSize: 40, fontWeight: 800, color: "#dc2626",
                    fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginBottom: 20,
                }}>
                    {secondsLeft}s
                </div>
                <button onClick={onStay} style={{
                    width: "100%", padding: "11px 0",
                    background: "#2563eb", color: "white",
                    border: "none", borderRadius: 10,
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>
                    Stay Logged In
                </button>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(30);
    const [accessDenied, setAccessDenied] = useState(false);
    const [checking, setChecking] = useState(true);
    const [notifCount, setNotifCount] = useState(0);
    const [mounted, setMounted] = useState(false);

    const idleTimer = useRef<NodeJS.Timeout | null>(null);
    const warnTimer = useRef<NodeJS.Timeout | null>(null);
    const countdownTimer = useRef<NodeJS.Timeout | null>(null);

    // Detect mobile & auto-close sidebar on small screens
    useEffect(() => {
        const check = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // auth guard
    useEffect(() => {
        setMounted(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) { router.replace("/auth/admin-login"); return; }
            if (session.user.email !== ADMIN_EMAIL) {
                setAccessDenied(true); setChecking(false); return;
            }
            setChecking(false);
        });
    }, []);

    // idle logout
    const doLogout = useCallback(async () => {
        clearAll();
        toast.error("Session expired. Logging out…");
        await supabase.auth.signOut();
        setTimeout(() => router.replace("/auth/admin-login"), 1200);
    }, []);

    const clearAll = () => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (warnTimer.current) clearTimeout(warnTimer.current);
        if (countdownTimer.current) clearInterval(countdownTimer.current);
    };

    const resetIdle = useCallback(() => {
        clearAll();
        setShowWarning(false);
        warnTimer.current = setTimeout(() => {
            setSecondsLeft(30);
            setShowWarning(true);
            countdownTimer.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) { clearInterval(countdownTimer.current!); doLogout(); return 0; }
                    return prev - 1;
                });
            }, 1000);
        }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);
        idleTimer.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
    }, [doLogout]);

    useEffect(() => {
        if (checking || accessDenied) return;
        resetIdle();
        IDLE_EVENTS.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
        return () => {
            clearAll();
            IDLE_EVENTS.forEach(e => window.removeEventListener(e, resetIdle));
        };
    }, [resetIdle, checking, accessDenied]);

    // feedback badge count
    useEffect(() => {
        if (checking) return;
        supabase.from("feedback")
            .select("id", { count: "exact", head: true })
            .in("status", ["open", "in_review"])
            .then(({ count }) => setNotifCount(count ?? 0));
    }, [checking]);

    // close sidebar when tab changes on mobile
    const handleSetActiveTab = (tab: string) => {
        setActiveTab(tab);
        if (isMobile) setSidebarOpen(false);
    };

    if (checking) {
        return (
            <div style={{
                minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                background: "#f5f6fa", fontFamily: "'DM Sans', sans-serif",
            }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        width: 44, height: 44, border: "3px solid #e5e7eb",
                        borderTopColor: "#2563eb", borderRadius: "50%",
                        animation: "spin 0.8s linear infinite", margin: "0 auto 14px",
                    }} />
                    <p style={{ color: "#6b7280", fontSize: 13 }}>Verifying access…</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div style={{
                minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                background: "#f5f6fa", fontFamily: "'DM Sans', sans-serif", padding: 16,
            }}>
                <div style={{
                    background: "white", borderRadius: 16, padding: "40px 48px",
                    textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    border: "1px solid #e5e7eb", width: "100%", maxWidth: 400,
                }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Access Denied</h2>
                    <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                        This area is restricted to the super admin account.
                    </p>
                    <button onClick={() => router.replace("/auth/admin-login")} style={{
                        padding: "10px 24px", background: "#2563eb", color: "white",
                        border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case "dashboard": return <AdminDashboardHome />;
            case "stores": return <StoreOwners />;
            case "inventory": return <Inventory />;
            case "staff": return <StaffOversight />;
            case "feedback": return <FeedbackHub />;
            case "reports": return <Reports />;
            case "settings": return <AdminSettings />;
            default: return <AdminDashboardHome />;
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                :root {
                    --sidebar-w: 240px;
                    --topbar-h: 56px;
                    --font: 'DM Sans', sans-serif;
                    --bg: #f1f3f8;
                    --border: #e5e7eb;
                    --text: #111827;
                    --text-3: #6b7280;
                    --blue: #2563eb;
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
                }

                body { font-family: var(--font); background: var(--bg); color: var(--text); }

                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px) }
                    to { opacity: 1; transform: translateY(0) }
                }

                .admin-layout {
                    display: flex;
                    min-height: 100vh;
                    position: relative;
                }

                /* Mobile overlay backdrop */
                .sidebar-backdrop {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.45);
                    backdrop-filter: blur(2px);
                    z-index: 99;
                }

                @media (max-width: 767px) {
                    .sidebar-backdrop.visible { display: block; }
                }

                /* sidebar wrapper */
                .admin-sidebar-wrap {
                    width: var(--sidebar-w);
                    flex-shrink: 0;
                    position: fixed;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    z-index: 100;
                    transition: transform 0.25s ease;
                }

                .admin-sidebar-wrap.collapsed {
                    transform: translateX(calc(-1 * var(--sidebar-w)));
                }

                /* main area */
                .admin-main-wrap {
                    margin-left: var(--sidebar-w);
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    transition: margin-left 0.25s ease;
                }

                .admin-main-wrap.full { margin-left: 0; }

                @media (max-width: 767px) {
                    .admin-main-wrap { margin-left: 0 !important; }
                }

                /* topbar */
                .admin-topbar {
                    height: var(--topbar-h);
                    background: white;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    padding: 0 16px;
                    gap: 10px;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    box-shadow: var(--shadow-sm);
                }

                .admin-menu-toggle {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-3);
                    flex-shrink: 0;
                    transition: all 0.13s;
                }
                .admin-menu-toggle:hover { background: var(--bg); color: var(--text); }

                .admin-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex: 1;
                    overflow: hidden;
                }

                .admin-bc-root {
                    font-size: 12px;
                    color: #9ca3af;
                    font-weight: 500;
                    flex-shrink: 0;
                }

                .admin-bc-sep { color: #9ca3af; flex-shrink: 0; }

                .admin-bc-current {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .admin-topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: auto;
                    flex-shrink: 0;
                }

                .admin-tb-icon-btn {
                    position: relative;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-3);
                    transition: all 0.13s;
                }
                .admin-tb-icon-btn:hover { background: var(--bg); color: var(--text); }

                .admin-tb-badge {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #dc2626;
                    border: 1.5px solid white;
                }

                /* page content */
                .admin-page-content {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    animation: fadeUp 0.25s ease both;
                }

                @media (max-width: 480px) {
                    .admin-page-content { padding: 14px; }
                    .admin-topbar { padding: 0 12px; }
                }
            `}</style>

            <Toaster position="top-right" />

            {showWarning && (
                <IdleWarning
                    secondsLeft={secondsLeft}
                    onStay={() => { setShowWarning(false); resetIdle(); }}
                />
            )}

            <div className="admin-layout">
                {/* Mobile backdrop */}
                <div
                    className={`sidebar-backdrop ${sidebarOpen && isMobile ? "visible" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                />

                {/* sidebar */}
                <div className={`admin-sidebar-wrap ${sidebarOpen ? "" : "collapsed"}`}>
                    <AdminSidebar
                        activeTab={activeTab}
                        setActiveTab={handleSetActiveTab}
                        closeMobile={() => setSidebarOpen(false)}
                        mounted={mounted}
                        notifCount={notifCount}
                    />
                </div>

                {/* main */}
                <div className={`admin-main-wrap ${sidebarOpen && !isMobile ? "" : "full"}`}>
                    <div className="admin-topbar">
                        <button className="admin-menu-toggle" onClick={() => setSidebarOpen(p => !p)}>
                            {sidebarOpen && !isMobile ? <X size={15} /> : <Menu size={15} />}
                        </button>

                        <div className="admin-breadcrumb">
                            <span className="admin-bc-root">Admin</span>
                            <ChevronRight size={12} className="admin-bc-sep" />
                            <span className="admin-bc-current">{NAV_LABELS[activeTab] ?? "Dashboard"}</span>
                        </div>

                        <div className="admin-topbar-right">
                            <button
                                className="admin-tb-icon-btn"
                                onClick={() => handleSetActiveTab("feedback")}
                                title="Feedback"
                            >
                                <Bell size={14} />
                                {notifCount > 0 && <span className="admin-tb-badge" />}
                            </button>
                        </div>
                    </div>

                    <div className="admin-page-content" key={activeTab}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </>
    );
}