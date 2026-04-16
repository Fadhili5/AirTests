"use client";

import Link from "next/link";
import { formatKes } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function RejectionPage() {
  const { dashboard } = useApp();

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Loan rejection and refund access"
        subtitle="If a request is declined, your KES 100 verification hold remains yours and can be withdrawn back to M-Pesa."
      />
      <SectionCard title="Decision summary">
        <p className="rounded-3xl bg-orange-50 p-4 text-sm text-orange-900">
          {dashboard?.latestApplication?.rejectionReason ?? "No rejection reason has been recorded."}
        </p>
        <div className="rounded-3xl bg-sand p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Refundable balance</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatKes(dashboard?.wallet?.refundableAmount ?? 0)}
          </p>
        </div>
        <Link href="/withdraw" className="button-primary">
          Withdraw refundable funds
        </Link>
      </SectionCard>
    </div>
  );
}

