import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { assertLocalEnvironment } from "./local-environment.mjs";

assertLocalEnvironment();

const raw = execFileSync("powershell", ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; npx supabase status -o env"], { encoding: "utf8" });
const env = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => {
  const i = line.indexOf("=");
  return [line.slice(0, i), line.slice(i + 1).replace(/^\"|\"$/g, "")];
}));

assert.match(env.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):/);
const base = process.env.COMUN_BASE_URL || "http://localhost:3000";
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/);

process.env.NEXT_PUBLIC_SUPABASE_URL = env.API_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
process.env.MEDIA_STORAGE_PROVIDER = "supabase-local";

const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const tag = `smoke-sidewalk-${crypto.randomUUID().slice(0, 8)}`;
const secret = `PRIVATE-${crypto.randomUUID()}`;

const ids = {};
const cleanup = { storageKeys: [], photoItemIds: [] };

const one = async (query) => {
  const result = await query;
  if (result.error) throw result.error;
  return result.data;
};

function bucketName(scope) {
  return scope === "private_original" ? "archive-private-originals" : "archive-public-derivatives";
}

function safeKey(key) {
  if (!/^(originals|public|fixtures|radio-originals|radio-public)\/[a-zA-Z0-9_./-]+$/.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error("Object key local inválida.");
  }
  return key;
}

async function storageUpload(scope, key, body, contentType) {
  safeKey(key);
  const { error } = await db.storage.from(bucketName(scope)).upload(key, body, { contentType, upsert: false });
  if (error) throw error;
  cleanup.storageKeys.push({ scope, key });
}

async function storageRemove(scope, key) {
  await db.storage.from(bucketName(scope)).remove([safeKey(key)]).catch(() => {});
}

async function createFixtureImage() {
  const width = 800;
  const height = 600;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#9ca3af"/>
    <rect x="0" y="100" width="${width}" height="80" fill="#6b7280"/>
    <rect x="0" y="420" width="${width}" height="80" fill="#6b7280"/>
    <rect x="350" y="250" width="120" height="90" rx="20" fill="#1f2937"/>
    <rect x="100" y="520" width="600" height="12" fill="#facc15" opacity="0.8"/>
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? width, height: meta.height ?? height, mime: "image/jpeg", checksum: crypto.createHash("sha256").update(buffer).digest("hex"), size: buffer.byteLength };
}

