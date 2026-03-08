"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Package, ShoppingCart, Users, TrendingUp,
  Zap, Shield, Globe, ArrowRight, Star, CheckCircle,
  Bell, Database, RefreshCw,
  Store, Receipt, CreditCard, PieChart, Clock,
  MessageCircle, BarChart3, ChevronDown,
  Download, Smartphone, Monitor, Award, Play
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import Navbar from "./comps/navbar/page";
import Footer from "./comps/footer/page";

// ── FadeUp wrapper ──
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

// ── Features data ──
const FEATURES = [
  {
    icon: <Package size={20} />, name: "Smart Inventory", tagline: "Real-Time Tracking",
    desc: "Track every product live — sachets to bulk goods, low-stock alerts, category management.",
    color: "from-blue-500 to-blue-700", light: "bg-blue-50 text-blue-600",
  },
  {
    icon: <Receipt size={20} />, name: "Sales POS", tagline: "Hot Feature",
    desc: "Process sales in seconds — auto-compute change, transaction history, profit tracking.",
    color: "from-amber-400 to-orange-500", light: "bg-amber-50 text-amber-600", hot: true,
  },
  {
    icon: <CreditCard size={20} />, name: "Utang Manager", tagline: "Credit Tracking",
    desc: "Digital ledger for customer credit. Log balances, mark payments, set due dates.",
    color: "from-purple-500 to-purple-700", light: "bg-purple-50 text-purple-600",
  },
  {
    icon: <PieChart size={20} />, name: "Analytics", tagline: "Business Insights",
    desc: "Revenue, profit margins, best-sellers, supplier performance — know your numbers.",
    color: "from-emerald-500 to-green-600", light: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: <Database size={20} />, name: "Supplier Hub", tagline: "Supply Chain",
    desc: "Manage suppliers, track purchase orders, monitor restock cycles effortlessly.",
    color: "from-cyan-500 to-sky-600", light: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: <Users size={20} />, name: "Multi-Staff", tagline: "Team Access",
    desc: "Role-based access for owners and staff. Everyone sees what they need.",
    color: "from-rose-500 to-pink-600", light: "bg-rose-50 text-rose-600",
  },
];

const REVIEWS = [
  { name: "Ate Jenny", role: "Store owner, QC", text: "Hindi ko na kailangang magsulat ng utang sa notebook. Lahat naka-track na sa SariSari! Sobrang ganda." },
  { name: "Kuya Ben", role: "Marikina", text: "Ang sales report ay nagbukas ng mata ko. Hindi ko alam na ang fishball ang pinaka-profitable kong item!" },
  { name: "Manang Luz", role: "Caloocan", text: "Nung una, nahirapan ako pero ang dali pala pag natuto na. Ngayon, alam ko lagi ang benta ko araw-araw." },
  { name: "Tito Romy", role: "Pasig", text: "Yung low-stock alert ay game changer! Hindi na ako nauubos ng stocks na hindi ko nalalaman." },
  { name: "Ate Cora", role: "Antipolo", text: "Sobrang ganda ng design. Kahit hindi techie tulad ko, kaya ko i-navigate nang walang problema." },
  { name: "Lola Belen", role: "Valenzuela", text: "Ang mga anak ko ang nag-setup pero ngayon ako na mismo ang gumagamit. Salamat sa simpleng interface!" },
];
const ALL_REVIEWS = [...REVIEWS, ...REVIEWS];

// ── Live User Feed ──
function LiveUserCount() {
  const [users, setUsers] = useState<{ email: string; updated_at: string }[]>([]);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { count: totalCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setCount(totalCount ?? 0);
      const { data } = await supabase.from("profiles").select("email, updated_at").order("updated_at", { ascending: false }).limit(5);
      if (data) setUsers(data);
    };
    fetchUsers();
    const channel = supabase.channel("profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const maskEmail = (email: string) => {
    const [user, domain] = email.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">Live Store Owners</span>
        </div>
        <div className="bg-amber-400/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/20">
          {count !== null ? `${count} Registered` : "Loading..."}
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {users.length === 0
          ? [...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-white/5 rounded w-28" />
                <div className="h-2 bg-white/5 rounded w-16" />
              </div>
            </div>
          ))
          : users.map((u, i) => (
            <motion.div key={u.email} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/20 flex items-center justify-center text-blue-300 font-black text-xs flex-shrink-0">
                {u.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-white/70 text-xs font-medium">{maskEmail(u.email)}</div>
                <div className="text-white/25 text-[0.6rem]">Store Owner · Active</div>
              </div>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            </motion.div>
          ))}
      </div>
    </div>
  );
}

