"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatKes } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function ApplyPage() {
  const router = useRouter();
  const { dashboard, request, refreshDashboard } = useApp();
  const [requestedAmount, setRequestedAmount] = useState("3000");
  const [durationDays, setDurationDays] = useState("30");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await request<{ application: { status: string } }>("/loans/apply", {
        method: "POST",
        body: {
          requestedAmount: Number(requestedAmount),
          durationDays: Number(durationDays)
        }
      });
      await refreshDashboard();

      if (response.application.status === "APPROVED") {
        router.push("/loan");
        return;
      }
      if (response.application.status === "REJECTED") {
        router.push("/rejection");
        return;
      }
      router.push("/background-check");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit the application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Loan application"
        subtitle="Request your facility once your profile and wallet hold are complete. The approval engine uses affordability and fraud signals in real time."
      />
      <SectionCard title="Eligibility snapshot">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Income</p>
            <p className="mt-2 text-xl font-semibold text-ink">{formatKes(dashboard?.user.monthlyIncome ?? 0)}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wallet hold</p>
            <p className="mt-2 text-xl font-semibold text-ink">{formatKes(dashboard?.wallet?.refundableAmount ?? 0)}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Risk score</p>
            <p className="mt-2 text-xl font-semibold text-ink">{dashboard?.user.riskScore ?? 0}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Request a loan">
        <form className="space-y-4" onSubmit={submit}>
          <input className="field" type="number" value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} />
          <select className="field" value={durationDays} onChange={(e) => setDurationDays(e.target.value)}>
            {[14, 21, 30, 45, 60].map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
          <button className="button-primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Run checks and submit"}
          </button>
        </form>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}

