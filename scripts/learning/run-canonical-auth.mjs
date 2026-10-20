import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  disposableContext,
  assertOwnedContainers,
} from "./disposable-boundary.mjs";
import { readSupabaseLocalEnv } from "../ci/read-supabase-local-env.mjs";

// Reuse the one bounded CLI readiness policy. Never print local JWT keys.
const result = readSupabaseLocalEnv();
assert.ok(result.ok, "local Supabase status unavailable");
const values = Object.fromEntries(
  result.output
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)="(.*)"$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
process.env.COMUN_LEARNING_LOCAL_API_URL = values.API_URL;
process.env.COMUN_LEARNING_LOCAL_DATABASE_URL = values.DB_URL;
process.env.COMUN_LEARNING_LOCAL_ANON_KEY = values.ANON_KEY;
process.env.COMUN_LEARNING_LOCAL_SERVICE_KEY = values.SERVICE_ROLE_KEY;
const context = disposableContext(process.env);
assertOwnedContainers(context);
console.log("COMUN_LEARNING_DISPOSABLE_STAGE=compiled-build");
const build = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  {
    stdio: "inherit",
    timeout: 240000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: context.api,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: context.anon,
      COMUN_LEARNING_R0_ENABLED: "enabled",
    },
  },
);
assert.equal(build.status, 0, "disposable compiled build failed");
await import("./test-canonical-auth.mjs");
