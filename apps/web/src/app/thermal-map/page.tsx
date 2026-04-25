"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type Shipment = {
  id: string;
  awb: string | null;
  originAirport?: string | null;
  destinationAirport?: string | null;
  pieces: Array<{
    id: string;
    thermalScore: number;
    currentZone: string | null;
    specialHandlingCodes: string[];
  }>;
};

type Sample = {
  timestamp: string;
  averageThermalScore: number;
  pieceCount: number;
};

const scoreClass = (score: number) =>
  score > 0.75 ? "status-critical" : score > 0.5 ? "status-warn" : "status-ok";

const linePath = (values: number[]) =>
  values
    .map((value, index) => {
      const x = 24 + index * 18;
      const y = 110 - Math.min(76, Math.max(0, value * 76));
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

export default function ThermalMapPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [history, setHistory] = useState<Sample[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await apiRequest<{ shipments: Shipment[] }>("/shipments");
      setShipments(response.shipments);
      const pieces = response.shipments.flatMap((shipment) => shipment.pieces);
      const averageThermalScore =
        pieces.length > 0 ? pieces.reduce((sum, piece) => sum + piece.thermalScore, 0) / pieces.length : 0;

      setHistory((current) => [
        ...current.slice(-15),
        {
          timestamp: new Date().toISOString(),
          averageThermalScore,
          pieceCount: pieces.length
        }
      ]);
    };

    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const pieceRows = useMemo(
    () =>
      shipments.flatMap((shipment) =>
        shipment.pieces.map((piece) => ({
          shipmentId: shipment.id,
          awb: shipment.awb ?? shipment.id,
          origin: shipment.originAirport ?? "HKG",
          destination: shipment.destinationAirport ?? "Network",
          ...piece
        }))
      ),
    [shipments]
  );

  const highRiskPieces = pieceRows.filter((piece) => piece.thermalScore > 0.65);
  const series = history.map((point) => point.averageThermalScore);
  const avgThermal = pieceRows.length > 0 ? pieceRows.reduce((sum, piece) => sum + piece.thermalScore, 0) / pieceRows.length : 0;

  return (
    <div className="space-y-4">
      <section className="ops-metric-grid">
        <div className="ops-metric">
          <div className="ops-title">Active Pieces</div>
          <div className="ops-value">{pieceRows.length}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Elevated Thermal</div>
          <div className="ops-value">{highRiskPieces.length}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Average Score</div>
          <div className="ops-value">{Math.round(avgThermal * 100)}%</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Live Sample Window</div>
          <div className="ops-value">{history.length}</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-sm font-semibold text-slate-900">Thermal Operations Table</h2>
            <span className="status-pill status-live">10s live refresh</span>
          </div>
          <div className="panel-body overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Piece</th>
                  <th>Shipment</th>
                  <th>Route</th>
                  <th>Zone</th>
                  <th>Handling</th>
                  <th>Thermal Score</th>
                </tr>
              </thead>
              <tbody>
                {pieceRows.map((piece) => (
                  <tr key={piece.id}>
                    <td className="font-medium text-slate-900">{piece.id}</td>
                    <td>{piece.awb}</td>
                    <td>{piece.origin} → {piece.destination}</td>
                    <td>{piece.currentZone ?? "Unknown"}</td>
                    <td>{piece.specialHandlingCodes.join(", ") || "GEN"}</td>
                    <td>
                      <span className={`status-pill ${scoreClass(piece.thermalScore)}`}>{Math.round(piece.thermalScore * 100)}%</span>
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
              <h2 className="text-sm font-semibold text-slate-900">Thermal Trend</h2>
              <span className="ribbon ribbon-blue">Rolling Average</span>
            </div>
            <div className="panel-body">
              <svg viewBox="0 0 320 120" className="h-32 w-full rounded-md border border-[var(--line)] bg-white p-2">
                <path d="M20 110 H300" stroke="#cbd5e1" strokeWidth="1" />
                <path d="M20 72 H300" stroke="#e2e8f0" strokeWidth="1" />
                <path d="M20 34 H300" stroke="#e2e8f0" strokeWidth="1" />
                <path d={linePath(series)} stroke="#d9822b" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Priority Queue</h2>
              <span className="ribbon ribbon-critical">Escalate</span>
            </div>
            <div className="panel-body overflow-x-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Zone</th>
                    <th>Handling</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskPieces.length > 0 ? (
                    highRiskPieces.map((piece) => (
                      <tr key={piece.id}>
                        <td className="font-medium text-slate-900">{piece.id}</td>
                        <td>{piece.currentZone ?? "Unknown"}</td>
                        <td>{piece.specialHandlingCodes.join(", ") || "GEN"}</td>
                        <td>
                          <span className={`status-pill ${scoreClass(piece.thermalScore)}`}>{Math.round(piece.thermalScore * 100)}%</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No elevated thermal pieces currently in queue.</td>
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
