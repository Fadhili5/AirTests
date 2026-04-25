# AeroSentinel

AeroSentinel is an AI-powered ONE Record operational intelligence platform for air cargo.

It is a shared cargo operating layer that combines:

- ONE Record logistics objects
- ONE Record logistics events
- JSON-LD linked data
- digital twin modeling
- real-time IoT telemetry
- AI operational reasoning
- multi-party intervention workflows
- cargo chain-of-custody intelligence
- full audit and replayability

The platform goal is shared cargo truth across airline, forwarder, warehouse, customs, ground handling, and consignee stakeholders.

## Production posture

Production mode is intended to run with:

- `NODE_ENV=production`
- `ALLOW_SIMULATOR_DATA=false`
- `REQUIRE_SIGNED_INTEGRATIONS=true`
- `CARGO_SEED_DEMO=false`

The backend fail-closes around trusted ingestion and the frontend should not rely on seeded control-tower state in production mode.

## Operating loop

`Sense -> Analyze -> Predict -> Act -> Verify -> Audit`

Every event can update the digital twin, adjust risk, create interventions, notify operators, and append audit evidence.

## Current architecture in this repo

- `apps/api`: Express operational API, Redis fast-path state, BullMQ verification, telemetry and custody ingestion, JSON-LD ULD endpoints, replay metadata, control-center views, and audit APIs.
- `apps/web`: Next.js control tower with routes for control tower, flights, ULD tracking, exposure, interventions, cargo custody, alerts, airports, analytics, and AI Ops.
- `packages/shared`: shared Zod contracts and DTOs.
- `prisma/schema.prisma`: durable cargo twin ledger for shipments, waybills, pieces, telemetry, custody, ULDs, flights, interventions, alerts, and audit logs.

## Core APIs

### Platform

- `GET /api/health`
- `GET /api/platform`
- `GET /api/fleet`
- `GET /api/control-center`
- `GET /api/analytics`
- `GET /api/audit`
- `GET /api/verification/audit`

### Ingestion

- `POST /api/ingestion/one-record`
- `POST /api/ingestion/telemetry`
- `POST /api/ingestion/custody`
- `POST /api/integrations/iot/http`

Trusted IoT ingestion expects:

- `x-event-id`
- `x-timestamp`
- `x-nonce`
- `x-signature` when signed integrations are enforced

Signature basis:

- `<timestamp>.<nonce>.<eventId>.<json-body>`

### Cargo and custody

- `GET /api/shipments`
- `GET /api/shipments/reference`
- `GET /api/cargo/control-center`
- `POST /api/cargo/scan-out`
- `POST /api/cargo/scan-in`
- `POST /api/cargo/verify`
- `POST /api/cargo/reload`
- `POST /api/cargo/copilot/query`
- `GET /api/cargo/history/:id`
- `GET /api/cargo/location/:id`
- `GET /api/cargo/risk/:id`
- `GET /api/cargo/chain-of-custody/:id`
- `GET /api/cargo/video/:id`
- `GET /api/cargo/video/:id/:eventId/replay`
- `GET /api/cargo/video/:id/:eventId/frame/:frameIndex`

### ULD / ONE Record

- `GET /api/ulds/:id`
- `POST /api/ulds`
- `PATCH /api/ulds/:id`
- `GET /api/one-record/ulds/:id`
- `POST /api/one-record/ulds`
- `PATCH /api/one-record/ulds/:id`
- `GET /api/uld/:id/status`
- `GET /api/uld/:id/actions`
- `GET /api/uld/:id/workflows`
- `GET /api/uld/:id/timeline`
- `POST /api/uld/:id/reset`

### Contracts and realtime

- `GET /api/contracts/openapi.json`
- `GET /api/contracts/schemas/:name`
- `GET /api/stream/events`

## Frontend routes

- `/control-tower`
- `/dashboard`
- `/cargo-graph`
- `/live-events`
- `/thermal-map`
- `/flights`
- `/uld-tracking`
- `/exposure`
- `/interventions`
- `/cargo-custody`
- `/stakeholders`
- `/compliance`
- `/audit`
- `/alerts`
- `/airports`
- `/analytics`
- `/ai-ops`

## Local development

Install:

```bash
npm install --workspaces
```

Backend in fallback-friendly mode:

```bash
AUTH_DISABLED=true \
REDIS_DISABLED=true \
POSTGRES_DISABLED=true \
RISK_SERVICE_DISABLED=true \
ONE_RECORD_ENABLED=false \
CARGO_SEED_DEMO=false \
npm --workspace @lending/api run dev
```

Frontend:

```bash
npm --workspace @lending/web run dev
```

## Infrastructure direction

The code is structured around:

- Redis for fast operational state
- Postgres / TimescaleDB for durable evidence and ledger storage
- BullMQ verification jobs
- JSON-LD ONE Record object serving
- realtime event streaming
- future Keycloak, GraphDB, Neo4j, Kafka, object storage, and video pipeline integrations

## Notes

- The current implementation provides a meaningful cargo digital twin slice in this repo today.
- Full production operation still depends on live infrastructure, credentials, and data providers being connected through the environment contracts.
