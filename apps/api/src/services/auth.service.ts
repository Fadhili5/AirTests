import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { UserRole, VerificationStatus } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

type JwtPayload = {
  sub: string;
  telegramId: string;
  role: UserRole;
  tokenId: string;
};

export const issueJwt = async ({
  userId,
  telegramId,
  role
}: {
  userId: string;
  telegramId: string;
  role: UserRole;
}) => {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    {
      telegramId,
      role,
      tokenId
    },
    env.JWT_SECRET,
    {
      subject: userId,
      expiresIn: env.JWT_EXPIRES_IN
    }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenId,
      expiresAt
    }
  });

  return token;
};

export const verifyJwt = async (token: string) => {
  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  const session = await prisma.session.findUnique({
    where: {
      tokenId: payload.tokenId
    }
  });

  if (!session || session.expiresAt < new Date()) {
    throw new HttpError(401, "Session expired");
  }

  return {
    userId: payload.sub,
    telegramId: payload.telegramId,
    role: payload.role,
    tokenId: payload.tokenId
  };
};

export const validateAdminCredentials = async (email: string, password: string) => {
  if (email !== env.ADMIN_EMAIL) {
    throw new HttpError(401, "Invalid admin credentials");
  }

  const passwordMatches =
    env.ADMIN_PASSWORD.startsWith("$2")
      ? await bcrypt.compare(password, env.ADMIN_PASSWORD)
      : password === env.ADMIN_PASSWORD;

  if (!passwordMatches) {
    throw new HttpError(401, "Invalid admin credentials");
  }

  const user = await prisma.user.upsert({
    where: {
      telegramId: `admin:${email}`
    },
    update: {
      role: UserRole.ADMIN,
      username: email
    },
    create: {
      telegramId: `admin:${email}`,
      username: email,
      fullName: "Platform Admin",
      role: UserRole.ADMIN,
      verificationStatus: VerificationStatus.VERIFIED
    }
  });

  return user;
};
