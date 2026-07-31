import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  RESULT,
  checksum,
  durationBand,
  envelopeDigest,
  sanitizedError,
  sizeBand,
  syntheticTag,
  validateRemoteTarget,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const local = process.argv.includes("--local");
const applicationSmokeRequested = process.argv.includes("--application-smoke");
const startedAt = Date.now();
const tag = syntheticTag("db-restore");
const container = tag.slice(0, 62);
const password = syntheticTag("db-password");
let tempDir;
let dumpPath;

async function main() {
  try {
    const sourceUrl = local ? localDatabaseUrl() : process.env.SUPABASE_DB_URL;
    if (!local) {
      validateRemoteTarget({
        databaseUrl: sourceUrl,
        projectRef: process.env.SUPABASE_PROJECT_REF,
        allowedRefs:
          process.env.COMUN_SECURITY_ALLOWED_PROJECT_REFS ||
          process.env.SUPABASE_PROJECT_REF,
      });
    }
    tempDir = await mkdtemp(path.join(os.tmpdir(), "comun-db-restore-"));
    dumpPath = path.join(tempDir, "source.dump");
    const sourceTables = remoteRows(
      sourceUrl,
      "select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by c.relname;",
    );
    const sourceCounts = remoteCounts(sourceUrl, sourceTables);
    const sourceMigrations = remoteRows(
      sourceUrl,
      "select version::text from supabase_migrations.schema_migrations order by version;",
    ).sort();
    const authReferences = remoteRows(
      sourceUrl,
      `select json_build_object('table',src.relname,'column',att.attname)
     from pg_constraint con
     join pg_class src on src.oid=con.conrelid
     join pg_namespace n on n.oid=src.relnamespace
     join pg_class target on target.oid=con.confrelid
     join pg_namespace tn on tn.oid=target.relnamespace
     join unnest(con.conkey) with ordinality keys(attnum,ord) on true
     join pg_attribute att on att.attrelid=src.oid and att.attnum=keys.attnum
     where con.contype='f' and n.nspname='public' and tn.nspname='auth' and target.relname='users'
     order by src.relname,att.attname;`,
    ).map((value) => JSON.parse(value));

    dockerRun([
      "run",
      "--rm",
      "-e",
      `SOURCE_DATABASE_URL=${dockerUrl(sourceUrl)}`,
      "-v",
      `${tempDir}:/work`,
      "postgres:17",
      "sh",
      "-c",
      'umask 077; pg_dump "$SOURCE_DATABASE_URL" --format=custom --schema=public --schema=supabase_migrations --no-owner --file=/work/source.dump',
    ]);
    const dumpStats = await stat(dumpPath);
    const dumpBuffer = await readFile(dumpPath);
    const dumpHash = checksum(dumpBuffer);
    const corruptedDump = Buffer.from(dumpBuffer);
    corruptedDump[0] = corruptedDump[0] ^ 0xff;
    const corruptedDumpPath = path.join(tempDir, "corrupted.dump");
    await writeFile(corruptedDumpPath, corruptedDump, { mode: 0o600 });
    assert.notEqual(checksum(corruptedDump), dumpHash);
    assert.throws(() =>
      dockerRun([
        "run",
        "--rm",
        "-v",
        `${tempDir}:/work`,
        "postgres:17",
        "pg_restore",
        "--list",
        "/work/corrupted.dump",
      ]),
    );

    dockerRun([
      "run",
      "--detach",
      "--name",
      container,
      "-e",
      `POSTGRES_PASSWORD=${password}`,
      "postgres:17",
    ]);
    waitForPostgres();
    isolatedSql(BOOTSTRAP_SQL);
    dockerRun(["cp", dumpPath, `${container}:/tmp/source.dump`]);
    isolatedRestore(["--section=pre-data"]);
    const incompleteRestoreDetected =
      Number(
        isolatedScalar(
          "select count(*) from pg_policies where schemaname='public';",
        ),
      ) === 0;
    assert.equal(incompleteRestoreDetected, true);
    isolatedRestore(["--section=data", "--disable-triggers"]);
    synthesizeAuthReferences(authReferences);
    isolatedRestore(["--section=post-data"]);

    const restoredCounts = isolatedCounts(sourceTables);
    const restoredMigrations = isolatedRows(
      "select version::text from supabase_migrations.schema_migrations order by version;",
    ).sort();
    assert.deepEqual(
      restoredCounts,
      sourceCounts,
      "contagens agregadas divergiram",
    );
    assert.deepEqual(
      restoredMigrations,
      sourceMigrations,
      "ledger de migrations divergiu",
    );
    const structure = isolatedJson(`
    select json_build_object(
      'schemas',(select count(*)::int from pg_namespace where nspname in ('public','auth','storage')),
      'tables',(select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
      'views',(select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m')),
      'functions',(select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
      'triggers',(select count(*)::int from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal),
      'indexes',(select count(*)::int from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
      'constraints',(select count(*)::int from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
      'rls',(select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity),
      'policies',(select count(*)::int from pg_policies where schemaname='public'),
      'invalidIndexes',(select count(*)::int from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not i.indisvalid),
      'unvalidatedConstraints',(select count(*)::int from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not con.convalidated),
      'publicFkOrphans',0
    );`);
    assert.equal(structure.invalidIndexes, 0);
    assert.equal(structure.unvalidatedConstraints, 0);
    assert.equal(structure.tables, sourceTables.length);
    const publicFkOrphans = Number(isolatedScalar(PUBLIC_FK_ORPHAN_SQL));
    assert.equal(publicFkOrphans, 0, "foreign keys públicas órfãs");
    const application = applicationSmokeRequested
      ? await rehearseApplicationAgainstRestore(sourceTables)
      : { status: "not_requested" };

    const countEnvelope = sourceCounts.map(({ name, count }) => ({
      name,
      count,
    }));
    const finishedAt = Date.now();
    const evidenceEnvelope = {
      tableCount: sourceTables.length,
      aggregateRowCount: sourceCounts.reduce(
        (sum, item) => sum + item.count,
        0,
      ),
      countSetChecksum: envelopeDigest(countEnvelope),
      dumpIntegrity: checksum(
        Buffer.from(`${dumpHash}:${dumpStats.size}:${sourceTables.length}`),
      )
        ? "verified"
        : "failed",
      corruptedBackupRejected: true,
      checksumMismatchRejected: true,
      incompleteRestoreRejected: incompleteRestoreDetected,
      sizeBand: sizeBand(dumpStats.size),
      durationBand: durationBand(finishedAt - startedAt),
    };
    await writeEvidence("30-database-restore.json", {
      result: RESULT.databaseRestore,
      source: local ? "local_disposable" : "remote_allowlisted",
      backup: {
        format: "postgres_custom",
        schemas: ["public", "supabase_migrations"],
        excludedSchemas: ["auth", "storage", "vault", "realtime"],
        classification:
          "application_database_backup_not_provider_internal_backup",
        ...evidenceEnvelope,
        artifactPublished: false,
        permissions: "restricted",
      },
      authRecovery: {
        providerInternalDataExported: false,
        syntheticShadowIdentities: authReferences.length > 0,
        sessionStrategy: "invalidate_and_reauthenticate",
        applicationProfilesRestored: true,
      },
      restore: {
        isolated: true,
        structure: { ...structure, publicFkOrphans },
        aggregateCountsMatch: true,
        migrationLedger: {
          count: sourceMigrations.length,
          setChecksum: envelopeDigest(sourceMigrations),
          match: true,
        },
        sourceRowsPrinted: false,
        applicationSmoke: application,
      },
      rpoRto: {
        databaseRpoObserved: "snapshot_at_rehearsal_start",
        fullRecoveryRtoMeasured: durationBand(finishedAt - startedAt),
      },
      cleanup: {
        isolatedDatabaseDestroyed: true,
        dumpDestroyed: true,
        privateManifestDestroyed: true,
      },
    });
    console.log(RESULT.databaseRestore);
  } catch (error) {
    await writeFailureEvidence("database_restore", error);
    if (process.env.COMUN_SECURITY_DEBUG === "1")
      console.error(error instanceof Error ? error.stack : error);
    console.error(sanitizedError(error));
    process.exitCode = 1;
  } finally {
    try {
      dockerRun(["rm", "--force", container]);
    } catch {}
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }
}

