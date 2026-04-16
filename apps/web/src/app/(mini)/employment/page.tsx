"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { employmentStatuses } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function EmploymentPage() {
  const router = useRouter();
  const { dashboard, request, refreshDashboard } = useApp();
  const [employmentStatus, setEmploymentStatus] = useState(
    dashboard?.user.employmentStatus ?? "EMPLOYED"
  );
  const [monthlyIncome, setMonthlyIncome] = useState(
    dashboard?.user.monthlyIncome ? String(dashboard.user.monthlyIncome) : ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await request("/users/employment", {
        method: "PUT",
        body: {
          employmentStatus,
          monthlyIncome: Number(monthlyIncome)
        }
      });
      await refreshDashboard();
      router.push("/wallet");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save employment profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Employment and income"
        subtitle="Income data feeds the affordability engine, approval limits, and fraud consistency checks."
      />
      <SectionCard title="Income details">
        <form className="space-y-4" onSubmit={submit}>
          <select className="field" value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)}>
            {employmentStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <input className="field" type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
          <button className="button-primary" disabled={saving}>
            {saving ? "Saving..." : "Save employment profile"}
          </button>
        </form>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}
