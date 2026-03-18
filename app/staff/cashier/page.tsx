"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import DashboardCashier from "./DashboardCashier";

interface StaffData {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    owner_id: string;
    avatar_url: string | null;
}

interface OwnerProfile {
    store_name: string | null;
    full_name: string | null;
}

export default function CashierPage() {
    const router = useRouter();
    const [staff, setStaff] = useState<StaffData | null>(null);
    const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ── Set viewport-fit=cover so the bottom nav covers the system nav bar ──
        // This makes the browser go edge-to-edge on mobile (hides the 3-button row)
        const existing = document.querySelector('meta[name="viewport"]');
        const content = "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
        if (existing) {
            existing.setAttribute("content", content);
        } else {
            const meta = document.createElement("meta");
            meta.name = "viewport";
            meta.content = content;
            document.head.appendChild(meta);
        }

        const raw = sessionStorage.getItem("staff_session");
        if (!raw) {
            router.replace("/auth/staff-cashier-worker-login");
            return;
        }

        try {
            const session = JSON.parse(raw) as StaffData;

            if (session.role !== "cashier") {
                router.replace("/auth/staff-cashier-worker-login");
                return;
            }

            setStaff(session);

            supabase
                .from("profiles")
                .select("store_name, full_name")
                .eq("id", session.owner_id)
                .single()
                .then(({ data }) => {
                    if (data) setOwnerProfile(data as OwnerProfile);
                })
                .finally(() => setLoading(false));
        } catch {
            router.replace("/auth/staff-cashier-worker-login");
        }
    }, [router]);

    if (loading || !staff) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#F0F4F8" }}>
                <div className="flex flex-col items-center gap-3">
                    <img
                        src="/images/logo.png"
                        alt="Loading"
                        className="w-12 h-12 rounded-2xl object-contain animate-pulse"
                        onError={e => {
                            const t = e.currentTarget;
                            t.style.display = "none";
                            const fb = t.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = "block";
                        }}
                    />
                    <div
                        className="w-12 h-12 rounded-2xl animate-pulse hidden"
                        style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
                    />
                    <p className="text-slate-400 text-sm font-semibold">Loading cashier session…</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardCashier
            staff={staff}
            ownerStoreName={ownerProfile?.store_name ?? "your store"}
            ownerFullName={ownerProfile?.full_name ?? ""}
        />
    );
}