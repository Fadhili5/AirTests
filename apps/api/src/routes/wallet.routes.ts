import { Router } from "express";
import { holdSchema, withdrawSchema } from "@lending/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/http-error";
import { getDashboardData } from "../services/dashboard.service";
import { initiateVerificationHold, withdrawWalletBalance } from "../services/wallet.service";

const router = Router();

const getIdempotencyKey = (header: string | undefined, fallback: string) => header ?? fallback;

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const dashboard = await getDashboardData(req.auth!.userId);
    res.json({ wallet: dashboard.wallet, transactions: dashboard.transactions });
  })
);

router.post(
  "/hold",
  requireAuth,
  validateBody(holdSchema),
  asyncHandler(async (req, res) => {
    const idempotencyKey = getIdempotencyKey(req.header("x-idempotency-key") ?? undefined, `hold-${req.auth!.userId}`);
    const transaction = await initiateVerificationHold({
      userId: req.auth!.userId,
      phoneNumber: req.body.phoneNumber,
      idempotencyKey
    });
    res.json({ transaction });
  })
);

router.post(
  "/withdraw",
  requireAuth,
  validateBody(withdrawSchema),
  asyncHandler(async (req, res) => {
    if (req.body.amount < 1) {
      throw new HttpError(400, "Withdrawal amount must be positive");
    }

    const transaction = await withdrawWalletBalance({
      userId: req.auth!.userId,
      amount: req.body.amount,
      mpesaNumber: req.body.mpesaNumber,
      idempotencyKey:
        req.header("x-idempotency-key") ?? `withdraw-${req.auth!.userId}-${req.body.amount}`
    });

    res.json({ transaction });
  })
);

export default router;

