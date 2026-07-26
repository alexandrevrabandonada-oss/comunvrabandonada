import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260726133409_comun_collective_actions_foundation.sql",
  "utf8",
);
const administrationMigration = readFileSync(
  "supabase/migrations/20260726171220_collective_action_administration_memory.sql",
  "utf8",
);
if (
  /20260724233256|confirmation_state|comun_sidewalk_duplicate_suggestions/i.test(
    migration,
  )
) {
  throw new Error(
    "COMUN_COLLECTIVE_ACTIONS_DEPENDS_ON_T43_OPERATIONAL_MIGRATION",
  );
}
if (
  /20260724233256|confirmation_state|comun_sidewalk_duplicate_suggestions/i.test(
    administrationMigration,
  )
) {
  throw new Error(
    "COMUN_COLLECTIVE_ACTION_ADMINISTRATION_DEPENDS_ON_T43_OPERATIONAL_MIGRATION",
  );
}

const ids = {
  action: "44000000-0000-4000-8000-000000000001",
  task: "44000000-0000-4000-8000-000000000002",
  forwardingAction: "44000000-0000-4000-8000-000000000003",
  firstUser: "44000000-0000-4000-8000-000000000011",
  secondUser: "44000000-0000-4000-8000-000000000012",
};

const names = spawnSync("docker", ["ps", "--format", "{{.Names}}"], {
  encoding: "utf8",
});
const runningContainers = names.stdout.split(/\r?\n/).filter(Boolean);
const requestedContainer = process.env.COMUN_COLLECTIVE_ACTIONS_DB_CONTAINER;
const container =
  requestedContainer ??
  runningContainers.find((name) => name.startsWith("supabase_db_"));
if (!container) throw new Error("COMUN_COLLECTIVE_ACTIONS_LOCAL_DB_REQUIRED");
if (!runningContainers.includes(container)) {
  throw new Error("COMUN_COLLECTIVE_ACTIONS_LOCAL_DB_CONTAINER_NOT_RUNNING");
}

function sql(input, { expectFailure = false } = {}) {
  const result = spawnSync(
    "docker",
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
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    {
      input,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (!expectFailure && result.status !== 0)
    throw new Error(
      `COMUN_COLLECTIVE_ACTIONS_TEST_FAILED:${result.stderr.trim()}`,
    );
  if (expectFailure && result.status === 0)
    throw new Error("COMUN_COLLECTIVE_ACTIONS_EXPECTED_RLS_BLOCK");
  return `${result.stdout}${result.stderr}`;
}

function asMember(userId, statement) {
  return sql(
    `begin; set local role authenticated; set local "request.jwt.claim.sub" = '${userId}'; ${statement}; commit;`,
  );
}

function asMemberBlocked(userId, statement, marker) {
  const output = sql(
    `begin; set local role authenticated; set local "request.jwt.claim.sub" = '${userId}'; ${statement}; commit;`,
    { expectFailure: true },
  );
  if (
    !output.includes(marker) &&
    !/row-level security|permission denied/i.test(output)
  )
    throw new Error(`COMUN_COLLECTIVE_ACTIONS_UNEXPECTED_BLOCK:${output}`);
}

function finalCount(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line))
    .at(-1);
}

