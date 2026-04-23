import { cn } from "../../lib/utils";

export function PageError({
  title = "Page Error",
  message = "Something went wrong loading this module.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-rose-400/20 bg-[#0c1522] p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-400/15">
          <AlertIcon className="h-6 w-6 text-rose-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-lg bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-300 border border-cyan-400/20 hover:bg-cyan-400/25 transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-6 w-6", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
