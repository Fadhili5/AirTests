import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { startAeroWorkers } from "./aero/workers";

export const startServer = async () => {
  const app = createApp();
  const server = createServer(app);
  const stopWorkers = await startAeroWorkers();

  server.listen(env.API_PORT, () => {
    console.log(`AeroSentinel API listening on ${env.API_PORT}`);
  });

  const shutdown = async () => {
    stopWorkers();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};
