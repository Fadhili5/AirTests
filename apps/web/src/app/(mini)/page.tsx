"use client";

import Link from "next/link";
import { formatKes } from "@lending/shared";
import { ArrowRight, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { SectionCard } from "../../components/section-card";
import { StatusChip } from "../../components/status-chip";
import { useApp } from "../../providers/app-provider";

export default function HomePage() {
  const { dashboard } = useApp();

  return (
    <div className="space-y-5">
      <SectionCard title="Native Telegram onboarding" eyebrow="Step 1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink">Registration profile</p>
            <p>Complete identity details, employment data, and wallet verification before applying.</p>
          </div>
          <StatusChip status={dashboard?.user.verificationStatus ?? "PENDING"} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/register" className="button-secondary">
            Registration
          </Link>
          <Link href="/kyc" className="button-secondary">
            KYC & M-Pesa
          </Link>
          <Link href="/employment" className="button-secondary">
            Employment
          </Link>
          <Link href="/wallet" className="button-secondary">
            Wallet Hold
          </Link>
        </div>
      </SectionCard>

      <div className="grid gap-5 sm:grid-cols-2">
        <SectionCard title="Wallet snapshot" eyebrow="Wallet">
          <div className="flex items-center gap-3 rounded-3xl bg-sand p-4">
            <Wallet className="h-10 w-10 rounded-2xl bg-lagoon/10 p-2 text-lagoon" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Refundable balance</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {formatKes(dashboard?.wallet?.refundableAmount ?? 0)}
              </p>
            </div>
          </div>
          <Link href="/withdraw" className="button-primary">
            Withdraw to M-Pesa
          </Link>
        </SectionCard>

        <SectionCard title="Loan pipeline" eyebrow="Application">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">Latest application</p>
              <p>
                {dashboard?.latestApplication
                  ? `Requested ${formatKes(dashboard.latestApplication.requestedAmount)}`
                  : "No application submitted yet"}
              </p>
            </div>
            <StatusChip status={dashboard?.latestApplication?.status ?? "PENDING"} />
          </div>
          <Link href="/apply" className="button-primary">
            Apply for a loan
          </Link>
        </SectionCard>
      </div>

      <SectionCard title="Decision and repayment journey" eyebrow="Active">
        <div className="grid gap-3">
          {[
            { icon: ShieldCheck, title: "Background checks", href: "/background-check" },
            { icon: CheckCircle2, title: "Approval dashboard", href: "/loan" },
            { icon: ArrowRight, title: "Repayment dashboard", href: "/repayment" }
          ].map(({ icon: Icon, title, href }) => (
            <Link key={href} href={href} className="flex items-center justify-between rounded-3xl bg-sand px-4 py-4">
              <div className="flex items-center gap-3">
                <Icon className="h-9 w-9 rounded-2xl bg-white p-2 text-lagoon" />
                <span className="font-medium text-ink">{title}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

