"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, ArrowRight, Layers, BookOpen, Mail,
  Search, LogIn, UserPlus, ChevronDown, Zap, BarChart3,
  Package, ShoppingCart, Users, Shield, History,
  LayoutDashboard, CreditCard,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

// ── SEARCH INDEX ──────────────────────────────────────────────────────────────
const SEARCH_INDEX = [
  // Pages
  { label: "Dashboard", href: "/dashboard", icon: <BarChart3 size={14} />, category: "Pages" },
  { label: "Features", href: "/pages/features", icon: <Layers size={14} />, category: "Pages" },
  { label: "Documentation", href: "/pages/docs", icon: <BookOpen size={14} />, category: "Pages" },
  { label: "Contact Us", href: "/pages/contact", icon: <Mail size={14} />, category: "Pages" },
  // Account
  { label: "Login", href: "/auth/login", icon: <LogIn size={14} />, category: "Account" },
  { label: "Register", href: "/auth/register", icon: <UserPlus size={14} />, category: "Account" },
  // Dashboard module
  { label: "Overview Dashboard", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={14} />, category: "Dashboard" },
  { label: "Live Revenue Snapshot", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={14} />, category: "Dashboard" },
  { label: "Daily Transaction Count", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={14} />, category: "Dashboard" },
  { label: "Total Product Count", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={14} />, category: "Dashboard" },
  { label: "Low Stock Alerts & Notifications", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={14} />, category: "Dashboard" },
  { label: "Top-Selling Products", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={14} />, category: "Dashboard" },
  { label: "Real-Time Store Monitor", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={14} />, category: "Dashboard" },
  // Analytics module
  { label: "Analytics & Reports", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  { label: "Revenue Over Time Charts", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  { label: "Profit Margin Analysis", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  { label: "Best-Selling Products Ranking", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  { label: "Category Performance Breakdown", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  { label: "Export Reports to PDF", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  { label: "Export Reports to Excel XLSX", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  { label: "Date Range Filtering", href: "/pages/features?tab=analytics", icon: <BarChart3 size={14} />, category: "Analytics" },
  // Inventory module
  { label: "Smart Inventory Management", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  { label: "Product Categories Almusal Meryenda", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  { label: "Market Price vs Selling Price", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  { label: "Product Image Uploads", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  { label: "Real-Time Stock Levels", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  { label: "Full-Text Product Search FTS", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  { label: "Export Inventory to PDF", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  { label: "Export Inventory to Excel", href: "/pages/features?tab=inventory", icon: <Package size={14} />, category: "Inventory" },
  // POS module
  { label: "Point of Sale POS", href: "/pages/features?tab=pos", icon: <ShoppingCart size={14} />, category: "Point of Sale" },
  { label: "Fast Product Search at Counter", href: "/pages/features?tab=pos", icon: <ShoppingCart size={14} />, category: "Point of Sale" },
  { label: "Automatic Change Computation", href: "/pages/features?tab=pos", icon: <ShoppingCart size={14} />, category: "Point of Sale" },
  { label: "Auto Stock Deduction After Sale", href: "/pages/features?tab=pos", icon: <ShoppingCart size={14} />, category: "Point of Sale" },
  { label: "Out of Stock Prevention", href: "/pages/features?tab=pos", icon: <ShoppingCart size={14} />, category: "Point of Sale" },
  { label: "Transaction Receipts", href: "/pages/features?tab=pos", icon: <ShoppingCart size={14} />, category: "Point of Sale" },
  { label: "Sales History and Audit Module", href: "/pages/features?tab=pos", icon: <History size={14} />, category: "Point of Sale" },
  // Staff module
  { label: "Staff Management", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Add Edit Delete Staff CRUD", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Staff Time In Time Out Attendance", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Attendance History Log", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Role-Based Access Control RBAC", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Cashier POS-Only Access", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Owner Full Administrative Access", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Staff PIN Code Management", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  { label: "Permission Matrix", href: "/pages/features?tab=staff", icon: <Users size={14} />, category: "Staff & Access" },
  // Auth & Security
  { label: "2FA Two-Factor Authentication", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "MFA Multi-Factor Authentication Owner", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Password Change Email Alerts", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Forgot Password Reset Flow", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Email Verification on Register", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Session Idle Timeout Auto Logout", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Row Level Security RLS Database", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Hashed Staff Email and PIN", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Re-Authentication Dashboard Access", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  { label: "Privilege Escalation Prevention", href: "/pages/features?tab=auth", icon: <Shield size={14} />, category: "Auth & Security" },
  // Docs
  { label: "Getting Started Guide", href: "/pages/docs", icon: <BookOpen size={14} />, category: "Docs" },
  { label: "How to Add a Product", href: "/pages/docs", icon: <Package size={14} />, category: "Docs" },
  { label: "How to Process a Sale", href: "/pages/docs", icon: <ShoppingCart size={14} />, category: "Docs" },
  { label: "How to Manage Staff Accounts", href: "/pages/docs", icon: <Users size={14} />, category: "Docs" },
  { label: "How to Export Reports", href: "/pages/docs", icon: <BookOpen size={14} />, category: "Docs" },
  { label: "How to Set Up 2FA MFA", href: "/pages/docs", icon: <Shield size={14} />, category: "Docs" },
  { label: "How to Track Utang Debt", href: "/pages/docs", icon: <CreditCard size={14} />, category: "Docs" },
];

const NAV_LINKS = [
  {
    name: "Features", href: "/pages/features", icon: <Layers size={14} />, desc: "All platform modules",
    mega: [
      { label: "Dashboard", href: "/pages/features?tab=dashboard", icon: <LayoutDashboard size={13} />, sub: "Real-time store overview" },
      { label: "Smart Inventory", href: "/pages/features?tab=inventory", icon: <Package size={13} />, sub: "Track every product live" },
      { label: "Point of Sale", href: "/pages/features?tab=pos", icon: <ShoppingCart size={13} />, sub: "Process sales in seconds" },
      { label: "Analytics", href: "/pages/features?tab=analytics", icon: <BarChart3 size={13} />, sub: "Revenue & profit insights" },
      { label: "Staff & Access", href: "/pages/features?tab=staff", icon: <Users size={13} />, sub: "CRUD, roles & attendance" },
      { label: "Auth & Security", href: "/pages/features?tab=auth", icon: <Shield size={13} />, sub: "2FA, MFA & reset flow" },
    ],
  },
  { name: "Docs", href: "/pages/docs", icon: <BookOpen size={14} />, desc: "Guides & references" },
  { name: "Contact", href: "/pages/contact", icon: <Mail size={14} />, desc: "Get in touch" },
];

// ── SEARCH MODAL ──────────────────────────────────────────────────────────────
function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = query.trim().length > 0
    ? SEARCH_INDEX.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10)
    : SEARCH_INDEX.filter(i => i.category === "Pages").slice(0, 6);

  const grouped = results.reduce<Record<string, typeof SEARCH_INDEX>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // KEY FIX: use router.push (Next.js router) so searchParams updates on same page
  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: -20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[580px] bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-slate-200">
        {/* Input row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={17} className="text-slate-400 flex-shrink-0" />
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search features, modules, settings…"
            className="flex-1 text-[0.92rem] text-slate-800 placeholder:text-slate-400 outline-none bg-transparent" />
          <kbd className="bg-slate-100 text-slate-500 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-slate-200">ESC</kbd>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors ml-1">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[430px] overflow-y-auto py-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-5 pt-3 pb-1">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">{category}</span>
              </div>
              {items.map((item) => (
                <button key={item.label} onClick={() => handleSelect(item.href)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-blue-50 transition-colors text-left group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-[0.88rem] font-medium text-slate-700 group-hover:text-blue-700 transition-colors flex-1 text-left">{item.label}</span>
                  <ArrowRight size={13} className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          ))}
          {results.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Search size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-[0.88rem] font-medium">No results for "{query}"</p>
              <p className="text-slate-300 text-xs mt-1">Try "inventory", "staff", "POS", or "2FA"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] text-slate-400">Press</span>
            <kbd className="bg-white text-slate-500 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-slate-200">ESC</kbd>
            <span className="text-[0.65rem] text-slate-400">to close</span>
          </div>
          <span className="text-[0.65rem] text-slate-400">{results.length} result{results.length !== 1 ? "s" : ""}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── HAMBURGER ICON ────────────────────────────────────────────────────────────
function HamburgerIcon({ isOpen, dark }: { isOpen: boolean; dark: boolean }) {
  const color = isOpen ? "#fff" : dark ? "#475569" : "rgba(255,255,255,0.75)";
  return (
    <div style={{ position: "relative", width: 18, height: 18 }}>
      <motion.span initial={false}
        animate={isOpen ? { rotate: 45, y: 0, opacity: 1 } : { rotate: 0, y: -5, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: "block", position: "absolute", left: 0, top: "50%", width: 18, height: 2, background: color, borderRadius: 2, transformOrigin: "center center", translateY: "-50%" }} />
      <motion.span initial={false}
        animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        style={{ display: "block", position: "absolute", left: 0, top: "50%", width: 14, height: 2, background: color, borderRadius: 2, transformOrigin: "center center", translateY: "-50%" }} />
      <motion.span initial={false}
        animate={isOpen ? { rotate: -45, y: 0, opacity: 1 } : { rotate: 0, y: 5, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: "block", position: "absolute", left: 0, top: "50%", width: 18, height: 2, background: color, borderRadius: 2, transformOrigin: "center center", translateY: "-50%" }} />
    </div>
  );
}

// ── NAVBAR ────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (isOpen || searchOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, searchOpen]);

  useEffect(() => { setIsOpen(false); setMegaOpen(null); }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isHomepage = pathname === "/";
  const isDark = !scrolled && isHomepage;

  // KEY FIX: mega menu items use router.push so the ?tab= param is picked up
  // by useSearchParams() in the features page without a hard reload
  const handleMegaNav = (href: string) => {
    setMegaOpen(null);
    router.push(href);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[2000] transition-all duration-300 ${scrolled ? "py-2 px-4" : "py-3 px-4"}`}>
        <div className={`max-w-[1200px] mx-auto flex items-center justify-between gap-3 rounded-2xl transition-all duration-300 ${scrolled
            ? "bg-white/98 shadow-[0_8px_40px_rgba(15,23,42,0.12)] border border-slate-200/80 py-2 px-5"
            : isHomepage
              ? "bg-white/8 shadow-[0_2px_20px_rgba(0,0,0,0.15)] border border-white/10 py-2.5 px-5"
              : "bg-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.07)] border border-slate-100 py-2.5 px-5"
          }`} style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>

          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group no-underline">
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image src="/images/logo.png" alt="SariSari IMS" fill
                className="object-contain rounded-xl group-hover:scale-105 transition-transform duration-300" sizes="36px" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className={`font-black text-[1.05rem] tracking-tight whitespace-nowrap transition-colors duration-300 ${scrolled || !isHomepage ? "text-slate-900" : "text-white"}`}
                style={{ fontFamily: "Syne, sans-serif" }}>
                SariSari<span className="text-blue-500">.</span>IMS
              </span>
              <span className={`text-[0.5rem] font-bold uppercase tracking-[0.18em] -mt-0.5 transition-colors duration-300 ${scrolled || !isHomepage ? "text-slate-400" : "text-white/40"}`}>
                Inventory Management
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center flex-1 justify-center gap-1">
            {NAV_LINKS.map((link) => (
              <div key={link.name} className="relative"
                onMouseEnter={() => link.mega ? setMegaOpen(link.name) : setMegaOpen(null)}
                onMouseLeave={() => setMegaOpen(null)}>
                <Link href={link.href}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-[0.86rem] font-semibold rounded-xl transition-all duration-200 no-underline whitespace-nowrap group ${isActive(link.href)
                      ? isDark ? "text-white bg-white/10" : "text-blue-600 bg-blue-50"
                      : isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                    }`}>
                  <span className={`transition-colors ${isActive(link.href)
                    ? isDark ? "text-white/70" : "text-blue-500"
                    : isDark ? "text-white/40 group-hover:text-white/70" : "text-slate-400 group-hover:text-blue-500"}`}>
                    {link.icon}
                  </span>
                  {link.name}
                  {link.mega && (
                    <ChevronDown size={12} className={`opacity-50 transition-transform duration-200 ${megaOpen === link.name ? "rotate-180" : ""}`} />
                  )}
                  {isActive(link.href) && (
                    <motion.span layoutId="nav-active-dot"
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                  )}
                </Link>

                <AnimatePresence>
                  {link.mega && megaOpen === link.name && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }} transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[380px]">
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/80 p-3 overflow-hidden">
                        <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 px-3 pt-1 pb-2">Quick Access</div>
                        {link.mega.map((item) => (
                          <button key={item.label}
                            onClick={() => handleMegaNav(item.href)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group/item text-left">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover/item:bg-blue-100 flex items-center justify-center text-slate-500 group-hover/item:text-blue-600 transition-colors flex-shrink-0">
                              {item.icon}
                            </div>
                            <div>
                              <div className="text-[0.84rem] font-semibold text-slate-800 group-hover/item:text-blue-700 transition-colors">{item.label}</div>
                              <div className="text-[0.7rem] text-slate-400">{item.sub}</div>
                            </div>
                            <ArrowRight size={12} className="ml-auto text-slate-300 group-hover/item:text-blue-400 transition-colors flex-shrink-0" />
                          </button>
                        ))}
                        <div className="mt-2 pt-2 border-t border-slate-100 px-3 pb-1">
                          <Link href="/pages/features" className="text-[0.75rem] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors no-underline">
                            View all features <ArrowRight size={11} />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(true)}
              className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl text-[0.8rem] font-medium transition-all duration-200 border ${isDark
                  ? "bg-white/8 hover:bg-white/14 border-white/10 text-white/50 hover:text-white/80"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"
                }`}>
              <Search size={14} />
              <span className="hidden xl:block">Search</span>
              <kbd className={`hidden xl:inline-flex items-center text-[0.58rem] font-bold px-1.5 py-0.5 rounded border ml-1 ${isDark ? "bg-white/5 border-white/10 text-white/30" : "bg-white border-slate-200 text-slate-400"}`}>⌘K</kbd>
            </button>

            <Link href="/auth/login"
              className={`hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-[0.84rem] font-semibold rounded-xl transition-all duration-200 no-underline ${isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                }`}>
              <LogIn size={14} />Login
            </Link>

            <Link href="/auth/register"
              className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[0.84rem] px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 no-underline">
              <UserPlus size={14} />Get Started
            </Link>

            <button onClick={() => setSearchOpen(true)}
              className={`md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isDark ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"}`}>
              <Search size={15} />
            </button>

            <button onClick={toggle} aria-label={isOpen ? "Close menu" : "Open menu"}
              className={`lg:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${isOpen ? "bg-blue-600" : isDark ? "bg-white/10" : "bg-slate-100"}`}>
              <HamburgerIcon isOpen={isOpen} dark={!isDark} />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} onClick={close}
              className="fixed inset-0 z-[1998] bg-black/40 backdrop-blur-sm lg:hidden" />

            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ duration: 0.32, ease: [0.77, 0, 0.175, 1] }}
              className="fixed top-0 right-0 bottom-0 z-[1999] w-full max-w-[300px] bg-white flex flex-col lg:hidden shadow-2xl">

              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8">
                    <Image src="/images/logo.png" alt="Logo" fill className="object-contain rounded-lg" sizes="32px" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-[0.95rem] leading-none" style={{ fontFamily: "Syne, sans-serif" }}>
                      SariSari<span className="text-blue-500">.</span>IMS
                    </div>
                    <div className="text-[0.5rem] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Inventory Management</div>
                  </div>
                </div>
                <motion.button onClick={close} whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors">
                  <motion.div initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
                    <X size={15} className="text-slate-500" />
                  </motion.div>
                </motion.button>
              </div>

              <ul className="list-none flex-1 px-4 pt-3 m-0 overflow-y-auto space-y-1">
                {NAV_LINKS.map((link, idx) => (
                  <motion.li key={link.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 + 0.1 }}>
                    <Link href={link.href} onClick={close}
                      className={`flex items-center justify-between py-3 px-3 rounded-xl no-underline transition-all group ${isActive(link.href) ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isActive(link.href) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"}`}>
                          {link.icon}
                        </div>
                        <div>
                          <div className="font-bold text-[0.9rem] leading-none">{link.name}</div>
                          <div className="text-[0.65rem] text-slate-400 mt-0.5 font-medium">{link.desc}</div>
                        </div>
                      </div>
                      <ArrowRight size={14} className={`transition-colors flex-shrink-0 ${isActive(link.href) ? "text-blue-500" : "text-slate-300 group-hover:text-blue-400"}`} />
                    </Link>
                  </motion.li>
                ))}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                  className="pt-3 border-t border-slate-100 mt-3">
                  <Link href="/auth/login" onClick={close}
                    className="flex items-center gap-3 py-3 px-3 rounded-xl no-underline text-slate-700 hover:bg-slate-50 transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
                      <LogIn size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-[0.9rem] leading-none">Login</div>
                      <div className="text-[0.65rem] text-slate-400 mt-0.5">Access your dashboard</div>
                    </div>
                  </Link>
                </motion.div>
              </ul>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="p-4 pb-8 space-y-2.5 border-t border-slate-100">
                <Link href="/auth/register" onClick={close}
                  className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[0.9rem] shadow-lg shadow-blue-500/20 transition-colors no-underline">
                  <UserPlus size={15} /> Create Free Account
                </Link>
                <button onClick={() => { close(); setSearchOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-[0.85rem] transition-colors">
                  <Search size={14} /> Search the Site
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}