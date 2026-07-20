import Link from "next/link";
import { ComunShell } from "@/components/comun-shell";
import {
  ComunBreadcrumbs,
  ComunEmptyState,
  ComunSection,
} from "@/components/comun-ui";
import { unifiedPublicSearch } from "@/lib/unified-search";
const types = [
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
    { results, durationMs } = await unifiedPublicSearch(q, {
      type: p.tipo,
      pautaId: p.pauta,
    });
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
        {q.length >= 2 ? (
          <p role="status" className="mt-4 text-sm">
            {results.length} resultados públicos · consulta local {durationMs}{" "}
            ms
          </p>
        ) : null}
        <div className="mt-6 divide-y-2 divide-comun-paper/20 border-y-2 border-comun-paper/20">
          {results.map((x, i) => (
            <article className="py-5" key={`${x.href}-${i}`}>
              <p className="text-xs font-black uppercase text-comun-yellow">
                {x.type} · origem: {x.origin}
              </p>
              <h2 className="mt-2 text-xl font-black">
                <Link
                  className="underline decoration-2 underline-offset-4"
                  href={x.href}
                >
                  {x.title}
                </Link>
              </h2>
              {x.summary ? (
                <p className="mt-2 max-w-3xl text-comun-paper/70">
                  {x.summary}
                </p>
              ) : null}
            </article>
          ))}
        </div>
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
