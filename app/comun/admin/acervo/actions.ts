"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { canPublishHistoricalPhoto } from "@/lib/historical-photo";
import { getMediaStorage } from "@/lib/media-storage";
import { resolveArchivePublicationBoundary } from "@/lib/archive/generic-publication-boundary";

const types = [
  "photograph",
  "document",
  "place",
  "artist",
  "music_release",
  "oral_history",
  "video",
  "poster",
  "newspaper",
  "other",
] as const;
const rights = [
  "public_domain",
  "permission_granted",
  "licensed",
  "external_link_only",
  "restricted",
  "unknown",
] as const;
const schema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  item_type: z.enum(types),
  title: z.string().min(2),
  summary: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  place_name: z.string().optional(),
  approximate_date: z.string().optional(),
  year_start: z.coerce
    .number()
    .int()
    .min(1000)
    .max(2200)
    .optional()
    .or(z.literal("")),
  year_end: z.coerce
    .number()
    .int()
    .min(1000)
    .max(2200)
    .optional()
    .or(z.literal("")),
  circa: z.coerce.boolean().default(false),
  source_name: z.string().optional(),
  source_description: z.string().optional(),
  credits: z.string().optional(),
  rights_status: z.enum(rights),
  license_text: z.string().optional(),
  permission_reference: z.string().optional(),
  editorial_notes: z.string().optional(),
  genre: z.string().optional(),
  members: z.string().optional(),
  official_links: z.string().optional(),
});
const empty = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;
export async function saveArchiveItem(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const d = parsed.data;
  if (
    d.item_type === "music_release" &&
    d.rights_status !== "external_link_only"
  )
    throw new Error(
      "Lançamentos musicais aceitam somente links externos neste sprint.",
    );
  let links: Array<{ label: string; url: string }> = [];
  if (d.official_links?.trim()) {
    links = d.official_links
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [label, ...url] = line.split("|");
        const value = url.join("|").trim();
        if (!/^https:\/\//i.test(value))
          throw new Error(
            "Links oficiais devem usar HTTPS e o formato Rótulo | URL.",
          );
        return { label: label.trim(), url: value };
      });
  }
  const payload = {
    ...d,
    year_start: empty(d.year_start),
    year_end: empty(d.year_end),
    summary: empty(d.summary),
    description: empty(d.description),
    city: empty(d.city),
    neighborhood: empty(d.neighborhood),
    place_name: empty(d.place_name),
    approximate_date: empty(d.approximate_date),
    source_name: empty(d.source_name),
    source_description: empty(d.source_description),
    credits: empty(d.credits),
    license_text: empty(d.license_text),
    permission_reference: empty(d.permission_reference),
    editorial_notes: empty(d.editorial_notes),
    genre: empty(d.genre),
    members: empty(d.members),
    official_links: links,
    updated_at: new Date().toISOString(),
  };
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase não configurado.");
  const id = d.id;
  delete (payload as { id?: string }).id;
  const result = id
    ? await db
        .from("comun_archive_items")
        .update(payload)
        .eq("id", id)
        .select("id")
        .single()
    : await db
        .from("comun_archive_items")
        .insert(payload)
        .select("id")
        .single();
  if (result.error) throw new Error(result.error.message);
  await logComunAdminAction({
    session,
    action: id ? "archive_item_updated" : "archive_item_created",
    targetType: "archive_item",
    targetId: result.data.id,
    metadata: { item_type: d.item_type, status: "draft" },
  });
  redirect(`/comun/admin/acervo/${result.data.id}`);
}
export async function setArchiveWorkflow(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id"));
  const action = String(formData.get("workflow"));
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase não configurado.");
  const { data: item } = await db
    .from("comun_archive_items")
    .select("*")
    .eq("id", id)
    .single();
  if (!item) throw new Error("Item não encontrado.");
  let patch: Record<string, unknown>;
  let event: string;
  if (action === "review") {
    patch = { status: "review" };
    event = "archive_item_sent_to_review";
  } else if (action === "publish") {
    const [artwork, oralHistory, radioProgram, radioEpisode] = await Promise.all([
      db.from("comun_archive_artworks").select("archive_item_id").eq("archive_item_id", id).maybeSingle(),
      db.from("comun_archive_oral_histories").select("archive_item_id").eq("archive_item_id", id).maybeSingle(),
      db.from("comun_radio_programs").select("archive_item_id").eq("archive_item_id", id).maybeSingle(),
      db.from("comun_radio_episodes").select("archive_item_id").eq("archive_item_id", id).maybeSingle(),
    ]);
    const boundary = resolveArchivePublicationBoundary(id, {
      itemType: item.item_type,
      lookupFailed: Boolean(
        artwork.error ||
          oralHistory.error ||
          radioProgram.error ||
          radioEpisode.error,
      ),
      artwork: Boolean(artwork.data),
      oralHistory: Boolean(oralHistory.data),
      radioProgram: Boolean(radioProgram.data),
      radioEpisode: Boolean(radioEpisode.data),
    });
    if (!boundary.genericPublisherAllowed)
      throw new Error(
        boundary.specializedKind
          ? "Este conteúdo possui um fluxo especializado de publicação."
          : "Este tipo de conteúdo não possui publicação neste editor.",
      );
    const { data: assets } = await db
      .from("comun_archive_assets")
      .select(
        "id, object_key, bucket_scope, public_url, mime_type, alt_text, derivative_kind, asset_role, review_status",
      )
      .eq("archive_item_id", id);
    const allAssets = assets ?? [],
      approved = allAssets.filter(
        (a) =>
          a.bucket_scope === "public_safe" && a.review_status === "approved",
      ),
      display = approved.find(
        (a) =>
          a.derivative_kind === "display" || a.asset_role === "public_version",
      );
    if (
      !canPublishHistoricalPhoto({
        rightsStatus: item.rights_status,
        sourceName: item.source_name,
        credits: item.credits,
        altText: display?.alt_text,
        hasApprovedDisplay: Boolean(display),
        originalPublic: allAssets.some(
          (a) => a.bucket_scope === "private_original" && Boolean(a.public_url),
        ),
      })
    )
      throw new Error(
        "Checklist de direitos, fonte, credito, alt text, derivado ou privacidade incompleto.",
      );
    for (const asset of approved) {
      if (
        !(await getMediaStorage().objectExists("public_safe", asset.object_key))
      )
        throw new Error("Um derivado aprovado nao existe no storage.");
    }
    patch = {
      status: "published",
      visibility: "public",
      published_at: new Date().toISOString(),
    };
    event = "archive_item_published";
  } else if (action === "unpublish") {
    patch = {
      status: "unpublished",
      visibility: "private",
      published_at: null,
    };
    event = "archive_photo_unpublished";
  } else if (action === "archive") {
    patch = { status: "archived", visibility: "private", published_at: null };
    event = "archive_item_archived";
  } else throw new Error("Ação inválida.");
  const { error } = await db
    .from("comun_archive_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: event,
    targetType: "archive_item",
    targetId: id,
  });
  revalidatePath("/comun/acervo");
  revalidatePath(`/comun/acervo/${item.slug}`);
  revalidatePath(`/comun/admin/acervo/${id}`);
}
export async function reviewArchiveAsset(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("asset_id"));
  const status = String(formData.get("review_status"));
  if (!["approved", "rejected", "archived"].includes(status))
    throw new Error("Status inválido.");
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase não configurado.");
  const { data, error } = await db
    .from("comun_archive_assets")
    .update({ review_status: status })
    .eq("id", id)
    .select("archive_item_id")
    .single();
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action:
      status === "approved"
        ? "archive_asset_approved"
        : "archive_asset_rejected",
    targetType: "archive_asset",
    targetId: id,
    metadata: { review_status: status },
  });
  revalidatePath(`/comun/admin/acervo/${data.archive_item_id}`);
}
export async function updateArchiveAsset(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("asset_id"));
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase não configurado.");
  const { data, error } = await db
    .from("comun_archive_assets")
    .update({
      alt_text: empty(formData.get("alt_text")),
      credits: empty(formData.get("credits")),
      rights_status: empty(formData.get("rights_status")),
    })
    .eq("id", id)
    .select("archive_item_id")
    .single();
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "archive_item_updated",
    targetType: "archive_asset",
    targetId: id,
    metadata: { fields: ["alt_text", "credits", "rights_status"] },
  });
  revalidatePath(`/comun/admin/acervo/${data.archive_item_id}`);
}
export async function createCollection(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const title = String(formData.get("title") ?? "").trim(),
    slug = String(formData.get("slug") ?? "").trim();
  if (!title || !slug.match(/^[a-z0-9-]+$/))
    throw new Error("Título e slug válido são obrigatórios.");
  const status =
    String(formData.get("status")) === "published" ? "published" : "draft";
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase não configurado.");
  const { data, error } = await db
    .from("comun_archive_collections")
    .insert({
      title,
      slug,
      summary: empty(formData.get("summary")),
      description: empty(formData.get("description")),
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "archive_collection_created",
    targetType: "archive_collection",
    targetId: data.id,
  });
  revalidatePath("/comun/acervo/colecoes");
  revalidatePath("/comun/admin/acervo/colecoes");
}
export async function addItemToCollection(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const archive_item_id = String(formData.get("archive_item_id")),
    collection_id = String(formData.get("collection_id"));
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase não configurado.");
  const { error } = await db.from("comun_archive_collection_items").upsert({
    archive_item_id,
    collection_id,
    position: Number(formData.get("position") || 0),
  });
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "archive_collection_updated",
    targetType: "archive_collection",
    targetId: collection_id,
    metadata: { archive_item_id },
  });
  revalidatePath(`/comun/admin/acervo/${archive_item_id}`);
}
