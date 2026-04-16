"use client";

import Link from "next/link";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { StatusChip } from "../../../components/status-chip";
import { useApp } from "../../../providers/app-provider";

export default function BackgroundCheckPage() {
  const { dashboard, refreshDashboard } = useApp();

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Background check status"
        subtitle="Automated risk controls check duplicate identity use, account abuse, M-Pesa mismatch, repayment history, and affordability consistency."
      />
      <SectionCard title="Risk engine decision">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink">Latest assessment</p>
            <p>Score: {dashboard?.latestAssessment?.score ?? dashboard?.user.riskScore ?? 0}</p>
          </div>
          <StatusChip status={dashboard?.latestAssessment?.reviewStatus ?? "PENDING"} />
        </div>
        <div className="rounded-3xl bg-sand p-4">
          <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-600">
            {JSON.stringify(dashboard?.latestAssessment?.notes ?? {}, null, 2)}
          </pre>
        </div>
        <button className="button-secondary" onClick={() => refreshDashboard()}>
          Refresh decision
        </button>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/loan" className="button-primary">
            Open approval dashboard
          </Link>
          <Link href="/rejection" className="button-secondary">
            Open rejection screen
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}

