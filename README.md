# AeroSentinel X

AeroSentinel X is a real-time cold chain control and compliance platform for temperature-sensitive air cargo. It monitors ULD telemetry, predicts excursion risk, tracks cumulative exposure, detects operational failures, orchestrates mitigation actions, and maintains a ONE Record-aligned digital twin as the source of truth.

## Architecture

`IoT Sensors -> MQTT -> Ingestion API -> Risk Engine -> Exposure Engine -> Decision Engine -> Action Orchestrator -> ONE Record -> Dashboard`

The repository includes:

- `backend/`
  Express backend with MQTT ingestion, operational context detection, exposure engine, decision engine, action orchestration, audit logging, alerts, analytics, and ONE Record integration.
- `risk-service/`
  FastAPI microservice for predictive risk scoring.
- `frontend/`
  React/Vite control center with live map, alerts, workflow panel, action timeline, and compliance analytics.
- `simulator/`
  Multi-ULD simulator with heatwave, delay, and sensor-failure scenarios.
- `broker/`
  Local Aedes MQTT broker for no-Docker development.
- `infra/`
  Docker Compose stack for Mosquitto, Redis, PostgreSQL, Keycloak, GraphDB, NE:ONE, Prometheus, Grafana, MailHog, and the risk service.

## Core Capabilities

- Real-time MQTT ingestion for multiple ULD streams
- Predictive risk scoring with Python service and local fallback model
- Exposure tracking with cumulative excursion logic and gap handling
- Operational context detection for tarmac exposure, delays, handling gaps, battery, and signal health
- Decision engine for preventive and critical actions
- Action orchestration and SOP workflow tracking
- Alerting over webhook and email channels
- ONE Record digital twin extensions for risk, compliance, and mitigation history
- Live React operations dashboard with Socket.IO updates

## Local Run

Local mode is designed to work even without Redis, PostgreSQL, Keycloak, the risk microservice, or NE:ONE running locally.

What local mode does:

- starts a local MQTT broker
- uses in-memory persistence when Redis is unavailable
- uses in-memory audit storage when PostgreSQL is unavailable
- falls back to an embedded risk scorer when the FastAPI risk service is unavailable
- disables API auth when `AUTH_DISABLED=true`
- serves the frontend without Keycloak when `VITE_AUTH_DISABLED=true`

Install dependencies:

```bash
npm install
```

Start the full local stack:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Stop the local stack:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-local.ps1
```

Local endpoints:

- Dashboard: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Metrics: `http://localhost:3000/metrics`

## Docker Run

Bring up the full infrastructure stack:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Main services:

- Dashboard: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Risk service: `http://localhost:8010`
- Keycloak: `http://localhost:8081`
- NE:ONE: `http://localhost:8080`
- GraphDB: `http://localhost:7200`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- MailHog: `http://localhost:8025`

## API Surface

Protected APIs live under `/api/*` when auth is enabled.

- `GET /api/health`
- `GET /api/platform`
- `GET /api/fleet`
- `GET /api/control-center`
- `GET /api/analytics`
- `GET /api/alerts`
- `GET /api/uld/:id/status`
- `GET /api/uld/:id/actions`
- `GET /api/uld/:id/workflows`
- `GET /api/uld/:id/timeline`
- `POST /api/actions/:id/complete`
- `POST /api/alert/subscribe`
- `POST /api/uld/:id/reset`

## Configuration

Common environment variables:

- `OPENWEATHER_API_KEY`
- `MQTT_URL`
- `REDIS_URL`
- `POSTGRES_URL`
- `RISK_SERVICE_URL`
- `ONE_RECORD_BASE_URL`
- `KEYCLOAK_ISSUER`
- `KEYCLOAK_JWKS_URI`
- `KEYCLOAK_AUDIENCE`

Local development switches:

- `AUTH_DISABLED=true`
- `REDIS_DISABLED=true`
- `POSTGRES_DISABLED=true`
- `RISK_SERVICE_DISABLED=true`
- `ONE_RECORD_ENABLED=false`
- `VITE_AUTH_DISABLED=true`

## Testing

Run backend tests:

```bash
npm test
```

Build the frontend:

```bash
npm --workspace frontend run build
```

## Demo Scenarios

See:

- [docs/demo.md](</c:/Users/User/Desktop/me/docs/demo.md>)
- [docs/scenarios.md](</c:/Users/User/Desktop/me/docs/scenarios.md>)

These cover:

- tarmac heat risk with preventive action
- delay-to-breach escalation
- recovery and audit verification
