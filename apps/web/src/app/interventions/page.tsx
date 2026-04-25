"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type Intervention = {
  id: string;
  action: string;
  assignedRole: string;
  priority: string;
  status: string;
  slaDeadline: string;
  verificationNotes: string | null;
};

const priorityClass = (priority: string) =>
  priority === "CRITICAL"
    ? "status-critical"
    : priority === "HIGH"
      ? "status-warn"
      : "status-ok";

export default function InterventionsPage() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await apiRequest<{ interventions: Intervention[] }>("/interventions");
      setInterventions(response.interventions);
    };

    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    const open = interventions.filter((item) => item.status !== "COMPLETED").length;
    const overdue = interventions.filter((item) => new Date(item.slaDeadline).getTime() < Date.now() && item.status !== "COMPLETED").length;
    const critical = interventions.filter((item) => item.priority === "CRITICAL").length;
    const verified = interventions.filter((item) => item.verificationNotes).length;

    return { open, overdue, critical, verified };
  }, [interventions]);

  return (
    <div className="space-y-4">
      <section className="toolbar panel">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input className="field max-w-sm" placeholder="Search action, station, or assignee" />
          <select className="field w-40">
            <option>All priorities</option>
            <option>Critical</option>
            <option>High</option>
            <option>Routine</option>
          </select>
          <select className="field w-40">
            <option>All status</option>
            <option>Assigned</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="button-secondary">Bulk Assign</button>
          <button className="button-primary">New Intervention</button>
        </div>
      </section>

      <section className="ops-metric-grid">
        <div className="ops-metric">
          <div className="ops-title">Open Tasks</div>
          <div className="ops-value">{summary.open}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Overdue SLA</div>
          <div className="ops-value">{summary.overdue}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Critical Queue</div>
          <div className="ops-value">{summary.critical}</div>
        </div>
        <div className="ops-metric">
          <div className="ops-title">Verified Actions</div>
          <div className="ops-value">{summary.verified}</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-sm font-semibold text-slate-900">Intervention Board</h2>
            <span className="status-pill status-live">10s refresh</span>
          </div>
          <div className="panel-body overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Assigned Team</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium text-slate-900">{item.action}</td>
                    <td>{item.assignedRole}</td>
                    <td>
                      <span className={`status-pill ${priorityClass(item.priority)}`}>{item.priority}</span>
                    </td>
                    <td>{item.status}</td>
                    <td>{new Date(item.slaDeadline).toLocaleString()}</td>
                    <td>{item.verificationNotes ?? "Pending verification"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Dispatch Queue</h2>
              <span className="ribbon ribbon-blue">Active</span>
            </div>
            <div className="panel-body space-y-3">
              {interventions.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.action}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{item.assignedRole}</div>
                    </div>
                    <span className={`status-pill ${priorityClass(item.priority)}`}>{item.priority}</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    {item.status} · SLA {new Date(item.slaDeadline).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-slate-900">Recommended Actions</h2>
              <span className="ribbon ribbon-warn">Gemini</span>
            </div>
            <div className="panel-body">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Apron heat trending above threshold</td>
                    <td>Move ULD to cold room and resequence loading priority.</td>
                  </tr>
                  <tr>
                    <td>Door opened during outbound dwell</td>
                    <td>Dispatch inspection team and verify seal integrity before release.</td>
                  </tr>
                  <tr>
                    <td>Projected breach under storm delay</td>
                    <td>Apply thermal cover and reassign to refrigerated truck.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
