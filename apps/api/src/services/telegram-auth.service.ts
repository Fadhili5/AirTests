import crypto from "node:crypto";
import { VerificationStatus } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

const parseInitData = (initData: string) => {
  const params = new URLSearchParams(initData);
  const data: Record<string, string> = {};
  params.forEach((value, key) => {
    data[key] = value;
  });
  return data;
};

export const validateTelegramInitData = (initData: string) => {
  const data = parseInitData(initData);
  const hash = data.hash;
  delete data.hash;

  const checkString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(env.TELEGRAM_BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(checkString)
    .digest("hex");

  if (computedHash !== hash) {
    throw new Error("Invalid Telegram init data hash");
  }

  const authDate = Number(data.auth_date ?? 0);
  const sessionAgeSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || sessionAgeSeconds > 60 * 60) {
    throw new Error("Telegram init data has expired");
  }

  const rawUser = data.user ? JSON.parse(data.user) : null;

  if (!rawUser?.id) {
    throw new Error("Telegram user payload missing");
  }

  return {
    telegramId: String(rawUser.id),
    username: rawUser.username ?? null,
    fullName: [rawUser.first_name, rawUser.last_name].filter(Boolean).join(" ").trim() || null
  };
};

export const upsertTelegramUser = async ({
  telegramId,
  username,
  fullName
}: {
  telegramId: string;
  username: string | null;
  fullName: string | null;
}) => {
  return prisma.user.upsert({
    where: {
      telegramId
    },
    update: {
      username,
      fullName: fullName ?? undefined
    },
    create: {
      telegramId,
      username,
      fullName,
      verificationStatus: VerificationStatus.PENDING,
      wallet: {
        create: {}
      }
    },
    include: {
      wallet: true
    }
  });
};
