"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  ObservatorySourceDescriptor,
  PublicObservation,
} from "@/lib/comun-observatory";
import type { SidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import {
  SIDEWALK_CONDITION_LABELS,
  SIDEWALK_PROBLEM_LABELS,
  deriveSidewalkObservatoryIndicators,
  filterSidewalkObservatoryObservations,
  presentSidewalkConditionFacets,
  presentSidewalkProblemFacets,
  sidewalkObservatoryFiltersToQuery,
  type SidewalkCoverageState,
  type SidewalkObservatoryFilters,
} from "@/lib/comun-sidewalk-observatory";

const ObservatoryMap = dynamic(
  () =>
    import("./comun-sidewalk-observatory-map").then(
      (module) => module.ComunSidewalkObservatoryMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[22rem] place-items-center border-2 border-comun-black bg-comun-paper p-6 text-center font-bold sm:min-h-[30rem]">
        Carregando o mapa. A lista textual continua disponível abaixo.
      </div>
    ),
  },
);

function formatObservedDate(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function freshnessLabel(source: ObservatorySourceDescriptor) {
  if (source.freshness === "current") return "Atual";
  if (source.freshness === "unknown") return "Atualização desconhecida";
  return "Pode estar desatualizada";
}

function percentage(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function hasFilters(filters: SidewalkObservatoryFilters) {
  return Boolean(filters.condition || filters.problem || filters.period);
}

function selectionSummary(
  count: number,
  filters: SidewalkObservatoryFilters,
  partial: boolean,
) {
  if (partial) {
    return hasFilters(filters)
      ? `Mostrando ${count} pontos revisados dentro da parcela carregada, com os filtros selecionados.`
      : `Mostrando mais de ${count} pontos revisados; a leitura atingiu o limite defensivo de carregamento.`;
  }
  if (filters.condition && !filters.problem && !filters.period) {
    return `Mostrando ${count} pontos revisados com condição ${SIDEWALK_CONDITION_LABELS[
      filters.condition
    ].toLocaleLowerCase("pt-BR")}.`;
  }
  if (filters.problem && !filters.condition && !filters.period) {
    return `Mostrando ${count} pontos revisados com o problema ${SIDEWALK_PROBLEM_LABELS[
      filters.problem
    ].toLocaleLowerCase("pt-BR")}.`;
  }
  if (filters.period && !filters.condition && !filters.problem) {
    return `Mostrando ${count} pontos revisados observados nos últimos ${filters.period === "30d" ? "30" : "90"} dias.`;
  }
  return hasFilters(filters)
    ? `Mostrando ${count} pontos revisados com os filtros selecionados.`
    : `Mostrando ${count} pontos revisados.`;
}

export function ComunSidewalkObservatory({
  observations,
  source,
  coverageState,
  initialFilters,
  provider,
}: {
  observations: PublicObservation[];
  source: ObservatorySourceDescriptor;
  coverageState: SidewalkCoverageState;
  initialFilters: SidewalkObservatoryFilters;
  provider: SidewalkBasemapProvider;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<PublicObservation | null>(null);
  const partial = coverageState === "partial_due_to_safety_cap";
  const allIndicators = useMemo(
    () => deriveSidewalkObservatoryIndicators(observations, coverageState),
    [observations, coverageState],
  );
  const visible = useMemo(
    () => filterSidewalkObservatoryObservations(observations, filters),
    [observations, filters],
  );
  const visibleIndicators = useMemo(
    () => deriveSidewalkObservatoryIndicators(visible, coverageState),
    [visible, coverageState],
  );
  const conditionFacets = useMemo(
    () => presentSidewalkConditionFacets(visibleIndicators),
    [visibleIndicators],
  );
  const problemFacets = useMemo(
    () => presentSidewalkProblemFacets(allIndicators),
    [allIndicators],
  );
  const visibleProblemFacets = useMemo(
    () => presentSidewalkProblemFacets(visibleIndicators),
    [visibleIndicators],
  );
  const conditionOptions = useMemo<[string, string][]>(() => {
    const options: [string, string][] = [
      ["good", "Boa"],
      ["regular", "Regular"],
      ["bad", "Ruim"],
      ["terrible", "Muito ruim"],
    ];
    if (allIndicators.conditionCounts.unknown > 0) {
      options.push(["unknown", "Sem classificação"]);
    }
    return options;
  }, [allIndicators.conditionCounts.unknown]);
  const problemOptions = useMemo<[string, string][]>(
    () => problemFacets.map((facet) => [facet.value, facet.label]),
    [problemFacets],
  );
  const onSelect = useCallback((observation: PublicObservation) => {
    setSelected(observation);
  }, []);

  function change<K extends keyof SidewalkObservatoryFilters>(
    key: K,
    value: SidewalkObservatoryFilters[K],
  ) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setSelected(null);
    const query = sidewalkObservatoryFiltersToQuery(next);
    router.replace(`${pathname}${query.size ? `?${query.toString()}` : ""}`, {
      scroll: false,
    });
  }

  const reviewedValue = partial
    ? hasFilters(filters)
      ? `${visibleIndicators.reviewedPointCount} carregados`
      : `Mais de ${visibleIndicators.reviewedPointCount}`
    : String(visibleIndicators.reviewedPointCount);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-comun-black sm:py-10">
      <header className="max-w-4xl">
        <p className="text-xs font-black uppercase tracking-wide text-comun-rust">
          Leitura territorial reviewed-only
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">
          Observatório de Calçadas
        </h1>
        <p className="mt-4 max-w-3xl text-lg">
          Uma leitura das condições de circulação e acessibilidade já revisadas
          pelo COMUN.
        </p>
        <p className="mt-4 max-w-3xl border-l-4 border-comun-yellow pl-4 text-sm font-bold">
          {
            "Estes dados representam apenas pontos observados, revisados e publicados. Não são um levantamento completo de todas as calçadas da cidade."
          }
        </p>
      </header>

      <section
        className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores principais"
      >
        <IndicatorCard
          label="Pontos revisados"
          value={reviewedValue}
          detail={
            partial
              ? hasFilters(filters)
                ? "Seleção dentro da parcela carregada"
                : "Parcela carregada com limite defensivo"
              : "Projeção pública elegível"
          }
        />
        <IndicatorCard
          label="Últimos 30 dias"
          value={String(visibleIndicators.recent30d)}
          detail="Pontos da seleção com data válida"
        />
        <IndicatorCard
          label="Últimos 90 dias"
          value={String(visibleIndicators.recent90d)}
          detail="Pontos da seleção com data válida"
        />
        <IndicatorCard
          label="Qualidade"
          value="Fonte comunitária revisada"
          detail={freshnessLabel(source)}
        />
      </section>

      <section className="mt-7" aria-labelledby="sidewalk-filters">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sidewalk-filters" className="text-2xl font-black uppercase">
              Filtros
            </h2>
            <p className="mt-1 text-sm text-comun-black/70">
              Mapa, lista e contadores usam a mesma seleção.
            </p>
          </div>
          {hasFilters(filters) ? (
            <button
              type="button"
              onClick={() => {
                const next: SidewalkObservatoryFilters = {
                  condition: null,
                  problem: null,
                  period: null,
                };
                setFilters(next);
                setSelected(null);
                router.replace(pathname, { scroll: false });
              }}
              className="min-h-11 font-bold underline decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <FilterSelect
            label="Condição"
            value={filters.condition ?? ""}
            onChange={(value) =>
              change(
                "condition",
                value
                  ? (value as SidewalkObservatoryFilters["condition"])
                  : null,
              )
            }
            options={conditionOptions}
          />
          <FilterSelect
            label="Problema"
            value={filters.problem ?? ""}
            onChange={(value) =>
              change(
                "problem",
                value ? (value as SidewalkObservatoryFilters["problem"]) : null,
              )
            }
            options={problemOptions}
          />
          <FilterSelect
            label="Recência"
            value={filters.period ?? ""}
            onChange={(value) =>
              change(
                "period",
                value ? (value as SidewalkObservatoryFilters["period"]) : null,
              )
            }
            options={[
              ["30d", "Últimos 30 dias"],
              ["90d", "Últimos 90 dias"],
            ]}
          />
        </div>
        <p className="mt-3 font-bold" aria-live="polite">
          {selectionSummary(visible.length, filters, partial)}
        </p>
      </section>

      <section className="mt-7" aria-labelledby="sidewalk-map-title">
        <h2 id="sidewalk-map-title" className="text-2xl font-black uppercase">
          Mapa
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-comun-black/70">
          O mapa mostra somente geometrias públicas aproximadas da seleção. A
          lista textual abaixo apresenta os mesmos pontos sem expor coordenadas.
        </p>
        <div className="mt-3">
          <ObservatoryMap
            provider={provider}
            observations={visible}
            onSelect={onSelect}
          />
        </div>
        {selected ? (
          <article
            className="mt-3 border-2 border-comun-black bg-comun-paper p-4"
            aria-live="polite"
          >
            <p className="text-xs font-black uppercase text-comun-rust">
              Ponto revisado selecionado
            </p>
            <h3 className="mt-1 text-xl font-black">
              {SIDEWALK_CONDITION_LABELS[selected.attributes.condition]}
            </h3>
            <p className="mt-2 text-sm">
              <strong>Problemas:</strong>{" "}
              {selected.attributes.problems.length
                ? selected.attributes.problems
                    .map((problem) => SIDEWALK_PROBLEM_LABELS[problem])
                    .join(", ")
                : "Nenhum problema estruturado classificado"}
            </p>
            <p className="mt-1 text-sm">
              <strong>Observação:</strong>{" "}
              {formatObservedDate(selected.period.observedAt)}
            </p>
            <p className="mt-1 text-sm">
              <strong>Revisão:</strong> Fonte comunitária revisada ·{" "}
              {freshnessLabel(source)}
            </p>
          </article>
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="shown-points-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="shown-points-title"
              className="text-2xl font-black uppercase"
            >
              Pontos mostrados
            </h2>
            <p className="mt-1 text-sm text-comun-black/70">
              Lista textual equivalente ao mapa, ordenada pela observação mais
              recente; pontos sem data aparecem depois.
            </p>
          </div>
          <span className="font-black">{visible.length} ponto(s)</span>
        </div>
        {visible.length ? (
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {visible.map((observation) => (
              <li
                key={observation.id}
                className="border-2 border-comun-black/25 bg-comun-paper p-4"
              >
                <p className="font-black">
                  {SIDEWALK_CONDITION_LABELS[observation.attributes.condition]}
                </p>
                <p className="mt-1 text-sm">
                  {observation.attributes.problems.length
                    ? observation.attributes.problems
                        .map((problem) => SIDEWALK_PROBLEM_LABELS[problem])
                        .join(" · ")
                    : "Sem problema estruturado classificado"}
                </p>
                <p className="mt-2 text-xs font-bold text-comun-black/65">
                  {formatObservedDate(observation.period.observedAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 border-2 border-comun-black/25 bg-comun-paper p-4 font-bold">
            Nenhum ponto revisado corresponde aos filtros selecionados.
          </p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="condition-distribution-title">
        <h2
          id="condition-distribution-title"
          className="text-2xl font-black uppercase"
        >
          Distribuição por condição
        </h2>
        <p className="mt-1 text-sm text-comun-black/70">
          Percentuais calculados somente sobre os pontos revisados mostrados na
          seleção atual.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {conditionFacets.map((facet) => (
            <div
              key={facet.value}
              className="border-2 border-comun-black/25 bg-comun-paper p-4"
            >
              <p className="font-black">{facet.label}</p>
              <p className="mt-1 text-sm">
                {facet.count} de {visible.length} pontos revisados ·{" "}
                {percentage(facet.count, visible.length)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="problem-distribution-title">
        <h2
          id="problem-distribution-title"
          className="text-2xl font-black uppercase"
        >
          Problemas observados
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-comun-black/70">
          Um mesmo ponto pode ter mais de um problema. Por isso, a soma das
          frequências pode ser maior que o número de pontos revisados.
        </p>
        {visibleProblemFacets.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProblemFacets.map((facet) => (
              <div
                key={facet.value}
                className="border-2 border-comun-black/25 bg-comun-paper p-4"
              >
                <p className="font-black">{facet.label}</p>
                <p className="mt-1 text-sm">
                  Presente em {facet.count} ponto(s) revisado(s) da seleção.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm font-bold">
            Nenhum problema estruturado está presente na seleção atual.
          </p>
        )}
      </section>

      <section
        className="mt-8 border-t-2 border-comun-black/20 pt-6"
        aria-labelledby="sidewalk-methodology-title"
      >
        <h2
          id="sidewalk-methodology-title"
          className="text-2xl font-black uppercase"
        >
          Sobre estes dados
        </h2>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p>
              Qualquer pessoa pode registrar um problema pelo fluxo único do
              Relata, mas o registro privado não entra automaticamente neste
              Observatório. Só a projeção revisada, verificada e publicada entra
              na leitura pública.
            </p>
            <p className="mt-3">
              A localização mostrada é aproximada. O conjunto não é um censo nem
              permite afirmar a situação geral das calçadas da cidade.
            </p>
          </div>
          <div>
            <p>
              Um ponto pode conter vários problemas estruturados. A atualização
              depende de nova observação e revisão editorial. Publicação
              automática continua desligada.
            </p>
            <p className="mt-3">
              <strong>Fonte:</strong> Fonte comunitária revisada.{" "}
              <strong>Atualidade:</strong> {freshnessLabel(source)}.
            </p>
            {partial ? (
              <p className="mt-3 font-bold">
                Cobertura técnica parcial: o limite defensivo de carregamento
                foi atingido; totais completos não são afirmados.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-8 flex flex-wrap gap-3 border-t-2 border-comun-black/20 pt-6">
        <div className="mr-auto max-w-xl">
          <h2 className="text-xl font-black">
            Encontrou um problema de calçada?
          </h2>
          <p className="mt-1 text-sm text-comun-black/70">
            O registro começa no Relata. O Observatório não cria um intake
            paralelo nem publica automaticamente a contribuição.
          </p>
        </div>
        <Link
          href="/comun/relatar"
          className="inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
        >
          Registrar problema
        </Link>
        <Link
          href="/comun/calcadas"
          className="inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-paper px-4 font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
        >
          Ver Mapa das Calçadas
        </Link>
      </section>
    </main>
  );
}

function IndicatorCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="border-2 border-comun-black bg-comun-paper p-4">
      <p className="text-xs font-black uppercase text-comun-black/65">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black leading-tight">{value}</p>
      <p className="mt-2 text-xs text-comun-black/65">{detail}</p>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full border-2 border-comun-black bg-comun-paper px-3 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        <option value="">Todos</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
