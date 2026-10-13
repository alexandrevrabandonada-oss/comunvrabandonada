import { spawn } from "node:child_process";

// Keep this suite's server and compiled environment separate from earlier
// browser suites, while honoring an explicitly requested local base URL.
const baseUrl = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3048";
const child = spawn(
  process.execPath,
  [
    "scripts/comun-local-env.mjs",
    "run",
    "playwright",
    "test",
    "-c",
    "playwright.miniapp-experience.config.ts",
    ...process.argv.slice(2),
  ],
  {
    env: {
      ...process.env,
      COMUN_BASE_URL: baseUrl,
      NEXT_PUBLIC_SITE_URL: baseUrl,
      COMUN_NEXT_DIST_DIR: ".next-miniapp-experience",
    },
    stdio: "inherit",
  },
);
child.once("error", () => {
  process.stderr.write("COMUN_MINIAPP_TEST_RUNNER_FAILED\n");
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
