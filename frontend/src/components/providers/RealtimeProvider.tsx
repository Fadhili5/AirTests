import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useAeroStore } from "../../store/use-aero-store";
import type { TimelineEvent } from "../../types";
import {
  authHeader,
  mapAlertItem,
  mapActionToTask,
  mapFleetToUld,
  mapTelemetryToUld,
  replaceById,
  updateUlds,
} from "../../lib/aero-control";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const store = useAeroStore();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const onOffline = () => store.setSyncStatus("offline");
    const onOnline = () => {
      store.setSyncStatus("syncing");
      store.flushQueue();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [store]);

  useEffect(() => {
    let socket: ReturnType<typeof io> | null = null;

    void bootstrap();

    try {
      socket = io(socketUrl, { autoConnect: true, reconnectionAttempts: 5, timeout: 10000 });

      socket.on("connect_error", (err) => {
        console.error("[Realtime] Socket connect error:", err.message);
        setConnectionError(`Socket connection failed: ${err.message}`);
        store.setSyncStatus(navigator.onLine ? "syncing" : "offline");
      });

      socket.on("connect", () => {
        setConnectionError(null);
      });

      socket.on("telemetry", (event) => {
        try {
          const uld = mapTelemetryToUld(event);
          store.mergeControlCenter({
            ulds: updateUlds(store.ulds, uld),
            timeline: [
              {
                id: crypto.randomUUID(),
                uldId: uld.id,
                type: "Verified" as const,
                detail: `Telemetry refreshed for ${uld.id}.`,
                timestamp: event.reading?.timestamp ?? new Date().toISOString(),
              },
              ...store.timeline,
            ].slice(0, 20) as TimelineEvent[],
          });
          store.pulse([`uld:${uld.id}`, `timeline:${uld.id}`]);
        } catch (err) {
          console.error("[Realtime] Error processing telemetry:", err);
        }
      });

      socket.on("alert", (alert) => {
        try {
          store.mergeControlCenter({
            alerts: [mapAlertItem(alert, store.selectedUldId), ...store.alerts].slice(0, 20),
          });
          store.pulse(["alerts"]);
        } catch (err) {
          console.error("[Realtime] Error processing alert:", err);
        }
      });

      socket.on("action", (action) => {
        try {
          const nextTask = mapActionToTask(action);
          store.mergeControlCenter({
            tasks: replaceById(store.tasks, nextTask),
            timeline: [
              {
                id: crypto.randomUUID(),
                uldId: action.uldId,
                type: action.status === "COMPLETED" ? "Executed" : "Assigned",
                detail: `${action.action} ${action.status === "COMPLETED" ? "completed" : "issued"} for ${action.uldId}.`,
                timestamp: action.completedAt || action.createdAt,
              },
              ...store.timeline,
            ].slice(0, 20) as TimelineEvent[],
          });
          store.pulse([`task:${action.id}`]);
        } catch (err) {
          console.error("[Realtime] Error processing action:", err);
        }
      });

      socket.on("workflow", (workflow) => {
        try {
          store.mergeControlCenter({
            timeline: [
              {
                id: crypto.randomUUID(),
                uldId: workflow.uldId,
                type: "Acknowledged",
                detail: `${workflow.name} acknowledged for ${workflow.uldId}.`,
                timestamp: workflow.createdAt,
              },
              ...store.timeline,
            ].slice(0, 20) as TimelineEvent[],
          });
          store.pulse([`timeline:${workflow.uldId}`]);
        } catch (err) {
          console.error("[Realtime] Error processing workflow:", err);
        }
      });
    } catch (err) {
      console.error("[Realtime] Socket initialization failed:", err);
      setConnectionError("Failed to initialize realtime connection.");
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  async function bootstrap() {
    try {
      const controlResponse = await axios.get(`${apiUrl}/api/control-center`, { headers: authHeader(), timeout: 8000 });
      const fleet = (controlResponse.data.fleet || []).map(mapFleetToUld);
      const nextTasks = (controlResponse.data.pendingActions || []).map(mapActionToTask);
      const nextAlerts = (controlResponse.data.alerts || []).map((item: any) => mapAlertItem(item, store.selectedUldId));

      store.mergeControlCenter({
        ulds: fleet.length > 0 ? fleet : undefined,
        tasks: nextTasks.length > 0 ? nextTasks : undefined,
        alerts: nextAlerts.length > 0 ? nextAlerts : undefined,
      });
    } catch (err) {
      console.error("[Realtime] Bootstrap API error:", err);
      store.setSyncStatus(navigator.onLine ? "syncing" : "offline");
    }
  }

  return (
    <>
      {connectionError && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
          ⚠ {connectionError}
        </div>
      )}
      {children}
    </>
  );
}
