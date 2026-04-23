import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJs,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip as MapTooltip } from "react-leaflet";
import axios from "axios";

ChartJs.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const HIGHLIGHT_MS = 320;

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
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rootCauseExpanded, setRootCauseExpanded] = useState(false);
  const [flashKeys, setFlashKeys] = useState({});
  const timersRef = useRef(new Map());

  useEffect(() => {
    bootstrap();

    return () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!selectedUld) return;
    loadUldDetail(selectedUld);
  }, [selectedUld]);

  useEffect(() => {
    socket.on("fleet", (nextFleet) => {
      setFleet(nextFleet);
      pulseKeys(nextFleet.map((item) => `fleet:${item.uldId}`));
    });

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

      pulseKeys([
        `fleet:${event.status.uldId}`,
        `compliance:${event.status.uldId}`,
        `recommendation:${event.status.uldId}`,
        `chart:${event.status.uldId}`,
      ]);
    });

    socket.on("alert", (alert) => {
      setAlerts((current) => [alert, ...current].slice(0, 50));
      setTimeline((current) => [
        {
          type: "ALERT",
          at: alert.occurred_at || new Date().toISOString(),
          uldId: alert.uld_id,
          status: alert.status,
          message: alert.message,
        },
        ...current,
      ].slice(0, 100));
      pulseKeys([`alert:${alert.id || alert.uld_id}`, "alerts-feed", `timeline:${alert.uld_id}`]);
    });

    socket.on("action", (action) => {
      setPendingActions((current) => upsertById(current, action).filter((item) => item.status !== "COMPLETED"));
      if (action.uldId === selectedUld) {
        setUldActions((current) => upsertById(current, action));
      }
      setTimeline((current) => [
        {
          type: action.status === "COMPLETED" ? "COMPLETED" : "ASSIGNED",
          at: action.completedAt || action.createdAt,
          uldId: action.uldId,
          action: action.action,
          status: action.status,
        },
        ...current,
      ].slice(0, 100));
      pulseKeys([
        `task:${action.id}`,
        `recommendation:${action.uldId}`,
        `timeline:${action.uldId}`,
        "tasks-panel",
      ]);
    });

    socket.on("workflow", (workflow) => {
      setWorkflows((current) => upsertById(current, workflow));
      if (workflow.uldId === selectedUld) {
        setUldWorkflows((current) => upsertById(current, workflow));
      }
      setTimeline((current) => [
        {
          type: "ACKNOWLEDGED",
          at: workflow.createdAt,
          uldId: workflow.uldId,
          name: workflow.name,
          status: workflow.status,
        },
        ...current,
      ].slice(0, 100));
      pulseKeys([`workflow:${workflow.id}`, `timeline:${workflow.uldId}`]);
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
      pulseKeys([`fleet:${uldId}`, `compliance:${uldId}`, `recommendation:${uldId}`, "geo-zones"]);
    });

    return () => {
      socket.off("fleet");
      socket.off("telemetry");
      socket.off("alert");
      socket.off("action");
      socket.off("workflow");
      socket.off("risk-update");
    };
  }, [selectedUld, socket]);

  const fleetSnapshot = useMemo(() => [...fleet].sort(compareFleetRows), [fleet]);
  const selectedFleetItem = fleetSnapshot.find((item) => item.uldId === selectedUld) || null;
  const selectedTelemetry = useMemo(
    () =>
      telemetry
        .filter((item) => item.status.uldId === selectedUld)
        .slice()
        .reverse(),
    [selectedUld, telemetry],
  );
  const selectedTimeline = useMemo(
    () =>
      timeline
        .filter((item) => !selectedUld || !item.uldId || item.uldId === selectedUld)
        .slice(0, 10),
    [selectedUld, timeline],
  );
  const complianceCards = useMemo(
    () => fleetSnapshot.slice(0, 6).map((item) => buildComplianceCard(item)),
    [fleetSnapshot],
  );
  const recommendationCards = useMemo(
    () =>
      fleetSnapshot
        .slice(0, 6)
        .map((item) => buildRecommendation(item, pendingActions)),
    [fleetSnapshot, pendingActions],
  );
  const taskCards = useMemo(
    () =>
      pendingActions
        .slice()
        .sort(compareActionsByDeadline)
        .slice(0, 8)
        .map((action) => buildTaskCard(action)),
    [pendingActions],
  );
  const activeSelectedActions = useMemo(
    () => uldActions.filter((action) => action.status !== "COMPLETED"),
    [uldActions],
  );
  const rootCause = useMemo(
    () => buildRootCause(selectedFleetItem, activeSelectedActions),
    [activeSelectedActions, selectedFleetItem],
  );
  const chartData = useMemo(
    () => ({
      labels: selectedTelemetry.map((item) =>
        new Date(item.reading.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ),
      datasets: [
        {
          label: "ULD temp",
          data: selectedTelemetry.map((item) => item.reading.temperature_celsius),
          borderColor: "#36d4c3",
          backgroundColor: "rgba(54, 212, 195, 0.14)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.32,
        },
        {
          label: "Ambient",
          data: selectedTelemetry.map((item) => item.reading.ambient_temp),
          borderColor: "#f7b84f",
          backgroundColor: "rgba(247, 184, 79, 0.14)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.28,
        },
        {
          label: "Risk x10",
          data: selectedTelemetry.map((item) => (item.risk?.risk_score || 0) * 10),
          borderColor: "#ff6d6d",
          backgroundColor: "rgba(255, 109, 109, 0.1)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.28,
        },
      ],
    }),
    [selectedTelemetry],
  );
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: false,
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#b9c5db",
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            font: { size: 10 },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#6f85a5", maxTicksLimit: 7, font: { size: 10 } },
          grid: { color: "rgba(111, 133, 165, 0.12)" },
        },
        y: {
          ticks: { color: "#6f85a5", font: { size: 10 } },
          grid: { color: "rgba(111, 133, 165, 0.12)" },
        },
      },
    }),
    [],
  );
  const mapZones = useMemo(() => buildGeoZones(fleetSnapshot), [fleetSnapshot]);
  const heroStats = [
    { label: "Fleet", value: String(analytics?.totalUlds ?? fleetSnapshot.length) },
    { label: "Warnings", value: String(analytics?.warningCount ?? 0) },
    { label: "Breaches", value: String(analytics?.breachCount ?? 0) },
    { label: "Open Tasks", value: String(taskCards.length) },
  ];

  return (
    <div className={`dashboard-shell ${rightPanelOpen ? "drawer-open" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand card">
          <div className="brand-mark">AX</div>
          <div className="brand-copy">
            <p className="brand-kicker">AeroSentinel X</p>
            <h1>Cold Chain Ops</h1>
            <span>Realtime aviation intervention console</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Operations navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} type="button" className={`nav-item ${item.active ? "active" : ""}`}>
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="sidebar-section card">
          <div className="section-heading">
            <span>Operations</span>
            <strong>{platform?.apiSecurity || "loading"}</strong>
          </div>
          <div className="sidebar-metrics">
            {heroStats.map((item) => (
              <MiniMetric key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </section>

        <section className="sidebar-section fleet-section card">
          <div className="section-heading">
            <span>ULD Watchlist</span>
            <strong>{fleetSnapshot.length}</strong>
          </div>
          <div className="fleet-list">
            {fleetSnapshot.length === 0 ? (
              <article className="empty-state">No ULD telemetry loaded.</article>
            ) : (
              fleetSnapshot.map((item) => (
                <button
                  key={item.uldId}
                  type="button"
                  className={`fleet-row card ${selectedUld === item.uldId ? "selected" : ""} ${isFlashing(`fleet:${item.uldId}`, flashKeys) ? "flash" : ""}`}
                  onClick={() => setSelectedUld(item.uldId)}
                >
                  <div className="fleet-row-main">
                    <strong>{item.uldId}</strong>
                    <span>{item.lastLocation?.airportCode || item.airportCode || "IN-TRANSIT"}</span>
                  </div>
                  <div className="fleet-row-meta">
                    <span className={`risk-dot risk-${riskTone(item)}`} />
                    <span>{item.lastRisk?.level || item.status || "NORMAL"}</span>
                    <span>{formatNumber(item.lastTemperatureCelsius ?? item.lastKnownTemp)} C</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Live Intelligence</p>
            <h2>Cold-chain operations intelligence board</h2>
          </div>
          <div className="header-actions">
            <StatusPill label="Selection" value={selectedUld || "none"} />
            <StatusPill label="Risk Engine" value={platform?.features?.predictiveRisk ? "online" : "offline"} />
            <button type="button" className="drawer-toggle" onClick={() => setRightPanelOpen((current) => !current)}>
              Alerts
            </button>
          </div>
        </header>

        <section className="compliance-strip">
          <div className="section-title-row">
            <div>
              <h3>Compliance Scorecard</h3>
              <p>Per-ULD compliance, exposure posture, and live trend direction.</p>
            </div>
          </div>
          <div className="compliance-grid">
            {complianceCards.map((item) => (
              <ComplianceCard key={item.uldId} item={item} flashing={isFlashing(`compliance:${item.uldId}`, flashKeys)} />
            ))}
          </div>
        </section>

        <section className="center-grid">
          <section className="intelligence-column">
            <section className="panel-surface card recommended-panel">
              <div className="panel-head">
                <div>
                  <h3>Recommended Actions</h3>
                  <p>Smart intervention engine tuned for cold-zone, QA, and delay actions.</p>
                </div>
              </div>
              <div className="recommendation-grid">
                {recommendationCards.map((item) => (
                  <RecommendedActionCard
                    key={item.uldId}
                    item={item}
                    flashing={isFlashing(`recommendation:${item.uldId}`, flashKeys)}
                  />
                ))}
              </div>
            </section>

            <section className="panel-surface card map-stage">
              <div className="panel-head">
                <div>
                  <h3>Geo-Risk Operations Map</h3>
                  <p>Hover risk zones for tarmac exposure context and ULD location state.</p>
                </div>
                <div className="panel-inline-stats">
                  <InlineStat label="Selected Risk" value={selectedFleetItem?.lastRisk?.level || "LOW"} />
                  <InlineStat
                    label="Intervene"
                    value={
                      selectedFleetItem?.lastRisk?.timeToBreachMinutes !== undefined
                        ? `${selectedFleetItem.lastRisk.timeToBreachMinutes} min`
                        : "--"
                    }
                  />
                </div>
              </div>
              <div className="map-grid">
                <div className="map-surface">
                  <MapContainer center={[20, 10]} zoom={2} scrollWheelZoom={false}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <GeoRiskZones zones={mapZones} />
                    <FleetMarkers fleet={fleetSnapshot} onSelect={setSelectedUld} />
                  </MapContainer>
                </div>
                <div className={`map-zone-grid ${isFlashing("geo-zones", flashKeys) ? "flash" : ""}`}>
                  {mapZones.map((zone) => (
                    <MapZoneLegend key={zone.id} zone={zone} />
                  ))}
                </div>
              </div>
            </section>
          </section>

          <section className="analysis-column">
            <section className="panel-surface card detail-panel">
              <div className="panel-head">
                <div>
                  <h3>Selected ULD</h3>
                  <p>{selectedUld || "Select a ULD from the map or watchlist."}</p>
                </div>
                <div className="panel-inline-stats">
                  <InlineStat label="Actions" value={String(activeSelectedActions.length)} />
                  <InlineStat label="Flows" value={String(uldWorkflows.length)} />
                </div>
              </div>
              {selectedFleetItem ? (
                <div className="detail-grid">
                  <MetricRow label="Status" value={selectedFleetItem.status} tone={selectedFleetItem.status.toLowerCase()} />
                  <MetricRow label="Risk Level" value={selectedFleetItem.lastRisk?.level || "LOW"} tone={riskTone(selectedFleetItem)} />
                  <MetricRow label="Risk Score" value={String(selectedFleetItem.lastRisk?.score ?? "--")} />
                  <MetricRow label="Breach ETA" value={`${selectedFleetItem.lastRisk?.timeToBreachMinutes ?? "--"} min`} />
                  <MetricRow label="Exposure Used" value={`${selectedFleetItem.exposureUsed ?? "--"} min`} />
                  <MetricRow label="Exposure Left" value={`${selectedFleetItem.exposureRemaining ?? "--"} min`} />
                  <MetricRow label="Ambient" value={`${formatNumber(selectedFleetItem.weather?.ambientTempCelsius)} C`} />
                  <MetricRow label="Zone" value={selectedFleetItem.operationalContext?.airportZone || "UNKNOWN"} />
                  <MetricRow label="Delay" value={selectedFleetItem.operationalContext?.delayDetected ? "Detected" : "Clear"} />
                  <MetricRow label="Handling Gap" value={selectedFleetItem.operationalContext?.handlingGap ? "Detected" : "Clear"} />
                </div>
              ) : (
                <article className="empty-state">No ULD selected.</article>
              )}
            </section>

            <section className="panel-surface card chart-panel">
              <div className="panel-head">
                <div>
                  <h3>Temperature Trend</h3>
                  <p>Responsive telemetry panel with dense axis treatment.</p>
                </div>
                <div className="panel-inline-stats">
                  <InlineStat label="Telemetry" value={String(selectedTelemetry.length)} />
                  <InlineStat label="Ambient" value={`${formatNumber(selectedFleetItem?.weather?.ambientTempCelsius)} C`} />
                </div>
              </div>
              <div className={`chart-frame ${selectedUld ? (isFlashing(`chart:${selectedUld}`, flashKeys) ? "flash" : "") : ""}`}>
                {selectedTelemetry.length === 0 ? (
                  <article className="empty-state">Select a ULD with telemetry to load the chart.</article>
                ) : (
                  <Line data={chartData} options={chartOptions} />
                )}
              </div>
            </section>
          </section>
        </section>

        <section className="bottom-grid">
          <section className="panel-surface card intervention-panel">
            <div className="panel-head">
              <div>
                <h3>Intervention Timeline</h3>
                <p>Alert to recovery chain with compact vertical execution tracking.</p>
              </div>
            </div>
            <div className="timeline-rail">
              {selectedTimeline.length === 0 ? (
                <article className="empty-state">No intervention events yet.</article>
              ) : (
                selectedTimeline.map((item, index) => (
                  <InterventionEvent
                    key={`${item.type}-${item.at || item.createdAt || index}`}
                    item={item}
                    flashing={Boolean(item.uldId && isFlashing(`timeline:${item.uldId}`, flashKeys))}
                  />
                ))
              )}
            </div>
          </section>

          <section className="panel-surface card analytics-panel">
            <div className="panel-head">
              <div>
                <h3>Handler Performance</h3>
                <p>Compact service metrics for compliance and response performance.</p>
              </div>
            </div>
            <div className="analytics-grid">
              {(analytics?.handlerPerformance || []).map((handler) => (
                <article key={handler.handler} className="analytics-card card">
                  <strong>{handler.handler}</strong>
                  <span>{handler.compliancePercent}% compliance</span>
                  <span>{handler.avgResponseMinutes} min avg response</span>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>

      <aside className={`right-rail ${rightPanelOpen ? "open" : ""}`}>
        <div className="rail-header">
          <div>
            <p className="eyebrow">Alerts + Actions</p>
            <h3>Operations Queue</h3>
          </div>
          <button type="button" className="drawer-close" onClick={() => setRightPanelOpen(false)}>
            Close
          </button>
        </div>

        <div className="rail-scroll">
          <section className="rail-section card fixed-panel">
            <div className="section-heading">
              <span>Alerts Feed</span>
              <strong>{alerts.length}</strong>
            </div>
            <div className="rail-list">
              {alerts.length === 0 ? (
                <article className="empty-state">No alerts yet.</article>
              ) : (
                alerts.slice(0, 8).map((alert) => (
                  <article
                    key={alert.id || `${alert.uld_id}-${alert.occurred_at}`}
                    className={`list-card card alert-card ${String(alert.status).toLowerCase()} ${isFlashing("alerts-feed", flashKeys) ? "flash" : ""}`}
                  >
                    <strong>{alert.uld_id}</strong>
                    <p>{alert.message}</p>
                    <span>
                      {alert.status} | {formatNumber(alert.temperature)} C | {alert.airport_code || "UNK"}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rail-section card fixed-panel">
            <div className="section-heading">
              <span>Active Operational Tasks</span>
              <strong>{taskCards.length}</strong>
            </div>
            <div className="rail-list">
              {taskCards.length === 0 ? (
                <article className="empty-state">No operational tasks open.</article>
              ) : (
                taskCards.map((task) => (
                  <OperationalTaskCard
                    key={task.id}
                    task={task}
                    flashing={isFlashing(`task:${task.id}`, flashKeys) || isFlashing("tasks-panel", flashKeys)}
                    onComplete={completeAction}
                  />
                ))
              )}
            </div>
          </section>

          <section className="rail-section card workflow-panel">
            <div className="section-heading">
              <span>Workflow Coverage</span>
              <strong>{workflows.length}</strong>
            </div>
            <div className="rail-list">
              {workflows.length === 0 ? (
                <article className="empty-state">No active workflows.</article>
              ) : (
                workflows.slice(0, 5).map((workflow) => (
                  <article key={workflow.id} className="list-card card workflow-card">
                    <strong>{workflow.name}</strong>
                    <p>{workflow.uldId}</p>
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

          <section className="rail-section card intelligence-panel">
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setRootCauseExpanded((current) => !current)}
            >
              <span>Post-Event Intelligence</span>
              <strong>{rootCauseExpanded ? "Hide" : "Show"}</strong>
            </button>
            {rootCauseExpanded ? (
              <div className="cause-grid">
                <CauseItem label="Cause" value={rootCause.primaryCause} />
                <CauseItem label="Delay Source" value={rootCause.delaySource} />
                <CauseItem label="Failure Point" value={rootCause.failurePoint} />
                <CauseItem label="Recommended Fix" value={rootCause.recommendedFix} />
              </div>
            ) : (
              <p className="collapsed-note">Collapsed by default. Expand for post-event diagnostics.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );

  function pulseKeys(keys) {
    setFlashKeys((current) => {
      const next = { ...current };

      for (const key of keys) {
        next[key] = true;

        const existing = timersRef.current.get(key);
        if (existing) {
          window.clearTimeout(existing);
        }

        const timer = window.setTimeout(() => {
          setFlashKeys((active) => {
            const activeNext = { ...active };
            delete activeNext[key];
            return activeNext;
          });
          timersRef.current.delete(key);
        }, HIGHLIGHT_MS);

        timersRef.current.set(key, timer);
      }

      return next;
    });
  }

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
    await axios.post(`${apiUrl}/api/actions/${actionId}/complete`, {}, { headers: authHeader() });
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

const FleetMarkers = memo(function FleetMarkers({ fleet, onSelect }) {
  return fleet.map((item) => (
    <CircleMarker
      key={item.uldId}
      center={[item.lastLocation?.lat || 0, item.lastLocation?.lon || 0]}
      radius={7}
      pathOptions={{ color: fleetColor(item), fillColor: fleetColor(item), fillOpacity: 0.8 }}
      eventHandlers={{ click: () => onSelect(item.uldId) }}
    >
      <Popup>
        <strong>{item.uldId}</strong>
        <br />
        Risk: {item.lastRisk?.level || "LOW"}
        <br />
        Status: {item.status}
      </Popup>
    </CircleMarker>
  ));
});

const GeoRiskZones = memo(function GeoRiskZones({ zones }) {
  return zones.map((zone) => (
    <Circle
      key={zone.id}
      center={zone.center}
      radius={zone.radius}
      pathOptions={{
        color: zone.stroke,
        fillColor: zone.fill,
        fillOpacity: 0.12,
        weight: 1,
      }}
    >
      <MapTooltip direction="top" sticky>
        {zone.tooltip}
      </MapTooltip>
    </Circle>
  ));
});

const MiniMetric = memo(function MiniMetric({ label, value }) {
  return (
    <article className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
});

const InlineStat = memo(function InlineStat({ label, value }) {
  return (
    <div className="inline-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
});

const StatusPill = memo(function StatusPill({ label, value }) {
  return (
    <div className="status-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
});

const MetricRow = memo(function MetricRow({ label, value, tone }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong className={tone ? `tone-${tone}` : ""}>{value}</strong>
    </div>
  );
});

const ComplianceCard = memo(function ComplianceCard({ item, flashing }) {
  return (
    <article className={`compact-card card compliance-card ${flashing ? "flash" : ""}`}>
      <div className="compact-card-head">
        <strong>{item.uldId}</strong>
        <span className={`trend trend-${item.trendTone}`}>{item.trend}</span>
      </div>
      <div className="compact-metric-grid">
        <span>Score {item.score}</span>
        <span>Used {item.exposureUsed}m</span>
        <span>Left {item.exposureRemaining}m</span>
      </div>
    </article>
  );
});

const RecommendedActionCard = memo(function RecommendedActionCard({ item, flashing }) {
  return (
    <article className={`compact-card card recommendation-card ${flashing ? "flash" : ""}`}>
      <div className="compact-card-head">
        <strong>{item.uldId}</strong>
        <span className={`badge ${item.tone}`}>{item.risk}</span>
      </div>
      <p>{item.action}</p>
      <div className="compact-metric-grid">
        <span>{item.zone}</span>
        <span>{item.deadline}</span>
        <span>{item.role}</span>
      </div>
    </article>
  );
});

const OperationalTaskCard = memo(function OperationalTaskCard({ task, flashing, onComplete }) {
  return (
    <article className={`list-card card task-card ${flashing ? "flash" : ""}`}>
      <div className="list-card-row">
        <strong>{task.uldId}</strong>
        <span className={`badge ${task.tone}`}>{task.statusLabel}</span>
      </div>
      <p>{task.action}</p>
      <div className="compact-metric-grid">
        <span>{task.role}</span>
        <span>{task.countdown}</span>
        <span>{task.status}</span>
      </div>
      <button type="button" className="action-btn" onClick={() => onComplete(task.id)}>
        Complete
      </button>
    </article>
  );
});

const InterventionEvent = memo(function InterventionEvent({ item, flashing }) {
  const display = buildTimelineDisplay(item);

  return (
    <article className={`timeline-entry ${flashing ? "flash" : ""}`}>
      <span className={`timeline-marker ${display.tone}`} />
      <div className="timeline-copy">
        <div className="timeline-head">
          <strong>{display.label}</strong>
          <span>{display.time}</span>
        </div>
        <p>{display.message}</p>
      </div>
    </article>
  );
});

const MapZoneLegend = memo(function MapZoneLegend({ zone }) {
  return (
    <article className={`zone-chip card ${zone.tone}`}>
      <strong>{zone.label}</strong>
      <span>{zone.short}</span>
    </article>
  );
});

const CauseItem = memo(function CauseItem({ label, value }) {
  return (
    <article className="cause-item card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
});

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
  if (item.status === "BREACH" || item.lastRisk?.level === "HIGH") return "#ef5d5d";
  if (item.status === "WARNING" || item.lastRisk?.level === "MEDIUM") return "#f5b84f";
  return "#39c575";
}

function riskTone(item) {
  if (item.status === "BREACH" || item.lastRisk?.level === "HIGH") return "critical";
  if (item.status === "WARNING" || item.lastRisk?.level === "MEDIUM") return "warning";
  return "normal";
}

function compareFleetRows(a, b) {
  return fleetPriority(b) - fleetPriority(a) || String(a.uldId).localeCompare(String(b.uldId));
}

function compareActionsByDeadline(a, b) {
  return actionDeadline(a) - actionDeadline(b);
}

function fleetPriority(item) {
  if (item.status === "BREACH" || item.lastRisk?.level === "HIGH") return 3;
  if (item.status === "WARNING" || item.lastRisk?.level === "MEDIUM") return 2;
  return 1;
}

function actionDeadline(action) {
  return new Date(action.createdAt).getTime() + action.slaMinutes * 60 * 1000;
}

function formatNumber(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return Number(value).toFixed(1);
}

function buildComplianceCard(item) {
  const exposureUsed = Number(item.exposureUsed ?? 0);
  const exposureRemaining = Number(item.exposureRemaining ?? 0);
  const score = Math.max(0, Math.min(100, Math.round((exposureRemaining / Math.max(exposureUsed + exposureRemaining, 1)) * 100)));
  const trend = item.lastRisk?.level === "HIGH" ? "DOWN" : item.lastRisk?.level === "MEDIUM" ? "FLAT" : "UP";
  const trendTone = trend === "DOWN" ? "critical" : trend === "FLAT" ? "warning" : "good";

  return {
    uldId: item.uldId,
    score,
    exposureUsed,
    exposureRemaining,
    trend,
    trendTone,
  };
}

function buildRecommendation(item, pendingActions) {
  const matchingAction = pendingActions.find((action) => action.uldId === item.uldId);
  const remaining = item.lastRisk?.timeToBreachMinutes;
  const role = assignRole(matchingAction || { priority: item.lastRisk?.level === "HIGH" ? "CRITICAL" : "PREVENTIVE" });

  return {
    uldId: item.uldId,
    risk: item.lastRisk?.level || item.status || "LOW",
    tone: riskTone(item),
    action: matchingAction?.action || inferRecommendation(item),
    deadline: remaining !== undefined ? `Deadline ${remaining} min` : "Deadline --",
    zone: item.operationalContext?.airportZone || "Zone unknown",
    role,
  };
}

function buildTaskCard(action) {
  const minutesRemaining = Math.round((actionDeadline(action) - Date.now()) / 60000);
  const role = assignRole(action);
  const tone = minutesRemaining < 0 ? "critical" : minutesRemaining <= 2 ? "warning" : "normal";

  return {
    id: action.id,
    uldId: action.uldId,
    action: action.action,
    role,
    countdown: minutesRemaining < 0 ? `${Math.abs(minutesRemaining)} min late` : `${minutesRemaining} min left`,
    status: action.status === "PENDING" ? "Pending" : action.status === "IN_PROGRESS" ? "In Progress" : action.status,
    statusLabel: action.priority,
    tone,
  };
}

function buildRootCause(item, actions) {
  if (!item) {
    return {
      primaryCause: "Select a ULD",
      delaySource: "Awaiting event context",
      failurePoint: "Awaiting workflow data",
      recommendedFix: "Awaiting analysis",
    };
  }

  const delayDetected = item.operationalContext?.delayDetected;
  const gapDetected = item.operationalContext?.handlingGap;
  const zone = item.operationalContext?.airportZone || "Unknown zone";
  const action = actions[0]?.action || inferRecommendation(item);

  return {
    primaryCause: delayDetected
      ? "Extended ramp dwell drove exposure growth"
      : gapDetected
        ? "Handling continuity broke during transfer"
        : "Thermal drift exceeded buffer limits",
    delaySource: delayDetected ? `Ramp or gate delay around ${zone}` : "No material delay reported",
    failurePoint: gapDetected ? "Ground handling handoff" : "Exposure control execution",
    recommendedFix: `${action} and tighten transfer SLA at ${zone}`,
  };
}

function buildGeoZones(fleet) {
  const presets = [
    {
      id: "safe-zone",
      label: "Safe Zone",
      short: "Green",
      tone: "good",
      center: [51.47, -0.45],
      radius: 3200,
      fill: "#2cc56c",
      stroke: "#65e39a",
      tooltip: "Safe Exposure Area - Cold Storage Corridor",
    },
    {
      id: "medium-zone",
      label: "Medium Risk",
      short: "Yellow",
      tone: "warning",
      center: [25.25, 55.36],
      radius: 4200,
      fill: "#f5b84f",
      stroke: "#ffd483",
      tooltip: "Medium Risk Exposure Area - Active Handling Zone",
    },
    {
      id: "critical-zone",
      label: "Tarmac Zone",
      short: "Red",
      tone: "critical",
      center: [40.64, -73.78],
      radius: 5200,
      fill: "#ef5d5d",
      stroke: "#ff9b9b",
      tooltip: "High Risk Exposure Area - Tarmac Zone",
    },
  ];

  if (fleet.length === 0) {
    return presets;
  }

  return presets.map((zone, index) => {
    const source = fleet[index % fleet.length];
    const lat = source.lastLocation?.lat;
    const lon = source.lastLocation?.lon;
    if (lat === undefined || lon === undefined) {
      return zone;
    }

    return {
      ...zone,
      center: [lat + index * 0.8, lon + index * 0.8],
    };
  });
}

function buildTimelineDisplay(item) {
  const time = new Date(item.at || item.createdAt || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (item.type === "ALERT") {
    return {
      label: "Alert Triggered",
      message: item.message || `${item.uldId || "ULD"} crossed threshold`,
      time,
      tone: "critical",
    };
  }

  if (item.type === "ASSIGNED" || item.type === "ACTION") {
    return {
      label: "Action Assigned",
      message: `${item.action || "Mitigation task"} routed to operations`,
      time,
      tone: "warning",
    };
  }

  if (item.type === "ACKNOWLEDGED" || item.type === "WORKFLOW") {
    return {
      label: "Acknowledged",
      message: `${item.name || item.action || "Workflow"} acknowledged by operations`,
      time,
      tone: "normal",
    };
  }

  if (item.type === "COMPLETED" || item.type === "ACTION_UPDATE") {
    return {
      label: "Completed",
      message: `${item.action || "Task"} completed and awaiting verification`,
      time,
      tone: "good",
    };
  }

  if (item.type === "TELEMETRY") {
    return {
      label: "Verified Recovery",
      message: `${formatNumber(item.reading?.temperature_celsius)} C telemetry confirmed latest state`,
      time,
      tone: item.risk?.risk_level === "HIGH" ? "critical" : "good",
    };
  }

  return {
    label: item.type || "Event",
    message: item.message || "Operational event recorded",
    time,
    tone: "normal",
  };
}

function inferRecommendation(item) {
  if (item.lastRisk?.level === "HIGH" || item.status === "BREACH") return "Move to Cold Zone";
  if (item.operationalContext?.handlingGap) return "Dispatch Supervisor Check";
  if (item.operationalContext?.delayDetected) return "Escalate Ramp Delay";
  return "Monitor in Active Bay";
}

function assignRole(action) {
  if (action.priority === "CRITICAL" || String(action.action).toLowerCase().includes("escalate")) {
    return "Supervisor";
  }
  return "Handler";
}

function isFlashing(key, flashKeys) {
  return Boolean(flashKeys[key]);
}

const NAV_ITEMS = [
  { label: "Overview", icon: "OV", active: true },
  { label: "Fleet", icon: "FL" },
  { label: "Intel", icon: "IN" },
  { label: "Map", icon: "MP" },
  { label: "Tasks", icon: "TK" },
];
