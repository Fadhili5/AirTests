"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardSnapshot } from "@lending/shared";
import { CLIENT_API_BASE, apiRequest } from "@/lib/api";

type WeatherRow = {
  code: string;
  name: string;
  apronTemperatureC: number;
  humidity: number;
  windKph: number;
  heatStressIndex: number;
  stormWarning: boolean;
  risk: string;
};

type FlightRow = {
  id: string;
  flightNumber: string;
  status: string;
  aircraftCode: string | null;
  originCode: string;
  destinationCode: string;
  etaMinutes: number;
  delayMinutes: number;
  cargoLoad: number;
  altitudeFt?: number;
  speedKph?: number;
  livePosition?: { latitude: number | null; longitude: number | null };
  origin?: { latitude: number | null; longitude: number | null; code: string };
  destination?: { latitude: number | null; longitude: number | null; code: string };
};

type InterventionRow = {
  id: string;
  action: string;
  assignedRole: string;
  priority: string;
  status: string;
  shipmentId: string | null;
};

const emptySnapshot: DashboardSnapshot = {
  updatedAt: new Date(0).toISOString(),
  kpis: {
    shipments: 0,
    pieces: 0,
    flights: 0,
    ulds: 0,
    alertsOpen: 0,
    interventionsOpen: 0,
    thermalBreaches: 0,
    custodyBreaks: 0
  },
  shipments: [],
  tape: [],
  alerts: [],
  ulds: []
};

const point = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * 720 + 20,
  y: ((90 - lat) / 180) * 300 + 20
});

const riskClass = (value?: string) =>
  value === "critical" || value === "CRITICAL"
    ? "status-pill status-critical"
    : value === "warning" || value === "HIGH" || value === "ELEVATED"
      ? "status-pill status-warn"
      : "status-pill status-ok";

