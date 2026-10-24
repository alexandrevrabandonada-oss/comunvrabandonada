"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/lib/unified-search";
import type { CivicIntentMatch } from "@/lib/civic-intelligence/intents";
import { formatComunDate } from "@/lib/comun-date";
import {
  contextualSearchHref,
  searchAnchor,
  searchHref,
  safeSearchResults,
  type PublicSearchState,
  type SearchAvailability,
  PUBLIC_SEARCH_TYPES,
} from "@/lib/public-search-context";
type ApiResponse = {
  results: SearchResult[];
  intents: CivicIntentMatch[];
  semanticState: string;
  availability: SearchAvailability;
  durationMs: number;
};
export function LiveSearchResults({
  query,
  type,
  pauta,
  initialResults,
  lexicalDurationMs,
  searchState,
  initialAvailability,
}: {
  query: string;
  type?: string;
  pauta?: string;
  initialResults: SearchResult[];
  lexicalDurationMs: number;
  searchState?: PublicSearchState;
  initialAvailability?: SearchAvailability;
}) {
  const router = useRouter();
  const modeControl = useRef<HTMLButtonElement>(null);
  const restoreModeFocus = useRef(false);
  const context = searchState ?? { q: query, tipo: type, pauta };
  const serialized = searchHref(context);
  const semantic = context.semantic !== "0";
  const [phase, setPhase] = useState("loading"),
    [rows, setRows] = useState<SearchResult[]>([]),
    [availability, setAvailability] = useState<SearchAvailability>(
      initialAvailability ?? "empty",
    ),
    [intents, setIntents] = useState<CivicIntentMatch[]>([]),
    [version, setVersion] = useState(0),
    [semanticState, setSemanticState] = useState("disabled");
  useEffect(() => {
    if (query.trim().length < 2) return;
    let active = true;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;
    const load = () => {
      const current = ++generation;
      controller?.abort();
      clearTimeout(timer);
      controller = new AbortController();
      setPhase("loading");
      setRows([]);
      setIntents([]);
      const params = new URL(serialized, "https://local.invalid").searchParams;
      params.delete("experiencia");
      params.set("semantic", semantic ? "1" : "0");
      timer = setTimeout(() => controller?.abort(), 3000);
      fetch(`/api/comun/civic-search?${params}`, {
        signal: controller.signal,
        cache: "no-store",
        referrerPolicy: "no-referrer",
      })
        .then(async (r) => {
          if (!r.ok) throw Error("SEARCH_UNAVAILABLE");
          return (await r.json()) as ApiResponse;
        })
        .then((response) => {
          if (!active || current !== generation) return;
          if (
            !["ready", "empty", "partial", "unavailable"].includes(
              response.availability,
            ) ||
            !Array.isArray(response.results)
          )
            throw Error("SEARCH_INVALID_SNAPSHOT");
          setRows(safeSearchResults(response.results));
          setAvailability(response.availability);
          setIntents(response.intents ?? []);
          setSemanticState(response.semanticState);
          setPhase("ready");
        })
        .catch(() => {
          if (active && current === generation) {
            setRows([]);
            setAvailability("unavailable");
            setPhase("ready");
          }
        })
        .finally(() => {
          if (current === generation) clearTimeout(timer);
        });
    };
    load();
    const resume = () => load();
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) load();
    };
    window.addEventListener("popstate", resume);
    window.addEventListener("pageshow", restored);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener("popstate", resume);
      window.removeEventListener("pageshow", restored);
    };
  }, [query, serialized, semantic, version]);
  useEffect(() => {
    if (phase !== "ready") return;
    if (restoreModeFocus.current) {
      restoreModeFocus.current = false;
      modeControl.current?.focus();
      return;
    }
    const id = location.hash.slice(1) || history.state?.comunSearchFocus;
    if (typeof id !== "string" || !/^resultado-[a-f0-9]{8}$/.test(id)) return;
    const element = document.getElementById(id);
    if (element) {
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: "center" });
    } else {
      document
        .querySelector<HTMLElement>('[data-testid="civic-search-status"]')
        ?.focus();
    }
  }, [phase, rows]);
  if (query.trim().length < 2)
    return (
      <p role="status" className="mt-6">
        Digite pelo menos dois caracteres públicos para buscar.
      </p>
    );
  const remember = (href: string) => {
    history.replaceState(
      { ...history.state, comunSearchFocus: searchAnchor(href) },
      "",
      location.href,
    );
  };
  const groups = PUBLIC_SEARCH_TYPES.map((t) => ({
    type: t,
    items: rows.filter((r) => r.type === t),
  })).filter((g) => g.items.length);
  return (
    <>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <p
          role="status"
          aria-label="Estado da busca pública"
          aria-live="polite"
          tabIndex={-1}
          data-testid="civic-search-status"
        >
          {phase === "loading"
            ? "Verificando resultados públicos…"
            : availability === "unavailable"
              ? "Busca indisponível. Não foi possível verificar as fontes; isso não significa ausência de resultados."
              : availability === "partial"
                ? `${rows.length} resultados públicos · algumas fontes indisponíveis; apenas fontes verificadas abaixo.`
                : rows.length
                  ? `${rows.length} resultados públicos · correspondência inicial em ${lexicalDurationMs} ms`
                  : `0 resultados públicos · correspondência inicial em ${lexicalDurationMs} ms. Não encontramos conteúdo público com esses filtros.`}
          {phase === "ready" && semanticState === "timeout"
            ? " Relações demoraram demais; resultados iniciais preservados."
            : phase === "ready" &&
                semanticState === "unavailable" &&
                availability !== "unavailable"
              ? " Relações indisponíveis; resultados iniciais preservados."
              : ""}
        </p>
        <form
          action="/comun/buscar"
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            restoreModeFocus.current = true;
            router.push(
              searchHref({ ...context, semantic: semantic ? "0" : undefined }),
              { scroll: false },
            );
          }}
        >
          {Array.from(
            new URLSearchParams(
              searchHref({
                ...context,
                semantic: semantic ? "0" : undefined,
              }).split("?")[1],
            ),
          ).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button
            type="submit"
            ref={modeControl}
            aria-pressed={!semantic}
            className="min-h-11 border-2 border-comun-paper px-3 font-bold"
          >
            {semantic ? "Usar somente termos" : "Buscar também relações"}
          </button>
        </form>
        {phase === "ready" &&
        (availability === "unavailable" || availability === "partial") ? (
          <button
            type="button"
            className="min-h-11 border-2 px-3 font-bold"
            onClick={() => setVersion((v) => v + 1)}
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
      {phase === "ready" && availability === "empty" ? (
        <Link
          href="/comun/explorar"
          className="inline-flex min-h-11 items-center underline"
        >
          Explorar outras possibilidades
        </Link>
      ) : null}
      {intents.length ? (
        <section
          className="mt-5 border-2 border-comun-yellow p-4"
          aria-labelledby="intent-title"
        >
          <h2 id="intent-title" className="font-bold">
            Você quer chegar aonde?
          </h2>
          <div className="flex flex-wrap gap-3">
            {intents.map((intent) => (
              <Link
                key={intent.intentId}
                href={intent.route}
                className="inline-flex min-h-11 items-center underline"
              >
                {intent.label}
                {intent.requiresAuthentication ? " · requer entrada" : ""}
              </Link>
            ))}
          </div>
          <p>Nenhuma ação é executada automaticamente.</p>
        </section>
      ) : null}
      <div className="mt-6 grid gap-8" aria-busy={phase === "loading"}>
        {groups.map((group) => (
          <section key={group.type} aria-labelledby={`grupo-${group.type}`}>
            <h2
              id={`grupo-${group.type}`}
              className="border-b-2 border-comun-yellow pb-2 text-xl font-black uppercase text-comun-yellow"
            >
              {group.type}
            </h2>
            <div className="divide-y-2 divide-comun-paper/20">
              {group.items.map((result) => (
                <article className="min-w-0 py-5" key={result.href}>
                  <p className="text-xs font-bold">
                    {result.type} · origem: {result.origin}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">
                    <Link
                      id={searchAnchor(result.href)}
                      prefetch={false}
                      className="inline-flex min-h-11 scroll-m-24 items-center break-words underline focus-visible:outline focus-visible:outline-2"
                      href={contextualSearchHref(result.href, context)!}
                      onClick={() => remember(result.href)}
                    >
                      {result.title}
                    </Link>
                  </h3>
                  {result.summary ? (
                    <p className="mt-2 max-w-3xl break-words">
                      {result.summary}
                    </p>
                  ) : null}
                  {result.updatedAt ? (
                    <time
                      className="mt-2 block text-xs"
                      dateTime={result.updatedAt}
                    >
                      Fonte atualizada em {formatComunDate(result.updatedAt)}
                    </time>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <noscript>
        <p>Resultados iniciais sem atualização automática:</p>
        {initialResults.map((r) => (
          <p key={r.href}>
            <a href={contextualSearchHref(r.href, context) ?? "/comun/buscar"}>
              {r.title}
            </a>
          </p>
        ))}
      </noscript>
    </>
  );
}
