import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import {
  COMUN_TRANSPORT_SOURCE_MANIFEST,
  COMUN_TRANSPORT_SNAPSHOT,
} from "@/lib/comun-transport-programmed-network";
import { isComunObservatoryTransportProgrammedEnabled } from "@/lib/comun-observatory-feature";

export const dynamic = "force-dynamic";

export default function Page() {
  if (!isComunObservatoryTransportProgrammedEnabled()) notFound();

  return (
    <ComunShell>
      <main className="mx-auto max-w-5xl px-4 py-8 text-comun-paper sm:py-12">
        <p className="text-xs font-black uppercase text-comun-yellow">Proveniência</p>
        <h1 className="mt-2 text-4xl font-black uppercase sm:text-6xl">Fontes do Transporte</h1>
        <p className="mt-4 max-w-3xl text-lg">
          Snapshot {COMUN_TRANSPORT_SNAPSHOT.snapshotId}, verificado em 11/08/2026. O runtime usa somente este artefato versionado: não busca nem processa documentos externos durante a visita.
        </p>
        <section className="mt-8 space-y-3">
          {COMUN_TRANSPORT_SOURCE_MANIFEST.sources.map((source) => (
            <article className="border-2 border-comun-paper/35 bg-comun-paper p-4 text-comun-black" key={source.sourceId}>
              <h2 className="font-black">{source.sourceType}</h2>
              <p>{source.publisher} · {source.lineCode ? `linha ${source.lineCode}` : "catálogo"}</p>
              <p className="text-sm font-bold">
                {source.status === "superseded" ? "Fonte histórica, preservada para comparação" : "Fonte ativa da versão atual"}
              </p>
              {source.orderNumber ? <p>Ordem de Serviço: {source.orderNumber}</p> : null}
              <p className="text-sm">SHA-256 da captura: <code className="break-all">{source.sha256}</code></p>
              {source.semanticSha256 ? <p className="text-sm">Hash semântico do catálogo: <code className="break-all">{source.semanticSha256}</code></p> : null}
              <a className="mt-2 inline-block font-bold underline" href={source.officialUrl} target="_blank" rel="noreferrer">Abrir fonte oficial</a>
            </article>
          ))}
        </section>
        <section className="mt-8 border-l-4 border-comun-yellow pl-4 text-sm">
          <h2 className="font-black uppercase">Limitações</h2>
          <p className="mt-2">Programado não é realizado. Não há tempo real, previsão de chegada, GPS, geografia de pontos, relatos P5, Carteira, sessões 48.0E ou dados de encaminhamento. O catálogo é revisado por conteúdo semântico; uma mudança de rede exige revisão e novo snapshot.</p>
        </section>
      </main>
    </ComunShell>
  );
}
