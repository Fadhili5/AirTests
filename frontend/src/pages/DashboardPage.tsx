import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAeroStore } from "../store/use-aero-store";
import { summarizeSystem, riskTone } from "../lib/aero-control";
import { cn } from "../lib/utils";

export default function DashboardPage() {
  const { alerts, tasks, ulds, queue } = useAeroStore();

  const stats = useMemo(() => {
    try {
      return summarizeSystem(ulds, alerts, tasks);
    } catch (err) {
      console.error("[Dashboard] Stats computation failed:", err);
      return [];
    }
  }, [alerts, tasks, ulds]);

  const highRiskUlds = useMemo(() => {
    try { return ulds.filter((u) => u.risk === "HIGH"); } catch { return []; }
  }, [ulds]);

  const openTasks = useMemo(() => {
    try { return tasks.filter((t) => t.status !== "Completed"); } catch { return []; }
  }, [tasks]);

  const riskCounts = useMemo(() => {
    try {
      return {
        high: ulds.filter((u) => u.risk === "HIGH").length,
        medium: ulds.filter((u) => u.risk === "MEDIUM").length,
        low: ulds.filter((u) => u.risk === "LOW").length,
        total: ulds.length,
      };
    } catch { return { high: 0, medium: 0, low: 0, total: 0 }; }
  }, [ulds]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Overview - tablet-first responsive */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</span>
                <StatusDot tone={item.tone} />
              </div>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Left Column */}
        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          {/* System Status Snapshot */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>System Status Snapshot</CardTitle>
                <CardDescription>Command overview — no deep operational working views on home.</CardDescription>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-1 rounded-full font-medium",
                queue.length > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
              )}>
                {queue.length > 0 ? `${queue.length} queued` : "Stable"}
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatusTile label="Realtime Feed" value="Connected" tone="good" />
              <StatusTile label="High Risk ULDs" value={String(highRiskUlds.length)} tone={highRiskUlds.length > 0 ? "danger" : "good"} />
              <StatusTile label="Actioning Load" value={String(openTasks.length)} tone={openTasks.length > 0 ? "warn" : "good"} />
            </CardContent>
          </Card>

          {/* Risk Map Preview — high-level only, no operational detail */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Risk Overview</CardTitle>
                <CardDescription>Fleet risk posture by category — drill down on ULD Tracking.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <RiskSummaryTile label="High Risk" count={riskCounts.high} tone="danger" />
                <RiskSummaryTile label="Medium Risk" count={riskCounts.medium} tone="warn" />
                <RiskSummaryTile label="Low Risk" count={riskCounts.low} tone="good" />
                <RiskSummaryTile label="Fleet Total" count={riskCounts.total} tone="default" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Cards - tablet-first responsive */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Quick Access</CardTitle>
                <CardDescription>Jump directly into active operational domains.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { path: "/flights", label: "Flights", icon: "FL" },
                  { path: "/uld-tracking", label: "ULD Tracking", icon: "UL" },
                  { path: "/exposure", label: "Exposure", icon: "EX" },
                  { path: "/alerts", label: "Alerts", icon: "AL" },
                  { path: "/interventions", label: "Interventions", icon: "IN" },
                  { path: "/airports", label: "Airports", icon: "AP" },
                  { path: "/analytics", label: "Analytics", icon: "AN" },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">{item.icon}</span>
                    <p className="mt-3 text-sm font-medium text-slate-900">{item.label}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Alerts Summary */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Active Alerts Summary</CardTitle>
                <CardDescription>Latest risk events requiring attention.</CardDescription>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                {alerts.length} total
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 8).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{alert.uldId}</span>
                    <RiskBadge risk={alert.level} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{alert.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">No active alerts.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <div className="flex items-center gap-2 mt-2">
        <StatusDot tone={tone} />
        <strong className="text-lg text-slate-900">{value}</strong>
      </div>
    </div>
  );
}

function StatusDot({ tone }: { tone: string }) {
  return (
    <span className={cn(
      "h-2 w-2 rounded-full",
      tone === "good" && "bg-emerald-600",
      tone === "warn" && "bg-amber-600",
      tone === "danger" && "bg-rose-600",
      tone === "default" && "bg-slate-400"
    )} />
  );
}

function RiskSummaryTile({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn(
        "text-2xl font-semibold mt-1",
        tone === "danger" && "text-rose-600",
        tone === "warn" && "text-amber-600",
        tone === "good" && "text-emerald-600",
        tone === "default" && "text-slate-700"
      )}>
        {count}
      </p>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={cn(
      "text-[10px] font-medium px-2 py-0.5 rounded-full",
      risk === "HIGH" && "bg-rose-50 text-rose-700",
      risk === "MEDIUM" && "bg-amber-50 text-amber-700",
      risk === "LOW" && "bg-emerald-50 text-emerald-700"
    )}>
      {risk}
    </span>
  );
}

function QuickLink({
  to,
  title,
  description,
  count,
  countTone,
}: {
  to: string;
  title: string;
  description: string;
  count: number;
  countTone: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05] hover:border-cyan-400/20"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium group-hover:text-cyan-200 transition-colors">{title}</h4>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          countTone === "danger" && "bg-rose-400/15 text-rose-300",
          countTone === "warn" && "bg-amber-400/15 text-amber-300",
          countTone === "good" && "bg-emerald-400/15 text-emerald-300",
          countTone === "default" && "bg-white/10 text-slate-300"
        )}>
          {count}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </Link>
  );
}
