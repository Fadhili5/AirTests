import { Line } from "react-chartjs-2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageError } from "../components/ui/PageError";
import { useAeroStore } from "../store/use-aero-store";
import { summarizeSystem } from "../lib/aero-control";
import { useMemo } from "react";
import { cn } from "../lib/utils";

export default function AnalyticsPage() {
  const { ulds, alerts, tasks } = useAeroStore();
  const stats = useMemo(() => {
    try {
      return summarizeSystem(ulds, alerts, tasks);
    } catch (err) {
      console.error("[Analytics] Stats error:", err);
      return [];
    }
  }, [ulds, alerts, tasks]);

  const complianceData = useMemo(() => {
    try {
      return {
        labels: ulds.map((u) => u.id),
        datasets: [
          {
            label: "Exposure Score",
            data: ulds.map((u) => u.exposureScore),
            borderColor: "#ffb44a",
            backgroundColor: "rgba(255, 180, 74, 0.12)",
            fill: true,
            tension: 0.32,
          },
          {
            label: "Risk Score x100",
            data: ulds.map((u) => Math.round(u.riskScore * 100)),
            borderColor: "#3bd8d0",
            backgroundColor: "rgba(59, 216, 208, 0.12)",
            fill: true,
            tension: 0.32,
          },
        ],
      };
    } catch (err) {
      console.error("[Analytics] Compliance data error:", err);
      return { labels: [], datasets: [] };
    }
  }, [ulds]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: {
        labels: { color: "#cbd5e1", font: { size: 10 } },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", font: { size: 10 } },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
      y: {
        ticks: { color: "#94a3b8", font: { size: 10 } },
        grid: { color: "rgba(148,163,184,0.08)" },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_380px] gap-3 md:gap-4">
      <div className="space-y-3 md:space-y-4">
        {/* KPIs - tablet-first responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</span>
                <p className="text-2xl font-semibold mt-1">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compliance Trends - tablet-first responsive */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>System-wide exposure and compliance metrics over time.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="min-h-[240px] md:min-h-[260px]">
            <div className="h-full w-full">
              <Line data={complianceData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights - tablet-first responsive */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>System-wide aggregated exposure and compliance metrics.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow label="Fleet Avg Exposure" value={ulds.length > 0 ? (ulds.reduce((s, u) => s + u.exposureScore, 0) / ulds.length).toFixed(1) : "—"} unit="/ 100" />
            <MetricRow label="High Risk Share" value={ulds.length > 0 ? `${Math.round((ulds.filter((u) => u.risk === "HIGH").length / ulds.length) * 100)}%` : "—"} tone="danger" />
            <MetricRow label="Compliant ULDs" value={ulds.length > 0 ? `${Math.round((ulds.filter((u) => u.exposureScore < 50).length / ulds.length) * 100)}%` : "—"} tone="good" />
            <MetricRow label="Avg Risk Score" value={ulds.length > 0 ? (ulds.reduce((s, u) => s + u.riskScore, 0) / ulds.length).toFixed(2) : "—"} />
            <MetricRow label="Alerts (24h)" value={String(alerts.length)} tone={alerts.length > 0 ? "warn" : "good"} />
            <MetricRow label="Pending Actions" value={String(tasks.filter((t) => t.status !== "Completed").length)} tone={tasks.filter((t) => t.status !== "Completed").length > 0 ? "warn" : "good"} />
            <div className="h-px bg-white/5 my-2" />
            <MetricRow label="Ground Phase ULDs" value={String(ulds.filter((u) => u.phase === "Ground").length)} />
            <MetricRow label="Tarmac Phase ULDs" value={String(ulds.filter((u) => u.phase === "Tarmac").length)} />
            <MetricRow label="In-Flight ULDs" value={String(ulds.filter((u) => u.phase === "Flight").length)} />
          </CardContent>
        </Card>
      </div>

      {/* Fleet Distribution - tablet-first responsive */}
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Fleet Distribution</CardTitle>
            <CardDescription>Risk level and phase breakdown across the fleet.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {ulds.map((uld) => (
            <div key={uld.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm">{uld.id}</strong>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  uld.risk === "HIGH" && "bg-rose-400/15 text-rose-300",
                  uld.risk === "MEDIUM" && "bg-amber-400/15 text-amber-300",
                  uld.risk === "LOW" && "bg-emerald-400/15 text-emerald-300"
                )}>
                  {uld.risk}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{uld.airport} • {uld.phase}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={cn(
        "font-medium",
        tone === "danger" && "text-rose-400",
        tone === "warn" && "text-amber-400",
        tone === "good" && "text-emerald-400",
        !tone && "text-slate-200"
      )}>
        {value}{unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}
