import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageError } from "../components/ui/PageError";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Tooltip } from "react-leaflet";

export default function AirportsPage() {
  const { ulds } = useAeroStore();

  const airportSummary = useMemo(() => {
    try {
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
    } catch (err) {
      console.error("[Airports] Summary computation error:", err);
      return [];
    }
  }, [ulds]);

  const airports = airportSummary.map((ap) => ({
    code: ap.airport,
    avgRiskScore: ap.avgRisk,
    uldCount: ap.activeUlds,
    delayHotspot: ap.delayHotspots > 0,
    lat: ap.lat,
    lon: ap.lon,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_380px] gap-3 md:gap-4">
      {/* Map - tablet-first responsive */}
      <Card className="min-h-[350px] md:min-h-[400px]">
        <CardHeader>
          <div>
            <CardTitle>Airport Risk Zones</CardTitle>
            <CardDescription>Geographic risk visualization and delay hotspots.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="min-h-[280px] md:min-h-[320px]">
          <div className="h-full w-full rounded-lg overflow-hidden">
            <MapContainer
              center={[25, 10]}
              zoom={2}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {airports.map((airport) => (
              <CircleMarker
                key={airport.code}
                center={[airport.lat, airport.lon]}
                radius={14 + (airport.avgRiskScore * 18)}
                pathOptions={{
                  color: airport.avgRiskScore > 0.7 ? "#ef5d5d" : airport.avgRiskScore > 0.4 ? "#f5b84f" : "#39c575",
                  fillColor: airport.avgRiskScore > 0.7 ? "#ef5d5d" : airport.avgRiskScore > 0.4 ? "#f5b84f" : "#39c575",
                  fillOpacity: 0.6,
                }}
              >
                <Popup>
                  <strong>{airport.code}</strong><br />
                  Avg Risk: {(airport.avgRiskScore * 100).toFixed(0)}%<br />
                  ULDs: {airport.uldCount}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Airport List - tablet-first responsive */}
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Airport Summary</CardTitle>
            <CardDescription>Per-airport risk metrics and delay intelligence.</CardDescription>
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
