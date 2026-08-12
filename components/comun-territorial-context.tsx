"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { TerritorialContextPublicDto } from "@/lib/comun-observatory-territorial-context";
import type { SidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";

const HealthMap = dynamic(
  () => import("./comun-territorial-health-map").then((module) => module.ComunTerritorialHealthMap),
  { ssr: false, loading: () => <div className="grid min-h-[22rem] place-items-center border-2 border-comun-black bg-comun-paper p-6 font-bold sm:min-h-[30rem]">Carregando o mapa. A lista textual continua disponível abaixo.</div> },
);

function formatNumber(value: number) { return new Intl.NumberFormat("pt-BR").format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value)); }
function addressLabel(address: TerritorialContextPublicDto["health"]["points"][number]["address"]) {
  if (!address) return "Endereço institucional não informado no snapshot.";
  return [address.street, address.number, address.complement, address.neighborhoodLabel, address.postalCode].filter(Boolean).join(", ");
}
const socialLabels: Record<string, string> = { cras: "CRAS", creas: "CREAS", centro_pop: "Centro POP", centro_dia: "Centro Dia", acolhimento: "Acolhimento", other: "Outra unidade" };

export function ComunTerritorialContext({ dto, provider }: { dto: TerritorialContextPublicDto; provider: SidewalkBasemapProvider }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const healthPoints = useMemo(() => dto.health.points.filter((point) => (!type || point.unitType === type) && point.officialName.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))), [dto.health.points, query, type]);
  const selected = healthPoints.find((point) => point.id === selectedId) ?? null;
  const selectPoint = useCallback((id: string) => setSelectedId(id), []);
  return <main className="mx-auto max-w-6xl px-4 py-7 text-comun-black sm:py-10">
    <header className="max-w-4xl">
      <p className="text-xs font-black uppercase text-comun-yellow">Leitura pública territorial</p>
      <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">Território e Serviços Públicos</h1>
      <p className="mt-4 text-lg">Dados oficiais agregados sobre setores censitários e registros públicos de Saúde e Assistência Social em Volta Redonda.</p>
      <p className="mt-4 border-l-4 border-comun-yellow pl-4 text-sm font-bold">Setor censitário não é bairro. Esta página descreve dados disponíveis e a presença de equipamentos registrados; não mede suficiência de serviços.</p>
    </header>
    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="O território em números">
      <Metric value={formatNumber(dto.summary.sectorCount)} label="Setores censitários" detail="Censo 2022" />
      <Metric value={formatNumber(dto.summary.populationTotal)} label="Pessoas recenseadas" detail="Censo 2022" />
      <Metric value={formatNumber(dto.summary.householdsTotal)} label="Domicílios" detail="Censo 2022 · V0002" />
      <Metric value={formatNumber(dto.summary.healthEquipmentCount)} label="Equipamentos públicos de Saúde" detail="Snapshot CNES" />
      <Metric value={formatNumber(dto.summary.socialAssistanceEquipmentCount)} label="Unidades de Assistência Social" detail="Snapshot corroborado" />
    </section>
    <section className="mt-10" aria-labelledby="health-title">
      <h2 id="health-title" className="text-3xl font-black uppercase">Saúde pública no território</h2>
      <p className="mt-2 max-w-4xl">O mapa mostra apenas os {formatNumber(dto.health.points.length)} equipamentos com coordenada oficial publicada. {formatNumber(dto.summary.healthMatchedToSectorCount)} têm vínculo censitário único; {dto.summary.healthBoundaryAmbiguousCount} está em limite ambíguo e {dto.summary.healthOutsideOrGeometryGapCount} permanece sem vínculo censitário seguro.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold"><span>Buscar pelo nome</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} className="min-h-11 border-2 border-comun-black bg-comun-paper px-3" /></label>
        <label className="grid gap-1 text-sm font-bold"><span>Tipo CNES</span><select value={type} onChange={(event) => { setType(event.target.value); setSelectedId(null); }} className="min-h-11 border-2 border-comun-black bg-comun-paper px-3"><option value="">Todos os tipos</option>{dto.health.unitTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      <p className="mt-3 font-bold" aria-live="polite">Mostrando {formatNumber(healthPoints.length)} equipamento(s) público(s) de Saúde.</p>
      <div className="mt-4"><HealthMap points={healthPoints} provider={provider} onSelect={selectPoint} /></div>
      {selected ? <EquipmentDetail point={selected} /> : null}
      <h3 className="mt-7 text-2xl font-black uppercase">Lista textual de Saúde</h3>
      <p className="mt-1 text-sm text-comun-black/70">A lista apresenta a mesma seleção do mapa e não exibe coordenadas numéricas.</p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">{healthPoints.map((point) => <li key={point.id} className="border-2 border-comun-black/25 bg-comun-paper p-4"><p className="font-black">{point.officialName}</p><p className="mt-1 text-sm">{point.unitType ?? "Tipo CNES não informado"}</p><p className="mt-2 text-sm">{addressLabel(point.address)}</p><p className="mt-2 text-xs font-bold">{point.territorialBinding.state === "matched" ? "Vínculo censitário disponível" : "Coordenada oficial sem vínculo censitário seguro"}</p></li>)}</ol>
    </section>
    <section className="mt-10" aria-labelledby="assistance-title">
      <h2 id="assistance-title" className="text-3xl font-black uppercase">Assistência Social</h2>
      <p className="mt-2 max-w-4xl">As unidades confirmadas aparecem somente nesta lista: o snapshot ativo não fornece coordenada oficial, por isso não há marcador nem vínculo com setor censitário.</p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">{dto.socialAssistance.units.map((unit) => <li key={unit.id} className="border-2 border-comun-black/25 bg-comun-paper p-4"><p className="font-black">{unit.officialName}</p><p className="mt-1 text-sm">{socialLabels[unit.equipmentType]}</p><p className="mt-2 text-sm">{unit.addressPublication === "public" ? addressLabel(unit.address) : "Endereço não disponibilizado pela fonte ativa."}</p><p className="mt-2 text-xs font-bold">Endereço institucional, sem ponto no mapa.</p></li>)}</ol>
    </section>
    <section className="mt-10 grid gap-5 border-t-2 border-comun-black/20 pt-7 sm:grid-cols-2">
      <div><h2 className="text-2xl font-black uppercase">O que estes dados dizem</h2><p className="mt-2 text-sm">Mostram os agregados do Censo 2022 e equipamentos públicos presentes nos snapshots oficiais, com as datas e limitações de cada fonte.</p></div>
      <div><h2 className="text-2xl font-black uppercase">O que estes dados não dizem</h2><p className="mt-2 text-sm">Não calculam suficiência de serviços, distância de acesso, prioridade territorial, vulnerabilidade, exposição ambiental ou risco.</p></div>
    </section>
    <section className="mt-8 border-t-2 border-comun-black/20 pt-7" aria-labelledby="sources-title"><h2 id="sources-title" className="text-2xl font-black uppercase">Fontes e metodologia</h2><p className="mt-2 text-sm">Cada fonte abaixo foi verificada na data indicada. “Atualizado” refere-se ao snapshot, não ao deploy.</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{dto.sources.map((source) => <li key={source.id} className="border-2 border-comun-black/25 bg-comun-paper p-4"><p className="font-black">{source.label}</p><p className="mt-1 text-sm">{source.originalPublisher} · {formatDate(source.verifiedAt)}</p><a className="mt-2 inline-block text-sm font-bold underline" href={source.officialUrl} target="_blank" rel="noreferrer">Abrir fonte oficial</a></li>)}</ul><p className="mt-5 text-sm font-bold">A camada visual de setores foi adiada por orçamento de payload; a geometria oficial não foi simplificada para esta página.</p></section>
  </main>;
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) { return <article className="border-2 border-comun-black bg-comun-paper p-4"><p className="text-2xl font-black">{value}</p><p className="mt-1 font-black">{label}</p><p className="mt-1 text-xs text-comun-black/65">{detail}</p></article>; }
function EquipmentDetail({ point }: { point: TerritorialContextPublicDto["health"]["points"][number] }) { return <article className="mt-3 border-2 border-comun-black bg-comun-paper p-4" aria-live="polite"><p className="text-xs font-black uppercase text-comun-rust">Equipamento selecionado</p><h3 className="mt-1 text-xl font-black">{point.officialName}</h3><p className="mt-1 text-sm">{point.unitType ?? "Tipo CNES não informado"}</p><p className="mt-2 text-sm">{addressLabel(point.address)}</p><p className="mt-2 text-sm font-bold">{point.territorialBinding.state === "matched" ? "Vínculo censitário disponível." : "Coordenada oficial sem vínculo censitário seguro."}</p></article>; }
