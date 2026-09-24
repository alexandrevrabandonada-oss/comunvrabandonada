import { readFileSync } from "node:fs";
import { createPostgresAdapter } from "./postgres-adapter.mjs";
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
const result = await rehearsePrivateReleasePromotion({
  manifest,
  baseline,
  ...adapter,
});
if (result.state !== "POST")
  throw new Error("COMUN_49_2_PRIVATE_RELEASE_REHEARSAL_INCOMPLETE");
console.log(
  `COMUN_49_2_PRIVATE_RELEASE_FORWARD_ONLY_REHEARSAL_GREEN:${result.actions.join(",") || "REPLAY"}`,
);
