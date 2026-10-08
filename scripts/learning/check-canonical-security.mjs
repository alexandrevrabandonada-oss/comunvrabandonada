import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readSupabaseLocalEnv } from "../ci/read-supabase-local-env.mjs";
import {
  disposableContext,
  assertOwnedContainers,
} from "./disposable-boundary.mjs";
const result = readSupabaseLocalEnv();
assert.ok(result.ok);
const values = Object.fromEntries(
  result.output
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)="(.*)"$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
const context = disposableContext({
  ...process.env,
  COMUN_LEARNING_LOCAL_API_URL: values.API_URL,
  COMUN_LEARNING_LOCAL_DATABASE_URL: values.DB_URL,
  COMUN_LEARNING_LOCAL_ANON_KEY: values.ANON_KEY,
  COMUN_LEARNING_LOCAL_SERVICE_KEY: values.SERVICE_ROLE_KEY,
});
assertOwnedContainers(context);
const check = spawnSync(
  process.execPath,
  ["scripts/ci/assert-zero-security-findings.mjs"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL: context.database,
    },
  },
);
assert.equal(check.status, 0, "canonical security checker failed");
