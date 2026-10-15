import { execFileSync } from "node:child_process";
import { readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { assertSyntheticEnvironment } from "./run-soc-d08-browser-proof.mjs";

assertSyntheticEnvironment(process.env);
const output = ".ci-artifacts/soc-d08-native";
mkdirSync(output, { recursive: true });
const directory =
  process.env.RUNNER_TEMP &&
  join(process.env.RUNNER_TEMP, "comun-soc-d08-cores");
const cores =
  directory && existsSync(directory)
    ? readdirSync(directory)
        .filter((name) => /^core\.\d+$/.test(name))
        .slice(0, 4)
    : [];
// Never upload raw cores. Only backtraces, with frame arguments and locals disabled.
const executable = chromium
  .executablePath()
  .replace(
    /chromium-([0-9]+)\/chrome-linux64\/chrome$/,
    "chromium_headless_shell-$1/chrome-headless-shell-linux64/chrome-headless-shell",
  );
const results = [];
for (const core of cores) {
  try {
    const stack = execFileSync(
      "gdb",
      [
        "--batch",
        "--nx",
        "-iex",
        "set auto-load off",
        "-ex",
        "set pagination off",
        "-iex",
        "set print frame-arguments none",
        "-ex",
        "thread apply all bt 24",
        executable,
        join(directory, core),
      ],
      {
        encoding: "utf8",
        timeout: 60000,
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    writeFileSync(join(output, `${core}.stack.txt`), stack);
    results.push({ core, status: "STACK_CAPTURED" });
  } catch {
    results.push({ core, status: "STACK_UNAVAILABLE" });
  }
}
writeFileSync(
  join(output, "native-stack-status.json"),
  JSON.stringify(
    {
      rawCoresUploaded: false,
      results,
      status: cores.length ? "INSPECT_RESULTS" : "NO_CORE_AVAILABLE",
    },
    null,
    2,
  ) + "\n",
);
if (results.some((result) => result.status === "STACK_UNAVAILABLE"))
  process.exitCode = 1;
