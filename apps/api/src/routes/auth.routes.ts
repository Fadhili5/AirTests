import { Router } from "express";
import { telegramAuthSchema } from "@lending/shared";
import { asyncHandler } from "../utils/async-handler";
import { issueJwt, validateAdminCredentials } from "../services/auth.service";
import { upsertTelegramUser, validateTelegramInitData } from "../services/telegram-auth.service";
import { requireAuth } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate.middleware";
import { serializeUser } from "../utils/serializers";

const router = Router();

router.post(
  "/telegram",
  validateBody(telegramAuthSchema),
  asyncHandler(async (req, res) => {
    const telegram = validateTelegramInitData(req.body.initData);
    const user = await upsertTelegramUser(telegram);
    const token = await issueJwt({
      userId: user.id,
      telegramId: user.telegramId,
      role: user.role
    });

    res.json({
      token,
      user: serializeUser(user)
    });
  })
);

router.post(
  "/admin/login",
  asyncHandler(async (req, res) => {
    const user = await validateAdminCredentials(req.body.email, req.body.password);
    const token = await issueJwt({
      userId: user.id,
      telegramId: user.telegramId,
      role: user.role
    });

    res.json({
      token,
      user: serializeUser(user)
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: req.auth!.userId
      }
    });

    res.json({
      user: serializeUser(user)
    });
  })
);

export default router;

