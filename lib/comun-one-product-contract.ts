import type { Metadata } from "next";
import {
  COMUN_CANONICAL_ORIGIN,
  COMUN_INDEXING_POLICY,
  COMUN_PRIVATE_CRAWL_PATHS,
} from "./comun-indexing-policy";

export const COMUN_PUBLIC_SCHEMA_TYPES = [
  "Article",
  "Dataset",
  "Event",
  "Organization",
  "Place",
  "CreativeWork",
] as const;

export type ComunPublicSchemaType =
  (typeof COMUN_PUBLIC_SCHEMA_TYPES)[number];

export type ComunPublicSurfaceV1 = {
  schemaVersion: 1;
  id: string;
  type: string;
  title: string;
  summary: string;
  canonicalPath: string;
  image?: string | null;
  territory: { label: string; canonicalPath: string } | null;
  sources: Array<{ label: string; url: string }>;
  publishedAt: string;
  updatedAt: string;
  publication: "draft" | "published" | "withdrawn";
  privacy: "public" | "private" | "sensitive" | "pending_review";
  indexingAuthorization: "blocked" | "approved";
  shareText?: string | null;
  schemaType?: ComunPublicSchemaType | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  eventLocation?: string | null;
};

export type ComunSharePayload = {
  title: string;
  text: string;
  url: string;
};

export type ComunShareResult = "shared" | "copied" | "cancelled" | "failed";

export type ShareAdapters = {
  nativeShare?: ((payload: ComunSharePayload) => Promise<void>) | null;
  copy: (text: string) => Promise<void>;
};

export type ComunPublicSurfaceProjection = {
  findings: string[];
  shareable: boolean;
  indexable: boolean;
  share: ComunSharePayload | null;
  metadata: Metadata;
  jsonLd: Record<string, unknown> | null;
};

type ProjectionOptions = {
  launchPublicly?: boolean;
  indexingPolicy?: "pilot_noindex" | "indexing_open";
};

const PRIVATE_PATHS = COMUN_PRIVATE_CRAWL_PATHS.map((path) =>
  path.replace(/\/$/, ""),
);
const VALID_DATE = /^\d{4}-\d{2}-\d{2}(?:T[^\s]+(?:Z|[+-]\d{2}:\d{2}))?$/;

function cleanText(value: unknown, limit: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit)
    : "";
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    VALID_DATE.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function isComunPublicPath(pathname: string): boolean {
  if (!/^\/comun(?:\/|$)/.test(pathname) || pathname.includes("\\"))
    return false;
  const normalized = pathname.replace(/\/$/, "") || "/";
  return !PRIVATE_PATHS.some(
    (privatePath) =>
      normalized === privatePath || normalized.startsWith(`${privatePath}/`),
  );
}

export function toComunCanonicalPath(value: string): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[?#\\]/.test(value)
  )
    return null;

  try {
    const url = new URL(value, COMUN_CANONICAL_ORIGIN);
    if (
      url.origin !== COMUN_CANONICAL_ORIGIN ||
      url.pathname !== value ||
      url.search ||
      url.hash ||
      !isComunPublicPath(url.pathname)
    )
      return null;
    return url.pathname;
  } catch {
    return null;
  }
}

function isSafeReferenceUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//"))
    return !/[?#\\]/.test(value);
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function isSafeImageUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//"))
    return !/[?#\\]/.test(value);
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function validateComunPublicSurface(
  surface: ComunPublicSurfaceV1,
): string[] {
  const findings: string[] = [];
  const title = cleanText(surface.title, 120);
  const summary = cleanText(surface.summary, 500);

  if (surface.schemaVersion !== 1) findings.push("schema_version_unsupported");
  if (!cleanText(surface.id, 160)) findings.push("id_missing");
  if (!cleanText(surface.type, 80)) findings.push("type_missing");
  if (title.length < 3) findings.push("title_missing_or_short");
  if (summary.length < 20) findings.push("summary_missing_or_short");
  if (!toComunCanonicalPath(surface.canonicalPath))
    findings.push("canonical_path_not_public_or_stable");
  if (!isValidDate(surface.publishedAt)) findings.push("published_at_invalid");
  if (!isValidDate(surface.updatedAt)) findings.push("updated_at_invalid");
  if (!Array.isArray(surface.sources)) findings.push("sources_missing");
  else if (
    surface.sources.some(
      (source) =>
        !cleanText(source?.label, 160) ||
        typeof source?.url !== "string" ||
        !isSafeReferenceUrl(source.url),
    )
  ) {
    findings.push("source_reference_invalid");
  }

  if (surface.territory !== null) {
    if (
      !surface.territory ||
      !cleanText(surface.territory.label, 160) ||
      !toComunCanonicalPath(surface.territory.canonicalPath)
    )
      findings.push("territory_reference_invalid");
  }

  if (!isSafeImageUrl(surface.image)) findings.push("image_url_invalid");
  if (
    surface.schemaType &&
    !COMUN_PUBLIC_SCHEMA_TYPES.includes(surface.schemaType)
  )
    findings.push("structured_data_type_unsupported");
  if (surface.schemaType === "Event" && !isValidDate(surface.eventStartAt))
    findings.push("event_start_at_required");
  if (surface.eventEndAt && !isValidDate(surface.eventEndAt))
    findings.push("event_end_at_invalid");
  if (surface.indexingAuthorization === "approved") {
    if (surface.publication !== "published")
      findings.push("indexing_requires_published_surface");
    if (surface.privacy !== "public")
      findings.push("indexing_requires_public_privacy");
    if (!Array.isArray(surface.sources) || surface.sources.length === 0)
      findings.push("indexing_requires_sources");
  }

  return [...new Set(findings)];
}

function isSurfaceShareable(surface: ComunPublicSurfaceV1): boolean {
  return (
    surface.publication === "published" &&
    surface.privacy === "public" &&
    toComunCanonicalPath(surface.canonicalPath) !== null &&
    cleanText(surface.title, 120).length >= 3 &&
    cleanText(surface.summary, 500).length >= 20 &&
    isValidDate(surface.publishedAt) &&
    isValidDate(surface.updatedAt) &&
    Array.isArray(surface.sources)
  );
}

function publicSurfaceUrl(path: string): string {
  return new URL(path, COMUN_CANONICAL_ORIGIN).toString();
}

function publicSurfaceImage(image?: string | null): string {
  if (!isSafeImageUrl(image) || !image)
    return new URL("/icons/comun-512.png", COMUN_CANONICAL_ORIGIN).toString();
  return new URL(image, COMUN_CANONICAL_ORIGIN).toString();
}

function makeJsonLd(
  surface: ComunPublicSurfaceV1,
  canonicalUrl: string,
  imageUrl: string,
): Record<string, unknown> | null {
  if (!surface.schemaType) return null;
  if (surface.schemaType === "Event" && !isValidDate(surface.eventStartAt))
    return null;

  const value: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": surface.schemaType,
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: cleanText(surface.title, 120),
    description: cleanText(surface.summary, 500),
    image: imageUrl,
  };

  if (surface.schemaType === "Article") {
    value.headline = cleanText(surface.title, 120);
    value.datePublished = surface.publishedAt;
    value.dateModified = surface.updatedAt;
    if (surface.sources.length)
      value.citation = surface.sources.map((source) => source.url);
  } else if (surface.schemaType === "Dataset") {
    value.dateModified = surface.updatedAt;
    if (surface.sources.length)
      value.citation = surface.sources.map((source) => source.url);
  } else if (surface.schemaType === "Event") {
    value.startDate = surface.eventStartAt;
    if (surface.eventEndAt) value.endDate = surface.eventEndAt;
    if (surface.eventLocation)
      value.location = { "@type": "Place", name: surface.eventLocation };
  } else if (surface.schemaType === "CreativeWork") {
    value.datePublished = surface.publishedAt;
    value.dateModified = surface.updatedAt;
    if (surface.sources.length)
      value.citation = surface.sources.map((source) => source.url);
  }

  return value;
}

export function projectComunPublicSurface(
  surface: ComunPublicSurfaceV1,
  options: ProjectionOptions = {},
): ComunPublicSurfaceProjection {
  const findings = validateComunPublicSurface(surface);
  const shareable = isSurfaceShareable(surface);
  const canonicalPath = toComunCanonicalPath(surface.canonicalPath);
  const canonicalUrl = canonicalPath ? publicSurfaceUrl(canonicalPath) : null;
  const indexable = Boolean(
    shareable &&
      canonicalUrl &&
      surface.indexingAuthorization === "approved" &&
      surface.sources.length > 0 &&
      findings.length === 0 &&
      options.launchPublicly === true &&
      (options.indexingPolicy ?? COMUN_INDEXING_POLICY) === "indexing_open",
  );

  if (!shareable || !canonicalUrl) {
    return {
      findings,
      shareable: false,
      indexable: false,
      share: null,
      metadata: { robots: { index: false, follow: false } },
      jsonLd: null,
    };
  }

  const title = cleanText(surface.title, 120);
  const description = cleanText(surface.shareText || surface.summary, 500);
  const image = publicSurfaceImage(surface.image);
  const share = { title, text: description, url: canonicalUrl };
  const openGraphType =
    surface.schemaType === "Article" || surface.schemaType === "CreativeWork"
      ? "article"
      : "website";

  return {
    findings,
    shareable: true,
    indexable,
    share,
    metadata: {
      title,
      description: cleanText(surface.summary, 500),
      alternates: { canonical: canonicalUrl },
      robots: { index: indexable, follow: true },
      openGraph: {
        type: openGraphType,
        title,
        description: cleanText(surface.summary, 500),
        url: canonicalUrl,
        images: [image],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: cleanText(surface.summary, 500),
        images: [image],
      },
    },
    jsonLd: findings.length === 0 ? makeJsonLd(surface, canonicalUrl, image) : null,
  };
}

export function buildComunPageSharePayload(input: {
  fallbackTitle: string;
  pageTitle?: string | null;
  pageDescription?: string | null;
  canonicalHref?: string | null;
  currentHref: string;
}): ComunSharePayload {
  const fallbackTitle = cleanText(input.fallbackTitle, 120) || "COMUN";
  let current: URL;
  try {
    current = new URL(input.currentHref);
  } catch {
    current = new URL("/comun", COMUN_CANONICAL_ORIGIN);
  }

  const canonical = input.canonicalHref
    ? (() => {
        try {
          const candidate = new URL(input.canonicalHref, current);
          const allowedOrigin =
            candidate.origin === COMUN_CANONICAL_ORIGIN ||
            candidate.origin === current.origin;
          return allowedOrigin ? candidate : null;
        } catch {
          return null;
        }
      })()
    : null;
  const path = canonical?.pathname || current.pathname;
  const safePath =
    isComunPublicPath(current.pathname) && isComunPublicPath(path)
      ? path
      : "/comun";
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(
    current.hostname.replace(/^\[|\]$/g, ""),
  );
  const origin =
    canonical?.origin === COMUN_CANONICAL_ORIGIN
      ? COMUN_CANONICAL_ORIGIN
      : isLocal
        ? current.origin
        : COMUN_CANONICAL_ORIGIN;
  const url = new URL(safePath, origin).toString();
  const title =
    safePath === "/comun"
      ? fallbackTitle
      : cleanText(input.pageTitle, 120) || fallbackTitle;
  const text =
    safePath === "/comun"
      ? `Veja no COMUN: ${fallbackTitle}`
      : cleanText(input.pageDescription, 500) || `Veja no COMUN: ${title}`;

  return { title, text, url };
}

export async function shareOrCopy(
  payload: ComunSharePayload,
  adapters: ShareAdapters,
): Promise<ComunShareResult> {
  if (adapters.nativeShare) {
    try {
      await adapters.nativeShare(payload);
      return "shared";
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
        return "cancelled";
    }
  }

  try {
    await adapters.copy(payload.url);
    return "copied";
  } catch {
    return "failed";
  }
}
