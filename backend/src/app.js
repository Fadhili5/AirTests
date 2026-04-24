import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { authMiddleware } from "./middleware/auth.js";
import { buildApiRouter } from "./routes/api.js";
import { registry } from "./platform/metrics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistDir = path.resolve(__dirname, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistDir, "index.html");

export function buildApp({
  config,
  logger,
  exposureRepository,
  operationsRepository,
  analyticsService,
  actionOrchestrator,
  auditStore,
  subscriptionRepository,
  reconciliationService,
  oneRecordService,
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
      reconciliationService,
      oneRecordService,
      authMiddleware: authMiddleware(config),
    }),
  );

  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", registry.contentType);
    res.send(await registry.metrics());
  });

  if (existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistDir));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path === "/metrics") {
        next();
        return;
      }

      res.sendFile(frontendIndexPath);
    });
  } else {
    app.get("/", (_req, res) => {
      res.status(200).json({
        ok: true,
        message: "Backend is running, but the frontend build is missing. Run `npm --workspace frontend run build`.",
      });
    });
  }

  app.use((error, _req, res, _next) => {
    logger.error({ error }, "Unhandled application error");
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
