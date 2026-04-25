import { Queue, Worker } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { oneRecordClient } from "./one-record-client";
import { env } from "../config/env";
import { bootstrapOperationalModel } from "./repository";

let syncWorker: Worker | null = null;

export const startAeroWorkers = async () => {
  await bootstrapOperationalModel();

  if (env.REDIS_DISABLED) {
    return () => {};
  }

  const redisUrl = new URL(env.REDIS_URL);
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    password: redisUrl.password || undefined
  };
  const queue = new Queue("aerosentinel-verification", { connection });

  syncWorker = new Worker(
    "aerosentinel-verification",
    async (job) => {
      const { uldId } = job.data as { uldId: string };
      const local = await prisma.uld.findUnique({ where: { id: uldId } });
      if (!local) return;

      let remote: Record<string, unknown> | null = null;
      try {
        remote = (await oneRecordClient.getUld(local.serialNumber)) as Record<string, unknown> | null;
      } catch {
        remote = null;
      }

      const remoteRiskScore =
        typeof remote?.riskScore === "number"
          ? remote.riskScore
          : typeof remote?.["riskScore"] === "string"
            ? Number(remote["riskScore"])
            : null;
      const driftDetected = remoteRiskScore !== null && Math.abs(remoteRiskScore - local.riskScore) > 0.5;

      await prisma.auditLog.create({
        data: {
          entityType: "ULD",
          entityId: local.id,
          redisState: {
            riskScore: local.riskScore,
            complianceStatus: local.complianceStatus,
            exposureRemainingMinutes: local.exposureRemainingMinutes
          },
          oneRecordState: remote ? (remote as Prisma.InputJsonValue) : Prisma.JsonNull,
          driftDetected,
          actionTaken: driftDetected ? "verification-drift-detected" : "verification-passed",
          syncStatus: driftDetected ? "DRIFT_DETECTED" : "SYNCED"
        }
      });
    },
    { connection }
  );

  const interval = setInterval(async () => {
    const ulds = await prisma.uld.findMany({ take: 50, orderBy: { updatedAt: "desc" } });
    await Promise.all(ulds.map((uld) => queue.add("verify-uld", { uldId: uld.id }, { removeOnComplete: true })));
  }, 30_000);

  return () => {
    clearInterval(interval);
    void syncWorker?.close();
    void queue.close();
  };
};
