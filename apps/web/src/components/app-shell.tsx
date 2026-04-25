"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Plane, PackageSearch, Thermometer, Siren, ShieldCheck, CloudSun } from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Radar },
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/uld-tracking", label: "ULD Tracking", icon: PackageSearch },
  { href: "/exposure", label: "Exposure", icon: Thermometer },
  { href: "/interventions", label: "Interventions", icon: ShieldCheck },
  { href: "/alerts", label: "Alerts", icon: Siren },
  { href: "/weather", label: "Weather", icon: CloudSun },
  { href: "/thermal-map", label: "Thermal Map", icon: Thermometer }
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto grid min-h-screen max-w-[1700px] grid-cols-1 gap-3 px-3 py-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="panel-strong h-fit overflow-hidden lg:sticky lg:top-3">
          <div className="border-b px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">AeroSentinel</p>
            <h1 className="mt-1 text-[16px] font-semibold text-slate-900">Cargo Operations</h1>
            <p className="mt-1 text-[11px] text-slate-500">Air cargo control tower</p>
          </div>

          <nav className="space-y-0.5 p-2">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href === "/dashboard" && pathname === "/control-tower");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[12px] transition ${
                    active
                      ? "bg-slate-100 font-medium text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-4">
          <header className="panel flex min-h-[48px] items-center justify-between gap-4 px-3 py-2">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Operations Console</p>
                <h2 className="text-[15px] font-semibold text-slate-900">
                  {navigation.find((item) => pathname === item.href)?.label ?? "Dashboard"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="status-pill status-live">Live</span>
              <span>Flight, telemetry, weather, intervention data</span>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
};
