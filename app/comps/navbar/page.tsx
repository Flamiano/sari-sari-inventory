"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    X, ArrowRight, Layers, BookOpen, Mail, Store,
    Search, LogIn, UserPlus, ChevronDown, Zap, BarChart3,
    Package, ShoppingCart, Users, Shield, Globe, History
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

// ── Searchable pages index ──
const SEARCH_INDEX = [
    { label: "Dashboard", href: "/dashboard", icon: <BarChart3 size={14} />, category: "Pages" },
    { label: "Features", href: "/pages/features", icon: <Layers size={14} />, category: "Pages" },
    { label: "Documentation", href: "/pages/docs", icon: <BookOpen size={14} />, category: "Pages" },
    { label: "Contact Us", href: "/pages/contact", icon: <Mail size={14} />, category: "Pages" },
    { label: "Login", href: "/auth/login", icon: <LogIn size={14} />, category: "Account" },
    { label: "Register", href: "/auth/register", icon: <UserPlus size={14} />, category: "Account" },
    { label: "Smart Inventory", href: "/pages/features", icon: <Package size={14} />, category: "Features" },
    { label: "Point of Sale (POS)", href: "/pages/features", icon: <ShoppingCart size={14} />, category: "Features" },
    { label: "Supplier Management", href: "/pages/features", icon: <Users size={14} />, category: "Features" },
    { label: "Analytics & Reports", href: "/pages/features", icon: <BarChart3 size={14} />, category: "Features" },
    { label: "Sales History", href: "/pages/features", icon: <History size={14} />, category: "Features" },
    { label: "Stock Alerts", href: "/pages/features", icon: <Zap size={14} />, category: "Features" },
    { label: "Role-Based Access", href: "/pages/features", icon: <Shield size={14} />, category: "Features" },
    { label: "Cloud Sync", href: "/pages/features", icon: <Globe size={14} />, category: "Features" },
    { label: "Getting Started Guide", href: "/pages/docs", icon: <BookOpen size={14} />, category: "Docs" },
    { label: "How to add a product", href: "/pages/docs", icon: <Package size={14} />, category: "Docs" },
    { label: "How to process a sale", href: "/pages/docs", icon: <ShoppingCart size={14} />, category: "Docs" },
];

const NAV_LINKS = [
    {
        name: "Features",
        href: "/pages/features",
        icon: <Layers size={14} />,
        desc: "All platform modules",
        mega: [
            { label: "Smart Inventory", href: "/pages/features", icon: <Package size={13} />, sub: "Track every product live" },
            { label: "Point of Sale", href: "/pages/features", icon: <ShoppingCart size={13} />, sub: "Process sales in seconds" },
            { label: "Analytics", href: "/pages/features", icon: <BarChart3 size={13} />, sub: "Revenue & profit insights" },
            { label: "Supplier Hub", href: "/pages/features", icon: <Users size={13} />, sub: "Manage your vendors" },
        ],
    },
    {
        name: "Docs",
        href: "/pages/docs",
        icon: <BookOpen size={14} />,
        desc: "Guides & references",
    },
    {
        name: "Contact",
        href: "/pages/contact",
        icon: <Mail size={14} />,
        desc: "Get in touch",
    },
];

