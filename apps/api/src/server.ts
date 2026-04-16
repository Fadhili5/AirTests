import { createServer } from "node:http";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { createApp } from "./app";
import { startReconciliationJob } from "./jobs/reconciliation.job";

const app = createApp();
const server = createServer(app);
const stopJob = startReconciliationJob();

server.listen(env.API_PORT, () => {
  console.log(`API listening on ${env.API_PORT}`);
});

const shutdown = async () => {
  stopJob();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

