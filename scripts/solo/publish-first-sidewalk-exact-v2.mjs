import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import sharp from "sharp";

const CANDIDATE_SQL = `
select
  r.id,
  r.slug,
  r.member_user_id,
  r.pauta_id,
  r.submitter_is_anonymous,
  r.status as record_status,
  r.visibility as record_visibility,
  r.private_geometry_geojson->>'type' as geometry_type,
  jsonb_array_length(r.private_geometry_geojson->'coordinates') as coordinate_count,
  p.id as photo_id,
  p.archive_item_id,
  p.derivative_asset_id,
  p.review_status as photo_review_status,
  p.is_public as photo_is_public,
  a.object_key,
  a.original_filename,
  a.storage_provider,
  i.visibility as item_visibility
from public.comun_sidewalk_records r
join public.comun_sidewalk_record_photos p on p.record_id = r.id
join public.comun_archive_assets a on a.id = p.original_asset_id
join public.comun_archive_items i on i.id = p.archive_item_id
where r.status = 'under_review'
  and r.visibility = 'internal'
  and r.submitter_is_anonymous = true
  and r.public_geometry_geojson is null
  and r.private_geometry_geojson->>'type' = 'Point'
  and p.review_status = 'pending'
  and p.derivative_asset_id is null
  and p.is_public = false
  and a.bucket_scope = 'private_original'
  and a.storage_provider = 'supabase-local'
  and i.visibility = 'private'
order by r.created_at asc`;

const ALREADY_PUBLISHED_SQL = `
select r.id, r.slug, r.status, r.visibility, r.location_precision,
       r.public_geometry_geojson->>'type' as geometry_type
from public.comun_sidewalk_records r
where r.status = 'published'
  and r.visibility = 'public'
  and r.location_precision = 'exact'
  and r.public_summary = $1
  and r.public_geometry_geojson = r.private_geometry_geojson`;

const LOCK_CANDIDATE_SQL = `
select r.id
from public.comun_sidewalk_records r
join public.comun_sidewalk_record_photos p on p.record_id = r.id
where r.id = $1
  and r.status = 'under_review'
  and r.visibility = 'internal'
  and r.public_geometry_geojson is null
  and p.review_status = 'pending'
  and p.derivative_asset_id is null
  and p.is_public = false
for update of r, p`;

const POSTFLIGHT_SQL = `
select r.status, r.visibility, r.location_precision,
       (r.public_geometry_geojson = r.private_geometry_geojson) as exact_geometry_match,
       count(distinct p.id) filter (where p.is_public and p.review_status = 'approved')::text as public_photo_count,
       count(distinct a.id) filter (where a.asset_role = 'public_version' and a.review_status = 'approved')::text as derivative_count
from public.comun_sidewalk_records r
left join public.comun_sidewalk_record_photos p on p.record_id = r.id
left join public.comun_archive_assets a on a.id = p.derivative_asset_id
where r.id = $1 and r.public_summary = $2
group by r.id`;

const { Client } = pg;
const cycleId = "sidewalk-first-exact-publication-20260729-14";
const publicSummary =
  "Trecho de calçada em condição regular, com irregularidades no piso e indicação comunitária de ausência de rampa.";
const baseUrl = (
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online"
).replace(/\/$/, "");
const projectRef = required("SUPABASE_PROJECT_REF");
const serviceRole = required("SUPABASE_SERVICE_ROLE_KEY");
const databaseUrl = required("SUPABASE_DB_URL");
const artifactDir = path.resolve(
  process.env.COMUN_ARTIFACT_DIR ??
    ".ci-artifacts/sidewalk-first-exact-publication-v2",
);
const supabaseUrl = `https://${projectRef}.supabase.co`;
const privateBucket = "archive-private-originals";
const publicBucket = "archive-public-derivatives";

const evidence = {
  formatVersion: 2,
  cycleId,
  cycleType: "first_reviewed_sidewalk_exact_publication",
  authorizationScope: "exact_coordinate_and_sanitized_derivative",
  startedAt: new Date().toISOString(),
  candidateCountBefore: null,
  alreadyPublishedCountBefore: null,
  recordRef: null,
  geometryType: "not_observed",
  exactGeometryMatch: false,
  exactCoordinateExposedInArtifact: false,
  originalPhotoRemainsPrivate: true,
  publicDerivativeGenerated: false,
  publicDerivativeCount: 0,
  databaseWrites: "none",
  storageWrites: "none",
  locationPrecision: "unknown",
  recordStatus: "unknown",
  recordVisibility: "unknown",
  publicMapHttpStatus: null,
  publicRecordHttpStatus: null,
  publicSummaryVisible: false,
  submissionAttempt: 1,
  retryExecuted: false,
  readOnlySmokeAttempts: 0,
  findingsCount: 0,
  cycleResult: "COMUN_SIDEWALK_FIRST_EXACT_PUBLICATION_INSUFFICIENT_EVIDENCE",
};

