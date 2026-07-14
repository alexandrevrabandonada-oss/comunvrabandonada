import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
if (process.env.RUN_REAL_R2_SMOKE !== "true")
  throw new Error(
    "Smoke historico real bloqueado. Defina RUN_REAL_R2_SMOKE=true.",
  );
const required = [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "R2_PUBLIC_BASE_URL",
  ],
  missing = required.filter((k) => !process.env[k]);
if (missing.length)
  throw new Error(`Configuracao incompleta: ${missing.join(", ")}`);
const base = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""),
  db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  storage = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  }),
  stamp = Date.now();
let submissionId, itemId, suggestionId;
const objectRefs = [];
const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  },
  json = async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  };
try {
  const fixture = await sharp({
    create: {
      width: 900,
      height: 650,
      channels: 3,
      background: { r: 112, g: 88, b: 62 },
    },
  })
    .jpeg({ quality: 90 })
    .withMetadata({ orientation: 6 })
    .toBuffer();
  let result = await json(
    await fetch(`${base}/api/comun/archive/submissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        titleSuggestion: `Fotografia smoke ${stamp}`,
        city: "Volta Redonda",
        neighborhood: "Centro",
        placeName: "Praca smoke",
        approximateDate: "Decada de 1970",
        descriptionSuggestion:
          "Fixture controlada para validar o fluxo completo de fotografia historica.",
        relationshipToMaterial: "Fixture automatizada da equipe COMUN",
        sourceName: "Smoke controlado",
        sourceStory: "Gerada exclusivamente para teste",
        rightsDeclaration:
          "A equipe criou esta fixture e autoriza seu uso exclusivo neste teste.",
        permissionConfirmed: true,
        contributorCreditPreference: "anonymous",
        contactAuthorized: false,
        website: "",
        challengeAnswer: "7",
      }),
    }),
  );
  submissionId = result.submissionId;
  assert(result.protocol.startsWith("ACERVO-"), "Protocolo ausente");
  const upload = await json(
    await fetch(
      `${base}/api/comun/archive/submissions/${submissionId}/upload-url`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: "fixture-historica.jpg",
          mimeType: "image/jpeg",
          sizeBytes: fixture.length,
        }),
      },
    ),
  );
  let response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: fixture,
  });
  assert(response.ok, "Upload privado falhou");
  const confirmed = await json(
    await fetch(
      `${base}/api/comun/archive/submissions/${submissionId}/confirm`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: upload.assetId }),
      },
    ),
  );
  assert(!confirmed.duplicate, "Primeira fixture marcada como duplicada");
  const { data: original } = await db
    .from("comun_archive_assets")
    .select("id, object_key, checksum_sha256, public_url")
    .eq("id", upload.assetId)
    .single();
  assert(
    original?.checksum_sha256 && !original.public_url,
    "Checksum ou privacidade do original invalida",
  );
  objectRefs.push({ scope: "private", key: original.object_key });
  const duplicateSubmission = await db
    .from("comun_archive_submissions")
    .insert({
      status: "submitted",
      title_suggestion: "Duplicata smoke",
      city: "Volta Redonda",
      description_suggestion: "Duplicata exata",
      source_name: "Smoke",
      rights_declaration: "Fixture",
      permission_confirmed: true,
      risk_level: "attention",
    })
    .select("id")
    .single();
  assert(!duplicateSubmission.error, "Contribuicao duplicada nao criada");
  await db
    .from("comun_admin_audit_log")
    .insert({
      action: "archive_duplicate_detected",
      target_type: "archive_submission",
      target_id: duplicateSubmission.data.id,
      metadata: { existing_asset_id: original.id },
    });
  const item = await db
    .from("comun_archive_items")
    .insert({
      slug: `fotografia-smoke-${stamp}`,
      item_type: "photograph",
      title: `Fotografia smoke ${stamp}`,
      description: "Memoria fotografica controlada",
      city: "Volta Redonda",
      neighborhood: "Centro",
      place_name: "Praca smoke",
      approximate_date: "Decada de 1970",
      year_start: 1970,
      year_end: 1979,
      circa: true,
      source_name: "Smoke controlado",
      credits: "Equipe COMUN",
      rights_status: "permission_granted",
      status: "draft",
      visibility: "private",
    })
    .select("id,slug")
    .single();
  if (item.error) throw item.error;
  itemId = item.data.id;
  await db
    .from("comun_archive_assets")
    .update({
      archive_item_id: itemId,
      rights_status: "permission_granted",
      credits: "Equipe COMUN",
    })
    .eq("id", original.id);
  await db
    .from("comun_archive_submissions")
    .update({ archive_item_id: itemId, status: "derivative_pending" })
    .eq("id", submissionId);
  process.env.ARCHIVE_ASSET_ID = original.id;
  await import(`./generate-comun-photo-derivatives.mjs?smoke=${stamp}`);
  const { data: derivatives } = await db
    .from("comun_archive_assets")
    .select(
      "id, object_key, public_url, derivative_kind, mime_type, checksum_sha256",
    )
    .eq("archive_item_id", itemId)
    .eq("bucket_scope", "public_safe");
  assert(
    derivatives?.length === 2 &&
      derivatives.every(
        (x) => x.mime_type === "image/webp" && x.checksum_sha256,
      ),
    "Derivados invalidos",
  );
  for (const d of derivatives) {
    objectRefs.push({ scope: "public", key: d.object_key });
    const image = await sharp(
      Buffer.from(await (await fetch(d.public_url)).arrayBuffer()),
    ).metadata();
    assert(
      !image.exif && !image.icc && !image.xmp,
      "Metadados privados permaneceram no derivado",
    );
    await db
      .from("comun_archive_assets")
      .update({
        review_status: "approved",
        alt_text: "Praca em fotografia historica de teste",
      })
      .eq("id", d.id);
  }
  await db
    .from("comun_archive_items")
    .update({
      status: "published",
      visibility: "public",
      published_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  response = await fetch(`${base}/comun/acervo/${item.data.slug}`);
  assert(
    response.ok &&
      (await response.text()).includes(`Fotografia smoke ${stamp}`),
    "Pagina publica ausente",
  );
  response = await fetch(
    `${base}/comun/acervo?type=photograph&city=Volta%20Redonda`,
  );
  assert(response.ok, "Galeria publica falhou");
  result = await json(
    await fetch(`${base}/api/comun/archive/suggestions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        archiveItemId: itemId,
        suggestionType: "historical_context",
        suggestionText:
          "Contexto adicional controlado que nao pode alterar o item automaticamente.",
        sourceReference: "Fixture smoke",
        website: "",
        challengeAnswer: "7",
      }),
    }),
  );
  const { data: suggestion } = await db
    .from("comun_archive_item_suggestions")
    .select("id,status")
    .eq("archive_item_id", itemId)
    .single();
  suggestionId = suggestion.id;
  assert(suggestion.status === "pending", "Sugestao nao ficou pendente");
  const unchanged = await db
    .from("comun_archive_items")
    .select("description")
    .eq("id", itemId)
    .single();
  assert(
    unchanged.data.description === "Memoria fotografica controlada",
    "Sugestao alterou item automaticamente",
  );
  await db
    .from("comun_archive_items")
    .update({
      status: "unpublished",
      visibility: "private",
      published_at: null,
    })
    .eq("id", itemId);
  response = await fetch(`${base}/comun/acervo/${item.data.slug}`);
  assert(response.status === 404, "Despublicacao falhou");
  console.log(
    "[ok] fluxo historico real: envio, privado, checksum, duplicidade, derivados sem EXIF, publicacao, sugestao pendente e despublicacao",
  );
  await db
    .from("comun_archive_submissions")
    .delete()
    .eq("id", duplicateSubmission.data.id);
} finally {
  if (suggestionId)
    await db
      .from("comun_archive_item_suggestions")
      .delete()
      .eq("id", suggestionId);
  if (submissionId)
    await db.from("comun_archive_submissions").delete().eq("id", submissionId);
  if (itemId) await db.from("comun_archive_items").delete().eq("id", itemId);
  for (const ref of objectRefs.reverse())
    await storage
      .send(
        new DeleteObjectCommand({
          Bucket:
            ref.scope === "private"
              ? process.env.R2_BUCKET_ORIGINALS
              : process.env.R2_BUCKET_PUBLIC,
          Key: ref.key,
        }),
      )
      .catch(() => {});
}