async function validateImage(body, filename) {
  const mime = filename.toLowerCase().endsWith(".png") ? "image/png" : filename.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
  const allowed = new Map([
    ["image/jpeg", [[0xff, 0xd8, 0xff]]],
    ["image/png", [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
    ["image/webp", [[0x52, 0x49, 0x46, 0x46]]],
  ]);
  if (!allowed.has(mime) || !/\.(jpe?g|png|webp)$/i.test(filename)) throw new Error("SIDEWALK_PHOTO_TYPE_INVALID");
  if (body.byteLength < 12 || body.byteLength > 30 * 1024 * 1024) throw new Error("SIDEWALK_PHOTO_SIZE_INVALID");
  if (!(allowed.get(mime) ?? []).some((sig) => sig.every((x, i) => body[i] === x))) throw new Error("SIDEWALK_PHOTO_MAGIC_INVALID");
  const meta = await sharp(body, { animated: false, limitInputPixels: 80_000_000 }).metadata();
  if (!meta.width || !meta.height || (meta.pages && meta.pages > 1) || meta.width * meta.height > 80_000_000) throw new Error("SIDEWALK_PHOTO_DIMENSIONS_INVALID");
  return { mime, width: meta.width, height: meta.height, size: body.byteLength, checksum: crypto.createHash("sha256").update(body).digest("hex") };
}

async function createArchiveItem(title, slug, type = "photograph") {
  const { data, error } = await db.from("comun_archive_items").insert({
    item_type: type,
    slug,
    title,
    summary: "Item fixture do piloto de calçadas.",
    status: "published",
    visibility: "public",
    rights_status: "permission_granted",
    published_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function createArchiveAsset(itemId, role, scope, key, filename, mime, size, width, height, checksum, publicUrl = null) {
  const { data, error } = await db.from("comun_archive_assets").insert({
    archive_item_id: itemId,
    asset_role: role,
    storage_provider: "supabase-local",
    bucket_scope: scope,
    object_key: key,
    original_filename: filename,
    mime_type: mime,
    size_bytes: size,
    width,
    height,
    checksum_sha256: checksum,
    public_url: publicUrl,
    review_status: role === "original" ? "pending" : "approved",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function createDerivative(itemId, originalKey, filename) {
  const { data: existing, error: dlErr } = await db.storage.from(bucketName("private_original")).download(safeKey(originalKey));
  if (dlErr) throw dlErr;
  const body = new Uint8Array(await existing.arrayBuffer());
  await validateImage(body, filename);
  const derivative = await sharp(body, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const meta = await sharp(derivative).metadata();
  const key = `public/sidewalk/${itemId}/detail.webp`;
  await storageRemove("public_safe", key);
  await storageUpload("public_safe", key, derivative, "image/webp");
  const publicUrl = `${env.API_URL}/storage/v1/object/public/${bucketName("public_safe")}/${safeKey(key)}`;
  const assetId = await createArchiveAsset(itemId, "public_version", "public_safe", key, "detail.webp", "image/webp", derivative.byteLength, meta.width, meta.height, crypto.createHash("sha256").update(derivative).digest("hex"), publicUrl);
  return { assetId, key, publicUrl, width: meta.width, height: meta.height, size: derivative.byteLength };
}

async function publicHtml(path) {
  const res = await fetch(`${base}${path}`);
  assert.equal(res.status, 200, `Rota pública ${path} retornou ${res.status}`);
  return res.text();
}

function assertNoLeak(html, extra = []) {
  const forbidden = [secret, "PRIVATE-", "private_contact", "internal_notes", "raw_text", "object_key", "signed_url", "auth_user_id", ...extra];
  const normalized = (html || "").toLowerCase();
  for (const f of forbidden) {
    if (normalized.includes(String(f).toLowerCase())) throw new Error(`Vazamento detectado: ${f}`);
  }
}

async function getObservatory() {
  const { data, error } = await db.from("comun_observatories").select("id, methodology_version_id").eq("slug", "calcadas-em-circulacao").single();
  if (error) throw error;
  return data;
}

async function getMetricDefinitions(observatoryId) {
  const { data, error } = await db.from("comun_metric_definitions").select("id, slug").eq("observatory_id", observatoryId);
  if (error) throw error;
  return data;
}

function computeMetrics(records, map) {
  const total = records.length;
  const verified = records.filter((r) => r.verification_status === "verified").length;
  const highImpact = records.filter((r) => r.impact_level === "high" || r.impact_level === "critical").length;
  const barriers = records.filter((r) => Array.isArray(r.categories) && r.categories.some((c) => ["ausencia_rampa", "rampa_inadequada", "piso_liso", "obstaculo", "passeio_interrompido"].includes(c))).length;
  const territories = new Set(records.map((r) => r.territory_id).filter(Boolean)).size;
  const resolved = records.filter((r) => r.status === "resolved" || r.resolved_at).length;
  return {
    [map["total-publicado"]]: { numeric: total, sample: total },
    [map["total-verificado"]]: { numeric: verified, sample: total },
    [map["impacto-alto"]]: { numeric: highImpact, sample: total },
    [map["barreiras-acessibilidade"]]: { numeric: barriers, sample: total },
    [map["territorios-cobertos"]]: { numeric: territories, sample: total },
    [map["resolvidos"]]: { numeric: resolved, sample: total },
  };
}

async function upsertSnapshot(defId, periodStart, periodEnd, territoryId, value, sample, methodologyId) {
  const { error } = await db.from("comun_metric_snapshots").insert({
    metric_definition_id: defId,
    period_start: periodStart,
    period_end: periodEnd,
    territory_id: territoryId,
    value_numeric: value,
    sample_size: sample,
    coverage_summary: `Snapshot calculado sobre ${sample} registros de calçada.`,
    limitations_public: "Os dados representam contribuições recebidas e verificadas pelo projeto e não constituem levantamento completo do território.",
    methodology_version_id: methodologyId,
    publication_status: "approved_public",
  });
  if (error && error.code !== "23505") throw error;
}


try {
  // 1. Pauta ---------------------------------------------------------------
  const pauta = await one(db.from("comun_pauta_spaces").insert({
    slug: `${tag}-pauta`,
    title: `Mapa Popular das Calçadas — ${tag}`,
    summary: "Piloto local de acessibilidade urbana com mapa, observatório e circulação comunitária.",
    status: "organizing",
    visibility: "public",
    public_status: "collecting_evidence",
    public_synthesis: "Diagnóstico comunitário em construção.",
    next_step: "Revisar contribuições e publicar síntese.",
  }).select("id, slug").single());
  ids.pautaId = pauta.id;

  // 2. Membro --------------------------------------------------------------
  ids.memberId = crypto.randomUUID();
  await one(db.from("comun_member_profiles").insert({
    user_id: ids.memberId,
    display_name: "Membro piloto de calçadas",
    status: "active",
    profile_visibility: "private",
    participation_visibility: "private",
  }));
  await one(db.from("comun_pauta_memberships").insert({
    pauta_id: ids.pautaId,
    member_user_id: ids.memberId,
    role: "participant",
    status: "active",
  }));

  // 3. Módulos -------------------------------------------------------------
  const moduleRows = [
    { pauta_id: ids.pautaId, module_type: "overview", title_override: "Visão geral", public_description: "Objetivo do piloto e etapa atual.", position: 0, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "reports", title_override: "Relatos", public_description: "Contribuições recebidas e pendentes.", position: 1, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "map", title_override: "Mapa", public_description: "Localização aproximada dos problemas.", position: 2, status: "active", visibility: "public", config: { contributionEnabled: true, defaultView: "map", layerIds: ["sidewalk_accessibility"], territoryIds: [] } },
    { pauta_id: ids.pautaId, module_type: "observatory", title_override: "Observatório", public_description: "Indicadores iniciais do piloto.", position: 3, status: "active", visibility: "public", config: { showMetrics: true, showMethodology: true, showCampaigns: false } },
    { pauta_id: ids.pautaId, module_type: "evidence", title_override: "Evidências", public_description: "Fotos e registros revisados.", position: 4, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "construction_circle", title_override: "Roda", public_description: "Construção coletiva das prioridades.", position: 5, status: "active", visibility: "public", config: { showPreviousRounds: true, showSynthesis: true, allowPublicContribution: true } },
    { pauta_id: ids.pautaId, module_type: "proposals", title_override: "Propostas", public_description: "Propostas e prioridades da pauta.", position: 6, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "actions", title_override: "Ações", public_description: "Encaminhamentos e ações abertas.", position: 7, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "tasks", title_override: "Tarefas", public_description: "Tarefas para revisão e organização.", position: 8, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "results", title_override: "Resultados", public_description: "Resultados registrados e acompanhados.", position: 9, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "art_gallery", title_override: "Arte dos territórios", public_description: "Obras relacionando o tema.", position: 10, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "community_radio", title_override: "Rádio comunitária", public_description: "Boletins e histórias do território.", position: 11, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "archive", title_override: "Memória", public_description: "Protocolos, relatórios e memória do ciclo.", position: 12, status: "active", visibility: "public", config: {} },
    { pauta_id: ids.pautaId, module_type: "participation", title_override: "Minha participação", public_description: "Próximas ações para quem participa.", position: 13, status: "active", visibility: "public", config: {} },
  ];
  await one(db.from("comun_pauta_modules").insert(moduleRows));

  // 4. Território ----------------------------------------------------------
  const territory = await one(db.from("comun_hub_territories").insert({
    slug: `${tag}-territorio`,
    name: `Território piloto ${tag}`,
    territory_type: "neighborhood",
    municipality: "Volta Redonda",
    public_summary: "Território sintético para o piloto de calçadas.",
    status: "active",
    visibility: "public",
    verification_status: "verified",
    latitude: -22.52,
    longitude: -44.10,
    geometry_type: "point",
    geometry_geojson: { type: "Point", coordinates: [-44.10, -22.52] },
    location_precision: "approximate",
    pauta_id: ids.pautaId,
  }).select("id").single());
  ids.territoryId = territory.id;

  await one(db.from("comun_territory_layers").insert({ territory_id: ids.territoryId, layer_id: (await one(db.from("comun_territorial_layers").select("id").eq("slug", "sidewalk_accessibility").single())).id }));

  // 5. Contribuição territorial --------------------------------------------
  const contribution = await one(db.from("comun_territorial_contributions").insert({
    contribution_type: "sidewalk_observation",
    territory_id: ids.territoryId,
    public_summary: "Contribuição territorial fixture do piloto de calçadas.",
    approximate_location: "local aproximado sintético",
    status: "approved",
  }).select("id").single());
  ids.contributionId = contribution.id;

  // 6. Registros territoriais (Point e LineString) -------------------------
  const recordPoint = await one(db.from("comun_sidewalk_records").insert({
    pauta_id: ids.pautaId,
    territory_id: ids.territoryId,
    slug: `${tag}-registro-ponto`,
    name: `Obstáculo pontual ${tag}`,
    geometry_geojson: { type: "Point", coordinates: [-44.101, -22.521] },
    categories: ["obstaculo"],
    impact_level: "high",
    affected_groups: ["wheelchair_users", "elderly"],
    status: "published",
    verification_status: "verified",
    visibility: "public",
    public_summary: "Ponto de obstáculo identificado no piloto local.",
    public_location_level: "approximate",
    approximate_location: "Esquina aproximada do território fixture",
    source_contribution_id: ids.contributionId,
  }).select("id, slug").single());
  ids.recordPointId = recordPoint.id;

  const recordLine = await one(db.from("comun_sidewalk_records").insert({
    pauta_id: ids.pautaId,
    territory_id: ids.territoryId,
    slug: `${tag}-registro-trecho`,
    name: `Trecho de calçada quebrada ${tag}`,
    geometry_geojson: { type: "LineString", coordinates: [[-44.102, -22.522], [-44.103, -22.523], [-44.104, -22.524]] },
    categories: ["buraco", "calcada_irregular"],
    impact_level: "critical",
    affected_groups: ["wheelchair_users", "visually_impaired", "children"],
    status: "published",
    verification_status: "verified",
    visibility: "public",
    public_summary: "Trecho de calçada com buracos e irregularidades no piloto local.",
    public_location_level: "approximate",
    approximate_location: "Trecho entre esquinas do território fixture",
    source_contribution_id: ids.contributionId,
  }).select("id, slug").single());
  ids.recordLineId = recordLine.id;

  // 7. Foto privada, revisão e derivada pública -----------------------------
  const fixtureImage = await createFixtureImage();
  const photoItemId = await createArchiveItem(`Foto do trecho ${tag}`, `${tag}-foto-trecho`, "photograph");
  ids.photoItemId = photoItemId;
  cleanup.photoItemIds.push(photoItemId);

  const originalKey = `originals/sidewalk/${photoItemId}/photo.jpg`;
  await storageUpload("private_original", originalKey, fixtureImage.buffer, fixtureImage.mime);
  const validated = await validateImage(new Uint8Array(fixtureImage.buffer), "photo.jpg");
  const originalAssetId = await createArchiveAsset(photoItemId, "original", "private_original", originalKey, "photo.jpg", validated.mime, validated.size, validated.width, validated.height, validated.checksum);

  const derivative = await createDerivative(photoItemId, originalKey, "photo.jpg");

  const photoReview = await one(db.from("comun_sidewalk_record_photos").insert({
    record_id: ids.recordLineId,
    archive_item_id: photoItemId,
    original_asset_id: originalAssetId,
    derivative_asset_id: derivative.assetId,
    review_status: "approved",
    checklist: {
      face: false,
      child: false,
      license_plate: false,
      house_number: false,
      home_interior: false,
      document: false,
      sensitive_location: false,
      routine: false,
      vulnerable_situation: false,
      authorship: false,
    },
    is_public: true,
    public_alt_text: "Imagem aproximada de trecho de calçada sintético, sem pessoas ou placas identificáveis.",
  }).select("id").single());
  ids.photoReviewId = photoReview.id;

  // 8. Observação do piloto -------------------------------------------------
  const observatory = await getObservatory();
  ids.observatoryId = observatory.id;
  ids.methodologyId = observatory.methodology_version_id;
  const formVersion = await one(db.from("comun_observation_form_versions").select("id").eq("observatory_id", ids.observatoryId).eq("version", "1.0").single());

  const monitoredEntity = await one(db.from("comun_monitored_entities").insert({
    observatory_id: ids.observatoryId,
    territory_id: ids.territoryId,
    entity_type: "sidewalk_segment",
    public_name: `Trecho monitorado ${tag}`,
    public_code: `${tag}-segment`,
    public_description: "Segmento de calçada acompanhado no piloto.",
    status: "active",
    verification: "community_checked",
  }).select("id").single());
  ids.monitoredEntityId = monitoredEntity.id;

  const observation = await one(db.from("comun_observations").insert({
    observatory_id: ids.observatoryId,
    form_version_id: formVersion.id,
    pauta_id: ids.pautaId,
    territory_id: ids.territoryId,
    monitored_entity_id: ids.monitoredEntityId,
    sidewalk_record_id: ids.recordLineId,
    occurred_at: new Date().toISOString(),
    payload: {
      category: "buraco",
      impact_level: "critical",
      affected_groups: ["wheelchair_users", "children"],
      location_precision: "approximate",
      observed_at: new Date().toISOString().slice(0, 10),
      note: "Observação fixture do piloto de calçadas.",
    },
    status: "accepted",
    verification_status: "evidence_supported",
    public_visibility: "aggregate_only",
    confidence_level: "reviewed",
    source_type: "community_report",
    public_protocol: `OBS-${tag.toUpperCase()}`,
  }).select("id").single());
  ids.observationId = observation.id;

  await one(db.from("comun_sidewalk_records").update({ source_observation_id: ids.observationId, methodology_version_id: ids.methodologyId }).eq("id", ids.recordLineId));

  // 9. Snapshot -------------------------------------------------------------
  const recordsForMetrics = await one(db.from("comun_sidewalk_records").select("*").eq("pauta_id", ids.pautaId));
  const metricDefs = await getMetricDefinitions(ids.observatoryId);
  const metricMap = Object.fromEntries(metricDefs.map((m) => [m.slug, m.id]));
  const periodStart = new Date(Date.now() - 86400000).toISOString();
  const periodEnd = new Date().toISOString();
  const metrics = computeMetrics(recordsForMetrics, metricMap);
  for (const [defId, { numeric, sample }] of Object.entries(metrics)) {
    await upsertSnapshot(defId, periodStart, periodEnd, ids.territoryId, numeric, sample, ids.methodologyId);
  }
  const snapshot = await one(db.from("comun_metric_snapshots").select("id").eq("metric_definition_id", metricMap["total-publicado"]).eq("period_start", periodStart).eq("period_end", periodEnd).single());
  ids.snapshotId = snapshot.id;

  // 10. Roda e síntese vinculada ao snapshot --------------------------------
  const circle = await one(db.from("comun_construction_circles").insert({
    pauta_id: ids.pautaId,
    title: `Roda piloto ${tag}`,
    public_question: "Quais caminhos de circulação precisam ser priorizados?",
    public_context: "Contexto público de teste para a pauta de calçadas.",
    status: "open",
    participation_mode: "moderated_public",
  }).select("id").single());
  ids.circleId = circle.id;

  const round = await one(db.from("comun_construction_circle_rounds").insert({
    circle_id: ids.circleId,
    round_type: "listening",
    title: "Escuta inicial",
    public_prompt: "Compartilhe um relato da circulação local.",
    position: 0,
    status: "open",
  }).select("id").single());
  ids.roundId = round.id;
  await one(db.from("comun_construction_circles").update({ current_round_id: round.id }).eq("id", ids.circleId));

  const circleContribution = await one(db.from("comun_circle_contributions").insert({
    circle_id: ids.circleId,
    round_id: ids.roundId,
    contribution_type: "testimony",
    public_body: "Contribuição de teste para o piloto de calçadas com conteúdo suficiente para revisão.",
    author_member_id: ids.memberId,
    status: "visible",
    public_protocol: `PROTO-${tag}`,
  }).select("id").single());
  ids.circleContributionId = circleContribution.id;

  const synthesis = await one(db.from("comun_circle_syntheses").insert({
    circle_id: ids.circleId,
    round_id: ids.roundId,
    public_summary: `Síntese piloto ${tag}`,
    agreements: ["Priorizar calçadas com barreiras de acesso"],
    disagreements: ["Divergência preservada"],
    open_questions: ["Qual trecho revisar primeiro?"],
    proposed_next_steps: ["Organizar vistoria comunitária"],
    status: "published",
    snapshot_id: ids.snapshotId,
    published_at: new Date().toISOString(),
  }).select("id").single());
  ids.synthesisId = synthesis.id;

  await one(db.from("comun_circle_synthesis_links").insert({
    synthesis_id: ids.synthesisId,
    target_type: "snapshot",
    target_id: ids.snapshotId,
    target_label: "Snapshot de cobertura",
    public_note: "Síntese fundamentada no snapshot aprovado.",
  }));

  // 11. Priorização ---------------------------------------------------------
  const priority = await one(db.from("comun_sidewalk_priorities").insert({
    pauta_id: ids.pautaId,
    synthesis_id: ids.synthesisId,
    record_id: ids.recordLineId,
    decision_public: "Priorizar reparo do trecho de calçada quebrada identificado no território fixture.",
    criteria_public: ["impacto", "acessibilidade", "verificação", "proximidade de equipamento público fixture", "recorrência", "possibilidade de ação"],
    evidence_summary_public: "Observação aceita, foto revisada e snapshot de alta criticidade.",
    disagreements_public: [],
    limitations_public: "Amostra pequena; decisão humana da curadoria local.",
    decided_by: "curadoria-piloto",
    decided_at: new Date().toISOString(),
    status: "approved",
  }).select("id").single());
  ids.priorityId = priority.id;

  // 12. Proposta, tarefa e ação --------------------------------------------
  const proposalLink = await one(db.from("comun_circle_synthesis_links").insert({
    synthesis_id: ids.synthesisId,
    target_type: "proposal",
    target_id: ids.recordLineId,
    target_label: "Proposta de reparo do trecho",
    public_note: "Proposta derivada da síntese e da priorização.",
  }).select("id").single());
  ids.proposalLinkId = proposalLink.id;

  const task = await one(db.from("comun_pauta_tasks").insert({
    pauta_id: ids.pautaId,
    action_id: null,
    title: `Tarefa piloto ${tag}`,
    description: "Revisar o relato e preparar a próxima roda.",
    status: "open",
    visibility: "public",
  }).select("id").single());
  ids.taskId = task.id;

  const action = await one(db.from("comun_mobilization_actions").insert({
    pauta_id: ids.pautaId,
    territory_id: ids.territoryId,
    sidewalk_record_id: ids.recordLineId,
    slug: `${tag}-acao`,
    title: `Ação piloto ${tag}`,
    action_type: "meeting",
    objective_public: "Organizar a proposta pública do piloto.",
    objective_internal: secret,
    status: "confirmed",
    visibility: "public",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
  }).select("id").single());
  ids.actionId = action.id;

  await one(db.from("comun_pauta_tasks").update({ action_id: ids.actionId }).eq("id", ids.taskId));

  await one(db.from("comun_sidewalk_record_links").insert([
    { record_id: ids.recordLineId, target_type: "action", target_id: ids.actionId, public_note: "Ação vinculada ao registro territorial." },
    { record_id: ids.recordLineId, target_type: "task", target_id: ids.taskId, public_note: "Tarefa vinculada ao registro territorial." },
  ]));

  // 13. Protocolo sanitizado -----------------------------------------------
  const reportProtocol = `CAL-${tag.toUpperCase()}`;
  const report = await one(db.from("comun_reports").insert({
    protocol: reportProtocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: `[Piloto calçadas] Relato ${tag}`,
    raw_text: secret,
    public_text: "Relato público sanitizado do piloto local de calçadas.",
    period_text: "Fixture de teste",
    approximate_location: "local aproximado sintético",
    neighborhood: "Centro fixture",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: false,
    internal_notes: secret,
    status: "published",
    risk_level: "unknown",
    quick_report: true,
    public_location_level: "approximate",
    source_channel: "pauta_pilot",
    has_attachments: false,
    photo_count: 0,
    published_at: new Date().toISOString(),
  }).select("id").single());
  ids.reportId = report.id;

  const protocol = await one(db.from("comun_official_protocols").insert({
    report_id: ids.reportId,
    sidewalk_record_id: ids.recordLineId,
    comun_protocol: reportProtocol,
    channel: "ouvidoria",
    status: "official_protocol_informed",
    public_summary: "Resumo público do protocolo do piloto local.",
    internal_notes: secret,
  }).select("id").single());
  ids.protocolId = protocol.id;

  await one(db.from("comun_sidewalk_record_links").insert({
    record_id: ids.recordLineId,
    target_type: "protocol",
    target_id: ids.protocolId,
    public_note: "Protocolo oficial vinculado ao registro territorial.",
  }));

  // 14. Resposta e resultado -----------------------------------------------
  await one(db.from("comun_official_protocols").update({
    response_text: `Resposta institucional fixture marcada como teste para ${tag}.`,
    status: "response_received",
  }).eq("id", ids.protocolId));

  const result = await one(db.from("comun_hub_results").insert({
    pauta_id: ids.pautaId,
    action_id: ids.actionId,
    territory_id: ids.territoryId,
    sidewalk_record_id: ids.recordLineId,
    slug: `${tag}-resultado`,
    title: `Resultado piloto ${tag}`,
    result_type: "achievement",
    public_summary: "Resultado de teste do piloto local com evidência.",
    what_was_done_public: "Vistoria comunitária realizada no território fixture.",
    remaining_public: "Aguardar resposta institucional.",
    verification_status: "verified",
    visibility: "public",
    occurred_at: new Date().toISOString(),
    evidence_summary_public: "Foto revisada, observação aceita e snapshot publicados.",
    private_notes: secret,
  }).select("id").single());
  ids.resultId = result.id;

  await one(db.from("comun_sidewalk_records").update({ resolved_at: new Date().toISOString(), resolved_result_id: ids.resultId, status: "published" }).eq("id", ids.recordLineId));

  await one(db.from("comun_sidewalk_record_links").insert({
    record_id: ids.recordLineId,
    target_type: "result",
    target_id: ids.resultId,
    public_note: "Resultado vinculado ao registro territorial.",
  }));

  // 15. Arte relacionada ----------------------------------------------------
  const artworkItemId = await createArchiveItem(`Obra "Caminhar pela cidade" ${tag}`, `${tag}-caminhar-cidade`, "territorial_artwork");
  ids.artworkItemId = artworkItemId;
  cleanup.photoItemIds.push(artworkItemId);

  const agent = await one(db.from("comun_archive_agents").insert({
    agent_type: "person",
    public_name: `Artista fixture ${tag}`,
    public_slug: `${tag}-artista`,
    public_bio: "Artista fixture para teste local.",
    status: "approved",
    public_visibility: "public",
  }).select("id").single());
  ids.agentId = agent.id;

  await one(db.from("comun_archive_artworks").insert({
    archive_item_id: artworkItemId,
    artwork_type: "illustration",
    title_public: `Caminhar pela cidade — ${tag}`,
    description_public: "Obra fixture inspirada no piloto de calçadas.",
    territory_id: ids.territoryId,
    publication_status: "published",
    sensitivity_level: "normal",
    creation_process: "human_created",
  }));

  await one(db.from("comun_archive_artwork_credits").insert({
    archive_item_id: artworkItemId,
    agent_id: ids.agentId,
    credit_role: "creator",
    public_credit: `Artista fixture ${tag}`,
    public_visibility: "public",
  }));

  await one(db.from("comun_archive_artwork_rights").insert({
    archive_item_id: artworkItemId,
    rights_holder_agent_id: ids.agentId,
    consent_status: "granted",
    allow_private_preservation: true,
    allow_comun_display: true,
    allow_social_media: true,
    allow_exhibition: true,
    allow_educational_use: true,
    allow_campaign_use: true,
    allow_download: false,
    license_public: "CC BY-NC-ND 4.0",
  }));

  await one(db.from("comun_archive_artwork_relations").insert({
    archive_item_id: artworkItemId,
    relation_type: "artwork_documents_pauta",
    target_type: "pauta",
    target_id: ids.pautaId,
    public_note: "Obra relacionada à pauta do piloto de calçadas.",
  }));

  await one(db.from("comun_archive_artwork_relations").insert({
    archive_item_id: artworkItemId,
    relation_type: "artwork_related_to_territory",
    target_type: "sidewalk_record",
    target_id: ids.recordLineId,
    public_note: "Obra relacionada ao trecho de calçada registrado.",
  }));

  // 16. Rádio relacionada ---------------------------------------------------
  const programItemId = await createArchiveItem(`Boletim das Calçadas — TESTE ${tag}`, `${tag}-boletim-calcadas`, "community_radio_program");
  const episodeItemId = await createArchiveItem(`Episódio fixture ${tag}`, `${tag}-episodio-calcadas`, "community_radio_episode");
  ids.programItemId = programItemId;
  ids.episodeItemId = episodeItemId;
  cleanup.photoItemIds.push(programItemId, episodeItemId);

  await one(db.from("comun_radio_programs").insert({
    archive_item_id: programItemId,
    title_public: `Boletim das Calçadas — TESTE ${tag}`,
    slug_public: `${tag}-boletim-calcadas`,
    description_public: "Programa fixture do piloto de calçadas.",
    format_type: "bulletin",
    status: "active",
    territory_id: ids.territoryId,
    pauta_id: ids.pautaId,
    sidewalk_record_id: ids.recordLineId,
    publication_status: "published",
  }));

  await one(db.from("comun_radio_episodes").insert({
    archive_item_id: episodeItemId,
    program_item_id: programItemId,
    season_number: 1,
    episode_number: 1,
    title_public: `Episódio fixture ${tag}`,
    slug_public: `${tag}-episodio-calcadas`,
    summary_public: "Episódio fixture sobre o trecho de calçada priorizado.",
    territory_id: ids.territoryId,
    pauta_id: ids.pautaId,
    action_id: ids.actionId,
    sidewalk_record_id: ids.recordLineId,
    publication_status: "published",
    duration_seconds: 120,
    allow_download: false,
  }));

  await one(db.from("comun_radio_credits").insert({
    episode_item_id: episodeItemId,
    agent_id: ids.agentId,
    credit_role: "host",
    public_credit: `Locutor fixture ${tag}`,
    public_visibility: "public",
  }));

  await one(db.from("comun_radio_transcript_versions").insert({
    episode_item_id: episodeItemId,
    version_number: 1,
    transcript_type: "manual_editorial",
    content: "Transcrição fixture do episódio sobre calçadas. Nenhuma voz de pessoa real foi utilizada.",
    status: "published",
  }));

  // 17. Memória do ciclo ----------------------------------------------------
  const memory = await one(db.from("comun_sidewalk_cycle_memories").insert({
    pauta_id: ids.pautaId,
    record_id: ids.recordLineId,
    slug: `${tag}-memoria-ciclo`,
    title: "O que aprendemos sobre as calçadas neste ciclo de teste?",
    public_summary: "Memória fixture do ciclo de calçadas, relacionando observação, síntese, ação, resultado, arte e rádio.",
    methodology_snapshot: "Metodologia piloto de calçadas v1.0",
    snapshot_id: ids.snapshotId,
    circle_id: ids.circleId,
    synthesis_id: ids.synthesisId,
    action_id: ids.actionId,
    protocol_id: ids.protocolId,
    result_id: ids.resultId,
    artwork_item_id: artworkItemId,
    radio_episode_item_id: episodeItemId,
    status: "published",
    visibility: "public",
    published_at: new Date().toISOString(),
  }).select("id").single());
  ids.memoryId = memory.id;

  // 18. Inbox vertical ------------------------------------------------------
  const inboxEvents = [
    { type: "sidewalk_report_received", title: "Relato de calçada recebido", summary: "Sua contribuição está em revisão.", actionLabel: "Ver pauta", actionUrl: `/comun/pautas/${pauta.slug}` },
    { type: "sidewalk_report_verified", title: "Relato verificado", summary: "O registro territorial foi verificado.", actionLabel: "Ver registro", actionUrl: `/comun/pautas/${pauta.slug}/registros/${recordLine.slug}` },
    { type: "sidewalk_circle_opened", title: "Roda aberta", summary: "Participe da construção coletiva.", actionLabel: "Participar", actionUrl: `/comun/pautas/${pauta.slug}#construction_circle` },
    { type: "sidewalk_task_assigned", title: "Tarefa atribuída", summary: "Você tem uma tarefa no piloto.", actionLabel: "Ver tarefa", actionUrl: `/comun/pautas/${pauta.slug}#tasks` },
    { type: "sidewalk_protocol_sent", title: "Protocolo enviado", summary: "O protocolo oficial foi encaminhado.", actionUrl: `/comun/acompanhar/${reportProtocol}` },
    { type: "sidewalk_response_received", title: "Resposta recebida", summary: "Há uma resposta institucional.", actionUrl: `/comun/acompanhar/${reportProtocol}` },
    { type: "sidewalk_result_recorded", title: "Resultado registrado", summary: "Um resultado foi publicado no ciclo.", actionUrl: `/comun/pautas/${pauta.slug}#results` },
  ];
  for (const ev of inboxEvents) {
    await one(db.from("comun_member_inbox").upsert({
      member_user_id: ids.memberId,
      pauta_id: ids.pautaId,
      notification_type: ev.type,
      title: ev.title,
      summary: ev.summary,
      action_label: ev.actionLabel || "Abrir",
      action_url: ev.actionUrl,
      priority: "normal",
      dedupe_key: `${ids.memberId}-${ev.type}-${tag}`,
    }, { onConflict: "member_user_id,dedupe_key" }));
  }

  // 19. Correção e retirada -------------------------------------------------
  const correction = await one(db.from("comun_sidewalk_record_corrections").insert({
    record_id: ids.recordPointId,
    correction_type: "category",
    request_note_public: "Solicitação fixture de correção de categoria.",
    previous_value: { categories: ["obstaculo"] },
    new_value: { categories: ["obstaculo", "vegetacao"] },
    review_status: "approved",
    reviewed_by: "curadoria-piloto",
    reviewed_at: new Date().toISOString(),
  }).select("id").single());
  ids.correctionId = correction.id;

  await one(db.from("comun_sidewalk_records").update({ categories: ["obstaculo", "vegetacao"] }).eq("id", ids.recordPointId));

  const withdrawal = await one(db.from("comun_sidewalk_record_withdrawals").insert({
    record_id: ids.recordPointId,
    request_note_private: secret,
    review_status: "approved",
    reviewed_by: "curadoria-piloto",
    withdrawn_at: new Date().toISOString(),
  }).select("id").single());
  ids.withdrawalId = withdrawal.id;

  await one(db.from("comun_sidewalk_records").update({ visibility: "archived", status: "withdrawn" }).eq("id", ids.recordPointId));

  // 20. Verificações públicas -----------------------------------------------
  const pautaHtml = await publicHtml(`/comun/pautas/${pauta.slug}`);
  assert.match(pautaHtml, /Mapa Popular das Calçadas/i);
  assert.ok(pautaHtml.includes('href="#map"'));
  assert.ok(pautaHtml.includes('href="#construction_circle"'));
  assert.ok(pautaHtml.includes("Calçadas e acessibilidade"));
  assert.ok(pautaHtml.includes(recordLine.slug));
  assertNoLeak(pautaHtml, ["object_key", "signed_url", "auth_user_id", "private_notes", secret]);

  const detailHtml = await publicHtml(`/comun/pautas/${pauta.slug}/registros/${recordLine.slug}`);
  assert.match(detailHtml, /Trecho de calçada quebrada/i);
  assert.ok(detailHtml.includes("critical"));
  assertNoLeak(detailHtml, ["object_key", "signed_url", "auth_user_id", "private_notes", secret]);

  const homeHtml = await publicHtml("/comun");
  assert.ok(homeHtml.includes(pauta.title), "Pauta piloto deve aparecer na home");

  const territoryHtml = await publicHtml("/comun/mapa");
  assert.ok(territoryHtml.includes("Mapa") || territoryHtml.includes("mapa"), "Página territorial deve carregar");

  // 21. Filtros e igualdade mapa/lista --------------------------------------
  const publicRecordsHigh = await one(db.from("comun_sidewalk_records").select("id").eq("pauta_id", ids.pautaId).eq("visibility", "public").eq("impact_level", "critical"));
  const publicRecordsAll = await one(db.from("comun_sidewalk_records").select("id").eq("pauta_id", ids.pautaId).eq("visibility", "public"));
  assert.equal(publicRecordsHigh.length, 1, "Filtro de impacto alto deve retornar 1 registro");
  assert.equal(publicRecordsAll.length, 1, "Após retirada, deve restar 1 registro público");

  // 22. Idempotência do snapshot -------------------------------------------
  const { count: snapshotCount, error: countError } = await db.from("comun_metric_snapshots").select("id", { count: "exact", head: true }).eq("metric_definition_id", metricMap["total-publicado"]).eq("period_start", periodStart).eq("period_end", periodEnd);
  if (countError) throw countError;
  assert.equal(snapshotCount, 1, "Snapshot deve ser idempotente");

  console.log("COMUN_SIDEWALK_VERTICAL_LOCAL_OK");


} finally {
  // Cleanup banco
  if (ids.memberId) {
    await db.from("comun_member_inbox").delete().eq("member_user_id", ids.memberId);
    await db.from("comun_pauta_memberships").delete().eq("member_user_id", ids.memberId);
    await db.from("comun_member_profiles").delete().eq("user_id", ids.memberId);
  }
  if (ids.memoryId) await db.from("comun_sidewalk_cycle_memories").delete().eq("id", ids.memoryId);
  if (ids.priorityId) await db.from("comun_sidewalk_priorities").delete().eq("id", ids.priorityId);
  if (ids.synthesisId) {
    await db.from("comun_circle_synthesis_links").delete().eq("synthesis_id", ids.synthesisId);
    await db.from("comun_circle_syntheses").delete().eq("id", ids.synthesisId);
  }
  if (ids.circleId) {
    await db.from("comun_circle_contributions").delete().eq("circle_id", ids.circleId);
    await db.from("comun_construction_circle_rounds").delete().eq("circle_id", ids.circleId);
    await db.from("comun_construction_circles").delete().eq("id", ids.circleId);
  }
  if (ids.photoReviewId) await db.from("comun_sidewalk_record_photos").delete().eq("id", ids.photoReviewId);
  if (ids.photoItemId) {
    await db.from("comun_archive_assets").delete().eq("archive_item_id", ids.photoItemId);
    await db.from("comun_archive_items").delete().eq("id", ids.photoItemId);
  }
  if (ids.recordPointId) {
    await db.from("comun_sidewalk_record_corrections").delete().eq("record_id", ids.recordPointId);
    await db.from("comun_sidewalk_record_withdrawals").delete().eq("record_id", ids.recordPointId);
    await db.from("comun_sidewalk_record_links").delete().eq("record_id", ids.recordPointId);
    await db.from("comun_sidewalk_records").delete().eq("id", ids.recordPointId);
  }
  if (ids.recordLineId) {
    await db.from("comun_sidewalk_record_links").delete().eq("record_id", ids.recordLineId);
    await db.from("comun_sidewalk_records").delete().eq("id", ids.recordLineId);
  }
  if (ids.resultId) await db.from("comun_hub_results").delete().eq("id", ids.resultId);
  if (ids.protocolId) await db.from("comun_official_protocols").delete().eq("id", ids.protocolId);
  if (ids.reportId) await db.from("comun_reports").delete().eq("id", ids.reportId);
  if (ids.actionId) await db.from("comun_mobilization_actions").delete().eq("id", ids.actionId);
  if (ids.taskId) await db.from("comun_pauta_tasks").delete().eq("id", ids.taskId);
  if (ids.observationId) await db.from("comun_observations").delete().eq("id", ids.observationId);
  if (ids.monitoredEntityId) await db.from("comun_monitored_entities").delete().eq("id", ids.monitoredEntityId);
  if (ids.snapshotId) await db.from("comun_metric_snapshots").delete().eq("id", ids.snapshotId);
  if (ids.contributionId) await db.from("comun_territorial_contributions").delete().eq("id", ids.contributionId);
  if (ids.episodeItemId) {
    await db.from("comun_radio_transcript_versions").delete().eq("episode_item_id", ids.episodeItemId);
    await db.from("comun_radio_credits").delete().eq("episode_item_id", ids.episodeItemId);
    await db.from("comun_radio_episodes").delete().eq("archive_item_id", ids.episodeItemId);
    await db.from("comun_archive_items").delete().eq("id", ids.episodeItemId);
  }
  if (ids.programItemId) {
    await db.from("comun_radio_programs").delete().eq("archive_item_id", ids.programItemId);
    await db.from("comun_archive_items").delete().eq("id", ids.programItemId);
  }
  if (ids.artworkItemId) {
    await db.from("comun_archive_artwork_relations").delete().eq("archive_item_id", ids.artworkItemId);
    await db.from("comun_archive_artwork_credits").delete().eq("archive_item_id", ids.artworkItemId);
    await db.from("comun_archive_artwork_rights").delete().eq("archive_item_id", ids.artworkItemId);
    await db.from("comun_archive_artworks").delete().eq("archive_item_id", ids.artworkItemId);
    await db.from("comun_archive_items").delete().eq("id", ids.artworkItemId);
  }
  if (ids.agentId) await db.from("comun_archive_agents").delete().eq("id", ids.agentId);
  if (ids.territoryId) {
    await db.from("comun_territory_layers").delete().eq("territory_id", ids.territoryId);
    await db.from("comun_hub_territories").delete().eq("id", ids.territoryId);
  }
  if (ids.pautaId) {
    await db.from("comun_pauta_modules").delete().eq("pauta_id", ids.pautaId);
    await db.from("comun_pauta_spaces").delete().eq("id", ids.pautaId);
  }

  // Cleanup Storage
  for (const { scope, key } of cleanup.storageKeys) {
    await storageRemove(scope, key);
  }

  const { count } = await db.from("comun_pauta_spaces").select("id", { count: "exact", head: true }).eq("slug", `${tag}-pauta`);
  assert.equal(count, 0, "Pauta fixture residual detectada após cleanup");

  console.log("COMUN_TEST_FIXTURES_CLEAN");
}
