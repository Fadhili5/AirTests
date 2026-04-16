import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const ScreenHeader = ({
  title,
  subtitle,
  backHref = "/"
}: {
  title: string;
  subtitle: string;
  backHref?: string;
}) => (
  <div className="space-y-4">
    <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-lagoon">
      <ChevronLeft className="h-4 w-4" />
      Back
    </Link>
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em] text-lagoon/70">KopaBot Lending</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{subtitle}</p>
    </div>
  </div>
);

