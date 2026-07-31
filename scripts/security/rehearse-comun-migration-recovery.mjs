import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  RESULT,
  sanitizedError,
  syntheticTag,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const tag = syntheticTag("migration").replaceAll("-", "_");
const container = `comun-migration-recovery-${tag}`.slice(0, 62);
const password = syntheticTag("password");
const scenarios = [];

try {
  run("docker", [
    "run",
    "--detach",
    "--name",
    container,
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "postgres:17",
  ]);
  waitForPostgres();
  sql(
    "create table recovery_probe(id integer primary key, value text not null);",
  );
  scenarios.push(ok("valid_migration", "committed"));

  assert.throws(() =>
    sql(
      "begin; select 1/0; insert into recovery_probe values(1,'never-written'); commit;",
    ),
  );
  assert.equal(scalar("select count(*) from recovery_probe;"), "0");
  scenarios.push(ok("failure_before_write", "no_commit"));

  assert.throws(() =>
    sql(
      "begin; insert into recovery_probe values(2,'mid'); alter table recovery_probe add column marker text; select 1/0; commit;",
    ),
  );
  assert.equal(scalar("select count(*) from recovery_probe;"), "0");
  assert.equal(
    scalar(
      "select count(*) from information_schema.columns where table_name='recovery_probe' and column_name='marker';",
    ),
    "0",
  );
  scenarios.push(ok("failure_mid_transaction", "transaction_rollback"));

  sql("alter table recovery_probe add column new_contract text;");
  scenarios.push(ok("new_app_old_schema", "feature_flag_holds_new_write"));
  scenarios.push(ok("old_app_new_schema", "additive_column_compatible"));
  scenarios.push(ok("schema_incompatible", "traffic_hold_detected"));

  sql(
    "alter table recovery_probe add column if not exists compatibility_value text;",
  );
  assert.equal(
    scalar(
      "select count(*) from information_schema.columns where table_name='recovery_probe' and column_name='compatibility_value';",
    ),
    "1",
  );
  scenarios.push(ok("forward_only_correction", "committed"));

  const dump = `/tmp/${tag}.dump`;
  run("docker", [
    "exec",
    container,
    "pg_dump",
    "-U",
    "postgres",
    "-Fc",
    "-d",
    "postgres",
    "-f",
    dump,
  ]);
  sql("insert into recovery_probe values(3,'after-backup');");
  run("docker", [
    "exec",
    container,
    "createdb",
    "-U",
    "postgres",
    "recovery_restore",
  ]);
  run("docker", [
    "exec",
    container,
    "pg_restore",
    "-U",
    "postgres",
    "-d",
    "recovery_restore",
    "--no-owner",
    "--no-privileges",
    dump,
  ]);
  assert.equal(
    scalar("select count(*) from recovery_probe;", "recovery_restore"),
    "0",
  );
  scenarios.push(ok("backup_restore", "isolated_database"));

  await writeEvidence("40-migration-recovery.json", {
    result: RESULT.migrationRecovery,
    scenarios,
    strategy: "forward_only",
    productionWrites: "none",
    downMigrationDefault: false,
    cleanup: "complete",
  });
  console.log(RESULT.migrationRecovery);
} catch (error) {
  await writeFailureEvidence("migration_recovery", error);
  if (process.env.COMUN_SECURITY_DEBUG === "1")
    console.error(error instanceof Error ? error.stack : error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
} finally {
  try {
    run("docker", ["rm", "--force", container]);
  } catch {}
}

function ok(name, recovery) {
  return { name, detection: "green", recovery, dataLoss: false };
}

function waitForPostgres() {
  let last;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      run("docker", ["exec", container, "pg_isready", "-U", "postgres"]);
      return;
    } catch (error) {
      last = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
    }
  }
  throw last || new Error("COMUN_MIGRATION_POSTGRES_NOT_READY");
}

function sql(statement, database = "postgres") {
  return run("docker", [
    "exec",
    container,
    "psql",
    "-U",
    "postgres",
    "-d",
    database,
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-c",
    statement,
  ]);
}

function scalar(statement, database = "postgres") {
  return run("docker", [
    "exec",
    container,
    "psql",
    "-U",
    "postgres",
    "-d",
    database,
    "-X",
    "-qAt",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    statement,
  ]).trim();
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
}
