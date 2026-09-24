import { readFileSync } from "node:fs";
import pg from "pg";
import {
  createPostgresAdapter,
  requireDisposableConnection,
} from "./postgres-adapter.mjs";
import { rehearsePrivateReleasePromotion } from "./promotion-runner.mjs";

for (const name of [
  "SUPABASE_DB_URL",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
])
  if (Object.hasOwn(process.env, name))
    throw new Error("COMUN_49_2_DISPOSABLE_PRODUCTION_SECRET_PRESENT");
const url = process.env.COMUN_DISPOSABLE_DB_URL;
if (!url) throw new Error("COMUN_49_2_DISPOSABLE_DESTINATION_REQUIRED");
const adminUrl = requireDisposableConnection(
  process.env.COMUN_DISPOSABLE_ADMIN_DB_URL ?? "",
);
if (new URL(adminUrl).pathname !== new URL(url).pathname)
  throw new Error("COMUN_49_2_DISPOSABLE_DATABASE_MISMATCH");
const manifest = JSON.parse(
  readFileSync(
    "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json",
    "utf8",
  ),
);
const baseline = JSON.parse(
  readFileSync(
    "reports/current/comun-49-2-private-release-production-pre.json",
    "utf8",
  ),
);
const adapter = createPostgresAdapter({ url, manifest, disposable: true });
const adminQuery = async (sql) => {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
};
const applyMigration = async (migration) => {
  await adminQuery(`grant usage, create on schema private to postgres;
    grant usage, create on schema public to postgres;
    grant references on auth.users to postgres;`);
  try {
    await adapter.applyMigration(migration);
  } finally {
    await adminQuery(`revoke usage, create on schema private from postgres;
      revoke usage, create on schema public from postgres;
      revoke references on auth.users from postgres;`);
  }
};
const result = await rehearsePrivateReleasePromotion({
  manifest,
  baseline,
  capture: adapter.capture,
  applyMigration,
  recordLedger: adapter.recordLedger,
});
if (result.state !== "POST")
  throw new Error("COMUN_49_2_PRIVATE_RELEASE_REHEARSAL_INCOMPLETE");
console.log(
  `COMUN_49_2_PRIVATE_RELEASE_FORWARD_ONLY_REHEARSAL_GREEN:${result.actions.join(",") || "REPLAY"}`,
);
