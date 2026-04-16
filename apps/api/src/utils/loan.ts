import { LoanApplication, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const calculateLoanTerms = ({
  requestedAmount,
  monthlyIncome,
  durationDays,
  baseRate,
  multiplier
}: {
  requestedAmount: number;
  monthlyIncome: number;
  durationDays: number;
  baseRate: number;
  multiplier: number;
}) => {
  const incomeCap = Math.max(1000, Math.floor(monthlyIncome * multiplier));
  const approvedAmount = Math.min(requestedAmount, incomeCap);
  const rate = Number((baseRate / 100).toFixed(2));
  const durationFactor = durationDays / 30;
  const interest = approvedAmount * rate * durationFactor;
  const repaymentTotal = Number((approvedAmount + interest).toFixed(2));
  const dueDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  return {
    approvedAmount,
    rate: Number((rate * 100).toFixed(2)),
    repaymentTotal,
    dueDate
  };
};

export const calculateOutstandingBalance = async (application: LoanApplication) => {
  const repayments = await prisma.transaction.aggregate({
    _sum: {
      amount: true
    },
    where: {
      loanApplicationId: application.id,
      type: TransactionType.REPAYMENT,
      status: TransactionStatus.SUCCESS
    }
  });

  const repaid = Number(repayments._sum.amount ?? 0);
  return Number(application.repaymentTotal ?? 0) - repaid;
};

