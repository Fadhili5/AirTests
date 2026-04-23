import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJs,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import axios from "axios";

ChartJs.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

export function Dashboard({ socket }) {
  const [fleet, setFleet] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedUld, setSelectedUld] = useState(null);
  const [telemetry, setTelemetry] = useState([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/fleet`, {
      headers: authHeader(),
    }).then((response) => {
      setFleet(response.data);
      setSelectedUld(response.data[0]?.uldId || null);
    });
  }, []);

  useEffect(() => {
    socket.on("fleet", setFleet);
    socket.on("telemetry", (event) => {
      setFleet((current) => upsertFleet(current, event.status));
      setTelemetry((current) => [event, ...current].slice(0, 50));
    });
    socket.on("alert", (alert) => setAlerts((current) => [alert, ...current].slice(0, 25)));

    return () => {
      socket.off("fleet");
      socket.off("telemetry");
      socket.off("alert");
    };
  }, [socket]);

  const selectedTelemetry = telemetry
    .filter((item) => item.status.uldId === selectedUld)
    .slice()
    .reverse();

  return (
    <div className="layout">
      <header className="hero">
        <div>
          <p className="eyebrow">OR-ATM</p>
          <h1>Cold chain compliance in real time</h1>
          <p className="lede">
            MQTT telemetry, Redis exposure tracking, ONE Record digital twins, and
            live operational alerts.
          </p>
        </div>
      </header>
      <div className="grid">
        <section className="panel map-panel">
          <h2>Live ULD map</h2>
          <MapContainer center={[20, 10]} zoom={2} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {fleet.map((item) => (
              <CircleMarker
                key={item.uldId}
                center={[item.lastLocation?.lat || 0, item.lastLocation?.lon || 0]}
                radius={10}
                pathOptions={{ color: statusColor(item.status) }}
                eventHandlers={{ click: () => setSelectedUld(item.uldId) }}
              >
                <Popup>
                  <strong>{item.uldId}</strong>
                  <br />
                  {item.status}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </section>

        <section className="panel">
          <h2>Alert feed</h2>
          <div className="alert-list">
            {alerts.map((alert) => (
              <article key={`${alert.uld_id}-${alert.exposure_used}`} className={`alert ${alert.status.toLowerCase()}`}>
                <strong>{alert.uld_id}</strong>
                <p>{alert.message}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>ULD detail</h2>
          {fleet
            .filter((item) => item.uldId === selectedUld)
            .map((item) => (
              <div key={item.uldId} className="detail-card">
                <div className={`badge ${item.status.toLowerCase()}`}>{item.status}</div>
                <h3>{item.uldId}</h3>
                <p>Exposure remaining: {item.exposureRemaining} min</p>
                <p>Weather: {item.weather?.weatherCondition || "Unknown"}</p>
                <p>Temperature: {item.lastTemperatureCelsius} C</p>
              </div>
            ))}
        </section>

        <section className="panel wide">
          <h2>Temperature chart</h2>
          <Line
            data={{
              labels: selectedTelemetry.map((item) =>
                new Date(item.reading.timestamp).toLocaleTimeString(),
              ),
              datasets: [
                {
                  label: "ULD temperature",
                  data: selectedTelemetry.map((item) => item.reading.temperature_celsius),
                  borderColor: "#0f766e",
                  backgroundColor: "rgba(15,118,110,0.25)",
                },
                {
                  label: "Ambient",
                  data: selectedTelemetry.map((item) => item.reading.ambient_temp),
                  borderColor: "#d97706",
                  backgroundColor: "rgba(217,119,6,0.25)",
                },
              ],
            }}
          />
        </section>
      </div>
    </div>
  );
}

function authHeader() {
  const token = localStorage.getItem("or_atm_token");
  if (import.meta.env.VITE_AUTH_DISABLED === "true") {
    return {};
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function upsertFleet(fleet, status) {
  const next = [...fleet];
  const index = next.findIndex((item) => item.uldId === status.uldId);
  if (index >= 0) {
    next[index] = status;
  } else {
    next.push(status);
  }
  return next;
}

function statusColor(status) {
  if (status === "BREACH") return "#dc2626";
  if (status === "WARNING") return "#d97706";
  return "#16a34a";
}
