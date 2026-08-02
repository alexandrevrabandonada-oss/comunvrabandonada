import { comunCanonicalRoutes } from "@/lib/comun-canonical-routes";

export const COMUN_ENTITY_KINDS = [
  "territory",
  "community",
  "pauta",
  "action",
  "miniapp",
  "protocol",
  "result",
  "memory",
] as const;

export type ComunEntityKind = (typeof COMUN_ENTITY_KINDS)[number];

export type EntityReference = {
  kind: ComunEntityKind;
  slug: string;
  title: string;
  href: string;
  state?: string;
};

export type EntityAction = {
  href: string;
  label: string;
  description?: string;
};

export type EntityRelation = EntityReference & {
  source:
    "foreign_key" | "junction" | "published_projection" | "canonical_route";
  scope?: string;
  count?: number;
};

export type ComunEntityContext = {
  kind: ComunEntityKind;
  id: string;
  slug: string;
  title: string;
  shortTitle?: string;
  state?: string;
  summary?: string;
  territory?: EntityReference;
  community?: EntityReference;
  pauta?: EntityReference;
  primaryAction?: EntityAction;
  relations: EntityRelation[];
};

const relationAllowlist: Record<
  ComunEntityKind,
  ReadonlySet<ComunEntityKind>
> = {
  territory: new Set([
    "community",
    "pauta",
    "miniapp",
    "action",
    "result",
    "memory",
  ]),
  community: new Set(["territory", "pauta", "action", "result", "memory"]),
  pauta: new Set([
    "territory",
    "community",
    "action",
    "miniapp",
    "protocol",
    "result",
    "memory",
  ]),
  action: new Set([
    "territory",
    "community",
    "pauta",
    "protocol",
    "result",
    "memory",
  ]),
  miniapp: new Set([
    "territory",
    "community",
    "pauta",
    "action",
    "result",
    "memory",
  ]),
  protocol: new Set([
    "territory",
    "community",
    "pauta",
    "action",
    "result",
    "memory",
  ]),
  result: new Set(["territory", "community", "pauta", "action", "memory"]),
  memory: new Set([
    "territory",
    "community",
    "pauta",
    "action",
    "result",
    "memory",
  ]),
};

const canonicalPrefixes = [
  "/comun/territorios",
  "/comun/comunidades",
  "/comun/c/",
  "/comun/pautas",
  "/comun/acoes",
  "/comun/calcadas",
  "/comun/acompanhar",
  "/comun/resultados",
  "/comun/acervo",
  "/comun/radio",
] as const;

export function createComunEntityContext(
  input: Omit<ComunEntityContext, "relations"> & {
    relations?: EntityRelation[];
  },
): ComunEntityContext {
  const context = {
    ...input,
    id: safeText(input.id, 160),
    slug: safeSlug(input.slug),
    title: safeText(input.title, 180),
    shortTitle: input.shortTitle ? safeText(input.shortTitle, 72) : undefined,
    state: input.state ? safeText(input.state, 72) : undefined,
    summary: input.summary ? safeText(input.summary, 600) : undefined,
    primaryAction: input.primaryAction
      ? {
          href: safeActionHref(input.primaryAction.href),
          label: safeText(input.primaryAction.label, 90),
          description: input.primaryAction.description
            ? safeText(input.primaryAction.description, 240)
            : undefined,
        }
      : undefined,
    relations: (input.relations ?? []).map((relation) => {
      if (!relationAllowlist[input.kind].has(relation.kind)) {
        throw new Error(
          `COMUN_ENTITY_RELATION_NOT_ALLOWED:${input.kind}:${relation.kind}`,
        );
      }
      return {
        ...relation,
        slug: safeSlug(relation.slug),
        title: safeText(relation.title, 180),
        href: safeHref(relation.href),
        state: relation.state ? safeText(relation.state, 72) : undefined,
        scope: relation.scope ? safeText(relation.scope, 160) : undefined,
        count:
          typeof relation.count === "number" && relation.count >= 0
            ? Math.floor(relation.count)
            : undefined,
      };
    }),
  } satisfies ComunEntityContext;
  return context;
}

export function entityReference(
  kind: ComunEntityKind,
  slug: string,
  title: string,
  state?: string,
): EntityReference {
  return {
    kind,
    slug: safeSlug(slug),
    title: safeText(title, 180),
    href: canonicalEntityHref(kind, slug),
    state: state ? safeText(state, 72) : undefined,
  };
}

export function canonicalEntityHref(kind: ComunEntityKind, slug: string) {
  const safe = safeSlug(slug);
  switch (kind) {
    case "territory":
      return comunCanonicalRoutes.territory(safe);
    case "community":
      return comunCanonicalRoutes.community(safe);
    case "pauta":
      return comunCanonicalRoutes.pauta(safe);
    case "action":
      return `/comun/acoes/${safe}`;
    case "miniapp":
      return comunCanonicalRoutes.miniapp(safe);
    case "protocol":
      return `/comun/acompanhar/${safe}`;
    case "result":
      return comunCanonicalRoutes.result(safe);
    case "memory":
      return `/comun/acervo/${safe}`;
  }
}

function safeHref(value: string) {
  const href = value.trim();
  if (!canonicalPrefixes.some((prefix) => href.startsWith(prefix))) {
    throw new Error(`COMUN_ENTITY_NON_CANONICAL_HREF:${href}`);
  }
  return href;
}

function safeActionHref(value: string) {
  const href = value.trim();
  if (
    href === "/comun/participar" ||
    href.startsWith("/comun/participar?") ||
    href.startsWith("/comun/participar#")
  ) {
    return href;
  }
  return safeHref(href);
}

function safeSlug(value: string) {
  const slug = value.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,159}$/i.test(slug)) {
    throw new Error("COMUN_ENTITY_INVALID_SLUG");
  }
  return slug;
}

function safeText(value: string, max: number) {
  const clean = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) throw new Error("COMUN_ENTITY_EMPTY_PUBLIC_TEXT");
  return clean.slice(0, max);
}
