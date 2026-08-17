import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const artworkTypes = [
  "drawing",
  "painting",
  "collage",
  "poster",
  "photography",
  "graffiti",
  "mural",
  "sculpture",
  "installation",
  "comic",
  "illustration",
  "digital_art",
  "textile",
  "craft",
  "printmaking",
  "performance_record",
  "poetry_visual",
  "mixed_media",
  "other",
] as const;
export const artworkCreditRoles = [
  "creator",
  "co_creator",
  "collective",
  "photographer",
  "designer",
  "illustrator",
  "writer",
  "printer",
  "performer",
  "curator",
  "restorer",
  "donor",
  "rights_holder",
  "unknown_creator",
] as const;
export const acceptedArtworkMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateArtworkBinary(input: {
  mime: string;
  size: number;
  width: number;
  height: number;
  animated?: boolean;
  magic: Uint8Array;
}) {
  if (!acceptedArtworkMimeTypes.has(input.mime)) return "mime_not_allowed";
  if (input.size <= 0 || input.size > 30 * 1024 * 1024)
    return "size_not_allowed";
  if (
    input.width <= 0 ||
    input.height <= 0 ||
    input.width * input.height > 80_000_000
  )
    return "dimensions_not_allowed";
  if (input.animated) return "animated_not_allowed";
  const hex = Array.from(input.magic.slice(0, 12))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const valid =
    input.mime === "image/jpeg"
      ? hex.startsWith("ffd8ff")
      : input.mime === "image/png"
        ? hex.startsWith("89504e470d0a1a0a")
        : hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
  return valid ? null : "magic_bytes_mismatch";
}

export function artworkPublicationBlockers(input: {
  title?: string;
  description?: string;
  context?: string;
  credits: number;
  territoryId?: string | null;
  territoryAbsenceReason?: string | null;
  privateOriginal: boolean;
  publicDerivative: boolean;
  publicDerivativeAltText: boolean;
  publicDerivativeObjectVerified: boolean;
  allowDisplay: boolean;
  consentStatus?: string;
  validFrom?: string | null;
  validUntil?: string | null;
  safetyRequired: boolean;
  safetyApproved: boolean;
}) {
  const blockers: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  if (!input.title?.trim()) blockers.push("title");
  if (!input.description?.trim()) blockers.push("description");
  if (!input.context?.trim()) blockers.push("context");
  if (!input.credits) blockers.push("credit");
  if (!input.territoryId && !input.territoryAbsenceReason?.trim())
    blockers.push("territory");
  if (!input.privateOriginal) blockers.push("private_original");
  if (!input.publicDerivative) blockers.push("public_derivative");
  if (input.publicDerivative && !input.publicDerivativeAltText)
    blockers.push("public_derivative_alt_text");
  if (input.publicDerivative && !input.publicDerivativeObjectVerified)
    blockers.push("public_derivative_object");
  if (
    !input.allowDisplay ||
    !["granted", "partially_granted"].includes(input.consentStatus || "")
  )
    blockers.push("display_rights");
  if (input.validFrom && input.validFrom > today)
    blockers.push("rights_not_started");
  if (input.validUntil && input.validUntil < today)
    blockers.push("rights_expired");
  if (input.safetyRequired && !input.safetyApproved)
    blockers.push("reinforced_review");
  return blockers;
}

export function sanitizeArtworkSnapshot(value: Record<string, unknown>) {
  const allowed = new Set([
    "title",
    "description",
    "context",
    "credit",
    "territory",
    "technique",
    "materials",
    "rights_public",
    "relations",
    "publication",
    "withdrawal",
  ]);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => allowed.has(key)),
  );
}

