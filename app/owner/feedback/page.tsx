"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import toast from "react-hot-toast";
import {
    MessageSquarePlus, Star, Bug, Lightbulb, Wrench,
    Heart, MessageCircle, Send, Loader2, CheckCircle2,
    Clock, Eye, XCircle, Trash2, RotateCcw, Pencil,
    X, AlertTriangle, CalendarClock, Calendar, RefreshCw,
    ChevronDown,
} from "lucide-react";

type Category = "general" | "bug_report" | "feature_request" | "improvement" | "praise";
type Status = "open" | "in_review" | "resolved" | "closed";
type DateRange = "all" | "today" | "this_week" | "this_month" | "custom";

interface Feedback {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    message: string;
    category: Category;
    rating: number | null;
    status: Status;
}

const CATEGORIES: {
    id: Category; label: string; icon: React.ElementType;
    color: string; bg: string; border: string; swatch: string;
}[] = [
        { id: "general", label: "General", icon: MessageCircle, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", swatch: "#e2e8f0" },
        { id: "bug_report", label: "Bug Report", icon: Bug, color: "#ef4444", bg: "#fff1f2", border: "#fecaca", swatch: "#fecaca" },
        { id: "feature_request", label: "Feature Request", icon: Lightbulb, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", swatch: "#fde68a" },
        { id: "improvement", label: "Improvement", icon: Wrench, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", swatch: "#bfdbfe" },
        { id: "praise", label: "Praise", icon: Heart, color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8", swatch: "#fbcfe8" },
    ];

const STATUS_CONFIG: {
    id: Status; label: string; icon: React.ElementType; color: string; bg: string; dot: string;
}[] = [
        { id: "open", label: "Open", icon: MessageCircle, color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
        { id: "in_review", label: "In Review", icon: Eye, color: "#f59e0b", bg: "#fffbeb", dot: "#f59e0b" },
        { id: "resolved", label: "Resolved", icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4", dot: "#16a34a" },
        { id: "closed", label: "Closed", icon: XCircle, color: "#64748b", bg: "#f8fafc", dot: "#94a3b8" },
    ];

const STATUS_MAP = Object.fromEntries(
    STATUS_CONFIG.map(s => [s.id, s])
) as Record<Status, typeof STATUS_CONFIG[0]>;

const EMPTY_FORM = { title: "", message: "", category: "general" as Category, rating: 0 };

// helpers

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-PH", {
        month: "short", day: "numeric", year: "numeric",
    });
}

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateStr);
}

function getWeekStart() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
}

function startOf(unit: "today" | "week" | "month"): Date {
    const d = new Date();
    if (unit === "today") { d.setHours(0, 0, 0, 0); return d; }
    if (unit === "week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
    d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

function wasEdited(f: Feedback) {
    return new Date(f.updated_at).getTime() - new Date(f.created_at).getTime() > 5000;
}

// StarRating

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hovered, setHovered] = useState(0);
    const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
    return (
        <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button"
                    onClick={() => onChange(i === value ? 0 : i)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(0)}
                    className="transition-transform hover:scale-110 active:scale-95">
                    <Star size={20}
                        fill={(hovered || value) >= i ? "#f59e0b" : "none"}
                        stroke={(hovered || value) >= i ? "#f59e0b" : "#cbd5e1"}
                        className="transition-all duration-100" />
                </button>
            ))}
            {value > 0 && (
                <span className="text-[0.72rem] font-bold text-amber-500 ml-1">{labels[value]}</span>
            )}
        </div>
    );
}

