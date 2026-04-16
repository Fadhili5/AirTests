import { Router } from "express";
import { verifyInternalBotToken } from "../middleware/webhook.middleware";
import { asyncHandler } from "../utils/async-handler";
import { getUserStatusForBot, registerTelegramUserFromBot } from "../services/internal.service";

const router = Router();

router.use(verifyInternalBotToken);

router.post(
  "/telegram/register",
  asyncHandler(async (req, res) => {
    const user = await registerTelegramUserFromBot(req.body);
    res.json({
      user
    });
  })
);

router.get(
  "/telegram/status/:telegramId",
  asyncHandler(async (req, res) => {
    const user = await getUserStatusForBot(req.params.telegramId);
    res.json({ user });
  })
);

export default router;

