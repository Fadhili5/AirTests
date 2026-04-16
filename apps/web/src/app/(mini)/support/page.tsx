"use client";

import Link from "next/link";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function SupportPage() {
  const { dashboard } = useApp();
  const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL ?? "https://t.me";

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Profile and support"
        subtitle="Keep your KYC profile accurate and jump into Telegram support directly when you need help."
      />
      <SectionCard title="Customer profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Name</p>
            <p className="mt-2 font-medium text-ink">{dashboard?.user.fullName ?? "-"}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Phone</p>
            <p className="mt-2 font-medium text-ink">{dashboard?.user.phoneNumber ?? "-"}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">National ID</p>
            <p className="mt-2 font-medium text-ink">{dashboard?.user.nationalId ?? "-"}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">M-Pesa</p>
            <p className="mt-2 font-medium text-ink">{dashboard?.user.mpesaNumber ?? "-"}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/register" className="button-secondary">
            Edit profile
          </Link>
          <a href={supportUrl} target="_blank" rel="noreferrer" className="button-primary">
            Contact support
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
