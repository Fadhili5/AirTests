import mqtt from "mqtt";

const client = mqtt.connect(process.env.MQTT_URL || "mqtt://localhost:1883");
const intervalMs = Number.parseInt(process.env.PUBLISH_INTERVAL_MS || "15000", 10);
const ulds = (process.env.ULD_IDS || "JTN-7890,JTN-8972,JTN-4421").split(",");
const deviationProbability = Number.parseFloat(process.env.DEVIATION_PROBABILITY || "0.2");
const alertDemoMode = process.env.ALERT_DEMO_MODE === "true";
const scenario = process.env.SCENARIO || "heatwave";

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
  const deviated = alertDemoMode
    ? shouldForceDeviation(uldId, step)
    : Math.random() < deviationProbability;
  const operational = scenarioState(step, uldId);
  return {
    uld_id: uldId,
    timestamp: new Date().toISOString(),
    temperature_celsius: deviated
      ? 9 + Math.random() * 4
      : 2 + Math.random() * 6,
    lat: route.lat,
    lon: route.lon,
    battery: Math.max(15, 100 - step),
    signal_rssi: operational.signal_rssi,
    speed_kph: operational.speed_kph,
    airport_zone: operational.airport_zone,
    time_on_tarmac_min: operational.time_on_tarmac_min,
    flight_status: operational.flight_status,
    delay_minutes: operational.delay_minutes,
  };
}

function shouldForceDeviation(uldId, step) {
  if (uldId === "JTN-7890") {
    return true;
  }

  if (uldId === "JTN-8972") {
    return step % 3 !== 0;
  }

  return step % 5 === 0;
}

function scenarioState(step, uldId) {
  if (scenario === "delay") {
    return {
      airport_zone: step % 4 < 3 ? "TARMAC" : "AIRPORT_TRANSIT",
      time_on_tarmac_min: 10 + step * 2,
      flight_status: "DELAYED",
      delay_minutes: 20 + step * 3,
      signal_rssi: -82,
      speed_kph: step % 4 === 3 ? 28 : 0,
    };
  }

  if (scenario === "sensor-failure") {
    return {
      airport_zone: "TARMAC",
      time_on_tarmac_min: 12 + step,
      flight_status: "ON_TIME",
      delay_minutes: 0,
      signal_rssi: uldId === "JTN-4421" ? -98 : -88,
      speed_kph: 0,
    };
  }

  return {
    airport_zone: step % 3 === 0 ? "TARMAC" : step % 5 === 0 ? "IN_FLIGHT" : "AIRPORT_TRANSIT",
    time_on_tarmac_min: step % 3 === 0 ? 8 + step : 0,
    flight_status: step % 4 === 0 ? "DELAYED" : "ON_TIME",
    delay_minutes: step % 4 === 0 ? 15 + step : 0,
    signal_rssi: -78,
    speed_kph: step % 5 === 0 ? 680 : step % 3 === 0 ? 0 : 22,
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
