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
    <div className="space-y-4">
      {/* KPIs */}
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        {/* Compliance Chart */}
        <Card className="min-h-[360px]">
          <CardHeader>
            <div>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>System-wide compliance scoring and exposure trend visualization.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="min-h-[280px]">
            <Line data={complianceData} options={chartOptions} />
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>Exposure trend and compliance insights by ULD.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {ulds.map((uld) => (
              <div key={uld.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <strong className="text-sm">{uld.id}</strong>
                  <span className="text-sm text-slate-300">{uld.exposureScore}/100</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendIndicator trend={uld.trend} />
                  <span className="text-xs text-slate-400">{uld.status}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      uld.exposureScore >= 80 ? "bg-rose-400" : uld.exposureScore >= 50 ? "bg-amber-400" : "bg-emerald-400"
                    )}
                    style={{ width: `${uld.exposureScore}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: string }) {
  return (
    <span className={cn(
      "text-[10px] px-1.5 py-0.5 rounded-full",
      trend === "Rising" && "bg-rose-400/15 text-rose-300",
      trend === "Stable" && "bg-amber-400/15 text-amber-300",
      trend === "Recovering" && "bg-emerald-400/15 text-emerald-300"
    )}>
      {trend}
    </span>
  );
}
