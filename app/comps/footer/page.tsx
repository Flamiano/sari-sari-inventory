import Link from "next/link";
import { Facebook, MessageCircle, Mail, MapPin, Phone, Clock } from "lucide-react";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer
            className="pt-[70px] pb-0"
            style={{ background: "#0f172a", color: "rgba(255,255,255,0.65)" }}
        >
            <div className="max-w-[1160px] mx-auto px-6">
                {/* ── TOP GRID ── */}
                <div
                    className="grid gap-12 pb-14 border-b lg:grid-cols-5 md:grid-cols-2 grid-cols-1"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                    {/* Brand & Mission */}
                    <div className="lg:col-span-2">
                        <div className="font-syne text-[1.4rem] font-extrabold text-white mb-3">
                            Ate Marilyn<span className="text-blue-500">.</span>Store
                        </div>
                        <p className="text-[0.9rem] leading-[1.7] max-w-[300px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                            Ang paboritong tambayan at bilihan ng mga kapitbahay. Serving fresh goods and smiles since 2023.
                        </p>
                        <div className="flex gap-[0.6rem] mt-6">
                            {[
                                { icon: <Facebook size={18} />, label: "Facebook", color: "#1877F2" },
                                { icon: <MessageCircle size={18} />, label: "Messenger", color: "#0084FF" },
                                { icon: <Mail size={18} />, label: "Email", color: "#EA4335" },
                            ].map(({ icon, label, color }) => (
                                <a
                                    key={label}
                                    href="#"
                                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = color; e.currentTarget.style.color = "#fff"; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "inherit"; }}
                                >
                                    {icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <FooterCol
                        title="Tindahan"
                        links={[
                            { label: "Our Story", href: "#story" },
                            { label: "Products", href: "#products" },
                            { label: "Reviews", href: "#reviews" },
                            { label: "Location", href: "#visit" },
                        ]}
                    />

                    {/* Store Schedule */}
                    <div>
                        <h6 className="font-syne text-[0.75rem] font-bold uppercase tracking-[0.12em] mb-4 text-white">
                            Business Hours
                        </h6>
                        <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[0.85rem]">
                            <li className="flex justify-between"><span className="opacity-60">Mon - Fri:</span> <span>6AM - 9PM</span></li>
                            <li className="flex justify-between"><span className="opacity-60">Sat - Sun:</span> <span>7AM - 10PM</span></li>
                            <li className="mt-2 text-blue-400 font-semibold flex items-center gap-2">
                                <Clock size={14} /> Open Now
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h6 className="font-syne text-[0.75rem] font-bold uppercase tracking-[0.12em] mb-4 text-white">
                            Contact Us
                        </h6>
                        <ul className="list-none p-0 m-0 flex flex-col gap-4 text-[0.88rem]">
                            <li className="flex gap-3">
                                <MapPin size={18} className="text-blue-500 shrink-0" />
                                <span>807 Riverside St. Unit 3, Barangay Commonwealth Q.C.</span>
                            </li>
                            <li className="flex gap-3">
                                <Phone size={18} className="text-blue-500 shrink-0" />
                                <span>+63 912 345 6789</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* ── BOTTOM BAR ── */}
                <div
                    className="flex items-center justify-between flex-wrap gap-4 py-8 text-[0.82rem]"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                >
                    <span>© {year} Ate Marilyn Sari-Sari Store. All rights reserved.</span>
                    <div className="flex gap-6">
                        <Link href="/auth/login" className="hover:text-white transition-colors">Owner Login</Link>
                        <span className="opacity-20">|</span>
                        <span>Made with ❤️ for the Community</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h6 className="font-syne text-[0.75rem] font-bold uppercase tracking-[0.12em] mb-4 text-white">
                {title}
            </h6>
            <ul className="list-none m-0 p-0 flex flex-col gap-[0.7rem]">
                {links.map(({ label, href }) => (
                    <li key={label}>
                        <Link
                            href={href}
                            className="text-[0.88rem] no-underline transition-colors duration-200 hover:text-white hover:translate-x-1 inline-block"
                            style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                            {label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}