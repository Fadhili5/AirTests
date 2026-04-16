import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { verifyMpesaWebhook } from "../middleware/webhook.middleware";
import { processB2CResult, processB2CTimeout, processStkCallback } from "../services/daraja.service";

const router = Router();

router.post(
  "/mpesa/stk",
  verifyMpesaWebhook,
  asyncHandler(async (req, res) => {
    await processStkCallback(req.body);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  })
);

router.post(
  "/mpesa/b2c/result",
  verifyMpesaWebhook,
  asyncHandler(async (req, res) => {
    await processB2CResult(req.body);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  })
);

router.post(
  "/mpesa/b2c/timeout",
  verifyMpesaWebhook,
  asyncHandler(async (req, res) => {
    await processB2CTimeout(req.body);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  })
);

export default router;

