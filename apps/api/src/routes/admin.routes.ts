import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { prisma } from "../lib/prisma";
import { adminApproveLoan, adminRejectLoan } from "../services/loan.service";
import { refundApplicationHold } from "../services/wallet.service";
import { serializeLoan, serializeRisk, serializeUser } from "../utils/serializers";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json({ users: users.map(serializeUser) });
  })
);

router.get(
  "/applications",
  asyncHandler(async (_req, res) => {
    const applications = await prisma.loanApplication.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      applications: applications.map((application) => ({
        ...serializeLoan(application),
        user: serializeUser(application.user)
      }))
    });
  })
);

router.get(
  "/high-risk",
  asyncHandler(async (_req, res) => {
    const assessments = await prisma.riskAssessment.findMany({
      where: {
        OR: [{ score: { lt: 70 } }, { fraudFlag: true }]
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      assessments: assessments.map((assessment) => ({
        ...serializeRisk(assessment),
        user: serializeUser(assessment.user)
      }))
    });
  })
);

router.post(
  "/approve/:id",
  asyncHandler(async (req, res) => {
    const application = await adminApproveLoan(req.params.id);
    res.json({ application: serializeLoan(application) });
  })
);

router.post(
  "/reject/:id",
  asyncHandler(async (req, res) => {
    const application = await adminRejectLoan(req.params.id, req.body.reason ?? "Rejected by admin");
    res.json({ application: serializeLoan(application) });
  })
);

router.post(
  "/refund/:id",
  asyncHandler(async (req, res) => {
    const transaction = await refundApplicationHold(req.params.id);
    res.json({ transaction });
  })
);

export default router;

