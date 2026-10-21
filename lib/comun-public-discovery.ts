import {
  resolveComunExperience,
  withComunExperience,
} from "./comun-experience";
import type { PublicSourceState } from "./public-source-state";
export type DiscoveryKind = "acervo" | "radio" | "feirinha";
export type DiscoveryCard = {
  title: string;
  summary: string;
  path: string;
  attribution: string;
  context: string | null;
  dateTime: string;
  dateLabel: string;
  rights: string;
};
export type DiscoverySource = {
  kind: DiscoveryKind;
  state: PublicSourceState;
  items: DiscoveryCard[];
};
const slug = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
  !/(?:smoke|fixture|synthetic)/.test(value);
const sensitive =
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){8,}|[a-f0-9]{8}-[a-f0-9-]{27,}|https?:|object_key|access_token|refresh_token/i;
function text(value: unknown, max = 1200): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean && clean.length <= max && !sensitive.test(clean) ? clean : null;
}
const date = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
function source(
  kind: DiscoveryKind,
  state: PublicSourceState,
  items: DiscoveryCard[],
): DiscoverySource {
  return {
    kind,
    state: state === "unavailable" ? state : items.length ? "ready" : "empty",
    items: state === "unavailable" ? [] : items.slice(0, 2),
  };
}
export function archiveDiscovery(read: {
  state: PublicSourceState;
  items: readonly {
    item_type: string;
    status: string;
    visibility: string;
    slug: string;
    title: string;
    summary?: string | null;
    credits?: string | null;
    source_name?: string | null;
    published_at?: string | null;
    rights_status: string;
    city?: string | null;
  }[];
}): DiscoverySource {
  const rights: Record<string, string> = {
    public_domain: "Domínio público informado no Acervo.",
    permission_granted: "Exibição autorizada; consulte outros usos no Acervo.",
    licensed: "Material licenciado; consulte a licença no Acervo.",
  };
  return source(
    "acervo",
    read.state,
    read.items.flatMap((item) => {
      const title = text(item.title, 200),
        summary = text(item.summary),
        attribution = text(item.credits || item.source_name, 300),
        published = date(item.published_at);
      if (
        !["photograph", "document"].includes(item.item_type) ||
        item.status !== "published" ||
        item.visibility !== "public" ||
        !slug(item.slug) ||
        !title ||
        !summary ||
        !attribution ||
        !published ||
        !rights[item.rights_status]
      )
        return [];
      return [
        {
          title,
          summary,
          path: `/comun/acervo/${item.slug}`,
          attribution: `Crédito/fonte: ${attribution}`,
          context: text(item.city, 160),
          dateTime: published,
          dateLabel: "Publicado em",
          rights: rights[item.rights_status],
        },
      ];
    }),
  );
}
export function radioDiscovery(read: {
  state: PublicSourceState;
  programs: readonly { archive_item_id: string; title_public: string }[];
  episodes: readonly {
    program_item_id: string;
    title_public: string;
    summary_public?: string | null;
    slug_public: string;
    published_at?: string | null;
    territory?: { name: string } | null;
  }[];
}): DiscoverySource {
  return source(
    "radio",
    read.state,
    read.episodes.flatMap((episode) => {
      const program = read.programs.find(
        (item) => item.archive_item_id === episode.program_item_id,
      );
      const title = text(episode.title_public, 200),
        summary = text(episode.summary_public),
        programTitle = text(program?.title_public, 200),
        published = date(episode.published_at);
      if (
        !slug(episode.slug_public) ||
        !title ||
        !summary ||
        !programTitle ||
        !published
      )
        return [];
      return [
        {
          title,
          summary,
          path: `/comun/radio/episodios/${episode.slug_public}`,
          attribution: `Programa: ${programTitle}`,
          context: text(episode.territory?.name, 160),
          dateTime: published,
          dateLabel: "Publicado em",
          rights:
            "Escuta no COMUN; consulte créditos e condições de uso no episódio.",
        },
      ];
    }),
  );
}
type DiscoveryOffer = {
  slug: string;
  title: string;
  summary?: string | null;
  validUntil?: string | null;
  dueAt?: string | null;
  organization?: {
    slug: string;
    publicName: string;
    serviceTerritory?: string | null;
  } | null;
};
export function solidarityDiscovery(
  read: {
    sourceState: string;
    offers: readonly DiscoveryOffer[];
    needs: readonly DiscoveryOffer[];
  },
  enabled: boolean,
  now = Date.now(),
): DiscoverySource {
  const items: DiscoveryCard[] = [];
  for (const [kind, rows] of [
    ["oferta", read.offers],
    ["necessidade", read.needs],
  ] as const)
    for (const item of rows) {
      const title = text(item.title, 200),
        summary = text(item.summary),
        organization = text(item.organization?.publicName, 200),
        until = date(kind === "oferta" ? item.validUntil : item.dueAt);
      if (
        !slug(item.slug) ||
        !slug(item.organization?.slug) ||
        !title ||
        !summary ||
        !organization ||
        !until ||
        Date.parse(until) <= now
      )
        continue;
      items.push({
        title,
        summary,
        path: `/comun/cooperativas/${item.organization.slug}?${kind}=${item.slug}`,
        attribution: `Organização: ${organization}`,
        context: text(item.organization?.serviceTerritory, 160),
        dateTime: until,
        dateLabel: kind === "oferta" ? "Disponível até" : "Prazo informado",
        rights:
          "Informação pública da organização; confirme condições no detalhe. Sem compra ou reserva.",
      });
    }
  return source(
    "feirinha",
    !enabled || read.sourceState !== "available" ? "unavailable" : "ready",
    items,
  );
}
export function discoveryItemHref(
  path: string,
  experience: unknown,
  category?: unknown,
) {
  let url: URL;
  try {
    url = new URL(path, "https://local.invalid");
  } catch {
    return "/comun/explorar";
  }
  if (
    url.origin !== "https://local.invalid" ||
    !/^\/comun\/(?:acervo\/[a-z0-9-]+|radio\/episodios\/[a-z0-9-]+|cooperativas\/[a-z0-9-]+)$/.test(
      url.pathname,
    )
  )
    return "/comun/explorar";
  const query = new URLSearchParams();
  for (const name of ["oferta", "necessidade"]) {
    const value = url.searchParams.get(name);
    if (slug(value)) query.set(name, value);
  }
  query.set("origem", "descoberta");
  if (["acervo", "radio", "feirinha"].includes(String(category)))
    query.set("categoria", String(category));
  return withComunExperience(
    `${url.pathname}?${query}`,
    resolveComunExperience(
      typeof experience === "string" ? experience : undefined,
    ),
  );
}
export function discoveryReturnHref(query: {
  origem?: unknown;
  experiencia?: unknown;
  categoria?: unknown;
}) {
  if (query.origem !== "descoberta") return null;
  const category = ["acervo", "radio", "feirinha"].includes(
    String(query.categoria),
  )
    ? `?categoria=${query.categoria}`
    : "";
  return withComunExperience(
    `/comun/explorar${category}`,
    resolveComunExperience(
      typeof query.experiencia === "string" ? query.experiencia : undefined,
    ),
  );
}