// ══════════════════════════════
// MAIN PAGE
// ══════════════════════════════
export default function SariSariLandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const dashY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const dashOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.4]);

  return (
    <div className="overflow-x-hidden bg-[#F9FAFB]" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>

      {/* Google Font Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        h1, h2, h3 { font-family: 'Syne', sans-serif; }
        @keyframes ticker { to { transform: translateX(-50%); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        .float-anim { animation: float 6s ease-in-out infinite; }
        .ticker-anim { animation: ticker 36s linear infinite; }
      `}</style>

      <Navbar />

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center bg-[#050E1F] overflow-hidden pt-24 pb-16 px-5">

        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

        {/* Ambient glows */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" style={{ animation: "glow-pulse 5s ease-in-out infinite" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-indigo-700/15 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-[1160px] mx-auto flex flex-col items-center text-center">

          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-8 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-white/60 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
              The #1 Inventory System for Sari-Sari Stores
            </span>
          </motion.div>

          {/* Logo + Headline */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center justify-center gap-4 mb-5">
            <Image src="/images/logo.png" alt="SariSari IMS Logo" width={56} height={56} className="rounded-2xl shadow-xl shadow-blue-900/40" />
            <div className="text-left">
              <div className="text-white font-black text-xl leading-none tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>SariSari IMS</div>
              <div className="text-blue-400 text-xs font-medium mt-0.5">Inventory Management System</div>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.15 }}
            className="text-white font-black leading-[1.07] mb-5 text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem] max-w-[860px]"
            style={{ fontFamily: "Syne, sans-serif" }}>
            Run Your{" "}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400">Tindahan</span>
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 to-orange-400 rounded-full opacity-60" />
            </span>
            {" "}Like a Pro.
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-slate-400 text-base sm:text-lg leading-relaxed mb-10 max-w-[560px]">
            The complete digital platform built for Philippine sari-sari stores. Track stocks, process sales, manage utang, and see your real profits — all in one simple system.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 mb-6">
            <Link href="/register"
              className="group flex items-center justify-center gap-2.5 bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-900 font-bold px-9 py-4 rounded-2xl transition-all duration-300 shadow-2xl shadow-amber-500/25 active:scale-95 text-[0.95rem]">
              <Download size={17} className="group-hover:-translate-y-0.5 transition-transform" />
              Get Started — It's Free
            </Link>
            <Link href="/dashboard"
              className="flex items-center justify-center gap-2.5 bg-white/6 hover:bg-white/10 border border-white/12 text-white/80 hover:text-white font-semibold px-8 py-4 rounded-2xl transition-all active:scale-95 text-[0.95rem]">
              <Play size={15} className="text-blue-400" fill="currentColor" />
              View Live Demo
            </Link>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-slate-600 text-[0.75rem] font-medium mb-14">
            ✓ No credit card &nbsp;·&nbsp; ✓ Free forever plan &nbsp;·&nbsp; ✓ Setup in 5 minutes
          </motion.p>

          {/* Dashboard Preview */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ y: dashY, opacity: dashOpacity }}
            className="relative w-full max-w-[980px] float-anim">

            {/* Glow behind dashboard */}
            <div className="absolute inset-x-10 -bottom-8 h-20 bg-blue-600/30 blur-[40px] rounded-full" />

            {/* Browser chrome wrapper */}
            <div className="relative rounded-[20px] overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
              <div className="bg-[#0d1117] px-4 py-3 flex items-center gap-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 mx-3 bg-white/5 border border-white/5 rounded-md px-3 py-1 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-white/20 text-[0.62rem] font-mono">sarisari-ims.app/dashboard</span>
                </div>
                <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                  <RefreshCw size={9} className="text-white/20" />
                </div>
              </div>
              <div className="relative w-full bg-[#0a0f1a]" style={{ paddingBottom: "56.25%" }}>
                <Image src="/images/dashboard.png" alt="SariSari IMS Dashboard" fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 980px" priority />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20">
          <span className="text-white/20 text-[0.62rem] font-medium uppercase tracking-widest">Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            <ChevronDown size={16} className="text-white/20" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══ STATS BAR ══ */}
      <section className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
            {[
              { val: "5,000+", sub: "Store Owners", icon: <Store size={16} /> },
              { val: "99.9%", sub: "Uptime SLA", icon: <Shield size={16} /> },
              { val: "Real-time", sub: "Live Sync", icon: <RefreshCw size={16} /> },
              { val: "100%", sub: "Free to Start", icon: <Award size={16} /> },
            ].map((s) => (
              <div key={s.sub} className="flex flex-col sm:flex-row items-center justify-center gap-3 py-6 px-4 text-center sm:text-left">
                <div className="text-blue-600 opacity-40">{s.icon}</div>
                <div>
                  <div className="font-black text-[1.6rem] text-blue-600 leading-none">{s.val}</div>
                  <div className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROBLEM / SOLUTION ══ */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-20">
            <span className="inline-block bg-blue-50 text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-5">Why SariSari IMS</span>
            <h2 className="font-black text-slate-900 text-3xl sm:text-4xl md:text-5xl mb-5 leading-tight">
              Stop Managing with<br />
              <span className="text-blue-600">Paper & Guesswork.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-[520px] mx-auto leading-relaxed">
              Every Filipino store owner deserves tools that match their hustle. We built exactly that.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: "📓", problem: "Notebook utang tracking", solution: "Digital ledger with auto-balances", label: "Before → After", color: "border-rose-100 bg-rose-50/50", accent: "text-rose-500" },
              { emoji: "📦", problem: "Guessing when to restock", solution: "Automated low-stock alerts", label: "Before → After", color: "border-amber-100 bg-amber-50/50", accent: "text-amber-600" },
              { emoji: "🧾", problem: "No idea of real profits", solution: "Live profit analytics per product", label: "Before → After", color: "border-emerald-100 bg-emerald-50/50", accent: "text-emerald-600" },
            ].map((item, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className={`rounded-2xl border-2 ${item.color} p-7 h-full`}>
                  <div className="text-4xl mb-4">{item.emoji}</div>
                  <div className={`text-[0.62rem] font-black uppercase tracking-widest ${item.accent} mb-3`}>{item.label}</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 line-through text-sm">{item.problem}</div>
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                      <CheckCircle size={14} className={item.accent} />
                      {item.solution}
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="py-28 px-6 bg-[#F4F6FA]">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="inline-block bg-white text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full border border-blue-100 mb-5">Platform Modules</span>
            <h2 className="font-black text-slate-900 text-3xl sm:text-4xl md:text-5xl mb-5">
              Everything Your Tindahan<br />
              <span className="text-blue-600">Needs to Thrive.</span>
            </h2>
            <p className="text-slate-500 text-base max-w-[440px] mx-auto leading-relaxed">
              Six powerful modules, one seamless system — designed specifically for Filipino sari-sari operations.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.name} delay={i * 0.07}>
                <motion.div whileHover={{ y: -5, boxShadow: "0 20px 60px rgba(0,0,0,0.10)" }}
                  transition={{ duration: 0.2 }}
                  className="relative bg-white rounded-2xl p-7 h-full border border-slate-100 shadow-sm overflow-hidden group">
                  <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${f.color}`} />
                  {f.hot && (
                    <span className="absolute top-5 right-5 bg-amber-50 border border-amber-200 text-amber-600 text-[0.6rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Zap size={8} />Core Feature
                    </span>
                  )}
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.light} mb-5`}>
                    {f.icon}
                  </div>
                  <div className="text-[0.62rem] font-black uppercase tracking-widest text-slate-400 mb-1.5">{f.tagline}</div>
                  <h3 className="font-black text-slate-900 text-lg mb-2.5">{f.name}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.3} className="text-center mt-12">
            <Link href="/pages/features"
              className="inline-flex items-center gap-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold px-9 py-4 rounded-full transition-all duration-300 shadow-xl hover:-translate-y-1 text-[0.9rem]">
              Explore All Features
              <ArrowRight size={16} />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ══ DEVICE COMPATIBILITY ══ */}
      <section className="py-20 px-6 bg-white border-y border-slate-100">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <span className="inline-block bg-blue-50 text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-5">Works Everywhere</span>
              <h2 className="font-black text-slate-900 text-3xl md:text-4xl mb-5 leading-tight">
                Access From Any<br />
                <span className="text-blue-600">Device, Anytime.</span>
              </h2>
              <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-[400px]">
                Whether you're at the counter on your phone, or reviewing reports on a tablet — SariSari IMS adapts to how you work.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: <Smartphone size={16} />, label: "Mobile" },
                  { icon: <Monitor size={16} />, label: "Desktop" },
                  { icon: <Globe size={16} />, label: "Web Browser" },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-700 text-sm font-semibold">
                    <span className="text-blue-500">{d.icon}</span>
                    {d.label}
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Zap size={22} />, title: "Instant Setup", desc: "Running in under 5 minutes, no installation needed.", color: "text-amber-500", bg: "bg-amber-50" },
                  { icon: <Shield size={22} />, title: "Secure & Backed Up", desc: "Cloud-synced data — safe even if your device breaks.", color: "text-blue-500", bg: "bg-blue-50" },
                  { icon: <RefreshCw size={22} />, title: "Real-time Sync", desc: "All your staff see the same live data instantly.", color: "text-emerald-500", bg: "bg-emerald-50" },
                  { icon: <Bell size={22} />, title: "Smart Alerts", desc: "Low stock, unpaid utang — you'll always be notified.", color: "text-purple-500", bg: "bg-purple-50" },
                ].map((item, i) => (
                  <div key={item.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-3`}>
                      {item.icon}
                    </div>
                    <div className="font-bold text-slate-900 text-sm mb-1">{item.title}</div>
                    <div className="text-slate-400 text-xs leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══ LIVE USERS ══ */}
      <section className="py-28 px-6 bg-[#050E1F] overflow-hidden">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <span className="inline-block bg-amber-400/10 text-amber-400 text-[0.7rem] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full border border-amber-400/20 mb-6">Live Community</span>
              <h2 className="font-black text-white text-3xl sm:text-4xl md:text-5xl mb-5 leading-tight" style={{ fontFamily: "Syne, sans-serif" }}>
                Hundreds of Store<br />
                Owners Trust{" "}
                <span className="text-amber-400">SariSari IMS.</span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-[400px]">
                Join a growing community of Filipino negosyantes who've gone digital and never looked back.
              </p>
              <Link href="/register"
                className="inline-flex items-center gap-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-8 py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-amber-500/20 text-[0.9rem]">
                <Store size={16} />
                Join Them — Free
                <ArrowRight size={15} />
              </Link>
            </FadeUp>
            <FadeUp delay={0.15}>
              <LiveUserCount />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══ REVIEWS ══ */}
      <section className="py-28 bg-[#F4F6FA] overflow-hidden">
        <div className="max-w-[1100px] mx-auto px-6 mb-14">
          <FadeUp className="text-center">
            <span className="inline-block bg-white text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full border border-blue-100 mb-5">Testimonials</span>
            <h2 className="font-black text-slate-900 text-3xl sm:text-4xl md:text-5xl mb-4">
              Sabi ng mga{" "}
              <span className="text-blue-600">Negosyante</span> 💬
            </h2>
            <p className="text-slate-500 text-base max-w-[400px] mx-auto">Real feedback from real Filipino store owners across the Philippines.</p>
          </FadeUp>
        </div>

        <div className="overflow-hidden"
          style={{ maskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)" }}>
          <div className="flex gap-4 ticker-anim" style={{ width: "max-content" }}>
            {ALL_REVIEWS.map((r, i) => (
              <div key={i} className="w-[300px] flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, si) => <Star key={si} size={12} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed italic mb-5">"{r.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[0.88rem] text-slate-800">{r.name}</div>
                    <div className="text-[0.65rem] text-slate-400">{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <FadeUp delay={0.2} className="flex justify-center mt-14 px-6">
          <button className="flex items-center gap-2.5 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-3.5 rounded-full font-bold transition-all duration-300 shadow-lg">
            <MessageCircle size={16} />
            Share Your Story
          </button>
        </FadeUp>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp>
            <div className="relative rounded-3xl bg-gradient-to-br from-[#050E1F] via-[#0c1a3a] to-[#091428] overflow-hidden p-10 sm:p-16">
              {/* Background details */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
              <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-blue-600/12 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-400/8 rounded-full blur-[80px]" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-7">
                    <Image src="/images/logo.png" alt="Logo" width={44} height={44} className="rounded-xl" />
                    <div>
                      <div className="text-white font-black text-base leading-none" style={{ fontFamily: "Syne, sans-serif" }}>SariSari IMS</div>
                      <div className="text-blue-400 text-xs mt-0.5">Free to get started</div>
                    </div>
                  </div>
                  <h2 className="font-black text-white text-3xl sm:text-4xl lg:text-[2.6rem] leading-tight mb-5" style={{ fontFamily: "Syne, sans-serif" }}>
                    Ready to Grow<br />
                    <span className="text-amber-400">Your Tindahan?</span>
                  </h2>
                  <p className="text-white/50 text-base leading-relaxed mb-8 max-w-[380px]">
                    Join thousands of Filipino store owners who've already taken their negosyo digital. No fees, no contracts — just results.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/register"
                      className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm rounded-xl px-7 py-4 transition-all duration-200 shadow-xl shadow-amber-500/20">
                      <Download size={15} /> Create Free Account
                    </Link>
                    <Link href="/dashboard"
                      className="inline-flex items-center justify-center gap-2 bg-white/6 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-semibold text-sm rounded-xl px-7 py-4 transition-all duration-200">
                      <BarChart3 size={15} /> View Dashboard
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: <CheckCircle size={14} />, label: "Free Forever Plan", value: "Core inventory + sales features, no expiry" },
                    { icon: <Clock size={14} />, label: "5-Minute Setup", value: "Start tracking your store in minutes" },
                    { icon: <Shield size={14} />, label: "Secure Cloud Data", value: "Encrypted and always accessible" },
                    { icon: <Globe size={14} />, label: "All Devices", value: "Phone, tablet, or desktop — your choice" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3 bg-white/4 border border-white/6 rounded-2xl p-4">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-300 flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-blue-300 text-[0.6rem] font-bold uppercase tracking-widest mb-0.5">{item.label}</div>
                        <div className="text-white/70 text-[0.82rem] font-medium leading-snug">{item.value}</div>
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