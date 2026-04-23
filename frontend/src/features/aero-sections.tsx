import { Line } from "react-chartjs-2";
import { Link } from "react-router-dom";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip as MapTooltip } from "react-leaflet";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { cn, formatClock, formatMinutes } from "../lib/utils";
import { buildExposureChart, makeAirportSummary, markerColor, riskTone } from "../lib/aero-control";
import type { AlertItem, InterventionTask, QueueItem, TimelineEvent, UldExposure } from "../types";

export function OverviewStats({ items }: { items: { label: string; value: string; tone: "default" | "good" | "warn" | "danger" }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="grid gap-1 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</span>
              <Badge tone={item.tone}>{item.tone}</Badge>
            </div>
            <strong className="text-2xl font-semibold">{item.value}</strong>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function UldListPanel({
  ulds,
  selectedUldId,
  onSelect,
  flashes,
  title = "Active ULDs",
  description = "Realtime ULD watchlist with current phase and exposure state.",
}: {
  ulds: UldExposure[];
  selectedUldId: string;
  onSelect: (id: string) => void;
  flashes: Record<string, boolean>;
  title?: string;
  description?: string;
}) {
  return (
    <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid min-h-0 gap-2 overflow-auto pt-2">
        {ulds.map((uld) => (
          <button
            key={uld.id}
            className={cn(
              "grid gap-2 rounded-2xl border p-3 text-left transition-colors",
              selectedUldId === uld.id ? "border-cyan-300/50 bg-cyan-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.05]",
              flashes[`uld:${uld.id}`] && "ring-1 ring-cyan-300/50",
            )}
            onClick={() => onSelect(uld.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold">{uld.id}</span>
              <Badge tone={riskTone(uld.risk)}>{uld.risk}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <span>{uld.airport}</span>
              <span>{uld.zone}</span>
              <span>{formatMinutes(uld.totalExposure)}</span>
              <span>{uld.phase}</span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function ExposureMap({
  ulds,
  selectedUld,
  compact = false,
}: {
  ulds: UldExposure[];
  selectedUld: UldExposure;
  compact?: boolean;
}) {
  return (
    <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <CardHeader>
        <div>
          <CardTitle>{compact ? "Risk Map Preview" : "Live ULD Map"}</CardTitle>
          <CardDescription>{compact ? "Overview preview of current high-risk exposure zones." : "Realtime movement and airport risk zones."}</CardDescription>
        </div>
        <Badge tone={riskTone(selectedUld.risk)}>{selectedUld.risk}</Badge>
      </CardHeader>
      <CardContent className={cn("min-h-[220px] p-2", compact && "min-h-[180px]")}>
        <MapContainer center={[selectedUld.lat, selectedUld.lon]} zoom={compact ? 3 : 4} scrollWheelZoom={false} className="h-full w-full rounded-xl">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AirportZones uld={selectedUld} />
          {ulds.map((uld) => (
            <CircleMarker key={uld.id} center={[uld.lat, uld.lon]} radius={8} pathOptions={{ color: markerColor(uld.risk), fillColor: markerColor(uld.risk), fillOpacity: 0.8 }}>
              <Popup>
                <strong>{uld.id}</strong>
                <br />
                {uld.airport} • {uld.zone}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </CardContent>
    </Card>
  );
}

export function AirportZones({ uld }: { uld: UldExposure }) {
  const zones = [
    { label: "Tarmac", center: [uld.lat + 0.12, uld.lon + 0.2] as [number, number], radius: 90000, color: "#ff6f6f" },
    { label: "Warehouse", center: [uld.lat - 0.18, uld.lon - 0.1] as [number, number], radius: 70000, color: "#ffb44a" },
    { label: "Aircraft Hold", center: [uld.lat + 0.02, uld.lon - 0.18] as [number, number], radius: 55000, color: "#41d78c" },
  ];

  return (
    <>
      {zones.map((zone) => (
        <Circle key={zone.label} center={zone.center} radius={zone.radius} pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.15, weight: 1 }}>
          <MapTooltip sticky>{zone.label === "Tarmac" ? "High Risk Exposure Area - Tarmac Zone" : `${zone.label} Exposure Area`}</MapTooltip>
        </Circle>
      ))}
    </>
  );
}

export function ExposureBreakdownCard({ uld, flashing }: { uld: UldExposure; flashing?: boolean }) {
  const items = [
    { label: "Tarmac", value: uld.tarmacExposure },
    { label: "Ground", value: uld.groundDelayExposure },
    { label: "Flight", value: uld.inflightExposure },
  ];

  return (
    <Card className={cn(flashing && "ring-1 ring-cyan-300/50")}>
      <CardHeader>
        <div>
          <CardTitle>Exposure Breakdown</CardTitle>
          <CardDescription>Tarmac vs ground vs flight accumulation for the selected ULD.</CardDescription>
        </div>
        <Badge tone={riskTone(uld.risk)}>{uld.exposureScore}/100</Badge>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="grid gap-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{item.label}</span>
              <span>{formatMinutes(item.value)}</span>
            </div>
            <Progress value={(item.value / Math.max(uld.totalExposure, 1)) * 100} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ExposureChartCard({ uld }: { uld: UldExposure }) {
  return (
    <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <CardHeader>
        <div>
          <CardTitle>Exposure Timeline</CardTitle>
          <CardDescription>Time-based temperature and exposure breakdown for {uld.id}.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="min-h-[260px] p-3 pt-2">
        <Line
          data={buildExposureChart(uld)}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: {
                labels: {
                  color: "#cbd5e1",
                  font: { size: 10 },
                },
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
          }}
        />
      </CardContent>
    </Card>
  );
}

export function AlertsFeed({
  alerts,
  compact = false,
}: {
  alerts: AlertItem[];
  compact?: boolean;
}) {
  return (
    <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <CardHeader>
        <div>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>Realtime system alerts and risk events.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid min-h-0 gap-2 overflow-auto pt-2">
        {alerts.slice(0, compact ? 4 : alerts.length).map((alert) => (
          <Card key={alert.id} className="border-white/5 bg-white/[0.03]">
            <CardContent className="grid gap-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm">{alert.uldId}</strong>
                <Badge tone={riskTone(alert.level)}>{alert.level}</Badge>
              </div>
              <p className="text-sm text-slate-300">{alert.title}</p>
              {!compact && <p className="text-xs text-slate-400">{alert.detail}</p>}
              <span className="text-[11px] text-slate-500">{formatClock(alert.timestamp)}</span>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

export function TaskBoard({
  tasks,
  onComplete,
  flashes,
  compact = false,
}: {
  tasks: InterventionTask[];
  onComplete?: (id: string) => void;
  flashes: Record<string, boolean>;
  compact?: boolean;
}) {
  return (
    <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <CardHeader>
        <div>
          <CardTitle>Interventions</CardTitle>
          <CardDescription>Assignments, execution tracking, and SLA windows.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid min-h-0 gap-2 overflow-auto pt-2">
        {tasks.map((task) => (
          <Card key={task.id} className={cn("border-white/5 bg-white/[0.03]", flashes[`task:${task.id}`] && "ring-1 ring-cyan-300/50")}>
            <CardContent className="grid gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong className="text-sm">{task.action}</strong>
                  <p className="text-xs text-slate-400">{task.uldId}</p>
                </div>
                <Badge tone={task.priority === "Critical" ? "danger" : task.priority === "High" ? "warn" : "default"}>{task.priority}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <span>{task.role}</span>
                <span>{formatClock(task.dueAt)}</span>
                <span>{formatMinutes(task.windowMinutes)}</span>
                <span>{task.status}</span>
              </div>
              {!compact && onComplete && (
                <Button onClick={() => onComplete(task.id)} disabled={task.status === "Completed"}>
                  {task.status === "Completed" ? "Completed" : "Complete"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

export function TimelinePanel({
  timeline,
  title = "Execution Timeline",
}: {
  timeline: TimelineEvent[];
  title?: string;
}) {
  return (
    <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Action history, acknowledgement flow, and recovery verification.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid min-h-0 gap-2 overflow-auto pt-2">
        {timeline.map((item) => (
          <div key={item.id} className="grid grid-cols-[10px_minmax(0,1fr)] gap-2 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", item.type === "Alert" ? "bg-rose-400" : item.type === "Verified" ? "bg-emerald-400" : "bg-cyan-300")} />
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm">{item.type}</strong>
                <span className="text-[11px] text-slate-500">{formatClock(item.timestamp)}</span>
              </div>
              <p className="text-xs text-slate-300">{item.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AirportIntelligence({ ulds }: { ulds: UldExposure[] }) {
  const summary = makeAirportSummary(ulds);

  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
      <ExposureMap ulds={ulds} selectedUld={ulds[0]} />
      <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
        <CardHeader>
          <div>
            <CardTitle>Airport Delay Intelligence</CardTitle>
            <CardDescription>Delay hotspots and operational bottleneck indicators by airport.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid min-h-0 gap-2 overflow-auto pt-2">
          {summary.map((item) => (
            <Card key={item.airport} className="border-white/5 bg-white/[0.03]">
              <CardContent className="grid gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong>{item.airport}</strong>
                  <Badge tone={Number(item.avgRisk) >= 0.75 ? "danger" : Number(item.avgRisk) >= 0.5 ? "warn" : "good"}>{item.avgRisk}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <span>Active ULDs</span>
                  <span>{item.activeUlds}</span>
                  <span>Delay Hotspots</span>
                  <span>{item.delayHotspots}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPanels({ groups }: { groups: { group: string; rows: string[] }[] }) {
  return (
    <div className="grid gap-2 xl:grid-cols-3">
      {groups.map((group) => (
        <Card key={group.group}>
          <CardHeader>
            <div>
              <CardTitle>{group.group}</CardTitle>
              <CardDescription>Editable enterprise control module.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            {group.rows.map((row) => (
              <div key={row} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                {row}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function QuickAccessGrid({ links }: { links: { title: string; path: string; description: string }[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {links.map((link) => (
        <Link key={link.path} to={link.path}>
          <Card className="h-full border-white/10 bg-white/[0.03] transition-colors hover:bg-white/[0.05]">
            <CardContent className="grid gap-2 p-4">
              <strong className="text-sm">{link.title}</strong>
              <p className="text-sm text-slate-400">{link.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function SyncDrawer({ queue, syncStatus, onClose }: { queue: QueueItem[]; syncStatus: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-white/10 bg-[#081321] p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Pending sync items</h2>
            <p className="text-sm text-slate-400">Status: {syncStatus}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-3 grid gap-2">
          {queue.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.03]">
              <CardContent className="p-3 text-sm text-slate-300">No pending offline items.</CardContent>
            </Card>
          ) : (
            queue.map((item) => (
              <Card key={item.id} className="border-white/5 bg-white/[0.03]">
                <CardContent className="grid gap-1 p-3">
                  <strong className="text-sm">{item.label}</strong>
                  <span className="text-xs text-slate-500">{formatClock(item.createdAt)}</span>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
