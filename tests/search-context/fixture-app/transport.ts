// Controlled database transport ONLY in the isolated browser fixture. Not RLS/Auth proof.
import { cookies } from "next/headers";
const published = "2026-10-01T12:00:00Z";
const root = {
  id: "archive-local",
  slug: "memoria-local",
  item_type: "photograph",
  title: "Memória da praça — laboratório",
  summary: "Uma fotografia e sua história local.",
  description: "Memória pública para o ensaio identificado.",
  status: "published",
  visibility: "public",
  published_at: published,
  rights_status: "licensed",
  credits: "Acervo comunitário",
  city: "Volta Redonda",
  official_links: [],
  created_at: published,
  updated_at: published,
};
const episode = {
  archive_item_id: "episode-local",
  program_item_id: "program-local",
  title_public: "Escuta da praça — laboratório",
  slug_public: "escuta-local",
  summary_public: "Uma conversa sobre cultura local.",
  published_at: published,
  publication_status: "published",
  transcript_status: "published",
  duration_seconds: 60,
  comun_archive_assets: [
    {
      asset_role: "radio_public_episode",
      bucket_scope: "public_safe",
      review_status: "approved",
      rights_status: "licensed",
      public_url: "/audio-lab.wav",
    },
  ],
};
const program = {
  archive_item_id: "program-local",
  title_public: "Vozes locais",
  slug_public: "vozes-locais",
  publication_status: "published",
};
const territory = {
  id: "org-local",
  slug: "roda-local",
  name: "Roda local",
  territory_type: "cooperative",
  status: "active",
  visibility: "public",
  verification_status: "verified",
  municipality: "Volta Redonda",
};
const organization = {
  territory_id: "org-local",
  public_name: "Roda local — laboratório",
  organization_type: "cooperative",
  status: "active",
  verification_status: "verified",
  presentation_public: "Uma roda de trocas comunitárias.",
  services_public: ["Livros"],
  last_verified_at: published,
};
const offer = {
  id: "offer-local",
  slug: "troca-local",
  organization_territory_id: "org-local",
  title: "Troca de livros — laboratório",
  public_summary: "Livros em circulação no território.",
  offer_kind: "service",
  modalities: ["exchange"],
  status: "published",
  reviewed_at: published,
  published_at: published,
  valid_until: "2099-01-01T12:00:00Z",
};
const tables: Record<string, Record<string, unknown>[]> = {
  comun_archive_items: [
    root,
    {
      ...root,
      id: "episode-local",
      slug: "episode-root",
      item_type: "radio_episode",
    },
  ],
  comun_archive_assets: episode.comun_archive_assets.map((a) => ({
    ...a,
    id: "asset-local",
    archive_item_id: "episode-local",
  })),
  comun_radio_programs: [program],
  comun_radio_episodes: [episode],
  comun_radio_voice_consents: [
    {
      episode_item_id: "episode-local",
      consent_status: "approved",
      allow_comun_audio: true,
    },
  ],
  comun_radio_transcript_versions: [
    {
      episode_item_id: "episode-local",
      status: "published",
      content: "Transcrição pública do laboratório.",
    },
  ],
  comun_pauta_spaces: [
    {
      id: "pauta-local",
      slug: "cultura-local",
      title: "Cultura local",
      visibility: "public",
    },
  ],
  comun_hub_territories: [territory],
  comun_territorial_organizations: [organization],
  comun_solidarity_offers: [offer],
};
function client() {
  return {
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from(table: string) {
      const filters: ((r: Record<string, unknown>) => boolean)[] = [];
      let single = false;
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "order", "limit", "range", "or", "is"])
        chain[m] = () => chain;
      chain.eq = (key: string, value: unknown) => {
        filters.push((r) => r[key] === value);
        return chain;
      };
      chain.neq = (key: string, value: unknown) => {
        filters.push((r) => r[key] !== value);
        return chain;
      };
      chain.in = (key: string, values: unknown[]) => {
        filters.push((r) => values.includes(r[key]));
        return chain;
      };
      chain.not = (key: string, operator: string, value: unknown) => {
        if (operator === "is") filters.push((r) => r[key] !== value);
        return chain;
      };
      chain.gt = (key: string, value: string) => {
        filters.push((r) => String(r[key]) > value);
        return chain;
      };
      chain.maybeSingle = () => {
        single = true;
        return chain;
      };
      chain.then = async (resolve: (r: unknown) => unknown) => {
        const mode =
          (await cookies()).get("search-context-lab")?.value ?? "ready";
        if (
          mode === "down" ||
          (mode === "partial" && table === "comun_archive_items")
        )
          return resolve({ data: null, error: { code: "LAB_DOWN" } });
        let rows =
          mode === "empty"
            ? []
            : (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
        if (mode === "withdrawn") {
          if (table === "comun_archive_items") rows = [];
          if (table === "comun_solidarity_offers") rows = [];
        }
        return resolve({
          data: single ? (rows[0] ?? null) : rows,
          error: null,
        });
      };
      return chain;
    },
    async rpc(name: string, params: Record<string, unknown>) {
      if (name === "comun_record_search_metric")
        return { data: null, error: null };
      if (name !== "comun_public_search_hybrid")
        throw Error("LAB_READ_ONLY_RPC");
      const mode =
        (await cookies()).get("search-context-lab")?.value ?? "ready";
      if (mode === "partial" || mode === "down")
        return { data: null, error: { code: "LAB_DOWN" } };
      if (mode === "empty" || mode === "withdrawn")
        return { data: [], error: null };
      const rows =
        params.p_query === "ausente"
          ? []
          : [
              {
                type: "memória",
                title: root.title,
                summary: root.summary,
                href: "/comun/acervo/memoria-local",
                origin: "Acervo",
                updated_at: published,
              },
              {
                type: "pauta",
                title: "Cultura local",
                summary: "Um espaço público de cultura.",
                href: "/comun/pautas/cultura-local",
                origin: "Pauta",
                updated_at: published,
              },
            ];
      return {
        data: rows.filter((r) => !params.p_type || r.type === params.p_type),
        error: null,
      };
    },
  };
}
export function createServiceSupabaseClient() {
  return client() as never;
}
export function createPublicSupabaseClient() {
  return client() as never;
}
export async function createSupabaseServerClient() {
  return client() as never;
}
export function hasSupabaseConfig() {
  return true;
}
