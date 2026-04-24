import { create } from "zustand";
import type {
  AlertItem,
  AnalyticsPoint,
  AppTab,
  IncidentItem,
  InterventionTask,
  InventoryItem,
  QueueActionType,
  QueueItem,
  SyncStatus,
  TimelineEvent,
  UldExposure,
} from "../types";

interface AeroState {
  now: number;
  activeTab: AppTab;
  syncStatus: SyncStatus;
  syncDrawerOpen: boolean;
  queue: QueueItem[];
  flashes: Record<string, boolean>;
  selectedUldId: string;
  filters: {
    risk: "ALL" | "HIGH" | "MEDIUM" | "LOW";
    airport: string;
    status: string;
  };
  ulds: UldExposure[];
  tasks: InterventionTask[];
  alerts: AlertItem[];
  inventory: InventoryItem[];
  incidents: IncidentItem[];
  timeline: TimelineEvent[];
  analyticsHistory: AnalyticsPoint[];
  assistantMessages: { id: string; role: "assistant" | "user"; text: string }[];
  appendAssistantMessage: (message: { role: "assistant" | "user"; text: string }) => void;
  tickClock: (timestamp?: number) => void;
  setActiveTab: (tab: AppTab) => void;
  selectUld: (id: string) => void;
  setSyncStatus: (status: SyncStatus) => void;
  toggleSyncDrawer: () => void;
  queueAction: (type: QueueActionType, label: string) => void;
  flushQueue: () => void;
  markTaskCompleted: (taskId: string) => void;
  markInventoryUsed: (itemId: string) => void;
  createIncident: (payload: Pick<IncidentItem, "type" | "severity" | "description">) => void;
  addAssistantPrompt: (prompt: string) => void;
  mergeControlCenter: (payload: Partial<Pick<AeroState, "ulds" | "tasks" | "alerts" | "timeline">>) => void;
  pulse: (keys: string[]) => void;
  attemptSyncRecovery: () => void;
}

const flashTimers = new Map<string, number>();

const QUEUE_STORAGE_KEY = "aerosentinel:queue";
const SYNC_STORAGE_KEY = "aerosentinel:lastSync";

