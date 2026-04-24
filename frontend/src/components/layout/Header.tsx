import { routeMeta } from "../../lib/aero-control";

export function Header({
  currentPath,
  onMenuToggle,
  onSyncClick,
  queueLength,
}: {
  currentPath: string;
  onMenuToggle: () => void;
  onSyncClick: () => void;
  queueLength: number;
}) {
  const [current] = routeMeta(currentPath);

  return (
    <header className="glass-surface-strong border-b border-slate-200/80 bg-slate-50/75 px-4 py-4 md:px-5 lg:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="rounded-xl border border-slate-200/80 bg-white/70 p-2 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 md:hidden"
          >
            <MenuIcon />
          </button>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-600">
              {current?.eyebrow || "Overview"}
            </p>
            <h2 className="text-base font-semibold text-slate-900">{current?.title || "AeroSentinel"}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 text-xs text-slate-700 shadow-sm sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Flight EK202 / B777F
          </span>
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/85 px-3 py-1.5 text-xs text-emerald-700 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Realtime Active
          </span>
          <button
            onClick={onSyncClick}
            className="rounded-xl border border-blue-200/80 bg-blue-50/85 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Queue {queueLength}
          </button>
        </div>
      </div>
      {current?.description && (
        <p className="mt-1 text-xs text-slate-600">{current.description}</p>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
