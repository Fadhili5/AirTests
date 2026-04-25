"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type WeatherRow = {
  code: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  temperatureC?: number;
  apronTemperatureC: number;
  humidity: number;
  windKph: number;
  heatStressIndex: number;
  solarExposure: string;
  stormWarning: boolean;
  risk: string;
};

type WeatherHistoryPoint = {
  timestamp: string;
  apronTemperatureC: number;
  humidity: number;
  heatStressIndex: number;
};

const project = (latitude: number, longitude: number) => ({
  x: ((longitude + 180) / 360) * 840 + 30,
  y: ((90 - latitude) / 180) * 320 + 30
});

const riskTone = (risk: string) =>
  risk === "critical" ? "status-critical" : risk === "warning" ? "status-warn" : "status-ok";

const linePath = (points: Array<{ x: number; y: number }>) =>
  points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherRow[]>([]);
  const [history, setHistory] = useState<Record<string, WeatherHistoryPoint[]>>({});

  useEffect(() => {
    const load = async () => {
      const response = await apiRequest<{ weather: WeatherRow[] }>("/weather");
      setWeather(response.weather);
      setHistory((current) => {
        const next = { ...current };
        const timestamp = new Date().toISOString();
        for (const row of response.weather) {
          const series = next[row.code] ?? [];
          next[row.code] = [
            ...series.slice(-17),
            {
              timestamp,
              apronTemperatureC: row.apronTemperatureC,
              humidity: row.humidity,
              heatStressIndex: row.heatStressIndex
            }
          ];
        }
        return next;
      });
    };

    void load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const ranked = useMemo(
    () =>
      [...weather].sort((left, right) => {
        const rank = { critical: 3, warning: 2, healthy: 1 };
        return (rank[right.risk as keyof typeof rank] ?? 0) - (rank[left.risk as keyof typeof rank] ?? 0);
      }),
    [weather]
  );

  return (
    <div className="space-y-4">
      <section className="toolbar panel">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input className="field max-w-sm" placeholder="Search station or airport code" />
          <select className="field w-40">
            <option>All stations</option>
            <option>High heat</option>
            <option>Storm watch</option>
            <option>Normal ops</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="button-secondary">Overlay: Weather</button>
          <button className="button-primary">Refresh Feed</button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-sm font-semibold text-slate-900">Global Airport Weather Map</h2>
            <span className="status-pill status-live">15s weather poll</span>
          </div>
          <div className="panel-body">
            <div className="ops-map overflow-x-auto">
              <svg viewBox="0 0 900 380" className="min-w-[860px]">
                <rect x="0" y="0" width="900" height="380" rx="10" fill="#edf4fb" />
                <path
                  d="M54 100c30-20 100-28 154-18 36 7 61 21 92 17 29-4 55-26 98-34 47-9 102 5 145 22 41 17 64 30 101 31 43 1 72-20 105-21 40-1 80 26 97 52 15 23 15 56-10 80-32 31-84 33-113 48-41 20-63 66-113 78-48 11-91-13-138-18-51-6-102 10-154 3-53-8-102-44-129-84-27-39-29-81-14-115 15-33 46-53 79-41z"
                  fill="#d8e7f5"
                />
                {weather.map((entry) => {
                  if (entry.latitude === null || entry.latitude === undefined || entry.longitude === null || entry.longitude === undefined) {
                    return null;
                  }
                  const point = project(entry.latitude, entry.longitude);
                  const fill = entry.risk === "critical" ? "#d64545" : entry.risk === "warning" ? "#d9822b" : "#2f855a";
                  return (
                    <g key={entry.code}>
                      <circle cx={point.x} cy={point.y} r="11" fill={fill} fillOpacity="0.12" />
                      <circle cx={point.x} cy={point.y} r="5" fill={fill} />
                      <text x={point.x + 10} y={point.y + 4} fontSize="11" fill="#102a43">
                        {entry.code}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Weather Risk Queue</h2>
              <span className="ribbon ribbon-warn">Operational</span>
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
                  {ranked.map((entry) => (
                    <tr key={entry.code}>
                      <td className="font-medium text-slate-900">
                        {entry.code}
                        <div className="text-xs text-[var(--muted)]">{entry.name}</div>
                      </td>
                      <td>{entry.apronTemperatureC}°C</td>
                      <td>{entry.humidity}%</td>
                      <td>{entry.windKph} kph</td>
                      <td>
                        <span className={`status-pill ${riskTone(entry.risk)}`}>{entry.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Trend Diagnostics</h2>
              <span className="ribbon ribbon-blue">Live</span>
            </div>
            <div className="panel-body space-y-3">
              {ranked.slice(0, 3).map((entry) => {
                const series = history[entry.code] ?? [];
                const temperaturePoints = series.map((point, index) => ({
                  x: 24 + index * 16,
                  y: 110 - Math.min(80, Math.max(0, point.apronTemperatureC))
                }));

                return (
                  <div key={entry.code} className="rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        {entry.code} <span className="font-normal text-[var(--muted)]">{entry.name}</span>
                      </div>
                      <span className={`status-pill ${riskTone(entry.risk)}`}>{entry.risk}</span>
                    </div>
                    <svg viewBox="0 0 320 120" className="h-24 w-full">
                      <path d="M20 110 H300" stroke="#cbd5e1" strokeWidth="1" />
                      <path d="M20 70 H300" stroke="#e2e8f0" strokeWidth="1" />
                      <path d={linePath(temperaturePoints)} stroke="#1f5f8b" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </svg>
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Apron {entry.apronTemperatureC}°C · HSI {entry.heatStressIndex} · {entry.stormWarning ? "Storm watch" : "Normal storm state"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
