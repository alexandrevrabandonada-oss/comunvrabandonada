import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = fileURLToPath(new URL("./fixture-app", import.meta.url));
const next = fileURLToPath(
  new URL("../../node_modules/next/dist/bin/next", import.meta.url),
);
for (const name of [
  "SUPABASE_DB_URL",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
])
  if (process.env[name]) throw Error("LAB_REJECTS_EXTERNAL_CREDENTIALS");
const mode = process.argv[2];
if (!["build", "start"].includes(mode))
  throw new Error("FIXTURE_BUILD_OR_START_ONLY");
const child = spawn(
  process.execPath,
  [
    next,
    mode,
    fixture,
    ...(mode === "build"
      ? ["--webpack"]
      : ["--hostname", "127.0.0.1", "--port", "3150"]),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      COMUN_SOC_D09_FIXTURE: "LOCAL_SYNTHETIC_ONLY",
      SUPABASE_DB_URL: "",
      SUPABASE_ACCESS_TOKEN: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled",
      COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
      COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED: "enabled",
    },
  },
);
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 1));