function loadQueueFromStorage(): QueueItem[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueueToStorage(queue: QueueItem[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    console.warn("[Store] Failed to persist queue to localStorage");
  }
}

export const useAeroStore = create<AeroState>((set, get) => ({
  now: Date.now(),
  activeTab: "dashboard",
  syncStatus: navigator.onLine ? "online" : "offline",
  syncDrawerOpen: false,
  queue: loadQueueFromStorage(),
  flashes: {},
  selectedUldId: "ULD-7782",
  filters: {
    risk: "ALL",
    airport: "ALL",
    status: "ALL",
  },
  ulds: [
    {
      id: "ULD-7782",
      airport: "JFK",
      zone: "Tarmac",
      risk: "HIGH",
      currentTemp: 7.8,
      tarmacExposure: 22,
      groundDelayExposure: 11,
      inflightExposure: 8,
      totalExposure: 41,
      exposureScore: 82,
      riskScore: 0.86,
      predictionMinutes: 18,
      trend: "Rising",
      status: "Intervention",
      lat: 40.6413,
      lon: -73.7781,
      phase: "Tarmac",
      cause: "Prolonged tarmac dwell in solar load corridor",
      delaySource: "Stand allocation delay",
      failurePoint: "Thermal buffer handoff",
      recommendedFix: "Move to controlled storage and expedite aircraft loading",
      unitType: "Passive",
      collaborationTeams: ["Ground Handler", "Cargo Team", "Supervisor"],
      geofenceStage: "Tarmac",
    },
    {
      id: "ULD-5521",
      airport: "AMS",
      zone: "Warehouse",
      risk: "MEDIUM",
      currentTemp: 5.1,
      tarmacExposure: 8,
      groundDelayExposure: 14,
      inflightExposure: 6,
      totalExposure: 28,
      exposureScore: 64,
      riskScore: 0.58,
      predictionMinutes: 31,
      trend: "Stable",
      status: "Tracked",
      lat: 52.3105,
      lon: 4.7683,
      phase: "Ground",
      cause: "Warehouse dwell exceeded cooling recovery window",
      delaySource: "Customs processing queue",
      failurePoint: "Warehouse transfer cycle",
      recommendedFix: "Prioritize customs clearance and move to cold-room lane",
      unitType: "Passive",
      collaborationTeams: ["Cargo Team", "Cool Chain Team", "Supervisor"],
      geofenceStage: "Warehouse",
    },
    {
      id: "ULD-2034",
      airport: "DXB",
      zone: "Aircraft Hold",
      risk: "LOW",
      currentTemp: 4.2,
      tarmacExposure: 5,
      groundDelayExposure: 4,
      inflightExposure: 15,
      totalExposure: 24,
      exposureScore: 41,
      riskScore: 0.33,
      predictionMinutes: 54,
      trend: "Recovering",
      status: "Recovered",
      lat: 25.2532,
      lon: 55.3657,
      phase: "Flight",
      cause: "Cargo hold hotspot stabilized after airflow correction",
      delaySource: "None active",
      failurePoint: "Cargo hold temperature hotspot",
      recommendedFix: "Continue airflow balancing and verify temp stability",
      unitType: "Active",
      collaborationTeams: ["Cargo Team", "Ops Control"],
      geofenceStage: "Ramp Buffer",
    },
    {
      id: "ULD-4491",
      airport: "HKG",
      zone: "Tarmac",
      risk: "HIGH",
      currentTemp: 8.5,
      tarmacExposure: 26,
      groundDelayExposure: 9,
      inflightExposure: 7,
      totalExposure: 42,
      exposureScore: 85,
      riskScore: 0.88,
      predictionMinutes: 14,
      trend: "Rising",
      status: "Intervention",
      lat: 22.308,
      lon: 113.9185,
      phase: "Tarmac",
      cause: "Extended tarmac exposure during peak humidity period",
      delaySource: "Ground handling equipment shortage",
      failurePoint: "Thermal curtain seal integrity",
      recommendedFix: "Deploy mobile cooling unit and prioritize bay allocation",
      unitType: "Active",
      collaborationTeams: ["Ground Handler", "Cargo Team", "Supervisor"],
      geofenceStage: "Tarmac",
    },
    {
      id: "ULD-8812",
      airport: "SIN",
      zone: "Warehouse",
      risk: "MEDIUM",
      currentTemp: 6.2,
      tarmacExposure: 10,
      groundDelayExposure: 16,
      inflightExposure: 5,
      totalExposure: 31,
      exposureScore: 58,
      riskScore: 0.52,
      predictionMinutes: 28,
      trend: "Stable",
      status: "Tracked",
      lat: 1.3644,
      lon: 103.9915,
      phase: "Ground",
      cause: "Perishable cargo queue exceeding chilled buffer capacity",
      delaySource: "Documentation verification delay",
      failurePoint: "Cold chain continuity at transfer point",
      recommendedFix: "Expedite customs release and redirect to priority cold storage",
      unitType: "Passive",
      collaborationTeams: ["Cargo Team", "Cool Chain Team"],
      geofenceStage: "Cool Chain Centre",
    },
    {
      id: "ULD-1156",
      airport: "LHR",
      zone: "Aircraft Hold",
      risk: "LOW",
      currentTemp: 3.8,
      tarmacExposure: 4,
      groundDelayExposure: 3,
      inflightExposure: 18,
      totalExposure: 25,
      exposureScore: 38,
      riskScore: 0.28,
      predictionMinutes: 62,
      trend: "Recovering",
      status: "Recovered",
      lat: 51.47,
      lon: -0.4614,
      phase: "Flight",
      cause: "Stable cargo hold temperatures after initial climb thermal spike",
      delaySource: "None active",
      failurePoint: "No active failure point",
      recommendedFix: "Maintain current airflow profile and monitor descent phase",
      unitType: "Active",
      collaborationTeams: ["Cargo Team", "Ops Control"],
      geofenceStage: "Ramp Buffer",
    },
    {
      id: "ULD-3367",
      airport: "NRT",
      zone: "Tarmac",
      risk: "MEDIUM",
      currentTemp: 6.9,
      tarmacExposure: 15,
      groundDelayExposure: 8,
      inflightExposure: 9,
      totalExposure: 32,
      exposureScore: 61,
      riskScore: 0.55,
      predictionMinutes: 24,
      trend: "Stable",
      status: "Tracked",
      lat: 35.7647,
      lon: 140.3864,
      phase: "Tarmac",
      cause: "Seasonal tarmac temperature elevation during ground operations",
      delaySource: "De-icing queue priority",
      failurePoint: "Passive insulation degradation",
      recommendedFix: "Schedule expedited loading and verify gel pack integrity",
      unitType: "Passive",
      collaborationTeams: ["Ground Handler", "Cargo Team"],
      geofenceStage: "Tarmac",
    },
    {
      id: "ULD-9903",
      airport: "CDG",
      zone: "Ramp Buffer",
      risk: "HIGH",
      currentTemp: 9.1,
      tarmacExposure: 20,
      groundDelayExposure: 18,
      inflightExposure: 6,
      totalExposure: 44,
      exposureScore: 89,
      riskScore: 0.91,
      predictionMinutes: 11,
      trend: "Rising",
      status: "Intervention",
      lat: 49.0097,
      lon: 2.5479,
      phase: "Ground",
      cause: "Multiple handling delays compounded by equipment repositioning",
      delaySource: "Baggage system malfunction affecting cargo bay access",
      failurePoint: "Multi-point thermal breach during extended ramp hold",
      recommendedFix: "Emergency transfer to climate-controlled bay and notify pharma customer",
      unitType: "Passive",
      collaborationTeams: ["Ground Handler", "Cargo Team", "Supervisor", "Cool Chain Team"],
      geofenceStage: "Tarmac",
    },
  ],
  tasks: [
    {
      id: "task-1",
      uldId: "ULD-7782",
      action: "Move pallet to controlled storage",
      role: "Handler",
      windowMinutes: 8,
      dueAt: new Date(Date.now() + 8 * 60000).toISOString(),
      status: "Pending",
      priority: "Critical",
      workflow: "Geo-fence",
      team: "Ground Handler",
    },
    {
      id: "task-2",
      uldId: "ULD-5521",
      action: "Prioritize customs clearance",
      role: "Cargo Team",
      windowMinutes: 16,
      dueAt: new Date(Date.now() + 16 * 60000).toISOString(),
      status: "In Progress",
      priority: "High",
      workflow: "IoT Portal",
      team: "Cargo Team",
    },
  ],
  alerts: [
    {
      id: "alert-1",
      uldId: "ULD-7782",
      level: "HIGH",
      title: "Threshold breach predicted",
      detail: "Projected thermal threshold breach in 18 minutes on Tarmac 2.",
      timestamp: new Date().toISOString(),
      targetTeams: ["Ground Handler", "Cargo Team", "Supervisor"],
      workflow: "Geo-fence",
      responseType: "Move Passive ULD",
    },
    {
      id: "alert-2",
      uldId: "ULD-5521",
      level: "MEDIUM",
      title: "Ground delay detected",
      detail: "Warehouse dwell time exceeded recommended thermal recovery interval.",
      timestamp: new Date(Date.now() - 11 * 60000).toISOString(),
      targetTeams: ["Cargo Team", "Cool Chain Team"],
      workflow: "Thermal Imaging",
      responseType: "Inspect Hot Spot",
    },
  ],
  inventory: [
    { id: "inv-1", name: "Thermal Cover Kits", category: "Thermal Covers", stock: 18, capacity: 30, status: "Healthy" },
    { id: "inv-2", name: "Coolant Pack Sets", category: "Coolant Packs", stock: 6, capacity: 18, status: "Low" },
    { id: "inv-3", name: "Shock Data Loggers", category: "Data Loggers", stock: 12, capacity: 20, status: "Watch" },
    { id: "inv-4", name: "Rescue Integrity Kits", category: "Rescue Kits", stock: 9, capacity: 16, status: "Healthy" },
  ],
  incidents: [
    {
      id: "inc-1",
      type: "Thermal",
      severity: "High",
      description: "Ramp thermal hold exceeded passive pallet tolerance envelope.",
      status: "Open",
      timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
    },
  ],
  timeline: [
    {
      id: "tl-1",
      uldId: "ULD-7782",
      type: "Alert",
      detail: "High thermal acceleration detected on Tarmac 2.",
      timestamp: new Date(Date.now() - 24 * 60000).toISOString(),
    },
    {
      id: "tl-2",
      uldId: "ULD-7782",
      type: "Assigned",
      detail: "Controlled storage relocation assigned to handler.",
      timestamp: new Date(Date.now() - 19 * 60000).toISOString(),
    },
    {
      id: "tl-3",
      uldId: "ULD-5521",
      type: "Acknowledged",
      detail: "Supervisor accepted customs clearance intervention.",
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    },
  ],
  assistantMessages: [
    {
      id: "msg-1",
      role: "assistant",
      text: "Offline fallback loaded. Ask about exposure policy, intervention playbooks, or recovery procedures.",
    },
  ],
  analyticsHistory: buildAnalyticsHistorySeed(),
  appendAssistantMessage: (message) =>
    set((state) => ({
      assistantMessages: [
        ...state.assistantMessages,
        { id: crypto.randomUUID(), role: message.role, text: message.text },
      ],
    })),
  tickClock: (timestamp) => set({ now: timestamp ?? Date.now() }),
  setActiveTab: (activeTab) => set({ activeTab }),
  selectUld: (selectedUldId) => set({ selectedUldId }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  toggleSyncDrawer: () => set((state) => ({ syncDrawerOpen: !state.syncDrawerOpen })),
  queueAction: (type, label) => {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      type,
      label,
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const newQueue = [item, ...state.queue];
      saveQueueToStorage(newQueue);
      return { queue: newQueue };
    });
  },
  flushQueue: () => {
    const currentQueue = get().queue;
    if (currentQueue.length === 0) return;
    set({ syncStatus: "syncing" });
    window.setTimeout(() => {
      saveQueueToStorage([]);
      set({ queue: [], syncStatus: navigator.onLine ? "online" : "offline" });
      try {
        localStorage.setItem(SYNC_STORAGE_KEY, new Date().toISOString());
      } catch {
        console.warn("[Store] Failed to persist last sync timestamp");
      }
    }, 1200);
  },
  attemptSyncRecovery: () => {
    const state = get();
    if (!navigator.onLine || state.queue.length === 0) return;
    if (state.syncStatus === "syncing") return;
    state.flushQueue();
  },
  markTaskCompleted: (taskId) => {
    set((state) => {
      const tasks = state.tasks.map((task) =>
        task.id === taskId ? { ...task, status: "Completed" as const } : task,
      );
      const timeline = [
        {
          id: crypto.randomUUID(),
          uldId: state.tasks.find((task) => task.id === taskId)?.uldId || state.selectedUldId,
          type: "Executed" as const,
          detail: `Task ${taskId} completed and awaiting thermal verification.`,
          timestamp: new Date().toISOString(),
        },
        ...state.timeline,
      ];
      return {
        tasks,
        timeline,
        analyticsHistory: appendAnalyticsPoint(state.analyticsHistory, {
          ulds: state.ulds,
          alerts: state.alerts,
          tasks,
        }),
      };
    });
    get().queueAction("task.complete", `Complete intervention ${taskId}`);
    get().pulse([`task:${taskId}`]);
  },
  markInventoryUsed: (itemId) => {
    set((state) => ({
      inventory: state.inventory.map((item) =>
        item.id === itemId
          ? {
              ...item,
              stock: Math.max(0, item.stock - 1),
              status: item.stock - 1 <= Math.floor(item.capacity * 0.35) ? "Low" : item.stock - 1 <= Math.floor(item.capacity * 0.55) ? "Watch" : "Healthy",
            }
          : item,
      ),
    }));
    get().queueAction("inventory.use", `Inventory consumption ${itemId}`);
    get().pulse([`inventory:${itemId}`]);
  },
  createIncident: (payload) => {
    const incident: IncidentItem = {
      id: crypto.randomUUID(),
      status: "Open",
      timestamp: new Date().toISOString(),
      ...payload,
    };
    set((state) => ({
      incidents: [incident, ...state.incidents],
    }));
    get().queueAction("incident.create", `${payload.type} incident logged`);
    get().pulse(["incidents"]);
  },
  addAssistantPrompt: (prompt) => {
    const fallback = navigator.onLine
      ? `Live link available. Current recommendation: validate intervention workflow for ${get().selectedUldId}.`
      : "Offline mode active. Cached playbook: move pallet to controlled storage, assign supervisor review, verify recovery telemetry.";

    set((state) => ({
      assistantMessages: [
        ...state.assistantMessages,
        { id: crypto.randomUUID(), role: "user", text: prompt },
        { id: crypto.randomUUID(), role: "assistant", text: fallback },
      ],
    }));
    get().queueAction("assistant.prompt", prompt);
  },
  mergeControlCenter: (payload) => {
    set((state) => {
      const ulds = payload.ulds ?? state.ulds;
      const tasks = payload.tasks ?? state.tasks;
      const alerts = payload.alerts ?? state.alerts;
      const timeline = payload.timeline ?? state.timeline;

      return {
        ulds,
        tasks,
        alerts,
        timeline,
        analyticsHistory: appendAnalyticsPoint(state.analyticsHistory, {
          ulds,
          alerts,
          tasks,
        }),
      };
    });
  },
  pulse: (keys) => {
    set((state) => {
      const flashes = { ...state.flashes };
      keys.forEach((key) => {
        flashes[key] = true;
        const activeTimer = flashTimers.get(key);
        if (activeTimer) window.clearTimeout(activeTimer);
        const nextTimer = window.setTimeout(() => {
          set((current) => {
            const nextFlashes = { ...current.flashes };
            delete nextFlashes[key];
            return { flashes: nextFlashes };
          });
          flashTimers.delete(key);
        }, 320);
        flashTimers.set(key, nextTimer);
      });
      return { flashes };
    });
  },
}));

