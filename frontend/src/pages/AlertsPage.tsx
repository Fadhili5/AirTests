import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";

export default function AlertsPage() {
  const { alerts, timeline } = useAeroStore();
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const filtered = severityFilter === "ALL"
    ? alerts
    : alerts.filter((a) => a.level === severityFilter);

  const handleAcknowledge = (id: string) => {
    setAcknowledged((prev) => new Set(prev).add(id));
  };

  const grouped = {
    critical: alerts.filter((a) => a.level === "HIGH"),
    watch: alerts.filter((a) => a.level === "MEDIUM"),
    info: alerts.filter((a) => a.level === "LOW"),
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-4">
        {/* Severity Filters */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Severity Filters</CardTitle>
              <CardDescription>Operational severity segmentation for risk-event review.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <FilterBadge label="All" count={alerts.length} active={severityFilter === "ALL"} onClick={() => setSeverityFilter("ALL")} />
              <FilterBadge label="Critical" count={grouped.critical.length} active={severityFilter === "HIGH"} onClick={() => setSeverityFilter("HIGH")} tone="danger" />
              <FilterBadge label="Watch" count={grouped.watch.length} active={severityFilter === "MEDIUM"} onClick={() => setSeverityFilter("MEDIUM")} tone="warn" />
              <FilterBadge label="Info" count={grouped.info.length} active={severityFilter === "LOW"} onClick={() => setSeverityFilter("LOW")} tone="good" />
            </div>
          </CardContent>
        </Card>

        {/* Alert Feed */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Alert Feed</CardTitle>
              <CardDescription>Realtime system alerts and risk events.</CardDescription>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-400">
              {filtered.length} shown
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((alert) => {
              const isAck = acknowledged.has(alert.id);
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-lg border p-3 transition-opacity",
                    isAck ? "border-white/5 bg-white/[0.02] opacity-50" : "border-white/5 bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{alert.uldId}</span>
                    <div className="flex items-center gap-2">
                      <RiskBadge risk={alert.level} />
                      {!isAck && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-[10px] px-2 py-1 rounded-full bg-cyan-400/15 text-cyan-300 hover:bg-cyan-400/25 transition-colors"
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.detail}</p>
                  <p className="text-[11px] text-slate-600 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No alerts match the current filter.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acknowledgement Timeline */}
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Acknowledgement Flow</CardTitle>
            <CardDescription>Event chain and recovery verification.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeline.slice(0, 12).map((item) => (
            <div key={item.id} className="flex gap-3">
              <span className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                item.type === "Alert" && "bg-rose-400",
                item.type === "Verified" && "bg-emerald-400",
                item.type === "Executed" && "bg-cyan-400",
                item.type === "Assigned" && "bg-amber-400",
                item.type === "Acknowledged" && "bg-blue-400"
              )} />
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm">{item.type}</strong>
                  <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterBadge({ label, count, active, onClick, tone }: { label: string; count: number; active: boolean; onClick: () => void; tone?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-all",
        active
          ? "bg-cyan-400/15 border-cyan-400/30 text-cyan-200"
          : "border-white/5 text-slate-400 hover:bg-white/5"
      )}
    >
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        tone === "danger" && "bg-rose-400",
        tone === "warn" && "bg-amber-400",
        tone === "good" && "bg-emerald-400",
        !tone && "bg-slate-400"
      )} />
      {label} <span className="text-slate-500">({count})</span>
    </button>
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
