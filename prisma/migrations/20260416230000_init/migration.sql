-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'CONTRACT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'KYC_SUBMITTED', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'DISBURSEMENT_PENDING', 'DISBURSED', 'REPAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('VERIFICATION_HOLD', 'VERIFICATION_RELEASE', 'LOAN_DISBURSEMENT', 'REPAYMENT', 'WALLET_WITHDRAWAL', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPPORT');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "telegramId" TEXT NOT NULL,
  "username" TEXT,
  "fullName" TEXT,
  "nationalId" TEXT,
  "phoneNumber" TEXT,
  "mpesaNumber" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "employmentStatus" "EmploymentStatus",
  "monthlyIncome" DECIMAL(12,2),
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedAmount" DECIMAL(12,2) NOT NULL,
  "approvedAmount" DECIMAL(12,2),
  "interestRate" DECIMAL(5,2),
  "durationDays" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3),
  "repaymentTotal" DECIMAL(12,2),
  "status" "LoanStatus" NOT NULL DEFAULT 'DRAFT',
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "disbursedAt" TIMESTAMP(3),
  "repaidAt" TIMESTAMP(3),
  CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "heldAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refundableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "loanApplicationId" TEXT,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reference" TEXT NOT NULL,
  "providerReference" TEXT,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "narrative" TEXT,
  "metadata" JSONB,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "duplicateCheck" BOOLEAN NOT NULL,
  "fraudFlag" BOOLEAN NOT NULL,
  "score" INTEGER NOT NULL,
  "reviewStatus" "ReviewStatus" NOT NULL,
  "notes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalId_key" ON "User"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "LoanApplication_userId_status_idx" ON "LoanApplication"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_status_idx" ON "Transaction"("userId", "type", "status");

-- CreateIndex
CREATE INDEX "RiskAssessment_userId_reviewStatus_idx" ON "RiskAssessment"("userId", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenId_key" ON "Session"("tokenId");

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

