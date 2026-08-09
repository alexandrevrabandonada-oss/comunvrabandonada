import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("48.1C documents F2 as active without claiming the human target", async () => {
  const contract = await read("docs/comun-motorola-friction-contract.md");
  assert.match(contract, /F1 — acesso/);
  assert.match(contract, /F2 — Capture First ativo/);
  assert.match(contract, /foto ou frase/i);
  assert.match(contract, /Vi um problema.*\/comun\/relatar/s);
  assert.doesNotMatch(contract, /F2 — captura futura/);
  assert.match(contract, /ainda não foi medida nem atingida/i);
});

test("pilot protocol defines seven journeys, metrics and start guardrails", async () => {
  const protocol = await read("docs/comun-48-1c-motorola-pilot-protocol.md");
  for (let journey = 1; journey <= 7; journey += 1) {
    assert.match(protocol, new RegExp(`J${journey} —`));
  }
  for (const value of [
    "under_15s",
    "15_to_30s",
    "31_to_60s",
    "over_60s",
    "completed_without_help",
    "completed_with_hint",
    "abandoned",
    "blocked_by_bug",
    "understood",
    "partially_understood",
    "did_not_understand",
  ])
    assert.match(protocol, new RegExp(value));
  assert.match(protocol, /PREPARED — NO HUMAN SESSIONS YET/);
  assert.match(protocol, /Google Auth não entra nas sete jornadas iniciais/);
  assert.match(protocol, /launch_publicly=false/);
  assert.match(protocol, /3 participantes independentes/);
  assert.match(protocol, /alvo: 5/i);
});

test("session template exposes only the allowed observation fields", async () => {
  const template = await read(
    "reports/templates/comun-48-1c-human-session.template.md",
  );
  const yaml = template.match(/```yaml\n([\s\S]*?)\n```/)?.[1] ?? "";
  const fields = yaml
    .split("\n")
    .map((line) => line.match(/^([a-z_]+):/)?.[1])
    .filter(Boolean);
  assert.deepEqual(fields, [
    "session_code",
    "device_class",
    "journey",
    "start_time_bucket",
    "duration_bucket",
    "interaction_band",
    "result",
    "hint_used",
    "comprehension",
    "finding_ids",
    "observer_notes_sanitized",
  ]);
  assert.doesNotMatch(
    yaml,
    /^(?:name|nome|email|telefone|bairro|age|idade|account|conta|protocol|protocolo|user_id|text|texto|photo|foto|coordinate|coordenada|cookie|token):/m,
  );
});

test("aggregate report records the paused P1 without counting a journey success", async () => {
  const report = await read("reports/current/comun-48-1c-motorola-pilot.md");
  assert.match(report, /PILOTO PAUSADO FOCALMENTE — J1\/J3/);
  assert.match(report, /participantes completos contabilizados: `0`/);
  assert.match(report, /tentativas humanas iniciadas: `1`/);
  assert.match(report, /MOTOROLA-P1-001 — aberto/);
  assert.match(report, /P01 \/ J1.*P01 \/ J3/s);
  assert.match(report, /não conta como sucesso da jornada/);
  assert.match(report, /reteste: pendente/);
  assert.match(report, /migrations 48\.1C: `0`/);
  assert.match(report, /P6B permanece proibido/);
});

test("cleanup is logical, complete and blocks external actions", async () => {
  const cleanup = await read("docs/comun-48-1c-motorola-pilot-cleanup.md");
  for (const contract of [
    "Retirar o Relata",
    "retirada lógica da foto",
    "retirada lógica da localização privada",
    "Retirar o adapter especializado",
    "Arquivar o item",
    "zero package e zero attempt ativo",
    "zero publicação",
    "zero coletivo",
    "zero forwarding `sent`",
    "zero request externo",
    "zero hard delete",
  ])
    assert.match(cleanup, new RegExp(contract, "i"));
  assert.match(cleanup, /Nunca usar hard delete/);
});

test("existing capture telemetry remains content-free and uncorrelated", async () => {
  const route = await read("app/api/comun/capture/telemetry/route.ts");
  const migration = await read(
    "supabase/local-migrations/20260804022743_comun_capture_quick_capture_convergence.sql",
  );
  const table =
    migration.match(
      /create table private\.comun_relata_capture_events \(([\s\S]*?)\n\);/,
    )?.[1] ?? "";
  const rpc =
    migration.match(
      /create or replace function public\.comun_relata_record_capture_event\(([\s\S]*?)\n\$\$;/,
    )?.[0] ?? "";

  for (const field of [
    "eventType",
    "interactionCount",
    "durationBucket",
    "category",
    "errorCode",
  ]) {
    assert.match(route, new RegExp(field));
  }
  assert.doesNotMatch(
    route,
    /body\.(?:name|email|phone|address|userId|protocol|text|photo|latitude|longitude|cookie|token)\b/,
  );
  assert.doesNotMatch(
    route,
    /request\.headers|user-agent|x-forwarded-for|request\.ip/i,
  );
  assert.match(table, /event_type text not null/);
  assert.match(table, /interaction_count integer/);
  assert.match(table, /duration_bucket text/);
  assert.match(table, /category text/);
  assert.match(table, /error_code text/);
  assert.doesNotMatch(
    table,
    /\b(?:user_id|report_id|case_id|protocol|receipt|original_text|photo|latitude|longitude|ip|user_agent)\b/,
  );
  assert.match(rpc, /security definer/);
  assert.match(
    migration,
    /revoke all on table private\.comun_relata_capture_events from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /alter table private\.comun_relata_capture_events force row level security/,
  );
});
