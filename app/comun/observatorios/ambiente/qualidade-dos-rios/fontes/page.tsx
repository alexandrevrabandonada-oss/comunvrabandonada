import Link from "next/link";
import {
  surfaceWaterProjection,
  observatorySourcesProjection,
  specializedObservatoryMetadata,
} from "@/lib/comun-specialized-observatory-projection";
import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { isComunObservatoryEnvironmentSurfaceWaterEnabled } from "@/lib/comun-observatory-feature";
import { getSurfaceWaterObservatoryPublicDto } from "@/lib/comun-observatory-surface-water";
export const dynamic = "force-dynamic";
export function generateMetadata() {
  return specializedObservatoryMetadata(
    "/comun/observatorios/ambiente/qualidade-dos-rios/fontes",
    isComunObservatoryEnvironmentSurfaceWaterEnabled()
      ? observatorySourcesProjection(
          surfaceWaterProjection(getSurfaceWaterObservatoryPublicDto()),
        )
      : null,
  );
}

export default function SourcesPage() {
  if (!isComunObservatoryEnvironmentSurfaceWaterEnabled()) notFound();
  const dto = getSurfaceWaterObservatoryPublicDto();
  const projection = observatorySourcesProjection(surfaceWaterProjection(dto));
  return (
    <ComunShell>
      <main className="mx-auto max-w-5xl px-4 py-8 text-comun-black sm:py-12">
        <nav
          aria-label="Navegação das fontes"
          className="mb-6 flex flex-wrap gap-4"
        >
          <Link
            href="/comun/observatorios/ambiente/qualidade-dos-rios"
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
        <p className="text-xs font-black uppercase text-comun-yellow">
          Observatório Ambiental · Qualidade dos Rios
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">
          {projection.title}
        </h1>
        <p data-comun-public-summary className="mt-4 max-w-3xl text-lg">
          {projection.summary}
        </p>
        <section className="mt-8 grid gap-4">
          {dto.sources.map((source) => (
            <article
              key={source.id}
              className="border-2 border-comun-black/25 bg-comun-paper p-4"
            >
              <h2 className="font-black">
                INEA · Dados Brutos RH III {source.reportedYear}
              </h2>
              <p className="mt-2 text-sm">Snapshot: {dto.snapshot.id}</p>
              <p className="mt-1 break-all text-xs">
                SHA-256: {source.rawSha256}
              </p>
              <p className="mt-1 text-sm">Parser: {source.parserVersion}</p>
              <a
                className="mt-3 inline-block font-bold underline"
                href={source.officialUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir fonte oficial
              </a>
            </article>
          ))}
        </section>
        <section className="mt-8 border-l-4 border-comun-yellow pl-4 text-sm">
          <h2 className="font-black uppercase">Limitações</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            {dto.limitations.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </section>
      </main>
    </ComunShell>
  );
}