// ── Search Modal ──
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
        ).slice(0, 8)
        : SEARCH_INDEX.filter(i => i.category === "Pages").slice(0, 6);

    const grouped = results.reduce<Record<string, typeof SEARCH_INDEX>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    const handleSelect = (href: string) => {
        router.push(href);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-start justify-center pt-[10vh] px-4"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-slate-200"
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                    <Search size={17} className="text-slate-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pages, features, docs..."
                        className="flex-1 text-[0.92rem] text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                    />
                    <div className="flex items-center gap-1">
                        <kbd className="bg-slate-100 text-slate-500 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-slate-200">ESC</kbd>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors ml-1">
                        <X size={14} className="text-slate-500" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto py-2">
                    {Object.entries(grouped).map(([category, items]) => (
                        <div key={category}>
                            <div className="px-5 pt-3 pb-1">
                                <span className="text-[0.62rem] font-black uppercase tracking-widest text-slate-400">{category}</span>
                            </div>
                            {items.map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => handleSelect(item.href)}
                                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-blue-50 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors flex-shrink-0">
                                        {item.icon}
                                    </div>
                                    <span className="text-[0.88rem] font-medium text-slate-700 group-hover:text-blue-700 transition-colors">{item.label}</span>
                                    <ArrowRight size={13} className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    ))}
                    {results.length === 0 && (
                        <div className="px-5 py-10 text-center">
                            <Search size={28} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 text-[0.88rem]">No results for "{query}"</p>
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                    <span className="text-[0.68rem] text-slate-400">Press</span>
                    <kbd className="bg-white text-slate-500 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-slate-200">↑</kbd>
                    <kbd className="bg-white text-slate-500 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-slate-200">↓</kbd>
                    <span className="text-[0.68rem] text-slate-400">to navigate,</span>
                    <kbd className="bg-white text-slate-500 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-slate-200">Enter</kbd>
                    <span className="text-[0.68rem] text-slate-400">to select</span>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ══════════════════════════════
// MAIN NAVBAR
// ══════════════════════════════
export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [megaOpen, setMegaOpen] = useState<string | null>(null);
    const pathname = usePathname();

    // Scroll detection
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Lock body when drawer open
    useEffect(() => {
        document.body.style.overflow = (isOpen || searchOpen) ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen, searchOpen]);

    // Close on route change
    useEffect(() => { setIsOpen(false); setMegaOpen(null); }, [pathname]);

    // Cmd/Ctrl+K to open search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const toggle = useCallback(() => setIsOpen(prev => !prev), []);
    const close = useCallback(() => setIsOpen(false), []);
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    // Detect if hero is dark (only on homepage)
    const isHomepage = pathname === "/";

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-[2000] transition-all duration-300 ${scrolled ? "py-2 px-4" : "py-3 px-4"}`}>
                <div
                    className={`max-w-[1200px] mx-auto flex items-center justify-between gap-3 rounded-2xl transition-all duration-300 ${scrolled
                            ? "bg-white/98 shadow-[0_8px_40px_rgba(15,23,42,0.12)] border border-slate-200/80 py-2 px-5"
                            : isHomepage
                                ? "bg-white/8 shadow-[0_2px_20px_rgba(0,0,0,0.15)] border border-white/10 py-2.5 px-5"
                                : "bg-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.07)] border border-slate-100 py-2.5 px-5"
                        }`}
                    style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
                >

                    {/* ── Brand ── */}
                    <Link href="/" className="flex items-center gap-3 flex-shrink-0 group no-underline">
                        <div className="relative w-9 h-9 flex-shrink-0">
                            <Image
                                src="/images/logo.png"
                                alt="SariSari IMS"
                                fill
                                className="object-contain rounded-xl group-hover:scale-105 transition-transform duration-300"
                                sizes="36px"
                            />
                        </div>
                        <div className="hidden sm:flex flex-col leading-none">
                            <span
                                className={`font-black text-[1.05rem] tracking-tight whitespace-nowrap transition-colors duration-300 ${scrolled || !isHomepage ? "text-slate-900" : "text-white"
                                    }`}
                                style={{ fontFamily: "Syne, sans-serif" }}
                            >
                                SariSari<span className="text-blue-500">.</span>IMS
                            </span>
                            <span className={`text-[0.5rem] font-bold uppercase tracking-[0.18em] -mt-0.5 transition-colors duration-300 ${scrolled || !isHomepage ? "text-slate-400" : "text-white/40"
                                }`}>
                                Inventory Management
                            </span>
                        </div>
                    </Link>

                    {/* ── Desktop Nav Links ── */}
                    <div className="hidden lg:flex items-center flex-1 justify-center gap-1">
                        {NAV_LINKS.map((link) => (
                            <div key={link.name} className="relative"
                                onMouseEnter={() => link.mega ? setMegaOpen(link.name) : setMegaOpen(null)}
                                onMouseLeave={() => setMegaOpen(null)}>
                                <Link
                                    href={link.href}
                                    className={`relative flex items-center gap-1.5 px-4 py-2 text-[0.86rem] font-semibold rounded-xl transition-all duration-200 no-underline whitespace-nowrap group ${isActive(link.href)
                                            ? scrolled || !isHomepage
                                                ? "text-blue-600 bg-blue-50"
                                                : "text-white bg-white/10"
                                            : scrolled || !isHomepage
                                                ? "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                                                : "text-white/70 hover:text-white hover:bg-white/10"
                                        }`}
                                >
                                    <span className={`transition-colors ${isActive(link.href)
                                            ? "text-blue-500"
                                            : scrolled || !isHomepage ? "text-slate-400 group-hover:text-blue-500" : "text-white/40 group-hover:text-white/70"
                                        }`}>
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

                                {/* Mega dropdown for Features */}
                                <AnimatePresence>
                                    {link.mega && megaOpen === link.name && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[340px]"
                                        >
                                            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/80 p-3 overflow-hidden">
                                                <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 px-3 pt-1 pb-2">Quick Access</div>
                                                {link.mega.map((item) => (
                                                    <Link key={item.label} href={item.href}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group/item no-underline">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover/item:bg-blue-100 flex items-center justify-center text-slate-500 group-hover/item:text-blue-600 transition-colors flex-shrink-0">
                                                            {item.icon}
                                                        </div>
                                                        <div>
                                                            <div className="text-[0.84rem] font-semibold text-slate-800 group-hover/item:text-blue-700 transition-colors">{item.label}</div>
                                                            <div className="text-[0.7rem] text-slate-400">{item.sub}</div>
                                                        </div>
                                                        <ArrowRight size={12} className="ml-auto text-slate-300 group-hover/item:text-blue-400 transition-colors flex-shrink-0" />
                                                    </Link>
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

                    {/* ── Desktop Right Actions ── */}
                    <div className="flex items-center gap-2">
                        {/* Search button */}
                        <button
                            onClick={() => setSearchOpen(true)}
                            className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl text-[0.8rem] font-medium transition-all duration-200 border ${scrolled || !isHomepage
                                    ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"
                                    : "bg-white/8 hover:bg-white/14 border-white/10 text-white/50 hover:text-white/80"
                                }`}
                        >
                            <Search size={14} />
                            <span className="hidden xl:block">Search</span>
                            <kbd className={`hidden xl:inline-flex items-center text-[0.58rem] font-bold px-1.5 py-0.5 rounded border ml-1 ${scrolled || !isHomepage ? "bg-white border-slate-200 text-slate-400" : "bg-white/5 border-white/10 text-white/30"
                                }`}>⌘K</kbd>
                        </button>

                        {/* Login */}
                        <Link href="/auth/login"
                            className={`hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-[0.84rem] font-semibold rounded-xl transition-all duration-200 no-underline ${scrolled || !isHomepage
                                    ? "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                                    : "text-white/70 hover:text-white hover:bg-white/10"
                                }`}>
                            <LogIn size={14} />
                            Login
                        </Link>

                        {/* CTA */}
                        <Link href="/auth/register"
                            className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[0.84rem] px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 no-underline">
                            <UserPlus size={14} />
                            Get Started
                        </Link>

                        {/* Mobile: search icon */}
                        <button onClick={() => setSearchOpen(true)}
                            className={`md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all ${scrolled || !isHomepage ? "bg-slate-100 text-slate-500" : "bg-white/10 text-white/60"
                                }`}>
                            <Search size={15} />
                        </button>

                        {/* Hamburger */}
                        <button onClick={toggle} aria-label="Toggle menu"
                            className={`lg:hidden flex flex-col items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 gap-[5px] ${isOpen ? "bg-blue-600" : scrolled || !isHomepage ? "bg-slate-100" : "bg-white/10"
                                }`}>
                            <span className="block w-[15px] h-[1.5px] transition-all duration-300 origin-center"
                                style={{ background: isOpen ? "#fff" : scrolled || !isHomepage ? "#475569" : "rgba(255,255,255,0.7)", transform: isOpen ? "translateY(3.5px) rotate(45deg)" : "none" }} />
                            <span className="block w-[15px] h-[1.5px] transition-all duration-300"
                                style={{ background: isOpen ? "#fff" : scrolled || !isHomepage ? "#475569" : "rgba(255,255,255,0.7)", opacity: isOpen ? 0 : 1 }} />
                            <span className="block w-[15px] h-[1.5px] transition-all duration-300 origin-center"
                                style={{ background: isOpen ? "#fff" : scrolled || !isHomepage ? "#475569" : "rgba(255,255,255,0.7)", transform: isOpen ? "translateY(-3.5px) rotate(-45deg)" : "none" }} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Search Modal ── */}
            <AnimatePresence>
                {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
            </AnimatePresence>

            {/* ── Mobile Drawer ── */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={close}
                            className="fixed inset-0 z-[1998] bg-black/30 backdrop-blur-sm lg:hidden" />

                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ duration: 0.3, ease: [0.77, 0, 0.175, 1] }}
                            className="fixed top-0 right-0 bottom-0 z-[1999] w-full max-w-[310px] bg-white flex flex-col lg:hidden shadow-2xl"
                        >
                            {/* Drawer header */}
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
                                <button onClick={close} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                                    <X size={15} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Nav links */}
                            <ul className="list-none flex-1 px-4 pt-3 m-0 overflow-y-auto space-y-1">
                                {NAV_LINKS.map((link) => (
                                    <li key={link.name}>
                                        <Link href={link.href} onClick={close}
                                            className={`flex items-center justify-between py-3 px-3 rounded-xl no-underline transition-all group ${isActive(link.href) ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                                }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isActive(link.href) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                                                    }`}>
                                                    {link.icon}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[0.9rem] leading-none">{link.name}</div>
                                                    <div className="text-[0.65rem] text-slate-400 mt-0.5 font-medium">{link.desc}</div>
                                                </div>
                                            </div>
                                            <ArrowRight size={14} className={`transition-colors flex-shrink-0 ${isActive(link.href) ? "text-blue-500" : "text-slate-300 group-hover:text-blue-400"
                                                }`} />
                                        </Link>
                                    </li>
                                ))}

                                <div className="pt-3 border-t border-slate-100 mt-3 space-y-1">
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
                                </div>
                            </ul>

                            {/* Bottom CTA */}
                            <div className="p-4 pb-8 space-y-2.5 border-t border-slate-100">
                                <Link href="/auth/register" onClick={close}
                                    className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[0.9rem] shadow-lg shadow-blue-500/20 transition-colors no-underline">
                                    <UserPlus size={15} /> Create Free Account
                                </Link>
                                <button onClick={() => { close(); setSearchOpen(true); }}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-[0.85rem] transition-colors">
                                    <Search size={14} /> Search the Site
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}