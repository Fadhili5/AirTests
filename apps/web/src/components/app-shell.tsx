"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileText, HandCoins, Landmark, ShieldCheck } from "lucide-react";
import { formatKes } from "@lending/shared";
import { useApp } from "../providers/app-provider";
import { StatusChip } from "./status-chip";
import { LoadingScreen } from "./loading-screen";

const navItems = [
  { href: "/", label: "Home", icon: Landmark },
  { href: "/wallet", label: "Wallet", icon: HandCoins },
  { href: "/apply", label: "Apply", icon: FileText },
  { href: "/repayment", label: "Repay", icon: CreditCard },
  { href: "/support", label: "Support", icon: ShieldCheck }
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { dashboard, loading, authError } = useApp();

  if (loading) {
    return <LoadingScreen message="Securing your Telegram session and loading account data." />;
  }

  if (authError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-[28px] border border-orange-200 bg-white px-6 py-8 text-center shadow-glow">
          <p className="text-lg font-semibold text-ink">Unable to open your Mini App session</p>
          <p className="mt-3 text-sm text-slate-600">{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-6">
      <div className="rounded-[34px] bg-[radial-gradient(circle_at_top_left,_rgba(110,231,183,0.3),_transparent_38%),linear-gradient(135deg,#0f766e_0%,#164e63_100%)] p-6 text-white shadow-glow">
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">Kenya Digital Lending</p>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{dashboard?.user.fullName ?? "Telegram Customer"}</h1>
            <p className="mt-2 text-sm text-white/80">
              Wallet {formatKes(dashboard?.wallet?.refundableAmount ?? 0)} available for withdrawal
            </p>
          </div>
          <StatusChip status={dashboard?.latestApplication?.status ?? dashboard?.user.verificationStatus ?? "PENDING"} />
        </div>
      </div>

      <main className="mt-6 space-y-5">{children}</main>

      <nav className="fixed bottom-4 left-1/2 z-20 flex w-[min(92vw,720px)] -translate-x-1/2 justify-between rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-glow backdrop-blur">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center rounded-full px-3 py-2 text-xs font-medium ${
                active ? "bg-lagoon text-white" : "text-slate-500"
              }`}
            >
              <Icon className="mb-1 h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

