import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "good" | "warn" | "danger";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
        tone === "default" && "border-white/10 bg-white/5 text-slate-300",
        tone === "good" && "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
        tone === "warn" && "border-amber-400/20 bg-amber-400/10 text-amber-200",
        tone === "danger" && "border-rose-400/20 bg-rose-400/10 text-rose-200",
        className,
      )}
      {...props}
    />
  );
}
