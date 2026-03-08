"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Users, Phone, MapPin, Plus, Pencil, Trash2, X,
    Loader2, Search, Store, ShoppingBag, User,
    FileText, ChevronLeft, ChevronRight, Eye,
    Package, StickyNote, CircleAlert, CheckCircle2,
    Building2, Utensils, Info, Hash,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/app/utils/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type SupplierType = "Store" | "Market Vendor" | "Direct Person";

interface Supplier {
    id: string;
    created_at: string;
    user_id: string;
    name: string;
    supplier_type: SupplierType;
    phone: string | null;
    address: string | null;
    main_items: string | null;
    notes: string | null;
}

type ModalMode = "create" | "edit" | "view" | "delete" | null;

const PAGE_SIZE = 9;

// ─── Supplier type config ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<SupplierType, {
    icon: React.ElementType;
    bg: string;
    text: string;
    badge: string;
    border: string;
    headerBg: string;
}> = {
    "Store": {
        icon: Store,
        bg: "bg-blue-100",
        text: "text-blue-600",
        badge: "bg-blue-100 text-blue-700",
        border: "border-blue-200",
        headerBg: "bg-blue-600",
    },
    "Market Vendor": {
        icon: ShoppingBag,
        text: "text-amber-600",
        bg: "bg-amber-100",
        badge: "bg-amber-100 text-amber-700",
        border: "border-amber-200",
        headerBg: "bg-amber-500",
    },
    "Direct Person": {
        icon: User,
        text: "text-emerald-600",
        bg: "bg-emerald-100",
        badge: "bg-emerald-100 text-emerald-700",
        border: "border-emerald-200",
        headerBg: "bg-emerald-600",
    },
};

