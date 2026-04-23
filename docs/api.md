# API

Protected endpoints require a Keycloak bearer token.

## `GET /api/health`

Returns service health and timestamp.

## `GET /api/fleet`

Returns the latest compliance state for every known ULD.

## `GET /api/uld/:id/status`

Returns the latest Redis exposure state and recent telemetry history.

## `POST /api/alert/subscribe`

Registers a webhook or email recipient for alerts.

## `POST /api/uld/:id/reset`

Clears exposure state and telemetry for a ULD.
