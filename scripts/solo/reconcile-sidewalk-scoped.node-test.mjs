import assert from "node:assert/strict";
import test from "node:test";
import { runIndependentRound, TARGET_RELEASE } from "./reconcile-sidewalk-scoped.mjs";

class FakeCommandRunner {
  constructor(responses = {}) { this.responses = responses; this.calls = []; }
  async run(command, args = [], options = {}) {
    this.calls.push({ command, args: [...args], options: { ...options } });
    const key = `${command}:${args.at(-1) ?? ""}`;
    if (this.responses[key] instanceof Error) throw this.responses[key];
    if (command === "psql") {
      const sql = args.at(-1);
      if (/not c\.convalidated/.test(sql)) return "0";
      if (/sidewalk_record_id_fkey/.test(sql)) return "6";
      if (/count\(\*\).*comun_schema_releases/.test(sql)) return "0";
      if (/select status/.test(sql)) return "applied";
      if (/pg_class/.test(sql)) return "176";
    }
    if (command === "capture-scoped-fingerprint") return args.at(-1) === "pre" ? "pre-hash" : "post-hash";
    return "";
  }
}
const options = (runner, roundId = "round") => ({ roundId, backupDir: "D:/external-backup", manifestPath: "supabase/releases/candidate.json", discoveryMode: true, commandRunner: runner });

test("isolated round orders restore, fingerprints, migration and cleanup", async () => {
  const runner = new FakeCommandRunner(); const result = await runIndependentRound(options(runner));
  assert.deepEqual(Object.keys(result).sort(), ["cleanupComplete","constraintsValid","ledgerStatus","migrationChecksum","post","pre","roundId","sidewalkForeignKeys","structuralCounts"].sort());
  assert.equal(result.cleanupComplete, true);
  const labels = runner.calls.map((call) => `${call.command}:${call.args.at(-1)}`);
  assert.ok(labels.indexOf("restore-schema:public-schema.sql") < labels.indexOf("restore-data-copy:public-data-copy.sql"));
  assert.ok(labels.indexOf("capture-scoped-fingerprint:pre") < labels.indexOf("apply-local-migration:discovery"));
  assert.ok(labels.indexOf("apply-local-migration:discovery") < labels.indexOf("capture-scoped-fingerprint:post"));
  assert.equal(labels.filter((label) => label.startsWith("docker:rm") || label.startsWith("docker:network") || label.startsWith("docker:volume")).length >= 3, true);
});

test("resources are unique and cleanup happens after a migration failure", async () => {
  const runner = new FakeCommandRunner({ "apply-local-migration:discovery": new Error("failure") });
  await assert.rejects(() => runIndependentRound(options(runner, "one")));
  assert.ok(runner.calls.some((call) => call.args[0] === "rm"));
  assert.ok(runner.calls.some((call) => call.args[0] === "network" && call.args[1] === "rm"));
});

test("remote contexts are rejected before commands", async () => {
  const runner = new FakeCommandRunner();
  await assert.rejects(() => runIndependentRound({ ...options(runner), projectRef: "remote" }), /SOLO_SCOPED_RECONCILIATION_REMOTE_FORBIDDEN/);
  assert.equal(runner.calls.length, 0);
  assert.equal(TARGET_RELEASE.includes("20260724233256"), true);
});
