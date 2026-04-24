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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="space-y-4 lg:col-span-2 lg:space-y-6">
        {/* Filters - tablet-first responsive */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Alert Feed</CardTitle>
              <CardDescription>Real-time system alerts with severity filtering and acknowledgment.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => (
                <button
                  key={level}
                  onClick={() => setSeverityFilter(level as any)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                    severityFilter === level
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
                  "rounded-2xl border p-4 transition-all",
                  flashes[`alert:${alert.id}`]
                    ? "border-blue-200 bg-blue-50 ring-1 ring-blue-100"
                    : "border-slate-200 bg-slate-50 hover:bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                    <p className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <SeverityBadge level={alert.level} />
                </div>
                <p className="mt-1 text-xs text-slate-600">{alert.detail}</p>
                {(alert.targetTeams?.length || alert.workflow || alert.responseType) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alert.targetTeams?.map((team) => (
                      <span key={team} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        {team}
                      </span>
                    ))}
                    {alert.workflow && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        {alert.workflow}
                      </span>
                    )}
                    {alert.responseType && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        {alert.responseType}
                      </span>
                    )}
                  </div>
                )}
                {!acknowledged.has(alert.id) && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
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
                item.type === "Alert" && "bg-rose-600",
                item.type === "Acknowledged" && "bg-blue-600",
                item.type === "Assigned" && "bg-amber-600"
              )} />
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm text-slate-900">{item.type}</strong>
                  <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{item.detail}</p>
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
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        tone === "danger" && "bg-rose-600",
        tone === "warn" && "bg-amber-600",
        tone === "good" && "bg-emerald-600",
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
      level === "HIGH" && "bg-rose-50 text-rose-700",
      level === "MEDIUM" && "bg-amber-50 text-amber-700",
      level === "LOW" && "bg-emerald-50 text-emerald-700"
    )}>
      {level}
    </span>
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
