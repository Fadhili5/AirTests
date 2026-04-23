import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middleware/auth.js";
import { buildApiRouter } from "./routes/api.js";
import { registry } from "./platform/metrics.js";

export function buildApp({
  config,
  logger,
  exposureRepository,
  operationsRepository,
  analyticsService,
  actionOrchestrator,
  auditStore,
  subscriptionRepository,
}) {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(
    "/api",
    buildApiRouter({
      config,
      exposureRepository,
      operationsRepository,
      analyticsService,
      actionOrchestrator,
      auditStore,
      subscriptionRepository,
      authMiddleware: authMiddleware(config),
    }),
  );

  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", registry.contentType);
    res.send(await registry.metrics());
  });

  app.use((error, _req, res, _next) => {
    logger.error({ error }, "Unhandled application error");
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
