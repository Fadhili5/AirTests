import http from "http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { logger } from "./platform/logger.js";
import { createRedisClient } from "./platform/redis.js";
import { ExposureRepository } from "./repositories/exposureRepository.js";
import { SubscriptionRepository } from "./repositories/subscriptionRepository.js";
import { DlqRepository } from "./repositories/dlqRepository.js";
import { WeatherService } from "./services/weatherService.js";
import { AlertService } from "./services/alertService.js";
import { OneRecordService } from "./services/oneRecordService.js";
import { TelemetryPipeline } from "./services/telemetryPipeline.js";
import { MqttConsumer } from "./services/mqttConsumer.js";
import { buildApp } from "./app.js";

const redis = await createRedisClient(config.redis.url, {
  disabled: config.redis.disabled,
});
const exposureRepository = new ExposureRepository(redis, config.retention.eventListLimit);
const subscriptionRepository = new SubscriptionRepository(redis);
const dlqRepository = new DlqRepository(redis);

const app = buildApp({
  config,
  logger,
  exposureRepository,
  subscriptionRepository,
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const pipeline = new TelemetryPipeline({
  config,
  exposureRepository,
  weatherService: new WeatherService({ redis, config, logger }),
  alertService: new AlertService({
    subscriptions: subscriptionRepository,
    smtp: config.smtp,
    logger,
  }),
  oneRecordService: new OneRecordService({ config, logger }),
  io,
});

const mqttConsumer = new MqttConsumer({
  config,
  logger,
  pipeline,
  dlqRepository,
});

io.on("connection", async (socket) => {
  socket.emit("fleet", await exposureRepository.getFleetStatus());
});

server.listen(config.port, () => {
  logger.info({ port: config.port }, "Backend listening");
  mqttConsumer.start();
});
