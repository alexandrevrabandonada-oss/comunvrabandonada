import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  appendFile,
  access,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
export function classifyAuthRestoreDockerFailure(stderr) {
  const message = typeof stderr === "string" ? stderr : "";
  for (const [pattern, category] of [
    [/no space left on device/i, "LAB_SPACE_EXHAUSTED"],
    [/out of memory|cannot allocate memory|oom.?kill/i, "LAB_MEMORY_EXHAUSTED"],
    [/address already in use|port is already allocated/i, "LAB_PORT_COLLISION"],
    [/permission denied/i, "LAB_PERMISSION_DENIED"],
    [/does not exist/i, "MISSING_DATABASE_OBJECT"],
    [/already exists/i, "DUPLICATE_DATABASE_OBJECT"],
    [/syntax error/i, "SQL_SYNTAX"],
    [
      /container .* (not running|exited)|container is not running/i,
      "LAB_CONTAINER_UNAVAILABLE",
    ],
  ]) {
    if (pattern.test(message)) return category;
  }
  return "DOCKER_COMMAND_FAILED";
}

export function parseAuthRestoreArguments(args) {
  assert.equal(args.length, 3, "COMUN_AUTH_RESTORE_OPTIONS_INVALID");
  assert.equal(
    args[0],
    "--run-disposable",
    "COMUN_AUTH_RESTORE_OPTIONS_INVALID",
  );
  assert.equal(args[1], "--output", "COMUN_AUTH_RESTORE_OPTIONS_INVALID");
  assert(path.isAbsolute(args[2]), "COMUN_AUTH_RESTORE_OPTIONS_INVALID");
  return { output: args[2] };
}
export async function removeAuthRestoreResource(docker, owner, resource) {
  assert.match(owner, /^comun-ar-[a-f0-9-]{36}$/);
  assert(["container", "network"].includes(resource.type));
  const args =
    resource.type === "container"
      ? ["inspect", resource.id]
      : ["network", "inspect", resource.id];
  const record = JSON.parse((await docker(args)).toString())[0];
  assert.equal((record.Config?.Labels ?? record.Labels)["comun.owner"], owner);
  if (resource.type === "container") {
    assert.equal(record.HostConfig.NetworkMode, owner);
    assert(record.Mounts.every((mount) => mount.Type !== "volume"));
  } else assert.equal(record.Internal, true);
  await docker(
    resource.type === "container"
      ? ["rm", "-f", "-v", resource.id]
      : ["network", "rm", resource.id],
  );
}

