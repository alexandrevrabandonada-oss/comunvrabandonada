import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { getCommunity, listIssues } from "@/lib/comun-data";
import { StatusLabel } from "@/components/status-label";
import { listPublicReports } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityPage({ params }: { params: { slug: string } }) {
  const community = await getCommunity(params.slug);
  if (!community) notFound();
  const [relatedIssues, reports] = await Promise.all([
    listIssues({ communitySlug: community.slug }),
    listPublicReports({ communitySlug: community.slug }),
  ]);
  const usefulMaterials = Array.from(new Set(relatedIssues.flatMap((issue) => issue.usefulMaterials))).slice(0, 5);

  return (
    <ComunShell>
      <Section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <h1 className="comun-prose text-2xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">{community.name}</h1>
            <p className="comun-prose mt-4 max-w-3xl text-base text-comun-paper/80 sm:text-lg">{community.fullDescription}</p>
            <div className="mt-6">
              <PrimaryLink href={`/comun/relatar?comunidade=${community.slug}`}>Enviar relato nesta comunidade</PrimaryLink>
            </div>
          </div>
          <aside className="paper-panel border-2 border-comun-black p-4">
            <h2 className="text-lg font-black uppercase">Nesta comunidade voce pode</h2>
            <ul className="mt-3 grid gap-2 text-sm text-comun-asphalt/80">
              <li className="border-l-4 border-comun-yellow pl-3">Enviar relato com seguranca</li>
              <li className="border-l-4 border-comun-yellow pl-3">Acompanhar pautas em organizacao</li>
              <li className="border-l-4 border-comun-yellow pl-3">Contribuir com memoria coletiva</li>
            </ul>
          </aside>
        </div>
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Pautas relacionadas</h2>
        {relatedIssues.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {relatedIssues.map((issue) => (
              <Link key={issue.slug} href={`/comun/pautas/${issue.slug}`} className="paper-panel border-2 border-comun-black p-4">
                <StatusLabel value={issue.status} />
                <h3 className="comun-prose mt-3 font-black uppercase">{issue.title}</h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{issue.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="Ainda nao ha pautas organizadas nesta comunidade. O primeiro passo e receber relatos consistentes." />
        )}
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Relatos publicados</h2>
        {reports.length ? (
          <div className="mt-4 grid gap-4">
            {reports.map((report) => (
              <article key={report.id} className="paper-panel border-2 border-comun-black p-4">
                <p className="text-xs font-black uppercase">{report.protocol}</p>
                <h3 className="comun-prose mt-2 font-black uppercase">{report.title ?? "Relato sanitizado"}</h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{report.public_text}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="Ainda nao ha relatos publicados nesta comunidade. Voce pode enviar o primeiro relato com seguranca." />
        )}
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Materiais uteis</h2>
        {usefulMaterials.length ? (
          <div className="mt-4 grid gap-3">
            {usefulMaterials.map((item) => (
              <div key={item} className="paper-panel border-2 border-comun-black p-4 text-sm text-comun-asphalt/80">
                {item}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Ainda nao ha materiais uteis organizados para esta comunidade." />
        )}
      </Section>
    </ComunShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-4 border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">{text}</p>;
}
