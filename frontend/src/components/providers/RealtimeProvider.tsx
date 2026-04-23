import { useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useAeroStore } from "../../store/use-aero-store";
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
    void bootstrap();

    const socket = io(socketUrl, { autoConnect: true });

    socket.on("telemetry", (event) => {
      const uld = mapTelemetryToUld(event);
      store.mergeControlCenter({
        ulds: updateUlds(store.ulds, uld),
        timeline: [
          {
            id: crypto.randomUUID(),
            uldId: uld.id,
            type: "Verified",
            detail: `Telemetry refreshed for ${uld.id}.`,
            timestamp: event.reading.timestamp,
          },
          ...store.timeline,
        ].slice(0, 20),
      });
      store.pulse([`uld:${uld.id}`, `timeline:${uld.id}`]);
    });

    socket.on("alert", (alert) => {
      store.mergeControlCenter({
        alerts: [mapAlertItem(alert, store.selectedUldId), ...store.alerts].slice(0, 20),
      });
      store.pulse(["alerts"]);
    });

    socket.on("action", (action) => {
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
        ].slice(0, 20),
      });
      store.pulse([`task:${action.id}`]);
    });

    socket.on("workflow", (workflow) => {
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
        ].slice(0, 20),
      });
      store.pulse([`timeline:${workflow.uldId}`]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function bootstrap() {
    try {
      const controlResponse = await axios.get(`${apiUrl}/api/control-center`, { headers: authHeader() });
      const fleet = (controlResponse.data.fleet || []).map(mapFleetToUld);
      const nextTasks = (controlResponse.data.pendingActions || []).map(mapActionToTask);
      const nextAlerts = (controlResponse.data.alerts || []).map((item: any) => mapAlertItem(item, store.selectedUldId));

      store.mergeControlCenter({
        ulds: fleet.length > 0 ? fleet : undefined,
        tasks: nextTasks.length > 0 ? nextTasks : undefined,
        alerts: nextAlerts.length > 0 ? nextAlerts : undefined,
      });
    } catch {
      if (store.queue.length > 0) {
        store.setSyncStatus(navigator.onLine ? "syncing" : "offline");
      }
    }
  }

  return <>{children}</>;
}
