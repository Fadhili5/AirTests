"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function KycPage() {
  const router = useRouter();
  const { dashboard, request, refreshDashboard } = useApp();
  const [nationalId, setNationalId] = useState(dashboard?.user.nationalId ?? "");
  const [mpesaNumber, setMpesaNumber] = useState(dashboard?.user.mpesaNumber ?? dashboard?.user.phoneNumber ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await request("/users/kyc", {
        method: "PUT",
        body: { nationalId, mpesaNumber }
      });
      await refreshDashboard();
      router.push("/employment");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save KYC details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Identity verification"
        subtitle="We use your ID and the Safaricom line you transact with to score fraud risk and payout eligibility."
      />
      <SectionCard title="KYC record">
        <form className="space-y-4" onSubmit={submit}>
          <input className="field" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          <input className="field" value={mpesaNumber} onChange={(e) => setMpesaNumber(e.target.value)} />
          <button className="button-primary" disabled={saving}>
            {saving ? "Saving..." : "Save KYC details"}
          </button>
        </form>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}
