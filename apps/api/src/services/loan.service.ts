import { LoanStatus, Prisma, TransactionType } from "@prisma/client";
import { LoanApplyInput, normalizeKenyanPhone } from "@lending/shared";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import { calculateLoanTerms, calculateOutstandingBalance } from "../utils/loan";
import { sendB2CPayout, initiateStkPush } from "./daraja.service";
import { evaluateRiskDecision, runRiskAssessment } from "./risk.service";

const createReference = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const submitLoanApplication = async (userId: string, input: LoanApplyInput) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user.nationalId || !user.phoneNumber || !user.mpesaNumber || !user.monthlyIncome) {
    throw new HttpError(400, "Complete registration, KYC, and employment details before applying");
  }

  if (Number(user.wallet?.refundableAmount ?? 0) < env.VERIFICATION_HOLD_AMOUNT) {
    throw new HttpError(400, "Verification wallet hold must be completed before applying");
  }

  const activeApplication = await prisma.loanApplication.findFirst({
    where: {
      userId,
      status: {
        in: [
          LoanStatus.UNDER_REVIEW,
          LoanStatus.MANUAL_REVIEW,
          LoanStatus.APPROVED,
          LoanStatus.DISBURSEMENT_PENDING,
          LoanStatus.DISBURSED
        ]
      }
    }
  });

  if (activeApplication) {
    throw new HttpError(409, "An active application already exists");
  }

  const application = await prisma.loanApplication.create({
    data: {
      userId,
      requestedAmount: new Prisma.Decimal(input.requestedAmount),
      durationDays: input.durationDays,
      status: LoanStatus.UNDER_REVIEW
    }
  });

  const assessment = await runRiskAssessment(userId, input.requestedAmount);
  const decision = evaluateRiskDecision(assessment.score);

  if (decision === "REJECT") {
    return prisma.loanApplication.update({
      where: { id: application.id },
      data: {
        status: LoanStatus.REJECTED,
        rejectionReason: "Risk engine rejected the application"
      }
    });
  }

  if (decision === "MANUAL_REVIEW") {
    return prisma.loanApplication.update({
      where: { id: application.id },
      data: {
        status: LoanStatus.MANUAL_REVIEW,
        rejectionReason: "Application requires manual review"
      }
    });
  }

  const terms = calculateLoanTerms({
    requestedAmount: input.requestedAmount,
    monthlyIncome: Number(user.monthlyIncome),
    durationDays: input.durationDays,
    baseRate: env.LOAN_BASE_INTEREST_RATE,
    multiplier: env.LOAN_MAX_MULTIPLIER
  });

  return prisma.loanApplication.update({
    where: { id: application.id },
    data: {
      approvedAmount: new Prisma.Decimal(terms.approvedAmount),
      interestRate: new Prisma.Decimal(terms.rate),
      dueDate: terms.dueDate,
      repaymentTotal: new Prisma.Decimal(terms.repaymentTotal),
      status: LoanStatus.APPROVED,
      rejectionReason: null
    }
  });
};

export const disburseApprovedLoan = async ({
  userId,
  applicationId,
  idempotencyKey
}: {
  userId: string;
  applicationId: string;
  idempotencyKey: string;
}) => {
  const application = await prisma.loanApplication.findFirstOrThrow({
    where: { id: applicationId, userId },
    include: { user: true }
  });

  if (application.status !== LoanStatus.APPROVED) {
    throw new HttpError(400, "Only approved loans can be disbursed");
  }

  const approvedAmount = Number(application.approvedAmount ?? 0);
  if (approvedAmount <= 0) {
    throw new HttpError(400, "Approved amount is not available");
  }

  const payoutSource = application.user.mpesaNumber ?? application.user.phoneNumber;
  if (!payoutSource) {
    throw new HttpError(400, "User does not have an M-Pesa payout number");
  }

  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey }
  });
  if (existing) {
    return existing;
  }

  const transaction = await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({
      where: { id: application.id },
      data: { status: LoanStatus.DISBURSEMENT_PENDING }
    });

    return tx.transaction.create({
      data: {
        userId,
        loanApplicationId: application.id,
        type: TransactionType.LOAN_DISBURSEMENT,
        amount: new Prisma.Decimal(approvedAmount),
        reference: createReference("LN"),
        idempotencyKey,
        narrative: "Loan disbursement"
      }
    });
  });

  try {
    await sendB2CPayout({
      phoneNumber: normalizeKenyanPhone(payoutSource),
      amount: approvedAmount,
      remarks: "Loan disbursement",
      occasion: "Loan disbursement",
      transactionId: transaction.id
    });
  } catch (error) {
    await prisma.loanApplication.update({
      where: { id: application.id },
      data: {
        status: LoanStatus.APPROVED
      }
    });
    throw error;
  }

  return transaction;
};

export const initiateLoanRepayment = async ({
  userId,
  applicationId,
  amount,
  idempotencyKey
}: {
  userId: string;
  applicationId: string;
  amount: number;
  idempotencyKey: string;
}) => {
  const application = await prisma.loanApplication.findFirstOrThrow({
    where: { id: applicationId, userId },
    include: { user: true }
  });

  if (![LoanStatus.DISBURSED, LoanStatus.OVERDUE].includes(application.status)) {
    throw new HttpError(400, "Only disbursed or overdue loans can be repaid");
  }

  const repaymentSource = application.user.mpesaNumber ?? application.user.phoneNumber;
  if (!repaymentSource) {
    throw new HttpError(400, "User does not have a repayment number");
  }

  const outstanding = await calculateOutstandingBalance(application);
  if (amount > outstanding) {
    throw new HttpError(400, "Repayment amount exceeds outstanding balance");
  }

  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey }
  });
  if (existing) {
    return existing;
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      loanApplicationId: application.id,
      type: TransactionType.REPAYMENT,
      amount: new Prisma.Decimal(amount),
      reference: createReference("RP"),
      idempotencyKey,
      narrative: "Loan repayment"
    }
  });

  await initiateStkPush({
    phoneNumber: normalizeKenyanPhone(repaymentSource),
    amount,
    accountReference: `${env.APP_NAME} Repayment`,
    transactionDesc: "Loan repayment",
    transactionId: transaction.id
  });

  return transaction;
};

export const getLoanStatus = async (userId: string) => {
  const application = await prisma.loanApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  if (!application) {
    return null;
  }

  const outstanding =
    application.repaymentTotal && [LoanStatus.DISBURSED, LoanStatus.OVERDUE].includes(application.status)
      ? await calculateOutstandingBalance(application)
      : 0;

  return {
    application,
    outstanding
  };
};

export const adminApproveLoan = async (applicationId: string) => {
  const application = await prisma.loanApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { user: true }
  });

  const terms = calculateLoanTerms({
    requestedAmount: Number(application.requestedAmount),
    monthlyIncome: Number(application.user.monthlyIncome ?? 0),
    durationDays: application.durationDays,
    baseRate: env.LOAN_BASE_INTEREST_RATE,
    multiplier: env.LOAN_MAX_MULTIPLIER
  });

  return prisma.loanApplication.update({
    where: { id: applicationId },
    data: {
      approvedAmount: new Prisma.Decimal(terms.approvedAmount),
      interestRate: new Prisma.Decimal(terms.rate),
      dueDate: terms.dueDate,
      repaymentTotal: new Prisma.Decimal(terms.repaymentTotal),
      status: LoanStatus.APPROVED,
      rejectionReason: null
    }
  });
};

export const adminRejectLoan = async (applicationId: string, rejectionReason: string) => {
  return prisma.loanApplication.update({
    where: { id: applicationId },
    d