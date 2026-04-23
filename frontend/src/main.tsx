import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { App } from "./App";
import { useAeroStore } from "./store/use-aero-store";
import { initAuth } from "./auth";
import { registerServiceWorker } from "./register-sw";

function SyncRecoveryEffect() {
  const setSyncStatus = useAeroStore((state) => state.setSyncStatus);
  const attemptSyncRecovery = useAeroStore((state) => state.attemptSyncRecovery);

  React.useEffect(() => {
    const handleOnline = () => {
      setSyncStatus("online");
      attemptSyncRecovery();
    };

    const handleOffline = () => {
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setSyncStatus, attemptSyncRecovery]);

  return null;
}

async function bootstrap() {
  await initAuth();
  registerServiceWorker();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
      <SyncRecoveryEffect />
    </React.StrictMode>,
  );
}

void bootstrap();