function appendAnalyticsPoint(
  history: AnalyticsPoint[],
  payload: Pick<AeroState, "ulds" | "alerts" | "tasks">,
) {
  const point = buildAnalyticsPoint(payload);
  const lastPoint = history[0];

  if (
    lastPoint &&
    lastPoint.averageExposureScore === point.averageExposureScore &&
    lastPoint.averageRiskScore === point.averageRiskScore &&
    lastPoint.highRiskCount === point.highRiskCount &&
    lastPoint.alertCount === point.alertCount &&
    lastPoint.pendingTaskCount === point.pendingTaskCount
  ) {
    return history;
  }

  return [...history, point].slice(-24);
}

function buildAnalyticsPoint(payload: Pick<AeroState, "ulds" | "alerts" | "tasks">): AnalyticsPoint {
  const uldCount = payload.ulds.length || 1;
  const averageExposureScore = Number(
    (
      payload.ulds.reduce((sum, item) => sum + item.exposureScore, 0) / uldCount
    ).toFixed(1),
  );
  const averageRiskScore = Number(
    (
      payload.ulds.reduce((sum, item) => sum + item.riskScore, 0) / uldCount
    ).toFixed(2),
  );

  return {
    timestamp: new Date().toISOString(),
    averageExposureScore,
    averageRiskScore,
    highRiskCount: payload.ulds.filter((item) => item.risk === "HIGH").length,
    alertCount: payload.alerts.length,
    pendingTaskCount: payload.tasks.filter((item) => item.status !== "Completed").length,
  };
}

function buildAnalyticsHistorySeed() {
  const now = Date.now();
  return Array.from({ length: 6 }, (_, index) => ({
    timestamp: new Date(now - (5 - index) * 60000).toISOString(),
    averageExposureScore: 48 + index * 3,
    averageRiskScore: Number((0.34 + index * 0.05).toFixed(2)),
    highRiskCount: Math.max(1, Math.round(1 + index / 2)),
    alertCount: Math.max(1, Math.round(2 + index / 3)),
    pendingTaskCount: Math.max(1, Math.round(3 - index / 3)),
  }));
}
