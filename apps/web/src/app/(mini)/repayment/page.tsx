"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatKes } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function RepaymentPage() {
  const { dashboard, request, refreshDashboard } = useApp();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const application = dashboard?.latestApplication;
  const outstanding = useMemo(() => {
    if (!application) {
      return 0;
    }
    const repayments = dashboard?.transactions
      .filter((transaction) => transaction.type === "REPAYMENT" && transaction.status === "SUCCESS")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return Math.max(0, (application.repaymentTotal ?? 0) - (repayments ?? 0));
  }, [application, dashboard?.transactions]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!application) {
      return;
    }
    setProcessing(true);
    setMessage(null);
    try {
      await request(`/loans/${application.id}/repay`, {
        method: "POST",
        headers: {
          "x-idempotency-key": `repay-${Date.now()}`
        },
        body: {
          amount: Number(amount)
        }
      });
      await refreshDashboard();
      setMessage("Repayment STK Push sent. Complete the request on your phone.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to initiate repayment");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Loan repayment dashboard"
        subtitle="Track your due balance and trigger an M-Pesa STK repayment request directly from the Mini App."
      />
      <SectionCard title="Outstanding position">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
            <p className="mt-2 text-xl font-semibold text-ink">{application?.status ?? "NO LOAN"}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Due date</p>
            <p className="mt-2 text-xl font-semibold text-ink">
              {application?.dueDate ? new Date(application.dueDate).toLocaleDateString() : "-"}
            </p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Outstanding</p>
            <p className="mt-2 text-xl font-semibold text-ink">{formatKes(outstanding)}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <input className="field" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button className="button-primary" disabled={processing || !application}>
            {processing ? "Sending STK Push..." : "Repay via M-Pesa"}
          </button>
        </form>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}