await mkdir(artifactDir, { recursive: true });
let db;
let uploadedDerivativeKey = null;
let committed = false;
let terminalAlreadyGreen = false;

try {
  db = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });
  await db.connect();

  const candidates = await db.query(CANDIDATE_SQL);
  const already = await db.query(ALREADY_PUBLISHED_SQL, [publicSummary]);
  evidence.candidateCountBefore = candidates.rowCount;
  evidence.alreadyPublishedCountBefore = already.rowCount;

  if (candidates.rowCount === 0 && already.rowCount === 1) {
    const row = already.rows[0];
    evidence.recordRef = ref(row.id);
    evidence.geometryType = row.geometry_type;
    evidence.locationPrecision = row.location_precision;
    evidence.recordStatus = row.status;
    evidence.recordVisibility = row.visibility;
    evidence.exactGeometryMatch = true;
    evidence.publicDerivativeGenerated = true;
    evidence.publicDerivativeCount = 1;
    evidence.cycleResult =
      "COMUN_SIDEWALK_FIRST_EXACT_PUBLICATION_ALREADY_GREEN";
    terminalAlreadyGreen = true;
    await publicSmoke(row.slug);
  } else {
    if (candidates.rowCount !== 1 || already.rowCount !== 0)
      throw new Error("EXACT_PUBLICATION_CANDIDATE_NOT_UNIQUE");

    const candidate = candidates.rows[0];
    evidence.recordRef = ref(candidate.id);
    evidence.geometryType = candidate.geometry_type;
    validateCandidate(candidate);

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const derivativeKey = `public/sidewalk/${candidate.archive_item_id}/detail.webp`;
    const existing = await supabase.storage
      .from(publicBucket)
      .download(derivativeKey);
    if (!existing.error)
      throw new Error("PUBLIC_DERIVATIVE_OBJECT_ALREADY_EXISTS");

    const original = await supabase.storage
      .from(privateBucket)
      .download(candidate.object_key);
    if (original.error || !original.data)
      throw new Error("PRIVATE_ORIGINAL_UNAVAILABLE");

    const originalBody = Buffer.from(await original.data.arrayBuffer());
    const derivative = await sharp(originalBody, {
      animated: false,
      limitInputPixels: 80_000_000,
    })
      .rotate()
      .resize({ width: 960, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
    const metadata = await sharp(derivative).metadata();
    if (!metadata.width || !metadata.height)
      throw new Error("DERIVATIVE_DIMENSIONS_INVALID");

    const uploaded = await supabase.storage
      .from(publicBucket)
      .upload(derivativeKey, derivative, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "31536000",
      });
    if (uploaded.error) throw new Error("PUBLIC_DERIVATIVE_UPLOAD_FAILED");
    uploadedDerivativeKey = derivativeKey;
    evidence.storageWrites = "one";
    evidence.publicDerivativeGenerated = true;

    const publicUrl = supabase.storage
      .from(publicBucket)
      .getPublicUrl(derivativeKey).data.publicUrl;

    await db.query("begin");
    const locked = await db.query(LOCK_CANDIDATE_SQL, [candidate.id]);
    if (locked.rowCount !== 1)
      throw new Error("CANDIDATE_CHANGED_BEFORE_COMMIT");

    const derivativeAsset = await db.query(
      `insert into public.comun_archive_assets
        (archive_item_id, asset_role, storage_provider, bucket_scope, object_key,
         original_filename, mime_type, size_bytes, width, height, public_url,
         review_status)
       values ($1, 'public_version', 'supabase-local', 'public_safe', $2,
         'detail.webp', 'image/webp', $3, $4, $5, $6, 'approved')
       returning id`,
      [
        candidate.archive_item_id,
        derivativeKey,
        derivative.byteLength,
        metadata.width,
        metadata.height,
        publicUrl,
      ],
    );
    const derivativeAssetId = derivativeAsset.rows[0]?.id;
    if (!derivativeAssetId) throw new Error("DERIVATIVE_ASSET_INSERT_FAILED");

    const photo = await db.query(
      `update public.comun_sidewalk_record_photos
         set derivative_asset_id = $2,
             review_status = 'approved',
             is_public = true,
             public_alt_text = 'Registro comunitário de trecho de calçada, publicado após revisão de privacidade.'
       where id = $1
         and review_status = 'pending'
         and derivative_asset_id is null
         and is_public = false`,
      [candidate.photo_id, derivativeAssetId],
    );
    if (photo.rowCount !== 1) throw new Error("PHOTO_STATE_CHANGED");

    const item = await db.query(
      `update public.comun_archive_items
         set status = 'published', visibility = 'public', published_at = now()
       where id = $1 and visibility = 'private'`,
      [candidate.archive_item_id],
    );
    if (item.rowCount !== 1) throw new Error("ARCHIVE_ITEM_STATE_CHANGED");

    const record = await db.query(
      `update public.comun_sidewalk_records
         set status = 'published',
             visibility = 'public',
             verification_status = 'verified',
             public_geometry_geojson = private_geometry_geojson,
             location_precision = 'exact',
             public_location_level = 'exact',
             last_observed_at = now(),
             public_summary = $2
       where id = $1
         and status = 'under_review'
         and visibility = 'internal'
         and public_geometry_geojson is null
         and private_geometry_geojson->>'type' = 'Point'`,
      [candidate.id, publicSummary],
    );
    if (record.rowCount !== 1) throw new Error("RECORD_STATE_CHANGED");

    if (candidate.member_user_id) {
      await db.query(
        `insert into public.comun_member_inbox
          (member_user_id, pauta_id, notification_type, title, summary,
           action_label, action_url, priority, dedupe_key)
         values ($1, $2, 'sidewalk_report_published',
           'Registro de calçada publicado',
           'A contribuição revisada foi publicada no mapa com o ponto exato autorizado.',
           'Ver no mapa', $3, 'normal', $4)
         on conflict (member_user_id, dedupe_key) do update
           set summary = excluded.summary, action_url = excluded.action_url`,
        [
          candidate.member_user_id,
          candidate.pauta_id,
          `/comun/calcadas/registros/${candidate.slug}`,
          `sidewalk-moderation:${candidate.id}:approve_exact`,
        ],
      );
    }

    await db.query(
      `insert into public.comun_admin_audit_log
        (admin_user_id, admin_email, action, target_type, target_id, metadata)
       values (null, null, 'sidewalk_approve_exact_authorized',
         'sidewalk_record', $1, $2::jsonb)`,
      [
        candidate.id,
        JSON.stringify({
          cycle_id: cycleId,
          authorization_source: "explicit_human_authorization_2026_07_29",
          public_geometry: true,
          location_precision: "exact",
          public_image: true,
          original_photo_private: true,
          exact_coordinate_in_artifact: false,
        }),
      ],
    );

    await db.query("commit");
    committed = true;
    evidence.databaseWrites = "controlled_publication";

    const postflight = await db.query(POSTFLIGHT_SQL, [
      candidate.id,
      publicSummary,
    ]);
    if (postflight.rowCount !== 1)
      throw new Error("POSTFLIGHT_RECORD_NOT_GREEN");
    const post = postflight.rows[0];
    if (
      post.location_precision !== "exact" ||
      post.status !== "published" ||
      post.visibility !== "public" ||
      post.public_photo_count !== "1" ||
      post.derivative_count !== "1" ||
      post.exact_geometry_match !== true
    )
      throw new Error("POSTFLIGHT_STATE_DIVERGENT");

    evidence.locationPrecision = post.location_precision;
    evidence.recordStatus = post.status;
    evidence.recordVisibility = post.visibility;
    evidence.publicDerivativeCount = Number(post.derivative_count);
    evidence.exactGeometryMatch = true;
    await publicSmoke(candidate.slug);
    evidence.cycleResult = "COMUN_SIDEWALK_FIRST_EXACT_PUBLICATION_GREEN";
  }
} catch (error) {
  if (db) await db.query("rollback").catch(() => undefined);
  if (uploadedDerivativeKey && !committed) {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await supabase.storage
      .from(publicBucket)
      .remove([uploadedDerivativeKey])
      .catch(() => undefined);
    evidence.storageWrites = "compensated";
    evidence.publicDerivativeGenerated = false;
  }
  evidence.findingsCount = 1;
  evidence.failureCode = sanitizeError(error);
  evidence.cycleResult = committed
    ? "COMUN_SIDEWALK_FIRST_EXACT_PUBLICATION_COMMITTED_SMOKE_PENDING"
    : "COMUN_SIDEWALK_FIRST_EXACT_PUBLICATION_BLOCKED_BEFORE_COMMIT";
} finally {
  if (db) await db.end().catch(() => undefined);
  evidence.finishedAt = new Date().toISOString();
  await writeArtifacts(evidence);
  console.log(evidence.cycleResult);
  if (process.env.GITHUB_STEP_SUMMARY)
    await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown(evidence), {
      flag: "a",
    });
}

