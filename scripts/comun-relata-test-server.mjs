import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(command, ["run", "dev", "--", "-p", "3137"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    COMUN_RELATA_PREVIEW: "enabled",
    COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
    COMUN_BASE_URL: "http://127.0.0.1:3137",
  },
});

const stop = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1));
});
