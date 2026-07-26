import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260726133409_comun_collective_actions_foundation.sql", "utf8");
if (/20260724233256|confirmation_state|comun_sidewalk_duplicate_suggestions/i.test(migration)) {
  throw new Error("COMUN_COLLECTIVE_ACTIONS_DEPENDS_ON_T43_OPERATIONAL_MIGRATION");
}

const ids = {
  action: "44000000-0000-4000-8000-000000000001",
  task: "44000000-0000-4000-8000-000000000002",
  firstUser: "44000000-0000-4000-8000-000000000011",
  secondUser: "44000000-0000-4000-8000-000000000012",
};

const names = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
const container = names.stdout.split(/\r?\n/).find((name) => name.startsWith("supabase_db_"));
if (!container) throw new Error("COMUN_COLLECTIVE_ACTIONS_LOCAL_DB_REQUIRED");

function sql(input, { expectFailure = false } = {}) {
  const result = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-At"], {
    input,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (!expectFailure && result.status !== 0) throw new Error(`COMUN_COLLECTIVE_ACTIONS_TEST_FAILED:${result.stderr.trim()}`);
  if (expectFailure && result.status === 0) throw new Error("COMUN_COLLECTIVE_ACTIONS_EXPECTED_RLS_BLOCK");
  return `${result.stdout}${result.stderr}`;
}

function asMember(userId, statement) {
  return sql(`begin; set local role authenticated; set local "request.jwt.claim.sub" = '${userId}'; ${statement}; commit;`);
}

function asMemberBlocked(userId, statement, marker) {
  const output = sql(`begin; set local role authenticated; set local "request.jwt.claim.sub" = '${userId}'; ${statement}; commit;`, { expectFailure: true });
  if (!output.includes(marker) && !/row-level security|permission denied/i.test(output)) throw new Error(`COMUN_COLLECTIVE_ACTIONS_UNEXPECTED_BLOCK:${output}`);
}

function finalCount(output) {
  return output.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^\d+$/.test(line)).at(-1);
}

try {
  sql(`delete from public.comun_collective_actions where id = '${ids.action}'`);
  sql(`delete from auth.users where id in ('${ids.firstUser}', '${ids.secondUser}')`);
  sql(`
    insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('${ids.firstUser}', 'authenticated', 'authenticated', 'collective-first@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
      ('${ids.secondUser}', 'authenticated', 'authenticated', 'collective-second@example.invalid', '', '{"provider":"email","providers":["email"]}', '{}', now(), now());
    insert into public.comun_collective_actions (id, slug, title, summary, objective, action_type, status, visibility, participation_mode)
    values ('${ids.action}', 'acao-coletiva-fixture', 'Ação coletiva fixture', 'Resumo público de uma ação coletiva para teste.', 'Construir uma prova local de participação, tarefa e memória sem expor identidades.', 'community_inspection', 'open', 'public', 'hybrid');
    insert into public.comun_collective_action_tasks (id, action_id, title, description, desired_count, state, effort_level, participation_mode)
    values ('${ids.task}', '${ids.action}', 'Fotografar encontro', 'Registrar imagens do encontro com cuidado e autorização.', 1, 'open', 'small', 'hybrid');
    insert into public.comun_collective_action_updates (action_id, update_type, title, public_summary, occurred_at)
    values
      ('${ids.action}', 'announcement', 'Ação anunciada', 'A primeira atualização pública.', '2026-07-26T10:00:00Z'),
      ('${ids.action}', 'progress', 'Primeiro passo', 'A segunda atualização pública.', '2026-07-26T11:00:00Z');
  `);

  asMember(ids.firstUser, `insert into public.comun_collective_action_participations (action_id, member_user_id, status) values ('${ids.action}', '${ids.firstUser}', 'interested') on conflict (action_id, member_user_id) do update set status = excluded.status`);
  asMember(ids.firstUser, `insert into public.comun_collective_action_participations (action_id, member_user_id, status) values ('${ids.action}', '${ids.firstUser}', 'participating') on conflict (action_id, member_user_id) do update set status = excluded.status`);
  const participationCount = sql(`select count(*) from public.comun_collective_action_participations where action_id = '${ids.action}' and member_user_id = '${ids.firstUser}'`).trim();
  if (participationCount !== "1") throw new Error("COMUN_COLLECTIVE_ACTIONS_PARTICIPATION_NOT_IDEMPOTENT");
  asMember(ids.firstUser, `update public.comun_collective_action_participations set status = 'withdrew' where action_id = '${ids.action}' and member_user_id = '${ids.firstUser}'`);
  asMemberBlocked(ids.firstUser, `insert into public.comun_collective_action_participations (action_id, member_user_id, status) values ('${ids.action}', '${ids.secondUser}', 'interested')`, "row-level security");

  asMember(ids.firstUser, `insert into public.comun_collective_action_task_assignments (task_id, member_user_id, status) values ('${ids.task}', '${ids.firstUser}', 'active')`);
  asMemberBlocked(ids.secondUser, `insert into public.comun_collective_action_task_assignments (task_id, member_user_id, status) values ('${ids.task}', '${ids.secondUser}', 'active')`, "COMUN_COLLECTIVE_TASK_CAPACITY_REACHED");
  asMember(ids.firstUser, `update public.comun_collective_action_task_assignments set status = 'released', released_at = now() where task_id = '${ids.task}' and member_user_id = '${ids.firstUser}'`);
  asMember(ids.secondUser, `insert into public.comun_collective_action_task_assignments (task_id, member_user_id, status) values ('${ids.task}', '${ids.secondUser}', 'active')`);
  const privateParticipation = finalCount(asMember(ids.secondUser, `select count(*) from public.comun_collective_action_participations where action_id = '${ids.action}'`));
  if (privateParticipation !== "0") throw new Error("COMUN_COLLECTIVE_ACTIONS_PRIVACY_LEAK");
  const privateAssignments = finalCount(asMember(ids.firstUser, `select count(*) from public.comun_collective_action_task_assignments where task_id = '${ids.task}'`));
  if (privateAssignments !== "1") throw new Error("COMUN_COLLECTIVE_ACTIONS_ASSIGNMENT_PRIVACY_LEAK");

  const timeline = sql(`select string_agg(update_type, ',' order by occurred_at asc) from public.comun_collective_action_updates where action_id = '${ids.action}'`).trim();
  if (timeline !== "announcement,progress") throw new Error("COMUN_COLLECTIVE_ACTIONS_TIMELINE_NOT_ORDERED");
  sql(`update public.comun_collective_actions set status = 'completed', completed_at = now(), result_summary = 'Resultado confirmado.', memory_summary = 'Aprendizado preservado.' where id = '${ids.action}'`);
  const memory = sql(`select result_summary || '|' || memory_summary from public.comun_collective_actions where id = '${ids.action}'`).trim();
  if (memory !== "Resultado confirmado.|Aprendizado preservado.") throw new Error("COMUN_COLLECTIVE_ACTIONS_MEMORY_NOT_PRESERVED");
  console.log("COMUN_COLLECTIVE_ACTIONS_LOCAL_GREEN");
} finally {
  sql(`delete from public.comun_collective_actions where id = '${ids.action}'`);
  sql(`delete from auth.users where id in ('${ids.firstUser}', '${ids.secondUser}')`);
}
