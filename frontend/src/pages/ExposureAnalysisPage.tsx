import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";

export default function ExposureAnalysisPage() {
  const { ulds, flashes } = useAeroStore();
  const [selectedUldId, setSelectedUldId] = useState(ulds[0]?.id || null);

  const selected = ulds.find((u) => u.id === selectedUldId) || ulds[0];

  const chartData = useMemo(() => {
    try {
      if (!selected) return [];
      return [
        { phase: "Ground", exposure: selected.groundDelayExposure },
        { phase: "Tarmac", exposure: selected.tarmacExposure },
        { phase: "Flight", exposure: selected.inflightExposure },
        { phase: "Total", exposure: selected.totalExposure },
      ];
    } catch (err) {
      console.error("[ExposureAnalysis] Chart data error:", err);
      return [];
    }
  }, [selected]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      {/* Chart - tablet-first responsive */}
      <Card className="min-h-[320px] md:min-h-[360px] lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Exposure Analysis</CardTitle>
            <CardDescription>Temperature exposure breakdown by phase and time.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full md:h-[320px]">
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="phase" 
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
                    dataKey="exposure" 
                    stroke="#2563EB" 
                    strokeWidth={2}
                    dot={{ fill: "#2563EB" }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {chartData.length === 0 && (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                No exposure data available yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights - tablet-first responsive */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Exposure Insights</CardTitle>
            <CardDescription>Per-ULD exposure breakdown and trend analysis.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {ulds.map((uld) => (
            <div key={uld.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-slate-900">{uld.id}</strong>
                <span className="text-sm text-slate-700">{uld.exposureScore}/100</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  uld.trend === "Rising" && "bg-rose-50 text-rose-700",
                  uld.trend === "Stable" && "bg-amber-50 text-amber-700",
                  uld.trend === "Recovering" && "bg-emerald-50 text-emerald-700"
                )}>
                  {uld.trend}
                </span>
                <span className="text-xs text-slate-600">{uld.status}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full",
                    uld.exposureScore >= 80 ? "bg-rose-600" : uld.exposureScore >= 50 ? "bg-amber-600" : "bg-emerald-600"
                  )}
                  style={{ width: `${uld.exposureScore}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-700">{value} min</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
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
