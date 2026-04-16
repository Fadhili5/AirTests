import { LoanApplication, Prisma, RiskAssessment, Transaction, User, Wallet } from "@prisma/client";

const decimalToNumber = (value: Prisma.Decimal | null | undefined) =>
  value ? Number(value) : null;

export const serializeUser = (user: User) => ({
  id: user.id,
  telegramId: user.telegramId,
  username: user.username,
  fullName: user.fullName,
  nationalId: user.nationalId,
  phoneNumber: user.phoneNumber,
  mpesaNumber: user.mpesaNumber,
  dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
  employmentStatus: user.employmentStatus,
  monthlyIncome: decimalToNumber(user.monthlyIncome),
  riskScore: user.riskScore,
  verificationStatus: user.verificationStatus,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString()
});

export const serializeWallet = (wallet: Wallet | null) =>
  wallet
    ? {
        balance: Number(wallet.balance),
        heldAmount: Number(wallet.heldAmount),
        refundableAmount: Number(wallet.refundableAmount),
        status: wallet.status
      }
    : null;

export const serializeLoan = (application: LoanApplication | null) =>
  application
    ? {
        id: application.id,
        requestedAmount: Number(application.requestedAmount),
        approvedAmount: decimalToNumber(application.approvedAmount),
        interestRate: decimalToNumber(application.interestRate),
        durationDays: application.durationDays,
        dueDate: application.dueDate?.toISOString() ?? null,
        repaymentTotal: decimalToNumber(application.repaymentTotal),
        status: application.status,
        rejectionReason: application.rejectionReason,
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        disbursedAt: application.disbursedAt?.toISOString() ?? null,
        repaidAt: application.repaidAt?.toISOString() ?? null
      }
    : null;

export const serializeRisk = (assessment: RiskAssessment | null) =>
  assessment
    ? {
        score: assessment.score,
        duplicateCheck: assessment.duplicateCheck,
        fraudFlag: assessment.fraudFlag,
        reviewStatus: assessment.reviewStatus,
        notes: assessment.notes as Record<string, unknown> | null,
        createdAt: assessment.createdAt.toISOString()
      }
    : null;

export const serializeTransaction = (transaction: Transaction) => ({
  id: transaction.id,
  type: transaction.type,
  amount: Number(transaction.amount),
  reference: transaction.reference,
  status: transaction.status,
  narrative: transaction.narrative,
  createdAt: transaction.createdAt.toISOString()
});

