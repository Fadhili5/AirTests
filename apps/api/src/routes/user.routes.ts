import { Router } from "express";
import { employmentSchema, kycSchema, profileSchema } from "@lending/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { getDashboardData } from "../services/dashboard.service";
import { updateUserEmployment, updateUserKyc, updateUserProfile } from "../services/user.service";

const router = Router();

router.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const dashboard = await getDashboardData(req.auth!.userId);
    res.json(dashboard);
  })
);

router.put(
  "/profile",
  requireAuth,
  validateBody(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUserProfile(req.auth!.userId, req.body);
    res.json({ user });
  })
);

router.put(
  "/kyc",
  requireAuth,
  validateBody(kycSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUserKyc(req.auth!.userId, req.body);
    res.json({ user });
  })
);

router.put(
  "/employment",
  requireAuth,
  validateBody(employmentSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUserEmployment(req.auth!.userId, req.body);
    res.json({ user });
  })
);

export default router;

