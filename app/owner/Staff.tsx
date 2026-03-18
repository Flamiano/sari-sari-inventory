"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/utils/supabase";
import {
    UserRound, Plus, X, Check, Loader2, Trash2,
    Pencil, Phone, Mail,
    KeyRound, Search, MoreVertical, UserX, UserCheck,
    BadgeCheck, ChevronRight, Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────

type StaffRole = "staff" | "cashier";
type StaffStatus = "active" | "inactive" | "pending";

interface StaffMember {
    id: string;
    owner_id: string;
    staff_user_id: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    pin_code: string | null;
    role: StaffRole;
    status: StaffStatus;
    avatar_url: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

type FormData = {
    full_name: string;
    email: string;
    phone: string;
    pin_code: string;
    role: StaffRole;
    status: StaffStatus;
    notes: string;
};

// ─── Helpers ─────────────────────────────────────────────────

const ROLE_META: Record<StaffRole, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    cashier: { label: "Cashier", color: "text-teal-700", bg: "bg-teal-100", icon: BadgeCheck },
    staff: { label: "Staff", color: "text-orange-700", bg: "bg-orange-100", icon: UserRound },
};

const STATUS_META: Record<StaffStatus, { label: string; dot: string }> = {
    active: { label: "Active", dot: "bg-emerald-500" },
    inactive: { label: "Inactive", dot: "bg-slate-300" },
    pending: { label: "Pending", dot: "bg-amber-400" },
};

/** Masks email: jo****17@gmail.com */
function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    if (local.length <= 4) return `${local[0]}****@${domain}`;
    const start = local.slice(0, 2);
    const end = local.slice(-2);
    return `${start}****${end}@${domain}`;
}

/** Strips non-digits, auto-prepends 0, max 11 digits */
function formatPHPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    const withZero = digits.startsWith("0") ? digits : "0" + digits;
    return withZero.slice(0, 11);
}

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
    "from-teal-500 to-cyan-600",
    "from-orange-500 to-amber-500",
    "from-rose-500 to-orange-500",
    "from-cyan-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-cyan-600",
];

