import type { Metadata } from "next";
import { ComunShell } from "@/components/comun-shell";
import { ComunBreadcrumbs, ComunSection } from "@/components/comun-ui";
import { redirect } from "next/navigation";
import {
  normalizeSearchState,
  PUBLIC_SEARCH_TYPES,
  searchHref,
} from "@/lib/public-search-context";
import {
  readPublicSearch,
  resolvePublicSearchFilter,
} from "@/lib/civic-intelligence/public-search-read";
import { submitPublicSearch } from "./actions";

import { LiveSearchResults } from "@/components/civic-intelligence/live-search-results";

export const metadata: Metadata = {
  title: "Buscar no COMUN | COMUN VR Abandonada",
  description:
    "Busca pública de pautas, territórios, ações e memória no COMUN.",
};

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const canonical = { ...p };
  let changed = false;
  for (const key of ["pauta", "territorio"] as const)
    if (p[key] && /^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(p[key]!)) {
      let slug: string | undefined;
      try {
        slug = (await resolvePublicSearchFilter(key, p[key]!))?.slug;
      } catch {
        redirect("/comun/buscar?aviso=filtro-indisponivel");
      }
      if (!slug) redirect("/comun/buscar?aviso=filtro-indisponivel");
      canonical[key] = slug;
      changed = true;
    }
  const state = normalizeSearchState(canonical);
  if (!state) redirect("/comun/buscar?aviso=consulta-nao-publica");
  if (
    changed ||
    Object.keys(p).some(
      (k) =>
        ![
          "q",
          "tipo",
          "pauta",
          "territorio",
          "experiencia",
          "semantic",
          "aviso",
        ].includes(k),
    )
  )
    redirect(searchHref(state));
  const q = state.q;
  const search = await readPublicSearch(state, false);
  const results = search.results,
    durationMs = search.durationMs;
  return (
    <ComunShell publicReadOnlyFallback>
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
        {p.aviso ? (
          <p role="alert" aria-label="Consulta pública" className="mt-4">
            {p.aviso === "filtro-indisponivel"
              ? "Não foi possível verificar esse filtro público. Tente novamente sem esse contexto."
              : "Use somente termos públicos nesta busca. Contatos, credenciais e identificadores privados não são aceitos."}
          </p>
        ) : null}
        <p className="mt-3 text-sm">
          A consulta pública fica no endereço e no histórico do navegador. Não
          inclua contato, relato privado, senha ou código.
        </p>
        <form
          key={searchHref(state)}
          action={submitPublicSearch}
          className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto]"
        >
          {(["pauta", "territorio", "experiencia", "semantic"] as const).map(
            (key) =>
              state[key] ? (
                <input key={key} type="hidden" name={key} value={state[key]} />
              ) : null,
          )}
          <input
            maxLength={120}
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
            defaultValue={state.tipo ?? ""}
          >
            <option value="">Todos os tipos</option>
            {PUBLIC_SEARCH_TYPES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button className="min-h-12 border-2 border-comun-yellow px-5 font-black uppercase text-comun-yellow">
            Buscar
          </button>
        </form>
        <nav aria-label="Filtros ativos" className="mt-4 flex flex-wrap gap-3">
          {(["tipo", "pauta", "territorio"] as const).map((key) =>
            state[key] ? (
              <a
                className="inline-flex min-h-11 items-center underline"
                key={key}
                href={searchHref({ ...state, [key]: undefined })}
              >
                Remover {key}: {state[key]}
              </a>
            ) : null,
          )}
          {state.tipo || state.pauta || state.territorio ? (
            <a
              className="inline-flex min-h-11 items-center underline"
              href={searchHref({
                q: state.q,
                experiencia: state.experiencia,
                semantic: state.semantic,
              })}
            >
              Limpar filtros e manter busca
            </a>
          ) : null}
        </nav>
        <LiveSearchResults
          searchState={state}
          initialAvailability={search.availability}
          query={q}
          type={state.tipo}
          pauta={state.pauta}
          initialResults={results}
          lexicalDurationMs={durationMs}
        />
      </ComunSection>
    </ComunShell>
  );
}