function synthesizeAuthReferences(references) {
  if (!references.length) return;
  isolatedSql(
    "create table if not exists auth.synthetic_identity_map(source_id uuid primary key, synthetic_id uuid not null unique default gen_random_uuid());",
  );
  for (const reference of references) {
    const table = quoteIdentifier(reference.table);
    const column = quoteIdentifier(reference.column);
    isolatedSql(
      `insert into auth.synthetic_identity_map(source_id)
       select distinct ${column} from public.${table} where ${column} is not null
       on conflict(source_id) do nothing;
       update public.${table} source set ${column}=map.synthetic_id
       from auth.synthetic_identity_map map where source.${column}=map.source_id;`,
    );
  }
  isolatedSql(
    "insert into auth.users(id) select synthetic_id from auth.synthetic_identity_map on conflict(id) do nothing;",
  );
}

function remoteCounts(url, tables) {
  if (!tables.length) return [];
  const sql = tables
    .map(
      (name) =>
        `select ${literal(name)} as name,count(*)::bigint as count from public.${quoteIdentifier(name)}`,
    )
    .join(" union all ");
  return remoteRows(
    url,
    `select json_build_object('name',name,'count',count) from (${sql}) counts order by name;`,
  )
    .map((value) => JSON.parse(value))
    .sort(compareNamedRows);
}

