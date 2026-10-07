import assert from "node:assert/strict";
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
await import("./test-canonical-auth.mjs");