export const DashboardClient = ({ initialSnapshot = emptySnapshot }: { initialSnapshot?: DashboardSnapshot }) => {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [weather, setWeather] = useState<WeatherRow[]>([]);
  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [connectionState, setConnectionState] = useState<"live" | "reconnecting">("reconnecting");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [freshSnapshot, freshWeather, freshFlights, freshInterventions] = await Promise.all([
          apiRequest<DashboardSnapshot>("/dashboard/summary"),
          apiRequest<{ weather: WeatherRow[] }>("/weather"),
          apiRequest<{ flights: FlightRow[] }>("/flights"),
          apiRequest<{ interventions: InterventionRow[] }>("/interventions")
        ]);
        setSnapshot(freshSnapshot);
        setWeather(freshWeather.weather);
        setFlights(freshFlights.flights);
        setInterventions(freshInterventions.interventions);
        setLoadError(null);
      } catch (error) {
        setConnectionState("reconnecting");
        setLoadError(error instanceof Error ? error.message : "Live API unavailable");
      }
    };

    void load();

    const source = new EventSource(`${CLIENT_API_BASE}/stream/events`);
    source.onopen = () => setConnectionState("live");
    source.onerror = () => setConnectionState("reconnecting");
    source.onmessage = async () => {
      await load();
    };

    const interval = setInterval(async () => {
      await load();
    }, 15000);

    return () => {
      source.close();
      clearInterval(interval);
    };
  }, []);

  const topWeather = useMemo(() => [...weather].sort((a, b) => b.apronTemperatureC - a.apronTemperatureC)[0], [weather]);
  const activeAlerts = snapshot.alerts.slice(0, 8);
  const flightList = flights.slice(0, 10);
  const telemetry = snapshot.ulds.slice(0, 8);
  const opsFeed = snapshot.tape.slice(0, 8);

  return (
    <div className="space-y-3">
      {loadError ? (
        <div className="panel border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          Live backend unavailable. Displaying last known operational state.
        </div>
      ) : null}

      <section className="toolbar panel">
        <span className="ribbon ribbon-blue">Control Tower</span>
        <input className="field min-w-[220px]" placeholder="Search flight, ULD, AWB" />
        <select className="field">
          <option>All airports</option>
          {weather.map((entry) => (
            <option key={entry.code}>{entry.code}</option>
          ))}
        </select>
        <select className="field">
          <option>All risk levels</option>
          <option>Critical</option>
          <option>Warning</option>
          <option>Healthy</option>
        </select>
        <button className="button-secondary">Columns</button>
        <button className="button-secondary">Export</button>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
          <span className={connectionState === "live" ? "status-pill status-live" : "status-pill status-warn"}>
            {connectionState === "live" ? "Live" : "Reconnect"}
          </span>
          <span>{new Date(snapshot.updatedAt).toLocaleTimeString()}</span>
        </div>
      </section>

      <section className="ops-metric-grid">
        <div className="ops-metric">
          <div className="ops-title">Active ULDs</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="ops-value">{snapshot.kpis.ulds}</div>
            <span className="status-pill status-ok">{snapshot.kpis.pieces} pieces</span>
          </div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Open Alerts</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="ops-value">{snapshot.kpis.alertsOpen}</div>
            <span className="status-pill status-critical">{snapshot.kpis.thermalBreaches} thermal</span>
          </div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Interventions</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="ops-value">{snapshot.kpis.interventionsOpen}</div>
            <span className="status-pill status-warn">{snapshot.kpis.custodyBreaks} custody</span>
          </div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Weather Pressure</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="ops-value">{topWeather?.code ?? "N/A"}</div>
            <span className={riskClass(topWeather?.risk)}>{topWeather?.apronTemperatureC ?? 0}C</span>
          </div>
        </div>
      </section>

      <section className="split-grid">
        <div className="space-y-3">
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h3 className="text-[12px] font-semibold text-slate-900">Active Alerts</h3>
              <span className="text-[11px] text-slate-500">{activeAlerts.length} open</span>
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Reason</th>
                    <th>Shipment</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td><span className={riskClass(alert.severity)}>{alert.severity}</span></td>
                      <td>{alert.title}</td>
                      <td>{alert.shipmentId ?? "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h3 className="text-[12px] font-semibold text-slate-900">Flight List</h3>
              <span className="text-[11px] text-slate-500">Cargo operations</span>
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Flight</th>
                    <th>Route</th>
                    <th>ETA</th>
                    <th>Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {flightList.map((flight) => (
                    <tr key={flight.id}>
                      <td>{flight.flightNumber}</td>
                      <td>{flight.originCode} → {flight.destinationCode}</td>
                      <td>{Math.floor(flight.etaMinutes / 60)}h {flight.etaMinutes % 60}m</td>
                      <td>{flight.delayMinutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[12px] font-semibold text-slate-900">Flight and Weather Map</h3>
            <div className="flex gap-2 text-[11px] text-slate-500">
              <span>Routes</span>
              <span>Weather</span>
              <span>Airports</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="ops-map overflow-x-auto p-2">
              <svg viewBox="0 0 760 340" className="min-w-[740px]">
                <rect x="0" y="0" width="760" height="340" fill="#eef4fa" />
                <path d="M40 105c48-27 115-31 176-17 39 8 76 19 112 14 26-4 60-24 107-35 47-11 97-2 144 16 49 18 78 37 116 38 42 1 79-18 112-17 34 2 67 21 80 48 16 31 3 73-34 94-34 18-79 18-111 37-31 18-50 49-92 63-46 16-96 4-144 0-56-5-115 11-170-2-50-13-98-53-116-97-19-43-7-99 28-124 24-17 53-25 92-18z" fill="#dde9f5" />
                {flightList.map((flight) => {
                  if (
                    flight.origin?.latitude == null ||
                    flight.origin?.longitude == null ||
                    flight.destination?.latitude == null ||
                    flight.destination?.longitude == null ||
                    flight.livePosition?.latitude == null ||
                    flight.livePosition?.longitude == null
                  ) {
                    return null;
                  }
                  const from = point(flight.origin.latitude, flight.origin.longitude);
                  const to = point(flight.destination.latitude, flight.destination.longitude);
                  const craft = point(flight.livePosition.latitude, flight.livePosition.longitude);
                  return (
                    <g key={flight.id}>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#7fb3d5" strokeWidth="1.5" strokeDasharray="5 4" />
                      <circle cx={from.x} cy={from.y} r="4" fill="#1f5f8b" />
                      <circle cx={to.x} cy={to.y} r="4" fill="#1f5f8b" />
                      <circle cx={craft.x} cy={craft.y} r="5" fill="#1f5f8b" />
                      <text x={craft.x + 7} y={craft.y + 4} fontSize="10" fill="#102a43">{flight.flightNumber}</text>
                    </g>
                  );
                })}
                {weather.map((entry) => {
                  const flight = flightList.find((candidate) => candidate.originCode === entry.code || candidate.destinationCode === entry.code);
                  const lat = flight?.originCode === entry.code ? flight.origin?.latitude : flight?.destination?.latitude;
                  const lon = flight?.originCode === entry.code ? flight.origin?.longitude : flight?.destination?.longitude;
                  if (lat == null || lon == null) return null;
                  const marker = point(lat, lon);
                  const fill = entry.risk === "critical" ? "#c53030" : entry.risk === "warning" ? "#b7791f" : "#2f855a";
                  return <circle key={entry.code} cx={marker.x} cy={marker.y} r="10" fill={fill} fillOpacity="0.12" />;
                })}
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h3 className="text-[12px] font-semibold text-slate-900">ULD Telemetry</h3>
              <span className="text-[11px] text-slate-500">Live state</span>
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>ULD</th>
                    <th>Flight</th>
                    <th>Risk</th>
                    <th>Exposure</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.map((uld) => (
                    <tr key={uld.id}>
                      <td>{uld.serialNumber}</td>
                      <td>{uld.flightNumber ?? "n/a"}</td>
                      <td><span className={riskClass(uld.riskLevel)}>{uld.riskLevel}</span></td>
                      <td>{45 - uld.exposureRemainingMinutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h3 className="text-[12px] font-semibold text-slate-900">Intervention Queue</h3>
              <span className="text-[11px] text-slate-500">{interventions.length} tasks</span>
            </div>
            <div className="max-h-[260px] overflow-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Team</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((item) => (
                    <tr key={item.id}>
                      <td>{item.action}</td>
                      <td>{item.assignedRole}</td>
                      <td><span className={riskClass(item.priority)}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[12px] font-semibold text-slate-900">Operations Feed</h3>
            <span className="text-[11px] text-slate-500">Latest events</span>
          </div>
          <div className="max-h-[260px] overflow-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Location</th>
                  <th>Shipment</th>
                </tr>
              </thead>
              <tbody>
                {opsFeed.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{entry.message}</td>
                    <td>{entry.location ?? "n/a"}</td>
                    <td>{entry.shipmentId ?? "n/a"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[12px] font-semibold text-slate-900">Airport Weather Board</h3>
            <span className="text-[11px] text-slate-500">Operational pressure</span>
          </div>
          <div className="max-h-[260px] overflow-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Airport</th>
                  <th>Apron</th>
                  <th>Humidity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {weather.map((entry) => (
                  <tr key={entry.code}>
                    <td>{entry.code}</td>
                    <td>{entry.apronTemperatureC}C</td>
                    <td>{entry.humidity}%</td>
                    <td><span className={riskClass(entry.risk)}>{entry.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
