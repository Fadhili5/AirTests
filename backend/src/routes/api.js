import { Router } from "express";

export function buildApiRouter({
  config,
  exposureRepository,
  operationsRepository,
  analyticsService,
  actionOrchestrator,
  auditStore,
  subscriptionRepository,
  authMiddleware,
}) {
  const router = Router();

  router.use(authMiddleware);

  router.get("/health", async (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  router.get("/uld/:id/status", async (req, res) => {
    const state = await exposureRepository.getState(req.params.id);
    const telemetry = await exposureRepository.getTelemetry(req.params.id, 50);
    if (!state) {
      return res.status(404).json({ error: "ULD not found" });
    }
    res.json({ status: state, telemetry });
  });

  router.get("/fleet", async (_req, res) => {
    res.json(await exposureRepository.getFleetStatus());
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
    });
  });

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
