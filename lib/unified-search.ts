import { performance } from "node:perf_hooks";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { comunCanonicalRoutes } from "@/lib/comun-canonical-routes";
export type SearchResult = {
  type: string;
  title: string;
  summary: string | null;
  href: string;
  updatedAt?: string | null;
  origin: string;
  score: number;
};
export async function unifiedPublicSearch(
  term: string,
  filter?: { type?: string; pautaId?: string },
) {
  const started = performance.now(),
    q = term.trim().slice(0, 80);
  if (q.length < 2) return { results: [] as SearchResult[], durationMs: 0 };
  const db = createServiceSupabaseClient();
  const toolResults: SearchResult[] = /mapa|calçada|calcada/i.test(q)
    ? [
        {
          type: "ferramenta",
          title: "Mapa das Calçadas",
          summary:
            "Registre barreiras, acompanhe prioridades, mobilização, resultados e memória.",
          href: comunCanonicalRoutes.miniapp(),
          origin: "Pauta Calçadas em circulação",
          score: 90,
        },
      ]
    : [];
  if (!db)
    return {
      results: filter?.type && filter.type !== "ferramenta" ? [] : toolResults,
      durationMs: 0,
    };
  const clean = q.replace(/[%_,()]/g, " "),
    like = `%${clean}%`;
  const [
    communities,
    pautas,
    territories,
    actions,
    results,
    dossiers,
    archive,
    art,
    programs,
    episodes,
    collections,
  ] = await Promise.all([
    db
      .from("comun_communities")
      .select("slug,name,short_description,updated_at")
      .eq("is_active", true)
      .or(`name.ilike.${like},short_description.ilike.${like}`)
      .limit(12),
    db
      .from("comun_pauta_spaces")
      .select("id,slug,title,summary,updated_at")
      .eq("visibility", "public")
      .or(`title.ilike.${like},summary.ilike.${like}`)
      .limit(12),
    db
      .from("comun_hub_territories")
      .select("id,slug,name,public_summary,updated_at")
      .neq("status", "archived")
      .or(`name.ilike.${like},public_summary.ilike.${like}`)
      .limit(12),
    db
      .from("comun_mobilization_actions")
      .select("slug,title,objective_public,updated_at,pauta_id")
      .eq("visibility", "public")
      .or(`title.ilike.${like},objective_public.ilike.${like}`)
      .limit(12),
    db
      .from("comun_hub_results")
      .select("slug,title,public_summary,updated_at,pauta_id")
      .eq("visibility", "public")
      .or(`title.ilike.${like},public_summary.ilike.${like}`)
      .limit(12),
    db
      .from("comun_pauta_dossier_publication_snapshots")
      .select("public_slug,public_title,public_summary,published_at")
      .eq("status", "active")
      .or(`public_title.ilike.${like},public_summary.ilike.${like}`)
      .limit(12),
    db
      .from("comun_archive_items")
      .select("slug,title,summary,item_type,updated_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .or(`title.ilike.${like},summary.ilike.${like}`)
      .limit(12),
    db
      .from("comun_archive_artworks")
      .select(
        "title_public,description_public,updated_at,archive:comun_archive_items!inner(slug,status,visibility)",
      )
      .eq("publication_status", "published")
      .or(`title_public.ilike.${like},description_public.ilike.${like}`)
      .limit(12),
    db
      .from("comun_radio_programs")
      .select("slug_public,title_public,description_public,updated_at")
      .eq("publication_status", "published")
      .or(`title_public.ilike.${like},description_public.ilike.${like}`)
      .limit(12),
    db
      .from("comun_radio_episodes")
      .select("slug_public,title_public,summary_public,updated_at,pauta_id")
      .eq("publication_status", "published")
      .or(`title_public.ilike.${like},summary_public.ilike.${like}`)
      .limit(12),
    db
      .from("comun_archive_collections")
      .select("slug,title,description,updated_at")
      .eq("status", "published")
      .or(`title.ilike.${like},description.ilike.${like}`)
      .limit(12),
  ]);
  const score = (title: string, pautaId?: string | null) =>
    title.toLowerCase() === clean.toLowerCase()
      ? 100
      : title.toLowerCase().includes(clean.toLowerCase())
        ? 80
        : filter?.pautaId && pautaId === filter.pautaId
          ? 60
          : 40;
  let rows: SearchResult[] = [
    ...toolResults,
    ...(communities.data ?? []).map((x: any) => ({
      type: "comunidade",
      title: x.name,
      summary: x.short_description,
      href: `/comun/c/${x.slug}`,
      updatedAt: x.updated_at,
      origin: "Comunidade",
      score: score(x.name),
    })),
    ...(pautas.data ?? []).map((x: any) => ({
      type: "pauta",
      title: x.title,
      summary: x.summary,
      href: `/comun/pautas/${x.slug}`,
      updatedAt: x.updated_at,
      origin: "Pauta",
      score: score(x.title, x.id),
    })),
    ...(territories.data ?? []).map((x: any) => ({
      type: "território",
      title: x.name,
      summary: x.public_summary,
      href: `/comun/territorios/${x.slug}`,
      updatedAt: x.updated_at,
      origin: "Território",
      score: score(x.name),
    })),
    ...(actions.data ?? []).map((x: any) => ({
      type: "ação",
      title: x.title,
      summary: x.objective_public,
      href: `/comun/acoes/${x.slug}`,
      updatedAt: x.updated_at,
      origin: "Ação",
      score: score(x.title, x.pauta_id),
    })),
    ...(results.data ?? []).map((x: any) => ({
      type: "resultado",
      title: x.title,
      summary: x.public_summary,
      href: comunCanonicalRoutes.result(x.slug),
      updatedAt: x.updated_at,
      origin: "Resultado",
      score: score(x.title, x.pauta_id),
    })),
    ...(dossiers.data ?? []).map((x: any) => ({
      type: "documento",
      title: x.public_title,
      summary: x.public_summary,
      href: `/comun/dossies/${x.public_slug}`,
      updatedAt: x.published_at,
      origin: "Dossiê",
      score: score(x.public_title),
    })),
    ...(archive.data ?? []).map((x: any) => ({
      type: "memória",
      title: x.title,
      summary: x.summary,
      href: `/comun/acervo/${x.slug}`,
      updatedAt: x.updated_at,
      origin: `Acervo · ${x.item_type}`,
      score: score(x.title),
    })),
    ...(art.data ?? []).map((x: any) => ({
      type: "obra",
      title: x.title_public,
      summary: x.description_public,
      href: `/comun/acervo/arte/${x.archive.slug}`,
      updatedAt: x.updated_at,
      origin: "Arte dos Territórios",
      score: score(x.title_public),
    })),
    ...(programs.data ?? []).map((x: any) => ({
      type: "programa",
      title: x.title_public,
      summary: x.description_public,
      href: `/comun/radio/programas/${x.slug_public}`,
      updatedAt: x.updated_at,
      origin: "Rádio",
      score: score(x.title_public),
    })),
    ...(episodes.data ?? []).map((x: any) => ({
      type: "episódio",
      title: x.title_public,
      summary: x.summary_public,
      href: `/comun/radio/episodios/${x.slug_public}`,
      updatedAt: x.updated_at,
      origin: "Rádio",
      score: score(x.title_public, x.pauta_id),
    })),
    ...(collections.data ?? []).map((x: any) => ({
      type: "coleção",
      title: x.title,
      summary: x.description,
      href: `/comun/acervo/colecoes/${x.slug}`,
      updatedAt: x.updated_at,
      origin: "Acervo",
      score: score(x.title),
    })),
  ];
  if (filter?.type) rows = rows.filter((x) => x.type === filter.type);
  rows.sort(
    (a, b) =>
      b.score - a.score ||
      String(b.updatedAt).localeCompare(String(a.updatedAt)) ||
      a.title.localeCompare(b.title, "pt-BR"),
  );
  return {
    results: rows.slice(0, 50),
    durationMs: Math.round(performance.now() - started),
  };
}
