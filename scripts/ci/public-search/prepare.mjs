import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import pg from "pg";
import { readSupabaseLocalEnv } from "../read-supabase-local-env.mjs";

// No dotenv, project linking or remote credentials. Only this job's new CLI workdir.
if (!process.env.SEARCH_SUPABASE_WORKDIR || !process.env.GITHUB_ENV)
  throw new Error("Disposable workdir and CI environment file are required");
const result = readSupabaseLocalEnv({
  invoke: () =>
    spawnSync(
      "supabase",
      ["status", "--workdir", process.env.SEARCH_SUPABASE_WORKDIR, "-o", "env"],
      { encoding: "utf8" },
    ),
});
if (!result.ok) throw new Error("Local Supabase status unavailable");
const values = Object.fromEntries(
  result.output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)="([^"]*)"$/);
    return match ? [[match[1], match[2]]] : [];
  }),
);
for (const key of ["API_URL", "DB_URL"]) {
  const url = new URL(values[key]);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    throw new Error("Non-loopback endpoint refused");
}
const claims = JSON.parse(
  Buffer.from(values.SERVICE_ROLE_KEY.split(".")[1], "base64url").toString(),
);
if (claims.role !== "service_role")
  throw new Error("Expected disposable service_role");
const db = new pg.Client({ connectionString: values.DB_URL });
await db.connect();
try {
  await db.query(
    readFileSync(new URL("./fixture.sql", import.meta.url), "utf8"),
  );
} finally {
  await db.end();
}
// Never echo keys; only supply the server-side key to the test process.
appendFileSync(
  process.env.GITHUB_ENV,
  `COMUN_PUBLIC_SEARCH_DISPOSABLE=1\nNEXT_PUBLIC_SUPABASE_URL=${values.API_URL}\nSUPABASE_SERVICE_ROLE_KEY=${values.SERVICE_ROLE_KEY}\n`,
);
console.log("COMUN_PUBLIC_SEARCH_LOOPBACK_FIXTURE_READY");
