import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

export const verifyTelegramWebhook = (req: Request, _res: Response, next: NextFunction) => {
  const secret = req.header("x-telegram-bot-api-secret-token");
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    next(new HttpError(401, "Invalid Telegram webhook secret"));
    return;
  }
  next();
};

export const verifyMpesaWebhook = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.query.token;
  if (token !== env.MPESA_CALLBACK_TOKEN) {
    next(new HttpError(401, "Invalid M-Pesa callback token"));
    return;
  }
  next();
};

export const verifyInternalBotToken = (req: Request, _res: Response, next: NextFunction) => {
  const internalToken = req.header("x-bot-token");
  if (internalToken !== env.BOT_INTERNAL_TOKEN) {
    next(new HttpError(401, "Invalid internal bot token"));
    return;
  }
  next();
};

