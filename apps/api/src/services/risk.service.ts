import { LoanStatus, Prisma, ReviewStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const runRiskAssessment = async (userId: string, requestedAmount: number) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      applications: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  let score = 100;
  let duplicateCheck = false;
  let fraudFlag = false;
  const notes: Record<string, unknown> = {};

  if (user.nationalId) {
    const duplicateIds = await prisma.user.count({
      where: {
        nationalId: user.nationalId,
        id: {
          not: user.id
        }
      }
    });
    if (duplicateIds > 0) {
      score -= 50;
      duplicateCheck = true;
      fraudFlag = true;
      notes.duplicateNationalId = duplicateIds;
    }
  }

  if (user.phoneNumber) {
    const duplicatePhones = await prisma.user.count({
      where: {
        phoneNumber: user.phoneNumber,
        id: {
          not: user.id
        }
      }
    });
    if (duplicatePhones > 0) {
      score -= 35;
      duplicateCheck = true;
      notes.duplicatePhoneNumber = duplicatePhones;
    }
  }

  const recentApplications = await prisma.loanApplication.count({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (recentApplications >= 3) {
    score -= 25;
    fraudFlag = true;
    notes.recentApplications = recentApplications;
  }

  const suspiciousWindow = await prisma.loanApplication.count({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (suspiciousWindow >= 2) {
    score -= 20;
    notes.suspiciousApplicationVelocity = suspiciousWindow;
  }

  const abusiveHistory = await prisma.loanApplication.count({
    where: {
      userId: user.id,
      status: {
        in: [LoanStatus.REJECTED, LoanStatus.OVERDUE]
      }
    }
  });

  if (abusiveHistory >= 2) {
    score -= 20;
    notes.telegramAccountAbuse = abusiveHistory;
  }

  const historicalPerformance = await prisma.loanApplication.findMany({
    where: {
      userId: user.id,
      status: {
        in: [LoanStatus.REPAID, LoanStatus.OVERDUE]
      }
    }
  });

  if (historicalPerformance.some((loan) => loan.status === LoanStatus.OVERDUE)) {
    score -= 40;
    notes.priorRepaymentBehavior = "Overdue history";
  } else if (historicalPerformance.some((loan) => loan.status === LoanStatus.REPAID)) {
    score += 10;
    notes.priorRepaymentBehavior = "Positive repayment history";
  }

  const normalizedPhone = user.phoneNumber?.replace(/\D/g, "").slice(-9);
  const normalizedMpesa = user.mpesaNumber?.replace(/\D/g, "").slice(-9);
  if (normalizedPhone && normalizedMpesa && normalizedPhone !== normalizedMpesa) {
    score -= 15;
    notes.mpesaMismatch = true;
  }

  const income = Number(user.monthlyIncome ?? 0);
  if (!income) {
    score -= 30;
    notes.incomeConsistency = "Missing verified income";
  } else if (requestedAmount > income * 0.6) {
    score -= 25;
    notes.incomeConsistency = "Requested amount exceeds prudent ratio";
  } else if (requestedAmount > income * 0.35) {
    score -= 10;
    notes.incomeConsistency = "Requested amount near affordability ceiling";
  }

  if (user.employmentStatus === "UNEMPLOYED") {
    score -= 25;
    notes.employmentRisk = "Unemployed applicant";
  }

  score = Math.min(100, Math.max(0, score));

  const reviewStatus =
    score < 40 ? ReviewStatus.FAILED : score < 70 ? ReviewStatus.MANUAL_REVIEW : ReviewStatus.PASSED;

  const assessment = await prisma.riskAssessment.create({
    data: {
      userId: user.id,
      duplicateCheck,
      fraudFlag,
      score,
      reviewStatus,
      notes
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      riskScore: score,
      verificationStatus:
        reviewStatus === ReviewStatus.FAILED
          ? VerificationStatus.REJECTED
          : reviewStatus === ReviewStatus.MANUAL_REVIEW
            ? VerificationStatus.MANUAL_REVIEW
            : VerificationStatus.VERIFIED
    }
  });

  return assessment;
};

export const evaluateRiskDecision = (score: number) => {
  if (score < 40) {
    return "REJECT";
  }
  if (score < 70) {
    return "MANUAL_REVIEW";
  }
  return "APPROVE";
};
