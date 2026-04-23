import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
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
    <header className="border-b border-white/10 bg-[#060f1c]/80 backdrop-blur-md px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="md:hidden rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-slate-200"
          >
            <MenuIcon />
          </button>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">
              {current?.eyebrow || "Overview"}
            </p>
            <h2 className="text-base font-semibold">{current?.title || "AeroSentinel"}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Flight ACX-204 / B777F
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Realtime Active
          </span>
          <button
            onClick={onSyncClick}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition-colors"
          >
            Queue {queueLength}
          </button>
        </div>
      </div>
      {current?.description && (
        <p className="mt-1 text-xs text-slate-500">{current.description}</p>
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
