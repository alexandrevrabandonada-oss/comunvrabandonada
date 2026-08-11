import Link from "next/link";
import type { ObservatoryRegistryEntry, ObservatorySourceDescriptor } from "@/lib/comun-observatory";

function formatDate(value: string | null) {
  if (!value) return "Ainda sem data de atualização";
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(value));
}

const freshnessLabels = {
  current: "Atualização recente",
  aging: "Dado em envelhecimento",
  stale: "Dado possivelmente desatualizado",
  unknown: "Atualização não informada",
} as const;

const qualityLabels = {
  verified_source: "Fonte verificada",
  reviewed_community: "Contribuição comunitária revisada",
  source_conflict: "Fontes em conflito",
  partial: "Cobertura parcial",
  experimental: "Uso experimental",
} as const;

export function ObservatorySourceDisclosure({ source }: { source: ObservatorySourceDescriptor }) {
  const stale = source.freshness === "stale";
  return (
    <details className="mt-5 border-t-2 border-comun-black/15 pt-3 text-sm">
      <summary className="cursor-pointer font-black underline decoration-2 underline-offset-4">
        Sobre estes dados
      </summary>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Meta label="Fonte" value={source.label} />
        <Meta label="Período" value={source.observedPeriod ?? "Período por registro revisado"} />
        <Meta label="Última atualização" value={formatDate(source.updatedAt)} />
        <Meta label="Atualidade" value={freshnessLabels[source.freshness]} />
        <Meta label="Qualidade" value={qualityLabels[source.qualityState]} />
        <Meta label="Metodologia" value={source.methodology} />
      </dl>
      {stale ? <p className="mt-3 border-l-4 border-comun-yellow pl-3 font-bold">Este dado pode estar desatualizado.</p> : null}
      <p className="mt-3 text-comun-black/70">Limitação: esta leitura não representa todas as calçadas da cidade e não inclui relatos privados.</p>
    </details>
  );
}

export function ObservatoryHub({
  observatories,
  sidewalkSource,
  sidewalkCount,
}: {
  observatories: readonly ObservatoryRegistryEntry[];
  sidewalkSource: ObservatorySourceDescriptor | null;
  sidewalkCount: number | null;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-xs font-black uppercase text-comun-yellow">Leitura pública</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] text-comun-paper sm:text-6xl">Observatórios</h1>
        <p className="mt-4 text-lg text-comun-paper/80">Dados públicos e informações revisadas para entender o território.</p>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Observatórios disponíveis">
        {observatories.map((item) => {
          const available = item.status === "available" && Boolean(item.publicRoute);
          const sidewalk = item.id === "sidewalks";
          return (
            <article key={item.id} className="border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black">
              <p className={`text-xs font-black uppercase ${available ? "text-comun-rust" : "text-comun-black/60"}`}>{available ? "Disponível" : "Em preparação"}</p>
              <h2 className="mt-2 text-2xl font-black uppercase">{item.label}</h2>
              <p className="mt-2 text-comun-black/75">{item.description}</p>
              {sidewalk && available && sidewalkCount !== null ? <p className="mt-4 text-sm font-bold">{sidewalkCount} ponto(s) revisado(s) na projeção pública.</p> : null}
              {available ? <Link href={item.publicRoute!} className="mt-5 inline-flex min-h-11 items-center bg-comun-yellow px-4 font-black uppercase text-comun-black">Ver observatório</Link> : null}
              {sidewalk && sidewalkSource && available ? <ObservatorySourceDisclosure source={sidewalkSource} /> : null}
            </article>
          );
        })}
      </section>
      <section className="mt-8 max-w-3xl border-l-4 border-comun-yellow pl-4 text-sm text-comun-paper/80" aria-labelledby="observatory-methodology">
        <h2 id="observatory-methodology" className="font-black uppercase text-comun-paper">Como funciona este Observatório</h2>
        <p className="mt-2">O COMUN reúne somente fontes já públicas, projeções comunitárias revisadas ou dados editoriais com proveniência. Relatos privados, fotos, localizações, Carteira e dados de Saúde, Educação ou Proteção não entram nesta área.</p>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-black">{label}</dt><dd className="mt-1 text-comun-black/75">{value}</dd></div>;
}
