const { spawn } = require("child_process");

function spawnProcess(name, cmd, args = []) {
  const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });

  proc.stdout.on("data", (d) => {
    process.stdout.write(`[${name}] ${d}`);
  });
  proc.stderr.on("data", (d) => {
    process.stderr.write(`[${name} ERROR] ${d}`);
  });
  proc.on("exit", (code, signal) => {
    console.log(`[${name}] exited with code=${code} signal=${signal}`);
  });
  return proc;
}

const apiPath = "apps/api/dist/index.js";
const workerPath = "apps/api/dist/worker-process.js";

const api = spawnProcess("api", "node", [apiPath]);
const worker = spawnProcess("worker", "node", [workerPath]);

function shutdown(signal) {
  console.log(`Supervisor received ${signal}, shutting down children`);
  if (!api.killed) api.kill(signal);
  if (!worker.killed) worker.kill(signal);
  // allow some time for graceful shutdown
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// if either process exits unexpectedly, forward exit code
api.on("exit", (code, sig) => {
  console.log(`api exited: code=${code} sig=${sig}`);
  process.exit(code ?? 1);
});
worker.on("exit", (code, sig) => {
  console.log(`worker exited: code=${code} sig=${sig}`);
  process.exit(code ?? 1);
});
