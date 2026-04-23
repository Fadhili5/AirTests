import React from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { Dashboard } from "./pages/Dashboard.jsx";
import { initAuth } from "./auth.js";

async function bootstrap() {
  await initAuth();
  const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000");

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Dashboard socket={socket} />
    </React.StrictMode>,
  );
}

bootstrap();
