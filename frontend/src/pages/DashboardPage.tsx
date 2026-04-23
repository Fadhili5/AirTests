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

  let highRiskUlds: typeof ulds;
  let openTasks: typeof tasks;
  try {
    highRiskUlds = ulds.filter((u) => u.risk === "HIGH");
    openTasks = tasks.filter((t) => t.status !== "Completed");
  } catch (err) {
    console.error("[Dashboard] Filter error:", err);
    highRiskUlds = [];
    openTasks = [];
  }

  return (
    <div className="space-y-4">
      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</span>
                <StatusDot tone={item.tone} />
              </div>
              <p className="text-2xl font-semibold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* System Status Snapshot */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>System Status Snapshot</CardTitle>
                <CardDescription>Command overview — no deep operational working views on home.</CardDescription>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-1 rounded-full font-medium",
                queue.length > 0 ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"
              )}>
                {queue.length > 0 ? `${queue.length} queued` : "Stable"}
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <StatusTile label="Realtime Feed" value="Connected" tone="good" />
              <StatusTile label="High Risk ULDs" value={String(highRiskUlds.length)} tone={highRiskUlds.length > 0 ? "danger" : "good"} />
              <StatusTile label="Actioning Load" value={String(openTasks.length)} tone={openTasks.length > 0 ? "warn" : "good"} />
            </CardContent>
          </Card>

          {/* Risk Map Preview */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Risk Overview Map</CardTitle>
                <CardDescription>Global ULD positions and risk zone preview.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ulds.slice(0, 6).map((uld) => (
                  <div key={uld.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{uld.id}</span>
                      <RiskBadge risk={uld.risk} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{uld.airport} • {uld.zone}</p>
                    <p className="text-xs text-slate-500 mt-1">{uld.phase} • {uld.currentTemp.toFixed(1)}°C</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Cards */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Quick Access</CardTitle>
                <CardDescription>Jump directly into active operational domains.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickLink
                to="/alerts"
                title="Investigate Alerts"
                description="Severity triage and acknowledgement"
                count={alerts.filter((a) => a.level === "HIGH").length}
                countTone="danger"
              />
              <QuickLink
                to="/interventions"
                title="Execute Interventions"
                description="Assignments, SLA windows, action history"
                count={openTasks.length}
                countTone="warn"
              />
              <QuickLink
                to="/uld-tracking"
                title="Track ULDs"
                description="Live map and movement view"
                count={ulds.length}
                countTone="good"
              />
              <QuickLink
                to="/airports"
                title="Review Airports"
                description="Zone risk and delay intelligence"
                count={new Set(ulds.map((u) => u.airport)).size}
                countTone="default"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Alerts Summary */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Active Alerts Summary</CardTitle>
                <CardDescription>Latest risk events requiring attention.</CardDescription>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-400">
                {alerts.length} total
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 8).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-white/5 bg-white/[0.03] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{alert.uldId}</span>
                    <RiskBadge risk={alert.level} />
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No active alerts.</p>
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
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <div className="flex items-center gap-2 mt-2">
        <StatusDot tone={tone} />
        <strong className="text-lg">{value}</strong>
      </div>
    </div>
  );
}

function StatusDot({ tone }: { tone: string }) {
  return (
    <span className={cn(
      "h-2 w-2 rounded-full",
      tone === "good" && "bg-emerald-400",
      tone === "warn" && "bg-amber-400",
      tone === "danger" && "bg-rose-400",
      tone === "default" && "bg-slate-400"
    )} />
  );
}

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={cn(
      "text-[10px] font-medium px-2 py-0.5 rounded-full",
      risk === "HIGH" && "bg-rose-400/15 text-rose-300",
      risk === "MEDIUM" && "bg-amber-400/15 text-amber-300",
      risk === "LOW" && "bg-emerald-400/15 text-emerald-300"
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
