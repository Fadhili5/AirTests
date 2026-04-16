import { Prisma, TransactionType } from "@prisma/client";
import { normalizeKenyanPhone } from "@lending/shared";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import { initiateStkPush, sendB2CPayout } from "./daraja.service";

const createReference = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const initiateVerificationHold = async ({
  userId,
  phoneNumber,
  idempotencyKey
}: {
  userId: string;
  phoneNumber?: string;
  idempotencyKey: string;
}) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user.phoneNumber && !phoneNumber) {
    throw new HttpError(400, "Add a phone number before initiating the verification hold");
  }

  if (Number(user.wallet?.refundableAmount ?? 0) >= env.VERIFICATION_HOLD_AMOUNT) {
    return {
      status: "ALREADY_FUNDED"
    };
  }

  const existing = await prisma.transaction.findUnique({
    where: {
      idempotencyKey
    }
  });

  if (existing) {
    return existing;
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: TransactionType.VERIFICATION_HOLD,
      amount: new Prisma.Decimal(env.VERIFICATION_HOLD_AMOUNT),
      reference: createReference("VH"),
      idempotencyKey,
      narrative: "Verification wallet hold"
    }
  });

  await initiateStkPush({
    phoneNumber: normalizeKenyanPhone(phoneNumber ?? user.phoneNumber!),
    amount: env.VERIFICATION_HOLD_AMOUNT,
    accountReference: `${env.APP_NAME} Verify`,
    transactionDesc: "Verification wallet hold",
    transactionId: transaction.id
  });

  return transaction;
};

export const withdrawWalletBalance = async ({
  userId,
  amount,
  mpesaNumber,
  idempotencyKey
}: {
  userId: string;
  amount: number;
  mpesaNumber?: string;
  idempotencyKey: string;
}) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user.wallet) {
    throw new HttpError(404, "Wallet not found");
  }

  if (Number(user.wallet.refundableAmount) < amount) {
    throw new HttpError(400, "Insufficient refundable wallet balance");
  }

  const payoutSource = mpesaNumber ?? user.mpesaNumber ?? user.phoneNumber;
  if (!payoutSource) {
    throw new HttpError(400, "M-Pesa number required for withdrawal");
  }
  const payoutNumber = normalizeKenyanPhone(payoutSource);

  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey }
  });
  if (existing) {
    return existing;
  }

  const transaction = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        refundableAmount: { decrement: amount }
      }
    });

    return tx.transaction.create({
      data: {
        userId,
        type: TransactionType.WALLET_WITHDRAWAL,
        amount: new Prisma.Decimal(amount),
        reference: createReference("WD"),
        idempotencyKey,
        narrative: "Wallet withdrawal"
      }
    });
  });

  try {
    await sendB2CPayout({
      phoneNumber: payoutNumber,
      amount,
      remarks: "Wallet withdrawal",
      occasion: "Wallet withdrawal",
      transactionId: transaction.id
    });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED"
        }
      });
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          refundableAmount: { increment: amount }
        }
      });
    });
    throw error;
  }

  return transaction;
};

export const refundApplicationHold = async (applicationId: string) => {
  const application = await prisma.loanApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      user: {
        include: {
          wallet: true
        }
      }
    }
  });

  const refundable = Number(application.user.wallet?.refundableAmount ?? 0);
  if (refundable <= 0) {
    throw new HttpError(400, "No refundable balance available");
  }

  return withdrawWalletBalance({
    userId: application.user.id,
    amount: refundable,
    mpesaNumber: application.user.mpesaNumber ?? application.user.phoneNumber ?? undefined,
    idempotencyKey: `admin-refund-${applicationId}`
  });
};
