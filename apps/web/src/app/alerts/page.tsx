"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Alert = {
  id: string;
  shipmentId: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
};

const severityClass = (severity: string) =>
  severity === "CRITICAL" ? "status-pill status-critical" : "status-pill status-warn";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await apiRequest<{ alerts: Alert[] }>("/alerts");
      setAlerts(response.alerts);
    };
    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <section className="toolbar panel">
        <span className="ribbon ribbon-critical">Alert Console</span>
        <input className="field min-w-[220px]" placeholder="Search alert, shipment, airport" />
        <select className="field">
          <option>All severities</option>
          <option>Critical</option>
          <option>Warning</option>
        </select>
        <select className="field">
          <option>All statuses</option>
          <option>Open</option>
          <option>Acknowledged</option>
          <option>Resolved</option>
        </select>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[12px] font-semibold text-slate-900">Alerts Table</h3>
          <span className="text-[11px] text-slate-500">{alerts.length} incidents</span>
        </div>
        <div className="max-h-[640px] overflow-auto">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Reason</th>
                <th>Shipment</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td><span className={severityClass(alert.severity)}>{alert.severity}</span></td>
                  <td>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-[11px] text-slate-500">{alert.description}</div>
                  </td>
                  <td>{alert.shipmentId ?? "n/a"}</td>
                  <td>{alert.status}</td>
                  <td>{new Date(alert.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
