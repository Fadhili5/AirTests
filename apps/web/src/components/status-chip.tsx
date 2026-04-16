import clsx from "clsx";

const toneMap: Record<string, string> = {
  VERIFIED: "bg-emerald-100 text-emerald-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  DISBURSED: "bg-emerald-100 text-emerald-800",
  REPAID: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-orange-100 text-orange-800",
  FAILED: "bg-orange-100 text-orange-800",
  MANUAL_REVIEW: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-sky-100 text-sky-800",
  DISBURSEMENT_PENDING: "bg-sky-100 text-sky-800",
  PENDING: "bg-stone-200 text-stone-700"
};

export const StatusChip = ({ status }: { status: string }) => (
  <span
    className={clsx(
      "inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em]",
      toneMap[status] ?? "bg-stone-200 text-stone-700"
    )}
  >
    {status.replaceAll("_", " ")}
  </span>
);

