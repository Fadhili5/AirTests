import { createHmac, timingSafeEqual } from "node:crypto";
import { Request, Router } from "express";
import {
  ackInterventionSchema,
  custodyIngestSchema,
  oneRecordIngestSchema,
  telemetryIngestSchema
} from "@lending/shared";
import { z } from "zod";
import {
  createUldJsonLd,
  cargoReload,
  cargoScanIn,
  cargoScanOut,
  cargoVerify,
  getAnalyticsSummary,
  getCargoHistory,
  getCargoLocation,
  getCargoRisk,
  getCargoVideo,
  getCargoVideoFrame,
  getCargoVideoReplay,
  getContractSchemas,
  getControlCenter,
  getDashboardSnapshot,
  getFleetView,
  getOpenApiContract,
  getReferenceShipment,
  getUldActions,
  getUldJsonLd,
  getUldMonitoring,
  getUldStatus,
  getUldTimeline,
  getUldWorkflows,
  getWeatherOverview,
  ingestCustody,
  ingestOneRecordDocument,
  ingestTelemetry,
  listAlerts,
  listCargoCustody,
  listFlights,
  listInterventions,
  listShipments,
  patchUldJsonLd,
  updateInterventionStatus
} from "./repository";
import { getCachedDashboardSnapshot, getRedisClient } from "./state-store";
import { env } from "../config/env";

