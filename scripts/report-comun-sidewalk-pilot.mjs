import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { assertCompletePilotRead } from "../lib/sidewalk-pilot-read-contract.ts";
import {
  SIDEWALK_PILOT,
  classifySidewalkPilotCloseout,
  summarizeSidewalkPilot,
} from "../lib/sidewalk-pilot.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SIDEWALK_PILOT_CONFIGURATION_MISSING");

const db = createClient(url, key, { auth: { persistSession: false } });
const [uploadsResult, recordsResult] = await Promise.all([
  db
    .from("comun_sidewalk_uploads")
    .select(
      "member_user_id,status,confirmation_state,failure_code,created_at,record_id",
      { count: "exact" },
    )
    .gte("created_at", SIDEWALK_PILOT.startAt)
    .lt("created_at", SIDEWALK_PILOT.endAt)
    .order("created_at", { ascending: false })
    .limit(1000),
  db
    .from("comun_sidewalk_records")
    .select(
      "id,status,visibility,forwarding_status,verification_status,created_at,updated_at,inferred_neighborhood",
      { count: "exact" },
    )
    .gte("created_at", SIDEWALK_PILOT.startAt)
    .lt("created_at", SIDEWALK_PILOT.endAt)
    .order("created_at", { ascending: false })
    .limit(1000),
]);

for (const result of [uploadsResult, recordsResult])
  assertCompletePilotRead(result);

const recordIds = (recordsResult.data ?? []).map((row) => row.id);
const [
  photosResult,
  prioritiesResult,
  linksResult,
  observationsResult,
  incidentsResult,
] = await Promise.all([
  recordIds.length
    ? db
        .from("comun_sidewalk_record_photos")
        .select("record_id,review_status,is_public", { count: "exact" })
        .in("record_id", recordIds)
        .limit(1000)
    : Promise.resolve({ data: [], error: null, count: 0 }),
  recordIds.length
    ? db
        .from("comun_sidewalk_priorities")
        .select("id,record_id,status", { count: "exact" })
        .in("record_id", recordIds)
        .limit(2000)
    : Promise.resolve({ data: [], error: null, count: 0 }),
  recordIds.length
    ? db
        .from("comun_sidewalk_record_links")
        .select("record_id,target_type", { count: "exact" })
        .in("record_id", recordIds)
        .limit(5000)
    : Promise.resolve({ data: [], error: null, count: 0 }),
  recordIds.length
    ? db
        .from("comun_sidewalk_observations")
        .select("record_id,observation_type,status", { count: "exact" })
        .in("record_id", recordIds)
        .limit(5000)
    : Promise.resolve({ data: [], error: null, count: 0 }),
  db
    .from("comun_admin_alerts")
    .select("severity,status,source_type,alert_type", { count: "exact" })
    .in("status", ["open", "acknowledged"])
    .limit(1000),
]);
for (const query of [
  photosResult,
  prioritiesResult,
  linksResult,
  observationsResult,
  incidentsResult,
]) {
  assertCompletePilotRead(query);
}
const priorityIds = (prioritiesResult.data ?? []).map((row) => row.id);
const forwardingsResult = priorityIds.length
  ? await db
      .from("comun_sidewalk_forwardings")
      .select("priority_id,state,action_id,protocol_id,result_id,memory_id", {
        count: "exact",
      })
      .in("priority_id", priorityIds)
      .limit(2000)
  : { data: [], error: null, count: 0 };
assertCompletePilotRead(forwardingsResult);
const incidents = (incidentsResult.data ?? [])
  .filter(
    (row) =>
      String(row.source_type ?? "").includes("sidewalk") ||
      String(row.alert_type ?? "").startsWith("sidewalk_"),
  )
  .map(({ severity, status }) => ({ severity, status }));

const summary = summarizeSidewalkPilot({
  uploads: uploadsResult.data ?? [],
  records: recordsResult.data ?? [],
  photos: photosResult.data ?? [],
  priorities: prioritiesResult.data ?? [],
  links: linksResult.data ?? [],
  forwardings: forwardingsResult.data ?? [],
  observations: observationsResult.data ?? [],
  incidents,
});
const closeout = classifySidewalkPilotCloseout(summary);
const generatedAt = new Date().toISOString();
const result = {
  cycleId: "sidewalk-territorial-pilot-20260730-46-2",
  generatedAt,
  readContract: {
    completeness: "exact_count_matches_returned_rows",
    consistency: "independent_queries_not_transactional_snapshot",
  },
  result: closeout.result,
  phase: summary.phase,
  closeout,
  pilot: summary.pilot,
  metrics: summary.metrics,
  progress: summary.progress,
  findings: summary.findings,
  privacy: {
    containsCoordinates: false,
    containsPersonalData: false,
    containsUserIds: false,
    containsRecordIds: false,
    containsObjectKeys: false,
  },
};

const outputDir =
  process.env.COMUN_ARTIFACT_DIR ?? ".ci-artifacts/sidewalk-pilot";
await mkdir(outputDir, { recursive: true });
await writeFile(
  `${outputDir}/comun-sidewalk-pilot.json`,
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);

const lines = [
  "# Piloto territorial do Mapa das Calçadas",
  "",
  `- Resultado: \`${result.result}\``,
  `- Fase: \`${summary.phase}\``,
  `- Fechamento: \`${closeout.status}\``,
  `- Gerado em: ${generatedAt}`,
  `- Participantes: ${summary.metrics.participants}/${SIDEWALK_PILOT.participantTarget}`,
  `- Registros: ${summary.metrics.records}/${SIDEWALK_PILOT.recordTarget}`,
  `- Publicados: ${summary.metrics.published}`,
  `- Conclusão: ${summary.metrics.completionRatePct}%`,
  `- Falha técnica: ${summary.metrics.technicalFailureRatePct}%`,
  `- Moderação no SLA: ${summary.metrics.moderationSlaPct}%`,
  `- Retorno: ${summary.metrics.returnRatePct}%`,
  `- Territórios alcançados: ${summary.progress.territoriesReached}/${SIDEWALK_PILOT.territoryTarget}`,
  `- Registros órfãos: ${summary.metrics.orphanRecords}`,
  `- Vínculos: prioridade ${summary.metrics.recordsLinkedToPriority}, ação ${summary.metrics.recordsLinkedToAction}, protocolo ${summary.metrics.recordsLinkedToProtocol}, resposta ${summary.metrics.recordsWithResponse}`,
  `- Verificações de campo: ${summary.metrics.fieldVerifications}`,
  `- Resoluções: ${summary.metrics.resolutions}; reaberturas: ${summary.metrics.reopenings}`,
  `- Incidentes: P0 ${summary.metrics.incidents.P0}, P1 ${summary.metrics.incidents.P1}, P2 ${summary.metrics.incidents.P2}`,
  "",
  "## Bairros observados",
  "",
  ...(summary.metrics.neighborhoods.length
    ? summary.metrics.neighborhoods.map(
        (item) => `- ${item.name}: ${item.count}`,
      )
    : ["- Nenhum registro na janela."]),
  "",
  "## Findings",
  "",
  ...(summary.findings.length
    ? summary.findings.map((finding) => `- ${finding}`)
    : ["- Nenhum finding operacional."]),
  "",
  "O relatório não contém coordenadas, identificadores de pessoas, registros ou objetos privados.",
  "",
];
await writeFile(
  `${outputDir}/comun-sidewalk-pilot.md`,
  lines.join("\n"),
  "utf8",
);

console.log(JSON.stringify(result));
