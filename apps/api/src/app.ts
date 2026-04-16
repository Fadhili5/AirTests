import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import walletRoutes from "./routes/wallet.routes";
import loanRoutes from "./routes/loan.routes";
import adminRoutes from "./routes/admin.routes";
import internalRoutes from "./routes/internal.routes";
import webhookRoutes from "./routes/webhook.routes";
import healthRoutes from "./routes/health.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 200,
      skip: (req) => req.path.startsWith("/webhooks") || req.path.startsWith("/internal"),
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("combined"));

  app.use("/", healthRoutes);
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/wallet", walletRoutes);
  app.use("/loans", loanRoutes);
  app.use("/admin", adminRoutes);
  app.use("/internal", internalRoutes);
  app.use("/webhooks", webhookRoutes);

  app.use(errorMiddleware);

  return app;
};
