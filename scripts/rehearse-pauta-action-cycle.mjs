import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { Client } from "pg";

export const REHEARSAL_CONFIRMATION =
  "EXECUTAR_ENSAIO_CONTROLADO_PAUTA_ACTION_CYCLE";
export const CANONICAL_PROJECT_REF = "nvmdszymrtacfehdynpg";
export const rehearsalStages = [
  "moderation",
  "conversation",
  "synthesis",
  "decision",
  "action",
  "tasks",
  "forwarding",
  "protocol",
  "response",
  "result",
  "memory",
  "reopened",
];

export function classifyRehearsalTarget({
  connectionString,
  controlledRemote = false,
  confirmation,
  projectRef,
}) {
  const url = new URL(connectionString);
  const local = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (local) return "local";
  if (
    !controlledRemote ||
    confirmation !== REHEARSAL_CONFIRMATION ||
    projectRef !== CANONICAL_PROJECT_REF
  )
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_REMOTE_REHEARSAL_BLOCKED");
  return "controlled_remote";
}

function token() {
  return randomBytes(6).toString("hex");
}

async function transition(client, input) {
  const result = await client.query(
    `select * from public.comun_transition_pauta_action_cycle(
      $1::uuid, $2::integer, $3::text, $4::text,
      $5::uuid, $6::text, $7::text, null
    )`,
    [
      input.cycleId,
      input.version,
      `rehearsal:${input.namespace}:${input.to}`,
      input.to,
      input.actorId,
      input.actorRole,
      `Etapa ${input.to} comprovada no ensaio técnico privado.`,
    ],
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].current_stage, input.to);
  assert.equal(result.rows[0].replayed, false);
  return Number(result.rows[0].state_version);
}