// DropdownSelect — reusable dropdown with dot/swatch indicators

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
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
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
                        {current?.value === "all" ? `All ${label}s` : (current?.label ?? "All")}
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
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">
                                {label}
                            </p>
                            {options.map(o => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => { onSelect(o.value); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                    {o.dot && (
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />
                                    )}
                                    {o.swatch && (
                                        <span className="w-3 h-3 rounded shrink-0 border border-slate-200" style={{ background: o.swatch }} />
                                    )}
                                    <span className={`text-[0.82rem] flex-1 ${value === o.value ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                        {o.label}
                                    </span>
                                    {value === o.value && (
                                        <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// DateDropdown — separate component for date range with custom inputs

function DateDropdown({
    value, onSelect, customFrom, customTo, onFromChange, onToChange,
}: {
    value: DateRange;
    onSelect: (v: DateRange) => void;
    customFrom: string; customTo: string;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const DATE_OPTIONS: { id: DateRange; label: string }[] = [
        { id: "all", label: "All time" },
        { id: "today", label: "Today" },
        { id: "this_week", label: "This week" },
        { id: "this_month", label: "This month" },
        { id: "custom", label: "Custom range" },
    ];

    const displayLabel = (() => {
        if (value === "custom" && customFrom && customTo) {
            const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });
            return `${fmt(customFrom)} – ${fmt(customTo)}`;
        }
        return DATE_OPTIONS.find(o => o.id === value)?.label ?? "All time";
    })();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
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
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Date</p>
                    <p className="text-[0.8rem] font-black text-slate-800 leading-tight truncate">{displayLabel}</p>
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
                        style={{ minWidth: "220px" }}>
                        <div className="py-1.5">
                            <p className="px-3 pt-2 pb-1.5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">
                                Date range
                            </p>
                            {DATE_OPTIONS.map(o => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => onSelect(o.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                    <span className={`text-[0.82rem] flex-1 ${value === o.id ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                        {o.label}
                                    </span>
                                    {value === o.id && (
                                        <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {value === "custom" && (
                            <div className="border-t border-slate-100 p-3 space-y-2">
                                <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Custom range</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customFrom}
                                        onChange={e => onFromChange(e.target.value)}
                                        className="flex-1 text-[0.75rem] font-medium text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-white transition-colors"
                                        style={{ minWidth: 0 }}
                                    />
                                    <span className="text-[0.7rem] text-slate-300 font-bold shrink-0">—</span>
                                    <input
                                        type="date"
                                        value={customTo}
                                        onChange={e => onToChange(e.target.value)}
                                        className="flex-1 text-[0.75rem] font-medium text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-white transition-colors"
                                        style={{ minWidth: 0 }}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// FeedbackModal — Create & Edit

interface ModalProps {
    mode: "create" | "edit";
    initial?: Feedback;
    onClose: () => void;
    onSaved: () => void;
    userId: string;
    weeklyLimitReached: boolean;
}

function FeedbackModal({ mode, initial, onClose, onSaved, userId, weeklyLimitReached }: ModalProps) {
    const [form, setForm] = useState(
        initial
            ? { title: initial.title, message: initial.message, category: initial.category, rating: initial.rating ?? 0 }
            : { ...EMPTY_FORM }
    );
    const [errors, setErrors] = useState<{ title?: string; message?: string }>({});
    const [submitting, setSubmitting] = useState(false);

    const blocked = mode === "create" && weeklyLimitReached;

    const validate = () => {
        const errs: typeof errors = {};
        if (!form.title.trim()) errs.title = "Title is required.";
        else if (form.title.trim().length < 5) errs.title = "At least 5 characters required.";
        if (!form.message.trim()) errs.message = "Message is required.";
        else if (form.message.trim().length < 10) errs.message = "Please add more detail (min 10 chars).";
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (blocked) return;
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setSubmitting(true);

        const payload = {
            title: form.title.trim(),
            message: form.message.trim(),
            category: form.category,
            rating: form.rating > 0 ? form.rating : null,
        };

        const { error } = mode === "create"
            ? await supabase.from("feedback").insert({ ...payload, user_id: userId })
            : await supabase.from("feedback").update(payload).eq("id", initial!.id);

        setSubmitting(false);
        if (error) { toast.error(mode === "create" ? "Failed to submit." : "Failed to update."); return; }
        toast.success(mode === "create" ? "Feedback submitted! Thank you 🙏" : "Feedback updated!");
        onSaved();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
                className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl shadow-slate-300/50 overflow-hidden"
                style={{ maxHeight: "92dvh", overflowY: "auto" }}
            >
                {/* drag handle on mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 sm:pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            {mode === "create"
                                ? <MessageSquarePlus size={17} className="text-blue-600" />
                                : <Pencil size={15} className="text-blue-600" />}
                        </div>
                        <div>
                            <p className="font-black text-slate-800 text-sm leading-tight" style={{ fontFamily: "Syne, sans-serif" }}>
                                {mode === "create" ? "Submit Feedback" : "Edit Feedback"}
                            </p>
                            <p className="text-[0.67rem] text-slate-400">
                                {mode === "create" ? "Help us improve SariSari.IMS" : "Update your submission"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={15} />
                    </button>
                </div>

                {/* Weekly limit warning */}
                {blocked && (
                    <div className="mx-5 mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
                        <CalendarClock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[0.78rem] font-black text-amber-700">Weekly limit reached</p>
                            <p className="text-[0.72rem] text-amber-600 mt-0.5 leading-relaxed">
                                You can submit one feedback per week. New submissions open again on Monday.
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="px-5 py-5 space-y-5">

                    {/* Category */}
                    <div>
                        <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {CATEGORIES.map(c => {
                                const CIcon = c.icon;
                                const active = form.category === c.id;
                                return (
                                    <button key={c.id} type="button"
                                        disabled={blocked}
                                        onClick={() => setForm(f => ({ ...f, category: c.id }))}
                                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            background: active ? c.bg : "#f8fafc",
                                            border: `2px solid ${active ? c.border : "#f1f5f9"}`,
                                            boxShadow: active ? `0 0 0 3px ${c.border}55` : "none",
                                        }}>
                                        <CIcon size={14} style={{ color: active ? c.color : "#94a3b8" }} />
                                        <span className="text-[0.56rem] font-black leading-tight text-center"
                                            style={{ color: active ? c.color : "#94a3b8" }}>
                                            {c.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Title <span className="text-red-400 normal-case font-semibold">*</span>
                        </label>
                        <input type="text" placeholder="Short summary of your feedback…"
                            value={form.title} disabled={blocked}
                            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(v => ({ ...v, title: undefined })); }}
                            className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 bg-white outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                border: errors.title ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                                boxShadow: errors.title ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                            }} />
                        {errors.title && <p className="text-[0.7rem] text-red-500 font-semibold mt-1">{errors.title}</p>}
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Message <span className="text-red-400 normal-case font-semibold">*</span>
                        </label>
                        <textarea rows={4} placeholder="Describe your feedback in detail…"
                            value={form.message} disabled={blocked}
                            onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(v => ({ ...v, message: undefined })); }}
                            className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 bg-white outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                border: errors.message ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                                boxShadow: errors.message ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
                            }} />
                        <div className="flex items-center justify-between mt-1">
                            {errors.message
                                ? <p className="text-[0.7rem] text-red-500 font-semibold">{errors.message}</p>
                                : <span />}
                            <span className="text-[0.62rem] text-slate-300 font-medium">{form.message.length} chars</span>
                        </div>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Rating <span className="normal-case text-slate-300 font-medium">(optional)</span>
                        </label>
                        <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting || blocked}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.25)" }}>
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {submitting ? "Saving…" : mode === "create" ? "Submit" : "Save Changes"}
                        </button>
                    </div>

                    {/* mobile safe area bottom */}
                    <div className="h-safe-bottom sm:hidden" style={{ height: "env(safe-area-inset-bottom, 12px)" }} />
                </form>
            </motion.div>
        </div>
    );
}

// DeleteModal

function DeleteModal({ item, onClose, onDeleted }: { item: Feedback; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);

    const confirm = async () => {
        setDeleting(true);
        const { error } = await supabase.from("feedback").delete().eq("id", item.id);
        setDeleting(false);
        if (error) { toast.error("Failed to delete."); return; }
        toast.success("Feedback deleted.");
        onDeleted();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.25 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full sm:max-w-sm bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl shadow-slate-300/50 p-6"
            >
                <div className="flex justify-center pt-1 pb-3 sm:hidden">
                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                </div>

                <div className="flex flex-col items-center text-center mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-red-500" />
                    </div>
                    <p className="font-black text-slate-800 text-base mb-1.5" style={{ fontFamily: "Syne, sans-serif" }}>
                        Delete this feedback?
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        <span className="font-bold text-slate-600">"{item.title}"</span> will be permanently removed and cannot be recovered.
                    </p>
                </div>

                <div className="flex gap-2.5">
                    <button onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={confirm} disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60">
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                </div>

                <div className="sm:hidden" style={{ height: "env(safe-area-inset-bottom, 12px)" }} />
            </motion.div>
        </div>
    );
}

// FeedbackCard

function FeedbackCard({
    item, onEdit, onDelete,
}: {
    item: Feedback;
    onEdit: (f: Feedback) => void;
    onDelete: (f: Feedback) => void;
}) {
    const cat = CATEGORIES.find(c => c.id === item.category)!;
    const st = STATUS_MAP[item.status];
    const CatIcon = cat.icon;
    const StIcon = st.icon;
    const edited = wasEdited(item);

    return (
        <motion.div layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-slate-200 hover:shadow-md hover:shadow-slate-100/80 transition-all flex flex-col gap-3"
        >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: cat.bg, border: `1.5px solid ${cat.border}` }}>
                        <CatIcon size={15} style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[0.87rem] font-black text-slate-800 truncate leading-tight">{item.title}</p>
                        <p className="text-[0.62rem] font-bold uppercase tracking-wider mt-0.5" style={{ color: cat.color }}>
                            {cat.label}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: st.bg }}>
                    <StIcon size={10} style={{ color: st.color }} />
                    <span className="text-[0.61rem] font-black uppercase tracking-wide" style={{ color: st.color }}>
                        {st.label}
                    </span>
                </div>
            </div>

            {/* Message */}
            <p className="text-[0.81rem] text-slate-500 leading-relaxed line-clamp-3 flex-1">
                {item.message}
            </p>

            {/* Date + edited badge */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-[0.63rem] text-slate-400 font-medium">
                    <Calendar size={10} className="shrink-0" />
                    <span>Submitted {formatDate(item.created_at)}</span>
                </div>
                {edited && (
                    <div className="flex items-center gap-1 text-[0.63rem] font-bold text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                        <RefreshCw size={9} />
                        <span>Edited {timeAgo(item.updated_at)}</span>
                    </div>
                )}
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center gap-0.5">
                    {item.rating
                        ? [1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={11}
                                fill={i <= item.rating! ? "#f59e0b" : "none"}
                                stroke={i <= item.rating! ? "#f59e0b" : "#e2e8f0"} />
                        ))
                        : <span className="text-[0.62rem] text-slate-300 font-medium">No rating</span>
                    }
                </div>

                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[0.62rem] text-slate-400 font-medium">
                        <Clock size={9} />
                        {timeAgo(item.created_at)}
                    </span>
                    {/* on mobile show buttons always; on desktop show on hover */}
                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                            <Pencil size={12} />
                        </button>
                        <button onClick={() => onDelete(item)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Main Page

export default function FeedbackView() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");
    const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
    const [filterCat, setFilterCat] = useState<Category | "all">("all");
    const [dateRange, setDateRange] = useState<DateRange>("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Feedback | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);

    const fetchFeedbacks = async (uid?: string) => {
        setLoading(true);
        const id = uid ?? userId;
        if (!id) { setLoading(false); return; }
        const { data, error } = await supabase
            .from("feedback")
            .select("*")
            .eq("user_id", id)
            .order("created_at", { ascending: false });
        if (error) toast.error("Failed to load feedback.");
        else setFeedbacks(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            fetchFeedbacks(user.id);
        };
        init();
    }, []);

    const weeklyLimitReached = feedbacks.some(f => f.created_at >= getWeekStart());

    const filtered = feedbacks.filter(f => {
        if (filterStatus !== "all" && f.status !== filterStatus) return false;
        if (filterCat !== "all" && f.category !== filterCat) return false;

        const created = new Date(f.created_at);
        if (dateRange === "today") { if (created < startOf("today")) return false; }
        else if (dateRange === "this_week") { if (created < startOf("week")) return false; }
        else if (dateRange === "this_month") { if (created < startOf("month")) return false; }
        else if (dateRange === "custom") {
            if (customFrom && created < new Date(customFrom)) return false;
            if (customTo && created > new Date(customTo + "T23:59:59")) return false;
        }
        return true;
    });

    const anyFilterActive = filterStatus !== "all" || filterCat !== "all" || dateRange !== "all";

    const resetFilters = () => {
        setFilterStatus("all");
        setFilterCat("all");
        setDateRange("all");
        setCustomFrom("");
        setCustomTo("");
    };

    const avgRating = (() => {
        const rated = feedbacks.filter(f => f.rating);
        return rated.length > 0
            ? (rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length).toFixed(1)
            : null;
    })();

    const stats = [
        { label: "Total", value: feedbacks.length, color: "#2563eb" },
        { label: "Open", value: feedbacks.filter(f => f.status === "open").length, color: "#2563eb" },
        { label: "Resolved", value: feedbacks.filter(f => f.status === "resolved").length, color: "#16a34a" },
        { label: "Avg Rating", value: avgRating ? `${avgRating} ★` : "—", color: "#f59e0b" },
    ];

    return (
        <div className="space-y-5 pb-8" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}>

            {/* Page header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight"
                        style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.03em" }}>
                        Feedback
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2 flex-wrap">
                        Share thoughts, report bugs, or suggest features.
                        {weeklyLimitReached && (
                            <span className="inline-flex items-center gap-1 text-amber-500 font-bold text-xs">
                                <CalendarClock size={11} />
                                1 / week limit reached
                            </span>
                        )}
                    </p>
                </div>
                <motion.button whileTap={{ scale: 0.96 }}
                    onClick={() => setCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all shrink-0"
                    style={{
                        background: weeklyLimitReached ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        boxShadow: weeklyLimitReached ? "none" : "0 4px 16px rgba(37,99,235,0.3)",
                    }}>
                    <MessageSquarePlus size={15} />
                    <span className="hidden xs:inline">New Feedback</span>
                    <span className="xs:hidden">New</span>
                </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 px-4 py-4">
                        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{s.label}</p>
                        <p className="text-2xl font-black leading-none"
                            style={{ fontFamily: "Syne, sans-serif", color: s.color }}>
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Weekly limit banner */}
            {weeklyLimitReached && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
                    <CalendarClock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[0.81rem] font-black text-amber-700">You've submitted feedback this week</p>
                        <p className="text-[0.74rem] text-amber-600 mt-0.5 leading-relaxed">
                            Only one feedback per week is allowed. You can still edit or delete existing submissions.
                            New submissions open again every Monday.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Filters */}
            <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2.5">

                    {/* Status */}
                    <DropdownSelect
                        label="Status"
                        value={filterStatus}
                        onSelect={v => setFilterStatus(v as any)}
                        options={[
                            { value: "all", label: "All statuses" },
                            { value: "open", label: "Open", dot: "#2563eb" },
                            { value: "in_review", label: "In Review", dot: "#f59e0b" },
                            { value: "resolved", label: "Resolved", dot: "#16a34a" },
                            { value: "closed", label: "Closed", dot: "#94a3b8" },
                        ]}
                    />

                    {/* Category */}
                    <DropdownSelect
                        label="Type"
                        value={filterCat}
                        onSelect={v => setFilterCat(v as any)}
                        options={[
                            { value: "all", label: "All types" },
                            { value: "general", label: "General", swatch: "#e2e8f0" },
                            { value: "bug_report", label: "Bug Report", swatch: "#fecaca" },
                            { value: "feature_request", label: "Feature Request", swatch: "#fde68a" },
                            { value: "improvement", label: "Improvement", swatch: "#bfdbfe" },
                            { value: "praise", label: "Praise", swatch: "#fbcfe8" },
                        ]}
                    />

                    {/* Date */}
                    <DateDropdown
                        value={dateRange}
                        onSelect={v => setDateRange(v)}
                        customFrom={customFrom}
                        customTo={customTo}
                        onFromChange={setCustomFrom}
                        onToChange={setCustomTo}
                    />

                    {anyFilterActive && (
                        <button onClick={resetFilters}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[0.75rem] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-colors w-full sm:w-auto">
                            <RotateCcw size={12} />
                            Reset all filters
                        </button>
                    )}
                </div>

                {anyFilterActive && (
                    <p className="text-[0.68rem] text-slate-400 font-medium px-1">
                        Showing <span className="font-black text-slate-700">{filtered.length}</span> of{" "}
                        <span className="font-black text-slate-700">{feedbacks.length}</span> entries
                        {dateRange === "custom" && customFrom && customTo && (
                            <span className="ml-1">
                                · <span className="text-slate-600 font-semibold">{formatDate(customFrom)}</span>
                                {" – "}
                                <span className="text-slate-600 font-semibold">{formatDate(customTo)}</span>
                            </span>
                        )}
                    </p>
                )}
            </div>

            {/* Cards */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm font-medium">Loading…</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <MessageSquarePlus size={40} className="mb-3 opacity-30" />
                    <p className="text-sm font-black text-slate-400">
                        {feedbacks.length === 0 ? "No feedback yet" : "No results match your filters"}
                    </p>
                    <p className="text-xs mt-1 text-slate-300">
                        {feedbacks.length === 0
                            ? "Submit your first feedback using the button above."
                            : "Try adjusting the filters."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filtered.map(item => (
                            <FeedbackCard key={item.id} item={item}
                                onEdit={f => setEditTarget(f)}
                                onDelete={f => setDeleteTarget(f)} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {createOpen && (
                    <FeedbackModal key="create" mode="create"
                        userId={userId}
                        weeklyLimitReached={weeklyLimitReached}
                        onClose={() => setCreateOpen(false)}
                        onSaved={() => fetchFeedbacks()} />
                )}
                {editTarget && (
                    <FeedbackModal key="edit" mode="edit"
                        initial={editTarget}
                        userId={userId}
                        weeklyLimitReached={false}
                        onClose={() => setEditTarget(null)}
                        onSaved={() => fetchFeedbacks()} />
                )}
                {deleteTarget && (
                    <DeleteModal key="delete"
                        item={deleteTarget}
                        onClose={() => setDeleteTarget(null)}
                        onDeleted={() => { fetchFeedbacks(); setDeleteTarget(null); }} />
                )}
            </AnimatePresence>
        </div>
    );
}