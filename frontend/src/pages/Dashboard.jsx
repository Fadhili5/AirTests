import { useEffect, useMemo, useState } from "react";
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

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function Dashboard({ socket }) {
  const [fleet, setFleet] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [selectedUld, setSelectedUld] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [uldActions, setUldActions] = useState([]);
  const [uldWorkflows, setUldWorkflows] = useState([]);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedUld) return;
    loadUldDetail(selectedUld);
  }, [selectedUld]);

  useEffect(() => {
    socket.on("fleet", setFleet);
    socket.on("telemetry", (event) => {
      setFleet((current) => upsertFleet(current, event.status));
      setTelemetry((current) => [event, ...current].slice(0, 100));
      if (event.status.uldId === selectedUld) {
        setTimeline((current) => [
          {
            type: "TELEMETRY",
            at: event.reading.timestamp,
            status: event.status,
            risk: event.risk,
            reading: event.reading,
          },
          ...current,
        ].slice(0, 100));
      }
    });
    socket.on("alert", (alert) => {
      setAlerts((current) => [alert, ...current].slice(0, 50));
    });
    socket.on("action", (action) => {
      setPendingActions((current) => upsertById(current, action).filter((item) => item.status !== "COMPLETED"));
      if (action.uldId === selectedUld) {
        setUldActions((current) => upsertById(current, action));
      }
    });
    socket.on("workflow", (workflow) => {
      setWorkflows((current) => upsertById(current, workflow));
      if (workflow.uldId === selectedUld) {
        setUldWorkflows((current) => upsertById(current, workflow));
      }
    });
    socket.on("risk-update", ({ uldId, risk, operationalContext }) => {
      setFleet((current) =>
        current.map((item) =>
          item.uldId === uldId
            ? {
                ...item,
                lastRisk: {
                  score: risk.risk_score,
                  level: risk.risk_level,
                  timeToBreachMinutes: risk.time_to_breach_minutes,
                },
                operationalContext,
              }
            : item,
        ),
      );
    });

    return () => {
      socket.off("fleet");
      socket.off("telemetry");
      socket.off("alert");
      socket.off("action");
      socket.off("workflow");
      socket.off("risk-update");
    };
  }, [socket, selectedUld]);

  const selectedFleetItem = fleet.find((item) => item.uldId === selectedUld) || null;
  const selectedTelemetry = useMemo(
    () =>
      telemetry
        .filter((item) => item.status.uldId === selectedUld)
        .slice()
        .reverse(),
    [telemetry, selectedUld],
  );

  return (
    <div className="layout">
      <header className="hero">
        <div>
          <p className="eyebrow">AeroSentinel X</p>
          <h1>Predictive cold chain control center</h1>
          <p className="lede">
            Detection, prediction, mitigation, and verification for temperature-controlled
            air cargo operations.
          </p>
        </div>
        <div className="hero-status">
          <StatusCard label="API Security" value={platform?.apiSecurity || "loading"} />
          <StatusCard label="Predictive Risk" value={platform?.features?.predictiveRisk ? "online" : "offline"} />
          <StatusCard label="Pending Actions" value={String(pendingActions.length)} />
          <StatusCard label="Open Workflows" value={String(workflows.length)} />
        </div>
      </header>

      <section className="stats-strip">
        <StatusCard label="Compliant Shipments" value={`${analytics?.compliantShipmentsPercent ?? "--"}%`} />
        <StatusCard label="Average Exposure" value={`${analytics?.averageExposureMinutes ?? "--"} min`} />
        <StatusCard label="Warnings" value={String(analytics?.warningCount ?? 0)} />
        <StatusCard label="Breaches" value={String(analytics?.breachCount ?? 0)} />
      </section>

      <div className="grid">
        <section className="panel map-panel wide">
          <div className="panel-head">
            <h2>Global Operations Map</h2>
            <span className="panel-note">Risk heat colors and live ULD positions</span>
          </div>
          <MapContainer center={[20, 10]} zoom={2} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {fleet.map((item) => (
              <CircleMarker
                key={item.uldId}
                center={[item.lastLocation?.lat || 0, item.lastLocation?.lon || 0]}
                radius={11}
                pathOptions={{ color: fleetColor(item) }}
                eventHandlers={{ click: () => setSelectedUld(item.uldId) }}
              >
                <Popup>
                  <strong>{item.uldId}</strong>
                  <br />
                  Risk: {item.lastRisk?.level || "LOW"}
                  <br />
                  Status: {item.status}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Alerts Feed</h2>
            <span className="panel-note">Live operational and compliance events</span>
          </div>
          <div className="alert-list">
            {alerts.length === 0 ? (
              <article className="empty-state">No alerts yet.</article>
            ) : (
              alerts.map((alert) => (
                <article key={alert.id || `${alert.uld_id}-${alert.occurred_at}`} className={`alert ${String(alert.status).toLowerCase()}`}>
                  <strong>{alert.uld_id}</strong>
                  <p>{alert.message}</p>
                  <small>
                    {alert.status} • {formatNumber(alert.temperature)} C • {alert.airport_code || "UNK"}
                  </small>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Operations Panel</h2>
            <span className="panel-note">Pending actions and SLA timers</span>
          </div>
          <div className="ops-list">
            {pendingActions.length === 0 ? (
              <article className="empty-state">No pending actions.</article>
            ) : (
              pendingActions.slice(0, 8).map((action) => (
                <article key={action.id} className="ops-item">
                  <div>
                    <strong>{action.action}</strong>
                    <p>{action.uldId}</p>
                  </div>
                  <div className="ops-meta">
                    <span className={`badge ${String(action.priority).toLowerCase()}`}>{action.priority}</span>
                    <button className="action-btn" onClick={() => completeAction(action.id)}>
                      Mark Complete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>ULD Detail</h2>
            <span className="panel-note">{selectedUld || "Select a ULD from the map"}</span>
          </div>
          {selectedFleetItem ? (
            <div className="detail-grid">
              <MetricRow label="Status" value={selectedFleetItem.status} tone={selectedFleetItem.status.toLowerCase()} />
              <MetricRow label="Risk Level" value={selectedFleetItem.lastRisk?.level || "LOW"} />
              <MetricRow label="Risk Score" value={String(selectedFleetItem.lastRisk?.score ?? "--")} />
              <MetricRow label="Time To Breach" value={`${selectedFleetItem.lastRisk?.timeToBreachMinutes ?? "--"} min`} />
              <MetricRow label="Exposure Used" value={`${selectedFleetItem.exposureUsed} min`} />
              <MetricRow label="Exposure Remaining" value={`${selectedFleetItem.exposureRemaining} min`} />
              <MetricRow label="Ambient" value={`${formatNumber(selectedFleetItem.weather?.ambientTempCelsius)} C`} />
              <MetricRow label="Zone" value={selectedFleetItem.operationalContext?.airportZone || "UNKNOWN"} />
              <MetricRow label="Delay" value={selectedFleetItem.operationalContext?.delayDetected ? "Yes" : "No"} />
              <MetricRow label="Handling Gap" value={selectedFleetItem.operationalContext?.handlingGap ? "Detected" : "No"} />
            </div>
          ) : (
            <article className="empty-state">No ULD selected.</article>
          )}
        </section>

        <section className="panel wide">
          <div className="panel-head">
            <h2>Risk & Temperature Trend</h2>
            <span className="panel-note">Telemetry, ambient conditions, and predictive horizon</span>
          </div>
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
                  backgroundColor: "rgba(15,118,110,0.18)",
                },
                {
                  label: "Ambient",
                  data: selectedTelemetry.map((item) => item.reading.ambient_temp),
                  borderColor: "#d97706",
                  backgroundColor: "rgba(217,119,6,0.18)",
                },
                {
                  label: "Risk score x10",
                  data: selectedTelemetry.map((item) => (item.risk?.risk_score || 0) * 10),
                  borderColor: "#dc2626",
                  backgroundColor: "rgba(220,38,38,0.18)",
                },
              ],
            }}
          />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Workflow Engine</h2>
            <span className="panel-note">SOP enforcement and escalation</span>
          </div>
          <div className="workflow-list">
            {uldWorkflows.length === 0 ? (
              <article className="empty-state">No active workflows for this ULD.</article>
            ) : (
              uldWorkflows.map((workflow) => (
                <article key={workflow.id} className="workflow-item">
                  <strong>{workflow.name}</strong>
                  <p>{workflow.status}</p>
                  <div className="workflow-steps">
                    {workflow.steps.map((step) => (
                      <span key={step.id} className={`step-chip ${step.status.toLowerCase()}`}>
                        {step.label}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Action Timeline</h2>
            <span className="panel-note">Detection → decision → action → verification</span>
          </div>
          <div className="timeline-list">
            {timeline.length === 0 ? (
              <article className="empty-state">No timeline data yet.</article>
            ) : (
              timeline.slice(0, 12).map((item, index) => (
                <article key={`${item.type}-${item.at || item.createdAt || index}`} className="timeline-item">
                  <strong>{item.type}</strong>
                  <p>{timelineMessage(item)}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel wide">
          <div className="panel-head">
            <h2>Compliance Analytics</h2>
            <span className="panel-note">Handler performance and compliance KPIs</span>
          </div>
          <div className="analytics-grid">
            {(analytics?.handlerPerformance || []).map((handler) => (
              <article key={handler.handler} className="analytics-card">
                <strong>{handler.handler}</strong>
                <p>Compliance: {handler.compliancePercent}%</p>
                <p>Avg response: {handler.avgResponseMinutes} min</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  async function bootstrap() {
    const [controlResponse, platformResponse] = await Promise.all([
      axios.get(`${apiUrl}/api/control-center`, { headers: authHeader() }),
      axios.get(`${apiUrl}/api/platform`, { headers: authHeader() }),
    ]);
    setFleet(controlResponse.data.fleet);
    setAlerts(controlResponse.data.alerts);
    setPendingActions(controlResponse.data.pendingActions);
    setWorkflows(controlResponse.data.workflows);
    setAnalytics(controlResponse.data.analytics);
    setPlatform(platformResponse.data);
    const firstUld = controlResponse.data.fleet[0]?.uldId || null;
    setSelectedUld(firstUld);
  }

  async function loadUldDetail(uldId) {
    const [statusResponse, actionsResponse, workflowsResponse, timelineResponse] = await Promise.all([
      axios.get(`${apiUrl}/api/uld/${uldId}/status`, { headers: authHeader() }),
      axios.get(`${apiUrl}/api/uld/${uldId}/actions`, { headers: authHeader() }),
      axios.get(`${apiUrl}/api/uld/${uldId}/workflows`, { headers: authHeader() }),
      axios.get(`${apiUrl}/api/uld/${uldId}/timeline`, { headers: authHeader() }),
    ]);
    setTelemetry(
      statusResponse.data.telemetry.map((reading) => ({
        reading,
        status: {
          ...(fleet.find((item) => item.uldId === uldId) || selectedFleetItem || {}),
        },
        risk: selectedFleetItem?.lastRisk
          ? {
              risk_score: selectedFleetItem.lastRisk.score,
              risk_level: selectedFleetItem.lastRisk.level,
              time_to_breach_minutes: selectedFleetItem.lastRisk.timeToBreachMinutes,
            }
          : null,
      })),
    );
    setUldActions(actionsResponse.data);
    setUldWorkflows(workflowsResponse.data);
    setTimeline(timelineResponse.data);
  }

  async function completeAction(actionId) {
    await axios.post(`${apiUrl}/api/actions/${actionId}/complete`, {}, {
      headers: authHeader(),
    });
    const controlResponse = await axios.get(`${apiUrl}/api/control-center`, { headers: authHeader() });
    setPendingActions(controlResponse.data.pendingActions);
    setWorkflows(controlResponse.data.workflows);
    setAlerts(controlResponse.data.alerts);
    setAnalytics(controlResponse.data.analytics);
    if (selectedUld) {
      await loadUldDetail(selectedUld);
    }
  }
}

function StatusCard({ label, value }) {
  return (
    <div className="status-card">
      <span className="status-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricRow({ label, value, tone }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong className={tone ? `tone-${tone}` : ""}>{value}</strong>
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
    next[index] = { ...next[index], ...status };
  } else {
    next.push(status);
  }
  return next;
}

function upsertById(list, item) {
  const next = [...list];
  const index = next.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    next[index] = item;
  } else {
    next.unshift(item);
  }
  return next;
}

function fleetColor(item) {
  if (item.status === "BREACH" || item.lastRisk?.level === "HIGH") return "#dc2626";
  if (item.status === "WARNING" || item.lastRisk?.level === "MEDIUM") return "#d97706";
  return "#16a34a";
}

function timelineMessage(item) {
  if (item.type === "TELEMETRY") {
    return `${item.reading.temperature_celsius.toFixed(1)} C, risk ${item.risk?.risk_level || "LOW"}`;
  }
  if (item.type === "ACTION" || item.type === "ACTION_UPDATE") {
    return `${item.action} (${item.status})`;
  }
  if (item.type === "WORKFLOW") {
    return `${item.name} opened`;
  }
  return item.message || "Event recorded";
}

function formatNumber(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return Number(value).toFixed(1);
}
