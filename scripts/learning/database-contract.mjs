import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("supabase/releases/20261006134804-comun-learning-r0.json", root)));
const catalog = JSON.parse(readFileSync(new URL("lib/learning/catalog.json", root)));
const migration = readFileSync(new URL(manifest.migration, root), "utf8");
const uid = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const reviewer = "00000000-0000-4000-8000-000000000003";
const pauta = "00000000-0000-4000-8000-000000000004";
const task = "00000000-0000-4000-8000-000000000005";

// Minimal dependencies deliberately exercise the new migration in isolation.
// This contract does not claim to validate the complete canonical schema or Auth.
export async function runLearningDatabaseContract(db) {
  assert.equal(createHash("sha256").update(migration).digest("hex"), manifest.migrationSha256);
  await db.query("begin");
  try {
    await db.query(`
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      do $$ begin
        if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
        if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
        if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
      end $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to authenticated;
      create table public.comun_pauta_spaces(id uuid primary key,slug text,title text,status text);
      create table public.comun_pauta_tasks(id uuid primary key,pauta_id uuid,title text,status text);
      create table public.comun_pauta_memberships(pauta_id uuid,member_user_id uuid,status text);
      create table public.comun_admin_users(user_id uuid,is_active boolean,role text);
      grant select on public.comun_pauta_spaces,public.comun_pauta_tasks,public.comun_pauta_memberships,public.comun_admin_users to service_role;
    `);
    // Keep all DDL, role grants and synthetic rows within the outer rollback.
    await db.query(migration.replace(/^begin;\s*/i, "").replace(/commit;\s*$/i, ""));
    await db.query("insert into auth.users values($1),($2),($3)", [uid, other, reviewer]);
    await db.query("insert into comun_pauta_spaces values($1,'fixture-escola','Fixture Escola','active')", [pauta]);
    await db.query("insert into comun_pauta_tasks values($1,$2,'Tarefa fixture','done')", [task, pauta]);
    await db.query("insert into comun_pauta_memberships values($1,$2,'active')", [pauta, uid]);
    await db.query("insert into comun_admin_users values($1,true,'editor')", [reviewer]);
    const rows = (await db.query("select content from comun_learning_units where unit_type='mission' order by position")).rows;
    assert.deepEqual(rows.map((r) => r.content), catalog.missions, "editorial seed must match the app exactly");
    assert.equal((await db.query("select count(*)::int n from pg_class where relname like 'comun_learning_%' and relkind='r' and relrowsecurity")).rows[0].n, 6);
    assert.equal((await db.query("select count(*)::int n from pg_proc where proname like 'comun_learning_%' and prosecdef")).rows[0].n, 0);

    async function rejected(sql, args, pattern) {
      await db.query("savepoint expected_failure");
      try {
        await assert.rejects(() => db.query(sql, args), pattern);
      } finally {
        await db.query("rollback to savepoint expected_failure");
        await db.query("release savepoint expected_failure");
      }
    }
    const eventSql = "select comun_learning_event($1,$2,$3,$4,$5) result";
    const practiceSql = "select comun_learning_submit_practice($1,$2,$3,$4,$5)";
    const reviewSql = "select comun_learning_review_practice($1,$2,$3,$4,$5)";
    const reflection = "Conferi o problema e registrei a fonte na pauta fixture.";
    const mission = catalog.missions[0];
    await db.query("set local role service_role");
    const event = async (id, revision, type, answer = null) =>
      (await db.query(eventSql, [uid, id, revision, type, answer])).rows[0].result;
    let r = await event(mission.id, 0, "continue");
    assert.equal(r.progress.step, 1);
    await rejected(eventSql, [uid, mission.id, 0, "continue", null], /stale_revision/);
    await rejected(eventSql, [uid, mission.id, 1, "continue", null], /invalid_transition/);
    await rejected(eventSql, [uid, mission.id, 1, "answer", 999], /invalid_answer/);
    r = await event(mission.id, 1, "answer", (mission.challenges[0].answer + 1) % mission.challenges[0].options.length);
    assert.equal(r.correct, false);
    assert.equal(r.progress.step, 1);
    r = await event(mission.id, 2, "answer", mission.challenges[0].answer);
    assert.equal(r.correct, true);
    assert.equal(r.progress.step, 2);
    r = await event(mission.id, 3, "continue");
    r = await event(mission.id, 4, "answer", mission.challenges[1].answer);
    r = await event(mission.id, 5, "continue");
    assert.equal(r.progress.status, "practice_pending");
    await rejected(practiceSql, [other, mission.id, pauta, null, reflection], /practice_not_available/);
    await rejected(practiceSql, [uid, mission.id, other, null, reflection], /pauta_access/);
    await rejected(practiceSql, [uid, mission.id, pauta, other, reflection], /task_access/);
    await db.query("reset role");
    await db.query("update comun_pauta_memberships set status='suspended'");
    await db.query("set local role service_role");
    await rejected(practiceSql, [uid, mission.id, pauta, task, reflection], /pauta_access/);
    await db.query("reset role");
    await db.query("update comun_pauta_memberships set status='active'; update comun_pauta_tasks set status='archived'");
    await db.query("set local role service_role");
    await rejected(practiceSql, [uid, mission.id, pauta, task, reflection], /task_access/);
    await db.query("reset role");
    await db.query("update comun_pauta_tasks set status='done'");
    await db.query("set local role service_role");
    await db.query(practiceSql, [uid, mission.id, pauta, task, reflection]);
    await rejected(reviewSql, [uid, uid, mission.id, "validated", ""], /review_access/);
    await rejected(reviewSql, [other, uid, mission.id, "validated", ""], /review_access/);
    await db.query(reviewSql, [reviewer, uid, mission.id, "revision_requested", "Indique a data."]);
    await db.query(practiceSql, [uid, mission.id, pauta, task, reflection]);
    const resubmitted = (await db.query("select state,reviewed_by,review_note from comun_learning_practice_links")).rows[0];
    assert.deepEqual(resubmitted, { state: "pending", reviewed_by: null, review_note: null });
    await db.query(reviewSql, [reviewer, uid, mission.id, "validated", ""]);
    assert.equal((await db.query("select status from comun_learning_progress where mission_id=$1", [mission.id])).rows[0].status, "completed");
    await rejected(practiceSql, [uid, mission.id, pauta, task, reflection], /practice_not_available/);
    assert.equal((await db.query("select status from comun_pauta_tasks")).rows[0].status, "done");
    const theoretical = catalog.missions.find((m) => !m.requiresPractice);
    await event(theoretical.id, 0, "continue");
    await event(theoretical.id, 1, "answer", theoretical.challenges[0].answer);
    await event(theoretical.id, 2, "continue");
    await event(theoretical.id, 3, "answer", theoretical.challenges[1].answer);
    assert.equal((await event(theoretical.id, 4, "continue")).progress.status, "completed");
    await db.query("select comun_learning_bookmark($1,$2)", [uid, catalog.resources[0].id]);
    assert.deepEqual((await db.query("select saved_resource_ids from comun_learning_enrollments")).rows[0].saved_resource_ids, [catalog.resources[0].id]);

    for (const identity of [uid, other]) {
      await db.query("reset role; set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [identity]);
      for (const table of ["enrollments", "progress", "practice_links"]) {
        const records = (await db.query(`select user_id from comun_learning_${table}`)).rows;
        assert.equal(records.length > 0, identity === uid, table);
        assert.ok(records.every((record) => record.user_id === identity));
      }
      await rejected(eventSql, [identity, mission.id, 0, "continue", null], /permission denied/);
      await rejected("delete from comun_learning_progress", [], /permission denied/);
    }
    await db.query("reset role; set local role anon");
    assert.equal((await db.query("select count(*)::int n from comun_learning_units")).rows[0].n, 28);
    await rejected("select * from comun_learning_progress", [], /permission denied/);
    await db.query("reset role");
    // Account cleanup must be explicit: never silently cascade private records.
    await rejected("delete from auth.users where id=$1", [uid], /foreign key/);
    await db.query("delete from comun_learning_practice_links where user_id=$1", [uid]);
    await db.query("delete from comun_learning_progress where user_id=$1", [uid]);
    await db.query("delete from comun_learning_enrollments where user_id=$1", [uid]);
    await db.query("delete from auth.users where id=$1", [uid]);
    assert.equal((await db.query("select count(*)::int n from comun_learning_progress")).rows[0].n, 0);
  } finally {
    await db.query("rollback");
  }
}
