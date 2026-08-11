import { type OfficialMetric } from "@/lib/comun-transport-system-metrics";

function integer(value: number) { return new Intl.NumberFormat("pt-BR").format(value); }
function decimal(value: number, digits = 2) { return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value); }
function money(value: number, digits = 2) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value); }

type Snapshot = {
  metrics: {
    passengers: { items: OfficialMetric[]; derivedComposition: Array<{ label: string; value: number }> };
    kilometers: { items: OfficialMetric[] };
    fleet: { total: OfficialMetric; operating: OfficialMetric; reserve: OfficialMetric; byAgeRange: Array<{ range: string; lightVehicles: number; heavyVehicles: number }> };
    costs: { totalMonthly: OfficialMetric; components: Array<{ metricId: string; label: string; monthlyValue: number; percentageOfTotal: number }> };
    technicalFare: OfficialMetric;
    publicFare: { value: number; effectiveFrom: string; decreeNumber: string };
  };
};

function details(metric: OfficialMetric) {
  return <details className="mt-3 text-sm"><summary className="cursor-pointer font-black underline">Sobre este número</summary><dl className="mt-3 grid gap-1 border-l-4 border-comun-yellow pl-3"><div><dt className="font-bold">Fonte</dt><dd>{metric.sourceId}</dd></div><div><dt className="font-bold">Página e seção</dt><dd>{metric.sourcePage} · {metric.sourceSection}</dd></div><div><dt className="font-bold">Período informado</dt><dd>{metric.sourceReportedPeriod}</dd></div><div><dt className="font-bold">Definição</dt><dd>{metric.notes}</dd></div></dl></details>;
}
function card(metric: OfficialMetric, value: string, eyebrow: string) {
  return <article className="border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black" key={metric.metricId}><p className="text-xs font-black uppercase text-comun-black/65">{eyebrow}</p><h3 className="mt-1 text-lg font-black">{metric.label}</h3><p className="mt-3 text-3xl font-black tracking-[-.04em]">{value}</p><p className="mt-1 text-sm">{metric.unit}</p>{details(metric)}</article>;
}
function find(items: OfficialMetric[], id: string) { const value = items.find((item) => item.metricId === id); if (!value) throw new Error(`Missing public metric: ${id}`); return value; }

export function TransportSystemMetrics({ snapshot }: { snapshot: Snapshot }) {
  const monthly = find(snapshot.metrics.passengers.items, "average_monthly_transported");
  const productive = find(snapshot.metrics.kilometers.items, "productive_kilometers_monthly");
  const ipk = find(snapshot.metrics.kilometers.items, "ipk");
  const { fleet, costs, technicalFare, publicFare } = snapshot.metrics;
  return <section className="mt-10 border-t-4 border-comun-yellow pt-8" aria-labelledby="system-metrics-title">
    <p className="text-xs font-black uppercase text-comun-yellow">Estudo oficial</p>
    <h2 id="system-metrics-title" className="mt-2 text-3xl font-black uppercase tracking-[-.04em] sm:text-5xl">O sistema em números</h2>
    <p className="mt-4 max-w-3xl text-lg text-comun-paper/85">Os números abaixo vêm do estudo tarifário oficial da STMU. Eles representam os períodos e parâmetros usados no documento, não dados em tempo real.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {card(monthly, integer(monthly.value), "Passageiros")}
      {card(productive, decimal(productive.value), "Quilometragem")}
      <article className="border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"><p className="text-xs font-black uppercase text-comun-black/65">Frota</p><h3 className="mt-1 text-lg font-black">Frota considerada no estudo tarifário</h3><p className="mt-3 text-3xl font-black">{integer(fleet.total.value)}</p><p className="mt-1 text-sm">{fleet.operating.value} operante · {fleet.reserve.value} reserva</p>{details(fleet.total)}</article>
      {card(ipk, decimal(ipk.value, 4), "Indicador operacional")}
      {card(costs.totalMonthly, money(costs.totalMonthly.value), "Custos")}
      {card(technicalFare, money(technicalFare.value), "Tarifa técnica")}
    </div>
    <section className="mt-5 border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"><p className="text-xs font-black uppercase text-comun-black/65">Tarifa pública, separada do estudo</p><h3 className="mt-1 text-xl font-black">Tarifa pública vigente</h3><p className="mt-2 text-3xl font-black">{money(publicFare.value)}</p><p className="mt-1 text-sm">Decreto Municipal nº {publicFare.decreeNumber} · vigência a partir de 01/02/2026.</p><p className="mt-3 border-l-4 border-comun-yellow pl-3 text-sm">A tarifa técnica calculada no estudo é {money(technicalFare.value, 4)} no valor canônico. Ela não é o preço da passagem.</p></section>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <details className="border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"><summary className="cursor-pointer text-lg font-black">Composição da demanda</summary><p className="mt-2 text-sm">Percentuais derivados sobre o total transportado reportado pelo estudo.</p><ul className="mt-3 space-y-1 text-sm">{snapshot.metrics.passengers.derivedComposition.map((metric) => <li key={metric.label}><strong>{metric.label}:</strong> {decimal(metric.value)}% · denominador: total transportado</li>)}</ul></details>
      <details className="border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"><summary className="cursor-pointer text-lg font-black">Faixas de idade da frota</summary><p className="mt-2 text-sm">Distribuição apresentada no estudo, sem julgamento automático de qualidade.</p><ul className="mt-3 grid gap-1 text-sm">{fleet.byAgeRange.map((range) => <li key={range.range}>{range.range === "more_than_12" ? "Mais de 12" : range.range} anos · leve {range.lightVehicles} · pesado {range.heavyVehicles}</li>)}</ul></details>
      <details className="border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"><summary className="cursor-pointer text-lg font-black">Componentes de custo</summary><p className="mt-2 text-sm">Valores mensais e coluna “% Total” do resumo oficial.</p><ul className="mt-3 space-y-1 text-sm">{costs.components.map((component) => <li key={component.metricId}><strong>{component.label}:</strong> {money(component.monthlyValue)} · {decimal(component.percentageOfTotal, 4)}%</li>)}</ul></details>
    </div>
    <p className="mt-5 border-l-4 border-comun-yellow pl-4 text-sm">PMM não é exibido como número: o formato do documento não permite confirmar a unidade sem ambiguidade. Não há tendência temporal neste snapshot único.</p>
  </section>;
}
