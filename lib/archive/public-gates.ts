export type PublicArchiveAssetCandidate = {
  bucket_scope?: string | null;
  review_status?: string | null;
  public_url?: string | null;
  rights_status?: string | null;
};

export function isPublicArchiveAssetEligible(asset: PublicArchiveAssetCandidate): boolean {
  return asset.bucket_scope === "public_safe" && asset.review_status === "approved" && Boolean(asset.public_url) && ["public_domain", "permission_granted", "licensed"].includes(asset.rights_status ?? "");
}

export type PublicArtworkRights = {
  consent_status?: string | null;
  allow_comun_display?: boolean | null;
  valid_from?: string | null;
  valid_until?: string | null;
  embargo_until?: string | null;
};

export function isPublicArtworkEligible(rights: PublicArtworkRights | null | undefined, safetyStatus?: string | null, now = new Date()): boolean {
  if (!rights || rights.allow_comun_display !== true || !["granted", "partially_granted"].includes(rights.consent_status ?? "")) return false;
  const today = now.toISOString().slice(0, 10);
  if (rights.valid_from && rights.valid_from > today) return false;
  if (rights.valid_until && rights.valid_until < today) return false;
  if (rights.embargo_until && new Date(rights.embargo_until).getTime() > now.getTime()) return false;
  return safetyStatus === undefined || safetyStatus === null || ["not_required", "approved"].includes(safetyStatus);
}

export type PublicRadioEligibilityInput = {
  root?: { status?: string | null; visibility?: string | null; published_at?: string | null } | null;
  publicationStatus?: string | null;
  consents?: ReadonlyArray<{ consent_status?: string | null; allow_comun_audio?: boolean | null; valid_from?: string | null; valid_until?: string | null }>;
  music?: ReadonlyArray<{ rights_status?: string | null; allow_streaming?: boolean | null }>;
  safetyStatus?: string | null;
  hasPublicAsset: boolean;
  transcriptStatus?: string | null;
  transcriptExceptionDocumented?: boolean;
  now?: Date;
};

export function resolvePublicRadioEpisodeEligibility(input: PublicRadioEligibilityInput): boolean {
  const now = input.now ?? new Date();
  if (!input.root || input.root.status !== "published" || input.root.visibility !== "public" || !input.root.published_at || input.publicationStatus !== "published") return false;
  if (!input.consents?.length || input.consents.some((consent) => consent.consent_status !== "approved" || consent.allow_comun_audio !== true || (consent.valid_from && consent.valid_from > now.toISOString().slice(0, 10)) || (consent.valid_until && consent.valid_until < now.toISOString().slice(0, 10)))) return false;
  if (input.music?.some((use) => !["approved", "public_domain_verified"].includes(use.rights_status ?? "") || use.allow_streaming !== true)) return false;
  if (input.safetyStatus && !["not_required", "approved"].includes(input.safetyStatus)) return false;
  if (!input.hasPublicAsset) return false;
  if (input.transcriptStatus !== "published" && !input.transcriptExceptionDocumented) return false;
  return true;
}
