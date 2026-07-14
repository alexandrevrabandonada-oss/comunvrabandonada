import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { listPublicPautaSpaces } from "@/lib/pauta-spaces";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PautaSpacesPage() {
  const spaces = await listPublicPautaSpaces();

  return (
    <ComunShell>
      <Section>
        <h1 className="text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">Pautas em construcao</h1>
        <p className="comun-prose mt-3 max-w-3xl text-comun-paper/78">
          Pautas sao espacos coletivos para organizar problemas reais, evidencias, protocolos, propostas e tarefas. Nao ha feed global, likes ou ranking de popularidade.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {spaces.map((space) => (
            <Link key={space.id} href={`/comun/pautas/${space.slug}`} className="paper-panel border-2 border-comun-black p-5">
              <p className="text-xs font-black uppercase text-comun-asphalt/60">{statusLabel(space.status)} / {space.community ?? "comunidade aberta"}</p>
              <h2 className="comun-prose mt-2 text-xl font-black uppercase">{space.title}</h2>
              <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{space.summary ?? "Pauta em organizacao coletiva."}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-asphalt/70">
                <span>{space.stats.reportCount} relatos</span>
                <span>{space.stats.officialProtocolCount} protocolos</span>
                {space.stats.overdueProtocolCount ? <span className="text-comun-red">{space.stats.overdueProtocolCount} vencidos</span> : null}
                <span>{space.stats.openTaskCount} tarefas abertas</span>
              </div>
              <span className="mt-5 inline-flex min-h-10 items-center border-2 border-comun-black bg-comun-yellow px-3 text-sm font-black uppercase">Abrir pauta</span>
            </Link>
          ))}
          {!spaces.length ? (
            <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">
              Ainda nao ha espacos sociais de pauta publicados.
            </p>
          ) : null}
        </div>
      </Section>
    </ComunShell>
  );
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    observing: "Observando",
    organizing: "Organizando",
    drafting: "Sintetizando",
    pressuring: "Cobrando",
    resolved: "Resolvida",
    unresolved: "Nao resolvida",
  };
  return labels[value] ?? value;
}
