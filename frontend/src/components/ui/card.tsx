import * as React from "react";
import { cn } from "../../lib/utils";

// Original aviation-themed card (kept for backward compatibility)
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

// shadcn/ui card (available as ShadcnCard)
const ShadcnCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
ShadcnCard.displayName = "ShadcnCard";

const ShadcnCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
ShadcnCardHeader.displayName = "ShadcnCardHeader";

const ShadcnCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
ShadcnCardTitle.displayName = "ShadcnCardTitle";

const ShadcnCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ShadcnCardDescription.displayName = "ShadcnCardDescription";

const ShadcnCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
ShadcnCardContent.displayName = "ShadcnCardContent";

const ShadcnCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
ShadcnCardFooter.displayName = "ShadcnCardFooter";

const ShadcnCardAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2", className)}
    {...props}
  />
));
ShadcnCardAction.displayName = "ShadcnCardAction";

export { ShadcnCard, ShadcnCardHeader, ShadcnCardFooter, ShadcnCardTitle, ShadcnCardDescription, ShadcnCardContent, ShadcnCardAction };