function avatarGradient(name: string) {
    const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl ${className ?? ""}`} />;
}

// ─── Philippine Flag SVG ──────────────────────────────────────

function PHFlag() {
    return (
        <svg viewBox="0 0 20 14" width="20" height="14" className="rounded-sm shrink-0" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="7" fill="#0038A8" />
            <rect y="7" width="20" height="7" fill="#CE1126" />
            <polygon points="0,0 10,7 0,14" fill="white" />
            <circle cx="3.8" cy="7" r="1.3" fill="#FCD116" />
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * 45 * Math.PI) / 180;
                const x1 = 3.8 + 1.5 * Math.cos(angle);
                const y1 = 7 + 1.5 * Math.sin(angle);
                const x2 = 3.8 + 2.2 * Math.cos(angle);
                const y2 = 7 + 2.2 * Math.sin(angle);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FCD116" strokeWidth="0.5" />;
            })}
            {([{ cx: 1.3, cy: 2.2 }, { cx: 1.3, cy: 11.8 }, { cx: 6.8, cy: 7 }] as { cx: number; cy: number }[]).map((s, i) => (
                <text key={i} x={s.cx} y={s.cy} fontSize="1.6" fill="#FCD116" textAnchor="middle" dominantBaseline="middle">★</text>
            ))}
        </svg>
    );
}

// ─── Staff Card ───────────────────────────────────────────────

function StaffCard({
    member, index, onEdit, onDelete, onToggleStatus,
}: {
    member: StaffMember; index: number;
    onEdit: (m: StaffMember) => void;
    onDelete: (m: StaffMember) => void;
    onToggleStatus: (m: StaffMember) => void;
}) {
    const role = ROLE_META[member.role];
    const status = STATUS_META[member.status];
    const RoleIcon = role.icon;
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group"
        >
            <div className={`h-1 w-full bg-gradient-to-r ${member.role === "cashier" ? "from-teal-500 to-cyan-500" : "from-orange-400 to-amber-500"}`} />
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarGradient(member.full_name)} flex items-center justify-center shrink-0 shadow-sm`}>
                            <span className="text-sm font-black text-white">{initials(member.full_name)}</span>
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 leading-tight">{member.full_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                <span className="text-[10px] font-bold text-slate-400">{status.label}</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <button onClick={() => setMenuOpen(v => !v)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <MoreVertical size={14} />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.92, y: -4 }} transition={{ duration: 0.12 }}
                                        className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden w-44"
                                    >
                                        <button onClick={() => { onEdit(member); setMenuOpen(false); }}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                            <Pencil size={12} className="text-slate-400" /> Edit Details
                                        </button>
                                        <button onClick={() => { onToggleStatus(member); setMenuOpen(false); }}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                            {member.status === "active"
                                                ? <><UserX size={12} className="text-amber-500" /> Deactivate</>
                                                : <><UserCheck size={12} className="text-emerald-500" /> Activate</>}
                                        </button>
                                        <div className="h-px bg-slate-100 mx-3" />
                                        <button onClick={() => { onDelete(member); setMenuOpen(false); }}
                                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
                                            <Trash2 size={12} /> Remove Staff
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${role.bg} mb-3`}>
                    <RoleIcon size={10} className={role.color} />
                    <span className={`text-[10px] font-black ${role.color}`}>{role.label}</span>
                </div>

                <div className="space-y-1.5">
                    {/* Masked email */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Mail size={9} className="shrink-0 text-slate-300" />
                        <span className="truncate font-medium font-mono">{maskEmail(member.email)}</span>
                    </div>
                    {/* Phone with PH flag */}
                    {member.phone && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <PHFlag />
                            <span className="font-medium">{member.phone}</span>
                        </div>
                    )}
                    {/* PIN — always hidden, never revealed */}
                    {member.pin_code && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <KeyRound size={9} className="shrink-0 text-slate-300" />
                            <span className="tracking-[0.3em] text-slate-400 font-mono">••••</span>
                            <span className="text-[9px] text-slate-300">PIN set</span>
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] text-slate-300 font-medium">Added {timeAgo(member.created_at)}</span>
                    <button onClick={() => onEdit(member)}
                        className="text-[10px] font-black text-teal-600 hover:text-teal-700 flex items-center gap-0.5 transition-colors">
                        Edit <ChevronRight size={9} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Staff Modal (Add / Edit) ─────────────────────────────────

function StaffModal({
    mode, initial, onClose, onSaved,
}: {
    mode: "add" | "edit"; initial?: StaffMember;
    onClose: () => void; onSaved: () => void;
}) {
    const [form, setForm] = useState<FormData>({
        full_name: initial?.full_name ?? "",
        email: initial?.email ?? "",
        phone: initial?.phone ?? "",
        pin_code: "",
        role: initial?.role ?? "staff",
        status: initial?.status ?? "active",
        notes: initial?.notes ?? "",
    });
    const [saving, setSaving] = useState(false);

    const set = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));
    const handlePhoneChange = (raw: string) => set("phone", formatPHPhone(raw));

    const validate = () => {
        if (!form.full_name.trim()) { toast.error("Full name is required."); return false; }
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            toast.error("Enter a valid email address."); return false;
        }
        if (form.phone && form.phone.length !== 11) {
            toast.error("Phone number must be exactly 11 digits (e.g. 09XXXXXXXXX)."); return false;
        }
        if (form.pin_code && (form.pin_code.length !== 4 || !/^\d{4}$/.test(form.pin_code))) {
            toast.error("PIN must be exactly 4 digits."); return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Not logged in."); return; }

            const payload: Record<string, any> = {
                full_name: form.full_name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim() || null,
                role: form.role,
                status: form.status,
                notes: form.notes.trim() || null,
            };
            if (form.pin_code.trim()) payload.pin_code = form.pin_code;

            if (mode === "add") {
                const { error } = await supabase.from("staff_members").insert({ ...payload, owner_id: user.id });
                if (error) throw error;
                toast.success(`${form.full_name} added to your team! 🎉`);
            } else {
                const { error } = await supabase.from("staff_members").update(payload).eq("id", initial!.id);
                if (error) throw error;
                toast.success("Staff details updated.");
            }
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    const isEdit = mode === "edit";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ duration: 0.18 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className={`p-5 text-white shrink-0 ${isEdit ? "bg-gradient-to-br from-teal-600 to-cyan-700" : "bg-gradient-to-br from-orange-500 to-amber-600"}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
                                {isEdit ? <Pencil size={17} /> : <UserRound size={17} />}
                            </div>
                            <div>
                                <h2 className="text-base font-black tracking-tight">
                                    {isEdit ? "Edit Staff" : "Add New Staff"}
                                </h2>
                                <p className="text-white/70 text-[11px] mt-0.5">
                                    {isEdit ? `Editing ${initial?.full_name}` : "Add a team member to your store"}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-xl transition-colors"><X size={16} /></button>
                    </div>
                </div>

                {/* Fields */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">

                    {/* Full Name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Full Name <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={form.full_name}
                            onChange={e => set("full_name", e.target.value)}
                            placeholder="e.g. Miguel Santos"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all" />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Email Address <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                            <input type="email" value={form.email}
                                onChange={e => set("email", e.target.value)}
                                placeholder="staff@example.com"
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all" />
                        </div>
                    </div>

                    {/* Phone with PH flag */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Phone Number <span className="text-slate-300 font-normal normal-case">(optional · 11 digits)</span>
                        </label>
                        <div className="relative flex items-center">
                            <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none">
                                <PHFlag />
                                <span className="text-xs font-bold text-slate-400">+63</span>
                                <div className="w-px h-4 bg-slate-200 ml-0.5" />
                            </div>
                            <input type="tel" inputMode="numeric" value={form.phone}
                                onChange={e => handlePhoneChange(e.target.value)}
                                placeholder="09XXXXXXXXX" maxLength={11}
                                className="w-full pl-[4.5rem] pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all" />
                            <span className={`absolute right-3 text-[10px] font-bold transition-colors ${form.phone.length === 11 ? "text-emerald-500" : "text-slate-300"}`}>
                                {form.phone.length}/11
                            </span>
                        </div>
                    </div>

                    {/* PIN */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            POS PIN{" "}
                            <span className="text-slate-300 font-normal normal-case">
                                {isEdit ? "(leave blank to keep current PIN)" : "(4 digits, optional)"}
                            </span>
                        </label>
                        <div className="relative">
                            <KeyRound size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                            <input
                                type="password" inputMode="numeric" value={form.pin_code}
                                onChange={e => set("pin_code", e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder={isEdit && initial?.pin_code ? "Enter new PIN to replace" : "e.g. 1234"}
                                maxLength={4} autoComplete="new-password"
                                className="w-full pl-9 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all tracking-[0.4em]"
                            />
                            {form.pin_code.length > 0 && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black transition-colors ${form.pin_code.length === 4 ? "text-emerald-500" : "text-slate-300"}`}>
                                    {form.pin_code.length}/4
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                            <KeyRound size={8} className="text-slate-300" />
                            PIN is stored securely and never shown after saving.
                        </p>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Role <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {(["staff", "cashier"] as StaffRole[]).map(r => {
                                const meta = ROLE_META[r];
                                const RIcon = meta.icon;
                                const active = form.role === r;
                                return (
                                    <button key={r} type="button" onClick={() => set("role", r)}
                                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${active ? `${meta.bg} border-current ${meta.color}` : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"}`}>
                                        <RIcon size={16} />
                                        <span className="text-[10px] font-black">{meta.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["active", "inactive", "pending"] as StaffStatus[]).map(s => {
                                const meta = STATUS_META[s];
                                const active = form.status === s;
                                return (
                                    <button key={s} type="button" onClick={() => set("status", s)}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 text-[11px] font-black transition-all ${active
                                            ? s === "active" ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                                                : s === "inactive" ? "bg-slate-100 border-slate-400 text-slate-600"
                                                    : "bg-amber-50 border-amber-400 text-amber-700"
                                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            Notes <span className="text-slate-300 font-normal normal-case">(optional)</span>
                        </label>
                        <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                            placeholder="Schedule, responsibilities, etc." rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 focus:border-teal-300 transition-all resize-none" />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-1 flex gap-3 shrink-0">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className={`flex-1 py-2.5 rounded-xl text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${isEdit ? "bg-teal-600 hover:bg-teal-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Staff"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Delete Modal ─────────────────────────────────────────────

function DeleteModal({ member, onClose, onConfirm }: {
    member: StaffMember; onClose: () => void; onConfirm: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.from("staff_members").delete().eq("id", member.id);
            if (error) throw error;
            toast.success(`${member.full_name} removed from your team.`);
            onConfirm(); onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to delete.");
        } finally { setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 14 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={22} className="text-red-500" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1">Remove Staff Member?</h3>
                    <p className="text-sm text-slate-500">
                        Are you sure you want to remove{" "}
                        <span className="font-black text-slate-800">{member.full_name}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {deleting ? "Removing…" : "Remove"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-3xl flex items-center justify-center">
                    <UserRound size={32} className="text-teal-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Plus size={14} className="text-white" />
                </div>
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">No Staff Members Yet</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
                Add your team members so they can access the POS and help run your store.
            </p>
            <button onClick={onAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-black rounded-2xl transition-all shadow-md">
                <Plus size={15} /> Add First Staff Member
            </button>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN: StaffView
// ═══════════════════════════════════════════════════════════════

export default function StaffView() {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<StaffRole | "all">("all");
    const [filterStatus, setFilterStatus] = useState<StaffStatus | "all">("all");
    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
    const [storeName, setStoreName] = useState("My Store");

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setStoreName(user.user_metadata?.store_name ?? "My Store");
            const { data, error } = await supabase.from("staff_members").select("*")
                .eq("owner_id", user.id).order("created_at", { ascending: false });
            if (error) throw error;
            setStaffList(data ?? []);
        } catch (err) {
            console.error("Failed to fetch staff:", err);
            toast.error("Could not load staff members.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    const handleToggleStatus = async (member: StaffMember) => {
        const newStatus: StaffStatus = member.status === "active" ? "inactive" : "active";
        const { error } = await supabase.from("staff_members").update({ status: newStatus }).eq("id", member.id);
        if (error) { toast.error("Failed to update status."); return; }
        toast.success(`${member.full_name} is now ${newStatus}.`);
        fetchStaff();
    };

    const filtered = staffList.filter(m => {
        const matchSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === "all" || m.role === filterRole;
        const matchStatus = filterStatus === "all" || m.status === filterStatus;
        return matchSearch && matchRole && matchStatus;
    });

    const activeCount = staffList.filter(m => m.status === "active").length;
    const inactiveCount = staffList.filter(m => m.status === "inactive").length;

    return (
        <>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: "12px", fontSize: "13px", fontWeight: 600 } }} />
            <div className="space-y-6 pb-10">

                {/* Banner */}
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg,#0f2027 0%,#134e4a 55%,#0f4c3a 100%)" }}>
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 70%,rgba(20,184,166,.28) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(245,158,11,.18) 0%,transparent 40%)" }} />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-teal-300 text-sm font-bold mb-1 flex items-center gap-1.5">
                                <Flame size={13} className="text-amber-400" /> Team Management
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{storeName}'s Staff</h1>
                            <p className="text-teal-300 text-xs font-medium mt-1.5">Manage who has access to your POS and inventory</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex gap-3">
                                <div className="text-center px-4 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                                    <p className="text-2xl font-black text-white">{staffList.length}</p>
                                    <p className="text-teal-300 text-[9px] font-bold uppercase tracking-widest mt-0.5">Total</p>
                                </div>
                                <div className="text-center px-4 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                                    <p className="text-2xl font-black text-emerald-400">{activeCount}</p>
                                    <p className="text-teal-300 text-[9px] font-bold uppercase tracking-widest mt-0.5">Active</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAdd(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-teal-50 active:scale-95 text-teal-700 text-sm font-black rounded-2xl transition-all shadow-lg">
                                <Plus size={15} /> Add Staff
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Staff", value: staffList.length, icon: UserRound, bg: "bg-teal-50", ic: "text-teal-500", val: "text-teal-700", border: "border-teal-100" },
                        { label: "Active Now", value: activeCount, icon: UserCheck, bg: "bg-emerald-50", ic: "text-emerald-500", val: "text-emerald-700", border: "border-emerald-100" },
                        { label: "Inactive", value: inactiveCount, icon: UserX, bg: "bg-slate-50", ic: "text-slate-400", val: "text-slate-600", border: "border-slate-100" },
                        { label: "Cashiers", value: staffList.filter(m => m.role === "cashier").length, icon: BadgeCheck, bg: "bg-orange-50", ic: "text-orange-500", val: "text-orange-700", border: "border-orange-100" },
                    ].map((c, i) => {
                        const Icon = c.icon;
                        return (
                            <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className={`bg-white rounded-2xl border ${c.border} p-4 shadow-sm`}>
                                <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-2`}>
                                    <Icon size={16} className={c.ic} />
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
                                {loading ? <Skeleton className="h-6 w-10 mt-1" /> :
                                    <p className={`text-xl font-black mt-0.5 ${c.val}`}>{c.value}</p>}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 ring-teal-400 transition-all" />
                    </div>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 ring-teal-400 transition-all cursor-pointer">
                        <option value="all">All Roles</option>
                        <option value="cashier">Cashier</option>
                        <option value="staff">Staff</option>
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 ring-teal-400 transition-all cursor-pointer">
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>

                {/* Staff Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                                <div className="h-1 bg-slate-100 w-full" />
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-3 w-3/4" />
                                            <Skeleton className="h-2 w-1/2" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-xl" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-2 w-full" />
                                        <Skeleton className="h-2 w-3/4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : staffList.length === 0 ? (
                    <EmptyState onAdd={() => setShowAdd(true)} />
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <Search size={28} className="text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400">No matching staff found</p>
                        <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filters</p>
                        <button onClick={() => { setSearch(""); setFilterRole("all"); setFilterStatus("all"); }}
                            className="mt-4 text-xs font-black text-teal-600 hover:text-teal-700 transition-colors">
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((member, i) => (
                            <StaffCard key={member.id} member={member} index={i}
                                onEdit={setEditTarget} onDelete={setDeleteTarget} onToggleStatus={handleToggleStatus} />
                        ))}
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <p className="text-center text-[10px] font-bold text-slate-300">
                        Showing {filtered.length} of {staffList.length} staff member{staffList.length !== 1 ? "s" : ""}
                    </p>
                )}
            </div>

            <AnimatePresence>
                {showAdd && <StaffModal mode="add" onClose={() => setShowAdd(false)} onSaved={fetchStaff} />}
                {editTarget && <StaffModal mode="edit" initial={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchStaff} />}
                {deleteTarget && <DeleteModal member={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={fetchStaff} />}
            </AnimatePresence>
        </>
    );
}