if (
  !evidence.cycleResult.endsWith("_GREEN") &&
  !terminalAlreadyGreen &&
  evidence.cycleResult !==
    "COMUN_SIDEWALK_FIRST_EXACT_PUBLICATION_COMMITTED_SMOKE_PENDING"
) {
  process.exitCode = 1;
}

async function publicSmoke(slug) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    evidence.readOnlySmokeAttempts = attempt;
    const [mapResponse, recordResponse] = await Promise.all([
      fetch(`${baseUrl}/comun/calcadas`, {
        redirect: "follow",
        cache: "no-store",
      }),
      fetch(`${baseUrl}/comun/calcadas/registros/${encodeURIComponent(slug)}`, {
        redirect: "follow",
        cache: "no-store",
      }),
    ]);
    evidence.publicMapHttpStatus = mapResponse.status;
    evidence.publicRecordHttpStatus = recordResponse.status;
    const recordHtml = await recordResponse.text();
    evidence.publicSummaryVisible = recordHtml.includes(publicSummary);
    if (
      mapResponse.status === 200 &&
      recordResponse.status === 200 &&
      evidence.publicSummaryVisible
    )
      return;
    if (attempt < 10) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("PUBLIC_SMOKE_NOT_GREEN_AFTER_READ_ONLY_POLLING");
}

