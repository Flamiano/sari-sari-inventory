"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Package, Users, Zap, Shield, Globe, ArrowRight, Star, CheckCircle,
  Bell, Database, RefreshCw, Store, Receipt, CreditCard, PieChart, Clock,
  ChevronDown, Download, Smartphone, Monitor, Play, ShoppingCart,
  TrendingUp, Lock, ShieldCheck, UserCheck, Activity, MessageSquare,
  BarChart3, Inbox,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import Navbar from "./comps/navbar/page";
import Footer from "./comps/footer/page";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Familjen+Grotesk:wght@700;800&display=swap');
    :root { --bg:#F7F8FA; --navy:#050E1F; --blue:#2563EB; --border:#E2E8F0; }
    * { font-family:'Outfit',sans-serif; box-sizing:border-box; }
    h1,h2,h3,h4 { font-family:'Familjen Grotesk',sans-serif; }
    @keyframes ticker    { to { transform:translateX(-50%); } }
    @keyframes glowPulse { 0%,100%{ opacity:.3; } 50%{ opacity:.7; } }
    @keyframes shimmer   { 0%{ background-position:-200% 0; } 100%{ background-position:200% 0; } }
    @keyframes floatUp   { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-8px); } }
    .ticker-anim  { animation:ticker 40s linear infinite; }
    .glow-pulse   { animation:glowPulse 4s ease-in-out infinite; }
    .float-badge  { animation:floatUp 5s ease-in-out infinite; }
    .skeleton {
      background:linear-gradient(90deg,#1a2035 25%,#1e2845 50%,#1a2035 75%);
      background-size:200% 100%; animation:shimmer 1.5s infinite;
    }
    .skeleton-lt {
      background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);
      background-size:200% 100%; animation:shimmer 1.5s infinite;
    }
    @media(max-width:640px){ .hero-title{ font-size:clamp(2rem,8vw,3rem) !important; } }
  `}</style>
);

// Helpers
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function AnimatedCount({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || target === 0) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return <span ref={ref}>{display.toLocaleString()}</span>;
}

// Types
interface LiveStats {
  owners: number; cashiers: number; staff: number;
  totalProducts: number; totalSales: number; totalUtang: number;
  recentOwners: { email: string; full_name: string | null; store_name: string | null; updated_at: string }[];
  recentActivity: { description: string; staff_name: string; created_at: string }[];
}

interface FeedbackItem {
  id: string; title: string; message: string; rating: number | null;
  category: string; created_at: string; user_id: string;
  owner_name: string | null; owner_store: string | null; owner_email: string | null;
}

// Realtime stats — all 6 tables, debounced to avoid rapid re-fetches on bulk changes
function useLiveStats() {
  const [stats, setStats] = useState<LiveStats>({
    owners: 0, cashiers: 0, staff: 0, totalProducts: 0, totalSales: 0, totalUtang: 0,
    recentOwners: [], recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [
        { count: ownerCount }, { count: cashierCount }, { count: staffCount },
        { count: productCount }, { count: salesCount }, { count: utangCount },
        { data: recent }, { data: activity },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("staff_members").select("*", { count: "exact", head: true }).eq("role", "cashier").eq("status", "active"),
        supabase.from("staff_members").select("*", { count: "exact", head: true }).eq("role", "staff").eq("status", "active"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("sales_transactions").select("*", { count: "exact", head: true }),
        supabase.from("utang_list").select("*", { count: "exact", head: true }).eq("is_paid", false),
        supabase.from("profiles").select("email,full_name,store_name,updated_at").order("updated_at", { ascending: false }).limit(6),
        supabase.from("staff_activity_log").select("description,staff_name,created_at").order("created_at", { ascending: false }).limit(4),
      ]);
      setStats({
        owners: ownerCount ?? 0, cashiers: cashierCount ?? 0, staff: staffCount ?? 0,
        totalProducts: productCount ?? 0, totalSales: salesCount ?? 0, totalUtang: utangCount ?? 0,
        recentOwners: recent ?? [], recentActivity: activity ?? [],
      });
    } catch (err) {
      console.error("useLiveStats fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced trigger — batches rapid multi-table changes into one fetch
  const debouncedFetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { fetchAll(); }, 300);
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    // Unique channel name with timestamp avoids stale channel conflicts on remount
    const channelName = `landing-stats-${Date.now()}`;
    const ch = supabase.channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_members" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_transactions" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_activity_log" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "utang_list" }, debouncedFetch)
      .subscribe((status) => {
        // Re-fetch on reconnect after a dropped connection
        if (status === "SUBSCRIBED") fetchAll();
      });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(ch);
    };
  }, [fetchAll, debouncedFetch]);

  return { stats, loading };
}

// Realtime feedback — enriches with real owner name, store name, masked email
// Subscribes to both feedback and profiles so reviewer name changes reflect immediately
function useLiveFeedback() {
  const [reviews, setReviews] = useState<FeedbackItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const { data: feedbackData } = await supabase
        .from("feedback")
        .select("id,title,message,rating,category,created_at,user_id")
        .in("status", ["open", "in_review", "resolved"])
        .not("rating", "is", null)
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(12);

      if (!feedbackData || feedbackData.length === 0) {
        setReviews([]);
        return;
      }

      const userIds = [...new Set(feedbackData.map(r => r.user_id))];
      const { data: profileData } = await supabase
        .from("profiles").select("id,full_name,store_name,email").in("id", userIds);

      const pMap: Record<string, { full_name: string | null; store_name: string | null; email: string }> =
        Object.fromEntries((profileData ?? []).map(p => [p.id, p]));

      setReviews(feedbackData.map(r => {
        const p = pMap[r.user_id];
        return {
          ...r,
          owner_name: p?.full_name?.trim() || null,
          owner_store: p?.store_name?.trim() || null,
          owner_email: p?.email || null,
        };
      }));
    } catch (err) {
      console.error("useLiveFeedback fetch error:", err);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  const debouncedFetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { fetchReviews(); }, 300);
  }, [fetchReviews]);

  useEffect(() => {
    fetchReviews();
    const channelName = `landing-feedback-${Date.now()}`;
    const ch = supabase.channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, debouncedFetch)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") fetchReviews();
      });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(ch);
    };
  }, [fetchReviews, debouncedFetch]);

  return { reviews, loadingReviews };
}

// Mask email: jo****@gmail.com
const maskEmail = (email: string): string => {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(2, Math.min(user.length - 2, 4)))}@${domain}`;
};

