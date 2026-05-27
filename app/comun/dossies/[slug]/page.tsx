import { notFound } from "next/navigation";
import Link from "next/link";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { StatusLabel } from "@/components/status-label";
import { getCommunity, getDossier, getIssue } from "@/lib/comun-data";

export const dynamic = "force-dynamic";

export default async function DossierPage({ params }: { params: { slug: string } }) {
  const dossier = await getDossier(params.slug);
  if (!dossier) notFound();
  const issue = dossier.issueSlug ? ((await getIssue(dossier.issueSlug)) ?? null) : null;
  const community = issue ? ((await getCommunity(issue.communitySlug)) ?? null) : null;

  return (
    <ComunShell>
      <Section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <StatusLabel value={dossier.status} />
            <h1 className="comun-prose text-2xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">{dossier.title}</h1>
            <p className="comun-prose mt-4 max-w-3xl text-base text-comun-paper/80 sm:text-lg">{dossier.executiveSummary}</p>
            <div className="mt-4 grid gap-2 text-sm text-comun-paper/70">
              {community ? (
                <p>
                  Comunidade relacionada:{" "}
                  <Link href={`/comun/c/${community.slug}`} className="font-bold text-comun-yellow">
                    {community.name}
                  </Link>
                </p>
              ) : null}
              {issue ? (
                <p>
                  Pauta relacionada:{" "}
                  <Link href={`/comun/pautas/${issue.slug}`} className="font-bold text-comun-yellow">
                    {issue.title}
                  </Link>
                </p>
              ) : null}
            </div>
            <div className="mt-6">
              <PrimaryLink href={issue ? `/comun/relatar?comunidade=${issue.communitySlug}&pauta=${issue.slug}` : "/comun/relatar"}>
                Enviar relato relacionado
              </PrimaryLink>
            </div>
          </div>
          <aside className="paper-panel border-2 border-comun-black p-4">
            <h2 className="text-lg font-black uppercase">Por que compartilhar este dossie</h2>
            <p className="mt-3 text-sm text-comun-asphalt/80">
              Ele organiza padroes, relatos sanitizados e perguntas em aberto de forma legivel para circulacao publica.
            </p>
          </aside>
        </div>
      </Section>
      <Section>
        <div className="paper-panel border-2 border-comun-black p-5">
          <h2 className="font-black uppercase">Resumo executivo e contexto</h2>
          <p className="comun-prose mt-3 text-comun-asphalt/75">{dossier.contextText}</p>
        </div>
      </Section>
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Linha do tempo" items={dossier.timeline} />
          <Panel title="Padroes identificados" items={dossier.patterns} />
          <Panel title="Fontes e materiais uteis" items={dossier.sources} />
          <Panel title="Encaminhamentos" items={dossier.forwardingLog} />
        </div>
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Relatos sanitizados associados</h2>
        {dossier.relatedReports.length ? (
          <div className="mt-4 grid gap-4">
            {dossier.relatedReports.map((report) => (
              <article key={report.protocol} className="paper-panel border-2 border-comun-black p-4">
                <p className="text-xs font-black uppercase">{report.protocol}</p>
                <h3 className="comun-prose mt-2 font-black uppercase">{report.title}</h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{report.publicText}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="Ainda nao ha relatos publicados associados a este mini-dossie." />
        )}
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Perguntas em aberto</h2>
        {dossier.openQuestions.length ? (
          <div className="mt-4 grid gap-3">
            {dossier.openQuestions.map((question) => (
              <div key={question} className="paper-panel border-2 border-comun-black p-4 text-sm text-comun-asphalt/80">
                {question}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Ainda nao ha perguntas em aberto registradas publicamente para este mini-dossie." />
        )}
      </Section>
    </ComunShell>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="paper-panel border-2 border-comun-black p-4">
      <h2 className="font-black uppercase">{title}</h2>
      {items.length ? (
        <ul className="mt-3 grid gap-2 text-sm text-comun-asphalt/75">
          {items.map((item) => (
            <li key={item} className="comun-prose border-l-4 border-comun-yellow pl-3">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-comun-asphalt/70">Ainda nao ha conteudo publico organizado para este bloco.</p>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-4 border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">{text}</p>;
}
