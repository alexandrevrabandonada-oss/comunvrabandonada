import { notFound } from "next/navigation";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { StatusLabel } from "@/components/status-label";
import { getCommunity, getIssue } from "@/lib/seed-data";
import { listPublicReports } from "@/lib/reports";

export default async function IssuePage({ params }: { params: { slug: string } }) {
  const issue = getIssue(params.slug);
  if (!issue) notFound();
  const community = getCommunity(issue.communitySlug);
  const reports = await listPublicReports({ issueSlug: issue.slug });

  return (
    <ComunShell>
      <Section>
        <StatusLabel value={issue.status} />
        <h1 className="mt-4 text-4xl font-black uppercase text-comun-yellow">{issue.title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-comun-paper/80">{issue.summary}</p>
        <p className="mt-3 text-sm text-comun-paper/60">Comunidade: {community?.name}</p>
        <div className="mt-6"><PrimaryLink href={`/comun/relatar?pauta=${issue.slug}`}>Enviar relato parecido</PrimaryLink></div>
      </Section>
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          <Panel title="Linha do tempo" items={issue.timeline} />
          <Panel title="Materiais uteis" items={issue.usefulMaterials} />
          <div className="paper-panel border-2 border-comun-black p-4 md:col-span-1">
            <h2 className="font-black uppercase">Proximos passos</h2>
            <p className="mt-3 text-sm text-comun-asphalt/75">{issue.nextSteps}</p>
          </div>
        </div>
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Relatos associados</h2>
        {reports.length ? reports.map((report) => (
          <article key={report.id} className="paper-panel mt-4 border-2 border-comun-black p-4">
            <p className="text-xs font-black uppercase">{report.protocol}</p>
            <p className="mt-2 text-sm text-comun-asphalt/75">{report.public_text}</p>
          </article>
        )) : <p className="mt-4 border-2 border-comun-yellow bg-comun-black p-4 text-sm">Ainda nao ha relatos publicados nesta pauta.</p>}
      </Section>
    </ComunShell>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="paper-panel border-2 border-comun-black p-4">
      <h2 className="font-black uppercase">{title}</h2>
      <ul className="mt-3 grid gap-2 text-sm text-comun-asphalt/75">
        {items.map((item) => <li key={item} className="border-l-4 border-comun-yellow pl-3">{item}</li>)}
      </ul>
    </div>
  );
}
