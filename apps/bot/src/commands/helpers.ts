import { Context } from "telegraf";
import { fetchBotUserStatus, registerBotUser } from "../services/api-client";
import { miniAppKeyboard, replyKeyboard } from "../utils/keyboards";
import { env } from "../utils/env";

export const ensureRegistered = async (ctx: Context) => {
  if (!ctx.from) {
    throw new Error("Telegram context missing user");
  }

  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ").trim() || null;
  return registerBotUser({
    telegramId: String(ctx.from.id),
    username: ctx.from.username ?? null,
    fullName
  });
};

export const handleStartLikeFlow = async (ctx: Context) => {
  await ensureRegistered(ctx);

  await ctx.reply(
    "Welcome to KopaBot. Your Telegram account is linked and you can complete KYC, fund your verification wallet, apply for a loan, and manage repayments inside the Mini App.",
    replyKeyboard()
  );
  await ctx.reply(
    "Use the controls below to launch the Mini App or manage your account from Telegram.",
    miniAppKeyboard()
  );
};

export const sendStatusSummary = async (ctx: Context) => {
  if (!ctx.from) {
    return;
  }

  const user = await fetchBotUserStatus(String(ctx.from.id));
  if (!user) {
    await ctx.reply("Your account is not registered yet. Use /start first.");
    return;
  }

  const latestApplication = user.applications?.[0];
  const wallet = user.wallet;

  const statusLines = [
    `Verification: ${user.verificationStatus}`,
    `Risk score: ${user.riskScore}`,
    `Wallet refundable balance: KES ${Number(wallet?.refundableAmount ?? 0).toFixed(2)}`
  ];

  if (latestApplication) {
    statusLines.push(
      `Latest loan: ${latestApplication.status}`,
      `Requested: KES ${Number(latestApplication.requestedAmount).toFixed(2)}`,
      `Approved: KES ${Number(latestApplication.approvedAmount ?? 0).toFixed(2)}`
    );
  } else {
    statusLines.push("Latest loan: No application submitted yet");
  }

  await ctx.reply(statusLines.join("\n"), miniAppKeyboard());
};

export const sendWalletSummary = async (ctx: Context) => {
  if (!ctx.from) {
    return;
  }

  const user = await fetchBotUserStatus(String(ctx.from.id));
  if (!user?.wallet) {
    await ctx.reply("Your wallet is being created. Open the Mini App to complete setup.", miniAppKeyboard());
    return;
  }

  await ctx.reply(
    [
      `Wallet balance: KES ${Number(user.wallet.balance).toFixed(2)}`,
      `Held amount: KES ${Number(user.wallet.heldAmount).toFixed(2)}`,
      `Refundable amount: KES ${Number(user.wallet.refundableAmount).toFixed(2)}`,
      `Status: ${user.wallet.status}`
    ].join("\n"),
    miniAppKeyboard()
  );
};

export const sendWithdrawInstructions = async (ctx: Context) => {
  await ctx.reply(
    "Open the Mini App withdrawal screen to send your refundable wallet balance back to your M-Pesa line.",
    Markup.inlineKeyboard([[Markup.button.webApp("Withdraw in Mini App", `${env.TELEGRAM_MINI_APP_URL}/withdraw`)]])
  );
};

export const sendApplyInstructions = async (ctx: Context) => {
  await ctx.reply(
    "Launch the Mini App to complete KYC, pay the KES 100 verification hold, and submit a loan request.",
    Markup.inlineKeyboard([[Markup.button.webApp("Apply in Mini App", `${env.TELEGRAM_MINI_APP_URL}/apply`)]])
  );
};

