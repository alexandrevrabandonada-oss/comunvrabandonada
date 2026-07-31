"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SearchResult } from "@/lib/unified-search";
import type { CivicIntentMatch } from "@/lib/civic-intelligence/intents";

type EnrichedResult = SearchResult & { matchReason?: string };
type ApiResponse = {
  results: EnrichedResult[];
  intents: CivicIntentMatch[];
  semanticState: "ready" | "disabled" | "unavailable" | "timeout";
  durationMs: number;
};

const orderedTypes = [
  "ferramenta",
  "comunidade",
  "pauta",
  "território",
  "ação",
  "resultado",
  "documento",
  "calçada",
  "memória",
  "obra",
  "programa",
  "episódio",
  "coleção",
];

export function LiveSearchResults({
  query,
  type,
  pauta,
  initialResults,
  lexicalDurationMs,
}: {
  query: string;
  type?: string;
  pauta?: string;
  initialResults: SearchResult[];
  lexicalDurationMs: number;
}) {
  const [semantic, setSemantic] = useState(true);
  const [state, setState] = useState<
    "idle" | "loading" | "ready" | "unavailable" | "timeout"
  >(query.length >= 2 ? "loading" : "idle");
  const [enriched, setEnriched] = useState<EnrichedResult[]>([]);
  const [intents, setIntents] = useState<CivicIntentMatch[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    const params = new URLSearchParams({
      q: query,
      semantic: semantic ? "1" : "0",
    });
    if (type) params.set("tipo", type);
    if (pauta) params.set("pauta", pauta);
    fetch(`/api/comun/civic-search?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(response.status === 429 ? "unavailable" : "fallback");
        return response.json() as Promise<ApiResponse>;
      })
      .then((response) => {
        setEnriched(
          response.results.filter(
            (result) =>
              result.href.startsWith("/comun") && result.title.length > 0,
          ),
        );
        setIntents(response.intents);
        setDuration(response.durationMs);
        setState(
          response.semanticState === "timeout"
            ? "timeout"
            : response.semanticState === "unavailable"
              ? "unavailable"
              : "ready",
        );
      })
      .catch((error) =>
        setState(
          error instanceof DOMException && error.name === "AbortError"
            ? "timeout"
            : "unavailable",
        ),
      )
      .finally(() => window.clearTimeout(timer));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [pauta, query, semantic, type]);

  const results = useMemo(() => {
    const merged = new Map<string, EnrichedResult>();
    for (const result of initialResults)
      merged.set(`${result.type}:${result.href}`, result);
    for (const result of enriched)
      merged.set(`${result.type}:${result.href}`, {
        ...merged.get(`${result.type}:${result.href}`),
        ...result,
      });
    return [...merged.values()];
  }, [enriched, initialResults]);
  const groups = orderedTypes
    .map((groupType) => ({
      type: groupType,
      rows: results.filter((result) => result.type === groupType),
    }))
    .filter((group) => group.rows.length);

  if (query.length < 2) return null;
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <p role="status" aria-live="polite" data-testid="civic-search-status">
          {results.length} resultados públicos · correspondência inicial em{" "}
          {lexicalDurationMs} ms
          {state === "loading" ? " · buscando relações…" : ""}
          {state === "ready" && duration !== null
            ? ` · relações atualizadas em ${duration} ms`
            : ""}
          {state === "timeout"
            ? " · relações demoraram demais; resultados iniciais preservados"
            : ""}
          {state === "unavailable"
            ? " · relações indisponíveis; resultados iniciais preservados"
            : ""}
        </p>
        <button
          type="button"
          aria-pressed={!semantic}
          className="min-h-11 border-2 border-comun-paper px-3 font-black underline-offset-4 hover:underline"
          onClick={() => {
            setState("loading");
            setSemantic((value) => !value);
          }}
        >
          {semantic ? "Usar somente termos" : "Buscar também relações"}
        </button>
      </div>

      {intents.length ? (
        <section
          className="mt-5 border-2 border-comun-yellow p-4"
          aria-labelledby="intent-title"
        >
          <h2
            id="intent-title"
            className="font-black uppercase text-comun-yellow"
          >
            Você quer chegar aonde?
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {intents.map((intent) => (
              <Link
                key={intent.intentId}
                className="min-h-11 border-2 border-comun-yellow px-3 py-2 font-black"
                href={intent.route}
              >
                {intent.label}
                {intent.requiresAuthentication ? " · requer entrada" : ""}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-comun-paper/70">
            A busca oferece rotas canônicas; nenhuma ação é executada
            automaticamente.
          </p>
        </section>
      ) : null}

      <div className="mt-6 grid gap-8">
        {groups.map((group) => (
          <section key={group.type} aria-labelledby={`grupo-${group.type}`}>
            <h2
              id={`grupo-${group.type}`}
              className="border-b-2 border-comun-yellow pb-2 text-xl font-black uppercase text-comun-yellow"
            >
              {group.type}
            </h2>
            <div className="divide-y-2 divide-comun-paper/20">
              {group.rows.map((result, index) => (
                <article className="py-5" key={`${result.href}-${index}`}>
                  <p className="text-xs font-black uppercase text-comun-yellow">
                    {result.type} · origem: {result.origin}
                  </p>
                  <h3 className="mt-2 text-xl font-black">
                    <Link
                      className="underline decoration-2 underline-offset-4"
                      href={result.href}
                    >
                      {result.title}
                    </Link>
                  </h3>
                  {result.summary ? (
                    <p className="mt-2 max-w-3xl text-comun-paper/70">
                      {result.summary}
                    </p>
                  ) : null}
                  {result.updatedAt ? (
                    <time
                      className="mt-2 block text-xs text-comun-paper/60"
                      dateTime={result.updatedAt}
                    >
                      Fonte atualizada em{" "}
                      {new Date(result.updatedAt).toLocaleDateString("pt-BR")}
                    </time>
                  ) : null}
                  {result.matchReason ? (
                    <p className="mt-2 text-xs font-bold uppercase text-comun-paper/60">
                      Por quê: {result.matchReason}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-6 text-sm text-comun-paper/70">
        Algo parece incorreto?{" "}
        <Link className="font-bold underline" href="/comun/participar">
          Veja como participar ou pedir orientação
        </Link>
        .
      </p>
    </>
  );
}
