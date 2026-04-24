import { Router } from "express";

export function buildApiRouter({
  config,
  exposureRepository,
  operationsRepository,
  analyticsService,
  actionOrchestrator,
  auditStore,
  subscriptionRepository,
  reconciliationService,
  oneRecordService,
  authMiddleware,
}) {
  const router = Router();
  const strictJsonLdTypes = new Set(["application/ld+json"]);

  router.use(authMiddleware);

  router.get("/health", async (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  router.get("/uld/:id/status", async (req, res) => {
    await reconciliationService.enqueueVerification(req.params.id, "uld_status_read");
    const state = await exposureRepository.getState(req.params.id);
    const telemetry = await exposureRepository.getTelemetry(req.params.id, 50);
    if (!state) {
      return res.status(404).json({ error: "ULD not found" });
    }
    res.json({ status: state, telemetry });
  });

  router.get("/fleet", async (_req, res) => {
    const fleet = await exposureRepository.getFleetStatus();
    await Promise.allSettled(
      fleet.slice(0, 50).map((item) =>
        reconciliationService.enqueueVerification(item.uldId, "fleet_read"),
      ),
    );
    res.json(fleet);
  });

  router.get("/alerts", async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit || "25"), 10);
    res.json(await exposureRepository.getAlerts(Math.min(limit, 100)));
  });

  router.get("/analytics", async (_req, res) => {
    res.json(await analyticsService.getSummary());
  });

  router.get("/audit", async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit || "50"), 10);
    res.json(await auditStore.list(Math.min(limit, 100)));
  });

  router.get("/verification/audit", async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit || "50"), 10);
    res.json(await reconciliationService.listAudits(Math.min(limit, 100)));
  });

  router.get("/platform", async (_req, res) => {
    res.json({
      apiSecurity: config.auth.disabled ? "disabled-for-local-dev" : "keycloak-jwt",
      features: {
        liveDashboard: true,
        liveAlerts: true,
        telemetryChart: true,
        digitalTwinIntegration: true,
        predictiveRisk: true,
        actionOrchestration: true,
        workflowEngine: true,
        operationalContext: true,
        verificationQueue: true,
        oneRecordDigitalTwin: true,
      },
      performanceTargets: {
        redisReadMs: 50,
        apiResponseMs: 150,
        uldScale: 10000,
      },
    });
  });

  router.get("/control-center", async (_req, res) => {
    const fleet = await exposureRepository.getFleetStatus();
    const pendingActions = await operationsRepository.listPendingActions(100);
    const workflows = await operationsRepository.listActiveWorkflows(100);
    const alerts = await exposureRepository.getAlerts(25);
    const analytics = await analyticsService.getSummary();
    res.json({
      fleet,
      pendingActions,
      workflows,
      alerts,
      analytics,
      flight: {
        number: config.operations.primaryFlightNumber,
        route: `${config.operations.originAirport}-${config.operations.destinationAirport}`,
        airline: config.operations.airlineCode,
      },
    });
  });

  router.get("/flights", async (_req, res) => {
    res.json([
      {
        id: config.operations.primaryFlightNumber,
        flight_number: config.operations.primaryFlightNumber,
        origin: config.operations.originAirport,
        destination: config.operations.destinationAirport,
        route: `${config.operations.originAirport}-${config.operations.destinationAirport}`,
        airline: "Emirates",
        aircraft: "B777F",
        aircraftType: "B777F",
        status: "Delayed",
        delay_minutes: 48,
        delayMinutes: 48,
      },
    ]);
  });

  async function getUldTwin(req, res) {
    const twin = await oneRecordService.getUld(req.params.id);
    if (!twin) {
      return res.status(404).json({ error: "ULD digital twin not found" });
    }
    res.setHeader("Content-Type", "application/ld+json");
    res.json(twin.payload || twin);
  }

  async function createUldTwin(req, res) {
    const validation = validateJsonLdRequest(req, strictJsonLdTypes);
    if (validation) {
      return res.status(validation.status).json({ error: validation.error });
    }

    const created = await oneRecordService.createUld(req.body);
    res.setHeader("Content-Type", "application/ld+json");
    res.status(created ? 201 : 202).json(created || { queued: true });
  }

  async function updateUldTwin(req, res) {
    const validation = validateJsonLdRequest(req, strictJsonLdTypes);
    if (validation) {
      return res.status(validation.status).json({ error: validation.error });
    }

    const updated = await oneRecordService.updateUld(req.params.id, req.body);
    res.setHeader("Content-Type", "application/ld+json");
    res.status(updated ? 200 : 202).json(updated || { queued: true });
  }

  router.get("/ulds/:id", getUldTwin);
  router.post("/ulds", createUldTwin);
  router.patch("/ulds/:id", updateUldTwin);
  router.get("/one-record/ulds/:id", getUldTwin);
  router.post("/one-record/ulds", createUldTwin);
  router.patch("/one-record/ulds/:id", updateUldTwin);

  router.post("/alert/subscribe", async (req, res) => {
    const subscription = {
      id: `sub-${Date.now()}`,
      webhookUrl: req.body?.webhookUrl || "",
      email: req.body?.email || "",
      createdAt: new Date().toISOString(),
    };
    if (!subscription.webhookUrl && !subscription.email) {
      return res.status(400).json({ error: "webhookUrl or email required" });
    }
    await subscriptionRepository.addSubscription(subscription);
    res.status(201).json(subscription);
  });

  router.post("/uld/:id/reset", async (req, res) => {
    await exposureRepository.resetState(req.params.id);
    res.status(202).json({ reset: true, uldId: req.params.id });
  });

  router.get("/uld/:id/actions", async (req, res) => {
    res.json(await operationsRepository.getActions(req.params.id, 50));
  });

  router.get("/uld/:id/workflows", async (req, res) => {
    res.json(await operationsRepository.getWorkflows(req.params.id, 50));
  });

  router.get("/uld/:id/timeline", async (req, res) => {
    res.json(await operationsRepository.getTimeline(req.params.id, 100));
  });

  router.post("/actions/:id/complete", async (req, res) => {
    const action = await actionOrchestrator.completeAction(req.params.id);
    if (!action) {
      return res.status(404).json({ error: "Action not found" });
    }
    res.json(action);
  });

  return router;
}

function validateJsonLdRequest(req, strictJsonLdTypes) {
  const contentType = String(req.headers["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (!strictJsonLdTypes.has(contentType)) {
    return {
      status: 415,
      error: "Content-Type must be application/ld+json",
    };
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return {
      status: 400,
      error: "JSON-LD object body required",
    };
  }

  if (!req.body["@context"]) {
    return {
      status: 400,
      error: "JSON-LD @context is required",
    };
  }

  return null;
}
