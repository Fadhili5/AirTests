# OR-ATM

OR-ATM, the ONE Record Ambient Temperature Monitor, is a real-time cold chain compliance platform for temperature-sensitive air cargo. It ingests telemetry from ULD-mounted IoT devices, enriches each reading with environmental context, computes cumulative temperature exposure in real time, updates a ONE Record-aligned digital twin, and delivers operational visibility through secured APIs and a live web dashboard.

## Overview

The platform is designed around a production-oriented event pipeline:

`IoT Simulator -> MQTT Broker -> Node.js Ingestion API -> Exposure Engine -> ONE Record Digital Twin -> React Dashboard`

Core capabilities include:

- Real-time MQTT ingestion for multiple concurrent ULDs
- Exposure tracking with cumulative excursion logic and gap handling
- Weather enrichment with caching and circuit-breaker protection
- Webhook and email alert delivery for warning and breach thresholds
- Socket.IO streaming for live dashboard updates
- Keycloak-compatible bearer token protection for operational APIs
- Prometheus-ready metrics endpoints for observability

## Repository Structure

- `broker/`
  Lightweight local MQTT broker for no-Docker development using Aedes.
- `backend/`
  Express API, MQTT consumer, exposure engine, weather enrichment, alerting, metrics, and ONE Record adapter.
- `frontend/`
  Vite/React dashboard with Leaflet map, Chart.js telemetry views, and Socket.IO subscriptions.
- `simulator/`
  Multi-ULD telemetry publisher and load generator.
- `infra/`
  Docker Compose stack for Mosquitto, Redis, Keycloak, GraphDB, NE:ONE, Prometheus, Grafana, and MailHog.
- `docs/`
  API details, demo instructions, and supporting operational notes.

## Key Runtime Components

### Backend

The backend provides:

- MQTT topic subscription on `uld/{uld_id}/telemetry`
- Payload validation and dead-letter handling
- Cumulative exposure computation with a 30-minute gap cap
- Redis-backed persistence, with automatic in-memory fallback for local development
- OpenWeatherMap enrichment with Redis caching
- ONE Record update adapter for digital twin synchronization
- Webhook and SMTP-style email notifications
- Metrics at `/metrics`

### Frontend

The dashboard provides:

- Live ULD location map
- Status-aware detail cards
- Real-time alert feed
- Temperature versus ambient trend visualization

### Simulator

The simulator publishes realistic readings for multiple ULDs, including:

- nominal in-range operation
- configurable out-of-range excursions
- changing route coordinates across ground and flight phases

## Running Locally Without Docker

This repository now supports a full local development path even when Redis, Mosquitto, Keycloak, and NE:ONE are not installed on the machine.

### What local mode does

- starts a local MQTT broker from `broker/`
- runs the backend with in-memory persistence if Redis is unavailable
- disables API auth in local mode when explicitly configured
- skips the Keycloak login flow in the frontend when `VITE_AUTH_DISABLED=true`
- allows the simulator to publish directly to the local broker

### 1. Install dependencies

```bash
npm install
```

### 2. Start the local MQTT broker

```bash
npm run dev:broker
```

Or start the full local stack at once:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

### 3. Start the backend in local mode

PowerShell:

```powershell
$env:AUTH_DISABLED="true"
$env:REDIS_DISABLED="true"
$env:ONE_RECORD_ENABLED="false"
$env:MQTT_URL="mqtt://localhost:1883"
npm run dev:backend
```

### 4. Start the frontend in local mode

PowerShell:

```powershell
$env:VITE_AUTH_DISABLED="true"
$env:VITE_API_URL="http://localhost:3000"
$env:VITE_SOCKET_URL="http://localhost:3000"
npm run dev:frontend
```

You can also copy [frontend/.env.local.example](</c:/Users/User/Desktop/me/frontend/.env.local.example>) to `frontend/.env.local`.

### 5. Start the simulator

PowerShell:

```powershell
$env:MQTT_URL="mqtt://localhost:1883"
$env:PUBLISH_INTERVAL_MS="15000"
npm run dev:simulator
```

### 6. Open the application

- Dashboard: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Metrics: `http://localhost:3000/metrics`

## Running With Docker

For the full infrastructure stack, including Redis, Keycloak, GraphDB, NE:ONE, Prometheus, Grafana, and MailHog:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Services exposed by the Docker stack:

- Dashboard: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Keycloak: `http://localhost:8081`
- NE:ONE: `http://localhost:8080`
- GraphDB: `http://localhost:7200`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- MailHog: `http://localhost:8025`

## API Summary

Protected endpoints are available under `/api/*`.

- `GET /api/health`
- `GET /api/fleet`
- `GET /api/uld/:id/status`
- `POST /api/alert/subscribe`
- `POST /api/uld/:id/reset`

Detailed API notes are in [docs/api.md](</c:/Users/User/Desktop/me/docs/api.md>).

## Configuration

### Common environment variables

- `OPENWEATHER_API_KEY`
- `MQTT_URL`
- `REDIS_URL`
- `ONE_RECORD_BASE_URL`
- `KEYCLOAK_ISSUER`
- `KEYCLOAK_JWKS_URI`
- `KEYCLOAK_AUDIENCE`

### Local development switches

- `AUTH_DISABLED=true`
- `REDIS_DISABLED=true`
- `ONE_RECORD_ENABLED=false`
- `VITE_AUTH_DISABLED=true`

## Testing

Run the backend unit and API tests with:

```bash
npm test
```

Build the frontend with:

```bash
npm --workspace frontend run build
```

## Operational Notes

- In local mode, Redis is replaced by an in-memory store automatically when disabled or unavailable.
- In local mode, the frontend can run without Keycloak by setting `VITE_AUTH_DISABLED=true`.
- NE:ONE integration is configurable and can be disabled for local-only development.
- Weather enrichment falls back gracefully if an OpenWeatherMap key is not supplied.

## Demo Guide

See [docs/demo.md](</c:/Users/User/Desktop/me/docs/demo.md>) for a short demo script covering simulator startup, alert generation, and API verification.

## Convenience Scripts

- Start local stack: [scripts/start-local.ps1](</c:/Users/User/Desktop/me/scripts/start-local.ps1>)
- Stop local stack: [scripts/stop-local.ps1](</c:/Users/User/Desktop/me/scripts/stop-local.ps1>)