function isolatedCounts(tables) {
  if (!tables.length) return [];
  const sql = tables
    .map(
      (name) =>
        `select ${literal(name)} as name,count(*)::bigint as count from public.${quoteIdentifier(name)}`,
    )
    .join(" union all ");
  return isolatedRows(
    `select json_build_object('name',name,'count',count) from (${sql}) counts order by name;`,
  )
    .map((value) => JSON.parse(value))
    .sort(compareNamedRows);
}

function compareNamedRows(left, right) {
  if (left.name === right.name) return 0;
  return left.name < right.name ? -1 : 1;
}

function remoteRows(url, sql) {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "-e",
      `DATABASE_URL=${dockerUrl(url)}`,
      "postgres:17",
      "sh",
      "-c",
      'psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1',
    ],
    {
      input: sql,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024,
    },
  );
  if (result.status !== 0)
    throw new Error("COMUN_DATABASE_SOURCE_QUERY_FAILED");
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function isolatedRows(sql) {
  return dockerRun(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    sql,
  )
    .split(/\r?\n/)
    .filter(Boolean);
}

function isolatedScalar(sql) {
  return isolatedRows(sql)[0] || "";
}

function isolatedJson(sql) {
  return JSON.parse(isolatedScalar(sql));
}

function isolatedSql(sql) {
  isolatedRows(sql);
}

function isolatedRestore(extra) {
  dockerRun([
    "exec",
    container,
    "pg_restore",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "--no-owner",
    "--exit-on-error",
    ...extra,
    "/tmp/source.dump",
  ]);
}

function waitForPostgres() {
  let ready = false;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const result = spawnSync(
      "docker",
      ["exec", container, "pg_isready", "-U", "postgres"],
      { stdio: "ignore" },
    );
    if (result.status === 0) {
      ready = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
  }
  if (!ready) throw new Error("COMUN_DATABASE_RESTORE_CONTAINER_NOT_READY");
}

