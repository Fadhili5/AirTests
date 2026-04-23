import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "danger";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aviation-accent disabled:pointer-events-none disabled:opacity-60",
        variant === "default" && "bg-cyan-400/90 text-slate-950 hover:bg-cyan-300",
        variant === "ghost" && "bg-transparent text-slate-100 hover:bg-white/5",
        variant === "outline" && "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
        variant === "danger" && "bg-rose-500/90 text-white hover:bg-rose-400",
        className,
      )}
      {...props}
    />
  );
}
