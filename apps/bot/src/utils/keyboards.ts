import { Markup } from "telegraf";
import { env } from "./env";

export const miniAppKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.webApp("Open Mini App", env.TELEGRAM_MINI_APP_URL)],
    [
      Markup.button.callback("Apply Loan", "apply_loan"),
      Markup.button.callback("Check Status", "check_status")
    ],
    [
      Markup.button.callback("Wallet", "wallet"),
      Markup.button.callback("Withdraw", "withdraw")
    ],
    [Markup.button.callback("Contact Support", "contact_support")]
  ]);

export const replyKeyboard = () =>
  Markup.keyboard([
    [{ text: "/apply" }, { text: "/status" }],
    [{ text: "/wallet" }, { text: "/withdraw" }],
    [{ text: "/help" }]
  ]).resize();
