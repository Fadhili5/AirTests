const { spawn } = require("child_process");
const path = require("path");

function spawnProcess(name, cmd, args = []) {
  const proc = spawn(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    cwd: process.cwd(),
  });

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

const apiPath = path.join("apps", "api", "dist", "index.js");
const workerPath = path.join("apps", "api", "dist", "worker-process.js");

console.log("Starting supervisor: api ->", apiPath, "worker ->", workerPath);

const api = spawnProcess("api", "node", [apiPath]);
const worker = spawnProcess("worker", "node", [workerPath]);

function shutdown(signal) {
  console.log(`Supervisor received ${signal}, shutting down children`);
  try {
    if (!api.killed) api.kill("SIGTERM");
  } catch (e) {}
  try {
    if (!worker.killed) worker.kill("SIGTERM");
  } catch (e) {}
  // allow some time for graceful shutdown
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

api.on("exit", (code, sig) => {
  console.log(`api exited: code=${code} sig=${sig}`);
  // if api stops unexpectedly, exit supervisor (worker will be killed)
  process.exit(code ?? 1);
});
worker.on("exit", (code, sig) => {
  console.log(`worker exited: code=${code} sig=${sig}`);
  // if worker stops unexpectedly, exit supervisor
  process.exit(code ?? 1);
});
