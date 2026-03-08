"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Mail, MapPin, Phone, Clock, MessageCircle, Send,
    CheckCircle2, ArrowRight, Zap, Book, HelpCircle
} from "lucide-react";
import Footer from "@/app/comps/footer/page";
import Navbar from "@/app/comps/navbar/page";

const CONTACT_METHODS = [
    {
        icon: <Mail size={20} />,
        title: "Email Support",
        value: "support@marilynsstore.ph",
        sub: "We reply within 24 hours",
        gradient: "from-blue-500 to-indigo-600",
        bg: "bg-blue-50",
        color: "text-blue-600",
    },
    {
        icon: <MessageCircle size={20} />,
        title: "Messenger",
        value: "m.me/MarilynsSariSari",
        sub: "Fastest response channel",
        gradient: "from-sky-400 to-blue-500",
        bg: "bg-sky-50",
        color: "text-sky-600",
    },
    {
        icon: <Phone size={20} />,
        title: "Phone / SMS",
        value: "+63 912 345 6789",
        sub: "Available during store hours",
        gradient: "from-emerald-500 to-teal-600",
        bg: "bg-emerald-50",
        color: "text-emerald-600",
    },
    {
        icon: <MapPin size={20} />,
        title: "Visit the Store",
        value: "807 Riverside St., Brgy. Commonwealth, Q.C.",
        sub: "Talk to Ate Marilyn in person",
        gradient: "from-amber-400 to-orange-500",
        bg: "bg-amber-50",
        color: "text-amber-600",
    },
];

type FormState = "idle" | "loading" | "success" | "error";

export default function ContactPage() {
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [status, setStatus] = useState<FormState>("idle");

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e: React.MouseEvent) {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) return;
        setStatus("loading");
        // Simulate send (replace with actual email/API logic)
        await new Promise(r => setTimeout(r, 1500));
        setStatus("success");
    }

    return (
        <div className="min-h-screen bg-slate-50 font-syne">
            <Navbar />
            {/* Hero */}
            <div className="bg-[#0c1322] relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-48 pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)" }} />
                <div className="max-w-[1100px] mx-auto px-6 py-16 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
                            <Mail size={12} className="text-blue-400" />
                            <span className="text-blue-400 text-[0.68rem] font-bold uppercase tracking-[0.18em]">Contact & Support</span>
                        </div>
                        <h1 className="text-white font-black text-3xl md:text-5xl leading-tight mb-4">
                            Get in touch with <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Ate Marilyn's Team</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-[520px] leading-relaxed">
                            Whether you have a question about the platform, need store support, or just want to say hi — we're here.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-[1100px] mx-auto px-6 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

                    {/* LEFT: Contact Methods */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="font-black text-slate-900 text-xl mb-6">Reach us through</h2>
                        {CONTACT_METHODS.map((m, i) => (
                            <motion.div
                                key={m.title}
                                initial={{ opacity: 0, x: -16 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                whileHover={{ x: 4 }}
                                className="group flex items-start gap-4 bg-white border border-slate-200 hover:border-blue-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center text-white flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                    {m.icon}
                                </div>
                                <div>
                                    <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-0.5">{m.title}</p>
                                    <p className="font-bold text-slate-800 text-[0.88rem] leading-snug">{m.value}</p>
                                    <p className="text-slate-400 text-[0.75rem] mt-0.5">{m.sub}</p>
                                </div>
                            </motion.div>
                        ))}

                        {/* Store hours */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600"><Clock size={16} /></div>
                                <h3 className="font-bold text-slate-800 text-[0.9rem]">Store Hours</h3>
                            </div>
                            <ul className="space-y-2 text-[0.83rem]">
                                <li className="flex justify-between"><span className="text-slate-500">Mon – Fri</span><span className="font-medium text-slate-800">6:00 AM – 9:00 PM</span></li>
                                <li className="flex justify-between"><span className="text-slate-500">Sat – Sun</span><span className="font-medium text-slate-800">7:00 AM – 10:00 PM</span></li>
                            </ul>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                                <span className="text-emerald-500 text-[0.75rem] font-bold">Currently Open</span>
                            </div>
                        </div>

                        {/* Quick links */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
                            <h3 className="font-bold text-slate-800 text-[0.88rem] mb-3">Looking for something specific?</h3>
                            <div className="space-y-2">
                                <Link href="/pages/docs" className="flex items-center gap-2 text-blue-600 text-[0.82rem] font-medium hover:underline">
                                    <Book size={13} /> Read the Documentation
                                </Link>
                                <Link href="/pages/features" className="flex items-center gap-2 text-blue-600 text-[0.82rem] font-medium hover:underline">
                                    <Zap size={13} /> Browse All Features
                                </Link>
                                <Link href="/auth/login" className="flex items-center gap-2 text-blue-600 text-[0.82rem] font-medium hover:underline">
                                    <HelpCircle size={13} /> Login to Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Contact Form */}
                    <div className="lg:col-span-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                        >
                            {/* Form header */}
                            <div className="px-8 py-6 border-b border-slate-100">
                                <h2 className="font-black text-slate-900 text-xl">Send us a message</h2>
                                <p className="text-slate-500 text-[0.85rem] mt-1">We'll get back to you within 24 hours.</p>
                            </div>

                            {status === "success" ? (
                                <div className="px-8 py-16 text-center">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={32} className="text-emerald-500" />
                                    </div>
                                    <h3 className="font-black text-slate-900 text-xl mb-2">Message Sent!</h3>
                                    <p className="text-slate-500 text-[0.9rem] mb-6">Salamat! We'll reply to <span className="font-bold text-slate-800">{form.email}</span> as soon as possible.</p>
                                    <button onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }} className="text-blue-600 text-[0.85rem] font-bold hover:underline">
                                        Send another message →
                                    </button>
                                </div>
                            ) : (
                                <div className="px-8 py-7 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[0.72rem] font-black uppercase tracking-widest text-slate-500 mb-2">Your Name *</label>
                                            <input
                                                name="name" value={form.name} onChange={handleChange}
                                                placeholder="e.g. Juan dela Cruz"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[0.88rem] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[0.72rem] font-black uppercase tracking-widest text-slate-500 mb-2">Email Address *</label>
                                            <input
                                                name="email" type="email" value={form.email} onChange={handleChange}
                                                placeholder="your@email.com"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[0.88rem] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[0.72rem] font-black uppercase tracking-widest text-slate-500 mb-2">Subject</label>
                                        <select
                                            name="subject" value={form.subject} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[0.88rem] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all bg-white"
                                        >
                                            <option value="">Select a topic...</option>
                                            <option value="Platform Support">Platform Support</option>
                                            <option value="Inventory Issue">Inventory Issue</option>
                                            <option value="POS Question">POS Question</option>
                                            <option value="Account & Access">Account & Access</option>
                                            <option value="Store Inquiry">Store Inquiry</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[0.72rem] font-black uppercase tracking-widest text-slate-500 mb-2">Message *</label>
                                        <textarea
                                            name="message" value={form.message} onChange={handleChange}
                                            rows={5}
                                            placeholder="Tell us what you need help with..."
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[0.88rem] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={status === "loading" || !form.name || !form.email || !form.message}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        {status === "loading" ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <><Send size={16} /> Send Message</>
                                        )}
                                    </button>
                                    <p className="text-center text-[0.72rem] text-slate-400">
                                        Or reach us directly at <span className="text-blue-500 font-medium">support@marilynsstore.ph</span>
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}