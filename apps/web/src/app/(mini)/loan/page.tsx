"use client";

import { useState } from "react";
import Link from "next/link";
import { formatKes } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { StatusChip } from "../../../components/status-chip";
import { useApp } from "../../../providers/app-provider";

export default function LoanPage() {
  const { dashboard, request, refreshDashboard } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const application = dashboard?.latestApplication;

  const disburse = async () => {
    if (!application) {
      return;
    }
    setProcessing(true);
    setMessage(null);
    try {
      await request(`/loans/${application.id}/disburse`, {
        method: "POST",
        headers: {
          "x-idempotency-key": `disburse-${application.id}`
        }
      });
      await refreshDashboard();
      setMessage("Loan payout request submitted to Safaricom B2C. Your status will update when the callback lands.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to disburse loan");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Loan approval dashboard"
        subtitle="View approved terms, track disbursement state, and move into repayment once funds land in M-Pesa."
      />
      <SectionCard title="Current application">
        {application ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">Application status</p>
                <p>{formatKes(application.requestedAmount)} requested</p>
              </div>
              <StatusChip status={application.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-sand p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Approved</p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {formatKes(application.approvedAmount ?? 0)}
                </p>
              </div>
              <div className="rounded-3xl bg-sand p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Interest</p>
                <p className="mt-2 text-xl font-semibold text-ink">{application.interestRate ?? 0}%</p>
              </div>
              <div className="rounded-3xl bg-sand p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Repayment</p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {formatKes(application.repaymentTotal ?? 0)}
                </p>
              </div>
            </div>
            {application.status === "APPROVED" ? (
              <button className="button-primary" onClick={disburse} disabled={processing}>
                {processing ? "Submitting B2C request..." : "Disburse to M-Pesa"}
              </button>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/repayment" className="button-secondary">
                Open repayment dashboard
              </Link>
              <button className="button-secondary" onClick={() => refreshDashboard()}>
                Refresh status
              </button>
            </div>
          </>
        ) : (
          <p>No application is available yet.</p>
        )}
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}