const timeAgo = (date: string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Reviewer: real name or masked email, sub = store + masked email
const getReviewerInfo = (r: FeedbackItem) => {
  const masked = r.owner_email ? maskEmail(r.owner_email) : null;
  const name = r.owner_name || masked || "Member";
  const sub = [r.owner_store, masked].filter(Boolean).join(" · ") || r.category.replace(/_/g, " ");
  const avatar = (r.owner_name || r.owner_email || "M").charAt(0).toUpperCase();
  return { name, sub, avatar };
};

// Owner feed: full name + masked email in subtitle
const getOwnerInfo = (u: { email: string; full_name: string | null; store_name: string | null }) => {
  const masked = maskEmail(u.email);
  const name = u.full_name?.trim() || masked;
  const sub = u.store_name?.trim() ? `${u.store_name} · ${masked}` : masked;
  return { name, sub, avatar: name.charAt(0).toUpperCase() };
};

// Feature data
const FEATURES = [
  { icon: <Package size={22} />, name: "Smart Inventory", tagline: "Real-Time Tracking", desc: "Track every product live — sachets to bulk goods, low-stock alerts, and full category management.", gradient: "from-blue-500 to-indigo-600", light: "bg-blue-50 text-blue-600" },
  { icon: <Receipt size={22} />, name: "Sales POS", tagline: "Core Feature", hot: true, desc: "Process sales in seconds — auto-compute change, transaction history, and real profit tracking.", gradient: "from-amber-400 to-orange-500", light: "bg-amber-50 text-amber-600" },
  { icon: <CreditCard size={22} />, name: "Utang Manager", tagline: "Credit Tracking", desc: "Digital ledger for customer credit. Log balances, mark payments, and set due dates automatically.", gradient: "from-purple-500 to-violet-600", light: "bg-purple-50 text-purple-600" },
  { icon: <PieChart size={22} />, name: "Analytics", tagline: "Business Insights", desc: "Revenue, profit margins, best-sellers, supplier performance — know your numbers at a glance.", gradient: "from-emerald-500 to-teal-600", light: "bg-emerald-50 text-emerald-600" },
  { icon: <Database size={22} />, name: "Supplier Hub", tagline: "Supply Chain", desc: "Manage suppliers, track purchase orders, and monitor restock cycles without the paperwork.", gradient: "from-cyan-500 to-sky-600", light: "bg-cyan-50 text-cyan-600" },
  { icon: <ShieldCheck size={22} />, name: "2FA Security", tagline: "Account Protection", desc: "Two-factor authentication, MFA, and automatic password-change alerts protect every account.", gradient: "from-rose-500 to-pink-600", light: "bg-rose-50 text-rose-600" },
];

const SECURITY_ITEMS = [
  { icon: <ShieldCheck size={18} />, title: "2FA / MFA", desc: "Two-factor and multi-factor authentication protects every owner account from unauthorized access.", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { icon: <Bell size={18} />, title: "Password Change Alerts", desc: "Automatic notifications sent instantly whenever a password is changed, keeping you in control.", color: "text-amber-400", bg: "bg-amber-400/10" },
  { icon: <Lock size={18} />, title: "Re-Auth on Sensitive Views", desc: "Dashboard and sales reports require password re-entry, protecting your financial data.", color: "text-blue-400", bg: "bg-blue-400/10" },
  { icon: <UserCheck size={18} />, title: "Hashed Staff Data", desc: "All staff and cashier personal data is hashed — emails and PINs are never exposed in plain text.", color: "text-purple-400", bg: "bg-purple-400/10" },
];

// Single review card used in both grid and ticker
function ReviewCard({ r }: { r: FeedbackItem }) {
  const d = getReviewerInfo(r);
  return (
    <div className="w-[270px] sm:w-[300px] flex-shrink-0 rounded-2xl p-5 sm:p-6 shadow-sm border bg-white" style={{ borderColor: "#E2E8F0" }}>
      <div className="flex gap-0.5 mb-3">
        {[...Array(5)].map((_, si) => (
          <Star key={si} size={12} className={si < (r.rating ?? 5) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
        ))}
      </div>
      {r.title && <div className="font-bold text-xs mb-1.5" style={{ color: "#0F172A" }}>{r.title}</div>}
      <p className="text-xs sm:text-[0.82rem] leading-relaxed italic mb-4" style={{ color: "#64748B" }}>
        "{r.message.length > 130 ? `${r.message.slice(0, 130)}…` : r.message}"
      </p>
      <div className="flex items-center gap-3 pt-3.5 border-t" style={{ borderColor: "#F1F5F9" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
          style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}>
          {d.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[0.82rem] truncate" style={{ color: "#0F172A" }}>{d.name}</div>
          <div className="text-[0.62rem] truncate" style={{ color: "#94A3B8" }}>{d.sub} · {timeAgo(r.created_at)}</div>
        </div>
      </div>
    </div>
  );
}

// Empty state for reviews
function ReviewsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto"
        style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
        <MessageSquare size={28} style={{ color: "#2563EB" }} />
      </div>
      <h3 className="font-black text-lg mb-2" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>
        Be the First to Share!
      </h3>
      <p className="text-sm max-w-[280px] leading-relaxed mb-5" style={{ color: "#64748B" }}>
        No reviews yet — once store owners start using SariSari IMS, their feedback will appear here in real time.
      </p>
      <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border"
        style={{ background: "#F8FAFC", borderColor: "#E2E8F0", color: "#64748B" }}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Listening for new reviews live
      </div>
    </div>
  );
}

// Empty state for community feed
function FeedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-2xl border"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ background: "rgba(37,99,235,0.15)" }}>
        <Inbox size={22} style={{ color: "#60A5FA" }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>No activity yet</p>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Owner activity will appear here</p>
    </div>
  );
}

// Animated image component — scale + subtle parallax on hover, not cropped
function AnimatedImage({
  src, alt, className = "", aspectClass = "aspect-[4/3]",
  overlayColor = "rgba(5,14,31,0.18)", priority = false,
}: {
  src: string; alt: string; className?: string; aspectClass?: string;
  overlayColor?: string; priority?: boolean;
}) {
  return (
    <motion.div
      className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl ${className}`}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.5, ease: "easeOut" }}>
      <motion.div className="w-full h-full"
        whileHover={{ scale: 1.04 }}
        transition={{ duration: 0.6, ease: "easeOut" }}>
        <Image src={src} alt={alt} fill priority={priority}
          className="object-cover"
          style={{ objectPosition: "center center" }}
          sizes="(max-width:768px) 100vw, 50vw" />
      </motion.div>
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${overlayColor} 0%, transparent 60%)` }} />
    </motion.div>
  );
}

