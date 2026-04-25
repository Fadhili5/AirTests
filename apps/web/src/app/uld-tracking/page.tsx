"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type UldRow = {
  id: string;
  uldId: string;
  flightNumber: string;
  location: string;
  airport: string | null;
  cargoType: string;
  internalTempC: number | null;
  externalTempC: number | null;
  humidity: number | null;
  doorState: string;
  thermalCoverState: string;
  exposureTimerMinutes: number;
  riskScore: number;
  alertState: string;
  projectedBreachMinutes: number | null;
  weatherImpact?: string;
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

type TraceSample = {
  timestamp: string;
  internalTempC: number | null;
  humidity: number | null;
  riskScore: number;
  exposureTimerMinutes: number;
};

const statusTone = (alertState: string) =>
  alertState === "red" ? "status-critical" : alertState === "amber" ? "status-warn" : "status-ok";

const sparkline = (values: number[], maxValue: number) =>
  values
    .map((value, index) => {
      const x = 18 + index * 20;
      const y = 102 - Math.min(72, Math.max(0, (value / maxValue) * 72));
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

export default function UldTrackingPage() {
  const [ulds, setUlds] = useState<UldRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weather, setWeather] = useState<Record<string, WeatherRow>>({});
  const [traces, setTraces] = useState<Record<string, TraceSample[]>>({});

  useEffect(() => {
    const load = async () => {
      const [uldResponse, weatherResponse] = await Promise.all([
        apiRequest<{ ulds: UldRow[] }>("/uld-tracking"),
        apiRequest<{ weather: WeatherRow[] }>("/weather")
      ]);

      setUlds(uldResponse.ulds);
      setWeather(Object.fromEntries(weatherResponse.weather.map((entry) => [entry.code, entry])));
      setSelectedId((current) => current ?? uldResponse.ulds[0]?.id ?? null);

      setTraces((current) => {
        const next = { ...current };
        const timestamp = new Date().toISOString();
        for (const uld of uldResponse.ulds) {
          const history = next[uld.id] ?? [];
          next[uld.id] = [
            ...history.slice(-15),
            {
              timestamp,
              internalTempC: uld.internalTempC,
              humidity: uld.humidity,
              riskScore: uld.riskScore,
              exposureTimerMinutes: uld.exposureTimerMinutes
            }
          ];
        }
        return next;
      });
    };

    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const selected = useMemo(() => ulds.find((uld) => uld.id === selectedId) ?? ulds[0] ?? null, [selectedId, ulds]);
  const selectedTrace = selected ? traces[selected.id] ?? [] : [];
  const selectedWeather = selected?.airport ? weather[selected.airport] : undefined;
  const tempValues = selectedTrace.map((sample) => sample.internalTempC ?? 0);
  const humidityValues = selectedTrace.map((sample) => sample.humidity ?? 0);
  const riskValues = selectedTrace.map((sample) => Math.round(sample.riskScore * 100));
  const exposureValues = selectedTrace.map((sample) => sample.exposureTimerMinutes);

  return (
    <div className="space-y-4">
      <section className="toolbar panel">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input className="field max-w-sm" placeholder="Search ULD, flight, zone, or airport" />
          <select className="field w-36">
            <option>All alert state</option>
            <option>Green</option>
            <option>Amber</option>
            <option>Red</option>
          </select>
          <select className="field w-36">
            <option>All stations</option>
            {Object.keys(weather).map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="button-secondary">Columns</button>
          <button className="button-primary">Track Selected</button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-sm font-semibold text-slate-900">ULD Fleet Table</h2>
            <span className="status-pill status-live">10s live state</span>
          </div>
          <div className="panel-body overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>ULD</th>
                  <th>Flight</th>
                  <th>Location</th>
                  <th>Temp</th>
                  <th>Humidity</th>
                  <th>Door</th>
                  <th>Exposure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ulds.map((uld) => (
                  <tr
                    key={uld.id}
                    onClick={() => setSelectedId(uld.id)}
                    className={selected?.id === uld.id ? "bg-sky-50" : ""}
                  >
                    <td className="font-medium text-slate-900">
                      {uld.uldId}
                      <div className="text-xs text-[var(--muted)]">{uld.cargoType}</div>
                    </td>
                    <td>{uld.flightNumber}</td>
                    <td>{uld.airport ?? "Unknown"} · {uld.location}</td>
                    <td>{uld.internalTempC ?? "-"}°C</td>
                    <td>{uld.humidity ?? "-"}%</td>
                    <td>{uld.doorState}</td>
                    <td>{uld.exposureTimerMinutes} min</td>
                    <td>
                      <span className={`status-pill ${statusTone(uld.alertState)}`}>{uld.alertState}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Selected ULD</h2>
              {selected ? <span className={`status-pill ${statusTone(selected.alertState)}`}>{selected.uldId}</span> : null}
            </div>
            <div className="panel-body">
              {selected ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                      <div className="ops-title">Flight / Station</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{selected.flightNumber} · {selected.airport ?? "Unknown"}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{selected.location}</div>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                      <div className="ops-title">Protection State</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{selected.thermalCoverState}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">Door {selected.doorState}</div>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                      <div className="ops-title">Temperature / Humidity</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {selected.internalTempC ?? "-"}°C / {selected.humidity ?? "-"}%
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">External {selected.externalTempC ?? "-"}°C</div>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                      <div className="ops-title">Exposure / Risk</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {selected.exposureTimerMinutes} min / {Math.round(selected.riskScore * 100)}%
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        Projected breach {selected.projectedBreachMinutes ?? "stable"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-md border border-[var(--line)] bg-white p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
                        <span>Temp / humidity trend</span>
                        <span>15 samples</span>
                      </div>
                      <svg viewBox="0 0 360 120" className="h-32 w-full">
                        <path d="M16 102 H340" stroke="#cbd5e1" strokeWidth="1" />
                        <path d="M16 66 H340" stroke="#e2e8f0" strokeWidth="1" />
                        <path d={sparkline(tempValues, 40)} stroke="#1f5f8b" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d={sparkline(humidityValues, 100)} stroke="#2f855a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="4 4" />
                      </svg>
                    </div>

                    <div className="rounded-md border border-[var(--line)] bg-white p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
                        <span>Risk / exposure trend</span>
                        <span>Rolling monitor</span>
                      </div>
                      <svg viewBox="0 0 360 120" className="h-32 w-full">
                        <path d="M16 102 H340" stroke="#cbd5e1" strokeWidth="1" />
                        <path d="M16 66 H340" stroke="#e2e8f0" strokeWidth="1" />
                        <path d={sparkline(riskValues, 100)} stroke="#d9822b" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d={sparkline(exposureValues, 120)} stroke="#486581" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="5 4" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)]">No ULD selected.</div>
              )}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Weather Overlay</h2>
              <span className="ribbon ribbon-blue">Station Impact</span>
            </div>
            <div className="panel-body overflow-x-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Airport</th>
                    <th>Apron</th>
                    <th>Humidity</th>
                    <th>Wind</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedWeather ? (
                    <tr>
                      <td className="font-medium text-slate-900">{selected?.airport}</td>
                      <td>{selectedWeather.apronTemperatureC}°C</td>
                      <td>{selectedWeather.humidity}%</td>
                      <td>{selectedWeather.windKph} kph</td>
                      <td>
                        <span className={`status-pill ${statusTone(selectedWeather.risk === "critical" ? "red" : selectedWeather.risk === "warning" ? "amber" : "green")}`}>
                          {selectedWeather.risk}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5}>No airport weather available for the selected ULD.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
