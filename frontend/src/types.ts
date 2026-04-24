export type SyncStatus = "online" | "offline" | "syncing";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type MonitoringTeam =
  | "Ground Handler"
  | "Cargo Team"
  | "Supervisor"
  | "Ops Control"
  | "Cool Chain Team";
export type QueueActionType =
  | "inventory.use"
  | "task.complete"
  | "incident.create"
  | "assistant.prompt";

export type AppTab = "dashboard" | "ulds" | "inventory" | "incidents" | "tasks" | "assistant";

export interface UldExposure {
  id: string;
  airport: string;
  zone: "Tarmac" | "Warehouse" | "Aircraft Hold" | "Ramp Buffer";
  risk: RiskLevel;
  currentTemp: number;
  tarmacExposure: number;
  groundDelayExposure: number;
  inflightExposure: number;
  totalExposure: number;
  exposureScore: number;
  riskScore: number;
  predictionMinutes: number;
  trend: "Rising" | "Stable" | "Recovering";
  status: "Tracked" | "Intervention" | "Recovered";
  lat: number;
  lon: number;
  phase: "Ground" | "Tarmac" | "Flight";
  cause: string;
  delaySource: string;
  failurePoint: string;
  recommendedFix: string;
  unitType?: "Active" | "Passive";
  collaborationTeams?: MonitoringTeam[];
  geofenceStage?: "Tarmac" | "Warehouse" | "Cool Chain Centre" | "Ramp Buffer";
}

export interface InterventionTask {
  id: string;
  uldId: string;
  action: string;
  role: "Handler" | "Supervisor" | "Ops Control" | "Ground Handler" | "Cargo Team" | "Cool Chain Team";
  windowMinutes: number;
  dueAt: string;
  status: "Pending" | "In Progress" | "Completed";
  priority: "Normal" | "High" | "Critical";
  workflow?: "Geo-fence" | "Manual" | "Thermal Imaging" | "IoT Portal";
  team?: MonitoringTeam;
}

export interface AlertItem {
  id: string;
  uldId: string;
  level: RiskLevel;
  title: string;
  detail: string;
  timestamp: string;
  targetTeams?: MonitoringTeam[];
  workflow?: "Geo-fence" | "In-Built Alert" | "Thermal Imaging" | "IoT Portal";
  responseType?: "Adjust Active ULD" | "Move Passive ULD" | "Inspect Hot Spot";
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "Thermal Covers" | "Coolant Packs" | "Data Loggers" | "Rescue Kits";
  stock: number;
  capacity: number;
  status: "Healthy" | "Watch" | "Low";
}

export interface IncidentItem {
  id: string;
  type: "Thermal" | "Handling" | "Delay" | "Sensor";
  severity: "Low" | "Medium" | "High";
  description: string;
  status: "Open" | "Resolved";
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  uldId: string;
  type: "Alert" | "Assigned" | "Acknowledged" | "Executed" | "Verified";
  detail: string;
  timestamp: string;
}

export interface QueueItem {
  id: string;
  type: QueueActionType;
  label: string;
  createdAt: string;
}

export interface AnalyticsPoint {
  timestamp: string;
  averageExposureScore: number;
  averageRiskScore: number;
  highRiskCount: number;
  alertCount: number;
  pendingTaskCount: number;
}
