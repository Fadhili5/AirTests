import mqtt from "mqtt";

export class MqttConsumer {
  constructor({ config, logger, pipeline, dlqRepository }) {
    this.config = config;
    this.logger = logger;
    this.pipeline = pipeline;
    this.dlqRepository = dlqRepository;
  }

  start() {
    this.logger.info({ url: this.config.mqtt.url }, "Starting MQTT consumer");
    this.client = mqtt.connect(this.config.mqtt.url, {
      clientId: this.config.mqtt.clientId,
    });

    this.client.on("connect", () => {
      this.logger.info({ topic: this.config.mqtt.topic }, "Connected to MQTT");
      this.client.subscribe(this.config.mqtt.topic);
    });

    this.client.on("message", async (_topic, payload) => {
      try {
        const reading = JSON.parse(payload.toString());
        validateReading(reading);
        await this.pipeline.process(reading);
      } catch (error) {
        this.logger.error({ error }, "Failed to process MQTT message");
        await this.dlqRepository.push({
          payload: payload.toString(),
          failedAt: new Date().toISOString(),
          reason: error.message,
        });
      }
    });

    this.client.on("error", (error) => {
      this.logger.error({ error: error.message }, "MQTT client error");
    });

    this.client.on("close", () => {
      this.logger.warn("MQTT client connection closed");
    });
  }
}

function validateReading(reading) {
  const required = ["uld_id", "timestamp", "temperature_celsius", "lat", "lon"];
  for (const field of required) {
    if (reading[field] === undefined || reading[field] === null) {
      throw new Error(`Missing field ${field}`);
    }
  }
}
