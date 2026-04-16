"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { dashboard, request, refreshDashboard } = useApp();
  const [fullName, setFullName] = useState(dashboard?.user.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(dashboard?.user.phoneNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    dashboard?.user.dateOfBirth ? dashboard.user.dateOfBirth.slice(0, 10) : ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await request("/users/profile", {
        method: "PUT",
        body: {
          fullName,
          phoneNumber,
          dateOfBirth: new Date(dateOfBirth).toISOString()
        }
      });
      await refreshDashboard();
      setMessage("Registration details saved.");
      router.push("/kyc");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="User registration"
        subtitle="Confirm the identity details tied to your Telegram account before KYC review begins."
      />
      <SectionCard title="Personal profile">
        <form className="space-y-4" onSubmit={submit}>
          <input className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="field" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          <input className="field" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          <button className="button-primary" disabled={saving}>
            {saving ? "Saving..." : "Save and continue"}
          </button>
        </form>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}
