import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { MapStatusBanner } from "../components/ui/MapStatusBanner";

export default function UldTrackingPage() {
  const { ulds, flashes } = useAeroStore();
  const [selectedUldId, setSelectedUldId] = useState(ulds[0]?.id || null);
  const [filterRisk, setFilterRisk] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [tileError, setTileError] = useState(false);

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      {/* Map - tablet-first responsive */}
      <Card className="flex min-h-[350px] flex-col md:min-h-[400px] lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Live ULD Tracking</CardTitle>
            <CardDescription>Real-time fleet positions and risk zone visualization.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-[280px] md:min-h-[300px]">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200">
            <MapStatusBanner tileError={tileError} />
            <MapContainer
              center={center as [number, number]}
              zoom={3}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: () => setTileError(true),
                tileload: () => setTileError(false),
              }}
            />
            {ulds.map((uld) => (
              <CircleMarker
                key={uld.id}
                center={[uld.lat, uld.lon]}
                radius={12 + (uld.riskScore * 20)}
                pathOptions={{
                  color: uld.risk === "HIGH" ? "#DC2626" : uld.risk === "MEDIUM" ? "#CA8A04" : "#16A34A",
                  fillColor: uld.risk === "HIGH" ? "#DC2626" : uld.risk === "MEDIUM" ? "#CA8A04" : "#16A34A",
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
                "cursor-pointer rounded-2xl border p-4 transition-all",
                flashes[`uld:${uld.id}`] ? "border-blue-200 bg-blue-50 ring-1 ring-blue-100" : "border-slate-200 bg-slate-50",
                selectedUldId === uld.id ? "border-blue-300 bg-blue-50" : "hover:bg-white"
              )}
              onClick={() => selectUld(uld.id)}
            >
              <div className="flex items-center justify-between">
                <strong className="text-sm text-slate-900">{uld.id}</strong>
                <RiskBadge risk={uld.risk} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{uld.airport} • {uld.zone}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>Temp: {uld.currentTemp}°C</span>
                <span>Exposure: {uld.totalExposure}min</span>
                <span>Type: {uld.unitType ?? "Passive"}</span>
                <span>Geo-fence: {uld.geofenceStage ?? "Ramp Buffer"}</span>
                <span className="col-span-2">Teams: {(uld.collaborationTeams ?? ["Ground Handler"]).join(", ")}</span>
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
      risk === "HIGH" && "bg-rose-50 text-rose-700",
      risk === "MEDIUM" && "bg-amber-50 text-amber-700",
      risk === "LOW" && "bg-emerald-50 text-emerald-700"
    )}>
      {risk}
    </span>
  );
}
