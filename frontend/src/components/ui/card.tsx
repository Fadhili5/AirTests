import { cn } from "../../lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[#0c1522]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-4 py-3 border-b border-white/5", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

export function CardDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  return <p className="text-xs text-slate-500 mt-0.5">{children}</p>;
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
