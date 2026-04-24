import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { cn } from "../lib/utils";
import { useAeroStore } from "../store/use-aero-store";

const flights = [
  {
    id: "EK202",
    route: "DXB -> LHR",
    aircraft: "B777F",
    status: "Airborne",
    delayMinutes: 37,
    thermalContext: "Extreme apron heat at DXB, cold arrival profile into LHR",
    transferRisk: "High transfer compression risk across hub handoffs",
    durationMinutes: 84,
    offsetMinutes: 14,
    from: { code: "DXB", x: 14, y: 72 },
    to: { code: "LHR", x: 84, y: 28 },
  },
  {
    id: "EK524",
    route: "DXB -> HYD",
    aircraft: "B777F",
    status: "Climb",
    delayMinutes: 8,
    thermalContext: "Stable cool-chain corridor with moderate ramp load",
    transferRisk: "Medium due to late unit positioning",
    durationMinutes: 58,
    offsetMinutes: 33,
    from: { code: "DXB", x: 14, y: 72 },
    to: { code: "HYD", x: 68, y: 48 },
  },
];

export default function FlightsPage() {
  const { now } = useAeroStore();

  const liveFlights = useMemo(() => {
    return flights.map((flight, index) => {
      const cycleMs = flight.durationMinutes * 60_000;
      const offsetMs = flight.offsetMinutes * 60_000;
      const elapsed = ((now + offsetMs) % cycleMs + cycleMs) % cycleMs;
      const progress = elapsed / cycleMs;
      const delayDrift = Math.round(flight.delayMinutes + Math.sin((now / 60_000) * (index + 1)) * 3);
      const etaMinutes = Math.max(4, Math.round((1 - progress) * flight.durationMinutes));
      const position = getBezierPoint(flight.from, flight.to, progress, 18 + index * 6);

      return {
        ...flight,
        progress,
        delayDrift,
        etaMinutes,
        position,
        upliftWindow: new Date(now + etaMinutes * 60_000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
  }, [now]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Flight Control</CardTitle>
            <CardDescription>Live flight lanes, ETA drift, and thermal corridor monitoring.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(241,245,249,0.7))] p-4 shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.12),transparent_24%),radial-gradient(circle_at_78%_28%,rgba(22,163,74,0.1),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0))]" />
            <svg viewBox="0 0 100 100" className="relative h-[320px] w-full">
              <defs>
                <linearGradient id="routeBlue" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="routeGreen" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#86EFAC" />
                  <stop offset="100%" stopColor="#16A34A" />
                </linearGradient>
              </defs>

              <g opacity="0.9">
                {liveFlights.map((flight, index) => (
                  <path
                    key={`${flight.id}-path`}
                    d={buildBezierPath(flight.from, flight.to, 18 + index * 6)}
                    fill="none"
                    stroke={index === 0 ? "url(#routeBlue)" : "url(#routeGreen)"}
                    strokeWidth="1.6"
                    strokeDasharray="2.5 3.5"
                  />
                ))}
              </g>

              {liveFlights.flatMap((flight) => [
                <AirportNode key={`${flight.id}-from`} point={flight.from} label={flight.from.code} align="left" />,
                <AirportNode key={`${flight.id}-to`} point={flight.to} label={flight.to.code} align="right" />,
              ])}

              {liveFlights.map((flight) => (
                <g key={flight.id} transform={`translate(${flight.position.x} ${flight.position.y})`}>
                  <circle r="4.6" fill="rgba(37,99,235,0.12)" />
                  <circle r="3.4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="0.8" />
                  <path
                    d="M -2.5 0.2 L 0.9 -0.8 L 2.8 -4.8 L 3.8 -4.4 L 2.9 -0.6 L 5.1 0 L 5.1 0.9 L 2.9 1.5 L 3.8 5.1 L 2.8 5.5 L 0.9 1.5 L -2.5 0.7 Z"
                    fill="#2563EB"
                  />
                </g>
              ))}
            </svg>
            <div className="relative mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {liveFlights.map((flight) => (
                <Flight3DPanel key={`${flight.id}-summary`}>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-blue-600">{flight.id}</p>
                        <h3 className="text-base font-semibold text-slate-900">{flight.route}</h3>
                      </div>
                      <span className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        flight.delayDrift >= 25 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {flight.status} • {flight.delayDrift}m
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>{flight.aircraft}</span>
                        <span>ETA {flight.upliftWindow}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-1000"
                          style={{ width: `${Math.max(8, flight.progress * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{Math.round(flight.progress * 100)}% corridor complete</span>
                        <span>{flight.etaMinutes} min remaining</span>
                      </div>
                    </div>
                  </div>
                </Flight3DPanel>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <div>
            <CardTitle>Journey Model</CardTitle>
            <CardDescription>Realtime handling chain for the active lanes.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {liveFlights.map((flight) => (
            <Flight3DPanel key={`${flight.id}-timeline`}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-blue-600">{flight.id}</p>
                    <p className="text-sm font-medium text-slate-900">{flight.route}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                    Live Lane
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  <Metric label="Thermal Context" value={flight.thermalContext} />
                  <Metric label="Transfer Risk" value={flight.transferRisk} />
                  <Metric label="Current Phase" value={`${flight.status} • ${flight.etaMinutes} min to handoff`} />
                </div>
              </div>
            </Flight3DPanel>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function AirportNode({
  point,
  label,
  align,
}: {
  point: { x: number; y: number; code: string };
  label: string;
  align: "left" | "right";
}) {
  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <circle r="2.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.7" />
      <circle r="5.2" fill="none" stroke="rgba(37,99,235,0.18)" strokeWidth="0.9" />
      <text
        x={align === "left" ? -1 : 1}
        y="-5.8"
        textAnchor={align === "left" ? "start" : "end"}
        fontSize="3.1"
        fontWeight="700"
        fill="#0F172A"
      >
        {label}
      </text>
    </g>
  );
}

function Flight3DPanel({ children }: { children: React.ReactNode }) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  return (
    <div
      className="transform-gpu [perspective:1200px]"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        setTilt({
          rotateX: (0.5 - y) * 12,
          rotateY: (x - 0.5) * 14,
        });
      }}
      onMouseLeave={() => setTilt({ rotateX: 0, rotateY: 0 })}
    >
      <div
        className="transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function buildBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  lift: number,
) {
  const controlX = (from.x + to.x) / 2;
  const controlY = Math.min(from.y, to.y) - lift;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

function getBezierPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
  lift: number,
) {
  const controlX = (from.x + to.x) / 2;
  const controlY = Math.min(from.y, to.y) - lift;
  const t = Math.min(1, Math.max(0, progress));
  const oneMinusT = 1 - t;

  return {
    x: oneMinusT * oneMinusT * from.x + 2 * oneMinusT * t * controlX + t * t * to.x,
    y: oneMinusT * oneMinusT * from.y + 2 * oneMinusT * t * controlY + t * t * to.y,
  };
}