export async function rehearseAuthIdentityRestore({ output }) {
  await mkdir(output, { recursive: false });
  const owner = `comun-ar-${randomUUID()}`;
  const password = randomBytes(24).toString("hex");
  const secret = randomBytes(48).toString("hex");
  const images = {
    pg: "postgres:17",
    auth: "public.ecr.aws/supabase/gotrue:v2.196.0",
    rest: "public.ecr.aws/supabase/postgrest:v16.2",
    node: "node:22.19.0-bookworm-slim",
  };
  const imageIds = {},
    resources = [],
    results = [];
  const sources = [
    "scripts/security/rehearse-auth-identity-restore.mjs",
    "scripts/security/auth-restore-domain.mjs",
    "scripts/organization/disposable-cycle-fixture.sql",
    "supabase/migrations/20261024174838_comun_legacy_private_live_session.sql",
  ];
  const sourceHashes = {};
  for (const source of sources)
    sourceHashes[source] = createHash("sha256")
      .update(await readFile(path.join(root, source)))
      .digest("hex");
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  const docker = (args, input) =>
    new Promise((resolve, reject) => {
      const child = execFile(
        "docker",
        args,
        {
          encoding: "buffer",
          timeout: 90000,
          maxBuffer: 8 * 1024 * 1024,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (!error) {
            resolve(stdout);
            return;
          }
          const failure = new Error("COMUN_AUTH_RESTORE_DOCKER_FAILED");
          try {
            const diagnostic = JSON.parse(stdout.toString()).failureDiagnostic;
            if (
              diagnostic &&
              (diagnostic.lastHttpStatus === null ||
                Number.isInteger(diagnostic.lastHttpStatus))
            )
              failure.safeDiagnostic = {
                lastHttpStatus: diagnostic.lastHttpStatus,
              };
          } catch {}
          if (!failure.safeDiagnostic)
            failure.safeDiagnostic = {
              category: classifyAuthRestoreDockerFailure(stderr.toString()),
            };
          reject(failure);
        },
      );
      child.stdin.on("error", () => {});
      child.stdin.end(input);
    });
  const text = async (args, input) =>
    (await docker(args, input)).toString().trim();
  const sql = (database, input) =>
    text(
      [
        "exec",
        "-i",
        `${owner}-pg`,
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-d",
        database,
        "-At",
      ],
      input,
    );
  const wait = async (check) => {
    for (let n = 0; n < 60; n++) {
      try {
        if (await check()) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("COMUN_AUTH_RESTORE_READINESS_FAILED");
  };
  const result = {
    kind: "SYNTHETIC_APPLICATION_RESTORE_REAL_AUTH_NOT_PROVIDER_RECOVERY",
    sha,
    sourceHashes,
    imageIds,
    owner,
    result: "FAIL",
    results,
    scope: "minimal_application_fixture_with_canonical_live_session_migration",
    productionTouched: false,
    realUsersRead: false,
    nativeProviderRecoveryVerified: false,
  };
  let configDir,
    stage = "preflight",
    runner,
    usersCleaned = false,
    cleanupVerified = true;
  try {
    assert(
      !process.env.DOCKER_HOST ||
        [
          "npipe:////./pipe/dockerDesktopLinuxEngine",
          "unix:///var/run/docker.sock",
        ].includes(process.env.DOCKER_HOST),
    );
    const context = JSON.parse(await text(["context", "inspect"]))[0];
    assert(
      [
        "npipe:////./pipe/dockerDesktopLinuxEngine",
        "unix:///var/run/docker.sock",
      ].includes(context.Endpoints.docker.Host),
    );
    for (const [name, image] of Object.entries(images))
      imageIds[name] = JSON.parse(
        await text(["image", "inspect", image]),
      )[0].Id;
    configDir = await mkdtemp(path.join(os.tmpdir(), "comun-auth-restore-"));
    if (process.platform === "win32") {
      const identity = execFileSync("whoami", [], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
      execFileSync(
        "icacls",
        [
          configDir,
          "/inheritance:r",
          "/grant:r",
          `${identity}:(OI)(CI)F`,
          "SYSTEM:(OI)(CI)F",
        ],
        { stdio: "ignore", windowsHide: true },
      );
    }
    await writeFile(
      path.join(output, "resource-intents.jsonl"),
      JSON.stringify({
        owner,
        sha,
        stage: "network-create",
        utc: new Date().toISOString(),
      }) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    resources.push({ type: "network", id: owner });
    await text([
      "network",
      "create",
      "--internal",
      "--label",
      `comun.owner=${owner}`,
      owner,
    ]);
    const run = async (suffix, image, env, extra = []) => {
      const envFile = path.join(configDir, `${suffix}.env`);
      await writeFile(
        envFile,
        Object.entries(env)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n") + "\n",
        { mode: 0o600, flag: "wx" },
      );
      const name = `${owner}-${suffix}`;
      await appendFile(
        path.join(output, "resource-intents.jsonl"),
        JSON.stringify({
          owner,
          stage: "container-create",
          name,
          utc: new Date().toISOString(),
        }) + "\n",
      );
      resources.push({ type: "container", id: name });
      const id = await text([
        "run",
        "-d",
        "--pull=never",
        "--name",
        name,
        "--label",
        `comun.owner=${owner}`,
        "--network",
        owner,
        "--env-file",
        envFile,
        ...extra,
        imageIds[image],
        ...(image === "node" ? ["sleep", "infinity"] : []),
      ]);
      const inspect = JSON.parse(await text(["inspect", id]))[0];
      assert.equal(inspect.Config.Labels["comun.owner"], owner);
      assert.equal(inspect.HostConfig.NetworkMode, owner);
      assert(
        !inspect.HostConfig.PortBindings ||
          Object.keys(inspect.HostConfig.PortBindings).length === 0,
      );
      assert(inspect.Mounts.every((mount) => mount.Type !== "volume"));
      return id;
    };
    stage = "postgres-container-create";
    await run("pg", "pg", { POSTGRES_PASSWORD: password }, [
      "--memory",
      "512m",
      "--memory-swap",
      "512m",
      "--tmpfs",
      "/var/lib/postgresql/data:rw,nosuid,size=256m",
    ]);
    stage = "postgres-final-tcp-readiness";
    // The official PostgreSQL image starts a temporary socket-only server
    // during initdb. Socket pg_isready may succeed before its shutdown.
    // Only the final network-listening server may pass this preflight.
    await wait(async () =>
      (
        await text([
          "exec",
          `${owner}-pg`,
          "pg_isready",
          "-h",
          "127.0.0.1",
          "-p",
          "5432",
          "-U",
          "postgres",
        ])
      ).includes("accepting"),
    );
    stage = "postgres-final-sql-readiness";
    await wait(async () => (await sql("postgres", "select 1;")) === "1");
    stage = "database-create-source";
    await sql("postgres", "create database source;");
    stage = "database-create-recovered";
    await sql("postgres", "create database recovered;");
    stage = "database-verify";
    assert.equal(
      await sql(
        "postgres",
        "select count(*) from pg_database where datname in ('source','recovered');",
      ),
      "2",
    );
    const fixture = await readFile(
      path.join(root, "scripts/organization/disposable-cycle-fixture.sql"),
      "utf8",
    );
    // Password is synthetic and stays in stdin, not SQL command arguments.
    stage = "source-fixture";
    await sql(
      "source",
      fixture.replace("password :'rest_password'", `password '${password}'`),
    );
    const authBootstrap = fixture.slice(
      fixture.indexOf("create schema if not exists auth"),
      fixture.indexOf("create table public.comun_communities"),
    );
    stage = "restored-auth-bootstrap";
    await sql("recovered", authBootstrap);
    stage = "postgres-search-path";
    await sql("postgres", "alter role postgres set search_path=auth,public;");
    const authEnv = (database) => ({
      GOTRUE_API_HOST: "0.0.0.0",
      GOTRUE_API_PORT: "9999",
      GOTRUE_DB_DRIVER: "postgres",
      GOTRUE_DB_DATABASE_URL: `postgres://postgres:${password}@${owner}-pg:5432/${database}?sslmode=disable`,
      GOTRUE_DB_NAMESPACE: "auth",
      GOTRUE_SITE_URL: "http://127.0.0.1:54329",
      API_EXTERNAL_URL: "http://127.0.0.1:54329/auth/v1",
      GOTRUE_JWT_SECRET: secret,
      GOTRUE_JWT_ADMIN_ROLES: "service_role",
      GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
      GOTRUE_DISABLE_SIGNUP: "true",
      GOTRUE_SMTP_HOST: "127.0.0.1",
    });
    await run("source-auth", "auth", authEnv("source"), [
      "--read-only",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m",
    ]);
    await run("restored-auth", "auth", authEnv("recovered"), [
      "--read-only",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m",
    ]);
    runner = await run(
      "runner",
      "node",
      {
        COMUN_AUTH_RESTORE_OWNER: owner,
        COMUN_AUTH_RESTORE_PASSWORD: password,
        COMUN_AUTH_RESTORE_SECRET: secret,
      },
      [
        "--read-only",
        "--memory",
        "256m",
        "--memory-swap",
        "256m",
        "--tmpfs",
        "/state:rw,noexec,nosuid,size=16m",
        "--mount",
        `type=bind,source=${path.join(root, "scripts/security/auth-restore-domain.mjs")},target=/work/auth-restore-domain.mjs,readonly`,
        "--workdir",
        "/work",
      ],
    );
    const domain = async (phase) => {
      const reply = JSON.parse(
        await text([
          "exec",
          runner,
          "node",
          "/work/auth-restore-domain.mjs",
          phase,
        ]),
      );
      assert(Array.isArray(reply.results));
      results.push(...reply.results);
      return reply.internal;
    };
    stage = "source-real-auth";
    const ids = await domain("create-source");
    for (const id of Object.values(ids)) assert.match(id, /^[a-f0-9-]{36}$/);
    const communityA = randomUUID(),
      communityB = randomUUID();
    await sql(
      "source",
      `insert into public.comun_member_profiles(user_id,display_name,status) values('${ids.a}','Synthetic A','active'),('${ids.b}','Synthetic B','active');insert into public.comun_communities(id,slug,name) values('${communityA}','synthetic-a','Synthetic A'),('${communityB}','synthetic-b','Synthetic B');insert into public.comun_community_memberships(id,community_id,member_user_id,state) values('${randomUUID()}','${communityA}','${ids.a}','active'),('${randomUUID()}','${communityB}','${ids.b}','active');`,
    );
    await wait(
      async () =>
        (await sql(
          "source",
          "select to_regclass('auth.sessions') is not null",
        )) === "t",
    );
    await sql(
      "source",
      await readFile(
        path.join(
          root,
          "supabase/migrations/20261024174838_comun_legacy_private_live_session.sql",
        ),
        "utf8",
      ),
    );
    const restEnv = (database) => ({
      PGRST_DB_URI: `postgres://authenticator:${password}@${owner}-pg:5432/${database}`,
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: secret,
    });
    await run("source-rest", "rest", restEnv("source"), ["--read-only"]);
    await domain("source-read");
    stage = "synthetic-application-dump";
    const dump = await docker([
      "exec",
      `${owner}-pg`,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "source",
      "--format=custom",
      "--schema=public",
      "--schema=comun_auth_private",
    ]);
    result.syntheticDumpSha256 = createHash("sha256")
      .update(dump)
      .digest("hex");
    const toc = await text(
      ["exec", "-i", `${owner}-pg`, "pg_restore", "--list"],
      dump,
    );
    assert(!/ TABLE DATA auth /.test(toc));
    results.push({
      name: "dump_contains_no_Auth_accounts_or_sessions",
      result: "PASS",
    });
    stage = "restore-application-only";
    await wait(
      async () =>
        (await sql(
          "recovered",
          "select to_regclass('auth.sessions') is not null",
        )) === "t",
    );
    assert.equal(
      await sql("recovered", "select count(*) from auth.users"),
      "0",
    );
    await sql("recovered", "drop schema public cascade;");
    await docker(
      [
        "exec",
        "-i",
        `${owner}-pg`,
        "pg_restore",
        "--exit-on-error",
        "--no-owner",
        "-U",
        "postgres",
        "-d",
        "recovered",
      ],
      dump,
    );
    assert.equal(
      await sql("recovered", "select count(*) from auth.users"),
      "0",
    );
    assert.equal(
      await sql("recovered", "select count(*) from auth.sessions"),
      "0",
    );
    assert.equal(
      await sql(
        "recovered",
        "select count(*) from public.comun_community_memberships",
      ),
      "2",
    );
    results.push({
      name: "restored_app_rows_do_not_restore_Auth_accounts_or_sessions",
      result: "PASS",
    });
    stage = "restored-real-auth";
    const targetIds = await domain("create-restored");
    assert.match(targetIds.bNew, /^[a-f0-9-]{36}$/);
    await sql(
      "recovered",
      `insert into public.comun_member_profiles(user_id,display_name,status) values('${targetIds.bNew}','Synthetic different identity','active');`,
    );
    await run("restored-rest", "rest", restEnv("recovered"), ["--read-only"]);
    await domain("restored-read");
    stage = "revocation-and-reauthentication";
    await domain("revoke");
    stage = "suspended-profile";
    await sql(
      "recovered",
      `update public.comun_member_profiles set status='suspended' where user_id='${ids.a}';`,
    );
    await domain("suspended-profile");
    stage = "native-ban";
    await sql(
      "recovered",
      `update public.comun_member_profiles set status='active' where user_id='${ids.a}';`,
    );
    await domain("ban");
    stage = "cleanup-users";
    await domain("cleanup-users");
    usersCleaned = true;
    result.result = "PASS";
  } catch (error) {
    result.failedStage = stage;
    result.failureDiagnostic =
      error.safeDiagnostic ??
      (error.message === "COMUN_AUTH_RESTORE_READINESS_FAILED"
        ? { category: "LAB_READINESS_TIMEOUT" }
        : { category: "INTERNAL_STAGE_FAILED" });
    result.result = "FAIL";
  } finally {
    for (const resource of resources.reverse()) {
      try {
        const listNames = () =>
          text(
            resource.type === "container"
              ? [
                  "ps",
                  "-a",
                  "--filter",
                  `name=^/${resource.id}$`,
                  "--format",
                  "{{.Names}}",
                ]
              : [
                  "network",
                  "ls",
                  "--filter",
                  `name=${resource.id}`,
                  "--format",
                  "{{.Name}}",
                ],
          );
        if (!(await listNames()).split("\n").includes(resource.id)) continue;
        await removeAuthRestoreResource(docker, owner, resource);
        assert(!(await listNames()).split("\n").includes(resource.id));
      } catch {
        cleanupVerified = false;
      }
    }
    if (configDir) {
      try {
        assert.equal(path.dirname(configDir), os.tmpdir());
        assert(path.basename(configDir).startsWith("comun-auth-restore-"));
        await rm(configDir, { recursive: true, force: true });
        try {
          await access(configDir);
          throw new Error("CONFIG_REMAINS");
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      } catch {
        cleanupVerified = false;
      }
    }
  }
  result.cleanup = {
    resourcesAbsent: cleanupVerified,
    syntheticAccountsAbsentBeforeDatabaseRemoval: usersCleaned,
    ephemeralConfigurationRemoved: cleanupVerified,
  };
  if (!cleanupVerified) result.result = "FAIL";
  for (const source of sources)
    assert.equal(
      createHash("sha256")
        .update(await readFile(path.join(root, source)))
        .digest("hex"),
      sourceHashes[source],
    );
  await writeFile(
    path.join(output, "auth-identity-restore.json"),
    JSON.stringify(result, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  return result;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const result = await rehearseAuthIdentityRestore(
      parseAuthRestoreArguments(process.argv.slice(2)),
    );
    console.log(
      JSON.stringify({
        result: result.result,
        checks: result.results.length,
        failedStage: result.failedStage,
        cleanup: result.cleanup,
        nativeProviderRecoveryVerified: false,
      }),
    );
    if (result.result !== "PASS") process.exitCode = 1;
  } catch {
    console.error("COMUN_AUTH_RESTORE_STOPPED");
    process.exitCode = 1;
  }
}
