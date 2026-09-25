import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promoteR3Release } from "./promotion-runner.mjs";

const manifest = JSON.parse(readFileSync("supabase/release-bundles/20260924-comun-49-2-r3-private-candidate.json", "utf8"));
const baseline = JSON.parse(readFileSync("reports/current/comun-49-2-r3-production-pre.json", "utf8"));
const post = { ...baseline,
  migrations: [...baseline.migrations, "20260924225210"],
  runnerFingerprint: manifest.expectedPostFingerprint,
  canonicalFingerprint: manifest.expectedPostCanonicalFingerprint,
  r3Present: true, candidateTablePresent: true, candidateBridgePresent: true,
  r3TriggerCount: 4,
};
test("PRE applies one migration, verifies POST, then records ledger", async () => {
  let capture = { ...baseline };
  const calls = [];
  const result = await promoteR3Release({ manifest, baseline,
    capture: async () => capture,
    applyMigration: async (migration) => { calls.push(migration.version); capture = { ...post }; },
    verifyPost: async () => { calls.push("VERIFY"); },
    recordLedger: async () => { calls.push("LEDGER"); capture = { ...post, r3LedgerState: "PRESENT_ACCEPTED" }; },
  });
  assert.deepEqual(result, { state: "POST", actions: ["R3", "LEDGER"] });
  assert.deepEqual(calls, ["20260924225210", "VERIFY", "LEDGER"]);
});
test("POST_PENDING_LEDGER never replays migration", async () => {
  let capture = { ...post };
  const calls = [];
  await promoteR3Release({ manifest, baseline, capture: async () => capture,
    applyMigration: async () => { throw Error("unexpected replay"); },
    verifyPost: async () => { calls.push("VERIFY"); },
    recordLedger: async () => { capture = { ...post, r3LedgerState: "PRESENT_ACCEPTED" }; calls.push("LEDGER"); },
  });
  assert.deepEqual(calls, ["VERIFY", "LEDGER"]);
});
test("POST replay writes nothing", async () => {
  const result = await promoteR3Release({ manifest, baseline,
    capture: async () => ({ ...post, r3LedgerState: "PRESENT_ACCEPTED" }),
    applyMigration: async () => { throw Error("unexpected write"); },
    verifyPost: async () => { throw Error("unexpected verification"); },
    recordLedger: async () => { throw Error("unexpected write"); },
  });
  assert.deepEqual(result, { state: "POST", actions: [] });
});
test("DIVERGED blocks every write", async () => {
  await assert.rejects(promoteR3Release({ manifest, baseline,
    capture: async () => ({ ...post, canonicalFingerprint: "0".repeat(64) }),
    applyMigration: async () => { throw Error("unexpected write"); },
    verifyPost: async () => { throw Error("unexpected verification"); },
    recordLedger: async () => { throw Error("unexpected write"); },
  }), /COMUN_49_2_R3_RELEASE_DIVERGED/);
});
