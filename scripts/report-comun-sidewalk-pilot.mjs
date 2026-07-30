import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  SIDEWALK_PILOT,
  summarizeSidewalkPilot,
} from "../lib/sidewalk-pilot.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SIDEWALK_PILOT_CONFIGURATION_MISSING");

const db = createClient(url, key, { auth: { persistSession: false } });
const [uploadsResult, recordsResult, photosResult] = await Promise.all([
  db
    .from("comun_sidewalk_uploads")
    .select(
      "member_user_id,status,confirmation_state,failure_code,created_at,record_id",
    )
    .gte("created_at", SIDEWALK_PILOT.startAt)
    .lt("created_at", SIDEWALK_PILOT.endAt)
    .order("created_at", { ascending: false })
    .limit(1000),
  db
    .from("comun_sidewalk_records")
    .select("id,status,visibility,created_at,updated_at,inferred_neighborhood")
    .gte("created_at", SIDEWALK_PILOT.startAt)
    .lt("created_at", SIDEWALK_PILOT.endAt)
    .order("created_at", { ascending: false })
    .limit(1000),
  db
    .from("comun_sidewalk_record_photos")
    .select("record_id,review_status,is_public")
    .limit(1000),
]);

if (uploadsResult.error || recordsResult.error || photosResult.error)
  throw new Error("SIDEWALK_PILOT_READ_FAILED");

const summary = summarizeSidewalkPilot({
  uploads: uploadsResult.data ?? [],
  records: recordsResult.data ?? [],
  photos: photosResult.data ?? [],
});
const generatedAt = new Date().toISOString();
const result = {
  cycleId: "sidewalk-territorial-pilot-20260730-46-2",
  generatedAt,
  result:
    summary.status === "green"
      ? "COMUN_SIDEWALK_PILOT_OBSERVATION_GREEN"
      : "COMUN_SIDEWALK_PILOT_OBSERVATION_ATTENTION",
  phase: summary.phase,
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

const outputDir = process.env.COMUN_ARTIFACT_DIR ?? ".ci-artifacts/sidewalk-pilot";
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
  `- Gerado em: ${generatedAt}`,
  `- Participantes: ${summary.metrics.participants}/${SIDEWALK_PILOT.participantTarget}`,
  `- Registros: ${summary.metrics.records}/${SIDEWALK_PILOT.recordTarget}`,
  `- Publicados: ${summary.metrics.published}`,
  `- Conclusão: ${summary.metrics.completionRatePct}%`,
  `- Falha técnica: ${summary.metrics.technicalFailureRatePct}%`,
  `- Moderação no SLA: ${summary.metrics.moderationSlaPct}%`,
  `- Retorno: ${summary.metrics.returnRatePct}%`,
  `- Territórios alcançados: ${summary.progress.territoriesReached}/${SIDEWALK_PILOT.territoryTarget}`,
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
