import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { proveBrowserResume } from "./browser-resume-proof.mjs";
import {
  disposableContext,
  assertOwnedContainers,
  INACTIVE_MEMBERSHIP_STATE,
} from "./disposable-boundary.mjs";

// This script never accepts a project URL or a Production credential. Every
// mutation is preceded by ownership checks against this run's Docker containers.
const context = disposableContext(process.env);
const guard = () => assertOwnedContainers(context);
guard();
const root = new URL("../../", import.meta.url);
const catalog = JSON.parse(
  readFileSync(new URL("lib/learning/catalog.json", root)),
);
const manifest = JSON.parse(
  readFileSync(
    new URL("supabase/releases/20261006134804-comun-learning-r0.json", root),
  ),
);
const migrationHash = createHash("sha256")
  .update(readFileSync(new URL(manifest.migration, root)))
  .digest("hex");
assert.equal(migrationHash, manifest.migrationSha256);
const admin = createClient(context.api, context.service, {
  auth: { persistSession: false },
});
const db = new pg.Client({ connectionString: context.database });
const blocker = new pg.Client({ connectionString: context.database });
// NextURL normalizes loopback literals to localhost. Use the canonical local
// application URL, including its Origin header; keep Supabase on pinned 127.0.0.1.
const origin = "http://localhost:3017";
const run = randomUUID();
const identities = [];
const checks = [];
let browserProof;
let server;
let locked = false;

async function until(check, label, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(100); // bounded polling of an observable condition, not a race sleep
  }
  throw new Error(`disposable readiness timeout: ${label}`);
}
async function write(sql, args) {
  guard();
  return db.query(sql, args);
}
async function login(email, password) {
  const jar = new Map();
  const client = createServerClient(context.api, context.anon, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) =>
        values.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  guard();
  const result = await client.auth.signInWithPassword({ email, password });
  assert.equal(result.error, null, "local Auth login failed");
  const verified = await client.auth.getUser();
  assert.equal(verified.error, null);
  assert.equal(verified.data.user.id, result.data.user.id);
  return {
    client,
    id: verified.data.user.id,
    cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
  };
}
async function request(actor, input, requestOrigin = origin) {
  if (input) guard();
  const response = await fetch(`${origin}/api/comun/escola`, {
    method: input ? "POST" : "GET",
    headers: {
      ...(actor ? { cookie: actor.cookie } : {}),
      ...(input
        ? { origin: requestOrigin, "content-type": "application/json" }
        : {}),
    },
    body: input ? JSON.stringify(input) : undefined,
    redirect: "error",
  });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  return { status: response.status, body: await response.json() };
}
async function apiOk(actor, input) {
  const result = await request(actor, input);
  assert.equal(
    result.status,
    200,
    `API operation failed: ${input?.event ?? "snapshot"}`,
  );
  return result.body;
}

