import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageError } from "../components/ui/PageError";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";

export default function InterventionsPage() {
  const { tasks, flashes, markTaskCompleted, timeline } = useAeroStore();

  const sorted = useMemo(() => {
    try {
      return [...tasks].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    } catch (err) {
      console.error("[Interventions] Sort error:", err);
      return tasks;
    }
  }, [tasks]);

  const pending = sorted.filter((t) => t.status === "Pending");
  const inProgress = sorted.filter((t) => t.status === "In Progress");
  const completed = sorted.filter((t) => t.status === "Completed");

  const history = useMemo(() => {
    return sorted.map((task) => ({
      id: `hist-${task.id}`,
      uldId: task.uldId,
      type: task.status === "Completed" ? "Executed" : task.status === "In Progress" ? "Acknowledged" : "Assigned",
      detail: `${task.action} routed to ${task.role}.`,
      timestamp: task.dueAt,
    }));
  }, [sorted]);

  const getSlaColor = (dueAt: string) => {
    try {
      const minutes = Math.round((new Date(dueAt).getTime() - Date.now()) / 60000);
      if (minutes < 0) return "text-rose-400";
      if (minutes < 10) return "text-amber-400";
      return "text-emerald-400";
    } catch {
      return "text-slate-400";
    }
  };

  const formatSla = (dueAt: string) => {
    try {
      const minutes = Math.round((new Date(dueAt).getTime() - Date.now()) / 60000);
      if (minutes < 0) return `${Math.abs(minutes)}m overdue`;
      return `${minutes}m remaining`;
    } catch {
      return "Invalid SLA";
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-4">
        {/* Summary */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Task Assignment System</CardTitle>
              <CardDescription>Operational action routing, execution windows, and SLA timing.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <SummaryTile label="Pending" value={pending.length} tone="amber" />
            <SummaryTile label="In Progress" value={inProgress.length} tone="cyan" />
            <SummaryTile label="Completed" value={completed.length} tone="emerald" />
          </CardContent>
        </Card>

        {/* Task Board */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Active Tasks</CardTitle>
              <CardDescription>Assignments with SLA countdown and execution controls.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sorted.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  flashes[`task:${task.id}`] ? "ring-1 ring-cyan-400/30 border-cyan-400/20" : "border-white/5 bg-white/[0.03]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{task.action}</p>
                    <p className="text-xs text-slate-500">{task.uldId}</p>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-400">
                  <span>Role: {task.role}</span>
                  <span className={getSlaColor(task.dueAt)}>SLA: {formatSla(task.dueAt)}</span>
                  <span>Status: {task.status}</span>
                </div>
                {task.status !== "Completed" && (
                  <button
                    onClick={() => {
                      try {
                        markTaskCompleted(task.id);
                      } catch (err) {
                        console.error("[Interventions] Complete task error:", err);
                      }
                    }}
                    className="mt-2 w-full rounded-lg bg-cyan-400/15 text-cyan-300 border border-cyan-400/20 py-1.5 text-xs hover:bg-cyan-400/25 transition-colors"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Action History */}
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Action History</CardTitle>
            <CardDescription>Execution chain and recovery verification.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.map((item) => (
            <div key={item.id} className="flex gap-3">
              <span className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                item.type === "Executed" && "bg-emerald-400",
                item.type === "Acknowledged" && "bg-cyan-400",
                item.type === "Assigned" && "bg-amber-400"
              )} />
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm">{item.type}</strong>
                  <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <strong className={cn("text-xl mt-1 block",
        tone === "amber" && "text-amber-400",
        tone === "cyan" && "text-cyan-400",
        tone === "emerald" && "text-emerald-400"
      )}>{value}</strong>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      "text-[10px] font-medium px-2 py-0.5 rounded-full",
      priority === "Critical" && "bg-rose-400/15 text-rose-300",
      priority === "High" && "bg-amber-400/15 text-amber-300",
      priority === "Normal" && "bg-slate-400/15 text-slate-300"
    )}>
      {priority}
    </span>
  );
}
