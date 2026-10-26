import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalRoleCatalog,
  roleCatalogDigest,
  compareRoleCatalogs,
} from "./recovery-role-contract.mjs";

const args = process.argv.slice(2);
const output = args[2];
const owner = `comun-role-${randomUUID()}`;
const image =
  "sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675";
const attempted = [];
const checks = [];
const env = {
  ...process.env,
  POSTGRES_PASSWORD: randomBytes(24).toString("hex"),
};
let phase = "preflight",
  cleaned = true,
  result = "FAIL",
  digest;
let diagnostic = null,
  lastSqlError = null,
  lastShape = null;
const run = (argv, input) => {
  const r = spawnSync("docker", argv, {
    input,
    env,
    timeout: 30000,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
  if (r.error || r.status !== 0) {
    lastSqlError = /syntax error/i.test(r.stderr?.toString() ?? "")
      ? "SQL_SYNTAX"
      : /does not exist/i.test(r.stderr?.toString() ?? "")
        ? "MISSING_OBJECT"
        : "COMMAND_FAILURE";
    throw new Error("ROLE_LAB_COMMAND_REJECTED");
  }
  return r.stdout;
};
const text = (argv, input) => run(argv, input).toString().trim();
const sql = (suffix, statement) =>
  text(
    [
      "exec",
      "-i",
      `${owner}-${suffix}`,
      "psql",
      "-XqAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    statement,
  );
const check = (name, condition) => {
  assert(condition);
  checks.push({ name, result: "PASS" });
};
try {
  assert(
    args.length === 3 &&
      args[0] === "--run-disposable" &&
      args[1] === "--output" &&
      path.isAbsolute(output),
  );
  await mkdir(output, { recursive: false });
  assert(
    !process.env.DOCKER_HOST ||
      [
        "npipe:////./pipe/dockerDesktopLinuxEngine",
        "unix:///var/run/docker.sock",
      ].includes(process.env.DOCKER_HOST),
  );
  const context = JSON.parse(text(["context", "inspect"]))[0];
  assert(
    [
      "npipe:////./pipe/dockerDesktopLinuxEngine",
      "unix:///var/run/docker.sock",
    ].includes(context.Endpoints.docker.Host),
  );
  const query = await readFile(
    new URL("./recovery-role-catalog.sql", import.meta.url),
    "utf8",
  );
  const sourceSha = text(["image", "inspect", image, "--format", "{{.Id}}"]);
  assert.equal(sourceSha, image);
  for (const suffix of ["source", "target"]) {
    const name = `${owner}-${suffix}`;
    attempted.push(name);
    await appendFile(
      path.join(output, "resource-intents.jsonl"),
      JSON.stringify({ owner, name, utc: new Date().toISOString() }) + "\n",
    );
    run([
      "run",
      "-d",
      "--name",
      name,
      "--label",
      `comun.recovery.owner=${owner}`,
      "--pull=never",
      "--network",
      "none",
      "--memory",
      "512m",
      "--memory-swap",
      "512m",
      "--tmpfs",
      "/var/lib/postgresql/data:rw,nosuid,nodev,size=256m",
      "-e",
      "POSTGRES_PASSWORD",
      image,
    ]);
    const until = Date.now() + 60000;
    while (true) {
      const ready = spawnSync(
        "docker",
        ["exec", name, "pg_isready", "-U", "postgres"],
        { stdio: "ignore", timeout: 5000, windowsHide: true },
      );
      if (ready.status === 0) break;
      if (Date.now() > until) throw new Error("ROLE_LAB_NOT_READY");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  const snapshot = (suffix) => {
    const value = JSON.parse(
      sql(
        suffix,
        `BEGIN READ ONLY; SET LOCAL search_path=pg_catalog; ${query} ROLLBACK;`,
      ),
    );
    lastShape = {
      keys: Object.keys(value),
      roleKeys: Object.keys(value.roles?.[0] ?? {}),
      membershipKeys: Object.keys(value.memberships?.[0] ?? {}),
      major: value.postgresMajor,
      readOnly: value.transactionReadOnly,
    };
    return canonicalRoleCatalog(value);
  };
  phase = "attributes";
  sql(
    "source",
    "create role synthetic_owner nologin; create role synthetic_member nologin; create role synthetic_delegate nologin;",
  );
  const initial = snapshot("source");
  const initialDigest = roleCatalogDigest(initial);
  for (const [field, enabled, disabled] of [
    ["superuser", "SUPERUSER", "NOSUPERUSER"],
    ["inherit", "NOINHERIT", "INHERIT"],
    ["create_role", "CREATEROLE", "NOCREATEROLE"],
    ["create_database", "CREATEDB", "NOCREATEDB"],
    ["login", "LOGIN", "NOLOGIN"],
    ["replication", "REPLICATION", "NOREPLICATION"],
    ["bypass_rls", "BYPASSRLS", "NOBYPASSRLS"],
    ["connection_limit", "CONNECTION LIMIT 10", "CONNECTION LIMIT -1"],
  ]) {
    phase = `attribute-${field}`;
    sql("source", `alter role synthetic_owner ${enabled};`);
    const changed = snapshot("source");
    check(
      `detect_${field}`,
      compareRoleCatalogs(initial, changed).attributesChanged === 1 &&
        roleCatalogDigest(changed) !== initialDigest,
    );
    sql("source", `alter role synthetic_owner ${disabled};`);
    assert.equal(roleCatalogDigest(snapshot("source")), initialDigest);
  }
  sql(
    "source",
    "alter role synthetic_owner valid until '2027-01-01 00:00:00.123456+00';",
  );
  check(
    "detect_finite_expiry",
    compareRoleCatalogs(initial, snapshot("source")).attributesChanged === 1,
  );
  sql("source", "alter role synthetic_owner valid until 'infinity';");
  check(
    "preserve_infinite_expiry",
    snapshot("source").roles.find((r) => r.name === "synthetic_owner")
      .valid_until === "infinity",
  );
  sql("source", "alter role synthetic_owner valid until '-infinity';");
  check(
    "preserve_negative_infinite_expiry",
    snapshot("source").roles.find((r) => r.name === "synthetic_owner")
      .valid_until === "-infinity",
  );
  sql(
    "source",
    "alter role synthetic_owner valid until 'infinity'; grant synthetic_owner to synthetic_member;",
  );
  phase = "memberships";
  const baseline = snapshot("source");
  for (const [field, enabled, disabled] of [
    ["admin", "ADMIN TRUE", "ADMIN FALSE"],
    ["inherit", "INHERIT FALSE", "INHERIT TRUE"],
    ["set_role", "SET FALSE", "SET TRUE"],
  ]) {
    sql("source", `grant synthetic_owner to synthetic_member with ${enabled};`);
    check(
      `detect_membership_${field}`,
      compareRoleCatalogs(baseline, snapshot("source"))
        .membershipOptionsChanged === 1,
    );
    sql(
      "source",
      `grant synthetic_owner to synthetic_member with ${disabled};`,
    );
    assert.equal(
      roleCatalogDigest(snapshot("source")),
      roleCatalogDigest(baseline),
    );
  }
  sql(
    "source",
    "grant synthetic_owner to synthetic_delegate with admin option; set role synthetic_delegate; grant synthetic_owner to synthetic_member; reset role;",
  );
  const source = snapshot("source");
  check(
    "preserve_distinct_grantor",
    source.memberships.some(
      (m) =>
        m.role === "synthetic_owner" &&
        m.member === "synthetic_member" &&
        m.grantor === "synthetic_delegate",
    ),
  );
  phase = "application-dump-boundary";
  sql(
    "source",
    "create table public.synthetic_application(id integer primary key); insert into public.synthetic_application values(42);",
  );
  const dump = run([
    "exec",
    `${owner}-source`,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "--format=custom",
    "--schema=public",
    "--no-owner",
    "--no-privileges",
  ]);
  sql("target", "drop schema public cascade;");
  run(
    [
      "exec",
      "-i",
      `${owner}-target`,
      "pg_restore",
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    dump,
  );
  assert.equal(
    sql("target", "select count(*) from public.synthetic_application"),
    "1",
  );
  const comparison = compareRoleCatalogs(source, snapshot("target"));
  check(
    "application_dump_does_not_restore_global_roles",
    comparison.rolesMissing === 3 &&
      comparison.membershipsMissing >= 3 &&
      !comparison.equal &&
      comparison.recoveryComplete === false,
  );
  digest = roleCatalogDigest(source);
  result = "PASS";
} catch (error) {
  diagnostic = [
    "RECOVERY_ROLE_CATALOG_REJECTED",
    "ROLE_LAB_COMMAND_REJECTED",
  ].includes(error.message)
    ? error.message
    : "ASSERTION_OR_PROTOCOL_FAILURE";
  result = "FAIL";
} finally {
  for (const name of attempted.reverse()) {
    try {
      const names = () =>
        text([
          "ps",
          "-a",
          "--filter",
          `name=^/${name}$`,
          "--format",
          "{{.Names}}",
        ]);
      if (!names()) continue;
      const actual = JSON.parse(text(["inspect", name]))[0];
      assert.equal(actual.Config.Labels["comun.recovery.owner"], owner);
      assert.equal(actual.HostConfig.NetworkMode, "none");
      assert(actual.Mounts.every((m) => m.Type !== "volume"));
      run(["rm", "--force", name]);
      assert.equal(names(), "");
    } catch {
      cleaned = false;
    }
  }
}
if (!cleaned) result = "FAIL";
const report = {
  kind: "ROLE_CATALOG_SYNTHETIC_REHEARSAL_NOT_ROLE_RESTORE",
  result,
  checks,
  failedPhase: result === "FAIL" ? phase : null,
  cleanupVerified: cleaned,
  imageId: image,
  catalogDigest: digest ?? null,
  sourceRoleWrites: "SYNTHETIC_LAB_ONLY",
  remoteWrites: false,
  recoveryComplete: false,
  credentialsRead: false,
  diagnostic,
  lastSqlError,
  lastShape,
};
if (output && path.isAbsolute(output)) {
  try {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    const git = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
    report.sha = git.stdout.trim();
    report.querySha256 = createHash("sha256")
      .update(
        await readFile(new URL("./recovery-role-catalog.sql", import.meta.url)),
      )
      .digest("hex");
    await writeFile(
      path.join(output, "role-catalog-rehearsal.json"),
      JSON.stringify(report, null, 2),
      { flag: "wx", mode: 0o600 },
    );
  } catch {
    report.result = "FAIL";
  }
}
console.log(
  JSON.stringify({
    result: report.result,
    checks: checks.length,
    failedPhase: report.failedPhase,
    cleanupVerified: cleaned,
    recoveryComplete: false,
  }),
);
if (report.result !== "PASS") process.exitCode = 1;