export async function listPublicArtworks(
  options: {
    query?: string;
    type?: string;
    territoryId?: string;
    territorySlug?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const db = createServiceSupabaseClient();
  if (!db) return { items: [], count: 0 };
  const limit = Math.min(24, Math.max(1, options.limit || 12));
  const page = Math.max(1, options.page || 1);
  let territoryId = options.territoryId;
  if (!territoryId && options.territorySlug) {
    const { data: territory } = await db
      .from("comun_hub_territories" as never)
      .select("id" as never)
      .eq("slug" as never, options.territorySlug)
      .eq("visibility" as never, "public")
      .maybeSingle();
    if (!territory) return { items: [], count: 0 };
    territoryId = (territory as any).id;
  }
  let query = db
    .from("comun_archive_items" as never)
    .select(
      "id,slug,title,summary,published_at,comun_archive_artworks!inner(artwork_type,title_public,description_public,context_public,creation_year,creation_period_public,technique_public,materials_public,territory_id,long_description_public,territory:comun_hub_territories(id,slug,name,visibility)),comun_archive_assets(id,asset_role,bucket_scope,review_status,public_url,alt_text,credits,width,height),comun_archive_artwork_credits(public_credit,credit_role,position),comun_archive_artwork_rights(consent_status,allow_comun_display,valid_from,valid_until,embargo_until,required_credit_public,license_public,allow_download,allow_social_media),comun_archive_artwork_safety_reviews(reinforced_review_status)" as never,
      { count: "exact" },
    )
    .eq("item_type" as never, "territorial_artwork")
    .eq("status" as never, "published")
    .eq("visibility" as never, "public")
    .order("published_at" as never, { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (options.query)
    query = query.or(
      `title.ilike.%${options.query.replaceAll(",", "")}%,summary.ilike.%${options.query.replaceAll(",", "")}%` as never,
    );
  if (options.type)
    query = query.eq(
      "comun_archive_artworks.artwork_type" as never,
      options.type,
    );
  if (territoryId)
    query = query.eq(
      "comun_archive_artworks.territory_id" as never,
      territoryId,
    );
  const { data, count } = await query;
  const items = ((data || []) as any[]).filter((item) => {
    const rights = item.comun_archive_artwork_rights?.[0]; const safety = item.comun_archive_artwork_safety_reviews?.[0];
    return rights && rights.allow_comun_display && ["granted", "partially_granted"].includes(rights.consent_status) && (!rights.embargo_until || new Date(rights.embargo_until).getTime() <= Date.now()) && (!rights.valid_until || rights.valid_until >= new Date().toISOString().slice(0, 10)) && (!safety || ["not_required", "approved"].includes(safety.reinforced_review_status));
  }).map((item) => ({
    ...item,
    comun_archive_assets: (item.comun_archive_assets || []).filter(
      (asset: any) =>
        asset.bucket_scope === "public_safe" &&
        asset.review_status === "approved" &&
        Boolean(asset.public_url),
    ),
  }));
  return { items, count: count || 0 };
}

export async function listPublicArtworkTerritories() {
  const db = createServiceSupabaseClient();
  if (!db) return [];
  const { data } = await db
    .from("comun_hub_territories" as never)
    .select("id,slug,name" as never)
    .eq("visibility" as never, "public")
    .order("name" as never)
    .limit(200);
  return (data || []) as any[];
}

export async function getPublicArtwork(slug: string) {
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data } = await db
    .from("comun_archive_items" as never)
    .select(
      "id,slug,title,summary,description,neighborhood,approximate_date,published_at,comun_archive_artworks!inner(*,territory:comun_hub_territories(id,slug,name,visibility)),comun_archive_assets(id,asset_role,bucket_scope,review_status,public_url,alt_text,credits,width,height),comun_archive_artwork_credits(public_credit,credit_role,position,agent:comun_archive_agents(public_name,public_slug,public_bio,public_visibility,status)),comun_archive_artwork_rights(consent_status,allow_comun_display,valid_from,valid_until,embargo_until,required_credit_public,license_public,allow_download,allow_social_media,allow_print,allow_exhibition,allow_educational_use,allow_campaign_use),comun_archive_artwork_safety_reviews(reinforced_review_status),comun_archive_artwork_relations(relation_type,target_type,target_id,public_note)" as never,
    )
    .eq("slug" as never, slug)
    .eq("item_type" as never, "territorial_artwork")
    .eq("status" as never, "published")
    .eq("visibility" as never, "public")
    .maybeSingle();
  if (!data) return null;
  const item = data as any;
  const rights = (item.comun_archive_artwork_rights || [])[0]; const safety = (item.comun_archive_artwork_safety_reviews || [])[0];
  if (!rights || !rights.allow_comun_display || !["granted", "partially_granted"].includes(rights.consent_status) || (safety && !["not_required", "approved"].includes(safety.reinforced_review_status))) return null;
  return {
    ...item,
    comun_archive_assets: (item.comun_archive_assets || []).filter(
      (asset: any) =>
        asset.bucket_scope === "public_safe" &&
        asset.review_status === "approved" &&
        Boolean(asset.public_url),
    ),
  };
}
