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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_380px] gap-3 md:gap-4">
      {/* Chart - tablet-first responsive */}
      <Card className="min-h-[320px] md:min-h-[360px]">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis 
                    dataKey="phase" 
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    stroke="rgba(148,163,184,0.08)"
                  />
                  <YAxis 
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    stroke="rgba(148,163,184,0.08)"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(15, 29, 49, 0.9)", border: "1px solid rgba(148,163,184,0.2)" }}
                    itemStyle={{ color: "#cbd5e1" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line 
                    type="monotone" 
                    dataKey="exposure" 
                    stroke="#3bd8d0" 
                    strokeWidth={2}
                    dot={{ fill: "#3bd8d0" }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {chartData.length === 0 && (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-slate-400">
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
            <div key={uld.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm">{uld.id}</strong>
                <span className="text-sm text-slate-300">{uld.exposureScore}/100</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  uld.trend === "Rising" && "bg-rose-400/15 text-rose-300",
                  uld.trend === "Stable" && "bg-amber-400/15 text-amber-300",
                  uld.trend === "Recovering" && "bg-emerald-400/15 text-emerald-300"
                )}>
                  {uld.trend}
                </span>
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
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{value} min</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-slate-200 mt-1">{value}</p>
    </div>
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