function validateCandidate(row) {
  if (
    row.geometry_type !== "Point" ||
    Number(row.coordinate_count) !== 2 ||
    row.submitter_is_anonymous !== true ||
    row.record_status !== "under_review" ||
    row.record_visibility !== "internal" ||
    row.photo_review_status !== "pending" ||
    row.photo_is_public !== false ||
    row.derivative_asset_id !== null ||
    row.item_visibility !== "private" ||
    row.storage_provider !== "supabase-local"
  )
    throw new Error("CANDIDATE_CONTRACT_MISMATCH");
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function ref(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[database-url]")
    .replace(/eyJ[a-zA-Z0-9._-]+/g, "[jwt]")
    .replace(/[a-f0-9]{32,}/gi, "[opaque]")
    .slice(0, 180);
}

async function writeArtifacts(value) {
  await writeFile(
    path.join(artifactDir, "result.json"),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(artifactDir, "result.md"), markdown(value), "utf8");
}

function markdown(value) {
  return `# Publicação exata da primeira contribuição de calçada — ciclo 14\n\n- Resultado: \`${value.cycleResult}\`\n- Cycle ID: \`${value.cycleId}\`\n- Candidato antes: \`${value.candidateCountBefore ?? "unknown"}\`\n- Já publicado antes: \`${value.alreadyPublishedCountBefore ?? "unknown"}\`\n- Registro sanitizado: \`${value.recordRef ?? "none"}\`\n- Geometria: \`${value.geometryType}\`\n- Igualdade exata confirmada: \`${value.exactGeometryMatch}\`\n- Precisão pública: \`${value.locationPrecision}\`\n- Estado/visibilidade: \`${value.recordStatus}/${value.recordVisibility}\`\n- Derivada pública: \`${value.publicDerivativeGenerated}\`\n- Original privado preservado: \`${value.originalPhotoRemainsPrivate}\`\n- Coordenada em artifact: \`${value.exactCoordinateExposedInArtifact}\`\n- Escritas banco/Storage: \`${value.databaseWrites}/${value.storageWrites}\`\n- Smoke mapa/registro: \`${value.publicMapHttpStatus ?? "unknown"}/${value.publicRecordHttpStatus ?? "unknown"}\`\n- Resumo público visível: \`${value.publicSummaryVisible}\`\n- Polls read-only: \`${value.readOnlySmokeAttempts}\`\n- Retry de escrita: \`${value.retryExecuted}\`\n${value.failureCode ? `- Falha sanitizada: \`${value.failureCode}\`\n` : ""}`;
}
