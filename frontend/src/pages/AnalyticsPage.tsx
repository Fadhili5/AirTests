import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAeroStore } from "../store/use-aero-store";
import { summarizeSystem } from "../lib/aero-control";
import { useMemo } from "react";
import { cn } from "../lib/utils";

export default function AnalyticsPage() {
  const { ulds, alerts, tasks, analyticsHistory, now } = useAeroStore();
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
      const livePoint = {
        timestamp: new Date(now).toISOString(),
        averageExposureScore: Number((ulds.reduce((sum, item) => sum + item.exposureScore, 0) / Math.max(ulds.length, 1)).toFixed(1)),
        averageRiskScore: Number((ulds.reduce((sum, item) => sum + item.riskScore, 0) / Math.max(ulds.length, 1)).toFixed(2)),
        highRiskCount: ulds.filter((item) => item.risk === "HIGH").length,
        alertCount: alerts.length,
      };

      return [...analyticsHistory.slice(-11), livePoint].map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        exposureScore: point.averageExposureScore,
        riskScore: Math.round(point.averageRiskScore * 100),
        highRiskCount: point.highRiskCount,
        alertCount: point.alertCount,
      }));
    } catch (err) {
      console.error("[Analytics] Compliance data error:", err);
      return [];
    }
  }, [alerts.length, analyticsHistory, now, ulds]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="space-y-4 lg:col-span-2 lg:space-y-6">
        {/* KPIs - tablet-first responsive */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</span>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
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
          <CardContent>
            <div className="h-[260px] w-full md:h-[320px]">
              {complianceData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={complianceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="time"
                      tick={{ fill: "#475569", fontSize: 10 }}
                      stroke="#CBD5E1"
                    />
                    <YAxis 
                      tick={{ fill: "#475569", fontSize: 10 }}
                      stroke="#CBD5E1"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px" }}
                      itemStyle={{ color: "#0F172A" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line 
                      type="monotone" 
                      dataKey="exposureScore" 
                      stroke="#CA8A04" 
                      strokeWidth={2}
                      dot={{ fill: "#CA8A04" }}
                      activeDot={{ r: 5 }}
                      isAnimationActive
                      name="Exposure Score"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="riskScore" 
                      stroke="#2563EB" 
                      strokeWidth={2}
                      dot={{ fill: "#2563EB" }}
                      activeDot={{ r: 5 }}
                      isAnimationActive
                      name="Risk Score x100"
                    />
                    <Line
                      type="monotone"
                      dataKey="highRiskCount"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={{ fill: "#DC2626" }}
                      activeDot={{ r: 5 }}
                      isAnimationActive
                      name="High Risk ULDs"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {complianceData.length === 0 && (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                  Waiting for realtime analytics samples.
                </div>
              )}
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
            <div className="my-2 h-px bg-slate-200" />
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
            <div key={uld.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-slate-900">{uld.id}</strong>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  uld.risk === "HIGH" && "bg-rose-50 text-rose-700",
                  uld.risk === "MEDIUM" && "bg-amber-50 text-amber-700",
                  uld.risk === "LOW" && "bg-emerald-50 text-emerald-700"
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
      <span className="text-slate-600">{label}</span>
      <span className={cn(
        "font-medium",
        tone === "danger" && "text-rose-700",
        tone === "warn" && "text-amber-700",
        tone === "good" && "text-emerald-700",
        !tone && "text-slate-900"
      )}>
        {value}{unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}
