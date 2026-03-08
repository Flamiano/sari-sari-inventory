import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Syne, DM_Sans, Montserrat_Alternates } from "next/font/google";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
const montserrat = Montserrat_Alternates({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marilyn Cruz | Sari.Store Digital",
  description: "Modern inventory management for Filipino store owners.",
  icons: { icon: "/images/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${syne.variable} ${dmSans.variable} ${montserrat.variable} antialiased font-dm`}>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={12}
          containerStyle={{
            top: 24,
            right: 24,
            left: 'auto', 
          }}
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              fontFamily: 'var(--font-dm)',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '12px 18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            },
            success: {
              iconTheme: { primary: '#2563eb', secondary: '#fff' },
              style: { borderLeft: '5px solid #2563eb' }
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              style: { borderLeft: '5px solid #ef4444' }
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}