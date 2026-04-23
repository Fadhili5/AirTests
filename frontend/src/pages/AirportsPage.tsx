import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Tooltip } from "react-leaflet";

export default function AirportsPage() {
  const { ulds } = useAeroStore();

  const airportSummary = useMemo(() => {
    const byAirport = new Map<string, { risk: number; count: number; delays: number; lat: number; lon: number }>();

    ulds.forEach((uld) => {
      const current = byAirport.get(uld.airport) || { risk: 0, count: 0, delays: 0, lat: uld.lat, lon: uld.lon };
      current.risk += uld.riskScore;
      current.count += 1;
      current.delays += uld.phase === "Ground" ? 1 : 0;
      byAirport.set(uld.airport, current);
    });

    return [...byAirport.entries()].map(([airport, value]) => ({
      airport,
      avgRisk: value.risk / value.count,
      activeUlds: value.count,
      delayHotspots: value.delays,
      lat: value.lat,
      lon: value.lon,
    }));
  }, [ulds]);

  const center = airportSummary[0] ? [airportSummary[0].lat, airportSummary[0].lon] : [25.2532, 55.3657];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      {/* Map */}
      <Card className="flex flex-col min-h-[400px]">
        <CardHeader>
          <div>
            <CardTitle>Airport Risk Zones</CardTitle>
            <CardDescription>Delay probability mapping and operational bottleneck visualization.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-[300px]">
          <MapContainer
            center={center as [number, number]}
            zoom={3}
            scrollWheelZoom={false}
            className="h-full w-full rounded-lg"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {airportSummary.map((ap) => (
              <CircleMarker
                key={ap.airport}
                center={[ap.lat, ap.lon]}
                radius={12 + ap.activeUlds * 3}
                pathOptions={{
                  color: ap.avgRisk >= 0.75 ? "#ef5d5d" : ap.avgRisk >= 0.5 ? "#f5b84f" : "#39c575",
                  fillColor: ap.avgRisk >= 0.75 ? "#ef5d5d" : ap.avgRisk >= 0.5 ? "#f5b84f" : "#39c575",
                  fillOpacity: 0.6,
                }}
              >
                <Popup>
                  <strong>{ap.airport}</strong><br />
                  Avg Risk: {ap.avgRisk.toFixed(2)}<br />
                  Active ULDs: {ap.activeUlds}<br />
                  Delays: {ap.delayHotspots}
                </Popup>
              </CircleMarker>
            ))}
            {/* Risk zone circles */}
            {airportSummary.map((ap) => (
              <Circle
                key={`zone-${ap.airport}`}
                center={[ap.lat, ap.lon]}
                radius={150000}
                pathOptions={{
                  color: ap.avgRisk >= 0.75 ? "#ef5d5d" : ap.avgRisk >= 0.5 ? "#f5b84f" : "#39c575",
                  fillColor: ap.avgRisk >= 0.75 ? "#ef5d5d" : ap.avgRisk >= 0.5 ? "#f5b84f" : "#39c575",
                  fillOpacity: 0.08,
                  weight: 1,
                }}
              >
                <Tooltip sticky>{ap.airport} Risk Zone</Tooltip>
              </Circle>
            ))}
          </MapContainer>
        </CardContent>
      </Card>

      {/* Airport Intelligence */}
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Airport Delay Intelligence</CardTitle>
            <CardDescription>Delay hotspots and operational bottleneck indicators.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {airportSummary.map((ap) => (
            <div key={ap.airport} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm">{ap.airport}</strong>
                <RiskScore score={ap.avgRisk} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                <span>Active ULDs</span>
                <span className="text-slate-200">{ap.activeUlds}</span>
                <span>Delay Hotspots</span>
                <span className={ap.delayHotspots > 0 ? "text-amber-400" : "text-emerald-400"}>
                  {ap.delayHotspots}
                </span>
                <span>Avg Risk Score</span>
                <span className={ap.avgRisk >= 0.75 ? "text-rose-400" : ap.avgRisk >= 0.5 ? "text-amber-400" : "text-emerald-400"}>
                  {ap.avgRisk.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RiskScore({ score }: { score: number }) {
  return (
    <span className={cn(
      "text-[10px] font-medium px-2 py-0.5 rounded-full",
      score >= 0.75 && "bg-rose-400/15 text-rose-300",
      score >= 0.5 && score < 0.75 && "bg-amber-400/15 text-amber-300",
      score < 0.5 && "bg-emerald-400/15 text-emerald-300"
    )}>
      {score.toFixed(2)}
    </span>
  );
}
