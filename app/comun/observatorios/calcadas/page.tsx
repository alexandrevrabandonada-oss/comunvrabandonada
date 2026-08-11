import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { ComunSidewalkObservatory } from "@/components/comun-sidewalk-observatory";
import { isComunObservatorySidewalkAnalyticsEnabled } from "@/lib/comun-observatory-feature";
import { getSidewalkReviewedProjectionForObservatory } from "@/lib/comun-observatory-sidewalk-adapter";
import { parseSidewalkObservatoryFilters } from "@/lib/comun-sidewalk-observatory";
import { resolveSidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";

export const dynamic = "force-dynamic";

export default async function SidewalkObservatoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isComunObservatorySidewalkAnalyticsEnabled()) notFound();
  const [projection, query] = await Promise.all([
    getSidewalkReviewedProjectionForObservatory(),
    searchParams,
  ]);

  if (!projection.available) {
    return (
      <ComunShell>
        <SimpleState
          title="Observatório de Calçadas"
          message="Os dados de Calçadas estão temporariamente indisponíveis."
        />
      </ComunShell>
    );
  }

  if (projection.observations.length === 0) {
    return (
      <ComunShell>
        <SimpleState
          title="Observatório de Calçadas"
          message="Não há pontos revisados publicados neste momento."
        />
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <ComunSidewalkObservatory
        observations={projection.observations}
        source={projection.source}
        coverageState={projection.coverageState}
        initialFilters={parseSidewalkObservatoryFilters(query)}
        provider={resolveSidewalkBasemapProvider()}
      />
    </ComunShell>
  );
}

function SimpleState({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-comun-black">
      <p className="text-xs font-black uppercase text-comun-rust">
        Leitura territorial reviewed-only
      </p>
      <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-lg">{message}</p>
      <p className="mt-4 max-w-3xl border-l-4 border-comun-yellow pl-4 text-sm font-bold">
        Estes dados representam apenas pontos observados, revisados e
        publicados. Não são um levantamento completo de todas as calçadas da
        cidade.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/comun/relatar"
          className="inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase"
        >
          Registrar problema
        </Link>
        <Link
          href="/comun/observatorios"
          className="inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-paper px-4 font-black uppercase"
        >
          Voltar aos Observatórios
        </Link>
      </div>
    </main>
  );
}
