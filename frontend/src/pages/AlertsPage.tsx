import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageError } from "../components/ui/PageError";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";

export default function AlertsPage() {
  const { alerts, timeline, flashes } = useAeroStore();
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  let filtered: typeof alerts;
  try {
    filtered = severityFilter === "ALL" ? alerts : alerts.filter((a) => a.level === severityFilter);
  } catch (err) {
    console.error("[Alerts] Filter error:", err);
    filtered = [];
  }

  const handleAcknowledge = (id: string) => {
    try {
      setAcknowledged((prev) => new Set(prev).add(id));
    } catch (err) {
      console.error("[Alerts] Acknowledge error:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_380px] gap-3 md:gap-4">
      <div className="space-y-3 md:space-y-4">
        {/* Filters - tablet-first responsive */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Alert Feed</CardTitle>
              <CardDescription>Real-time system alerts with severity filtering and acknowledgment.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => (
                <button
                  key={level}
                  onClick={() => setSeverityFilter(level as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    severityFilter === level
                      ? "bg-cyan-400/15 text-cyan-200 border border-cyan-400/20"
                      : "text-slate-400 hover:bg-white/5 border border-transparent"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Severity-sorted alert stream with acknowledgment controls.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  flashes[`alert:${alert.id}`] ? "ring-1 ring-cyan-400/30 border-cyan-400/20" : "border-white/5 bg-white/[0.03]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <SeverityBadge level={alert.level} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{alert.detail}</p>
                {!acknowledged.has(alert.id) && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="mt-2 w-full rounded-lg bg-cyan-400/15 text-cyan-300 border border-cyan-400/20 py-1.5 text-xs hover:bg-cyan-400/25 transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Acknowledgment Timeline - tablet-first responsive */}
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Acknowledgment Timeline</CardTitle>
            <CardDescription>Event chain and recovery verification.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeline.map((item) => (
            <div key={item.id} className="flex gap-3">
              <span className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                item.type === "Alert" && "bg-rose-400",
                item.type === "Acknowledged" && "bg-cyan-400",
                item.type === "Assigned" && "bg-amber-400"
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

function SeverityBadge({ level }: { level: string }) {
  return (
    <span className={cn(
      "text-[10px] font-medium px-2 py-0.5 rounded-full",
      level === "HIGH" && "bg-rose-400/15 text-rose-300",
      level === "MEDIUM" && "bg-amber-400/15 text-amber-300",
      level === "LOW" && "bg-emerald-400/15 text-emerald-300"
    )}>
      {level}
    </span>
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
