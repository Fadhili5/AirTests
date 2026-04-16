"use client";

import { formatKes } from "@lending/shared";
import { ScreenHeader } from "../../../components/screen-header";
import { SectionCard } from "../../../components/section-card";
import { StatusChip } from "../../../components/status-chip";
import { useApp } from "../../../providers/app-provider";

export default function HistoryPage() {
  const { dashboard } = useApp();

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Transaction history"
        subtitle="Track verification holds, withdrawals, loan disbursements, and repayments as they move through Safaricom rails."
      />
      <SectionCard title="Ledger activity">
        <div className="space-y-3">
          {dashboard?.transactions.length ? (
            dashboard.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-3xl bg-sand p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{transaction.type.replaceAll("_", " ")}</p>
                    <p className="text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Ref {transaction.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-ink">{formatKes(transaction.amount)}</p>
                    <StatusChip status={transaction.status} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No transactions recorded yet.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

