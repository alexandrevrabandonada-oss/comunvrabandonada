import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
  base = (process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
if (!url || !key) throw new Error("Supabase não configurado.");
const db = createClient(url, key, { auth: { persistSession: false } }),
  slug = `validacao-acervo-${Date.now()}`;
let itemId, collectionId;
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};
async function page(path, attempts = 3) {
  let response;
  for (let i = 0; i < attempts; i++) {
    response = await fetch(`${base}${path}`, { cache: "no-store" });
    if (response.status !== 404 || i === attempts - 1)
      return { status: response.status, html: await response.text() };
    await new Promise((r) => setTimeout(r, 500));
  }
  return { status: response.status, html: "" };
}
try {
  let r = await db
    .from("comun_archive_items")
    .insert({
      slug,
      item_type: "photograph",
      title: "Fotografia de validação editorial",
      summary: "Memória local revisada para validação descartável.",
      source_name: "Fixture smoke",
      credits: "Equipe COMUN",
      rights_status: "permission_granted",
      status: "draft",
      visibility: "private",
    })
    .select("id")
    .single();
  if (r.error) throw r.error;
  itemId = r.data.id;
  let publicPage = await page(`/comun/acervo/${slug}`, 1);
  assert(publicPage.status === 404, "Draft apareceu publicamente.");
  r = await db
    .from("comun_archive_assets")
    .insert({
      archive_item_id: itemId,
      asset_role: "public_version",
      bucket_scope: "public_safe",
      object_key: `public/${itemId}/smoke.png`,
      public_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      mime_type: "image/png",
      size_bytes: 68,
      alt_text: "Fixture de uma fotografia",
      credits: "Equipe COMUN",
      rights_status: "permission_granted",
      review_status: "approved",
    });
  if (r.error) throw r.error;
  const publishedSlug = `${slug}-published`;
  r = await db
    .from("comun_archive_items")
    .update({
      slug: publishedSlug,
      status: "published",
      visibility: "public",
      published_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (r.error) throw r.error;
  publicPage = await page(`/comun/acervo/${publishedSlug}`);
  assert(
    publicPage.status === 200 &&
      publicPage.html.includes("Fotografia de validação editorial"),
    `Item publicado não apareceu (${publicPage.status}).`,
  );
  for (const secret of [
    "object_key",
    "editorial_notes",
    "permission_reference",
    "signedUrl",
    "originals/",
  ])
    assert(!publicPage.html.includes(secret), `Vazamento público: ${secret}`);
  r = await db
    .from("comun_archive_collections")
    .insert({
      slug: `colecao-${slug}`,
      title: "Coleção smoke",
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (r.error) throw r.error;
  collectionId = r.data.id;
  r = await db
    .from("comun_archive_collection_items")
    .insert({ collection_id: collectionId, archive_item_id: itemId });
  if (r.error) throw r.error;
  publicPage = await page(`/comun/acervo/colecoes/colecao-${slug}`);
  assert(publicPage.status === 200, "Coleção pública não apareceu.");
  const unpublishedSlug = `${slug}-unpublished`;
  r = await db
    .from("comun_archive_items")
    .update({
      slug: unpublishedSlug,
      status: "unpublished",
      visibility: "private",
      published_at: null,
    })
    .eq("id", itemId);
  if (r.error) throw r.error;
  publicPage = await page(`/comun/acervo/${unpublishedSlug}`, 1);
  assert(publicPage.status === 404, "Item despublicado continuou público.");
  r = await db
    .from("comun_archive_items")
    .insert({
      slug: `artist-${slug}`,
      item_type: "artist",
      title: "Artista smoke",
      source_name: "Fixture",
      credits: "Equipe COMUN",
      rights_status: "external_link_only",
      official_links: [{ label: "Site oficial", url: "https://example.com" }],
    });
  if (r.error) throw r.error;
  const audio = await fetch(`${base}/api/comun/admin/archive/upload-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      archiveItemId: itemId,
      filename: "teste.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 32,
      role: "public_version",
    }),
  });
  assert(!audio.ok, "Upload de áudio não foi bloqueado.");
  console.log(
    "[ok] archive foundation: draft, publicação, coleção, não vazamento, despublicação, artista e bloqueio de áudio",
  );
} finally {
  if (collectionId)
    await db.from("comun_archive_collections").delete().eq("id", collectionId);
  await db.from("comun_archive_items").delete().like("slug", `%${slug}`);
}
if (process.env.RUN_REAL_R2_SMOKE === "true") {
  await import("./smoke-comun-r2-real.mjs");
} else {
  console.log(
    "[skip] R2 real nao validado: defina RUN_REAL_R2_SMOKE=true para escrita externa.",
  );
}
