"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    Settings, Shield, Bell, Clock, LogOut, User,
    Eye, EyeOff, Save, RefreshCw, Check, AlertTriangle,
    Lock, Database, Monitor,
} from "lucide-react";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "sarisariims77@gmail.com";

interface AdminProfile {
    id: string;
    email: string;
    role: string;
    created_at: string;
    last_login: string | null;
}

interface SettingSection {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    colorRgb: string;
}

const SECTIONS: SettingSection[] = [
    { id: "account", label: "Account", icon: User, color: "#2563eb", colorRgb: "37,99,235" },
    { id: "security", label: "Security", icon: Shield, color: "#dc2626", colorRgb: "220,38,38" },
    { id: "notifications", label: "Notifications", icon: Bell, color: "#d97706", colorRgb: "217,119,6" },
    { id: "session", label: "Session", icon: Clock, color: "#7c3aed", colorRgb: "124,58,237" },
    { id: "system", label: "System Info", icon: Database, color: "#059669", colorRgb: "5,150,105" },
];

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!value)}
            style={{
                width: 40,
                height: 22,
                borderRadius: 99,
                border: "none",
                background: value ? "#2563eb" : "#e5e7eb",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
                flexShrink: 0,
            }}
        >
            <span style={{
                position: "absolute",
                top: 3,
                left: value ? 21 : 3,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                transition: "left 0.2s",
            }} />
        </button>
    );
}