const SUPPLIER_TYPES: SupplierType[] = ["Store", "Market Vendor", "Direct Person"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ${wide ? "max-w-xl" : "max-w-md"}`}
                style={{ maxHeight: "92vh" }}>
                {children}
            </div>
        </div>
    );
}

// ─── Field Error ──────────────────────────────────────────────────────────────

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

// ─── Supplier Form Modal ──────────────────────────────────────────────────────

interface SupplierForm {
    name: string;
    supplier_type: SupplierType;
    phone: string;
    address: string;
    main_items: string;
    notes: string;
}
type FormErrors = Partial<Record<keyof SupplierForm, string>>;

function SupplierFormModal({ mode, supplier, onClose, onSuccess }: {
    mode: "create" | "edit";
    supplier?: Supplier;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<SupplierForm>(() => supplier ? {
        name: supplier.name,
        supplier_type: supplier.supplier_type,
        phone: supplier.phone ?? "",
        address: supplier.address ?? "",
        main_items: supplier.main_items ?? "",
        notes: supplier.notes ?? "",
    } : {
        name: "", supplier_type: "Store",
        phone: "", address: "", main_items: "", notes: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);

    const set = (k: keyof SupplierForm, v: any) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => ({ ...e, [k]: undefined }));
    };

    const cfg = TYPE_CONFIG[form.supplier_type];

    const validate = (): FormErrors => {
        const errs: FormErrors = {};
        if (!form.name.trim()) errs.name = "Supplier name is required.";
        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const payload = {
                name: form.name.trim(),
                supplier_type: form.supplier_type,
                phone: form.phone.trim() || null,
                address: form.address.trim() || null,
                main_items: form.main_items.trim() || null,
                notes: form.notes.trim() || null,
            };
            if (mode === "create") {
                const { error } = await supabase.from("suppliers").insert({ ...payload, user_id: user.id });
                if (error) throw error;
                toast.success("Supplier added!");
            } else {
                const { error } = await supabase.from("suppliers").update(payload).eq("id", supplier!.id);
                if (error) throw error;
                toast.success("Supplier updated!");
            }
            onSuccess(); onClose();
        } catch (err: any) {
            toast.error(err.message || "Something went wrong.");
        } finally { setSaving(false); }
    };

    return (
        <Modal open onClose={onClose} wide>
            <div className="flex flex-col" style={{ maxHeight: "92vh" }}>
                {/* Header */}
                <div className={`${cfg.headerBg} rounded-t-2xl p-6 text-white shrink-0`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                {React.createElement(cfg.icon, { size: 20, className: "text-white" })}
                            </div>
                            <div>
                                <h2 className="text-lg font-black">
                                    {mode === "create" ? "Add New Supplier" : "Edit Supplier"}
                                </h2>
                                <p className="text-white/80 text-xs font-medium flex items-center gap-1.5">
                                    <Users size={10} />
                                    {mode === "create" ? "Add a vendor to your network" : `Editing: ${supplier?.name}`}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                            <X size={18} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Supplier Type */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                            Supplier Type <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {SUPPLIER_TYPES.map(type => {
                                const tcfg = TYPE_CONFIG[type];
                                const Icon = tcfg.icon;
                                const active = form.supplier_type === type;
                                return (
                                    <button key={type} type="button" onClick={() => set("supplier_type", type)}
                                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${active
                                                ? `${tcfg.headerBg} text-white border-transparent shadow-md`
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            }`}>
                                        <Icon size={16} className={active ? "text-white" : tcfg.text} />
                                        <span className={active ? "text-white" : "text-slate-600"}>{type}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                            Name <span className="text-red-400">*</span>
                        </label>
                        <input value={form.name} onChange={(e) => set("name", e.target.value)}
                            placeholder={
                                form.supplier_type === "Store" ? "e.g. SM Hypermarket, 7-Eleven" :
                                    form.supplier_type === "Market Vendor" ? "e.g. Ate Nena Eggs, Stall #4 Gulay" :
                                        "e.g. Kuya Boy, Aling Minda"
                            }
                            className={inputCls(errors.name)} />
                        <FieldError message={errors.name} />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                            <Phone size={10} className="text-slate-400" /> Phone / Contact
                        </label>
                        <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                            placeholder="e.g. 0912 345 6789"
                            className={inputCls()} />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                            <MapPin size={10} className="text-slate-400" /> Location / Address
                        </label>
                        <input value={form.address} onChange={(e) => set("address", e.target.value)}
                            placeholder={
                                form.supplier_type === "Store" ? "e.g. SM City, Barangay Hall" :
                                    form.supplier_type === "Market Vendor" ? "e.g. Market Stall #4, Palengke sa kanto" :
                                        "e.g. Dali nearby, House next door"
                            }
                            className={inputCls()} />
                    </div>

                    {/* Main Items */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                            <Package size={10} className="text-slate-400" /> Main Items Supplied
                        </label>
                        <input value={form.main_items} onChange={(e) => set("main_items", e.target.value)}
                            placeholder="e.g. Canned Goods, Eggs, Ice Cream, Softdrinks"
                            className={inputCls()} />
                        <p className="text-[9px] text-slate-400 mt-1 pl-1">What do you usually buy from them?</p>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                            <StickyNote size={10} className="text-slate-400" /> Notes
                        </label>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
                            rows={3}
                            placeholder="e.g. Tumatanggap ng utang, Open 24/7, Nagbibigay ng discount"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none font-medium transition-all bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none" />
                    </div>

                    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                            Only <strong>Name</strong> is required. Fill in as much or as little as you need — you can always edit later.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex gap-3 border-t border-slate-100 bg-white rounded-b-2xl shrink-0">
                    <button onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className={`flex-1 py-3 rounded-xl ${cfg.headerBg} hover:opacity-90 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2`}>
                        {saving && <Loader2 size={15} className="animate-spin" />}
                        {saving ? "Saving…" : mode === "create" ? "Add Supplier" : "Save Changes"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ supplier, onClose, onEdit }: {
    supplier: Supplier; onClose: () => void; onEdit: () => void;
}) {
    const cfg = TYPE_CONFIG[supplier.supplier_type];
    const Icon = cfg.icon;
    const initials = getInitials(supplier.name);

    return (
        <Modal open onClose={onClose}>
            <div className="flex flex-col" style={{ maxHeight: "92vh" }}>
                <div className={`${cfg.headerBg} rounded-t-2xl p-6 shrink-0`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-white/80 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Icon size={12} /> {supplier.supplier_type}
                        </span>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                            <X size={16} className="text-white" />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-black text-white">{initials}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{supplier.name}</h3>
                            <p className="text-white/70 text-xs mt-0.5">
                                Added {new Date(supplier.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    {[
                        { icon: Phone, label: "Phone", value: supplier.phone },
                        { icon: MapPin, label: "Address / Location", value: supplier.address },
                        { icon: Package, label: "Main Items Supplied", value: supplier.main_items },
                        { icon: StickyNote, label: "Notes", value: supplier.notes },
                    ].map(({ icon: RowIcon, label, value }) => (
                        <div key={label} className={`p-3.5 rounded-xl border ${value ? "bg-slate-50 border-slate-200" : "bg-slate-50/50 border-dashed border-slate-200"}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                                <RowIcon size={9} /> {label}
                            </p>
                            <p className={`text-sm font-semibold ${value ? "text-slate-700" : "text-slate-300 italic"}`}>
                                {value || "Not specified"}
                            </p>
                        </div>
                    ))}

                    <div className="flex gap-2 pt-2">
                        <button onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                            Close
                        </button>
                        <button onClick={onEdit}
                            className={`flex-1 py-3 rounded-xl ${cfg.headerBg} hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95`}>
                            <Pencil size={14} /> Edit Supplier
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ supplier, onClose, onSuccess }: {
    supplier: Supplier; onClose: () => void; onSuccess: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.from("suppliers").delete().eq("id", supplier.id);
            if (error) throw error;
            toast.success(`"${supplier.name}" removed.`);
            onSuccess(); onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete.");
        } finally { setDeleting(false); }
    };
    return (
        <Modal open onClose={onClose}>
            <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={26} className="text-red-500" />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Remove Supplier?</h2>
                <p className="text-sm text-slate-500 mb-1">You're about to permanently remove</p>
                <p className="text-base font-bold text-slate-800 mb-3">"{supplier.name}"</p>
                <div className="flex gap-2 items-start p-3 bg-red-50 border border-red-100 rounded-xl mb-5 text-left">
                    <CircleAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-500 font-medium leading-relaxed">
                        This action cannot be undone. All contact and item information for this supplier will be permanently deleted.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                        {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        {deleting ? "Removing…" : "Yes, Remove"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Supplier Card ────────────────────────────────────────────────────────────

function SupplierCard({ supplier, onView, onEdit, onDelete }: {
    supplier: Supplier;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const cfg = TYPE_CONFIG[supplier.supplier_type];
    const Icon = cfg.icon;
    const initials = getInitials(supplier.name);

    return (
        <div className={`bg-white rounded-2xl border ${cfg.border} shadow-sm hover:shadow-md transition-all group flex flex-col`}>
            {/* Card header */}
            <div className="p-5 pb-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 group-hover:${cfg.headerBg} transition-colors relative overflow-hidden`}>
                            <span className={`text-lg font-black ${cfg.text} group-hover:text-white transition-colors`}>{initials}</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight">{supplier.name}</h3>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-0.5 ${cfg.text}`}>
                                <Icon size={9} /> {supplier.supplier_type}
                            </span>
                        </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onView} title="View details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Eye size={13} />
                        </button>
                        <button onClick={onEdit} title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                            <Pencil size={13} />
                        </button>
                        <button onClick={onDelete} title="Remove"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>

                {/* Info rows */}
                <div className="space-y-2">
                    {supplier.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone size={11} className="text-slate-300 shrink-0" />
                            <span className="font-medium truncate">{supplier.phone}</span>
                        </div>
                    )}
                    {supplier.address && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin size={11} className="text-slate-300 shrink-0" />
                            <span className="font-medium truncate">{supplier.address}</span>
                        </div>
                    )}
                    {!supplier.phone && !supplier.address && (
                        <p className="text-xs text-slate-300 italic">No contact details</p>
                    )}
                </div>
            </div>

            {/* Footer strip */}
            {supplier.main_items && (
                <div className={`px-5 py-3 border-t ${cfg.border} ${cfg.bg} rounded-b-2xl mt-auto`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 flex items-center gap-1">
                        <Package size={8} /> Supplies
                    </p>
                    <p className={`text-xs font-semibold ${cfg.text} truncate`}>{supplier.main_items}</p>
                </div>
            )}

            {supplier.notes && !supplier.main_items && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl mt-auto">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 flex items-center gap-1">
                        <StickyNote size={8} /> Note
                    </p>
                    <p className="text-xs font-semibold text-slate-500 truncate">{supplier.notes}</p>
                </div>
            )}
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, palette }: {
    icon: React.ElementType; label: string; value: string; sub?: string;
    palette: { icon: string; border: string };
}) {
    return (
        <div className={`rounded-2xl p-5 border bg-white shadow-sm flex items-center gap-4 ${palette.border}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${palette.icon}`}>
                <Icon size={20} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="text-base font-black text-slate-800 truncate leading-tight">{value}</p>
                {sub && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-5">
                <Users size={36} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">No Suppliers Yet</h3>
            <p className="text-sm text-slate-400 font-medium mb-6 max-w-xs">
                Add your first supplier — a store, market vendor, or person you regularly buy from.
            </p>
            <button onClick={onAdd}
                className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md">
                <Plus size={16} /> Add First Supplier
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function SupplierView() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearch] = useState("");
    const [filterType, setFilterType] = useState<SupplierType | "All">("All");
    const [page, setPage] = useState(1);

    const [modal, setModal] = useState<{
        mode: ModalMode;
        supplier?: Supplier;
    }>({ mode: null });

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("suppliers")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setSuppliers(data ?? []);
            setPage(1);
        } catch {
            toast.error("Failed to load suppliers.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
    useEffect(() => { setPage(1); }, [searchQuery, filterType]);

    const filtered = suppliers.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.main_items ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.address ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchType = filterType === "All" || s.supplier_type === filterType;
        return matchSearch && matchType;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const storeCount = suppliers.filter(s => s.supplier_type === "Store").length;
    const vendorCount = suppliers.filter(s => s.supplier_type === "Market Vendor").length;
    const personCount = suppliers.filter(s => s.supplier_type === "Direct Person").length;

    const closeModal = () => setModal({ mode: null });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Suppliers</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage your product vendors and contact details.</p>
                </div>
                <button
                    onClick={() => setModal({ mode: "create" })}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md">
                    <Plus size={16} /> New Supplier
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Total Suppliers" value={String(suppliers.length)} sub="All vendors"
                    palette={{ icon: "bg-slate-100 text-slate-600", border: "border-slate-200" }} />
                <StatCard icon={Store} label="Stores" value={String(storeCount)} sub="Registered stores"
                    palette={{ icon: "bg-blue-100 text-blue-600", border: "border-blue-100" }} />
                <StatCard icon={ShoppingBag} label="Market Vendors" value={String(vendorCount)} sub="Palengke / stalls"
                    palette={{ icon: "bg-amber-100 text-amber-600", border: "border-amber-100" }} />
                <StatCard icon={User} label="Direct Persons" value={String(personCount)} sub="Neighbors / friends"
                    palette={{ icon: "bg-emerald-100 text-emerald-600", border: "border-emerald-100" }} />
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input type="text" value={searchQuery} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, items, or address…"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500 outline-none" />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {(["All", ...SUPPLIER_TYPES] as (SupplierType | "All")[]).map(type => (
                        <button key={type} onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterType === type
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}>
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-400 mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Loading suppliers…</p>
                </div>
            ) : suppliers.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <EmptyState onAdd={() => setModal({ mode: "create" })} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center py-16">
                    <Search size={36} className="text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No suppliers match your search.</p>
                    <button onClick={() => { setSearch(""); setFilterType("All"); }}
                        className="mt-3 text-xs text-blue-600 font-bold hover:underline">
                        Clear filters
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginated.map(supplier => (
                            <SupplierCard
                                key={supplier.id}
                                supplier={supplier}
                                onView={() => setModal({ mode: "view", supplier })}
                                onEdit={() => setModal({ mode: "edit", supplier })}
                                onDelete={() => setModal({ mode: "delete", supplier })}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 py-1">
                            <p className="text-xs font-bold text-slate-400">
                                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors">
                                    <ChevronLeft size={15} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${p === page ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-200"
                                            }`}>
                                        {p}
                                    </button>
                                ))}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-30 transition-colors">
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── Modals ── */}
            {modal.mode === "create" && (
                <SupplierFormModal mode="create" onClose={closeModal} onSuccess={fetchSuppliers} />
            )}
            {modal.mode === "edit" && modal.supplier && (
                <SupplierFormModal mode="edit" supplier={modal.supplier} onClose={closeModal} onSuccess={fetchSuppliers} />
            )}
            {modal.mode === "view" && modal.supplier && (
                <ViewModal
                    supplier={modal.supplier}
                    onClose={closeModal}
                    onEdit={() => setModal({ mode: "edit", supplier: modal.supplier })}
                />
            )}
            {modal.mode === "delete" && modal.supplier && (
                <DeleteModal supplier={modal.supplier} onClose={closeModal} onSuccess={fetchSuppliers} />
            )}
        </div>
    );
}