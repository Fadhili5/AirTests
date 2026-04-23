import { useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { useAeroStore } from "../../store/use-aero-store";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { syncDrawerOpen, toggleSyncDrawer, queue, syncStatus } = useAeroStore();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,216,208,0.08),transparent_20%),linear-gradient(180deg,#081321_0%,#09182b_100%)] text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
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

          <main className="flex-1 overflow-auto p-3 md:p-4 lg:p-6">
            {children}
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-[#0a1628] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Pending Sync Items</h2>
            <p className="text-sm text-slate-400">Status: {syncStatus}</p>
          </div>
          <button
            onClick={toggleSyncDrawer}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
        <div className="space-y-2">
          {queue.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm text-slate-300">
              No pending offline items.
            </div>
          ) : (
            queue.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <strong className="text-sm">{item.label}</strong>
                <p className="text-xs text-slate-500 mt-1">{new Date(item.createdAt).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
