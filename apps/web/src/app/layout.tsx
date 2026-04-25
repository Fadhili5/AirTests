import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "AeroSentinel",
  description: "Real-Time Air Cargo Exposure Intelligence and ONE Record Digital Twin Platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-[var(--bg)]">
      <body className="min-h-full bg-[var(--bg)] text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
