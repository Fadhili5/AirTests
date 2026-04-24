import { useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { DashboardBackdrop } from "./DashboardBackdrop";
import { useAeroStore } from "../../store/use-aero-store";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { now, syncDrawerOpen, toggleSyncDrawer, queue, syncStatus } = useAeroStore();

  return (
    <div data-now={now} className="relative min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
      <DashboardBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px]">
        {/* Desktop/Tablet Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          currentPath={location.pathname}
          syncStatus={syncStatus}
          queueLength={queue.length}
          onSyncClick={toggleSyncDrawer}
        />

        {/* Main Content Area - tablet-first responsive */}
        <div className="flex flex-1 flex-col min-w-0">
          <Header
            currentPath={location.pathname}
            onMenuToggle={() => setCollapsed(!collapsed)}
            onSyncClick={toggleSyncDrawer}
            queueLength={queue.length}
          />

          <main className="flex-1 overflow-auto px-4 py-4 md:px-5 md:py-5 lg:px-6 lg:py-6">
            <div className="mx-auto w-full max-w-[1400px]">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileNav currentPath={location.pathname} />
        </div>
      </div>

      {/* Sync Drawer Overlay */}
      {syncDrawerOpen && <SyncDrawerOverlay />}
    </div>
  );
}

function SyncDrawerOverlay() {
  const { queue, syncStatus, toggleSyncDrawer } = useAeroStore();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm">
      <div className="glass-surface-strong absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200/80 bg-slate-50/78 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pending Sync Items</h2>
            <p className="text-sm text-slate-600">Status: {syncStatus}</p>
          </div>
          <button
            onClick={toggleSyncDrawer}
            className="rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-white"
          >
            Close
          </button>
        </div>
        <div className="space-y-2">
          {queue.length === 0 ? (
            <div className="glass-surface rounded-2xl border border-slate-200/80 bg-white/68 p-4 text-sm text-slate-600 shadow-sm">
              No pending offline items.
            </div>
          ) : (
            queue.map((item) => (
              <div key={item.id} className="glass-surface rounded-2xl border border-slate-200/80 bg-white/68 p-3 shadow-sm">
                <strong className="text-sm text-slate-900">{item.label}</strong>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
