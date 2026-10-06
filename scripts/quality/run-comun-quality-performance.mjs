import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

const distDir = process.env.COMUN_NEXT_DIST_DIR || ".next";
if (distDir !== ".next" && !/^\.next-[a-z0-9-]+$/i.test(distDir)) {
  throw new Error(
    "COMUN_NEXT_DIST_DIR deve ser um diretório .next- interno e seguro",
  );
}

// Earlier Playwright suites generate development types that tsconfig also includes.
// Discard that disposable output before checking the production build, keeping
// production route types and all application TypeScript checks enabled.
rmSync(`${distDir}/dev`, { recursive: true, force: true });

const onWindows = process.platform === "win32";
const run = (command, args, extraEnv = {}) =>
  execFileSync(command, args, {
    stdio: "inherit",
    shell: onWindows,
    env: { ...process.env, ...extraEnv },
  });

run("npm", ["run", "build"], {
  NEXT_PUBLIC_COMUN_WEB_VITALS_SAMPLE_RATE: "0",
});
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
    NEXT_PUBLIC_COMUN_WEB_VITALS_SAMPLE_RATE: "0",
  },
);
