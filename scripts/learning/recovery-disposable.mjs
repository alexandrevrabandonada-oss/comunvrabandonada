// Synthetic-only recovery experiment. No remote connection or real backup adapter.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const image =
  "docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function externalDestination(dir, repo = process.cwd()) {
  assert.ok(isAbsolute(dir), "RECOVERY_ABSOLUTE_DESTINATION_REQUIRED");
  const rel = relative(resolve(repo), resolve(dir));
  assert.ok(
    rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel),
    "RECOVERY_DESTINATION_MUST_BE_OUTSIDE_GIT",
  );
  return resolve(dir);
}
export function owned(info, run) {
  assert.equal(
    info.Config.Labels?.["comun.recovery.synthetic"],
    run,
    "RECOVERY_CONTAINER_NOT_OWNED",
  );
  assert.equal(info.Config.Image, image, "RECOVERY_IMAGE_DRIFT");
  assert.equal(
    info.HostConfig.NetworkMode,
    "none",
    "RECOVERY_NETWORK_NOT_ISOLATED",
  );
}
export function requireEmptyTarget(tableCount) {
  assert.equal(tableCount, 0, "RECOVERY_NONEMPTY_TARGET_REFUSED");
}
export function localeOptions(settings) {
  assert.ok(
    ["c", "i"].includes(settings.provider),
    "RECOVERY_UNSUPPORTED_LOCALE_PROVIDER",
  );
  const args = [
    "--encoding",
    settings.encoding,
    "--lc-collate",
    settings.collate,
    "--lc-ctype",
    settings.ctype,
  ];
  if (settings.provider === "i") {
    assert.ok(
      typeof settings.locale === "string" && settings.locale.length > 0,
      "RECOVERY_ICU_LOCALE_REQUIRED",
    );
    args.push("--locale-provider=icu", "--icu-locale", settings.locale);
  } else args.push("--locale-provider=libc");
  return args;
}
export function seal(bytes, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  return Buffer.concat([
    nonce,
    cipher.update(bytes),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
}
export function unseal(bytes, key) {
  assert.ok(bytes.length >= 28, "RECOVERY_ENVELOPE_TRUNCATED");
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([
    decipher.update(bytes.subarray(12, -16)),
    decipher.final(),
  ]);
}
function dpapi(bytes, operation) {
  assert.equal(
    process.platform,
    "win32",
    "RECOVERY_LAB_REQUIRES_WINDOWS_DPAPI",
  );
  const cmd = `Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $r=[Security.Cryptography.ProtectedData]::${operation}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($r))`;
  return Buffer.from(
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", cmd],
      { input: bytes.toString("base64"), encoding: "utf8" },
    ).trim(),
    "base64",
  );
}
export const normalizeDump = (s) =>
  s
    .toString()
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\\(?:un)?restrict /.test(line))
    // These are sets: pg_dump orders policy roles and default ACL statements by
    // cluster OID. A roles-only restore assigns new OIDs, without changing grants.
    .map((line) =>
      line.startsWith("CREATE POLICY ")
        ? line.replace(
            / FOR (?:ALL|SELECT|INSERT|UPDATE|DELETE) TO (.*?) (?=USING|WITH CHECK)/,
            (match, roles) =>
              match.replace(roles, roles.split(", ").sort().join(", ")),
          )
        : line,
    )
    .join("\n")
    .replace(
      /(?:^ALTER DEFAULT PRIVILEGES[^\n]*\n(?:\n)?)+/gm,
      (block) => block.split("\n").filter(Boolean).sort().join("\n") + "\n\n",
    );
const quote = (s) => '"' + s.replaceAll('"', '""') + '"';

