import { VerificationStatus } from "@prisma/client";
import { EmploymentInput, KycInput, ProfileInput } from "@lending/shared";
import { prisma } from "../lib/prisma";

export const updateUserProfile = async (userId: string, input: ProfileInput) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      dateOfBirth: new Date(input.dateOfBirth),
      verificationStatus: VerificationStatus.KYC_SUBMITTED
    }
  });
};

export const updateUserKyc = async (userId: string, input: KycInput) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      nationalId: input.nationalId,
      mpesaNumber: input.mpesaNumber,
      verificationStatus: VerificationStatus.KYC_SUBMITTED
    }
  });
};

export const updateUserEmployment = async (userId: string, input: EmploymentInput) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      employmentStatus: input.employmentStatus,
      monthlyIncome: input.monthlyIncome
    }
  });
};

