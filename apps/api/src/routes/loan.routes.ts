import { Router } from "express";
import { loanApplySchema, repaySchema } from "@lending/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  disburseApprovedLoan,
  getLoanStatus,
  initiateLoanRepayment,
  submitLoanApplication
} from "../services/loan.service";
import { serializeLoan } from "../utils/serializers";

const router = Router();

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await getLoanStatus(req.auth!.userId);
    res.json(
      status
        ? {
            application: serializeLoan(status.application),
            outstanding: status.outstanding
          }
        : { application: null, outstanding: 0 }
    );
  })
);

router.post(
  "/apply",
  requireAuth,
  validateBody(loanApplySchema),
  asyncHandler(async (req, res) => {
    const application = await submitLoanApplication(req.auth!.userId, req.body);
    res.json({ application: serializeLoan(application) });
  })
);

router.post(
  "/:id/disburse",
  requireAuth,
  asyncHandler(async (req, res) => {
    const transaction = await disburseApprovedLoan({
      userId: req.auth!.userId,
      applicationId: req.params.id,
      idempotencyKey: req.header("x-idempotency-key") ?? `disburse-${req.params.id}`
    });
    res.json({ transaction });
  })
);

router.post(
  "/:id/repay",
  requireAuth,
  validateBody(repaySchema),
  asyncHandler(async (req, res) => {
    const transaction = await initiateLoanRepayment({
      userId: req.auth!.userId,
      applicationId: req.params.id,
      amount: req.body.amount,
      idempotencyKey: req.header("x-idempotency-key") ?? `repay-${req.params.id}-${req.body.amount}`
    });
    res.json({ transaction });
  })
);

export default router;