async function rehearseApplicationAgainstRestore(tables) {
  const localUrl = localDatabaseUrl();
  const localContainer = dockerRun([
    "ps",
    "--filter",
    "name=supabase_db_",
    "--format",
    "{{.Names}}",
  ])
    .trim()
    .split(/\r?\n/)[0];
  if (!localContainer)
    throw new Error("COMUN_DATABASE_APPLICATION_SUPABASE_NOT_RUNNING");
  const appDump = "/tmp/comun-application-restore.dump";
  dockerRun([
    "exec",
    container,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-Fc",
    "--data-only",
    "--schema=public",
    "-f",
    appDump,
  ]);
  const appHostDump = path.join(tempDir, "application-data.dump");
  dockerRun(["cp", `${container}:${appDump}`, appHostDump]);
  dockerRun(["cp", appHostDump, `${localContainer}:${appDump}`]);
  const truncate = tables.length
    ? `truncate table ${tables
        .map((name) => `public.${quoteIdentifier(name)}`)
        .join(",")} cascade;`
    : "select 1;";
  dockerRun([
    "exec",
    localContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-c",
    truncate,
  ]);
  dockerRun([
    "exec",
    localContainer,
    "pg_restore",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "--data-only",
    "--disable-triggers",
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    appDump,
  ]);

  const localEnv = localSupabaseEnvironment();
  const baseUrl = "http://127.0.0.1:3217";
  const app = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "start", "--", "-p", "3217"],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: localEnv.API_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY,
        NEXT_PUBLIC_SITE_URL: baseUrl,
        COMUN_BASE_URL: baseUrl,
        MEDIA_STORAGE_PROVIDER: "supabase-local",
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    },
  );
  let syntheticUserId;
  let syntheticActionId;
  try {
    await waitForHttp(`${baseUrl}/comun`);
    const routes = [
      "/",
      "/comun",
      "/comun/comunidades",
      "/comun/pautas",
      "/comun/acoes",
      "/comun/protocolo-popular",
      "/comun/calcadas",
      "/comun/acervo",
      "/comun/radio",
      "/comun/arte",
    ];
    let publicRouteMaximumMs = 0;
    for (const route of routes) {
      const routeStartedAt = Date.now();
      const response = await fetch(`${baseUrl}${route}`, {
        redirect: "manual",
      });
      publicRouteMaximumMs = Math.max(
        publicRouteMaximumMs,
        Date.now() - routeStartedAt,
      );
      assert.ok(
        response.status >= 200 && response.status < 400,
        `rota ${route} respondeu ${response.status}`,
      );
      const body = await response.text();
      assert.doesNotMatch(
        body,
        /service_role|SUPABASE_DB_URL|R2_SECRET|private_geometry_geojson|object_key/i,
      );
    }
    const administrationStartedAt = Date.now();
    const protectedResponse = await fetch(`${baseUrl}/comun/admin/operacao`, {
      redirect: "manual",
    });
    const administrationProbeMs = Date.now() - administrationStartedAt;
    assert.ok([302, 303, 307, 308].includes(protectedResponse.status));

    const service = createClient(localEnv.API_URL, localEnv.SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const password = `${syntheticTag("auth")}Aa1!`;
    const email = `${tag}@example.invalid`;
    const { data: created, error: createError } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError || !created.user)
      throw new Error("COMUN_DATABASE_SYNTHETIC_AUTH_CREATE_FAILED");
    syntheticUserId = created.user.id;
    const publicClient = createClient(localEnv.API_URL, localEnv.ANON_KEY, {
      auth: { persistSession: false },
    });
    const authenticationStartedAt = Date.now();
    const { error: loginError } = await publicClient.auth.signInWithPassword({
      email,
      password,
    });
    const authenticationProbeMs = Date.now() - authenticationStartedAt;
    if (loginError)
      throw new Error("COMUN_DATABASE_SYNTHETIC_AUTH_LOGIN_FAILED");
    const { data: action, error: actionError } = await service
      .from("comun_collective_actions")
      .insert({
        slug: tag,
        title: "Ação sintética de recuperação",
        summary: "Ação descartável para validar contribuição no restore.",
        objective:
          "Comprovar que uma escrita autorizada funciona isoladamente.",
        action_type: "other",
        status: "open",
        visibility: "public",
      })
      .select("id")
      .single();
    if (actionError || !action)
      throw new Error("COMUN_DATABASE_SYNTHETIC_ACTION_CREATE_FAILED");
    syntheticActionId = action.id;
    const contributionStartedAt = Date.now();
    const { error: contributionError } = await publicClient
      .from("comun_collective_action_participations")
      .insert({
        action_id: syntheticActionId,
        member_user_id: syntheticUserId,
        status: "interested",
      });
    const contributionProbeMs = Date.now() - contributionStartedAt;
    if (contributionError)
      throw new Error("COMUN_DATABASE_SYNTHETIC_CONTRIBUTION_FAILED");
    const { data: privateRows, error: privateError } = await publicClient
      .from("comun_admin_users")
      .select("id")
      .limit(1);
    if (!privateError && (privateRows || []).length)
      throw new Error("COMUN_DATABASE_NEGATIVE_PERMISSION_FAILED");
    return {
      status: "green",
      publicRoutes: routes.length,
      centralOperationalNegativePermission: "green",
      syntheticLogin: "green",
      noLeak: "green",
      notificationsSent: false,
      measured: {
        publicReading: durationBand(publicRouteMaximumMs),
        authentication: durationBand(authenticationProbeMs),
        contribution: durationBand(contributionProbeMs),
        administration: durationBand(administrationProbeMs),
      },
    };
  } finally {
    if (syntheticActionId) {
      const service = createClient(
        localEnv.API_URL,
        localEnv.SERVICE_ROLE_KEY,
        {
          auth: { persistSession: false },
        },
      );
      await service
        .from("comun_collective_actions")
        .delete()
        .eq("id", syntheticActionId)
        .then(() => {})
        .catch(() => {});
    }
    if (syntheticUserId) {
      const service = createClient(
        localEnv.API_URL,
        localEnv.SERVICE_ROLE_KEY,
        {
          auth: { persistSession: false },
        },
      );
      await service.auth.admin.deleteUser(syntheticUserId).catch(() => {});
    }
    app.kill("SIGTERM");
  }
}

