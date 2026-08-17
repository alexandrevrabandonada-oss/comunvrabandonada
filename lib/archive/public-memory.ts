import { listPublicArchiveItems, type ArchiveAsset, type ArchiveItem } from "@/lib/archive";
import { listPublicArtworks } from "@/lib/archive/territorial-art";
import { listPublicOralHistories } from "@/lib/archive/oral-history";
import { listPublicReleases } from "@/lib/archive/local-music";
import { listPublicRadio } from "@/lib/radio";

export type PublicMemoryAssetV1 = {
  id: string;
  role: string;
  publicUrl: string;
  mimeType: string | null;
  altText: string | null;
  credits: string | null;
};

export type PublicMemoryArtifactV1 = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  summary: string | null;
  description: string | null;
  approximateDate: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  circa: boolean;
  place: string | null;
  territory: string | null;
  source: string | null;
  credits: string | null;
  rights: string;
  assets: PublicMemoryAssetV1[];
  canonicalHref: string;
  specialization: "generic" | "art" | "music" | "oral_history" | "radio";
  limitations: string[];
};

export type PublicMemoryCollectionV1 = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  items: PublicMemoryArtifactV1[];
};

export type PublicMemoryDirectoryV1 = {
  artifacts: PublicMemoryArtifactV1[];
  collections: PublicMemoryCollectionV1[];
  availability: "available" | "partially_available" | "unavailable";
  limitations: string[];
};

function assetDto(asset: ArchiveAsset): PublicMemoryAssetV1 | null {
  if (asset.bucket_scope !== "public_safe" || asset.review_status !== "approved" || !asset.public_url) return null;
  return { id: asset.id, role: asset.asset_role, publicUrl: asset.public_url, mimeType: asset.mime_type, altText: asset.alt_text, credits: asset.credits };
}

function genericArtifact(item: ArchiveItem & { assets: ArchiveAsset[] }): PublicMemoryArtifactV1 {
  return {
    id: item.id, slug: item.slug, kind: item.item_type, title: item.title, summary: item.summary,
    description: item.description, approximateDate: item.approximate_date, yearStart: item.year_start,
    yearEnd: item.year_end, circa: item.circa, place: item.place_name, territory: item.neighborhood,
    source: item.source_name, credits: item.credits, rights: item.rights_status,
    assets: item.assets.flatMap((asset) => { const safe = assetDto(asset); return safe ? [safe] : []; }),
    canonicalHref: item.item_type === "territorial_artwork" ? `/comun/acervo/arte/${item.slug}` : `/comun/acervo/${item.slug}`,
    specialization: "generic", limitations: [],
  };
}

/** Canonical, server-only public projection. Specialized readers remain authoritative. */
export async function getPublicMemoryDirectory(input: { page?: number; pageSize?: number } = {}): Promise<PublicMemoryDirectoryV1> {
  const [root, art, oral, music, radio] = await Promise.all([
    listPublicArchiveItems({ page: String(input.page ?? 1) }),
    listPublicArtworks({ page: input.page ?? 1, limit: Math.min(input.pageSize ?? 24, 24) }),
    listPublicOralHistories({}),
    listPublicReleases({ page: String(input.page ?? 1), pageSize: String(Math.min(input.pageSize ?? 24, 24)) }),
    listPublicRadio(),
  ]);
  const specialized = new Set((art.items ?? []).map((x: { id: string }) => x.id));
  const oralIds = new Set((oral.items ?? []).map((x: { id?: string; archive_item_id?: string }) => x.id ?? x.archive_item_id));
  const musicIds = new Set((music.items ?? []).map((x: { id?: string; archive_item_id?: string }) => x.id ?? x.archive_item_id));
  const radioIds = new Set((radio.episodes ?? []).map((x: { archive_item_id?: string }) => x.archive_item_id));
  const artifacts = (root as Array<ArchiveItem & { assets: ArchiveAsset[] }>)
    .filter((item) => !specialized.has(item.id) && !oralIds.has(item.id) && !musicIds.has(item.id) && !radioIds.has(item.id))
    .map(genericArtifact);
  return {
    artifacts,
    collections: [],
    availability: root.length || art.items?.length || oral.items?.length || music.items?.length || radio.episodes?.length ? "available" : "partially_available",
    limitations: ["Especializações só aparecem quando seus próprios direitos, consentimentos e segurança estão validados."],
  };
}

export function assertPublicMemoryDtoSafe(value: unknown): void {
  const forbidden = /object_key|original_filename|private_contact|raw_transcript|consent_evidence|review_notes|moderation|auth_id|processing_jobs|custody_events/i;
  if (forbidden.test(JSON.stringify(value))) throw new Error("Public memory DTO contains forbidden private fields");
}
