import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { StatusLabel } from "@/components/status-label";
import { listDossiers } from "@/lib/comun-data";
import { listPublishedPautaDossiers } from "@/lib/pauta-dossiers";

export const dynamic = "force-dynamic";

export default async function DossiersPage() {
  const [dossiers, pautaDossiers] = await Promise.all([listDossiers(), listPublishedPautaDossiers()]);
  const publishedDossiers = dossiers.filter((dossier) => dossier.status === "published");

  return (
    <ComunShell>
      <Section>
        <h1 className="text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">Dossies do COMUN</h1>
        <p className="comun-prose mt-3 max-w-3xl text-comun-paper/75">
          Relatos e pautas organizados em memoria coletiva. Cada dossie reune sinais publicos, padroes e
          encaminhamentos sem expor texto bruto nem contato privado.
        </p>
        <div className="mt-5 border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/78">
          Um dossie do COMUN transforma relatos sanitizados e pautas recorrentes em memoria coletiva compartilhavel.
        </div>
        {pautaDossiers.length || publishedDossiers.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {pautaDossiers.map((dossier) => (
              <Link
                key={dossier.id}
                href={`/comun/dossies/${dossier.public_slug}`}
                className="paper-panel flex min-h-[15rem] flex-col border-2 border-comun-black p-5"
              >
                <StatusLabel value="published" />
                <h2 className="comun-prose mt-3 text-xl font-black uppercase">{dossier.public_title}</h2>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{dossier.public_summary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-asphalt/65">
                  {dossier.pauta ? <span>Pauta: {dossier.pauta.title}</span> : null}
                  {dossier.published_at ? <span>{new Date(dossier.published_at).toLocaleDateString("pt-BR")}</span> : null}
                </div>
                <span className="mt-auto pt-5 text-sm font-black uppercase text-comun-rust">Ler dossie</span>
              </Link>
            ))}
            {publishedDossiers.map((dossier) => (
              <Link
                key={dossier.slug}
                href={`/comun/dossies/${dossier.slug}`}
                className="paper-panel flex min-h-[15rem] flex-col border-2 border-comun-black p-5"
              >
                <StatusLabel value={dossier.status} />
                <h2 className="comun-prose mt-3 text-xl font-black uppercase">{dossier.title}</h2>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{dossier.executiveSummary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-asphalt/65">
                  <span>{dossier.patterns.length} padroes</span>
                  <span>{dossier.sources.length} fontes</span>
                  <span>{dossier.forwardingLog.length} encaminhamentos</span>
                </div>
                <span className="mt-auto pt-5 text-sm font-black uppercase text-comun-rust">Ver dossie</span>
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