const verifySignedRequest = (req: Request) => {
  if (!env.REQUIRE_SIGNED_INTEGRATIONS) {
    return true;
  }

  const eventId = req.header("x-event-id");
  const timestamp = req.header("x-timestamp");
  const nonce = req.header("x-nonce");
  const signature = req.header("x-signature");

  if (!eventId || !timestamp || !nonce || !signature || !env.IOT_SIGNING_SECRET) {
    return false;
  }

  const payload = `${timestamp}.${nonce}.${eventId}.${JSON.stringify(req.body)}`;
  const digest = createHmac("sha256", env.IOT_SIGNING_SECRET).update(payload).digest("hex");
  const expected = Buffer.from(digest);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const healthResponse = () => ({
  status: "ok",
  service: "AeroSentinel API",
  timestamp: new Date().toISOString()
});

export const createAeroRouter = () => {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json(healthResponse());
  });

  router.get("/fleet", async (_req, res, next) => {
    try {
      res.json({ fleet: await getFleetView() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/control-center", async (_req, res, next) => {
    try {
      res.json(await getControlCenter());
    } catch (error) {
      next(error);
    }
  });

  router.get("/analytics", async (_req, res, next) => {
    try {
      res.json(await getAnalyticsSummary());
    } catch (error) {
      next(error);
    }
  });

  router.get("/weather", async (_req, res, next) => {
    try {
      res.json({ weather: await getWeatherOverview() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/ingestion/one-record", async (req, res, next) => {
    try {
      const payload = oneRecordIngestSchema.parse(req.body);
      const shipment = await ingestOneRecordDocument(payload.source, payload.document);
      res.status(201).json({ shipment });
    } catch (error) {
      next(error);
    }
  });

  router.post("/ingestion/telemetry", async (req, res, next) => {
    try {
      const payload = telemetryIngestSchema.parse(req.body);
      await ingestTelemetry(payload);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/integrations/iot/http", async (req, res, next) => {
    try {
      if (!verifySignedRequest(req)) {
        res.status(401).json({ message: "Invalid integration signature" });
        return;
      }
      const payload = telemetryIngestSchema.parse(req.body);
      await ingestTelemetry(payload);
      res.status(202).json({ accepted: true, trusted: env.REQUIRE_SIGNED_INTEGRATIONS });
    } catch (error) {
      next(error);
    }
  });

  router.post("/ingestion/custody", async (req, res, next) => {
    try {
      const payload = custodyIngestSchema.parse(req.body);
      await ingestCustody(payload);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/dashboard/summary", async (_req, res, next) => {
    try {
      const cached = await getCachedDashboardSnapshot();
      const snapshot = cached ?? (await getDashboardSnapshot());
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  router.get("/shipments", async (_req, res, next) => {
    try {
      res.json({ shipments: await listShipments() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/shipments/reference", async (_req, res, next) => {
    try {
      res.json({ shipment: await getReferenceShipment() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/flights", async (_req, res, next) => {
    try {
      res.json({ flights: await listFlights() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/uld-tracking", async (_req, res, next) => {
    try {
      res.json({ ulds: await getUldMonitoring() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts", async (_req, res, next) => {
    try {
      res.json({ alerts: await listAlerts() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/interventions", async (_req, res, next) => {
    try {
      res.json({ interventions: await listInterventions() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/control-center", async (_req, res, next) => {
    try {
      res.json(await getControlCenter());
    } catch (error) {
      next(error);
    }
  });

  router.patch("/interventions/:id", async (req, res, next) => {
    try {
      const params = z.object({ id: z.string().min(1) }).parse(req.params);
      const payload = ackInterventionSchema.parse(req.body);
      const intervention = await updateInterventionStatus(params.id, payload);
      res.json({ intervention });
    } catch (error) {
      next(error);
    }
  });

  router.post("/cargo/scan-out", async (req, res, next) => {
    try {
      const payload = z.object({ cargoId: z.string(), zone: z.string().optional(), handler: z.string().optional() }).parse(req.body);
      await cargoScanOut(payload.cargoId, payload.zone, payload.handler);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/cargo/scan-in", async (req, res, next) => {
    try {
      const payload = z.object({ cargoId: z.string(), zone: z.string().optional(), handler: z.string().optional() }).parse(req.body);
      await cargoScanIn(payload.cargoId, payload.zone, payload.handler);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/cargo/verify", async (req, res, next) => {
    try {
      const payload = z.object({ cargoId: z.string(), zone: z.string().optional(), handler: z.string().optional() }).parse(req.body);
      await cargoVerify(payload.cargoId, payload.zone, payload.handler);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/cargo/reload", async (req, res, next) => {
    try {
      const payload = z.object({ cargoId: z.string(), zone: z.string().optional(), handler: z.string().optional() }).parse(req.body);
      await cargoReload(payload.cargoId, payload.zone, payload.handler);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/history/:id", async (req, res, next) => {
    try {
      res.json({ history: await getCargoHistory(z.object({ id: z.string() }).parse(req.params).id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/location/:id", async (req, res, next) => {
    try {
      res.json(await getCargoLocation(z.object({ id: z.string() }).parse(req.params).id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/risk/:id", async (req, res, next) => {
    try {
      res.json(await getCargoRisk(z.object({ id: z.string() }).parse(req.params).id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/video/:id", async (req, res, next) => {
    try {
      res.json(await getCargoVideo(z.object({ id: z.string() }).parse(req.params).id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/video/:id/:eventId/replay", async (req, res, next) => {
    try {
      const params = z.object({ id: z.string(), eventId: z.string() }).parse(req.params);
      res.json(await getCargoVideoReplay(params.id, params.eventId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/video/:id/:eventId/frame/:frameIndex", async (req, res, next) => {
    try {
      const params = z.object({ id: z.string(), eventId: z.string(), frameIndex: z.coerce.number().int() }).parse(req.params);
      res.json(await getCargoVideoFrame(params.id, params.eventId, params.frameIndex));
    } catch (error) {
      next(error);
    }
  });

  router.get("/cargo/chain-of-custody/:id", async (req, res, next) => {
    try {
      const id = z.object({ id: z.string() }).parse(req.params).id;
      res.json({ custody: (await listCargoCustody()).filter((entry) => entry.pieceId === id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/uld/:id/status", async (req, res, next) => {
    try {
      res.json(await getUldStatus(z.object({ id: z.string() }).parse(req.params).id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/uld/:id/actions", async (req, res, next) => {
    try {
      res.json({ actions: await getUldActions(z.object({ id: z.string() }).parse(req.params).id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/uld/:id/workflows", async (req, res, next) => {
    try {
      res.json({ workflows: await getUldWorkflows(z.object({ id: z.string() }).parse(req.params).id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/uld/:id/timeline", async (req, res, next) => {
    try {
      res.json({ timeline: await getUldTimeline(z.object({ id: z.string() }).parse(req.params).id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/actions/:id/complete", async (req, res, next) => {
    try {
      const params = z.object({ id: z.string() }).parse(req.params);
      const intervention = await updateInterventionStatus(params.id, { status: "COMPLETED" });
      res.json({ intervention });
    } catch (error) {
      next(error);
    }
  });

  router.post("/alert/subscribe", (_req, res) => {
    res.status(202).json({ accepted: true });
  });

  router.post("/uld/:id/reset", async (req, res, next) => {
    try {
      const id = z.object({ id: z.string() }).parse(req.params).id;
      const document = await patchUldJsonLd(id, {
        complianceStatus: "OK",
        exposureUsedMinutes: 0,
        exposureRemainingMinutes: env.RISK_EXPOSURE_MINUTES,
        riskScore: 0
      });
      res.json(document);
    } catch (error) {
      next(error);
    }
  });

  router.get("/ulds/:id", async (req, res, next) => {
    try {
      res.json(await getUldJsonLd(z.object({ id: z.string() }).parse(req.params).id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/ulds", async (req, res, next) => {
    try {
      const payload = z
        .object({
          serialNumber: z.string(),
          flightNumber: z.string().optional(),
          locationCode: z.string().optional(),
          complianceStatus: z.string().optional(),
          exposureUsedMinutes: z.number().optional(),
          exposureRemainingMinutes: z.number().optional(),
          riskScore: z.number().optional()
        })
        .parse(req.body);
      res.status(201).json(await createUldJsonLd(payload));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/ulds/:id", async (req, res, next) => {
    try {
      const params = z.object({ id: z.string() }).parse(req.params);
      const payload = z
        .object({
          locationCode: z.string().optional(),
          complianceStatus: z.string().optional(),
          exposureUsedMinutes: z.number().optional(),
          exposureRemainingMinutes: z.number().optional(),
          riskScore: z.number().optional()
        })
        .parse(req.body);
      res.json(await patchUldJsonLd(params.id, payload));
    } catch (error) {
      next(error);
    }
  });

  router.get("/one-record/ulds/:id", async (req, res, next) => {
    try {
      res.json(await getUldJsonLd(z.object({ id: z.string() }).parse(req.params).id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/one-record/ulds", async (req, res, next) => {
    try {
      const payload = z
        .object({
          serialNumber: z.string(),
          flightNumber: z.string().optional(),
          locationCode: z.string().optional()
        })
        .parse(req.body);
      res.status(201).json(await createUldJsonLd(payload));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/one-record/ulds/:id", async (req, res, next) => {
    try {
      const params = z.object({ id: z.string() }).parse(req.params);
      const payload = z.object({ locationCode: z.string().optional(), complianceStatus: z.string().optional() }).parse(req.body);
      res.json(await patchUldJsonLd(params.id, payload));
    } catch (error) {
      next(error);
    }
  });

  router.get("/contracts/openapi.json", (_req, res) => {
    res.json(getOpenApiContract());
  });

  router.get("/contracts/schemas/:name", (req, res) => {
    const schemas = getContractSchemas();
    const name = z.object({ name: z.string() }).parse(req.params).name as keyof typeof schemas;
    if (!schemas[name]) {
      res.status(404).json({ message: "Schema not found" });
      return;
    }
    res.json(schemas[name]);
  });

  router.get("/stream/events", async (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      res.write(`data: ${JSON.stringify({ type: "connected", at: new Date().toISOString() })}\n\n`);

      const redis = await getRedisClient();
      if (!redis) {
        const interval = setInterval(() => {
          res.write(`data: ${JSON.stringify({ type: "heartbeat", at: new Date().toISOString() })}\n\n`);
        }, 15000);

        req.on("close", () => {
          clearInterval(interval);
          res.end();
        });
        return;
      }

      const subscriber = redis.duplicate();
      await subscriber.connect();
      await subscriber.subscribe("aerosentinel:stream");

      subscriber.on("message", (_channel, message) => {
        res.write(`data: ${message}\n\n`);
      });

      const interval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: "heartbeat", at: new Date().toISOString() })}\n\n`);
      }, 15000);

      req.on("close", async () => {
        clearInterval(interval);
        await subscriber.unsubscribe("aerosentinel:stream");
        await subscriber.quit();
        res.end();
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
