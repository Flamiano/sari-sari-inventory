"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import DashboardStaff from "./DashboardStaff";

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

// ── Logo — same pattern as DashboardCashier / DashboardStaff ─────
function Logo({ size = 48 }: { size?: number }) {
    const [err, setErr] = useState(false);
    if (err) {
        return (
            <div
                className="rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                    width: size, height: size,
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                    boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                }}
            />
        );
    }
    return (
        <img
            src="/images/logo.png"
            alt="SariSari IMS"
            onError={() => setErr(true)}
            className="rounded-2xl object-contain flex-shrink-0 animate-pulse"
            style={{ width: size, height: size }}
        />
    );
}

export default function StaffWorkerPage() {
    const router = useRouter();
    const [staff, setStaff] = useState<StaffData | null>(null);
    const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const raw = sessionStorage.getItem("staff_session");
        if (!raw) {
            router.replace("/auth/staff-cashier-worker-login");
            return;
        }

        const init = async () => {
            try {
                const session = JSON.parse(raw) as StaffData;

                // Only allow staff / manager roles (not cashier)
                if (session.role === "cashier") {
                    router.replace("/auth/staff-cashier-worker-login");
                    return;
                }

                setStaff(session);

                // Fetch owner profile — use async/await to avoid PromiseLike.finally() error
                const { data } = await supabase
                    .from("profiles")
                    .select("store_name, full_name")
                    .eq("id", session.owner_id)
                    .single();

                if (data) setOwnerProfile(data as OwnerProfile);
            } catch {
                router.replace("/auth/staff-cashier-worker-login");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router]);

    if (loading || !staff) {
        return (
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
                    *, *::before, *::after { font-family:'Plus Jakarta Sans',sans-serif; box-sizing:border-box; }
                    .syne { font-family:'Syne',sans-serif; }
                    @keyframes fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                    .fade-in { animation: fade-in 0.4s ease forwards; }
                `}</style>
                <div
                    className="min-h-screen flex flex-col items-center justify-center gap-5 fade-in"
                    style={{ background: "#F0F4F8" }}
                >
                    <Logo size={56} />
                    <div className="text-center">
                        <p className="font-black text-slate-700 text-[0.95rem] syne">SariSari<span className="text-violet-600">.</span>IMS</p>
                        <p className="text-[0.72rem] text-slate-400 font-medium mt-1 uppercase tracking-widest">Staff Portal</p>
                    </div>
                    {/* Loading dots */}
                    <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-violet-400"
                                style={{ animation: `fade-in 0.6s ease ${i * 0.15}s infinite alternate` }}
                            />
                        ))}
                    </div>
                </div>
            </>
        );
    }

    return (
        <DashboardStaff
            staff={staff}
            ownerStoreName={ownerProfile?.store_name ?? "your store"}
            ownerFullName={ownerProfile?.full_name ?? ""}
        />
    );
}