try {
  sql(`delete from public.comun_collective_actions where id = '${ids.action}'`);
  sql(`delete from public.comun_collective_actions where id = '${ids.forwardingAction}'`);
  sql(
    `delete from auth.users where id in ('${ids.firstUser}', '${ids.secondUser}')`,
  );
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
    insert into public.comun_collective_actions (id, slug, title, summary, objective, action_type, status, visibility, participation_mode)
    values ('${ids.forwardingAction}', 'encaminhamento-fixture', 'Encaminhamento fixture', 'Resumo público revisado para encaminhamento local.', 'Provar que o encaminhamento, o protocolo e a memória respeitam RLS local.', 'collective_forwarding', 'awaiting_result', 'public', 'remote');
    insert into public.comun_collective_action_forwardings (action_id, recipient_name, public_summary, sent_at, protocol_code, expected_response_at, state, response_public, public_visible)
    values ('${ids.forwardingAction}', 'Órgão de teste', 'Resumo público revisado do encaminhamento.', '2026-07-26T12:00:00Z', 'PROTOCOLO-LOCAL-44', '2026-08-26T12:00:00Z', 'response_received', 'Resposta pública revisada para teste local.', true);
    insert into public.comun_collective_action_updates (action_id, update_type, event_key, idempotency_key, title, public_summary, occurred_at)
    values ('${ids.forwardingAction}', 'protocol', 'protocol_registered', 'fixture-protocol-registered-44', 'Protocolo registrado', 'O protocolo público foi conferido.', '2026-07-26T12:00:00Z')
    on conflict (action_id, idempotency_key) do update set public_summary = excluded.public_summary;
    insert into public.comun_collective_action_updates (action_id, update_type, event_key, idempotency_key, title, public_summary, occurred_at)
    values ('${ids.forwardingAction}', 'protocol', 'protocol_registered', 'fixture-protocol-registered-44', 'Protocolo registrado', 'O protocolo público foi conferido.', '2026-07-26T12:00:00Z')
    on conflict (action_id, idempotency_key) do update set public_summary = excluded.public_summary;
  `);

  asMember(
    ids.firstUser,
    `insert into public.comun_collective_action_participations (action_id, member_user_id, status) values ('${ids.action}', '${ids.firstUser}', 'interested') on conflict (action_id, member_user_id) do update set status = excluded.status`,
  );
  asMember(
    ids.firstUser,
    `insert into public.comun_collective_action_participations (action_id, member_user_id, status) values ('${ids.action}', '${ids.firstUser}', 'participating') on conflict (action_id, member_user_id) do update set status = excluded.status`,
  );
  const participationCount = sql(
    `select count(*) from public.comun_collective_action_participations where action_id = '${ids.action}' and member_user_id = '${ids.firstUser}'`,
  ).trim();
  if (participationCount !== "1")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_PARTICIPATION_NOT_IDEMPOTENT");
  asMemberBlocked(
    ids.firstUser,
    `insert into public.comun_collective_action_participations (action_id, member_user_id, status) values ('${ids.action}', '${ids.secondUser}', 'interested')`,
    "row-level security",
  );

  asMemberBlocked(
    ids.secondUser,
    `insert into public.comun_collective_action_task_assignments (task_id, member_user_id, status) values ('${ids.task}', '${ids.secondUser}', 'active')`,
    "row-level security",
  );
  asMember(
    ids.secondUser,
    `insert into public.comun_collective_action_participations (action_id, member_user_id, status) values ('${ids.action}', '${ids.secondUser}', 'participating')`,
  );
  asMember(
    ids.firstUser,
    `insert into public.comun_collective_action_task_assignments (task_id, member_user_id, status) values ('${ids.task}', '${ids.firstUser}', 'active')`,
  );
  asMemberBlocked(
    ids.secondUser,
    `insert into public.comun_collective_action_task_assignments (task_id, member_user_id, status) values ('${ids.task}', '${ids.secondUser}', 'active')`,
    "COMUN_COLLECTIVE_TASK_CAPACITY_REACHED",
  );
  asMemberBlocked(
    ids.firstUser,
    `update public.comun_collective_action_participations set status = 'withdrew' where action_id = '${ids.action}' and member_user_id = '${ids.firstUser}'`,
    "COMUN_COLLECTIVE_RELEASE_TASKS_BEFORE_LEAVING",
  );
  asMember(
    ids.firstUser,
    `update public.comun_collective_action_task_assignments set status = 'released', released_at = now() where task_id = '${ids.task}' and member_user_id = '${ids.firstUser}'`,
  );
  asMember(
    ids.firstUser,
    `update public.comun_collective_action_participations set status = 'withdrew' where action_id = '${ids.action}' and member_user_id = '${ids.firstUser}'`,
  );
  asMember(
    ids.secondUser,
    `insert into public.comun_collective_action_task_assignments (task_id, member_user_id, status) values ('${ids.task}', '${ids.secondUser}', 'active')`,
  );
  const privateParticipation = finalCount(
    asMember(
      ids.secondUser,
      `select count(*) from public.comun_collective_action_participations where action_id = '${ids.action}' and member_user_id = '${ids.firstUser}'`,
    ),
  );
  if (privateParticipation !== "0")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_PRIVACY_LEAK");
  const privateAssignments = finalCount(
    asMember(
      ids.firstUser,
      `select count(*) from public.comun_collective_action_task_assignments where task_id = '${ids.task}' and member_user_id = '${ids.secondUser}'`,
    ),
  );
  if (privateAssignments !== "0")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_ASSIGNMENT_PRIVACY_LEAK");

  const timeline = sql(
    `select string_agg(update_type, ',' order by occurred_at asc) from public.comun_collective_action_updates where action_id = '${ids.action}'`,
  ).trim();
  if (timeline !== "announcement,progress")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_TIMELINE_NOT_ORDERED");
  const idempotentTimeline = sql(
    `select count(*) from public.comun_collective_action_updates where action_id = '${ids.forwardingAction}' and idempotency_key = 'fixture-protocol-registered-44'`,
  ).trim();
  if (idempotentTimeline !== "1")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_TIMELINE_NOT_IDEMPOTENT");
  const publicForwarding = finalCount(
    asMember(
      ids.firstUser,
      `select count(*) from public.comun_collective_action_forwardings where action_id = '${ids.forwardingAction}'`,
    ),
  );
  if (publicForwarding !== "1")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_PUBLIC_FORWARDING_NOT_VISIBLE");
  asMemberBlocked(
    ids.firstUser,
    `insert into public.comun_collective_action_forwardings (action_id, state) values ('${ids.action}', 'preparing')`,
    "permission denied",
  );
  sql(
    `update public.comun_collective_actions set status = 'completed', completed_at = now(), result_status = 'achieved', result_summary = 'Resultado confirmado.', memory_summary = 'Aprendizado preservado.', learned_summary = 'Aprendizado revisado.', next_steps_summary = 'Próximos passos revisados.', participant_count_aggregate = 1, tasks_completed_aggregate = 1 where id = '${ids.action}';
     insert into public.comun_collective_action_memory_assets (action_id, asset_kind, title, public_url, public_visible, reviewed_at)
     values ('${ids.action}', 'document', 'Documento público revisado', 'https://example.invalid/documento', true, now()),
            ('${ids.action}', 'photograph', 'Fotografia em revisão', 'https://example.invalid/fotografia', false, null)`,
  );
  const memory = sql(
    `select result_summary || '|' || memory_summary from public.comun_collective_actions where id = '${ids.action}'`,
  ).trim();
  if (memory !== "Resultado confirmado.|Aprendizado preservado.")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_MEMORY_NOT_PRESERVED");
  const publicAssets = finalCount(
    asMember(
      ids.firstUser,
      `select count(*) from public.comun_collective_action_memory_assets where action_id = '${ids.action}'`,
    ),
  );
  if (publicAssets !== "1")
    throw new Error("COMUN_COLLECTIVE_ACTIONS_MEMORY_ASSET_PRIVACY_LEAK");
  asMemberBlocked(
    ids.firstUser,
    `insert into public.comun_collective_action_memory_assets (action_id, asset_kind, title, public_url) values ('${ids.action}', 'document', 'Tentativa', 'https://example.invalid/tentativa')`,
    "permission denied",
  );
  console.log("COMUN_COLLECTIVE_ACTION_MEMBER_JOURNEY_GREEN");
  console.log("COMUN_COLLECTIVE_ACTION_ADMIN_MEMORY_GREEN");
  console.log("COMUN_COLLECTIVE_ACTIONS_LOCAL_GREEN");
} finally {
  sql(`delete from public.comun_collective_actions where id = '${ids.action}'`);
  sql(`delete from public.comun_collective_actions where id = '${ids.forwardingAction}'`);
  sql(
    `delete from auth.users where id in ('${ids.firstUser}', '${ids.secondUser}')`,
  );
}
