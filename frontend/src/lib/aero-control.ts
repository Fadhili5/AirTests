import type { AlertItem, InterventionTask, QueueItem, TimelineEvent, UldExposure } from "../types";

export const routes = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "DB",
    eyebrow: "Overview Hub",
    title: "Operational Overview",
    description: "System status, risk overview, and direct navigation into active operational domains.",
  },
  {
    path: "/flights",
    label: "Flights",
    icon: "FL",
    eyebrow: "Flight Ops",
    title: "Long-Haul Flight Control",
    description: "Emirates-style DXB transfer, uplift, and arrival exposure context.",
  },
  {
    path: "/uld-tracking",
    label: "ULD Tracking",
    icon: "UL",
    eyebrow: "ULD Tracking",
    title: "Live ULD Monitoring",
    description: "Realtime ULD movement, map context, and current operational state.",
  },
  {
    path: "/exposure",
    label: "Exposure",
    icon: "EX",
    eyebrow: "Exposure Intelligence",
    title: "Temperature & Exposure Breakdown",
    description: "Tarmac, ground, and flight exposure analysis with time-based charting.",
  },
  {
    path: "/alerts",
    label: "Alerts",
    icon: "AL",
    eyebrow: "Alerts",
    title: "Risk Events & Acknowledgement",
    description: "Active alert investigation, severity filtering, and event acknowledgement.",
  },
  {
    path: "/interventions",
    label: "Interventions",
    icon: "IN",
    eyebrow: "Interventions",
    title: "Operational Actions",
    description: "Assignment flow, execution tracking, SLA windows, and action history.",
  },
  {
    path: "/airports",
    label: "Airports",
    icon: "AP",
    eyebrow: "Airport Intelligence",
    title: "Airport Risk Zones",
    description: "Airport zone risk, delay mapping, and bottleneck visualization.",
  },
  {
    path: "/analytics",
    label: "Analytics",
    icon: "AN",
    eyebrow: "Analytics",
    title: "Compliance & Exposure Metrics",
    description: "System-wide trends, compliance scoring, and performance insights.",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: "ST",
    eyebrow: "Settings",
    title: "System Configuration",
    description: "Threshold tuning, user roles, and API/system configuration settings.",
  },
] as const;

export function routeMeta(pathname: string) {
  const current = routes.find((route) => route.path === pathname) ?? routes[0];
  return [current] as const;
}

