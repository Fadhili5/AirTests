import { spawn } from "node:child_process";

const role = process.env.SERVICE_ROLE ?? process.env.RAILWAY_SERVICE_ROLE ?? "api";

const commandMap = {
  api: [
    ["npm", ["run", "db:migrate"]],
    ["npm", ["run", "start", "--workspace", "@lending/api"]]
  ],
  bot: [["npm", ["run", "start", "--workspace", "@lending/bot"]]],
  web: [["npm", ["run", "start", "--workspace", "@lending/web"]]]
};

if (!(role in commandMap)) {
  throw new Error(`Unsupported SERVICE_ROLE "${role}"`);
}

const runCommand = ([bin, args]) =>
  new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: "inherit",
      env: process.env
    });

    child.on("exit", (code) => {
      if ((code ?? 0) === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${bin} ${args.join(" ")} exited with code ${code}`));
    });
  });

for (const command of commandMap[role]) {
  await runCommand(command);
}
