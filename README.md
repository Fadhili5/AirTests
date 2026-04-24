# AeroSentinel

AeroSentinel is a production-style, multi-page air cargo exposure intelligence platform for long-haul airline operations. It combines a fast Redis-backed operational state layer with an eventual-consistency ONE Record digital twin so teams can sense, predict, act, verify, and audit cold-chain risk in real time.

## What It Does

- Tracks cumulative tarmac, ground-delay, transfer, and in-flight exposure for ULDs
- Scores predicted breach risk from telemetry, weather, and operational context
- Generates role-based interventions with SLA deadlines and execution tracking
- Verifies Redis state against the ONE Record twin through a reconciliation queue
- Maintains audit history for telemetry, interventions, notifications, and drift events
- Streams incremental updates to a responsive, tablet-first multi-page operations UI

## Architecture

`IoT Sensors -> MQTT -> Ingestion API -> Exposure Engine -> Risk Engine -> Intervention Engine -> Verification Queue -> ONE Record Sync -> Digital Twin`

### Layer 1: Real-Time Operational State

- Redis is the fast operational source of truth
- APIs are optimized for fast-path reads
- Socket.IO streams incremental UI updates
- The UI reads operational state from Redis-backed APIs, not directly from ONE Record

### Layer 2: ONE Record Digital Twin

- NE:ONE-compatible JSON-LD payloads
- Graph-oriented logistics object model
- OAuth2 client-credentials token handling with Redis token cache
- Eventual consistency maintained by async sync and reconciliation

## Multi-Page Dashboard

The frontend is a real multi-page dashboard, not a single-screen mockup. Current routes:

- `/dashboard`
- `/flights`
- `/uld-tracking`
- `/exposure`
- `/interventions`
- `/alerts`
- `/airports`
- `/analytics`
- `/settings`

Each page has its own route, navigation state, and focused operational context:

- `Dashboard`: fleet posture, critical summaries, and route entry points
- `Flights`: Emirates-style long-haul flight control context
- `ULD Tracking`: live fleet map and ULD status cards
- `Exposure`: cumulative thermal exposure intelligence
- `Interventions`: action queue, assignment, SLA, and execution state
- `Alerts`: risk events and escalation monitoring
- `Airports`: airport and zone-level bottleneck views
- `Analytics`: compliance and exposure performance

## Key Backend Capabilities

- MQTT ingestion for ULD telemetry
- Exposure engine with cumulative threshold tracking
- Predictive risk scoring with remote service fallback
- Intervention orchestration with assigned roles and verification-oriented lifecycle
- Verification queue with drift rules for temperature, exposure, and risk level
- Reconciliation worker to realign Redis and the ONE Record twin
- Audit trail for telemetry, actions, workflows, notifications, and reconciliation

## ONE Record Model

Implemented entities and extensions include:

- `LogisticsObject` for ULDs
- `TemperatureRecord`
- `Location`
- `TemperatureComplianceStatus`
- `RiskAssessment`
- `OperationalContext`

Supported backend endpoints include:

- `GET /api/one-record/ulds/:id`
- `POST /api/one-record/ulds`
- `PATCH /api/one-record/ulds/:id`

## Repository Layout

- `backend/`: Express API, ingestion pipeline, Redis state, reconciliation, and ONE Record sync
- `frontend/`: React + TypeScript multi-page dashboard
- `broker/`: local MQTT broker
- `simulator/`: telemetry generator for scenario playback
- `risk-service/`: Python predictive risk microservice
- `infra/`: Docker Compose for Redis, PostgreSQL, Keycloak, GraphDB, NE:ONE, and observability

## Local Development

The local setup is designed to run even if Redis, PostgreSQL, Keycloak, GraphDB, or NE:ONE are unavailable.

### Install

```bash
npm install --workspaces
```

### Start Locally

1. Start the MQTT broker:

```bash
npm run dev:broker
```

2. Start the backend in local fallback mode:

```bash
AUTH_DISABLED=true \
REDIS_DISABLED=true \
POSTGRES_DISABLED=true \
RISK_SERVICE_DISABLED=true \
ONE_RECORD_ENABLED=false \
npm run dev:backend
```

3. Start the frontend:

```bash
npm run dev:frontend -- --host 0.0.0.0
```

4. Start the simulator to generate telemetry:

```bash
MQTT_URL=mqtt://localhost:1883 npm run dev:simulator
```

### Local Endpoints

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Metrics: `http://localhost:3000/metrics`
- Health: `http://localhost:3000/api/health`

## Docker Stack

To run the full hybrid stack with infrastructure:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Primary services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Risk service: `http://localhost:8010`
- Keycloak: `http://localhost:8081`
- NE:ONE: `http://localhost:8080`
- GraphDB: `http://localhost:7200`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## API Summary

- `GET /api/health`
- `GET /api/platform`
- `GET /api/fleet`
- `GET /api/control-center`
- `GET /api/flights`
- `GET /api/analytics`
- `GET /api/alerts`
- `GET /api/audit`
- `GET /api/verification/audit`
- `GET /api/uld/:id/status`
- `GET /api/uld/:id/actions`
- `GET /api/uld/:id/workflows`
- `GET /api/uld/:id/timeline`
- `POST /api/actions/:id/complete`
- `POST /api/alert/subscribe`
- `POST /api/uld/:id/reset`

## Verification

Validated in this workspace with:

```bash
npm --workspace backend test
npm --workspace frontend run typecheck
npm --workspace frontend run build
```
