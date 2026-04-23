import mqtt from "mqtt";

const client = mqtt.connect(process.env.MQTT_URL || "mqtt://localhost:1883");
const deviceCount = Number.parseInt(process.env.LOAD_DEVICE_COUNT || "10000", 10);

client.on("connect", () => {
  for (let i = 0; i < deviceCount; i += 1) {
    const uldId = `LOAD-${i}`;
    client.publish(
      `uld/${uldId}/telemetry`,
      JSON.stringify({
        uld_id: uldId,
        timestamp: new Date().toISOString(),
        temperature_celsius: 8 + (i % 3),
        lat: 40.6413,
        lon: -73.7781,
      }),
    );
  }
  setTimeout(() => {
    client.end(true);
  }, 1000);
});
