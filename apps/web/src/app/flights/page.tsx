"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type Flight = {
  id: string;
  flightNumber: string;
  status: string;
  aircraftCode: string | null;
  originCode?: string;
  destinationCode?: string;
  origin: { code: string; latitude: number | null; longitude: number | null };
  destination: { code: string; latitude: number | null; longitude: number | null };
  livePosition: { latitude: number | null; longitude: number | null };
  altitudeFt: number;
  speedKph: number;
  heading: number;
  etaMinutes: number;
  delayMinutes: number;
  cargoLoad: number;
  source: string;
};

type WeatherRow = {
  code: string;
  apronTemperatureC: number;
  humidity: number;
  windKph: number;
  risk: string;
  stormWarning: boolean;
};

const point = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * 760 + 20,
  y: ((90 - lat) / 180) * 300 + 20
});

const riskClass = (value?: string) =>
  value === "critical" || value === "CRITICAL"
    ? "status-pill status-critical"
    : value === "warning" || value === "HIGH" || value === "ELEVATED"
      ? "status-pill status-warn"
      : "status-pill status-ok";

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [weather, setWeather] = useState<Record<string, WeatherRow>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      const [flightResponse, weatherResponse] = await Promise.all([
        apiRequest<{ flights: Flight[] }>("/flights"),
        apiRequest<{ weather: WeatherRow[] }>("/weather")
      ]);

      setFlights(flightResponse.flights);
      setWeather(Object.fromEntries(weatherResponse.weather.map((entry) => [entry.code, entry])));
    };

    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredFlights = useMemo(
    () =>
      flights.filter((flight) =>
        [flight.flightNumber, flight.origin.code, flight.destination.code, flight.aircraftCode ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [flights, query]
  );

  return (
    <div className="space-y-3">
      <section className="toolbar panel">
        <span className="ribbon ribbon-blue">Flight Operations</span>
        <input className="field min-w-[220px]" placeholder="Search flight, route, aircraft" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="field">
          <option>All statuses</option>
          <option>Airborne</option>
          <option>Boarding</option>
          <option>Delayed</option>
        </select>
        <button className="button-secondary">Cargo Only</button>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[12px] font-semibold text-slate-900">Flight Tracking Map</h3>
            <span className="text-[11px] text-slate-500">Aircraft, route, airport weather</span>
          </div>
          <div className="panel-body">
            <div className="ops-map overflow-x-auto p-2">
              <svg viewBox="0 0 800 340" className="min-w-[760px]">
                <rect x="0" y="0" width="800" height="340" fill="#eef4fa" />
                <path d="M48 98c42-22 102-32 155-20 40 8 73 27 108 23 34-4 67-26 110-36 45-10 98-1 144 18 50 20 79 33 121 35 43 2 80-21 119-18 33 2 68 23 79 49 13 30 2 69-28 92-36 27-88 31-121 49-36 20-58 57-104 67-48 10-94-9-141-13-53-5-107 9-159 0-56-11-108-54-129-101-19-42-11-92 18-118 24-21 57-31 98-27z" fill="#dde9f5" />
                {filteredFlights.map((flight) => {
                  if (
                    flight.origin.latitude == null ||
                    flight.origin.longitude == null ||
                    flight.destination.latitude == null ||
                    flight.destination.longitude == null ||
                    flight.livePosition.latitude == null ||
                    flight.livePosition.longitude == null
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
                      <text x={craft.x + 8} y={craft.y + 4} fontSize="10" fill="#102a43">{flight.flightNumber}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[12px] font-semibold text-slate-900">Airport Weather Overlay</h3>
            <span className="text-[11px] text-slate-500">Route conditions</span>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Airport</th>
                  <th>Apron</th>
                  <th>Wind</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(weather).map((entry) => (
                  <tr key={entry.code}>
                    <td>{entry.code}</td>
                    <td>{entry.apronTemperatureC}C</td>
                    <td>{entry.windKph} kph</td>
                    <td><span className={riskClass(entry.risk)}>{entry.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[12px] font-semibold text-slate-900">Flights Table</h3>
          <span className="text-[11px] text-slate-500">{filteredFlights.length} rows</span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Flight</th>
                <th>Route</th>
                <th>ETA</th>
                <th>Delay</th>
                <th>Aircraft</th>
                <th>ULD Count</th>
                <th>Altitude</th>
                <th>Speed</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlights.map((flight) => {
                const originWeather = weather[flight.origin.code];
                const destinationWeather = weather[flight.destination.code];
                const routeRisk = originWeather?.risk === "critical" || destinationWeather?.risk === "critical"
                  ? "critical"
                  : originWeather?.risk === "warning" || destinationWeather?.risk === "warning"
                    ? "warning"
                    : "healthy";

                return (
                  <tr key={flight.id}>
                    <td>{flight.flightNumber}</td>
                    <td>{flight.origin.code} → {flight.destination.code}</td>
                    <td>{Math.floor(flight.etaMinutes / 60)}h {flight.etaMinutes % 60}m</td>
                    <td>{flight.delayMinutes}m</td>
                    <td>{flight.aircraftCode ?? "n/a"}</td>
                    <td>{flight.cargoLoad}</td>
                    <td>{flight.altitudeFt.toLocaleString()} ft</td>
                    <td>{flight.speedKph} km/h</td>
                    <td><span className={riskClass(routeRisk)}>{routeRisk}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
