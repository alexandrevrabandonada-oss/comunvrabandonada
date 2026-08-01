"use client";
/* eslint-disable @next/next/no-img-element -- derivada local revisada; evita proxy externo */
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  List,
  Map,
  Minus,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  clusterSidewalkRecords,
  LOCAL_DEMO_CARTOGRAPHY,
  type PublicSidewalkRecord,
  VOLTA_REDONDA_MAP,
} from "@/lib/sidewalk-map-config";
import type { SidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";

const SidewalkMapLibreMap = dynamic(
  () =>
    import("@/components/sidewalk-maplibre-map").then(
      (module) => module.SidewalkMapLibreMap,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="absolute inset-0 grid place-items-center p-6 text-center font-bold">
        Carregando a base cartográfica. A lista continua disponível.
      </p>
    ),
  },
);

const conditions = {
  good: "Boa",
  regular: "Regular",
  bad: "Ruim",
  terrible: "Péssima",
} as const;
const forwarding: Record<string, string> = {
  no_action: "Sem ação",
  priority: "Prioridade",
  forwarded: "Encaminhada",
  waiting_response: "Aguardando resposta",
  in_progress: "Em obra",
  resolved: "Resolvida",
  reopened: "Reaberta",
};
type Filters = {
  q: string;
  condition: string;
  problem: string;
  neighborhood: string;
  forwarding: string;
  verification: string;
  period: string;
};

