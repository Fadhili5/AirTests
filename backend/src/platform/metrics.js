import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const ingestCounter = new client.Counter({
  name: "or_atm_ingest_events_total",
  help: "Total MQTT readings processed",
  registers: [registry],
});

export const alertCounter = new client.Counter({
  name: "or_atm_alerts_total",
  help: "Total alerts emitted",
  labelNames: ["severity"],
  registers: [registry],
});

export const weatherDuration = new client.Histogram({
  name: "or_atm_weather_lookup_duration_seconds",
  help: "Weather API latency",
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});
