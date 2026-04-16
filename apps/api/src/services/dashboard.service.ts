import { prisma } from "../lib/prisma";
import {
  serializeLoan,
  serializeRisk,
  serializeTransaction,
  serializeUser,
  serializeWallet
} from "../utils/serializers";

export const getDashboardData = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      wallet: true,
      applications: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      },
      riskAssessments: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      },
      transactions: {
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      }
    }
  });

  return {
    user: serializeUser(user),
    wallet: serializeWallet(user.wallet),
    latestApplication: serializeLoan(user.applications[0] ?? null),
    latestAssessment: serializeRisk(user.riskAssessments[0] ?? null),
    transactions: user.transactions.map(serializeTransaction)
  };
};

