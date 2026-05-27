import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { StatusLabel } from "@/components/status-label";
import { dossiers } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export default function DossiersPage() {
  const publishedDossiers = dossiers.filter((dossier) => dossier.status === "published");

  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">Dossies do COMUN</h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Relatos e pautas organizados em memoria coletiva. Cada dossie reune sinais publicos, padroes e
          encaminhamentos sem expor texto bruto nem contato privado.
        </p>
        {publishedDossiers.length ? (
          <div className="mt-6 grid gap-4">
            {publishedDossiers.map((dossier) => (
              <Link key={dossier.slug} href={`/comun/dossies/${dossier.slug}`} className="paper-panel border-2 border-comun-black p-5">
                <StatusLabel value={dossier.status} />
                <h2 className="mt-3 text-xl font-black uppercase">{dossier.title}</h2>
                <p className="mt-2 text-sm text-comun-asphalt/75">{dossier.executiveSummary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-asphalt/65">
                  <span>{dossier.patterns.length} padroes</span>
                  <span>{dossier.sources.length} fontes</span>
                  <span>{dossier.forwardingLog.length} encaminhamentos</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">
            Ainda nao ha mini-dossies publicados. Eles aparecem quando a equipe consegue organizar relatos sanitizados em memoria coletiva util.
          </p>
        )}
      </Section>
    </ComunShell>
  );
}
