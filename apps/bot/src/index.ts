import express from "express";
import { Context, Telegraf } from "telegraf";
import { env } from "./utils/env";
import {
  handleStartLikeFlow,
  sendApplyInstructions,
  sendStatusSummary,
  sendWalletSummary,
  sendWithdrawInstructions
} from "./commands/helpers";

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

bot.start(async (ctx) => {
  await handleStartLikeFlow(ctx);
});

bot.command("register", async (ctx) => {
  await handleStartLikeFlow(ctx);
});

bot.command("apply", async (ctx) => {
  await sendApplyInstructions(ctx);
});

bot.command("status", async (ctx) => {
  await sendStatusSummary(ctx);
});

bot.command("wallet", async (ctx) => {
  await sendWalletSummary(ctx);
});

bot.command("withdraw", async (ctx) => {
  await sendWithdrawInstructions(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "/start - Register your Telegram profile and open the Mini App",
      "/register - Re-open onboarding and KYC flow",
      "/apply - Submit or continue a loan application",
      "/status - View your latest verification and loan status",
      "/wallet - View wallet balances",
      "/withdraw - Withdraw refundable wallet funds",
      "/help - Show command help"
    ].join("\n")
  );
});

bot.action("apply_loan", async (ctx) => {
  await ctx.answerCbQuery();
  await sendApplyInstructions(ctx);
});

bot.action("check_status", async (ctx) => {
  await ctx.answerCbQuery();
  await sendStatusSummary(ctx);
});

bot.action("wallet", async (ctx) => {
  await ctx.answerCbQuery();
  await sendWalletSummary(ctx);
});

bot.action("withdraw", async (ctx) => {
  await ctx.answerCbQuery();
  await sendWithdrawInstructions(ctx);
});

bot.action("contact_support", async (ctx) => {
  await ctx.answerCbQuery("Support link is in the keyboard below.");
  await ctx.reply(`Support: ${env.SUPPORT_TELEGRAM_URL}`);
});

bot.catch(async (error: unknown, ctx: Context) => {
  console.error("Bot error", error);
  await ctx.reply("We hit a temporary issue while processing your request. Please try again.");
});

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "bot",
    timestamp: new Date().toISOString()
  });
});

app.post("/telegram/webhook", async (req, res) => {
  if (req.header("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ message: "Invalid Telegram webhook secret" });
    return;
  }

  await bot.handleUpdate(req.body, res);
  if (!res.headersSent) {
    res.status(200).json({ ok: true });
  }
});

app.listen(env.BOT_PORT, () => {
  console.log(`Bot webhook server listening on ${env.BOT_PORT}`);
});
