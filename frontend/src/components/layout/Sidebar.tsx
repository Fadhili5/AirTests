import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { path: "/flights", label: "Flights", icon: FlightIcon },
  { path: "/uld-tracking", label: "ULD Tracking", icon: MapIcon },
  { path: "/exposure", label: "Exposure", icon: ThermometerIcon },
  { path: "/alerts", label: "Alerts", icon: AlertIcon },
  { path: "/interventions", label: "Interventions", icon: ClipboardIcon },
  { path: "/airports", label: "Airports", icon: AirportIcon },
  { path: "/analytics", label: "Analytics", icon: ChartIcon },
];

export function Sidebar({
  collapsed,
  onToggle,
  currentPath,
  syncStatus,
  queueLength,
  onSyncClick,
}: {
  collapsed: boolean;
  onToggle: () => void;
  currentPath: string;
  syncStatus: string;
  queueLength: number;
  onSyncClick: () => void;
}) {
  return (
    <aside
      className={cn(
        "glass-surface-strong hidden md:flex flex-col border-r border-slate-200/80 bg-slate-50/72 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]",
        "lg:w-[280px]"
      )}
    >
      {/* Brand */}
      <div className="border-b border-slate-200/80 p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50/90 text-blue-700 ring-1 ring-blue-200/80">
            <span className="text-sm font-bold">AX</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-semibold leading-tight text-slate-900">AeroSentinel</h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Cargo Control</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "border border-blue-200/80 bg-blue-50/85 text-blue-700"
                  : "border border-transparent text-slate-600 hover:bg-white/55 hover:text-slate-900",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn("shrink-0", active ? "text-blue-600" : "text-slate-400")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="space-y-2 border-t border-slate-200/80 p-3">
        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-white/55 hover:text-slate-900",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronRightIcon /> : <>
            <ChevronLeftIcon />
            <span>Collapse</span>
          </>}
        </button>

        {/* Sync Status */}
        {!collapsed && (
          <div className="glass-surface space-y-2 rounded-2xl border border-slate-200/80 bg-white/68 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Sync</span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                syncStatus === "online" && "bg-emerald-50 text-emerald-700",
                syncStatus === "syncing" && "bg-amber-50 text-amber-700",
                syncStatus === "offline" && "bg-rose-50 text-rose-700"
              )}>
                {syncStatus}
              </span>
            </div>
            <button
              onClick={onSyncClick}
              className="w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
            >
              Pending {queueLength > 0 ? `(${queueLength})` : "0"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/* Icons */
function LayoutDashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function FlightIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.75l10.125-1.688a.75.75 0 01.842.99l-1.5 4.5a.75.75 0 00.146.745l2.024 2.53a.75.75 0 01-.467 1.205l-4.907.701a.75.75 0 00-.43.215l-3.454 3.454a.75.75 0 01-1.26-.546v-4.195a.75.75 0 00-.22-.53L7.5 10.5M3.75 20.25l3-3m0 0l2.25-2.25m-2.25 2.25L3 13.5m3.75 3.75l3.75 3.75" />
    </svg>
  );
}

function ThermometerIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V16.5a2.25 2.25 0 002.25 2.25h.75m0-3H12" />
    </svg>
  );
}

function AirportIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}


function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