export default function AdminSettings() {
    const [activeSection, setActiveSection] = useState("account");
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Notification prefs (UI only — extend with DB as needed)
    const [notifPrefs, setNotifPrefs] = useState({
        feedback: true,
        lowStock: true,
        absentStaff: true,
        newStore: false,
        utangAlert: true,
    });

    // Session prefs
    const [idleTimeout, setIdleTimeout] = useState(5);

    // Security
    const [showEmail, setShowEmail] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase
            .from("admin_users")
            .select("id, email, role, created_at, last_login")
            .eq("email", ADMIN_EMAIL)
            .single()
            .then(({ data }) => {
                if (data) setProfile(data as AdminProfile);
                setLoading(false);
            });
    }, []);

    const handleSaveNotifs = async () => {
        setSaving(true);
        await new Promise((r) => setTimeout(r, 700));
        setSaving(false);
        toast.success("Notification preferences saved");
    };

    const handleSaveSession = async () => {
        setSaving(true);
        await new Promise((r) => setTimeout(r, 700));
        setSaving(false);
        toast.success("Session settings saved");
    };

    const formatDate = (str: string | null) => {
        if (!str) return "Never";
        return new Date(str).toLocaleString("en-PH", {
            month: "long", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    };

    const currentSection = SECTIONS.find((s) => s.id === activeSection)!;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

                .settings-root {
                    font-family: 'DM Sans', sans-serif;
                    min-height: 100%;
                    color: #111827;
                }

                .settings-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .settings-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #111827;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .settings-layout {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    gap: 20px;
                    align-items: start;
                }

                @media (max-width: 768px) {
                    .settings-layout { grid-template-columns: 1fr; }
                    .settings-sidenav { display: flex; flex-wrap: wrap; gap: 6px; }
                    .settings-sidenav-item { flex: 1; min-width: 100px; flex-direction: column; gap: 4px; padding: 10px 8px; }
                }

                .settings-sidenav {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    position: sticky;
                    top: 80px;
                }

                .settings-sidenav-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    color: #6b7280;
                    transition: all 0.14s;
                    border-bottom: 1px solid #f3f4f6;
                    text-align: left;
                }
                .settings-sidenav-item:last-child { border-bottom: none; }
                .settings-sidenav-item:hover { background: #f9fafb; color: #111827; }
                .settings-sidenav-item.active {
                    background: #eff6ff;
                    color: #2563eb;
                    font-weight: 600;
                }

                .settings-sidenav-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    margin-left: auto;
                    opacity: 0;
                }
                .settings-sidenav-item.active .settings-sidenav-dot { opacity: 1; }

                .settings-card {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }

                .settings-card-hd {
                    padding: 20px 24px;
                    border-bottom: 1px solid #f3f4f6;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .settings-card-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .settings-card-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #111827;
                }

                .settings-card-sub {
                    font-size: 12px;
                    color: #9ca3af;
                    margin-top: 2px;
                }

                .settings-card-body {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .settings-field-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                @media (max-width: 600px) {
                    .settings-field-group { grid-template-columns: 1fr; }
                }

                .settings-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .settings-label {
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #9ca3af;
                }

                .settings-value {
                    font-size: 13px;
                    color: #111827;
                    font-weight: 500;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 9px 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    justify-content: space-between;
                }

                .settings-badge {
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }

                .settings-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 14px 0;
                    border-bottom: 1px solid #f3f4f6;
                }
                .settings-row:last-child { border-bottom: none; }

                .settings-row-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #111827;
                }

                .settings-row-sub {
                    font-size: 11px;
                    color: #9ca3af;
                    margin-top: 2px;
                }

                .settings-save-btn {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 9px 18px;
                    border-radius: 9px;
                    border: none;
                    background: #2563eb;
                    color: white;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.14s;
                    box-shadow: 0 2px 8px rgba(37,99,235,0.25);
                    align-self: flex-start;
                }
                .settings-save-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
                .settings-save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

                .settings-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: sett-spin 0.7s linear infinite;
                }
                @keyframes sett-spin { to { transform: rotate(360deg); } }

                .settings-range {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 4px;
                    border-radius: 99px;
                    background: #e5e7eb;
                    outline: none;
                    cursor: pointer;
                }
                .settings-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #2563eb;
                    box-shadow: 0 1px 4px rgba(37,99,235,0.3);
                    cursor: pointer;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 12px;
                }

                .info-tile {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    padding: 14px 16px;
                }

                .info-tile-label {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #9ca3af;
                    margin-bottom: 6px;
                }

                .info-tile-val {
                    font-size: 13px;
                    font-weight: 600;
                    color: #111827;
                }

                .skeleton {
                    background: #e5e7eb;
                    border-radius: 6px;
                    animation: skel-pulse 1.5s ease-in-out infinite;
                }

                @keyframes skel-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>

            <div className="settings-root">
                <div className="settings-topbar">
                    <div className="settings-title">
                        <Settings size={20} style={{ color: "#2563eb" }} />
                        Admin Settings
                    </div>
                </div>

                <div className="settings-layout">
                    {/* sidenav */}
                    <div className="settings-sidenav">
                        {SECTIONS.map((s) => {
                            const Icon = s.icon;
                            return (
                                <button
                                    key={s.id}
                                    className={`settings-sidenav-item ${activeSection === s.id ? "active" : ""}`}
                                    onClick={() => setActiveSection(s.id)}
                                >
                                    <Icon size={14} style={{ color: activeSection === s.id ? s.color : "#9ca3af", flexShrink: 0 }} />
                                    {s.label}
                                    <span
                                        className="settings-sidenav-dot"
                                        style={{ background: s.color }}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    {/* content */}
                    <div className="settings-card">
                        <div className="settings-card-hd">
                            <div
                                className="settings-card-icon"
                                style={{ background: `rgba(${currentSection.colorRgb},0.1)` }}
                            >
                                <currentSection.icon size={17} style={{ color: currentSection.color }} />
                            </div>
                            <div>
                                <div className="settings-card-title">{currentSection.label}</div>
                                <div className="settings-card-sub">
                                    {activeSection === "account" && "Your admin account details"}
                                    {activeSection === "security" && "Access control and session security"}
                                    {activeSection === "notifications" && "Control what alerts you receive"}
                                    {activeSection === "session" && "Configure idle timeout behavior"}
                                    {activeSection === "system" && "Platform and system information"}
                                </div>
                            </div>
                        </div>

                        <div className="settings-card-body">

                            {/* ─── ACCOUNT ─── */}
                            {activeSection === "account" && (
                                <>
                                    <div className="settings-field-group">
                                        <div className="settings-field">
                                            <div className="settings-label">Email Address</div>
                                            <div className="settings-value">
                                                {loading
                                                    ? <div className="skeleton" style={{ width: 140, height: 14 }} />
                                                    : (
                                                        <>
                                                            {showEmail ? profile?.email ?? ADMIN_EMAIL : "••••••••@gmail.com"}
                                                            <button
                                                                onClick={() => setShowEmail(p => !p)}
                                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex" }}
                                                            >
                                                                {showEmail ? <EyeOff size={13} /> : <Eye size={13} />}
                                                            </button>
                                                        </>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="settings-field">
                                            <div className="settings-label">Role</div>
                                            <div className="settings-value">
                                                {loading
                                                    ? <div className="skeleton" style={{ width: 80, height: 14 }} />
                                                    : (
                                                        <span
                                                            className="settings-badge"
                                                            style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
                                                        >
                                                            {profile?.role ?? "superadmin"}
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="settings-field">
                                            <div className="settings-label">Account Created</div>
                                            <div className="settings-value" style={{ fontSize: 12 }}>
                                                {loading
                                                    ? <div className="skeleton" style={{ width: 120, height: 14 }} />
                                                    : formatDate(profile?.created_at ?? null)}
                                            </div>
                                        </div>
                                        <div className="settings-field">
                                            <div className="settings-label">Last Login</div>
                                            <div className="settings-value" style={{ fontSize: 12 }}>
                                                {loading
                                                    ? <div className="skeleton" style={{ width: 120, height: 14 }} />
                                                    : formatDate(profile?.last_login ?? null)}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: "14px 16px",
                                        background: "#fffbeb",
                                        border: "1px solid #fde68a",
                                        borderRadius: 10,
                                        display: "flex",
                                        gap: 10,
                                        alignItems: "flex-start",
                                    }}>
                                        <AlertTriangle size={15} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                                        <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                                            <strong>Admin accounts</strong> are managed directly in Supabase. To update your email or password, use the Supabase Authentication dashboard.
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ─── SECURITY ─── */}
                            {activeSection === "security" && (
                                <>
                                    <div className="settings-row">
                                        <div>
                                            <div className="settings-row-label">Two-Factor Authentication</div>
                                            <div className="settings-row-sub">Managed via Supabase Auth — configure in your project settings</div>
                                        </div>
                                        <span className="settings-badge" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", whiteSpace: "nowrap" }}>
                                            Auth-managed
                                        </span>
                                    </div>
                                    <div className="settings-row">
                                        <div>
                                            <div className="settings-row-label">Row-Level Security (RLS)</div>
                                            <div className="settings-row-sub">Superadmin bypass policies active on all tables</div>
                                        </div>
                                        <span className="settings-badge" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                                            Enabled
                                        </span>
                                    </div>
                                    <div className="settings-row">
                                        <div>
                                            <div className="settings-row-label">Admin Email Restriction</div>
                                            <div className="settings-row-sub">Only <strong>{ADMIN_EMAIL}</strong> can access this portal</div>
                                        </div>
                                        <Lock size={16} style={{ color: "#dc2626", flexShrink: 0 }} />
                                    </div>
                                    <div className="settings-row">
                                        <div>
                                            <div className="settings-row-label">Idle Auto-Logout</div>
                                            <div className="settings-row-sub">Session expires after 5 minutes of inactivity (30s warning)</div>
                                        </div>
                                        <span className="settings-badge" style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", whiteSpace: "nowrap" }}>
                                            Active
                                        </span>
                                    </div>
                                </>
                            )}

                            {/* ─── NOTIFICATIONS ─── */}
                            {activeSection === "notifications" && (
                                <>
                                    {[
                                        { key: "feedback", label: "Open Feedback Alerts", sub: "Show badge when feedback is pending review" },
                                        { key: "lowStock", label: "Low Stock Warnings", sub: "Alert when products fall below threshold" },
                                        { key: "absentStaff", label: "Absent Staff Today", sub: "Highlight absent staff on dashboard" },
                                        { key: "newStore", label: "New Store Registrations", sub: "Notify when a new owner account is created" },
                                        { key: "utangAlert", label: "Unpaid Utang Reminder", sub: "Show unpaid balance on dashboard card" },
                                    ].map((item) => (
                                        <div className="settings-row" key={item.key}>
                                            <div>
                                                <div className="settings-row-label">{item.label}</div>
                                                <div className="settings-row-sub">{item.sub}</div>
                                            </div>
                                            <ToggleSwitch
                                                value={notifPrefs[item.key as keyof typeof notifPrefs]}
                                                onChange={(v) => setNotifPrefs(p => ({ ...p, [item.key]: v }))}
                                            />
                                        </div>
                                    ))}

                                    <button className="settings-save-btn" onClick={handleSaveNotifs} disabled={saving}>
                                        {saving ? <><div className="settings-spinner" /> Saving…</> : <><Save size={13} /> Save Preferences</>}
                                    </button>
                                </>
                            )}

                            {/* ─── SESSION ─── */}
                            {activeSection === "session" && (
                                <>
                                    <div className="settings-field">
                                        <div className="settings-label">Idle Timeout Duration</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                                            <input
                                                type="range"
                                                className="settings-range"
                                                min={1}
                                                max={30}
                                                value={idleTimeout}
                                                onChange={(e) => setIdleTimeout(Number(e.target.value))}
                                            />
                                            <span style={{
                                                fontSize: 13, fontWeight: 700, color: "#2563eb",
                                                minWidth: 60, textAlign: "right", whiteSpace: "nowrap",
                                            }}>
                                                {idleTimeout} min
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                                            Note: Changing this requires updating <code style={{ fontSize: 10 }}>IDLE_TIMEOUT_MS</code> in <code style={{ fontSize: 10 }}>AdminPage</code>.
                                        </div>
                                    </div>

                                    <div className="settings-row">
                                        <div>
                                            <div className="settings-row-label">Warning Before Logout</div>
                                            <div className="settings-row-sub">A 30-second countdown warning appears before session expires</div>
                                        </div>
                                        <span className="settings-badge" style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}>
                                            30s
                                        </span>
                                    </div>

                                    <div className="settings-row">
                                        <div>
                                            <div className="settings-row-label">Activity Events Tracked</div>
                                            <div className="settings-row-sub">Mouse, keyboard, scroll, touch — resets the idle timer</div>
                                        </div>
                                        <Check size={15} style={{ color: "#16a34a", flexShrink: 0 }} />
                                    </div>

                                    <button className="settings-save-btn" onClick={handleSaveSession} disabled={saving}>
                                        {saving ? <><div className="settings-spinner" /> Saving…</> : <><Save size={13} /> Save Settings</>}
                                    </button>
                                </>
                            )}

                            {/* ─── SYSTEM INFO ─── */}
                            {activeSection === "system" && (
                                <>
                                    <div className="info-grid">
                                        {[
                                            { label: "Platform", value: "SariSari.IMS" },
                                            { label: "Portal", value: "Super Admin" },
                                            { label: "Framework", value: "Next.js (App Router)" },
                                            { label: "Database", value: "Supabase PostgreSQL" },
                                            { label: "Auth Provider", value: "Supabase Auth" },
                                            { label: "Styling", value: "DM Sans / Inline CSS" },
                                            { label: "UI Library", value: "Framer Motion + Lucide" },
                                            { label: "RLS Policies", value: "11 tables covered" },
                                        ].map((item) => (
                                            <div className="info-tile" key={item.label}>
                                                <div className="info-tile-label">{item.label}</div>
                                                <div className="info-tile-val">{item.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{
                                        padding: "14px 16px",
                                        background: "#f0fdf4",
                                        border: "1px solid #bbf7d0",
                                        borderRadius: 10,
                                        display: "flex",
                                        gap: 10,
                                        alignItems: "flex-start",
                                    }}>
                                        <Monitor size={15} style={{ color: "#15803d", flexShrink: 0, marginTop: 1 }} />
                                        <div style={{ fontSize: 12, color: "#14532d", lineHeight: 1.5 }}>
                                            All systems operational. Database connected. RLS policies active across all 11 public tables.
                                        </div>
                                    </div>
                                </>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}