// Main page
export default function SariSariLandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImgY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  const { stats, loading } = useLiveStats();
  const { reviews, loadingReviews } = useLiveFeedback();

  // Duplicate for infinite ticker — only when 4+ reviews
  const tickerReviews = reviews.length >= 4 ? [...reviews, ...reviews] : reviews;

  return (
    <div className="overflow-x-hidden" style={{ background: "var(--bg)" }}>
      <GlobalStyles />
      <Navbar />

      {/* HERO */}
      <section ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-20 px-4 sm:px-6"
        style={{ background: "var(--navy)" }}>
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="glow-pulse absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse,rgba(37,99,235,0.25) 0%,transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full blur-[90px] pointer-events-none" style={{ background: "rgba(245,158,11,0.08)" }} />
        <div className="absolute bottom-0 left-0 w-[350px] h-[250px] rounded-full blur-[80px] pointer-events-none" style={{ background: "rgba(99,102,241,0.1)" }} />

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-12">

          {/* Left */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 mb-7 border text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Inventory Management System for Sari-Sari Stores
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center justify-center lg:justify-start gap-3 mb-5">
              <Image src="/images/logo.png" alt="SariSari IMS" width={50} height={50} className="rounded-2xl shadow-xl"
                style={{ boxShadow: "0 0 30px rgba(37,99,235,0.4)" }} />
              <div className="text-left">
                <div className="text-white font-black text-xl leading-none" style={{ fontFamily: "'Familjen Grotesk',sans-serif" }}>SariSari IMS</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "#60A5FA" }}>Complete Store Management</div>
              </div>
            </motion.div>

            <motion.h1 className="hero-title font-black leading-[1.06] mb-5 text-white"
              style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(2.2rem,5vw,3.8rem)", maxWidth: 580 }}
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
              Run Your{" "}
              <span className="relative inline-block">
                <span style={{ WebkitTextFillColor: "transparent", background: "linear-gradient(135deg,#F59E0B,#FCD34D,#F97316)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>Tindahan</span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full opacity-70" style={{ background: "linear-gradient(90deg,#F59E0B,#F97316)" }} />
              </span>{" "}Like a Pro.
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-base sm:text-lg leading-relaxed mb-8 max-w-[480px]" style={{ color: "#94A3B8" }}>
              The complete digital platform built for Philippine sari-sari stores. Track stocks, process sales, manage utang, and see your real profits — secured with 2FA and built for your whole team.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 mb-5 w-full sm:w-auto">
              <Link href="/auth/register"
                className="group flex items-center justify-center gap-2.5 font-bold px-8 py-4 rounded-2xl transition-all duration-300 text-[0.95rem] active:scale-95 shadow-2xl"
                style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)", color: "#1C1917", boxShadow: "0 8px 32px rgba(245,158,11,0.3)" }}>
                <Download size={17} className="group-hover:-translate-y-0.5 transition-transform" />
                Get Started — It's Free
              </Link>
              <Link href="/dashboard"
                className="flex items-center justify-center gap-2.5 font-semibold px-8 py-4 rounded-2xl transition-all active:scale-95 text-[0.95rem] border"
                style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
                <Play size={15} className="text-blue-400" fill="currentColor" />
                View Live Demo
              </Link>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-[0.72rem] font-medium" style={{ color: "#475569" }}>
              ✓ No credit card &nbsp;·&nbsp; ✓ Free forever plan &nbsp;·&nbsp; ✓ Setup in 5 minutes
            </motion.p>
          </div>

          {/* Right: flat dashboard screenshot with parallax + floating badges */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full lg:w-[500px] relative flex-shrink-0">

            {/* Glow */}
            <div className="absolute -inset-6 rounded-3xl blur-[60px] pointer-events-none"
              style={{ background: "radial-gradient(ellipse,rgba(37,99,235,0.18) 0%,transparent 70%)" }} />

            {/* Dashboard image */}
            <motion.div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border"
              style={{ borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
              <motion.div style={{ y: heroImgY }}>
                <div className="relative w-full" style={{ aspectRatio: "16/10" }}>
                  <Image src="/images/dashboard.png" alt="SariSari IMS Dashboard" fill priority
                    className="object-cover object-top"
                    sizes="(max-width:768px) 100vw, 500px" />
                </div>
              </motion.div>
              {/* Browser chrome bar */}
              <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2"
                style={{ background: "rgba(10,13,22,0.85)", backdropFilter: "blur(8px)" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(239,68,68,0.8)" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(245,158,11,0.8)" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(34,197,94,0.8)" }} />
                <div className="flex-1 mx-2 rounded-md px-2 py-0.5 text-[0.55rem] font-mono"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}>
                  sarisari-ims.app/dashboard
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            </motion.div>

            {/* Live owners badge — bottom left */}
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="float-badge absolute -bottom-4 -left-3 sm:-left-6 z-20 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 border shadow-xl"
              style={{ background: "rgba(5,14,31,0.9)", borderColor: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", minWidth: 145 }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(5,150,105,0.2)", border: "1px solid rgba(5,150,105,0.3)" }}>
                  <TrendingUp size={13} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm leading-none">
                    {loading ? "..." : `${stats.owners}+`}
                  </div>
                  <div className="text-[0.58rem] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Active Owners</div>
                </div>
                <span className="ml-1 relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
            </motion.div>

            {/* Alert pill — top right */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
              className="absolute -top-3 -right-3 sm:-right-4 z-20 rounded-full px-3 py-1.5 border shadow-lg flex items-center gap-1.5"
              style={{ background: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.35)", backdropFilter: "blur(10px)" }}>
              <Bell size={11} className="text-amber-400" />
              <span className="text-amber-300 font-semibold whitespace-nowrap" style={{ fontSize: "0.65rem" }}>Low stock alert!</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1 z-20">
          <span className="text-[0.58rem] font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.18)" }}>Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.18)" }} />
          </motion.div>
        </motion.div>
      </section>

      {/* LIVE STATS BAR */}
      <section className="py-8 px-4 sm:px-6" style={{ background: "var(--navy)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                label: "Store Owners",
                val: stats.owners,
                icon: <Store size={18} />,
                color: "#3B82F6",
                bg: "rgba(59,130,246,0.12)",
                border: "rgba(59,130,246,0.25)",
                accent: "#3B82F6",
              },
              {
                label: "Products Tracked",
                val: stats.totalProducts,
                icon: <Package size={18} />,
                color: "#F59E0B",
                bg: "rgba(245,158,11,0.12)",
                border: "rgba(245,158,11,0.25)",
                accent: "#F59E0B",
              },
              {
                label: "Total Transactions",
                val: stats.totalSales,
                icon: <Receipt size={18} />,
                color: "#10B981",
                bg: "rgba(16,185,129,0.12)",
                border: "rgba(16,185,129,0.25)",
                accent: "#10B981",
              },
              {
                label: "Active Staff",
                val: stats.cashiers + stats.staff,
                icon: <Users size={18} />,
                color: "#A78BFA",
                bg: "rgba(167,139,250,0.12)",
                border: "rgba(167,139,250,0.25)",
                accent: "#A78BFA",
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-2xl border p-4 sm:p-5 flex flex-col gap-3"
                style={{
                  background: s.bg,
                  borderColor: s.border,
                  backdropFilter: "blur(12px)",
                }}>
                {/* Accent line top */}
                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                  style={{ background: s.accent, opacity: 0.7 }} />

                {/* Icon + live dot */}
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `rgba(${s.color === "#3B82F6" ? "59,130,246" : s.color === "#F59E0B" ? "245,158,11" : s.color === "#10B981" ? "16,185,129" : "167,139,250"},0.18)`, color: s.color }}>
                    {s.icon}
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                      style={{ background: s.color }} />
                    <span className="relative inline-flex rounded-full h-2 w-2"
                      style={{ background: s.color }} />
                  </span>
                </div>

                {/* Value */}
                <div>
                  <div className="font-black leading-none mb-1"
                    style={{ fontSize: "clamp(1.4rem,3.5vw,1.9rem)", color: s.color, fontFamily: "'Familjen Grotesk',sans-serif" }}>
                    {loading
                      ? <span className="skeleton inline-block w-14 h-7 rounded-lg" />
                      : <AnimatedCount target={s.val} />}
                  </div>
                  <div className="font-semibold uppercase tracking-widest"
                    style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>
                    {s.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — cashier-staff flat image with animation */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <span className="inline-block rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] mb-5"
                style={{ background: "#EFF6FF", color: "#2563EB" }}>Built for Negosyante</span>
              <h2 className="font-black leading-tight mb-5" style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.8rem,4vw,3rem)", color: "#0F172A" }}>
                Stop Managing With<br /><span style={{ color: "#2563EB" }}>Paper & Guesswork.</span>
              </h2>
              <p className="leading-relaxed mb-7 text-sm sm:text-base max-w-[420px]" style={{ color: "#64748B" }}>
                Every Filipino store owner deserves tools that match their hustle. Built for the counter, priced at zero.
              </p>
              <div className="space-y-3">
                {[
                  { emoji: "📓", before: "Notebook utang tracking", after: "Digital ledger with auto-balances" },
                  { emoji: "📦", before: "Guessing when to restock", after: "Automated low-stock alerts" },
                  { emoji: "🧾", before: "No idea of real profits", after: "Live profit analytics per product" },
                  { emoji: "🔒", before: "Shared, unsecured accounts", after: "2FA protection + role-based access" },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                    className="flex items-center gap-3 rounded-xl p-3 border" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs line-through mb-0.5" style={{ color: "#94A3B8" }}>{item.before}</div>
                      <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#059669" }}>
                        <CheckCircle size={10} /> {item.after}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              {/* Flat image — no cropping, full width, hover scale */}
              <div className="relative">
                <AnimatedImage
                  src="/images/auth/cashier-staff.jpeg"
                  alt="Cashier and Staff using SariSari IMS"
                  aspectClass="aspect-[4/5] sm:aspect-[3/4]"
                  overlayColor="rgba(5,14,31,0.4)"
                />
                {/* Live staff badge over image */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }} viewport={{ once: true }}
                  className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 rounded-2xl p-3.5 border backdrop-blur-md"
                  style={{ background: "rgba(5,14,31,0.82)", borderColor: "rgba(255,255,255,0.12)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                      <Users size={16} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm">Multi-Staff Access</div>
                      <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {loading ? "Loading..." : `${stats.cashiers} cashiers · ${stats.staff} staff`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
                    </div>
                  </div>
                </motion.div>

                {/* Floating revenue card */}
                <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-3 sm:-right-6 hidden sm:block rounded-2xl p-4 shadow-xl border"
                  style={{ background: "white", borderColor: "#E2E8F0", minWidth: 150 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className="text-xs font-bold" style={{ color: "#0F172A" }}>Total Revenue</span>
                  </div>
                  <div className="font-black text-lg" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#059669" }}>
                    {loading ? <span className="skeleton-lt inline-block w-20 h-6 rounded" /> : `₱${(stats.totalSales * 85).toLocaleString()}`}
                  </div>
                  <div className="text-[0.6rem] mt-0.5 font-medium" style={{ color: "#94A3B8" }}>across all stores</div>
                </motion.div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 sm:py-28 px-4 sm:px-6" style={{ background: "#F4F6FA" }}>
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12 sm:mb-16">
            <span className="inline-block rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] border mb-5"
              style={{ background: "white", color: "#2563EB", borderColor: "#DBEAFE" }}>Platform Modules</span>
            <h2 className="font-black leading-tight mb-4" style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.8rem,4vw,3rem)", color: "#0F172A" }}>
              Everything Your Tindahan<br /><span style={{ color: "#2563EB" }}>Needs to Thrive.</span>
            </h2>
            <p className="text-sm sm:text-base max-w-[420px] mx-auto leading-relaxed" style={{ color: "#64748B" }}>
              Six powerful modules, one seamless system — designed specifically for Filipino sari-sari operations.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.name} delay={i * 0.07}>
                <motion.div whileHover={{ y: -5, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }} transition={{ duration: 0.2 }}
                  className="relative bg-white rounded-2xl p-6 sm:p-7 h-full border shadow-sm overflow-hidden" style={{ borderColor: "var(--border)" }}>
                  <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${f.gradient}`} />
                  {f.hot && (
                    <span className="absolute top-4 right-4 text-[0.58rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
                      <Zap size={7} /> Core Feature
                    </span>
                  )}
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.light} mb-4`}>{f.icon}</div>
                  <div className="text-[0.6rem] font-black uppercase tracking-widest mb-1.5" style={{ color: "#94A3B8" }}>{f.tagline}</div>
                  <h3 className="font-black text-base sm:text-lg mb-2" style={{ fontFamily: "'Familjen Grotesk',sans-serif", color: "#0F172A" }}>{f.name}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>{f.desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.3} className="text-center mt-10 sm:mt-12">
            <Link href="/pages/features"
              className="inline-flex items-center gap-2.5 font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl hover:-translate-y-1 text-sm sm:text-[0.9rem] text-white"
              style={{ background: "#0F172A" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2563EB")}
              onMouseLeave={e => (e.currentTarget.style.background = "#0F172A")}>
              Explore All Features <ArrowRight size={15} />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* SECURITY — flat login image with animation */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 overflow-hidden" style={{ background: "var(--navy)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <span className="inline-block rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] border mb-6"
                style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", borderColor: "rgba(239,68,68,0.2)" }}>
                Enterprise-Grade Security
              </span>
              <h2 className="font-black leading-tight mb-5 text-white"
                style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>
                Your Business, Protected<br /><span style={{ color: "#60A5FA" }}>At Every Level.</span>
              </h2>
              <p className="leading-relaxed mb-8 text-sm sm:text-base max-w-[400px]" style={{ color: "#94A3B8" }}>
                We take security seriously so you don't have to. From account sign-in to sensitive financial data, every layer is guarded.
              </p>

              {/* Login image — full view, not cropped */}
              <div className="relative">
                <motion.div
                  className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  whileHover={{ scale: 1.015 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}>
                  <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                    <Image
                      src="/images/auth/login.jpeg"
                      alt="Secure login screen"
                      fill
                      className="object-contain"
                      style={{ objectPosition: "top center", background: "#0f172a" }}
                      sizes="(max-width:768px) 100vw, 50vw"
                    />
                  </div>
                  {/* Subtle bottom fade */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 70%, rgba(5,14,31,0.5) 100%)" }} />
                </motion.div>
                <div className="absolute bottom-4 left-4 right-4 rounded-xl px-4 py-3 border backdrop-blur-md flex items-center gap-2"
                  style={{ background: "rgba(5,14,31,0.85)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <Lock size={13} className="text-amber-400 shrink-0" />
                  <span className="text-white text-xs font-semibold">Protected by 2FA + MFA Authentication</span>
                </div>
                {/* Shield badge */}
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-3 -right-3 sm:-right-4 hidden sm:block rounded-2xl px-3.5 py-2.5 border shadow-xl"
                  style={{ background: "rgba(5,14,31,0.95)", borderColor: "rgba(255,255,255,0.12)" }}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <div>
                      <div className="text-white text-xs font-bold leading-none">Secured</div>
                      <div className="text-[0.58rem] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>All accounts</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="space-y-4">
                {SECURITY_ITEMS.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                    className="flex items-start gap-4 rounded-2xl p-5 border backdrop-blur-sm"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 border`}
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}>{item.icon}</div>
                    <div>
                      <div className="text-white font-bold text-sm mb-1">{item.title}</div>
                      <div className="text-[0.78rem] leading-relaxed" style={{ color: "#64748B" }}>{item.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* DEVICE COMPATIBILITY */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white border-y" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-12 items-center">
            <FadeUp>
              <span className="inline-block rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] mb-5"
                style={{ background: "#EFF6FF", color: "#2563EB" }}>Works Everywhere</span>
              <h2 className="font-black leading-tight mb-5" style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.8rem,4vw,2.8rem)", color: "#0F172A" }}>
                Access From Any<br /><span style={{ color: "#2563EB" }}>Device, Anytime.</span>
              </h2>
              <p className="text-sm sm:text-base leading-relaxed mb-7 max-w-[400px]" style={{ color: "#64748B" }}>
                Whether at the counter on your phone or reviewing reports on a desktop — SariSari IMS adapts seamlessly.
              </p>
              <div className="flex flex-wrap gap-3">
                {[{ icon: <Smartphone size={14} />, label: "Mobile" }, { icon: <Monitor size={14} />, label: "Desktop" }, { icon: <Globe size={14} />, label: "Web Browser" }].map((d) => (
                  <div key={d.label} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold border"
                    style={{ background: "#F8FAFC", borderColor: "#E2E8F0", color: "#334155" }}>
                    <span style={{ color: "#2563EB" }}>{d.icon}</span>{d.label}
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { icon: <Zap size={18} />, title: "Instant Setup", desc: "Running in under 5 minutes, no install needed.", color: "#F59E0B", bg: "#FFFBEB" },
                  { icon: <Shield size={18} />, title: "Secure & Backed Up", desc: "Cloud-synced data — safe even if your device breaks.", color: "#2563EB", bg: "#EFF6FF" },
                  { icon: <RefreshCw size={18} />, title: "Real-time Sync", desc: "All your staff see the same live data instantly.", color: "#059669", bg: "#ECFDF5" },
                  { icon: <Bell size={18} />, title: "Smart Alerts", desc: "Low stock, unpaid utang — always notified.", color: "#7C3AED", bg: "#F5F3FF" },
                ].map((item) => (
                  <motion.div key={item.title} whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.07)" }}
                    className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-shadow" style={{ borderColor: "#E2E8F0" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: item.bg, color: item.color }}>{item.icon}</div>
                    <div className="font-bold text-xs sm:text-sm mb-1" style={{ color: "#0F172A" }}>{item.title}</div>
                    <div className="text-[0.68rem] sm:text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{item.desc}</div>
                  </motion.div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* LIVE COMMUNITY */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 overflow-hidden" style={{ background: "#050E1F" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
            <FadeUp>
              <span className="inline-block rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] border mb-6"
                style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", borderColor: "rgba(245,158,11,0.2)" }}>
                Live Community
              </span>
              <h2 className="font-black text-white leading-tight mb-5"
                style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.8rem,4vw,3rem)" }}>
                {loading ? "Hundreds of" : `${stats.owners.toLocaleString()}+`} Store Owners<br />
                Trust <span style={{ color: "#F59E0B" }}>SariSari IMS.</span>
              </h2>
              <p className="text-sm sm:text-base leading-relaxed mb-8 max-w-[400px]" style={{ color: "#94A3B8" }}>
                Join a growing community of Filipino negosyantes, cashiers, and staff who've gone digital and never looked back.
              </p>
              <Link href="/auth/register"
                className="inline-flex items-center gap-2.5 font-bold px-7 sm:px-8 py-3.5 sm:py-4 rounded-2xl transition-all duration-200 shadow-xl text-sm sm:text-[0.9rem]"
                style={{ background: "#F59E0B", color: "#1C1917", boxShadow: "0 8px 30px rgba(245,158,11,0.25)" }}>
                <Store size={16} /> Join Them — Free <ArrowRight size={14} />
              </Link>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="space-y-4">
                {/* Role cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Owners", val: stats.owners, icon: <Store size={14} />, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
                    { label: "Cashiers", val: stats.cashiers, icon: <ShoppingCart size={14} />, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
                    { label: "Staff", val: stats.staff, icon: <Users size={14} />, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                  ].map(r => (
                    <div key={r.label} className={`${r.bg} border ${r.border} rounded-2xl p-4 text-center`}>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-xl ${r.bg} ${r.color} mx-auto mb-2 border ${r.border}`}>{r.icon}</div>
                      <div className={`font-black text-xl leading-none mb-1 ${r.color}`} style={{ fontFamily: "'Familjen Grotesk',sans-serif" }}>
                        {loading ? <span className="skeleton inline-block w-8 h-5 rounded" /> : <AnimatedCount target={r.val} />}
                      </div>
                      <div className="text-[0.58rem] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{r.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent owners feed */}
                <div className="rounded-2xl overflow-hidden border" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[0.62rem] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Recently Active</span>
                    </div>
                    <span className="text-[0.58rem] font-bold px-2.5 py-1 rounded-full border"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.08)" }}>Live</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    {loading
                      ? [...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="skeleton w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-1.5">
                            <div className="skeleton h-2.5 rounded w-28" />
                            <div className="skeleton h-2 rounded w-20" />
                          </div>
                        </div>
                      ))
                      : stats.recentOwners.length === 0
                        ? <FeedEmpty />
                        : stats.recentOwners.map((u, i) => {
                          const d = getOwnerInfo(u);
                          return (
                            <motion.div key={u.email} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }} className="flex items-center gap-3 px-4 py-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                                style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)", color: "#93C5FD" }}>
                                {d.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{d.name}</div>
                                <div className="text-[0.58rem] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{d.sub} · {timeAgo(u.updated_at)}</div>
                              </div>
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            </motion.div>
                          );
                        })
                    }
                  </div>
                </div>

                {/* Recent activity */}
                {!loading && stats.recentActivity.length > 0 && (
                  <div className="rounded-2xl overflow-hidden border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <Activity size={11} className="text-blue-400" />
                      <span className="text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Recent Activity</span>
                    </div>
                    {stats.recentActivity.map((a, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-2.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.72rem] leading-tight" style={{ color: "rgba(255,255,255,0.55)" }}>{a.description}</div>
                          <div className="text-[0.6rem] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{a.staff_name} · {timeAgo(a.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — adaptive: 1-3 grid, 4+ infinite ticker */}
      <section className="py-20 sm:py-28 overflow-hidden" style={{ background: "#F4F6FA" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-10 sm:mb-12">
          <FadeUp className="text-center">
            <span className="inline-block rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] border mb-5"
              style={{ background: "white", color: "#2563EB", borderColor: "#DBEAFE" }}>Testimonials</span>
            <h2 className="font-black mb-3" style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.8rem,4vw,3rem)", color: "#0F172A" }}>
              Sabi ng mga <span style={{ color: "#2563EB" }}>Negosyante</span> 💬
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {!loadingReviews && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <p className="text-sm font-semibold" style={{ color: "#059669" }}>
                    {reviews.length === 0
                      ? "Waiting for first review"
                      : `${reviews.length} verified ${reviews.length === 1 ? "review" : "reviews"} from store owners`}
                  </p>
                </>
              )}
              {loadingReviews && <div className="skeleton-lt h-4 w-48 rounded" />}
            </div>
          </FadeUp>
        </div>

        {loadingReviews ? (
          // Skeleton
          <div className="flex gap-4 px-4 sm:px-6 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-[270px] sm:w-[300px] flex-shrink-0 rounded-2xl p-5 border bg-white" style={{ borderColor: "#E2E8F0" }}>
                <div className="skeleton-lt h-3 w-16 rounded mb-4" />
                <div className="skeleton-lt h-2.5 w-full rounded mb-2" />
                <div className="skeleton-lt h-2.5 w-4/5 rounded mb-2" />
                <div className="skeleton-lt h-2.5 w-3/5 rounded mb-5" />
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "#F1F5F9" }}>
                  <div className="skeleton-lt w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton-lt h-2.5 w-24 rounded" />
                    <div className="skeleton-lt h-2 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <ReviewsEmpty />
          </div>
        ) : reviews.length <= 3 ? (
          // Grid layout for 1-3 reviews
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className={`grid gap-5 ${reviews.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : reviews.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {reviews.map(r => <ReviewCard key={r.id} r={r} />)}
            </div>
          </div>
        ) : (
          // Infinite ticker for 4+ reviews
          <div className="overflow-hidden"
            style={{ maskImage: "linear-gradient(90deg,transparent,black 6%,black 94%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,black 6%,black 94%,transparent)" }}>
            <div className="flex gap-4 ticker-anim" style={{ width: "max-content" }}>
              {tickerReviews.map((r, i) => (
                <ReviewCard key={`${r.id}-${i}`} r={r} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* REGISTER VIDEO — flat, visible, with animation overlay */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            <FadeUp>
              <div className="relative">
                {/* Flat video — visible, not cropped */}
                <motion.div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border"
                  style={{ aspectRatio: "9/16", maxWidth: 320, margin: "0 auto", borderColor: "#E2E8F0" }}
                  whileHover={{ scale: 1.015 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}>
                  <video src="/images/auth/register.mov" autoPlay muted loop playsInline
                    className="w-full h-full object-cover" style={{ objectPosition: "center top" }} />
                  {/* Scan line animation */}
                  <motion.div className="absolute left-0 right-0 h-[2px] pointer-events-none"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(37,99,235,0.5),transparent)", zIndex: 5 }}
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                  {/* Bottom overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4"
                    style={{ background: "linear-gradient(to top,rgba(5,14,31,0.7) 0%,transparent 100%)" }}>
                    <div className="text-white text-xs font-semibold">Register your store in minutes</div>
                  </div>
                </motion.div>

                {/* Step badges */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 right-4 sm:right-0 rounded-2xl px-3.5 py-2.5 border shadow-xl"
                  style={{ background: "white", borderColor: "#E2E8F0", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", minWidth: 140 }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-black" style={{ background: "#2563EB" }}>1</div>
                    <div>
                      <div className="font-bold text-xs" style={{ color: "#0F172A" }}>Create Account</div>
                      <div className="text-[0.58rem]" style={{ color: "#94A3B8" }}>Free, no card needed</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-4 right-4 sm:right-0 rounded-2xl px-3.5 py-2.5 border shadow-xl"
                  style={{ background: "white", borderColor: "#E2E8F0", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", minWidth: 140 }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-black" style={{ background: "#059669" }}>2</div>
                    <div>
                      <div className="font-bold text-xs" style={{ color: "#0F172A" }}>Setup in 5 min</div>
                      <div className="text-[0.58rem]" style={{ color: "#94A3B8" }}>Add products & staff</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              <span className="inline-block rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] mb-6"
                style={{ background: "#EFF6FF", color: "#2563EB" }}>Get Started in Minutes</span>
              <h2 className="font-black leading-tight mb-5"
                style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.8rem,4vw,3rem)", color: "#0F172A" }}>
                Sign Up and Start<br /><span style={{ color: "#2563EB" }}>Managing Today.</span>
              </h2>
              <p className="leading-relaxed mb-8 text-sm sm:text-base max-w-[420px]" style={{ color: "#64748B" }}>
                Creating your SariSari IMS account takes less than 2 minutes. No installation, no credit card. Just sign up and your store is live.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { num: "01", title: "Create your free account", desc: "Enter your email and store name to get started instantly." },
                  { num: "02", title: "Add your products", desc: "Import or manually add your inventory — sachets, drinks, everything." },
                  { num: "03", title: "Invite your staff", desc: "Set roles for cashiers and staff with secure PIN access." },
                  { num: "04", title: "Start selling!", desc: "Use the POS, track utang, and watch your profits grow." },
                ].map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }} viewport={{ once: true }} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs"
                      style={{ background: i === 0 ? "#2563EB" : "#F1F5F9", color: i === 0 ? "white" : "#94A3B8", fontFamily: "'Familjen Grotesk',sans-serif" }}>
                      {step.num}
                    </div>
                    <div className="pt-1">
                      <div className="font-bold text-sm mb-0.5" style={{ color: "#0F172A" }}>{step.title}</div>
                      <div className="text-[0.78rem] leading-relaxed" style={{ color: "#64748B" }}>{step.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Link href="/auth/register"
                className="inline-flex items-center gap-2.5 font-bold px-7 py-4 rounded-2xl transition-all duration-200 shadow-xl text-sm"
                style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "white", boxShadow: "0 8px 30px rgba(37,99,235,0.3)" }}>
                <Download size={15} /> Create Free Account <ArrowRight size={14} />
              </Link>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="relative rounded-3xl overflow-hidden p-8 sm:p-10 md:p-16"
              style={{ background: "linear-gradient(135deg,#050E1F 0%,#0c1a3a 50%,#091428 100%)" }}>
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
              <div className="absolute top-0 right-0 w-[400px] h-[350px] rounded-full blur-[100px] pointer-events-none" style={{ background: "rgba(37,99,235,0.12)" }} />
              <div className="absolute bottom-0 left-0 w-[300px] h-[250px] rounded-full blur-[80px] pointer-events-none" style={{ background: "rgba(245,158,11,0.08)" }} />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Image src="/images/logo.png" alt="Logo" width={44} height={44} className="rounded-xl" />
                    <div>
                      <div className="text-white font-black text-base leading-none" style={{ fontFamily: "'Familjen Grotesk',sans-serif" }}>SariSari IMS</div>
                      <div className="text-xs mt-0.5" style={{ color: "#60A5FA" }}>Free to get started</div>
                    </div>
                  </div>
                  <h2 className="font-black text-white leading-tight mb-4 sm:mb-5"
                    style={{ fontFamily: "'Familjen Grotesk',sans-serif", fontSize: "clamp(1.7rem,4vw,2.8rem)" }}>
                    Ready to Grow<br /><span style={{ color: "#F59E0B" }}>Your Tindahan?</span>
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed mb-7 sm:mb-8 max-w-[360px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Join {loading ? "thousands of" : `${stats.owners.toLocaleString()}+`} Filipino store owners who've already taken their negosyo digital. No fees, no contracts.
                  </p>
                  <Link href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 font-bold text-sm rounded-xl px-6 sm:px-7 py-3.5 sm:py-4 transition-all duration-200 shadow-xl"
                    style={{ background: "#F59E0B", color: "#1C1917", boxShadow: "0 8px 30px rgba(245,158,11,0.25)" }}>
                    <Download size={15} /> Create Free Account
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { icon: <CheckCircle size={14} />, label: "Free Forever Plan", value: "Core inventory + sales, no expiry" },
                    { icon: <Clock size={14} />, label: "5-Minute Setup", value: "Start tracking your store in minutes" },
                    { icon: <ShieldCheck size={14} />, label: "2FA Protected", value: "Multi-factor auth on every account" },
                    { icon: <Globe size={14} />, label: "All Devices", value: "Phone, tablet, or desktop — your choice" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3 rounded-2xl p-3.5 sm:p-4 border"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(37,99,235,0.15)", color: "#93C5FD" }}>{item.icon}</div>
                      <div>
                        <div className="text-[0.6rem] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#60A5FA" }}>{item.label}</div>
                        <div className="text-[0.75rem] sm:text-[0.8rem] font-medium leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  );
}