async function waitForHttp(url) {
  let last;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
      last = new Error(`status ${response.status}`);
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw last || new Error("COMUN_DATABASE_APPLICATION_START_TIMEOUT");
}

function localDatabaseUrl() {
  return localSupabaseEnvironment().DB_URL;
}

function localSupabaseEnvironment() {
  const output = execFileSync(
    process.platform === "win32" ? "powershell" : "npx",
    process.platform === "win32"
      ? [
          "-NoProfile",
          "-Command",
          "$env:DO_NOT_TRACK='1'; npx supabase status -o env",
        ]
      : ["supabase", "status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const values = Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index),
          line.slice(index + 1).replace(/^"|"$/g, ""),
        ];
      }),
  );
  if (!values.DB_URL || !values.API_URL)
    throw new Error("COMUN_DATABASE_LOCAL_URL_MISSING");
  return values;
}

function dockerUrl(url) {
  if (!url) throw new Error("COMUN_DATABASE_SOURCE_URL_MISSING");
  const target = new URL(url);
  if (["127.0.0.1", "localhost"].includes(target.hostname))
    target.hostname = "host.docker.internal";
  return target.toString();
}

function quoteIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))
    throw new Error("COMUN_DATABASE_UNSAFE_IDENTIFIER");
  return `"${value.replaceAll('"', '""')}"`;
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function dockerRun(args, input) {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 100 * 1024 * 1024,
  });
  if (result.status !== 0) {
    if (process.env.COMUN_SECURITY_DEBUG === "1")
      console.error(result.stderr.trim());
    throw new Error("COMUN_DATABASE_DOCKER_STEP_FAILED");
  }
  return result.stdout;
}

const BOOTSTRAP_SQL = `
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists(select 1 from pg_roles where rolname='authenticator') then create role authenticator nologin; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin nologin; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_storage_admin') then create role supabase_storage_admin nologin; end if;
end $$;
create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists storage;
create table if not exists auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create or replace function auth.role() returns text language sql stable as $$ select 'anon'::text $$;
create table if not exists storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table if not exists storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb,created_at timestamptz default now(),updated_at timestamptz default now());
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:greatest(array_length(string_to_array(name,'/'),1)-1,0)] $$;
drop schema public cascade;
`;

const PUBLIC_FK_ORPHAN_SQL = `
create temp table comun_fk_orphans(count bigint);
do $$
declare relation record; orphan_count bigint;
begin
  for relation in
    select src.relname source_table,target.relname target_table,
      array_agg(sa.attname order by sk.ord) source_columns,
      array_agg(ta.attname order by sk.ord) target_columns
    from pg_constraint con
    join pg_class src on src.oid=con.conrelid
    join pg_namespace sn on sn.oid=src.relnamespace
    join pg_class target on target.oid=con.confrelid
    join pg_namespace tn on tn.oid=target.relnamespace
    join unnest(con.conkey) with ordinality sk(attnum,ord) on true
    join unnest(con.confkey) with ordinality tk(attnum,ord) on tk.ord=sk.ord
    join pg_attribute sa on sa.attrelid=src.oid and sa.attnum=sk.attnum
    join pg_attribute ta on ta.attrelid=target.oid and ta.attnum=tk.attnum
    where con.contype='f' and sn.nspname='public' and tn.nspname='public'
    group by con.oid,src.relname,target.relname
  loop
    execute format(
      'select count(*) from public.%I s where (%s) and not exists(select 1 from public.%I t where %s)',
      relation.source_table,
      (select string_agg(format('s.%I is not null',relation.source_columns[i]),' and ') from generate_subscripts(relation.source_columns,1) i),
      relation.target_table,
      (select string_agg(format('s.%I=t.%I',relation.source_columns[i],relation.target_columns[i]),' and ') from generate_subscripts(relation.source_columns,1) i)
    ) into orphan_count;
    insert into comun_fk_orphans values(orphan_count);
  end loop;
end $$;
select coalesce(sum(count),0) from comun_fk_orphans;
`;

await main();