export function SidewalkRealMap({
  records,
  provider,
}: {
  records: PublicSidewalkRecord[];
  provider: SidewalkBasemapProvider;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname(),
    mapRef = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
      null,
    );
  const [view, setView] = useState<"map" | "list">(
      params.get("vista") === "mapa" ? "map" : "list",
    ),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [selected, setSelected] = useState<PublicSidewalkRecord | null>(null),
    [advanced, setAdvanced] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    q: params.get("q") ?? "",
    condition: params.get("condicao") ?? "",
    problem: params.get("problema") ?? "",
    neighborhood: params.get("bairro") ?? "",
    forwarding: params.get("estado") ?? "",
    verification: params.get("verificacao") ?? "",
    period: params.get("periodo") ?? "",
  });
  const referenceTime = useMemo(
    () =>
      Math.max(
        0,
        ...records.map((record) =>
          record.last_observed_at
            ? new Date(record.last_observed_at).getTime()
            : 0,
        ),
      ),
    [records],
  );
  const neighborhoods = useMemo(
    () =>
      [
        ...new Set(
          records.map((x) => x.neighborhood).filter(Boolean) as string[],
        ),
      ].sort(),
    [records],
  );
  const visible = useMemo(
    () =>
      records.filter((x) => {
        const haystack =
          `${x.name} ${x.neighborhood ?? ""} ${x.approximate_location ?? ""} ${x.categories.join(" ")}`.toLocaleLowerCase(
            "pt-BR",
          );
        return (
          (!filters.q ||
            haystack.includes(filters.q.toLocaleLowerCase("pt-BR"))) &&
          (!filters.condition || x.condition === filters.condition) &&
          (!filters.problem || x.categories.includes(filters.problem)) &&
          (!filters.neighborhood || x.neighborhood === filters.neighborhood) &&
          (!filters.forwarding || x.forwarding_status === filters.forwarding) &&
          (!filters.verification ||
            x.verification_status === filters.verification) &&
          (!filters.period ||
            Boolean(
              x.last_observed_at &&
              new Date(x.last_observed_at).getTime() >=
                referenceTime -
                  Number.parseInt(filters.period, 10) * 24 * 60 * 60 * 1000,
            ))
        );
      }),
    [records, filters, referenceTime],
  );
  const clusters = useMemo(
    () => clusterSidewalkRecords(visible, zoom),
    [visible, zoom],
  );
  const sync = (next: Filters, nextView = view) => {
    const q = new URLSearchParams();
    Object.entries({
      q: next.q,
      condicao: next.condition,
      problema: next.problem,
      bairro: next.neighborhood,
      estado: next.forwarding,
      verificacao: next.verification,
      periodo: next.period,
    }).forEach(([key, value]) => {
      if (value) q.set(key, value);
    });
    q.set("vista", nextView === "map" ? "mapa" : "lista");
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  const change = (key: keyof Filters, value: string) =>
    setFilters((current) => {
      const next = { ...current, [key]: value };
      sync(next);
      return next;
    });
  const clear = () => {
    const next = {
      q: "",
      condition: "",
      problem: "",
      neighborhood: "",
      forwarding: "",
      verification: "",
      period: "",
    };
    setFilters(next);
    sync(next);
  };
  const changeView = (next: "map" | "list") => {
    setView(next);
    sync(filters, next);
  };
  const quick = [
    { label: "Péssima", key: "condition", value: "terrible" },
    { label: "Ruim", key: "condition", value: "bad" },
    { label: "Sem rampa", key: "problem", value: "sem_rampa" },
    { label: "Sem calçada", key: "problem", value: "inexistente" },
    { label: "Resolvida", key: "forwarding", value: "resolved" },
  ] as const;
  const selectRecord = useCallback(
    (record: PublicSidewalkRecord) => setSelected(record),
    [],
  );
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(16rem,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar rua, trecho ou bairro</span>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            size={18}
          />
          <input
            value={filters.q}
            onChange={(event) => change("q", event.target.value)}
            placeholder="Buscar rua, trecho ou bairro"
            className="min-h-11 w-full border-2 border-comun-black bg-white py-2 pl-10 pr-3"
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <div role="group" aria-label="Visualização" className="flex">
            <Toggle
              active={view === "map"}
              onClick={() => changeView("map")}
              icon={<Map size={17} />}
              label="Mapa"
            />
            <Toggle
              active={view === "list"}
              onClick={() => changeView("list")}
              icon={<List size={17} />}
              label="Lista"
            />
          </div>
          <span
            aria-live="polite"
            className="whitespace-nowrap text-sm font-bold"
          >
            {visible.length} registro(s)
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {quick.map((item) => (
          <button
            key={item.label}
            aria-pressed={filters[item.key] === item.value}
            onClick={() =>
              change(
                item.key,
                filters[item.key] === item.value ? "" : item.value,
              )
            }
            className={`min-h-10 border-2 border-comun-black px-3 text-sm font-bold ${filters[item.key] === item.value ? "bg-comun-black text-white" : "bg-white"}`}
          >
            {item.label}
          </button>
        ))}
        <button
          aria-expanded={advanced}
          onClick={() => setAdvanced((value) => !value)}
          className="inline-flex min-h-10 items-center gap-2 border-2 border-comun-black bg-white px-3 text-sm font-bold"
        >
          Mais filtros <ChevronDown size={16} />
        </button>
        {Object.values(filters).some(Boolean) ? (
          <button
            onClick={clear}
            className="min-h-10 px-2 text-sm font-bold underline"
          >
            Limpar
          </button>
        ) : null}
      </div>
      {advanced ? (
        <fieldset className="fixed inset-x-0 bottom-0 z-50 grid max-h-[75vh] gap-3 overflow-auto border-2 border-comun-black bg-white p-4 pb-24 shadow-2xl sm:grid-cols-3 md:static md:max-h-none md:pb-4 md:shadow-none">
          <legend className="px-2 font-bold">Filtros completos</legend>
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setAdvanced(false)}
            className="absolute right-3 top-2 grid size-10 place-items-center md:hidden"
          >
            <X />
          </button>
          <Select
            label="Condição"
            value={filters.condition}
            onChange={(v) => change("condition", v)}
            options={Object.entries(conditions)}
          />
          <Select
            label="Problema"
            value={filters.problem}
            onChange={(v) => change("problem", v)}
            options={[
              ["buraco", "Buraco"],
              ["irregular", "Irregular"],
              ["sem_rampa", "Sem rampa"],
              ["obstaculo", "Obstáculo"],
              ["estreita", "Estreita"],
              ["inexistente", "Sem calçada"],
              ["entulho", "Entulho"],
              ["vegetacao", "Vegetação"],
              ["poste", "Poste"],
              ["outro", "Outro"],
            ]}
          />
          <Select
            label="Bairro"
            value={filters.neighborhood}
            onChange={(v) => change("neighborhood", v)}
            options={neighborhoods.map((v) => [v, v])}
          />
          <Select
            label="Situação"
            value={filters.forwarding}
            onChange={(v) => change("forwarding", v)}
            options={Object.entries(forwarding)}
          />
          <Select
            label="Verificação"
            value={filters.verification}
            onChange={(v) => change("verification", v)}
            options={[
              ["community_report", "Relato comunitário"],
              ["source_checked", "Fonte conferida"],
              ["verified", "Verificada"],
              ["disputed", "Em divergência"],
              ["outdated", "Desatualizada"],
            ]}
          />
          <Select
            label="Período"
            value={filters.period}
            onChange={(v) => change("period", v)}
            options={[
              ["30", "Últimos 30 dias"],
              ["90", "Últimos 90 dias"],
              ["365", "Último ano"],
            ]}
          />
        </fieldset>
      ) : null}
      {view === "map" ? (
        <div
          ref={mapRef}
          onPointerDown={(event) => {
            if (
              provider.kind === "pmtiles" ||
              event.target !== event.currentTarget
            )
              return;
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              panX: pan.x,
              panY: pan.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current)
              setPan({
                x: drag.current.panX + event.clientX - drag.current.x,
                y: drag.current.panY + event.clientY - drag.current.y,
              });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          className={`relative min-h-[58vh] overflow-hidden border-2 border-comun-black bg-[#e8ece5] lg:min-h-[64vh] ${provider.kind === "pmtiles" ? "" : "touch-none"}`}
          aria-label="Mapa geográfico local de registros públicos de calçadas"
        >
          {provider.kind === "pmtiles" ? (
            <SidewalkMapLibreMap
              provider={provider}
              records={visible}
              onSelect={selectRecord}
            />
          ) : (
            <>
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                }}
              >
                <LocalDemoBasemap />
                {clusters.map((cluster) => {
                  const single = cluster.records[0],
                    resolved = cluster.records.every(
                      (record) => record.forwarding_status === "resolved",
                    );
                  return (
                    <button
                      key={cluster.id}
                      aria-label={
                        cluster.records.length > 1
                          ? `Ampliar grupo com ${cluster.records.length} registros`
                          : `Abrir ${single.name}, condição ${conditions[single.condition]}`
                      }
                      onClick={() =>
                        cluster.records.length > 1
                          ? setZoom((value) => Math.min(2.5, value + 0.5))
                          : setSelected(single)
                      }
                      className={`pointer-events-auto absolute grid min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-comun-black px-2 font-black shadow-[2px_2px_0_#0b0b0a] ${selected?.id === single.id ? "scale-110 bg-white" : "bg-comun-yellow"}`}
                      style={{
                        left: `${cluster.x * 100}%`,
                        top: `${cluster.y * 100}%`,
                      }}
                    >
                      {cluster.records.length > 1 ? (
                        cluster.records.length
                      ) : resolved ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <TriangleAlert size={20} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="absolute right-3 top-3 z-10 grid border-2 border-comun-black bg-white">
                <button
                  aria-label="Aumentar zoom"
                  className="grid size-11 place-items-center"
                  onClick={() => setZoom((v) => Math.min(2.5, v + 0.25))}
                >
                  <Plus />
                </button>
                <button
                  aria-label="Diminuir zoom"
                  className="grid size-11 place-items-center border-t-2"
                  onClick={() => setZoom((v) => Math.max(1, v - 0.25))}
                >
                  <Minus />
                </button>
              </div>
              <div className="absolute bottom-2 left-2 max-w-[75%] border-2 border-comun-black bg-white p-2 text-xs font-bold">
                {provider.attribution}
              </div>
            </>
          )}
          {selected ? (
            <RecordSheet record={selected} onClose={() => setSelected(null)} />
          ) : null}
          <Link
            href="/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao"
            className="fixed bottom-24 right-4 z-10 inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black shadow-[3px_3px_0_#0b0b0a] md:hidden"
          >
            Registrar
          </Link>
        </div>
      ) : (
        <RecordList records={visible} />
      )}
      <MapLegend />
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 border-2 border-comun-black px-3 font-bold first:border-r-0 ${active ? "bg-comun-yellow" : "bg-white"}`}
    >
      {icon}
      {label}
    </button>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <select
        className="min-h-11 border-2 border-comun-black bg-white px-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos</option>
        {options.map(([v, l]) => (
          <option value={v} key={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function RecordList({ records }: { records: PublicSidewalkRecord[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {records.map((record) => (
        <article
          key={record.id}
          className="border-2 border-comun-black bg-white p-4"
        >
          <p className="text-xs font-bold">
            {conditions[record.condition]} ·{" "}
            {forwarding[record.forwarding_status] ?? record.forwarding_status}
          </p>
          <h2 className="mt-1 text-xl font-black">{record.name}</h2>
          <p className="mt-2 text-sm">{record.categories.join(" · ")}</p>
          <p className="text-sm">
            {record.approximate_location ||
              record.neighborhood ||
              "Localização protegida"}
          </p>
          <Link
            className="mt-3 inline-block font-black underline"
            href={`/comun/calcadas/registros/${record.slug}`}
          >
            Abrir registro
          </Link>
        </article>
      ))}
      {!records.length ? (
        <p className="border-2 border-dashed border-comun-black bg-white p-5">
          Nenhum registro público corresponde aos filtros. Limpe os filtros para
          continuar.
        </p>
      ) : null}
    </div>
  );
}
function RecordSheet({
  record,
  onClose,
}: {
  record: PublicSidewalkRecord;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Ficha do registro"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-auto border-2 border-comun-black bg-[#f4f1e8] p-5 shadow-2xl lg:absolute lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[25rem]"
    >
      <button
        onClick={onClose}
        aria-label="Fechar ficha"
        className="float-right grid size-11 place-items-center"
      >
        <X />
      </button>
      {record.public_photo_url ? (
        <img
          src={record.public_photo_url}
          alt="Trecho de calçada publicado após revisão"
          className="mb-4 aspect-video w-full border-2 object-cover"
        />
      ) : null}
      <p className="text-xs font-bold">
        {conditions[record.condition]} · {record.verification_status}
      </p>
      <h2 className="mt-2 text-2xl font-black">{record.name}</h2>
      <p className="mt-1 text-sm">
        {record.approximate_location ||
          record.neighborhood ||
          "Localização protegida"}
      </p>
      <p className="mt-3">{record.public_summary}</p>
      <dl className="mt-4 grid gap-2 text-sm">
        <Detail
          label="Problemas"
          value={record.categories.join(" · ") || "Não informado"}
        />
        <Detail label="Verificação" value={record.verification_status} />
        <Detail
          label="Encaminhamento"
          value={
            forwarding[record.forwarding_status] ?? record.forwarding_status
          }
        />
        <Detail
          label="Última observação"
          value={
            record.last_observed_at
              ? new Date(record.last_observed_at).toLocaleDateString("pt-BR")
              : "Não informada"
          }
        />
        <Detail
          label="Prioridade relacionada"
          value={
            record.forwarding_status === "priority"
              ? "Sim"
              : "Consulte o histórico"
          }
        />
        <Detail
          label="Próxima ação"
          value={
            record.forwarding_status === "resolved"
              ? "Confirmar se a melhoria permanece"
              : "Acompanhar e atualizar evidências"
          }
        />
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center bg-comun-yellow px-4 font-black"
          href={`/comun/calcadas/registros/${record.slug}`}
        >
          Ver histórico
        </Link>
        <Link
          className="inline-flex min-h-11 items-center font-bold underline"
          href={`/comun/mapa/contribuir?origem=calcadas&registro=${record.slug}`}
        >
          Atualizar ou enviar foto
        </Link>
      </div>
    </aside>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function LocalDemoBasemap() {
  return (
    <svg
      viewBox="0 0 600 300"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Cartografia sintética local"
    >
      <path
        d={LOCAL_DEMO_CARTOGRAPHY.municipalityBoundary}
        fill="#edf1e9"
        stroke="#26352a"
        strokeWidth="3"
      />
      <path
        d="M0 190 C100 130 210 230 310 160 S480 90 600 130"
        fill="none"
        stroke={VOLTA_REDONDA_MAP.style.water}
        strokeWidth="22"
      />
      {LOCAL_DEMO_CARTOGRAPHY.roads.map((road) => (
        <g key={road.id}>
          <path d={road.path} fill="none" stroke="#fff" strokeWidth="10" />
          <path d={road.path} fill="none" stroke="#6f786f" strokeWidth="3" />
        </g>
      ))}
      {LOCAL_DEMO_CARTOGRAPHY.neighborhoods.map((place) => (
        <text
          key={place.id}
          x={place.x}
          y={place.y}
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          {place.name}
        </text>
      ))}
    </svg>
  );
}
function MapLegend() {
  return (
    <div
      aria-label="Legenda do mapa"
      className="flex flex-wrap gap-x-5 gap-y-2 border-2 border-comun-black bg-white p-3 text-xs"
    >
      <strong>Legenda</strong>
      <span className="inline-flex items-center gap-1">
        <TriangleAlert size={16} /> precisa de atenção
      </span>
      <span className="inline-flex items-center gap-1">
        <CheckCircle2 size={16} /> resolvida
      </span>
      <span>
        <strong>Número:</strong> grupo de registros
      </span>
      <span>Condição e encaminhamento são informações distintas.</span>
    </div>
  );
}
