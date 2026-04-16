"use client";

import { useState } from "react";
import Link from "next/link";
import { formatKes } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function WalletPage() {
  const { dashboard, request, refreshDashboard } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const initiateHold = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      await request("/wallet/hold", {
        method: "POST",
        headers: {
          "x-idempotency-key": `hold-${Date.now()}`
        },
        body: {
          phoneNumber: dashboard?.user.mpesaNumber ?? dashboard?.user.phoneNumber ?? undefined
        }
      });
      setMessage("STK Push sent. Complete the KES 100 verification hold on your phone, then refresh this screen.");
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start the verification hold");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Verification wallet hold"
        subtitle="Pay the refundable KES 100 verification hold. The balance stays available for withdrawal even if your loan request is rejected."
      />
      <SectionCard title="Wallet balances">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Balance</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{formatKes(dashboard?.wallet?.balance ?? 0)}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Held</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{formatKes(dashboard?.wallet?.heldAmount ?? 0)}</p>
          </div>
          <div className="rounded-3xl bg-sand p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Refundable</p>
            <p className="mt-2 text-2xl font-semibold text-ink">
              {formatKes(dashboard?.wallet?.refundableAmount ?? 0)}
            </p>
          </div>
        </div>

        <button className="button-primary" onClick={initiateHold} disabled={processing}>
          {processing ? "Sending STK Push..." : "Place KES 100 verification hold"}
        </button>
        <button className="button-secondary" onClick={() => refreshDashboard()}>
          Refresh wallet status
        </button>
        <Link href="/withdraw" className="button-secondary">
          Withdraw refundable balance
        </Link>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}

