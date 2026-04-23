import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Tooltip } from "react-leaflet";

export default function UldTrackingPage() {
  const { ulds, flashes } = useAeroStore();
  const [selectedUldId, setSelectedUldId] = useState(ulds[0]?.id || null);
  const [filterRisk, setFilterRisk] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");

  const filteredUlds = useMemo(() => {
    if (filterRisk === "ALL") return ulds;
    return ulds.filter((u) => u.risk === filterRisk);
  }, [ulds, filterRisk]);

  const selected = filteredUlds.find((u) => u.id === selectedUldId) || filteredUlds[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4 h-full">
      {/* ULD List Panel */}
      <Card className="flex flex-col min-h-[400px]">
        <CardHeader>
          <div>
            <CardTitle>Live ULD Monitoring</CardTitle>
            <CardDescription>Realtime watchlist for movement and state.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-2">
          {/* Filters */}
          <div className="flex gap-1 mb-2">
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((risk) => (
              <button
                key={risk}
                onClick={() => setFilterRisk(risk)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-full border transition-colors",
                  filterRisk === risk
                    ? "bg-cyan-400/15 border-cyan-400/30 text-cyan-200"
                    : "border-white/5 text-slate-500 hover:bg-white/5"
                )}
              >
                {risk}
              </button>
            ))}
          </div>

          {filteredUlds.map((uld) => (
            <button
              key={uld.id}
              onClick={() => setSelectedUldId(uld.id)}
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
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 mt-1">
                <span>{uld.airport}</span>
                <span>{uld.zone}</span>
                <span>{uld.totalExposure} min exp</span>
                <span>{uld.phase}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="flex flex-col min-h-[400px]">
        <CardHeader>
          <div>
            <CardTitle>Live ULD Map</CardTitle>
            <CardDescription>Realtime movement and airport risk zones.</CardDescription>
          </div>
          {selected && <RiskBadge risk={selected.risk} />}
        </CardHeader>
        <CardContent className="flex-1 min-h-[300px]">
          {selected && (
            <MapContainer
              center={[selected.lat, selected.lon]}
              zoom={4}
              scrollWheelZoom={false}
              className="h-full w-full rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Risk Zones */}
              <Circle
                center={[selected.lat + 0.12, selected.lon + 0.2]}
                radius={90000}
                pathOptions={{ color: "#ff6f6f", fillColor: "#ff6f6f", fillOpacity: 0.12, weight: 1 }}
              >
                <Tooltip sticky>Tarmac High Risk Zone</Tooltip>
              </Circle>
              <Circle
                center={[selected.lat - 0.18, selected.lon - 0.1]}
                radius={70000}
                pathOptions={{ color: "#ffb44a", fillColor: "#ffb44a", fillOpacity: 0.12, weight: 1 }}
              >
                <Tooltip sticky>Warehouse Medium Risk Zone</Tooltip>
              </Circle>
              <Circle
                center={[selected.lat + 0.02, selected.lon - 0.18]}
                radius={55000}
                pathOptions={{ color: "#41d78c", fillColor: "#41d78c", fillOpacity: 0.12, weight: 1 }}
              >
                <Tooltip sticky>Aircraft Hold Low Risk Zone</Tooltip>
              </Circle>

              {/* ULD Markers */}
              {filteredUlds.map((uld) => (
                <CircleMarker
                  key={uld.id}
                  center={[uld.lat, uld.lon]}
                  radius={8}
                  pathOptions={{
                    color: uld.risk === "HIGH" ? "#ef5d5d" : uld.risk === "MEDIUM" ? "#f5b84f" : "#39c575",
                    fillColor: uld.risk === "HIGH" ? "#ef5d5d" : uld.risk === "MEDIUM" ? "#f5b84f" : "#39c575",
                    fillOpacity: 0.8,
                  }}
                  eventHandlers={{ click: () => setSelectedUldId(uld.id) }}
                >
                  <Popup>
                    <strong>{uld.id}</strong><br />
                    {uld.airport} • {uld.zone}<br />
                    Risk: {uld.risk}<br />
                    Temp: {uld.currentTemp.toFixed(1)}°C
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
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
