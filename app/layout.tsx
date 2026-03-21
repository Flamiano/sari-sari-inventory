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
  title: "SariSari.IMS | Sari.Store Digital",
  description: "Modern inventory management for Filipino store owners.",
  icons: { icon: "/images/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${syne.variable} ${dmSans.variable} ${montserrat.variable} antialiased font-dm`}>
        <style>{`
          @keyframes toast-drain {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>

        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerStyle={{ top: 20, right: 20 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: "#ffffff",
              color: "#0f172a",
              fontFamily: "var(--font-dm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "14px 18px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.04)",
              maxWidth: "400px",
              width: "max-content",
              minWidth: "260px",
              whiteSpace: "nowrap",
            },
            success: {
              duration: 4000,
              iconTheme: { primary: "#16a34a", secondary: "#f0fdf4" },
              style: {
                borderLeft: "4px solid #16a34a",
                background: "#fff",
                color: "#0f172a",
                fontFamily: "var(--font-dm)",
                fontSize: "0.85rem",
                fontWeight: 600,
                padding: "14px 18px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.04)",
              },
            },
            error: {
              duration: 5000,
              iconTheme: { primary: "#ef4444", secondary: "#fef2f2" },
              style: {
                borderLeft: "4px solid #ef4444",
                background: "#fff",
                color: "#0f172a",
                fontFamily: "var(--font-dm)",
                fontSize: "0.85rem",
                fontWeight: 600,
                padding: "14px 18px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.04)",
              },
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}