import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateSource,
  probePlan,
  classifyProbe,
} from "./preflight-recovery-source.mjs";

const url =
  "postgresql://postgres.nvmdszymrtacfehdynpg:synthetic%40pass@aws-0-us-west-2.pooler.supabase.com:5432/postgres";
const config = `SUPABASE_DB_URL=${url}\nSUPABASE_PROJECT_REF=nvmdszymrtacfehdynpg\nPGSSLMODE=verify-full\nPGOPTIONS=-c default_transaction_read_only=on\n`;

test("real CLI rejects invalid private config and missing files without leaking data", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "comun-source-contract-"));
  const file = path.join(dir, "private.env");
  const script = fileURLToPath(
    new URL("./preflight-recovery-source.mjs", import.meta.url),
  );
  try {
    writeFileSync(
      file,
      config
        .replace("synthetic%40pass", "PRIVATE-CANARY")
        .replace("verify-full", "disable"),
    );
    for (const args of [
      ["--config", file],
      ["--config", path.join(dir, "missing-PRIVATE-CANARY")],
      ["--config", "relative-PRIVATE-CANARY"],
      ["--unknown", "PRIVATE-CANARY"],
    ]) {
      const result = spawnSync(process.execPath, [script, ...args], {
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      });
      assert.equal(result.status, 1);
      assert.equal(result.stderr, "");
      assert.equal(result.stdout.includes("PRIVATE-CANARY"), false);
      assert.deepEqual(JSON.parse(result.stdout), {
        kind: "SOURCE_CONNECTIVITY_ONLY_NOT_BACKUP",
        result: "SOURCE_PREFLIGHT_REJECTED",
        realDataExported: false,
        backupVerified: false,
      });
    }
  } finally {
    unlinkSync(file);
    rmdirSync(dir);
  }
});
test("parse an explicitly configured canonical session pooler without network", () => {
  assert.equal(validateSource(config).password, "synthetic@pass");
});
for (const [label, value] of [
  ["HTTPS", config.replace("postgresql:", "https:")],
  ["other project", config.replaceAll("nvmdszymrtacfehdynpg", "otherproject")],
  ["other pooler", config.replace("aws-0-us-west-2", "aws-0-us-east-1")],
  ["transaction port", config.replace(":5432/", ":6543/")],
  ["other database", config.replace("/postgres", "/other")],
  ["URL query overrides", config.replace(url, url + "?sslmode=disable")],
  ["fragment", config.replace(url, url + "#hidden")],
  ["placeholder", config.replace("synthetic%40pass", "[YOUR-PASSWORD]")],
  ["bad encoding", config.replace("synthetic%40pass", "%GG")],
  ["TLS downgrade", config.replace("verify-full", "require")],
  ["write option", config.replace("read_only=on", "read_only=off")],
  ["duplicate key", config + `SUPABASE_DB_URL=${url}\n`],
  ["unknown key", config + "PGSERVICE=other\n"],
])
  test(`reject ${label} without echoing credentials`, () => {
    assert.throws(
      () => validateSource(value),
      (error) =>
        !error.message.includes("synthetic") && /^[A-Z_]+$/.test(error.message),
    );
  });
test("password travels in environment only; image, CA, identity and read-only query are fixed", () => {
  const plan = probePlan("private-synthetic-value", "/synthetic/ca.crt", {
    PATH: "/bin",
    PGSERVICE: "evil",
    PGHOST: "evil",
    PGOPTIONS: "-c default_transaction_read_only=off",
  });
  assert.equal(plan.binary, "docker");
  assert.ok(!JSON.stringify(plan.args).includes("private-synthetic-value"));
  assert.ok(!JSON.stringify(plan.args).includes("evil"));
  assert.equal(plan.options.env.PGPASSWORD, "private-synthetic-value");
  assert.equal(plan.options.env.PGSERVICE, undefined);
  assert.equal(plan.options.env.PGHOST, undefined);
  assert.equal(plan.options.env.PGSSLMODE, "verify-full");
  assert.equal(
    plan.options.env.PGOPTIONS,
    "-c default_transaction_read_only=on",
  );
  for (const arg of [
    "--pull=never",
    "--read-only",
    "--no-password",
    "--no-psqlrc",
  ])
    assert.ok(plan.args.includes(arg));
  assert.ok(plan.args.some((arg) => /^sha256:[a-f0-9]{64}$/.test(arg)));
  assert.ok(plan.options.timeout <= 25000);
});
test("PASS requires exact read-only/version booleans, successful exit and no execution error", () => {
  assert.equal(
    classifyProbe({ status: 0, stdout: "t|t\n" }),
    "READ_ONLY_TLS_PROBE_PASS",
  );
  for (const result of [
    { status: 1, stdout: "t|t" },
    { status: 0, stdout: "f|t" },
    { status: 0, stdout: "t|f" },
    { status: 0, stdout: "t|t\nprivate" },
    { status: 0, stdout: "t|t", error: new Error("private") },
  ])
    assert.notEqual(classifyProbe(result), "READ_ONLY_TLS_PROBE_PASS");
});
test("provider diagnostics are categorical and never echo stderr", () => {
  for (const [stderr, expected] of [
    ["password authentication failed secret", "AUTHENTICATION_REJECTED"],
    ["Tenant or user not found secret", "POOLER_TARGET_REJECTED"],
    ["SSL certificate secret", "TLS_REJECTED"],
    ["network is unreachable secret", "NETWORK_UNAVAILABLE"],
    ["unrecognized private diagnostic", "PROBE_UNVERIFIED"],
  ])
    assert.equal(classifyProbe({ status: 1, stderr }), expected);
});
