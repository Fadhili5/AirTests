import { prisma } from "../lib/prisma";
import { upsertTelegramUser } from "./telegram-auth.service";

export const registerTelegramUserFromBot = async (payload: {
  telegramId: string;
  username?: string | null;
  fullName?: string | null;
}) => {
  return upsertTelegramUser({
    telegramId: payload.telegramId,
    username: payload.username ?? null,
    fullName: payload.fullName ?? null
  });
};

export const getUserStatusForBot = async (telegramId: string) => {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: {
      wallet: true,
      applications: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  return user;
};

