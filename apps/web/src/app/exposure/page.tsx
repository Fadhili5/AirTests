"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type Shipment = {
  id: string;
  awb: string | null;
  currentLocation?: string | null;
  pieces: Array<{
    id: string;
    thermalScore: number;
    chainOfCustodyScore: number;
    integrityScore: number;
    specialHandlingCodes: string[];
  }>;
};

type WeatherRow = {
  code: string;
  apronTemperatureC: number;
  humidity: number;
  windKph: number;
  heatStressIndex: number;
  risk: string;
  stormWarning: boolean;
};

const findAirportCode = (location?: string | null) => {
  if (!location) return null;
  const match = location.match(/[A-Z]{3}/);
  return match ? match[0] : null;
};

const scoreTone = (value: number) =>
  value > 0.75 ? "status-critical" : value > 0.5 ? "status-warn" : "status-ok";

export default function ExposurePage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [weather, setWeather] = useState<Record<string, WeatherRow>>({});

  useEffect(() => {
    const load = async () => {
      const [shipmentResponse, weatherResponse] = await Promise.all([
        apiRequest<{ shipments: Shipment[] }>("/shipments"),
        apiRequest<{ weather: WeatherRow[] }>("/weather")
      ]);

      setShipments(shipmentResponse.shipments);
      setWeather(Object.fromEntries(weatherResponse.weather.map((entry) => [entry.code, entry])));
    };

    void load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const exposureRows = useMemo(
    () =>
      shipments.flatMap((shipment) => {
        const airportCode = findAirportCode(shipment.currentLocation);
        const airportWeather = airportCode ? weather[airportCode] : undefined;

        return shipment.pieces.map((piece) => ({
          shipmentId: shipment.id,
          awb: shipment.awb ?? shipment.id,
          airportCode,
          airportWeather,
          ...piece
        }));
      }),
    [shipments, weather]
  );

  const hottestStation = useMemo(
    () =>
      Object.values(weather).sort((a, b) => (b.apronTemperatureC ?? 0) - (a.apronTemperatureC ?? 0))[0] ?? null,
    [weather]
  );

  return (
    <div className="space-y-4">
      <section className="toolbar panel">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input className="field max-w-sm" placeholder="Search AWB, piece, or station" />
          <select className="field w-40">
            <option>All handling codes</option>
            <option>Pharma</option>
            <option>Lithium</option>
            <option>Priority</option>
          </select>
          <select className="field w-40">
            <option>All exposure bands</option>
            <option>Critical</option>
            <option>Warning</option>
            <option>Normal</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="button-secondary">Weather Overlay</button>
          <button className="button-primary">Export Queue</button>
        </div>
      </section>

      <section className="ops-metric-grid">
        <div className="ops-metric">
          <div className="ops-title">Tracked Pieces</div>
          <div className="ops-value">{exposureRows.length}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Elevated Thermal</div>
          <div className="ops-value">{exposureRows.filter((row) => row.thermalScore > 0.5).length}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Custody Drift</div>
          <div className="ops-value">{exposureRows.filter((row) => row.chainOfCustodyScore < 0.7).length}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Hottest Station</div>
          <div className="ops-value">{hottestStation?.code ?? "--"}</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-sm font-semibold text-slate-900">Exposure Table</h2>
            <span className="status-pill status-live">15s merged telemetry</span>
          </div>
          <div className="panel-body overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Piece</th>
                  <th>Shipment</th>
                  <th>Station</th>
                  <th>Weather</th>
                  <th>Thermal</th>
                  <th>Custody</th>
                  <th>Integrity</th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {exposureRows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium text-slate-900">{row.id}</td>
                    <td>{row.awb}</td>
                    <td>{row.airportCode ?? "Unknown"}</td>
                    <td>
                      {row.airportWeather ? `${row.airportWeather.apronTemperatureC}°C / ${row.airportWeather.risk}` : "No station weather"}
                    </td>
                    <td>
                      <span className={`status-pill ${scoreTone(row.thermalScore)}`}>{Math.round(row.thermalScore * 100)}%</span>
                    </td>
                    <td>
                      <span className={`status-pill ${scoreTone(1 - row.chainOfCustodyScore)}`}>
                        {Math.round(row.chainOfCustodyScore * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${scoreTone(1 - row.integrityScore)}`}>{Math.round(row.integrityScore * 100)}%</span>
                    </td>
                    <td>{row.specialHandlingCodes.join(", ") || "GEN"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Weather Pressure</h2>
              <span className="ribbon ribbon-warn">Live Risk</span>
            </div>
            <div className="panel-body overflow-x-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Airport</th>
                    <th>Apron</th>
                    <th>Humidity</th>
                    <th>HSI</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(weather).map((entry) => (
                    <tr key={entry.code}>
                      <td className="font-medium text-slate-900">{entry.code}</td>
                      <td>{entry.apronTemperatureC}°C</td>
                      <td>{entry.humidity}%</td>
                      <td>{entry.heatStressIndex}</td>
                      <td>
                        <span className={`status-pill ${entry.risk === "critical" ? "status-critical" : entry.risk === "warning" ? "status-warn" : "status-ok"}`}>
                          {entry.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Priority Pieces</h2>
              <span className="ribbon ribbon-critical">Escalate</span>
            </div>
            <div className="panel-body overflow-x-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Station</th>
                    <th>Thermal</th>
                    <th>Weather Note</th>
                  </tr>
                </thead>
                <tbody>
                  {exposureRows
                    .filter((row) => row.thermalScore > 0.6 || row.airportWeather?.stormWarning)
                    .slice(0, 8)
                    .map((row) => (
                      <tr key={row.id}>
                        <td className="font-medium text-slate-900">{row.id}</td>
                        <td>{row.airportCode ?? "Unknown"}</td>
                        <td>
                          <span className={`status-pill ${scoreTone(row.thermalScore)}`}>{Math.round(row.thermalScore * 100)}%</span>
                        </td>
                        <td>{row.airportWeather?.stormWarning ? "Storm watch" : row.airportWeather?.risk ?? "No weather data"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