export function authHeader() {
  const token = localStorage.getItem("or_atm_token");
  if (import.meta.env.VITE_AUTH_DISABLED === "true") return {};
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function mapFleetToUld(item: any): UldExposure {
  const risk = normalizeRisk(item.lastRisk?.level || item.status || "LOW");
  return {
    id: item.uldId,
    airport: item.lastLocation?.airportCode || item.airportCode || "UNK",
    zone: inferZone(item.operationalContext?.airportZone),
    risk,
    currentTemp: Number(item.lastTemperatureCelsius ?? 5),
    tarmacExposure: Math.max(0, Math.round((item.exposureUsed ?? 10) * 0.45)),
    groundDelayExposure: Math.max(0, Math.round((item.exposureUsed ?? 10) * 0.35)),
    inflightExposure: Math.max(0, Math.round((item.exposureUsed ?? 10) * 0.2)),
    totalExposure: item.exposureUsed ?? 10,
    exposureScore: Math.min(100, Math.round((item.exposureUsed ?? 10) * 3)),
    riskScore: Number(item.lastRisk?.score ?? 0.45),
    predictionMinutes: item.lastRisk?.timeToBreachMinutes ?? 30,
    trend: risk === "HIGH" ? "Rising" : risk === "MEDIUM" ? "Stable" : "Recovering",
    status: risk === "HIGH" ? "Intervention" : risk === "MEDIUM" ? "Tracked" : "Recovered",
    lat: item.lastLocation?.lat || 25.2532,
    lon: item.lastLocation?.lon || 55.3657,
    phase: item.operationalContext?.delayDetected ? "Ground" : "Tarmac",
    cause: item.operationalContext?.delayDetected ? "Ground delay detected via dwell + zone" : "Thermal trend stable under active watch",
    delaySource: item.operationalContext?.delayDetected ? "Ramp / customs bottleneck" : "No active delay source",
    failurePoint: item.operationalContext?.handlingGap ? "Handling idle gap" : "No active failure point",
    recommendedFix: item.operationalContext?.handlingGap ? "Apply thermal cover and re-sequence handling" : "Continue monitoring",
  };
}

export function mapTelemetryToUld(event: any): UldExposure {
  const status = event.status || {};
  const risk = normalizeRisk(event.risk?.risk_level || status.lastRisk?.level || "LOW");
  return {
    id: status.uldId,
    airport: status.lastLocation?.airportCode || "UNK",
    zone: inferZone(status.operationalContext?.airportZone),
    risk,
    currentTemp: Number(event.reading.temperature_celsius ?? 5),
    tarmacExposure: Math.max(0, Math.round((status.exposureUsed ?? 10) * 0.45)),
    groundDelayExposure: Math.max(0, Math.round((status.exposureUsed ?? 10) * 0.35)),
    inflightExposure: Math.max(0, Math.round((status.exposureUsed ?? 10) * 0.2)),
    totalExposure: status.exposureUsed ?? 10,
    exposureScore: Math.min(100, Math.round((status.exposureUsed ?? 10) * 3)),
    riskScore: Number(event.risk?.risk_score ?? 0.5),
    predictionMinutes: Number(event.risk?.time_to_breach_minutes ?? 25),
    trend: risk === "HIGH" ? "Rising" : risk === "MEDIUM" ? "Stable" : "Recovering",
    status: risk === "HIGH" ? "Intervention" : risk === "MEDIUM" ? "Tracked" : "Recovered",
    lat: status.lastLocation?.lat || 25.2532,
    lon: status.lastLocation?.lon || 55.3657,
    phase: status.operationalContext?.delayDetected ? "Ground" : "Tarmac",
    cause: status.operationalContext?.delayDetected ? "Ground delay detected via dwell + zone" : "Thermal trend refreshed",
    delaySource: status.operationalContext?.delayDetected ? "Airport dwell bottleneck" : "None active",
    failurePoint: status.operationalContext?.handlingGap ? "Handling idle gap" : "No active failure point",
    recommendedFix: status.operationalContext?.handlingGap ? "Escalate handling and thermal cover" : "Continue observation",
  };
}

export function mapActionToTask(action: any): InterventionTask {
  return {
    id: action.id,
    uldId: action.uldId,
    action: action.action,
    role:
      action.assignedRole === "Ops Control"
        ? "Ops Control"
        : action.assignedRole === "Ramp Supervisor" || action.priority === "CRITICAL"
          ? "Supervisor"
          : "Handler",
    windowMinutes: action.slaMinutes ?? 10,
    dueAt: new Date(new Date(action.createdAt).getTime() + (action.slaMinutes ?? 10) * 60000).toISOString(),
    status:
      action.status === "VERIFIED"
        ? "Completed"
        : action.status === "ASSIGNED" || action.status === "ALERT_CREATED"
          ? "Pending"
          : "In Progress",
    priority:
      action.priority === "CRITICAL"
        ? "Critical"
        : action.priority === "HIGH" || action.priority === "PREVENTIVE"
          ? "High"
          : "Normal",
  };
}

export function mapAlertItem(alert: any, fallbackUldId: string): AlertItem {
  return {
    id: alert.id || crypto.randomUUID(),
    uldId: alert.uld_id || fallbackUldId,
    level: alert.status === "BREACH" ? "HIGH" : alert.status === "WARNING" ? "MEDIUM" : "LOW",
    title: alert.message || alert.status,
    detail: alert.message || "Realtime alert triggered.",
    timestamp: alert.occurred_at || new Date().toISOString(),
  };
}

export function replaceById<T extends { id: string }>(items: T[], nextItem: T) {
  const index = items.findIndex((item) => item.id === nextItem.id);
  if (index === -1) return [nextItem, ...items];
  const next = [...items];
  next[index] = nextItem;
  return next;
}

export function updateUlds(items: UldExposure[], nextItem: UldExposure) {
  const index = items.findIndex((item) => item.id === nextItem.id);
  if (index === -1) return [nextItem, ...items];
  const next = [...items];
  next[index] = nextItem;
  return next;
}

export function markerColor(level: UldExposure["risk"]) {
  if (level === "HIGH") return "#ff6f6f";
  if (level === "MEDIUM") return "#ffb44a";
  return "#41d78c";
}

export function riskTone(level: "HIGH" | "MEDIUM" | "LOW") {
  if (level === "HIGH") return "danger" as const;
  if (level === "MEDIUM") return "warn" as const;
  return "good" as const;
}

export function inferZone(value?: string): UldExposure["zone"] {
  if (!value) return "Ramp Buffer";
  const normalized = value.toLowerCase();
  if (normalized.includes("tarmac")) return "Tarmac";
  if (normalized.includes("hold")) return "Aircraft Hold";
  if (normalized.includes("warehouse")) return "Warehouse";
  return "Ramp Buffer";
}

function normalizeRisk(value?: string): UldExposure["risk"] {
  if (!value) return "LOW";
  const normalized = String(value).toUpperCase();
  if (normalized === "BREACH" || normalized === "CRITICAL" || normalized === "HIGH") return "HIGH";
  if (normalized === "AT_RISK" || normalized === "WARNING" || normalized === "MEDIUM") return "MEDIUM";
  return "LOW";
}

export function buildExposureChart(uld: UldExposure) {
  const labels = ["Ground", "Tarmac", "Flight", "Total"];
  return {
    labels,
    datasets: [
      {
        label: "Exposure Minutes",
        data: [uld.groundDelayExposure, uld.tarmacExposure, uld.inflightExposure, uld.totalExposure],
        borderColor: "#3bd8d0",
        backgroundColor: "rgba(59, 216, 208, 0.12)",
        fill: true,
        tension: 0.36,
      },
    ],
  };
}

export function buildComplianceSeries(ulds: UldExposure[]) {
  return {
    labels: ulds.map((item) => item.id),
    datasets: [
      {
        label: "Exposure Score",
        data: ulds.map((item) => item.exposureScore),
        borderColor: "#ffb44a",
        backgroundColor: "rgba(255, 180, 74, 0.12)",
        fill: true,
        tension: 0.32,
      },
      {
        label: "Risk Score x100",
        data: ulds.map((item) => Math.round(item.riskScore * 100)),
        borderColor: "#3bd8d0",
        backgroundColor: "rgba(59, 216, 208, 0.12)",
        fill: true,
        tension: 0.32,
      },
    ],
  };
}

export function summarizeSystem(ulds: UldExposure[], alerts: AlertItem[], tasks: InterventionTask[]) {
  return [
    { label: "Tracked ULDs", value: String(ulds.length), tone: "good" as const },
    { label: "Critical Alerts", value: String(alerts.filter((item) => item.level === "HIGH").length), tone: "danger" as const },
    { label: "Open Interventions", value: String(tasks.filter((item) => item.status !== "Completed").length), tone: "warn" as const },
    { label: "Recovered", value: String(ulds.filter((item) => item.status === "Recovered").length), tone: "default" as const },
  ];
}

export function makeQuickLinks() {
  return [
    { title: "Investigate Alerts", path: "/alerts", description: "Move directly into severity triage and acknowledgement." },
    { title: "Execute Interventions", path: "/interventions", description: "Manage assignments, SLA windows, and action history." },
    { title: "Track ULDs", path: "/uld-tracking", description: "Open the live map and movement view for all active ULDs." },
    { title: "Review Airports", path: "/airports", description: "Inspect zone risk and delay intelligence across airports." },
  ];
}

export function groupTimelineByUld(timeline: TimelineEvent[], selected?: string) {
  return timeline.filter((item) => !selected || item.uldId === selected);
}

export function sortTasksByDue(tasks: InterventionTask[]) {
  return [...tasks].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export function makeSystemSettings() {
  return [
    { group: "Risk Thresholds", rows: ["High risk score >= 0.80", "Prediction escalation < 20 min", "Tarmac dwell watch > 12 min"] },
    { group: "User Roles", rows: ["Handler / Supervisor / Ops Control", "Realtime action routing enabled", "Audit trail retention active"] },
    { group: "API Configuration", rows: ["Socket.IO live feed connected", "MQTT ingestion online", "Offline queue synchronization enabled"] },
  ];
}

export function makeAirportSummary(ulds: UldExposure[]) {
  const byAirport = new Map<string, { risk: number; count: number; delays: number }>();

  ulds.forEach((uld) => {
    const current = byAirport.get(uld.airport) || { risk: 0, count: 0, delays: 0 };
    current.risk += uld.riskScore;
    current.count += 1;
    current.delays += uld.phase === "Ground" ? 1 : 0;
    byAirport.set(uld.airport, current);
  });

  return [...byAirport.entries()].map(([airport, value]) => ({
    airport,
    avgRisk: (value.risk / value.count).toFixed(2),
    activeUlds: value.count,
    delayHotspots: value.delays,
  }));
}

export function makeActionHistory(tasks: InterventionTask[]): TimelineEvent[] {
  return tasks.map((task) => ({
    id: `history-${task.id}`,
    uldId: task.uldId,
    type: task.status === "Completed" ? "Executed" : task.status === "In Progress" ? "Acknowledged" : "Assigned",
    detail: `${task.action} routed to ${task.role}.`,
    timestamp: task.dueAt,
  }));
}

export function queueBadge(queue: QueueItem[]) {
  return queue.length > 0 ? `${queue.length} queued` : "No queued actions";
}
