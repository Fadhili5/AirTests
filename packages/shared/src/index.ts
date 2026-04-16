import { z } from "zod";

export const employmentStatuses = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "UNEMPLOYED",
  "STUDENT",
  "CONTRACT"
] as const;

export const verificationStatuses = [
  "PENDING",
  "KYC_SUBMITTED",
  "VERIFIED",
  "REJECTED",
  "MANUAL_REVIEW"
] as const;

export const loanStatuses = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "MANUAL_REVIEW",
  "DISBURSEMENT_PENDING",
  "DISBURSED",
  "REPAID",
  "OVERDUE"
] as const;

export const transactionTypes = [
  "VERIFICATION_HOLD",
  "VERIFICATION_RELEASE",
  "LOAN_DISBURSEMENT",
  "REPAYMENT",
  "WALLET_WITHDRAWAL",
  "REFUND"
] as const;

const phoneSchema = z
  .string()
  .regex(/^(?:\+?254|0)?7\d{8}$/, "Use a valid Safaricom mobile number");

export const telegramAuthSchema = z.object({
  initData: z.string().min(10)
});

export const profileSchema = z.object({
  fullName: z.string().min(4).max(120),
  phoneNumber: phoneSchema,
  dateOfBirth: z.string().datetime()
});

export const kycSchema = z.object({
  nationalId: z.string().regex(/^\d{7,8}$/),
  mpesaNumber: phoneSchema
});

export const employmentSchema = z.object({
  employmentStatus: z.enum(employmentStatuses),
  monthlyIncome: z.number().positive().max(10000000)
});

export const holdSchema = z.object({
  phoneNumber: phoneSchema.optional()
});

export const loanApplySchema = z.object({
  requestedAmount: z.number().positive().max(500000),
  durationDays: z.number().int().min(7).max(90)
});

export const withdrawSchema = z.object({
  amount: z.number().positive().max(1000000),
  mpesaNumber: phoneSchema.optional()
});

export const repaySchema = z.object({
  amount: z.number().positive().max(1000000)
});

export type EmploymentStatusValue = (typeof employmentStatuses)[number];
export type LoanStatusValue = (typeof loanStatuses)[number];
export type TransactionTypeValue = (typeof transactionTypes)[number];
export type ProfileInput = z.infer<typeof profileSchema>;
export type KycInput = z.infer<typeof kycSchema>;
export type EmploymentInput = z.infer<typeof employmentSchema>;
export type LoanApplyInput = z.infer<typeof loanApplySchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type RepayInput = z.infer<typeof repaySchema>;

export type DashboardResponse = {
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    fullName: string | null;
    nationalId: string | null;
    phoneNumber: string | null;
    mpesaNumber: string | null;
    dateOfBirth: string | null;
    employmentStatus: EmploymentStatusValue | null;
    monthlyIncome: number | null;
    riskScore: number;
    verificationStatus: string;
    createdAt: string;
    updatedAt: string;
  };
  wallet: {
    balance: number;
    heldAmount: number;
    refundableAmount: number;
    status: string;
  } | null;
  latestApplication: {
    id: string;
    requestedAmount: number;
    approvedAmount: number | null;
    interestRate: number | null;
    durationDays: number;
    dueDate: string | null;
    repaymentTotal: number | null;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;
    disbursedAt: string | null;
    repaidAt: string | null;
  } | null;
  latestAssessment: {
    score: number;
    duplicateCheck: boolean;
    fraudFlag: boolean;
    reviewStatus: string;
    notes: Record<string, unknown> | null;
    createdAt: string;
  } | null;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    reference: string;
    status: string;
    narrative: string | null;
    createdAt: string;
  }>;
};

export const formatKes = (amount: number): string =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2
  }).format(amount);

export const normalizeKenyanPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }
  return `254${digits}`;
};

