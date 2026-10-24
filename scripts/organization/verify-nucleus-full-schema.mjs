/** Structural candidate compatibility only, in the hosted CI's freshly reset DB.
 * Never accepts a remote connection, applies product migrations, or proves Auth.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { readSupabaseLocalEnv } from "../ci/read-supabase-local-env.mjs";

export function assertHostedLab(env, cwd) {
  assert.equal(env.GITHUB_ACTIONS, "true");
  assert.equal(env.RUNNER_ENVIRONMENT, "github-hosted");
  assert(env.GITHUB_WORKSPACE);
  assert.equal(path.resolve(env.GITHUB_WORKSPACE || ""), path.resolve(cwd));
  assert.match(env.EXPECTED_SHA || "", /^[a-f0-9]{40}$/);
}

export function assertLocalDatabase(raw) {
  const url = new URL(raw);
  assert.equal(url.protocol, "postgresql:");
  assert(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.port, "55432");
  assert.equal(url.username, "postgres");
  assert.equal(url.pathname, "/postgres");
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
}

async function main() {
  assert(process.argv.includes("--run-disposable-ci"));
  assertHostedLab(process.env, process.cwd());
  const output = process.argv[process.argv.indexOf("--output") + 1];
  assert(process.argv.includes("--output") && output);
  const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const head = process.env.EXPECTED_SHA;
  const candidate = "docs/proposals/m7c/nucleus-candidate.sql";
  const script = "scripts/organization/verify-nucleus-full-schema.mjs";
  const files = (await fs.readdir("supabase/migrations"))
    .filter((name) => /^\d{12}(?:\d{2})?_.+\.sql$/.test(name))
    .sort();
  const expectedFiles = git([
    "ls-tree",
    "--name-only",
    head,
    "supabase/migrations/",
  ])
    .split("\n")
    .filter((name) => name.endsWith(".sql"))
    .map((name) => path.basename(name))
    .sort();
  assert.deepEqual(files, expectedFiles);
  const fingerprint = createHash("sha256");
  for (const file of [
    ...files.map((name) => "supabase/migrations/" + name),
    candidate,
    script,
    "scripts/organization/rehearse-full-schema-auth.mjs",
    "scripts/organization/full-schema-task-cycle.mjs",
    "scripts/organization/full-schema-next-ban.mjs",
    "scripts/organization/full-schema-legacy-rls.mjs",
    "docs/proposals/m7c/legacy-session-rls-candidate.sql",
    "components/comun-app-shell.tsx",
    "components/comun-shell.tsx",
    "lib/community-auth.ts",
    "lib/community-mesa.ts",
    "lib/supabase/server.ts",
    "lib/supabase/private-fetch.ts",
    "lib/supabase/middleware.ts",
    "app/comun/c/[slug]/mesa/page.tsx",
    "app/comun/c/[slug]/participar/page.tsx",
    "app/comun/c/[slug]/participar/actions.ts",
    "app/comun/minha-participacao/page.tsx",
    "components/community-participation-onboarding.tsx",
    "lib/community-membership.ts",
    "proxy.ts",
    "public/sw.js",
    "scripts/organization/nucleus-disposable-domain.mjs",
    "lib/community-nucleus-contract.ts",
  ]) {
    const bytes = await fs.readFile(file);
    assert(bytes.equals(execFileSync("git", ["show", `${head}:${file}`])));
    fingerprint.update(file + "\0").update(bytes);
  }
  const label = execFileSync(
    "docker",
    [
      "inspect",
      "supabase_db_COMUM_VR_ABANDONADA",
      "--format",
      '{{index .Config.Labels "com.supabase.cli.project"}}',
    ],
    { encoding: "utf8" },
  ).trim();
  assert.equal(label, "COMUM_VR_ABANDONADA");
  const status = readSupabaseLocalEnv();
  assert(status.ok, "Disposable local status unavailable");
  const local = Object.fromEntries(
    status.output
      .split(/\r?\n/)
      .filter((line) => line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")];
      }),
  );
  const url = local.DB_URL;
  assertLocalDatabase(url);
  const report = {
    headSha: head,
    checkoutSha: git(["rev-parse", "HEAD"]),
    inputFingerprint: fingerprint.digest("hex"),
    proofKind: "FULL_RESET_SCHEMA_CANDIDATE_DDL_NOT_AUTH_OR_HUMAN_ACCEPTANCE",
    migrationCount: files.length,
    result: "FAIL",
    stage: "connect",
    cleanupAbsent: false,
  };
  const client = new pg.Client({ connectionString: url });
  let owned = false;
  try {
    await client.connect();
    assert(
      (await client.query("select pg_try_advisory_lock(621007, 7) as held"))
        .rows[0].held,
    );
    report.stage = "migration-history";
    const versions = (
      await client.query(
        "select version from supabase_migrations.schema_migrations order by version",
      )
    ).rows.map((r) => r.version);
    assert.deepEqual(
      versions,
      files.map((file) => file.split("_")[0]),
    );
    assert(
      (
        await client.query(
          "select to_regnamespace('comun_org_private') is null as absent",
        )
      ).rows[0].absent,
    );
    owned = true;
    report.stage = "candidate-ddl";
    await client.query(await fs.readFile(candidate, "utf8"));
    report.stage = "candidate-catalog";
    const tables = (
      await client.query(
        "select count(*)::int as n,bool_and(c.relrowsecurity and c.relforcerowsecurity) as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='comun_org_private' and c.relkind='r'",
      )
    ).rows[0];
    assert.deepEqual(tables, { n: 10, rls: true });
    assert(
      (
        await client.query(
          "select bool_and(convalidated) as valid from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='comun_org_private'",
        )
      ).rows[0].valid,
    );
    if (process.argv.includes("--with-auth-cycle")) {
      report.stage = "full-schema-auth-cycle";
      const { rehearseFullSchemaAuth } =
        await import("./rehearse-full-schema-auth.mjs");
      report.authCycle = await rehearseFullSchemaAuth({ admin: client, local });
      report.securityRelease = report.authCycle.securityRelease;
      assert.equal(report.authCycle.result, "PASS");
      report.proofKind =
        "FULL_RESET_SCHEMA_REAL_AUTH_BUILT_NEXT_HTTP_POSTGREST_RLS_NOT_CDN_OR_HUMAN_ACCEPTANCE";
    }
    report.result = "PASS";
    report.stage = "complete";
  } catch (error) {
    // No URLs, credentials, SQL, user rows or raw errors in the artifact.
    report.failureKind = error.code || error.name;
    throw error;
  } finally {
    try {
      await client.query("rollback");
      if (owned)
        await client.query("drop schema if exists comun_org_private cascade");
      report.cleanupAbsent = (
        await client.query(
          "select to_regnamespace('comun_org_private') is null as absent",
        )
      ).rows[0].absent;
      assert(report.cleanupAbsent);
    } catch {
      report.result = "FAIL";
      report.cleanupAbsent = false;
    } finally {
      await client.end();
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, JSON.stringify(report, null, 2));
    }
  }
  assert.equal(report.result, "PASS");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(
      "NUCLEUS_FULL_SCHEMA_NOT_CERTIFIED:" + (error.code || error.name),
    );
    process.exitCode = 1;
  });
}
