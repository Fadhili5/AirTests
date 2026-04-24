import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAeroStore } from "../store/use-aero-store";
import { cn } from "../lib/utils";
import { requestGeminiInterventionAssist } from "../lib/gemini";

export default function InterventionsPage() {
  const {
    tasks,
    alerts,
    ulds,
    flashes,
    markTaskCompleted,
    assistantMessages,
    appendAssistantMessage,
    now,
  } = useAeroStore();
  const [prompt, setPrompt] = useState("");
  const [geminiBusy, setGeminiBusy] = useState(false);

  const sorted = useMemo(() => {
    try {
      return [...tasks].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    } catch {
      return tasks;
    }
  }, [tasks]);

  const pending = sorted.filter((t) => t.status === "Pending");
  const inProgress = sorted.filter((t) => t.status === "In Progress");
  const completed = sorted.filter((t) => t.status === "Completed");
  const highestRisk = [...ulds].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);

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
    const minutes = Math.round((new Date(dueAt).getTime() - now) / 60000);
    if (minutes < 0) return "text-rose-700";
    if (minutes < 10) return "text-amber-700";
    return "text-emerald-700";
  };

  const formatSla = (dueAt: string) => {
    const minutes = Math.round((new Date(dueAt).getTime() - now) / 60000);
    if (minutes < 0) return `${Math.abs(minutes)}m overdue`;
    return `${minutes}m remaining`;
  };

  async function handleGeminiSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || geminiBusy) return;

    appendAssistantMessage({ role: "user", text: trimmed });
    setPrompt("");
    setGeminiBusy(true);

    try {
      const response = await requestGeminiInterventionAssist({
        prompt: trimmed,
        tasks: sorted,
        alerts,
        ulds,
      });
      appendAssistantMessage({ role: "assistant", text: response });
    } catch (error) {
      appendAssistantMessage({
        role: "assistant",
        text: "Gemini could not be reached, so AeroSentinel kept the local copilot active. Check `VITE_GEMINI_API_KEY` and try again.",
      });
      console.error("[Interventions] Gemini request failed:", error);
    } finally {
      setGeminiBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="space-y-4 lg:col-span-2 lg:space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Intervention Control</CardTitle>
              <CardDescription>Prioritized execution, live SLA timing, and AI-assisted recovery decisions.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryTile label="Pending" value={pending.length} tone="amber" />
            <SummaryTile label="In Progress" value={inProgress.length} tone="blue" />
            <SummaryTile label="Completed" value={completed.length} tone="emerald" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Critical Recovery Queue</CardTitle>
              <CardDescription>Live action board sorted by due window and intervention pressure.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sorted.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  flashes[`task:${task.id}`] ? "border-blue-200 bg-blue-50 ring-1 ring-blue-100" : "border-slate-200 bg-slate-50 hover:bg-white"
                )}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{task.action}</p>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <p className="text-xs text-slate-500">{task.uldId} • {task.role}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 md:min-w-[220px]">
                    <span>Status: {task.status}</span>
                    <span className={getSlaColor(task.dueAt)}>SLA: {formatSla(task.dueAt)}</span>
                    <span>Window: {task.windowMinutes}m</span>
                    <span>Due: {new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>Team: {task.team ?? task.role}</span>
                    <span>Workflow: {task.workflow ?? "Manual"}</span>
                  </div>
                </div>
                {task.status !== "Completed" && (
                  <button
                    onClick={() => markTaskCompleted(task.id)}
                    className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Gemini Copilot</CardTitle>
              <CardDescription>Ask for intervention sequencing, escalation logic, or recovery verification.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleGeminiSubmit} className="space-y-3">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: What should the supervisor do first for the hottest ULD?"
                className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={geminiBusy}
                className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {geminiBusy ? "Gemini is reasoning..." : "Ask Gemini"}
              </button>
            </form>
            <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
              {assistantMessages.slice(-6).map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-2xl border p-3 text-sm",
                    message.role === "assistant" ? "border-blue-200 bg-blue-50/70 text-slate-800" : "border-slate-200 bg-slate-50 text-slate-700"
                  )}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {message.role === "assistant" ? "Gemini" : "Operator"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Hot Units</CardTitle>
              <CardDescription>Highest-risk ULDs affecting the current intervention queue.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {highestRisk.map((uld) => (
              <div key={uld.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-slate-900">{uld.id}</strong>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                    {Math.round(uld.riskScore * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{uld.airport} • {uld.phase} • {uld.currentTemp}C</p>
                <p className="mt-2 text-xs text-slate-700">{uld.recommendedFix}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(uld.collaborationTeams ?? []).map((team) => (
                    <span key={team} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {team}
                    </span>
                  ))}
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    {uld.unitType ?? "Passive"} ULD
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
                  item.type === "Executed" && "bg-emerald-600",
                  item.type === "Acknowledged" && "bg-blue-600",
                  item.type === "Assigned" && "bg-amber-600"
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-slate-900">{item.type}</strong>
                    <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "emerald" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <strong
        className={cn(
          "mt-1 block text-xl",
          tone === "amber" && "text-amber-600",
          tone === "blue" && "text-blue-600",
          tone === "emerald" && "text-emerald-600"
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-[10px] font-medium",
      priority === "Critical" && "bg-rose-50 text-rose-700",
      priority === "High" && "bg-amber-50 text-amber-700",
      priority === "Normal" && "bg-slate-100 text-slate-700"
    )}>
      {priority}
    </span>
  );
}
