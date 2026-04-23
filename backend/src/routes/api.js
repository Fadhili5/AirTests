import { Router } from "express";

export function buildApiRouter({
  exposureRepository,
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

  return router;
}
