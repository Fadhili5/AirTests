import { reconcilePendingTransactions } from "../services/daraja.service";

export const startReconciliationJob = () => {
  const interval = setInterval(() => {
    reconcilePendingTransactions().catch(() => undefined);
  }, 60_000);

  return () => clearInterval(interval);
};

