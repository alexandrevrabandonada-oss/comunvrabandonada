import { ComunShell } from "@/components/comun-shell";
import {
  ComunBreadcrumbs,
  ComunEmptyState,
  ComunSection,
} from "@/components/comun-ui";
import { isPublicContentDeliverable } from "@/lib/public-content-readiness";
import { unifiedPublicSearch } from "@/lib/unified-search";
import { LiveSearchResults } from "@/components/civic-intelligence/live-search-results";
import { hybridPublicSearch } from "@/lib/civic-intelligence/search";

async function initialPublicSearch(
  query: string,
  filters: { type?: string; pautaId?: string },
) {
  try {
    const projected = await hybridPublicSearch({
      query,
      type: filters.type,
      pautaId: filters.pautaId,
      semantic: false,
    });
    return { results: projected.results, durationMs: projected.durationMs };
  } catch {
    return unifiedPublicSearch(query, filters);
  }
}
const types = [
  "ferramenta",
  "comunidade",
  "pauta",
  "território",
  "ação",
  "resultado",
  "documento",
  "memória",
  "obra",
  "programa",
  "episódio",
  "coleção",
];
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; pauta?: string }>;
}) {
  const p = await searchParams,
    q = p.q ?? "",
    search = await initialPublicSearch(q, {
      type: p.tipo,
      pautaId: p.pauta,
    }),
    results = search.results.filter((result) =>
      isPublicContentDeliverable({
        slug: result.href,
        title: result.title,
        summary: result.summary,
      }),
    ),
    durationMs = search.durationMs;
  return (
    <ComunShell>
      <ComunSection>
        <ComunBreadcrumbs
          items={[{ label: "Início", href: "/comun" }, { label: "Buscar" }]}
        />
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Buscar no COMUN
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Resultados públicos de processos, territórios e memória. A ordem usa
          correspondência editorial, nunca popularidade.
        </p>
        <details className="mt-4 max-w-3xl border-l-4 border-comun-yellow pl-4 text-sm text-comun-paper/75">
          <summary className="min-h-11 cursor-pointer py-2 font-black uppercase">
            Como esta busca funciona
          </summary>
          <p>
            Primeiro mostramos correspondências por termos. Quando disponível,
            relações de significado usam somente conteúdo já público. A busca
            não decide, publica, cria perfil nem guarda seu texto; você pode
            desligar o enriquecimento sem perder os resultados iniciais.
          </p>
        </details>
        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            aria-label="Termo de busca"
            className="min-h-12 border-2 bg-white px-3 text-comun-black"
            name="q"
            defaultValue={q}
            placeholder="Pauta, território, ação, memória…"
          />
          <select
            aria-label="Tipo de resultado"
            className="min-h-12 border-2 bg-white px-3 text-comun-black"
            name="tipo"
            defaultValue={p.tipo ?? ""}
          >
            <option value="">Todos os tipos</option>
            {types.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button className="min-h-12 border-2 border-comun-yellow px-5 font-black uppercase text-comun-yellow">
            Buscar
          </button>
        </form>
        <LiveSearchResults
          query={q}
          type={p.tipo}
          pauta={p.pauta}
          initialResults={results}
          lexicalDurationMs={durationMs}
        />
        {q.length >= 2 && !results.length ? (
          <ComunEmptyState href="/comun/participar">
            Não encontramos conteúdo público com esses filtros. Você pode
            explorar as formas de participação.
          </ComunEmptyState>
        ) : null}
      </ComunSection>
    </ComunShell>
  );
}
