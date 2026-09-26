import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const env = {
  ...process.env,
  BROWSER: "none",
  DISABLE_EMERGENT_OVERLAY: "true",
  ENABLE_HEALTH_CHECK: "false",
  HOST: "0.0.0.0",
  PORT: "8080",
  WDS_SOCKET_PORT: "8080",
};

const api = spawn(process.execPath, ["--experimental-sqlite", join(root, "server.mjs")], {
  env: { ...process.env, PORT: "8000" },
  stdio: "inherit",
});
const web = spawn("npm", ["start"], {
  cwd: join(root, "frontend"),
  env,
  stdio: "inherit",
});

const stop = () => {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
web.on("exit", (code) => {
  api.kill("SIGTERM");
  process.exit(code ?? 0);
});
