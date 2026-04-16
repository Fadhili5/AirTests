"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatKes } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { useApp } from "../../../providers/app-provider";

export default function WithdrawPage() {
  const router = useRouter();
  const { dashboard, request, refreshDashboard } = useApp();
  const [amount, setAmount] = useState(String(dashboard?.wallet?.refundableAmount ?? 0));
  const [mpesaNumber, setMpesaNumber] = useState(
    dashboard?.user.mpesaNumber ?? dashboard?.user.phoneNumber ?? ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setProcessing(true);
    setMessage(null);
    try {
      await request("/wallet/withdraw", {
        method: "POST",
        headers: {
          "x-idempotency-key": `withdraw-${Date.now()}`
        },
        body: {
          amount: Number(amount),
          mpesaNumber
        }
      });
      await refreshDashboard();
      setMessage("Withdrawal request sent. Safaricom B2C result will update your wallet state shortly.");
      router.push("/history");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to withdraw wallet balance");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Wallet withdrawal"
        subtitle="Move refundable wallet funds from the platform back to your M-Pesa number using B2C payout rails."
      />
      <SectionCard title="Withdrawal request">
        <p className="text-sm text-slate-600">
          Available to withdraw: {formatKes(dashboard?.wallet?.refundableAmount ?? 0)}
        </p>
        <form className="space-y-4" onSubmit={submit}>
          <input className="field" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="field" value={mpesaNumber} onChange={(e) => setMpesaNumber(e.target.value)} />
          <button className="button-primary" disabled={processing}>
            {processing ? "Submitting withdrawal..." : "Withdraw to M-Pesa"}
          </button>
        </form>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </div>
  );
}

