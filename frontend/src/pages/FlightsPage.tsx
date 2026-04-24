import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const flights = [
  {
    id: "EK202",
    route: "DXB -> LHR",
    aircraft: "B777F",
    status: "Delayed",
    delayMinutes: 37,
    thermalContext: "Extreme apron heat at DXB, cold arrival profile into LHR",
    transferRisk: "High transfer compression risk across hub handoffs",
    upliftWindow: "09:07 UTC estimated departure",
  },
  {
    id: "EK524",
    route: "DXB -> HYD",
    aircraft: "B777F",
    status: "Boarding",
    delayMinutes: 8,
    thermalContext: "Stable cool-chain corridor with moderate ramp load",
    transferRisk: "Medium due to late unit positioning",
    upliftWindow: "10:25 UTC estimated departure",
  },
];

export default function FlightsPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Flight Control</CardTitle>
            <CardDescription>Long-haul cargo rotations with Emirates-style thermal and delay context.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {flights.map((flight) => (
            <div key={flight.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">{flight.id}</p>
                  <h3 className="text-lg font-semibold text-slate-100">{flight.route}</h3>
                  <p className="text-sm text-slate-400">{flight.aircraft} • {flight.upliftWindow}</p>
                </div>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                  {flight.status} • {flight.delayMinutes}m
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Metric label="Thermal Context" value={flight.thermalContext} />
                <Metric label="Transfer Risk" value={flight.transferRisk} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Journey Model</CardTitle>
            <CardDescription>Closed-loop monitoring focus for the active DXB to LHR lane.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Stage 1: DXB ramp heat exposure and delay accumulation",
            "Stage 2: Controlled storage intervention before uplift",
            "Stage 3: In-flight verification against cumulative exposure budget",
            "Stage 4: LHR cold-arrival handoff with audit-ready twin sync",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#091421] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-300">{value}</p>
    </div>
  );
}
