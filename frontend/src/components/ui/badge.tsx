import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

// Original aviation-themed badge (kept for backward compatibility)
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

// shadcn/ui badge (available as ShadcnBadge)
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-success text-white hover:bg-success/80",
        warning:
          "border-transparent bg-warning text-white hover:bg-warning/80",
        critical:
          "border-transparent bg-critical text-white hover:bg-critical/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ShadcnBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function ShadcnBadge({ className, variant, ...props }: ShadcnBadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { ShadcnBadge, badgeVariants };
