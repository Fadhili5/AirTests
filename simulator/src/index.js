import mqtt from "mqtt";

const client = mqtt.connect(process.env.MQTT_URL || "mqtt://localhost:1883");
const intervalMs = Number.parseInt(process.env.PUBLISH_INTERVAL_MS || "15000", 10);
const ulds = (process.env.ULD_IDS || "JTN-7890,JTN-8972,JTN-4421").split(",");
const deviationProbability = Number.parseFloat(process.env.DEVIATION_PROBABILITY || "0.2");

client.on("connect", () => {
  for (const uldId of ulds) {
    let step = 0;
    setInterval(() => {
      const point = nextPoint(uldId, step++);
      client.publish(`uld/${uldId}/telemetry`, JSON.stringify(point));
    }, intervalMs);
  }
});

function nextPoint(uldId, step) {
  const route = routePoint(step);
  const deviated = Math.random() < deviationProbability;
  return {
    uld_id: uldId,
    timestamp: new Date().toISOString(),
    temperature_celsius: deviated ? 9 + Math.random() * 4 : 2 + Math.random() * 6,
    lat: route.lat,
    lon: route.lon,
  };
}

function routePoint(step) {
  const path = [
    { lat: 40.6413, lon: -73.7781 },
    { lat: 40.645, lon: -73.77 },
    { lat: 41.2, lon: -50.5 },
    { lat: 51.47, lon: -0.4543 },
  ];
  return path[step % path.length];
}
