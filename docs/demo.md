# Demo script

1. Start the full stack with `docker compose -f infra/docker-compose.yml up --build`.
2. Log into Keycloak at `http://localhost:8081` with `admin/admin`.
3. Obtain an access token for `ops`.
4. Open the dashboard at `http://localhost:5173`.
5. Wait for simulator telemetry or publish a breach event:

```bash
mosquitto_pub -h localhost -t uld/JTN-7890/telemetry -m "{\"uld_id\":\"JTN-7890\",\"timestamp\":\"2026-04-23T14:05:00Z\",\"temperature_celsius\":12.5,\"lat\":40.6413,\"lon\":-73.7781}"
```

6. Verify alert delivery in MailHog at `http://localhost:8025`.
7. Query the secured status API:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/uld/JTN-7890/status
```