export async function runPautaActionCycleRehearsal({
  connectionString,
  controlledRemote = false,
  confirmation,
  projectRef,
  output,
}) {
  const target = classifyRehearsalTarget({
    connectionString,
    controlledRemote,
    confirmation,
    projectRef,
  });
  const suffix = token();
  const sequence = (Number.parseInt(suffix.slice(0, 6), 16) % 100)
    .toString()
    .padStart(2, "0");
  const namespace = `pauta-action-cycle-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${sequence}`;
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
  });
  let cycleId;
  const passedStages = [];
  let negativeTransitionBlocked = false;
  let activityDidNotResolve = false;
  let controlledRehearsalHidden = false;
  let publicProjectionRlsGreen = false;
  try {
    await client.connect();
    await client.query("begin");
    const community = (
      await client.query(
        `insert into public.comun_communities(
          slug, name, short_description, full_description, main_cta, is_active
        ) values ($1, 'Comunidade sintética privada', 'Ensaio privado',
          'Fixture transacional do ciclo político.', 'Não publicar', false)
        returning slug`,
        [`rehearsal-${suffix}`],
      )
    ).rows[0];
    const admins = (
      await client.query(
        `insert into public.comun_admin_users(user_id, email, role, is_active)
         values
          (gen_random_uuid(), $1, 'editor', true),
          (gen_random_uuid(), $2, 'admin', true)
         returning id, role`,
        [`editor-${suffix}@invalid.local`, `admin-${suffix}@invalid.local`],
      )
    ).rows;
    const admin = admins.find((row) => row.role === "admin");
    const editor = admins.find((row) => row.role === "editor");
    const pauta = (
      await client.query(
        `insert into public.comun_pauta_spaces(
          slug, title, summary, community, status, visibility,
          public_synthesis, next_step
        ) values ($1, 'Pauta sintética privada', 'Ensaio transacional privado.',
          $2, 'organizing', 'internal', 'Síntese de fixture privada.',
          'Validar a máquina sem publicar.')
        returning id`,
        [`rehearsal-${suffix}`, community.slug],
      )
    ).rows[0];
    await client.query(
      `insert into public.comun_pauta_contributions(
        pauta_id, contribution_type, author_alias, body, status
      ) values ($1, 'proposta', 'fixture', 'Contribuição sintética privada.', 'approved')`,
      [pauta.id],
    );
    const circle = (
      await client.query(
        `insert into public.comun_construction_circles(
          pauta_id, title, public_question, public_context, status,
          participation_mode
        ) values ($1, 'Roda sintética privada', 'Como validar o ciclo?',
          'Somente fixture transacional.', 'open', 'internal')
        returning id`,
        [pauta.id],
      )
    ).rows[0];
    const synthesis = (
      await client.query(
        `insert into public.comun_pauta_synthesis_versions(
          pauta_id, new_public_synthesis, new_next_step, editor_note
        ) values ($1, 'Síntese revisada da fixture privada.',
          'Registrar decisão em dupla revisão.', 'Ensaio controlado')
        returning id`,
        [pauta.id],
      )
    ).rows[0];
    const decision = (
      await client.query(
        `insert into public.comun_pauta_decisions(
          pauta_id, synthesis_version_id, circle_id, public_title,
          public_summary, public_justification, status, created_by_admin_id
        ) values ($1, $2, $3, 'Decisão sintética',
          'Executar somente o ensaio transacional privado.',
          'Comprovar a esteira sem produzir publicação ou envio externo.',
          'draft', $4)
        returning id`,
        [pauta.id, synthesis.id, circle.id, editor.id],
      )
    ).rows[0];
    await client.query(
      `update public.comun_pauta_decisions
       set status = 'published', published_by_admin_id = $1,
         decided_at = now(), published_at = now(), updated_at = now()
       where id = $2`,
      [admin.id, decision.id],
    );
    const action = (
      await client.query(
        `insert into public.comun_collective_actions(
          slug, title, summary, objective, action_type, status, visibility,
          participation_mode, pauta_id, created_by_admin_id
        ) values ($1, 'Ação sintética privada',
          'Ação usada somente dentro da transação do ensaio.',
          'Comprovar tarefas, encaminhamento, resultado e memória sem publicação.',
          'collective_forwarding', 'open', 'internal', 'remote', $2, $3)
        returning id`,
        [`rehearsal-${suffix}`, pauta.id, admin.id],
      )
    ).rows[0];
    await client.query(
      `insert into public.comun_collective_action_tasks(
        action_id, title, description, state
      ) values ($1, 'Tarefa sintética', 'Atividade da fixture privada.', 'open')`,
      [action.id],
    );
    const forwarding = (
      await client.query(
        `insert into public.comun_collective_action_forwardings(
          action_id, recipient_name, public_summary, sent_at, state,
          public_visible, created_by_admin_id
        ) values ($1, 'Destino sintético', 'Encaminhamento não enviado externamente.',
          now(), 'sent', false, $2)
        returning id`,
        [action.id, admin.id],
      )
    ).rows[0];
    const report = (
      await client.query(
        `insert into public.comun_reports(
          protocol, community_slug, title, raw_text, public_text, status,
          can_publish_sanitized, risk_level
        ) values ($1, $2, 'Relato sintético privado', 'Fixture privada',
          'Resumo sintético seguro.', 'sanitized', false, 'low')
        returning id`,
        [`COMUN-REHEARSAL-${suffix}`, community.slug],
      )
    ).rows[0];
    const protocol = (
      await client.query(
        `insert into public.comun_official_protocols(
          report_id, comun_protocol, channel, agency,
          official_protocol_number, submitted_by_user, submitted_at,
          expected_response_at, status, response_received_at, public_summary
        ) values ($1, $2, 'ensaio', 'Destino sintético', $3, false, now(),
          now() + interval '7 days', 'response_received', now(),
          'Resposta sintética revisada; nenhum envio externo ocorreu.')
        returning id`,
        [report.id, `COMUN-REHEARSAL-${suffix}`, `SYNTHETIC-${suffix}`],
      )
    ).rows[0];
    await client.query(
      `insert into public.comun_pauta_evidence_items(
        pauta_id, source_type, source_id, title, summary, evidence_type,
        sensitivity, status, public_note
      ) values ($1, 'official_protocol', $2, 'Protocolo sintético',
        'Evidência transacional privada.', 'protocolo', 'private_only',
        'approved', null)`,
      [pauta.id, protocol.id],
    );
    const result = (
      await client.query(
        `insert into public.comun_hub_results(
          pauta_id, slug, title, result_type, public_summary,
          verification_status, visibility, occurred_at,
          evidence_summary_public
        ) values ($1, $2, 'Resultado sintético', 'learning',
          'Resultado verificado apenas dentro da transação.',
          'verified', 'public', now(), 'Evidência sintética revisada.')
        returning id`,
        [pauta.id, `rehearsal-${suffix}`],
      )
    ).rows[0];
    const cycle = (
      await client.query(
        `insert into public.comun_pauta_action_cycles(
          pauta_id, current_stage, decision_id, collective_action_id,
          forwarding_id, official_protocol_id, result_id,
          next_action_public, responsible_role, public_visible,
          cycle_scope, rehearsal_cycle_id
        ) values ($1, 'contribution', $2, $3, $4, $5, $6,
          'Revisar fixture privada.', 'editor', false,
          'controlled_rehearsal', $7)
        returning id, state_version`,
        [
          pauta.id,
          decision.id,
          action.id,
          forwarding.id,
          protocol.id,
          result.id,
          namespace,
        ],
      )
    ).rows[0];
    cycleId = cycle.id;

    await client.query("savepoint negative_transition");
    try {
      await transition(client, {
        cycleId,
        version: cycle.state_version,
        namespace,
        to: "result",
        actorId: admin.id,
        actorRole: admin.role,
      });
      throw new Error("COMUN_PAUTA_ACTION_CYCLE_NEGATIVE_TRANSITION_ACCEPTED");
    } catch (error) {
      await client.query("rollback to savepoint negative_transition");
      assert.match(String(error?.message ?? error), /INVALID_TRANSITION/);
      negativeTransitionBlocked = true;
    }
    await client.query("release savepoint negative_transition");

    let version = cycle.state_version;
    for (const stage of rehearsalStages) {
      if (stage === "forwarding") {
        await client.query(
          `update public.comun_collective_actions
           set status = 'awaiting_result', updated_at = now()
           where id = $1`,
          [action.id],
        );
        const current = await client.query(
          `select current_stage from public.comun_pauta_action_cycles where id = $1`,
          [cycleId],
        );
        activityDidNotResolve = current.rows[0]?.current_stage === "tasks";
      }
      if (stage === "reopened") {
        await client.query(
          `update public.comun_collective_actions
           set status = 'completed', completed_at = now(),
             result_status = 'achieved',
             result_summary = 'Resultado sintético verificado.',
             memory_summary = 'Memória sintética revisada.',
             memory_published_at = now(), updated_at = now()
           where id = $1`,
          [action.id],
        );
      }
      version = await transition(client, {
        cycleId,
        version,
        namespace,
        to: stage,
        actorId: admin.id,
        actorRole: admin.role,
      });
      passedStages.push(stage);
    }
    await client.query("set local role anon");
    const publicRows = await client.query(
      `select count(*)::int as count
       from public.comun_pauta_action_cycles
       where rehearsal_cycle_id = $1`,
      [namespace],
    );
    assert.equal(publicRows.rows[0].count, 0);
    controlledRehearsalHidden = true;
    await client.query("reset role");

    await client.query(
      `update public.comun_pauta_action_cycles
       set cycle_scope = 'production', rehearsal_cycle_id = null,
         public_visible = true
       where id = $1`,
      [cycleId],
    );
    await client.query(
      `update public.comun_pauta_spaces
       set visibility = 'public'
       where id = $1`,
      [pauta.id],
    );
    await client.query(
      `update public.comun_pauta_action_cycle_events
       set public_visible = true
       where cycle_id = $1`,
      [cycleId],
    );
    await client.query(
      `update public.comun_pauta_action_cycle_events
       set private_note = 'nota sintética privada'
       where cycle_id = $1 and to_stage = 'moderation'`,
      [cycleId],
    );
    await client.query("set local role anon");
    const rls = await client.query(
      `select
        (select count(*)::int from public.comun_pauta_action_cycles
          where id = $1) as cycles,
        (select count(*)::int from public.comun_pauta_decisions
          where id = $2) as decisions,
        (select count(*)::int from public.comun_pauta_action_cycle_events
          where cycle_id = $1) as visible_events,
        has_table_privilege('anon',
          'public.comun_pauta_action_cycles', 'insert') as anon_can_insert`,
      [cycleId, decision.id],
    );
    assert.equal(rls.rows[0].cycles, 1);
    assert.equal(rls.rows[0].decisions, 1);
    assert.equal(rls.rows[0].visible_events, passedStages.length - 1);
    assert.equal(rls.rows[0].anon_can_insert, false);
    publicProjectionRlsGreen = true;
    await client.query("reset role");
    await client.query("rollback");
    const cleanup = await client.query(
      `select count(*)::int as count
       from public.comun_pauta_action_cycles
       where rehearsal_cycle_id = $1`,
      [namespace],
    );
    assert.equal(cleanup.rows[0].count, 0);

    const artifact = {
      formatVersion: 1,
      rehearsalType: "pauta_action_cycle_controlled",
      target,
      namespacePattern: "pauta-action-cycle-YYYYMMDD-NN",
      authenticatedActors: 2,
      passedStages,
      negativeTransitionBlocked,
      activityDidNotResolve,
      officialProtocolExternalSend: false,
      publicVisibility: false,
      controlledRehearsalHidden,
      publicProjectionRlsGreen,
      transactionRolledBack: true,
      postflightSyntheticRows: 0,
      databaseWritesAfterPostflight: "none",
      storageWrites: "none",
      containsPrivateData: false,
      result: "COMUN_PAUTA_ACTION_CYCLE_REHEARSAL_GREEN",
    };
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    return artifact;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : ".ci-artifacts/pauta-action-cycle-rehearsal/rehearsal.json";
  const connectionString =
    process.env.COMUN_COLLECTIVE_ACTIONS_DATABASE_URL ??
    process.env.SUPABASE_DB_URL;
  if (!connectionString)
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_REHEARSAL_DATABASE_MISSING");
  const artifact = await runPautaActionCycleRehearsal({
    connectionString,
    controlledRemote: process.argv.includes("--controlled-remote"),
    confirmation: process.env.COMUN_PAUTA_ACTION_CYCLE_REHEARSAL_CONFIRMATION,
    projectRef: process.env.SUPABASE_PROJECT_REF,
    output,
  });
  process.stdout.write(`${artifact.result}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `${String(error?.message ?? "COMUN_PAUTA_ACTION_CYCLE_REHEARSAL_FAILED")}\n`,
    );
    process.exitCode = 1;
  });
}
