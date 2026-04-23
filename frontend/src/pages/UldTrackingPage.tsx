import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageError } from "../components/ui/PageError";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Tooltip } from "react-leaflet";

export default function UldTrackingPage() {
  const { ulds, flashes } = useAeroStore();
  const [selectedUldId, setSelectedUldId] = useState(ulds[0]?.id || null);
  const [filterRisk, setFilterRisk] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");

  const filteredUlds = useMemo(() => {
    try {
      if (filterRisk === "ALL") return ulds;
      return ulds.filter((u) => u.risk === filterRisk);
    } catch (err) {
      console.error("[UldTracking] Filter error:", err);
      return [];
    }
  }, [ulds, filterRisk]);

  const selected = filteredUlds.find((u) => u.id === selectedUldId) || filteredUlds[0];

  const center = [selected.lat, selected.lon];

  const selectUld = (id: string) => {
    try {
      setSelectedUldId(id);
    } catch (err) {
      console.error("[UldTracking] Selection error:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_380px] gap-3 md:gap-4">
      {/* Map - tablet-first responsive */}
      <Card className="flex flex-col min-h-[350px] md:min-h-[400px]">
        <CardHeader>
          <div>
            <CardTitle>Live ULD Tracking</CardTitle>
            <CardDescription>Real-time fleet positions and risk zone visualization.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-[280px] md:min-h-[300px]">
          <div className="h-full w-full rounded-lg overflow-hidden">
            <MapContainer
              center={center as [number, number]}
              zoom={3}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {ulds.map((uld) => (
              <CircleMarker
                key={uld.id}
                center={[uld.lat, uld.lon]}
                radius={12 + (uld.riskScore * 20)}
                pathOptions={{
                  color: uld.risk === "HIGH" ? "#ef5d5d" : uld.risk === "MEDIUM" ? "#f5b84f" : "#39c575",
                  fillColor: uld.risk === "HIGH" ? "#ef5d5d" : uld.risk === "MEDIUM" ? "#f5b84f" : "#39c575",
                  fillOpacity: 0.6,
                }}
              >
                <Popup>
                  <strong>{uld.id}</strong><br />
                  Temp: {uld.currentTemp}°C<br />
                  Risk: {uld.risk}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* ULD List - tablet-first responsive */}
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Fleet Status</CardTitle>
            <CardDescription>ULD details and exposure metrics.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {ulds.map((uld) => (
            <div
              key={uld.id}
              className={cn(
                "rounded-lg border p-3 cursor-pointer transition-all",
                flashes[`uld:${uld.id}`] ? "ring-1 ring-cyan-400/30 border-cyan-400/20" : "border-white/5 bg-white/[0.03]",
                selectedUldId === uld.id ? "border-cyan-400/30 bg-cyan-400/5" : "hover:bg-white/[0.05]"
              )}
              onClick={() => selectUld(uld.id)}
            >
              <div className="flex items-center justify-between">
                <strong className="text-sm">{uld.id}</strong>
                <RiskBadge risk={uld.risk} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{uld.airport} • {uld.zone}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                <span>Temp: {uld.currentTemp}°C</span>
                <span>Exposure: {uld.totalExposure}min</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
