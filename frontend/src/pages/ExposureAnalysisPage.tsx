import { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageError } from "../components/ui/PageError";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";

export default function ExposureAnalysisPage() {
  const { ulds, flashes } = useAeroStore();
  const [selectedUldId, setSelectedUldId] = useState(ulds[0]?.id || null);

  const selected = ulds.find((u) => u.id === selectedUldId) || ulds[0];

  const chartData = useMemo(() => {
    try {
      if (!selected) return null;
      return {
        labels: ["Ground", "Tarmac", "Flight", "Total"],
        datasets: [
          {
            label: "Exposure Minutes",
            data: [selected.groundDelayExposure, selected.tarmacExposure, selected.inflightExposure, selected.totalExposure],
            borderColor: "#3bd8d0",
            backgroundColor: "rgba(59, 216, 208, 0.12)",
            fill: true,
            tension: 0.36,
          },
        ],
      };
    } catch (err) {
      console.error("[ExposureAnalysis] Chart data error:", err);
      return null;
    }
  }, [selected]);

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
    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">
      {/* ULD Selector */}
      <Card className="flex flex-col">
        <CardHeader>
          <div>
            <CardTitle>Exposure Subjects</CardTitle>
            <CardDescription>Choose a ULD for phase-by-phase analysis.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-2">
          {ulds.map((uld) => (
            <button
              key={uld.id}
              onClick={() => {
                try {
                  setSelectedUldId(uld.id);
                } catch (err) {
                  console.error("[ExposureAnalysis] Selection error:", err);
                }
              }}
              className={cn(
                "w-full text-left rounded-lg border p-3 transition-all",
                selectedUldId === uld.id
                  ? "border-cyan-400/30 bg-cyan-400/10"
                  : "border-white/5 bg-white/[0.03] hover:bg-white/[0.05]",
                flashes[`uld:${uld.id}`] && "ring-1 ring-cyan-400/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{uld.id}</span>
                <RiskBadge risk={uld.risk} />
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Score: {uld.exposureScore}/100 • {uld.totalExposure} min
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Analysis Content */}
      <div className="space-y-4">
        {/* Exposure Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Exposure Breakdown</CardTitle>
                <CardDescription>Tarmac vs ground vs flight accumulation.</CardDescription>
              </div>
              <span className="text-sm font-medium text-slate-300">{selected?.exposureScore}/100</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected && (
                <>
                  <ProgressBar label="Tarmac" value={selected.tarmacExposure} max={selected.totalExposure} color="#ef5d5d" />
                  <ProgressBar label="Ground Delay" value={selected.groundDelayExposure} max={selected.totalExposure} color="#f5b84f" />
                  <ProgressBar label="Flight" value={selected.inflightExposure} max={selected.totalExposure} color="#39c575" />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Exposure Insight</CardTitle>
                <CardDescription>Temperature, prediction, and cause context.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {selected && (
                <>
                  <InfoRow label="Current Temperature" value={`${selected.currentTemp.toFixed(1)}°C`} />
                  <InfoRow label="Prediction" value={`Threshold breach in ${selected.predictionMinutes} min`} />
                  <InfoRow label="Cause" value={selected.cause} />
                  <InfoRow label="Delay Source" value={selected.delaySource} />
                  <InfoRow label="Failure Point" value={selected.failurePoint} />
                  <InfoRow label="Recommended Fix" value={selected.recommendedFix} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="min-h-[300px]">
          <CardHeader>
            <div>
              <CardTitle>Exposure Timeline</CardTitle>
              <CardDescription>Time-based temperature and exposure breakdown.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="min-h-[260px]">
            {chartData && (
              <Line data={chartData} options={chartOptions} />
            )}
          </CardContent>
        </Card>
      </div>
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