try {
  await db.connect();
  await blocker.connect();
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from supabase_migrations.schema_migrations where version=$1",
        ["20261006134804"],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.comun_learning_units where unit_type='mission'",
      )
    ).rows[0].n,
    24,
  );
  assert.deepEqual(
    (
      await db.query(
        "select content from public.comun_learning_units where unit_type='mission' order by position",
      )
    ).rows.map((r) => r.content),
    catalog.missions,
  );
  checks.push("canonical-migration-history-and-editorial-hash");

  for (const label of ["a", "b", "reviewer"]) {
    guard();
    const email = `escola-${label}-${run}@example.test`;
    const password = `Disposable-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.equal(created.error, null, "local synthetic Auth creation failed");
    identities.push(created.data.user.id);
    await write(
      "insert into public.comun_member_profiles(user_id,display_name,status) values($1,$2,'active') on conflict(user_id) do update set status='active'",
      [created.data.user.id, `Fixture ${label}`],
    );
    const actor = await login(email, password);
    assert.equal(actor.id, created.data.user.id);
    if (label === "a") context.a = actor;
    if (label === "b") context.b = actor;
    if (label === "reviewer") context.reviewer = actor;
  }
  checks.push("real-auth-and-server-cookie-session");
  // No mock server, API interception, auth.uid replacement, or reduced schema.
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3017",
    ],
    {
      stdio: ["ignore", "ignore", "ignore"],
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: context.api,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: context.anon,
        SUPABASE_SERVICE_ROLE_KEY: context.service,
        COMUN_LEARNING_R0_ENABLED: "enabled",
      },
    },
  );
  await until(async () => {
    if (server.exitCode !== null) throw new Error("local application exited");
    try {
      return (await request()).status === 401;
    } catch {
      return false;
    }
  }, "real application route");
  const a = context.a;
  const b = context.b;
  assert.equal(
    (
      await request(null, {
        event: "continue",
        missionId: catalog.missions[0].id,
        revision: 0,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(
        a,
        { event: "bookmark", resourceId: catalog.resources[0].id },
        "https://foreign.example",
      )
    ).status,
    403,
  );
  assert.equal((await request(a, { event: "invalid" })).status, 400);
  checks.push("anonymous-origin-validation-private-no-store");

  const mission = catalog.missions.find((m) => m.requiresPractice);
  const started = await apiOk(a, {
    event: "continue",
    missionId: mission.id,
    revision: 0,
    userId: b.id,
    user_id: b.id,
    actorUserId: b.id,
  });
  assert.equal(started.result.progress.step, 1);
  assert.equal(
    (await apiOk(b)).progress.length,
    0,
    "client-declared actor changed target",
  );
  await apiOk(b, { event: "continue", missionId: mission.id, revision: 0 });
  for (const actor of [a, b]) {
    const direct = await actor.client
      .from("comun_learning_progress")
      .select("user_id,mission_id,step,revision");
    assert.equal(direct.error, null);
    assert.equal(direct.data.length, 1, "nonempty owner fixture required");
    assert.ok(direct.data.every((row) => row.user_id === actor.id));
    const foreign = await actor.client
      .from("comun_learning_progress")
      .select("user_id")
      .eq("user_id", actor === a ? b.id : a.id);
    assert.equal(foreign.error, null);
    assert.deepEqual(foreign.data, []);
    guard();
    assert.ok(
      (
        await actor.client
          .from("comun_learning_progress")
          .update({ step: 4 })
          .eq("user_id", actor.id)
      ).error,
      "direct authenticated writes must be denied",
    );
    guard();
    assert.ok(
      (
        await actor.client.rpc("comun_learning_event", {
          p_user_id: actor.id,
          p_mission_id: mission.id,
          p_revision: 1,
          p_event: "answer",
          p_answer: mission.challenges[0].answer,
        })
      ).error,
      "authenticated RPC must be denied",
    );
  }
  const anon = createClient(context.api, context.anon, {
    auth: { persistSession: false },
  });
  assert.ok(
    (await anon.from("comun_learning_progress").select("user_id")).error,
  );
  guard();
  assert.ok(
    (
      await anon.rpc("comun_learning_event", {
        p_user_id: a.id,
        p_mission_id: mission.id,
        p_revision: 1,
        p_event: "answer",
        p_answer: 0,
      })
    ).error,
  );
  checks.push("jwt-rls-nonempty-owner-isolation-and-denied-direct-write-rpc");

  // Hold the exact progress row, then observe TWO independent PostgREST
  // connections waiting on locks before releasing. No sequential imitation.
  guard();
  await blocker.query("begin");
  locked = true;
  await blocker.query(
    "select 1 from public.comun_learning_progress where user_id=$1 and mission_id=$2 for update",
    [a.id, mission.id],
  );
  const answer = {
    event: "answer",
    missionId: mission.id,
    revision: 1,
    answer: mission.challenges[0].answer,
  };
  const one = request(a, answer);
  const two = request(a, answer);
  await until(
    async () =>
      (
        await db.query(
          "select count(*)::int n from pg_stat_activity where pid <> pg_backend_pid() and wait_event_type='Lock' and query like '%comun_learning_event%'",
        )
      ).rows[0].n >= 2,
    "two independent blocked RPC connections",
    30000,
  );
  guard();
  await blocker.query("commit");
  locked = false;
  const outcomes = await Promise.all([one, two]);
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
  const recovered = await apiOk(a);
  assert.equal(recovered.progress[0].step, 2);
  assert.equal(recovered.progress[0].revision, 2);
  assert.equal(
    (await request(a, answer)).status,
    409,
    "lost-response replay must not apply twice",
  );
  assert.deepEqual((await apiOk(a)).progress, recovered.progress);
  assert.equal((await apiOk(b)).progress[0].step, 1);
  checks.push("barrier-independent-concurrency-stale-replay-and-read-recovery");

  browserProof = await proveBrowserResume({
    actors: [
      { cookie: a.cookie, label: "a", step: 2, revision: 2 },
      { cookie: b.cookie, label: "b", step: 1, revision: 1 },
    ],
    mission,
    origin,
    directory: new URL("reports/local/", root),
  });
  console.log("COMUN_LEARNING_BROWSER_RESUME_PASS");
  checks.push("real-browser-owner-resume-mobile-desktop-and-reload");

  const pauta = randomUUID();
  const task = randomUUID();
  context.pauta = pauta;
  await write(
    "insert into public.comun_pauta_spaces(id,slug,title,status,visibility) values($1,$2,'Fixture Escola','observing','internal')",
    [pauta, `escola-proof-${run}`],
  );
  await write(
    "insert into public.comun_pauta_tasks(id,pauta_id,title,status) values($1,$2,'Fixture tarefa','done')",
    [task, pauta],
  );
  await write(
    "insert into public.comun_pauta_memberships(pauta_id,member_user_id,status) values($1,$2,'active')",
    [pauta, a.id],
  );
  await apiOk(a, { event: "continue", missionId: mission.id, revision: 2 });
  await apiOk(a, {
    event: "answer",
    missionId: mission.id,
    revision: 3,
    answer: mission.challenges[1].answer,
  });
  await apiOk(a, { event: "continue", missionId: mission.id, revision: 4 });
  const reflection =
    "Registrei a evidência sintética e conferi a fonte na pauta de teste.";
  const practice = {
    event: "practice",
    missionId: mission.id,
    pautaId: pauta,
    taskId: task,
    reflection,
  };
  assert.equal((await request(b, { ...practice, userId: a.id })).status, 400);
  await apiOk(a, practice);
  assert.equal((await apiOk(a)).practices.length, 1);
  assert.equal((await apiOk(b)).practices.length, 0);
  await write(
    "update public.comun_pauta_memberships set status=$3 where pauta_id=$1 and member_user_id=$2",
    [pauta, a.id, INACTIVE_MEMBERSHIP_STATE],
  );
  assert.equal((await request(a, practice)).status, 400);
  await write(
    "update public.comun_pauta_memberships set status='active' where pauta_id=$1 and member_user_id=$2",
    [pauta, a.id],
  );
  await apiOk(a, { event: "bookmark", resourceId: catalog.resources[0].id });
  assert.deepEqual((await apiOk(a)).savedResources, [catalog.resources[0].id]);
  assert.deepEqual((await apiOk(b)).savedResources, []);
  await write(
    "update public.comun_member_profiles set status='suspended' where user_id=$1",
    [a.id],
  );
  assert.equal((await request(a)).status, 401);
  assert.equal((await request(a, practice)).status, 401);
  checks.push("practice-scope-membership-bookmark-and-profile-suspension");

  const funcs = (
    await db.query(
      "select p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') a,has_function_privilege('authenticated',p.oid,'EXECUTE') b,has_function_privilege('service_role',p.oid,'EXECUTE') s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'comun_learning_%'",
    )
  ).rows;
  assert.equal(funcs.length, 4);
  assert.ok(funcs.every((f) => !f.prosecdef && !f.a && !f.b && f.s));
  checks.push("exact-four-invoker-routines-service-only");
} finally {
  console.log("COMUN_LEARNING_DISPOSABLE_STAGE=cleanup");
  if (locked) await blocker.query("rollback");
  if (server) server.kill("SIGTERM");
  // Only UUIDs obtained from this run's Auth createUser responses are cleaned.
  if (identities.length) {
    await write(
      "delete from public.comun_learning_practice_links where user_id=any($1::uuid[])",
      [identities],
    );
    await write(
      "delete from public.comun_learning_progress where user_id=any($1::uuid[])",
      [identities],
    );
    await write(
      "delete from public.comun_learning_enrollments where user_id=any($1::uuid[])",
      [identities],
    );
    if (context.pauta) {
      await write("delete from public.comun_pauta_tasks where pauta_id=$1", [
        context.pauta,
      ]);
      await write(
        "delete from public.comun_pauta_memberships where pauta_id=$1",
        [context.pauta],
      );
      await write("delete from public.comun_pauta_spaces where id=$1", [
        context.pauta,
      ]);
    }
    await write(
      "delete from public.comun_member_profiles where user_id=any($1::uuid[])",
      [identities],
    );
    for (const id of identities) {
      guard();
      assert.equal(
        (await admin.auth.admin.deleteUser(id)).error,
        null,
        "synthetic Auth cleanup failed",
      );
    }
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.comun_learning_progress where user_id=any($1::uuid[])",
          [identities],
        )
      ).rows[0].n,
      0,
    );
  }
  await blocker.end();
  await db.end();
  console.log("COMUN_LEARNING_DISPOSABLE_STAGE=cleanup-complete");
}

const directory = new URL("reports/local/", root);
mkdirSync(directory, { recursive: true });
const receipt = {
  status: "COMUN_LEARNING_CANONICAL_AUTH_DISPOSABLE_GREEN",
  sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  tree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    encoding: "utf8",
  }).trim(),
  workflowRun: process.env.COMUN_LEARNING_RUN_ID,
  migrationSha256: migrationHash,
  auth: "REAL_LOCAL_SUPABASE",
  api: "REAL_NEXT_ROUTE_SSR_COOKIES",
  checks,
  browserProof,
  cleanup: "EXACT_SYNTHETIC_IDS_REMOVED",
  productionWrites: 0,
  limitations: [
    "No human rehearsal or editorial approval",
    "No feature activation or merge",
    "Lost-response replay rejects stale revision; no new idempotency protocol",
    "Bookmark toggling is not claimed to be idempotent",
  ],
};
writeFileSync(
  new URL("escola-canonical-auth-proof.json", directory),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(receipt.status);