export async function runRecovery(output) {
  assert.ok(
    !process.env.SUPABASE_DB_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "RECOVERY_PRODUCTION_ENV_FORBIDDEN",
  );
  const dir = externalDestination(output);
  const run = `school-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const root = resolve(dir, run);
  mkdirSync(root, { recursive: true });
  const names = [
    `comun-recovery-source-${run}`,
    `comun-recovery-target-${run}`,
  ];
  const created = new Set();
  const started = Date.now();
  const docker = (args, input) =>
    execFileSync("docker", args, {
      input,
      maxBuffer: 128 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
  const check = (name) => {
    assert.ok(created.has(name));
    owned(JSON.parse(docker(["inspect", name]))[0], run);
  };
  const exec = (name, args, input) => {
    check(name);
    return docker(
      ["exec", "-i", "-e", "PGPASSWORD=postgres", name, ...args],
      input,
    );
  };
  const sql = (name, query, target = false) =>
    exec(
      name,
      [
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
        ...(target
          ? [
              "-h",
              "/tmp/recovery-socket",
              "-p",
              "55440",
              "-U",
              "supabase_admin",
              "-d",
              "recovery_target",
            ]
          : ["-U", "supabase_admin", "-d", "recovery_source"]),
      ],
      query,
    );
  const record = {
    status: "FAIL",
    run,
    baseSha: dockerVersionGit(),
    harnessSha256: sha(readFileSync(new URL(import.meta.url))),
    image,
    syntheticOnly: true,
    productionReads: 0,
    productionWrites: 0,
  };
  function dockerVersionGit() {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  }
  const remove = (name) => {
    check(name);
    docker(["rm", "-f", name]);
    created.delete(name);
  };
  try {
    for (const name of names) {
      assert.equal(
        docker([
          "ps",
          "-a",
          "--filter",
          `name=^/${name}$`,
          "--format",
          "{{.Names}}",
        ])
          .toString()
          .trim(),
        "",
      );
      docker([
        "run",
        "-d",
        "--network",
        "none",
        "--label",
        `comun.recovery.synthetic=${run}`,
        "--name",
        name,
        "-e",
        "POSTGRES_PASSWORD=postgres",
        image,
      ]);
      created.add(name);
      let ready = false;
      for (let n = 0; n < 90; n++) {
        check(name);
        const r = spawnSync("docker", [
          "exec",
          name,
          "pg_isready",
          "-U",
          "supabase_admin",
        ]);
        if (
          r.status === 0 &&
          docker(["logs", name])
            .toString()
            .includes("PostgreSQL init process complete")
        ) {
          ready = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert.ok(ready, "RECOVERY_DATABASE_START_TIMEOUT");
    }
    const [source, target] = names;
    console.log("RECOVERY_SYNTHETIC_BOOTSTRAP");
    exec(source, [
      "createdb",
      "-U",
      "supabase_admin",
      "-O",
      "postgres",
      "recovery_source",
    ]);
    for (const file of [
      "post-schema.sql",
      "technical-ledger.sql",
      "synthetic-buckets.sql",
      "restore-expression.sql",
    ]) {
      sql(source, readFileSync(`tests/fixtures/pr437-post/${file}`));
    }
    // The historical fixture contains a BETWEEN-generated nested AND node.
    // Construct the synthetic source with PostgreSQL's own roundtrip SQL before
    // taking any baseline. This is not a change to a migration or expectation.
    sql(
      source,
      `do $$ declare definition text; begin
      select pg_get_constraintdef(oid) into strict definition from pg_constraint
      where conrelid='public.comun_solidarity_offers'::regclass and conname='comun_solidarity_offers_modalities_check';
      alter table public.comun_solidarity_offers drop constraint comun_solidarity_offers_modalities_check;
      execute 'alter table public.comun_solidarity_offers add constraint comun_solidarity_offers_modalities_check ' || definition;
    end $$;`,
    );
    record.syntheticFixtureExpressionReparsedBeforeBaseline = true;
    // Reviewed School bytes only; no remote migration path.
    const migration = readFileSync(
      "supabase/migrations/20261006134804_comun_learning_r0.sql",
    );
    assert.equal(
      sha(migration),
      "5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7",
    );
    sql(source, migration);
    sql(
      source,
      `begin;
      insert into supabase_migrations.schema_migrations(version) values('20261006134804');
      insert into public.comun_schema_releases(release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status)
      values('synthetic-recovery-school','synthetic-only','${sha(migration)}',repeat('a',64),repeat('b',64),'applied');
      insert into auth.users(id,email) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a@recovery.invalid'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b@recovery.invalid');
      set local role service_role;
      select public.comun_learning_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',(select id from public.comun_learning_units where unit_type='mission' order by id limit 1),0,'continue');
      select public.comun_learning_event('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',(select id from public.comun_learning_units where unit_type='mission' order by id limit 1),0,'continue');
      reset role;
      create role recovery_custom nologin;
      grant authenticated to recovery_custom;
      create table private.recovery_documents(id uuid primary key,owner_id uuid references auth.users(id),body text);
      create table private.recovery_audit(id uuid primary key);
      create function private.recovery_audit_insert() returns trigger language plpgsql security definer set search_path=pg_catalog as $$ begin insert into private.recovery_audit values(new.id); return new; end $$;
      revoke all on function private.recovery_audit_insert() from public,anon,authenticated;
      create trigger recovery_audit_insert after insert on private.recovery_documents for each row execute function private.recovery_audit_insert();
      alter table private.recovery_documents enable row level security;
      alter table private.recovery_documents force row level security;
      grant usage on schema private to authenticated;
      grant select on private.recovery_documents to authenticated;
      create policy recovery_owner on private.recovery_documents for select to authenticated using(owner_id=(select auth.uid()));
      insert into private.recovery_documents values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SYNTHETIC_A'),('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','SYNTHETIC_B');
      insert into storage.buckets(id,name,public) values('recovery-private','recovery-private',false);
      insert into storage.objects(bucket_id,name,owner) values('recovery-private','synthetic.txt','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      grant usage on schema storage to authenticated;
      grant select on storage.objects to authenticated;
      create policy recovery_storage_owner on storage.objects for select to authenticated using(bucket_id='recovery-private' and owner=(select auth.uid()));
      commit;`,
    );
    const asset = Buffer.from("SYNTHETIC STORAGE FILE — NOT PRODUCTION\n");
    exec(
      source,
      [
        "sh",
        "-c",
        "mkdir -p /tmp/recovery-assets && cat > /tmp/recovery-assets/synthetic.txt",
      ],
      asset,
    );
    const dumpArgs = ["-U", "supabase_admin", "-d", "recovery_source"];
    const databaseSettings = (name, targetMode = false) =>
      JSON.parse(
        sql(
          name,
          `select json_build_object('encoding',pg_encoding_to_char(encoding),'collate',datcollate,'ctype',datctype,'provider',datlocprovider,'locale',coalesce(to_jsonb(d)->>'datlocale',to_jsonb(d)->>'daticulocale')) from pg_database d where datname=current_database();`,
          targetMode,
        ),
      );
    const sourceDatabaseSettings = databaseSettings(source);
    const targetLocaleOptions = localeOptions(sourceDatabaseSettings);
    record.databaseSettings = sourceDatabaseSettings;
    const snapshot = (name, targetMode = false) => {
      const args = targetMode
        ? [
            "-h",
            "/tmp/recovery-socket",
            "-p",
            "55440",
            "-U",
            "supabase_admin",
            "-d",
            "recovery_target",
          ]
        : dumpArgs;
      const rawSchema = exec(name, [
        "pg_dump",
        ...args,
        "--schema-only",
        "--no-tablespaces",
      ]);
      const schemaText = normalizeDump(rawSchema);
      record[targetMode ? "restoredRawSchemaSha256" : "sourceRawSchemaSha256"] =
        sha(rawSchema);
      const schema = sha(schemaText);
      const tables = JSON.parse(
        sql(
          name,
          `select coalesce(json_agg(json_build_array(schemaname,tablename) order by schemaname,tablename),'[]') from pg_catalog.pg_tables where schemaname not in ('pg_catalog','information_schema') and schemaname not like 'pg_%';`,
          targetMode,
        ),
      );
      const queries = tables.map(
        ([schemaName, table]) =>
          `select '${schemaName.replaceAll("'", "''")}.${table.replaceAll("'", "''")}' as name,coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text collate "C"),'[]') as contents from ${quote(schemaName)}.${quote(table)} t`,
      );
      const rows = JSON.parse(
        sql(
          name,
          `select jsonb_object_agg(name,contents) from (${queries.join(" union all ")}) recovered;`,
          targetMode,
        ),
      );
      const data = Object.fromEntries(
        Object.keys(rows)
          .sort()
          .map((name) => [name, sha(JSON.stringify(rows[name]))]),
      );
      // Private lab diagnostics contain exclusively the synthetic fixture.
      // Never upload these files or use this harness with a real database.
      const side = targetMode ? "restored" : "source";
      writeFileSync(resolve(root, `${side}-schema-raw.sql`), rawSchema);
      writeFileSync(resolve(root, `${side}-schema.sql`), schemaText);
      writeFileSync(
        resolve(root, `${side}-units.json`),
        JSON.stringify(rows["public.comun_learning_units"], null, 2),
      );
      const roles = sha(
        sql(
          name,
          `select jsonb_agg(to_jsonb(t) order by rolname) from (select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolconnlimit,rolvaliduntil,rolbypassrls,rolconfig from pg_roles) t;`,
          targetMode,
        ),
      );
      const members = sha(
        sql(
          name,
          `select coalesce(jsonb_agg(to_jsonb(t) order by role,member),'[]') from (select pg_get_userbyid(roleid) as role,pg_get_userbyid(member) as member,pg_get_userbyid(grantor) as grantor,admin_option,inherit_option,set_option from pg_auth_members) t;`,
          targetMode,
        ),
      );
      return { schema, data, roles, members, tables: tables.length };
    };
    const deniedRpc = (name, targetMode) => {
      for (const role of ["anon", "authenticated"]) {
        let rpcDenied = false;
        try {
          sql(
            name,
            `begin; set local role ${role}; select public.comun_learning_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','synthetic',0,'continue'); rollback;`,
            targetMode,
          );
        } catch (error) {
          assert.match(
            error.stderr.toString(),
            /permission denied for function comun_learning_event/,
          );
          rpcDenied = true;
        }
        assert.ok(rpcDenied, "RECOVERY_DIRECT_RPC_NOT_DENIED");
      }
    };
    const access = (name, targetMode = false) => {
      for (const [actor, id] of [
        ["A", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
        ["B", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
      ]) {
        const r = sql(
          name,
          `begin read only; set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true); select json_build_array((select count(*) from public.comun_learning_progress),(select count(*) from private.recovery_documents),(select count(*) from storage.objects where bucket_id='recovery-private')); rollback;`,
          targetMode,
        )
          .toString()
          .split(/\r?\n/)
          .find((line) => line.startsWith("["));
        assert.deepEqual(JSON.parse(r), [1, 1, actor === "A" ? 1 : 0]);
      }
      assert.equal(
        sql(name, "select count(*) from private.recovery_audit;", targetMode)
          .toString()
          .trim(),
        "2",
      );
      assert.equal(
        sql(
          name,
          `select has_function_privilege('anon','public.comun_learning_event(uuid,text,integer,text,integer)','execute') or has_function_privilege('authenticated','public.comun_learning_event(uuid,text,integer,text,integer)','execute');`,
          targetMode,
        )
          .toString()
          .trim(),
        "f",
      );
      let denied = false;
      try {
        sql(
          name,
          `begin read only; set local role anon; select count(*) from public.comun_learning_progress; rollback;`,
          targetMode,
        );
      } catch (error) {
        assert.match(
          error.stderr.toString(),
          /permission denied for table comun_learning_progress/,
        );
        denied = true;
      }
      assert.ok(denied, "RECOVERY_ANON_PRIVATE_READ_NOT_DENIED");
      let writeDenied = false;
      try {
        sql(
          name,
          "begin; set local role authenticated; delete from public.comun_learning_progress; rollback;",
          targetMode,
        );
      } catch (error) {
        assert.match(
          error.stderr.toString(),
          /permission denied for table comun_learning_progress/,
        );
        writeDenied = true;
      }
      assert.ok(writeDenied, "RECOVERY_DIRECT_WRITE_NOT_DENIED");
      sql(
        name,
        `begin; insert into private.recovery_documents values('cccccccc-1111-4111-8111-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SYNTHETIC_TRIGGER'); do $$ begin if (select count(*) from private.recovery_audit)<>3 then raise exception 'RECOVERY_TRIGGER_NOT_FIRED'; end if; end $$; rollback;`,
        targetMode,
      );
      sql(
        name,
        `begin; set local role service_role; select public.comun_learning_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',(select id from public.comun_learning_units where unit_type='mission' order by id limit 1),1,'answer',0); rollback;`,
        targetMode,
      );
    };
    record.phase = "SOURCE_ACCESS_AND_SNAPSHOT";
    access(source);
    const before = snapshot(source);
    record.phase = "CAPTURE";
    console.log("RECOVERY_CAPTURE_ENCRYPTED_SYNTHETIC_ONLY");
    const bytes = {
      database: exec(source, [
        "env",
        "PGOPTIONS=-c default_transaction_read_only=on",
        "pg_dump",
        ...dumpArgs,
        "-Fc",
        "--no-tablespaces",
      ]),
      roles: exec(source, [
        "env",
        "PGOPTIONS=-c default_transaction_read_only=on",
        "pg_dumpall",
        "-U",
        "supabase_admin",
        "--roles-only",
        "--no-role-passwords",
      ]),
      storage: exec(source, ["cat", "/tmp/recovery-assets/synthetic.txt"]),
    };
    const key = randomBytes(32);
    writeFileSync(resolve(root, "key.dpapi"), dpapi(key, "Protect"));
    record.backupHashes = {};
    for (const [kind, buffer] of Object.entries(bytes)) {
      const envelope = seal(buffer, key);
      writeFileSync(resolve(root, kind + ".gcm"), envelope);
      record.backupHashes[kind] = {
        plaintextSha256: sha(buffer),
        ciphertextSha256: sha(envelope),
        bytes: buffer.length,
      };
    }
    const bad = Buffer.from(readFileSync(resolve(root, "database.gcm")));
    bad[15] ^= 1;
    assert.throws(() => unseal(bad, key));
    record.tamperRejected = true;
    for (const buffer of Object.values(bytes)) buffer.fill(0);
    key.fill(0);
    remove(source);
    record.sourceDestroyedBeforeRestore = true;
    // Reopen durable files and DPAPI key from disk after source destruction.
    const recoveredKey = dpapi(
      readFileSync(resolve(root, "key.dpapi")),
      "Unprotect",
    );
    const restored = {};
    for (const kind of Object.keys(bytes)) {
      const envelope = readFileSync(resolve(root, kind + ".gcm"));
      assert.equal(sha(envelope), record.backupHashes[kind].ciphertextSha256);
      restored[kind] = unseal(envelope, recoveredKey);
      assert.equal(
        sha(restored[kind]),
        record.backupHashes[kind].plaintextSha256,
      );
    }
    recoveredKey.fill(0);
    record.phase = "RESTORE";
    // Separate empty cluster: platform role creation cannot be silently skipped.
    check(target);
    docker([
      "exec",
      "-u",
      "postgres",
      target,
      "sh",
      "-c",
      "mkdir -p /tmp/recovery-socket; initdb -D /tmp/recovery-clean -U supabase_admin --auth-local=trust --auth-host=reject >/tmp/recovery-init.log && pg_ctl -D /tmp/recovery-clean -l /tmp/recovery-clean.log -o \"-k /tmp/recovery-socket -p 55440 -c listen_addresses=''\" -w start",
    ]);
    exec(target, [
      "createdb",
      "-h",
      "/tmp/recovery-socket",
      "-p",
      "55440",
      "-U",
      "supabase_admin",
      "-T",
      "template0",
      ...targetLocaleOptions,
      "recovery_target",
    ]);
    const targetTableCount = () =>
      Number(
        sql(
          target,
          "select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema');",
          true,
        ),
      );
    requireEmptyTarget(targetTableCount());
    exec(target, ["sh", "-c", "cat > /tmp/recovery.dump"], restored.database);
    let missingRoles = false;
    try {
      exec(target, [
        "pg_restore",
        "-h",
        "/tmp/recovery-socket",
        "-p",
        "55440",
        "-U",
        "supabase_admin",
        "-d",
        "recovery_target",
        "--single-transaction",
        "--exit-on-error",
        "/tmp/recovery.dump",
      ]);
    } catch (error) {
      assert.match(error.stderr.toString(), /role "[^"]+" does not exist/);
      missingRoles = true;
    }
    assert.ok(missingRoles, "RECOVERY_MISSING_ROLE_CONTROL_FAILED");
    assert.equal(
      sql(
        target,
        "select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema');",
        true,
      )
        .toString()
        .trim(),
      "0",
    );
    record.missingRolesRejectedAtomically = true;
    assert.equal(
      sql(target, "select rolname from pg_roles where oid=10;", true)
        .toString()
        .trim(),
      "supabase_admin",
    );
    const globals = restored.roles.toString();
    assert.equal(
      globals.split(/\r?\n/).filter((l) => l === "CREATE ROLE supabase_admin;")
        .length,
      1,
    );
    // Only bootstrap creation is already done by initdb; its ALTER and all grants remain.
    sql(
      target,
      "begin;\n" +
        globals.replace(/^CREATE ROLE supabase_admin;\r?$/m, "") +
        "\ncommit;",
      true,
    );
    record.bootstrapRoleIdentityMatched = true;
    console.log("RECOVERY_RESTORE_NEW_EMPTY_CLUSTER");
    exec(target, [
      "pg_restore",
      "-h",
      "/tmp/recovery-socket",
      "-p",
      "55440",
      "-U",
      "supabase_admin",
      "-d",
      "recovery_target",
      "--single-transaction",
      "--exit-on-error",
      "/tmp/recovery.dump",
    ]);
    const after = snapshot(target, true);
    assert.deepEqual(
      databaseSettings(target, true),
      sourceDatabaseSettings,
      "RECOVERY_DATABASE_LOCALE_DRIFT",
    );
    assert.ok(
      JSON.stringify(after) === JSON.stringify(before),
      "RECOVERY_CATALOG_DATA_ROLES_DRIFT",
    );
    access(target, true);
    const missingAsset = spawnSync("docker", [
      "exec",
      target,
      "test",
      "-f",
      "/tmp/recovery-assets/synthetic.txt",
    ]);
    assert.equal(missingAsset.status, 1);
    record.databaseDumpDoesNotRestoreStorageFiles = true;
    exec(
      target,
      [
        "sh",
        "-c",
        "mkdir -p /tmp/recovery-assets && cat > /tmp/recovery-assets/synthetic.txt",
      ],
      restored.storage,
    );
    assert.equal(
      sha(exec(target, ["cat", "/tmp/recovery-assets/synthetic.txt"])),
      sha(asset),
    );
    assert.ok(after.tables > 100);
    assert.throws(
      () => requireEmptyTarget(targetTableCount()),
      /RECOVERY_NONEMPTY_TARGET_REFUSED/,
    );
    record.nonemptyTargetRefused = true;
    Object.assign(record, {
      status: "SYNTHETIC_DB_RESTORE_PROVED_RELEASE_BLOCKED",
      databaseRestore: "PASS",
      sourceDirectRpc: "NOT_RUN_IN_RESTORE_PHASE",
      postgresVersion: exec(target, ["pg_dump", "--version"]).toString().trim(),
      tablesCompared: after.tables,
      catalogSha256: after.schema,
      dataManifestSha256: sha(JSON.stringify(after.data)),
      rolesSha256: after.roles,
      membersSha256: after.members,
      ownerIsolation: true,
      directRpcGrantsDenied: true,
      triggerRestored: true,
      historyLedgerIncluded: true,
      storageBytesRestoredSeparately: true,
      elapsedSeconds: Math.ceil((Date.now() - started) / 1000),
      authLoginService: "NOT_RUN",
      storageApiService: "NOT_RUN",
      realProjectRestore:
        "BLOCKED_NO_DATA_COPY_AUTHORIZATION_OR_APPROVED_DESTINATION",
      vaultKeyRecovery: "NOT_RUN",
      offsiteAndKeyEscrow: "NOT_RUN",
    });
    try {
      deniedRpc(target, true);
      record.restoredDirectRpc = "PASS";
      record.status = "SYNTHETIC_DB_RESTORE_PROVED_REAL_RELEASE_UNPROVEN";
    } catch (error) {
      record.restoredDirectRpc = "FAIL";
      record.runtimeFailure = String(
        error.actual ?? error.stderr ?? error.message,
      ).split("\n")[0];
    }
    writeFileSync(
      resolve(root, "proof.json"),
      JSON.stringify(record, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({ proof: resolve(root, "proof.json"), ...record }),
    );
    return record;
  } finally {
    for (const name of created) {
      check(name);
      const logs = spawnSync("docker", ["logs", name], {
        maxBuffer: 16 * 1024 * 1024,
      });
      writeFileSync(
        resolve(root, name + ".log"),
        Buffer.concat([
          logs.stdout ?? Buffer.alloc(0),
          logs.stderr ?? Buffer.alloc(0),
        ]),
      );
    }
    if (created.has(names[1])) {
      check(names[1]);
      const log = spawnSync("docker", [
        "exec",
        names[1],
        "cat",
        "/tmp/recovery-clean.log",
      ]);
      if (log.status === 0)
        writeFileSync(resolve(root, "restored-postgres.log"), log.stdout);
    }
    for (const name of created) remove(name);
    record.ownedContainersRemaining = created.size;
    writeFileSync(
      resolve(root, "proof.json"),
      JSON.stringify(record, null, 2) + "\n",
    );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = await runRecovery(process.argv[2]);
  if (result.status.includes("BLOCKED")) process.exitCode = 1;
}
