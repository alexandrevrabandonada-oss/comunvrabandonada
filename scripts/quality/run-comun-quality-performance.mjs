import { execFileSync } from "node:child_process";

const onWindows = process.platform === "win32";
const run = (command, args, extraEnv = {}) =>
  execFileSync(command, args, {
    stdio: "inherit",
    shell: onWindows,
    env: { ...process.env, ...extraEnv },
  });

run("npm", ["run", "build"]);
run(
  "npx",
  [
    "playwright",
    "test",
    "-c",
    "playwright.quality-performance.config.ts",
    "--grep",
    "@performance",
  ],
  {
    COMUN_BASE_URL: "http://127.0.0.1:3022",
    PLAYWRIGHT_SKIP_WEBSERVER: "0",
    COMUN_QUALITY_ENFORCE_BUDGETS: "1",
    COMUN_QUALITY_SERVER_COMMAND: "npm run start -- -p 3022",
  },
);
