import Link from "next/link";
import {
  powerInterruptionProjection,
  observatorySourcesProjection,
  specializedObservatoryMetadata,
} from "@/lib/comun-specialized-observatory-projection";
import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { isComunObservatoryEssentialPowerInterruptionEnabled } from "@/lib/comun-observatory-feature";
import { getPowerInterruptionSummaryDto } from "@/lib/comun-essential-power-interruption-observatory";
export const dynamic = "force-dynamic";
export function generateMetadata() {
  return specializedObservatoryMetadata(
    "/comun/observatorios/servicos-essenciais/energia/fontes",
    isComunObservatoryEssentialPowerInterruptionEnabled()
      ? observatorySourcesProjection(
          powerInterruptionProjection(getPowerInterruptionSummaryDto()),
        )
      : null,
  );
}

export default function EssentialPowerSourcesPage() {
  if (!isComunObservatoryEssentialPowerInterruptionEnabled()) notFound();
  const dto = getPowerInterruptionSummaryDto();
  const projection = observatorySourcesProjection(
    powerInterruptionProjection(dto),
  );
  return (
    <ComunShell>
      <main className="mx-auto max-w-5xl px-4 py-8 text-comun-black sm:py-12">
        <nav
          aria-label="Navegação das fontes"
          className="mb-6 flex flex-wrap gap-4"
        >
          <Link
            href="/comun/observatorios/servicos-essenciais/energia"
            className="inline-flex min-h-11 items-center font-bold underline"
          >
            Voltar ao observatório
          </Link>
          <Link
            href="/comun/observatorios"
            className="inline-flex min-h-11 items-center font-bold underline"
          >
            Todos os observatórios
          </Link>
        </nav>
        <p className="text-xs font-black uppercase text-comun-rust">
          Observatórios · Serviços Essenciais · Energia elétrica
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">
          {projection.title}
        </h1>
        <p data-comun-public-summary className="mt-4 max-w-3xl text-lg">
          {projection.summary}
        </p>
        <section className="mt-8 border-2 border-comun-black/25 bg-comun-paper p-5">
          <h2 className="text-2xl font-black uppercase">Snapshot ANEEL</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Pair label="Snapshot ativo" value={dto.source.snapshotId} />
            <Pair
              label="Ano do recurso"
              value={String(dto.reference.resourceYear)}
            />
            <Pair
              label="Última competência"
              value={dto.reference.latestPublishedCompetence}
            />
            <Pair label="Hash SHA-256" value={dto.source.rawSha256} />
            <Pair label="Estado do schema" value={dto.source.schemaState} />
            <Pair
              label="Captura"
              value={dto.source.retrievedAt ?? "Não informado no manifesto"}
            />
          </dl>
          <a
            className="mt-5 inline-block font-black underline"
            href={dto.source.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir fonte oficial da ANEEL
          </a>
        </section>
        <section className="mt-8">
          <h2 className="text-2xl font-black uppercase">Limitações</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            {dto.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
          <p className="mt-5 border-l-4 border-comun-yellow pl-4 text-sm">
            Catálogos anteriores de conjuntos elétricos não foram materializados
            neste ciclo. Esta página usa exclusivamente o snapshot ANEEL
            versionado e não faz consultas externas durante a visita.
          </p>
        </section>
      </main>
    </ComunShell>
  );
}
function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black">{label}</dt>
      <dd className="mt-1 break-all text-sm">{value}</dd>
    </div>
  );
}
