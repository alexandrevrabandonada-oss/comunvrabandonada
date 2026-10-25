import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  aclCatalogDigest,
  planMissingRestoreGrants,
} from "./recovery-acl-contract.mjs";

const name = `comun-acl-contract-${randomBytes(10).toString("hex")}`;
const image =
  "sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675";
let attempted = false;
let completed = false;
let cleaned = false;
let phase = "startup";
let diagnostic = null;
function run(args, input) {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new Error("ACL_LAB_COMMAND_REJECTED");
  return result.stdout.trim();
}
const sql = (value) =>
  run(
    [
      "exec",
      "-i",
      name,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-XqAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    value,
  );
try {
  const catalog = await readFile(
    new URL("./recovery-acl-catalog.sql", import.meta.url),
    "utf8",
  );
  attempted = true;
  run([
    "run",
    "--detach",
    "--pull=never",
    "--name",
    name,
    "--label",
    `comun.recovery.owner=${name}`,
    "--network",
    "none",
    "--memory",
    "512m",
    "--pids-limit",
    "128",
    "--tmpfs",
    "/var/lib/postgresql/data:rw,nosuid,nodev,size=256m",
    "-e",
    `POSTGRES_PASSWORD=${randomBytes(24).toString("hex")}`,
    image,
  ]);
  const end = Date.now() + 60000;
  while (true) {
    const probe = spawnSync(
      "docker",
      ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
      { stdio: "ignore", timeout: 5000, windowsHide: true },
    );
    if (probe.status === 0) break;
    if (Date.now() > end) throw new Error("ACL_LAB_STARTUP_FAILED");
    await new Promise((r) => setTimeout(r, 500));
  }
  sql(
    "create schema private; create role synthetic_owner nologin; create role anon nologin; create table public.acl_synthetic(id integer, value text); alter table public.acl_synthetic owner to synthetic_owner; create sequence private.synthetic_seq;",
  );
  const snapshot = () =>
    JSON.parse(
      sql(
        "BEGIN READ ONLY; SET LOCAL search_path=pg_catalog; " +
          catalog +
          " ROLLBACK;",
      ),
    );
  const initial = snapshot();
  assert.deepEqual(
    initial.objects.find(
      (x) => x.kind === "column" && x.identity === "public.acl_synthetic.id",
    ).grants,
    [],
  );
  const original = aclCatalogDigest(initial);
  sql("grant select(id) on public.acl_synthetic to anon;");
  const column = snapshot();
  assert.notEqual(aclCatalogDigest(column), original);
  assert.ok(
    column.objects
      .find((x) => x.identity === "public.acl_synthetic.id")
      .grants.some((x) => x.grantee === "anon" && x.privilege === "SELECT"),
  );
  sql("revoke select(id) on public.acl_synthetic from anon;");
  assert.equal(aclCatalogDigest(snapshot()), original);
  sql("grant select on public.acl_synthetic to anon with grant option;");
  const delegated = snapshot();
  assert.notEqual(aclCatalogDigest(delegated), original);
  assert.ok(
    delegated.objects
      .find((x) => x.kind === "table" && x.identity === "public.acl_synthetic")
      .grants.some((x) => x.grantee === "anon" && x.grantable),
  );
  sql("revoke select on public.acl_synthetic from anon;");
  assert.equal(aclCatalogDigest(snapshot()), original);
  sql(
    "revoke usage on schema public from public; revoke select,update on sequence private.synthetic_seq from postgres;",
  );
  phase = "missing-grant-plan";
  const replay = planMissingRestoreGrants(initial, snapshot());
  assert.equal(replay.length, 3);
  sql("BEGIN; " + replay.join("\n") + " COMMIT;");
  phase = "missing-grant-comparison";
  assert.equal(aclCatalogDigest(snapshot()), original);
  sql(
    "alter default privileges for role synthetic_owner in schema private grant select on tables to anon;",
  );
  assert.notEqual(aclCatalogDigest(snapshot()), original);
  completed = true;
} catch (error) {
  diagnostic =
    error.message === "RECOVERY_ACL_CATALOG_REJECTED"
      ? "PLAN_REJECTED"
      : error.code === "ERR_ASSERTION"
        ? "ASSERTION_FAILED"
        : "COMMAND_REJECTED";
  process.exitCode = 1;
} finally {
  try {
    if (attempted) {
      assert.equal(
        run([
          "inspect",
          "--format",
          '{{index .Config.Labels "comun.recovery.owner"}}',
          name,
        ]),
        name,
      );
      run(["rm", "--force", name]);
      assert.equal(
        run([
          "ps",
          "-a",
          "--filter",
          `name=^/${name}$`,
          "--format",
          "{{.Names}}",
        ]),
        "",
      );
      cleaned = true;
    }
  } catch {
    completed = false;
    process.exitCode = 1;
  }
  console.log(
    JSON.stringify({
      result:
        completed && cleaned
          ? "SYNTHETIC_ACL_CATALOG_POSTGRES_PASS"
          : "SYNTHETIC_ACL_CATALOG_POSTGRES_FAIL",
      phase: completed ? "complete" : phase,
      diagnostic,
      realDataUsed: false,
      ownedContainerAbsent: cleaned,
    }),
  );
}
