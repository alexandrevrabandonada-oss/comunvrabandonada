import Link from "next/link";
import type {
  PowerInterruptionPublicRecord,
  PowerInterruptionRecordsPage,
  PowerInterruptionSummaryDto,
} from "@/lib/comun-essential-power-interruption-observatory";

const formatter = new Intl.NumberFormat("pt-BR");

function display(value: string | number | null) {
  return value === null || value === "" ? "Não informado pela fonte" : String(value);
}

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}min` : `${minutes} min`;
}

function queryString(
  current: PowerInterruptionRecordsPage["appliedFilters"],
  next: Partial<PowerInterruptionRecordsPage["appliedFilters"]> = {},
) {
  const values = { ...current, ...next };
  const params = new URLSearchParams();
  for (const key of ["month", "set", "origin", "type", "cause", "cursor"] as const) {
    if (values[key]) params.set(key, values[key]!);
  }
  if (values.limit !== 25) params.set("limit", String(values.limit));
  const result = params.toString();
  return result ? `?${result}` : "";
}

export function EssentialPowerInterruptionsObservatory({
  summary,
  recordsPage,
}: {
  summary: PowerInterruptionSummaryDto;
  recordsPage: PowerInterruptionRecordsPage;
}) {
  const ranges = `${summary.reference.firstPublishedCompetence} a ${summary.reference.latestPublishedCompetence}`;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-comun-black sm:py-12">
      <header className="max-w-4xl">
        <p className="text-xs font-black uppercase text-comun-rust">
          Observatórios · Serviços Essenciais · Energia elétrica
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">
          Interrupções de energia elétrica
        </h1>
        <p className="mt-4 text-lg leading-relaxed">
          Registros publicados pela ANEEL para Volta Redonda, mantidos em um snapshot
          público e somente de leitura pelo COMUN.
        </p>
        <div className="mt-5 border-l-4 border-comun-yellow bg-comun-paper p-4 font-bold">
          <p>Período disponível: {ranges}. Última competência publicada: {summary.reference.latestPublishedCompetence}.</p>
          <p className="mt-2 text-sm font-normal">O conjunto não representa um ano-calendário completo e não mostra operação em tempo real.</p>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="energy-summary">
        <h2 id="energy-summary" className="text-2xl font-black uppercase">O que está disponível</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Registros de interrupção publicados" value={formatter.format(summary.recordCount)} detail="Não é uma contagem de pessoas, nem de apagões únicos." />
          <Metric label="Competências publicadas" value={summary.reference.reportedCompetencePeriods.join(", ")} detail="A ausência de fevereiro não é convertida em zero." />
          <Metric label="Distribuidora na fonte" value={summary.distributor.officialAbbreviation} detail={summary.distributor.officialName} />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="records-by-month">
        <h2 id="records-by-month" className="text-2xl font-black uppercase">Registros publicados por competência</h2>
        <p className="mt-2 max-w-3xl text-sm">Cada contagem corresponde aos registros publicados na competência indicada pela fonte. Não é série de qualidade, continuidade ou evento único.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summary.countsByMonth.map((item) => <li key={item.competence} className="border-2 border-comun-black/20 bg-comun-paper p-4"><p className="font-black">{item.competence}</p><p className="mt-2 text-2xl font-black">{formatter.format(item.recordCount)}</p><p className="text-sm">registros publicados</p></li>)}
        </ul>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3" aria-labelledby="cause-distribution">
        <div className="lg:col-span-2">
          <h2 id="cause-distribution" className="text-2xl font-black uppercase">Campos de causa publicados</h2>
          <p className="mt-2 text-sm">Os rótulos são exatamente os valores publicados pela fonte. O COMUN não atribui responsabilidade nem reclassifica causas.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {summary.causeDimensions.map((dimension) => <article key={dimension.dimension} className="border-2 border-comun-black/20 bg-comun-paper p-4"><h3 className="font-black uppercase">{dimension.dimension === "origin" ? "Origem" : dimension.dimension === "type" ? "Tipo" : "Causa"}</h3><ul className="mt-3 space-y-2 text-sm">{dimension.values.map((item) => <li key={`${item.label}-${item.recordCount}`} className="flex justify-between gap-3"><span>{display(item.label)}</span><strong>{formatter.format(item.recordCount)}</strong></li>)}</ul></article>)}
          </div>
        </div>
        <aside className="border-l-4 border-comun-yellow bg-comun-paper p-5">
          <h2 className="font-black uppercase">DEC e FEC</h2>
          <p className="mt-2 text-sm">Os indicadores DEC e FEC não são exibidos aqui. A evidência disponível não permite formar um agregado municipal comparável.</p>
          <Link className="mt-4 inline-block font-black underline" href="/comun/observatorios/servicos-essenciais/energia/fontes">Ver fontes e limitações</Link>
        </aside>
      </section>

      <section className="mt-10" aria-labelledby="published-records">
        <h2 id="published-records" className="text-2xl font-black uppercase">Registros publicados</h2>
        <p className="mt-2 max-w-3xl text-sm">Os conjuntos elétricos, alimentadores e subestações são campos técnicos da fonte; não representam bairros. “Consumidores afetados” é o valor daquele registro, não pessoas únicas.</p>
        <PowerInterruptionFilters page={recordsPage} />
        <p className="mt-5 font-bold" aria-live="polite">Mostrando {recordsPage.observations.length} de {formatter.format(recordsPage.page.totalMatchingRecords)} registros que correspondem aos filtros.</p>
        <div className="mt-4 grid gap-3 md:hidden">{recordsPage.observations.map((record) => <PowerRecordCard key={record.id} record={record} />)}</div>
        <div className="mt-4 hidden overflow-x-auto md:block"><table className="min-w-full border-2 border-comun-black/25 bg-comun-paper text-left text-sm"><caption className="sr-only">Registros de interrupção publicados pela ANEEL</caption><thead className="bg-comun-black text-comun-paper"><tr><th className="p-3">Competência</th><th className="p-3">Início e duração</th><th className="p-3">Conjunto técnico</th><th className="p-3">Consumidores afetados neste registro</th><th className="p-3">Detalhes</th></tr></thead><tbody>{recordsPage.observations.map((record) => <tr key={record.id} className="border-t border-comun-black/20"><td className="p-3 font-bold">{record.competence}</td><td className="p-3">{record.startedAt}<br /><span className="text-comun-black/70">{duration(record.durationSeconds)}</span></td><td className="p-3">{record.electricalSet}</td><td className="p-3">{display(record.affectedConsumers)}</td><td className="p-3"><PowerRecordDetails record={record} /></td></tr>)}</tbody></table></div>
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Paginação dos registros">{recordsPage.appliedFilters.cursor ? <Link className="border-2 border-comun-black px-4 py-2 font-black" href={queryString(recordsPage.appliedFilters, { cursor: null })}>Primeira página</Link> : null}{recordsPage.page.nextCursor ? <Link className="border-2 border-comun-black bg-comun-yellow px-4 py-2 font-black" href={queryString(recordsPage.appliedFilters, { cursor: recordsPage.page.nextCursor })}>Próximos registros</Link> : null}</nav>
      </section>

      <section className="mt-10 grid gap-5 border-t-2 border-comun-black/20 pt-7 lg:grid-cols-2">
        <article><h2 className="text-2xl font-black uppercase">O que estes dados mostram</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm"><li>Registros publicados de interrupção para Volta Redonda.</li><li>Competência, duração e campos técnicos existentes na fonte.</li><li>Rótulos de origem, tipo e causa publicados pela ANEEL.</li></ul></article>
        <article><h2 className="text-2xl font-black uppercase">O que estes dados não mostram</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm"><li>Operação em tempo real ou previsão de restabelecimento.</li><li>Pessoas únicas afetadas, bairros ou mapa de interrupções.</li><li>Responsabilidade material por uma ocorrência ou qualidade do serviço.</li></ul></article>
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="border-2 border-comun-black/25 bg-comun-paper p-5"><h3 className="text-sm font-black uppercase">{label}</h3><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-2 text-sm text-comun-black/75">{detail}</p></article>; }

function PowerInterruptionFilters({ page }: { page: PowerInterruptionRecordsPage }) { const values = page.appliedFilters; return <form className="mt-5 grid gap-3 border-2 border-comun-black/20 bg-comun-paper p-4 sm:grid-cols-2 lg:grid-cols-5" method="get"><Filter name="month" label="Competência" value={values.month} options={page.facets.months} /><Filter name="set" label="Conjunto técnico" value={values.set} options={page.facets.electricalSets} /><Filter name="origin" label="Origem" value={values.origin} options={page.facets.origins} /><Filter name="type" label="Tipo" value={values.type} options={page.facets.types} /><Filter name="cause" label="Causa" value={values.cause} options={page.facets.causes} /><button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase sm:col-span-2 lg:col-span-1" type="submit">Filtrar</button></form>; }
function Filter({ name, label, value, options }: { name: string; label: string; value: string | null; options: readonly string[] }) { return <label className="grid gap-1 text-sm font-black">{label}<select className="min-h-11 border-2 border-comun-black bg-white px-2 font-normal" name={name} defaultValue={value ?? ""}><option value="">Todos</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function PowerRecordCard({ record }: { record: PowerInterruptionPublicRecord }) { return <article className="border-2 border-comun-black/25 bg-comun-paper p-4"><p className="text-xs font-black uppercase">{record.competence}</p><h3 className="mt-1 font-black">{record.electricalSet}</h3><dl className="mt-3 grid gap-2 text-sm"><Pair label="Início" value={record.startedAt} /><Pair label="Duração" value={duration(record.durationSeconds)} /><Pair label="Consumidores afetados neste registro" value={display(record.affectedConsumers)} /></dl><div className="mt-3"><PowerRecordDetails record={record} /></div></article>; }
function PowerRecordDetails({ record }: { record: PowerInterruptionPublicRecord }) { return <details><summary className="cursor-pointer font-black underline">Ver campos publicados</summary><dl className="mt-3 grid gap-2 text-sm"><Pair label="Fim" value={record.endedAt} /><Pair label="Alimentador" value={display(record.feeder)} /><Pair label="Subestação" value={display(record.substation)} /><Pair label="Localização técnica da fonte" value={display(record.sourceLocationLabel)} /><Pair label="Origem" value={display(record.cause.origin)} /><Pair label="Tipo" value={display(record.cause.type)} /><Pair label="Causa" value={display(record.cause.cause)} /><Pair label="Detalhe" value={display(record.cause.detail)} /><Pair label="Consumidores ativos neste registro" value={display(record.activeConsumers)} /><Pair label="Nível de tensão" value={display(record.voltageLevel)} /><Pair label="Elemento interrompido" value={display(record.interruptedElementType)} /><Pair label="Motivo de expurgo" value={display(record.expurgoReason)} /></dl></details>; }
function Pair({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold">{label}</dt><dd>{value}</dd></div>; }
