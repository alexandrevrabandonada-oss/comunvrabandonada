import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { getCommunity, getIssue } from "@/lib/comun-data";
import { StatusLabel } from "@/components/status-label";
import { listPublicReports } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IssuePage({ params }: { params: { slug: string } }) {
  const issue = await getIssue(params.slug);
  if (!issue) notFound();
  const [community, communityReports] = await Promise.all([
    getCommunity(issue.communitySlug),
    listPublicReports({ communitySlug: issue.communitySlug }),
  ]);
  const reports = communityReports.filter((report) => report.issue_slug === issue.slug);
  const isWorkCampaign = issue.slug === "trabalho-burnout-volta-redonda";

  return (
    <ComunShell>
      <Section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <StatusLabel value={issue.status} />
            <h1 className="comun-prose mt-4 text-2xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">{issue.title}</h1>
            <p className="comun-prose mt-4 max-w-3xl text-base text-comun-paper/80 sm:text-lg">{issue.summary}</p>
            {isWorkCampaign ? (
              <div className="mt-5 grid gap-4">
                <div className="border-2 border-comun-yellow bg-comun-black p-5">
                  <p className="comun-prose text-lg font-black uppercase text-comun-yellow min-[390px]:text-2xl sm:text-3xl">
                    O problema que voce vive no trabalho pode nao ser so seu. Relate com seguranca no COMUN VR ABANDONADA.
                  </p>
                  <p className="comun-prose mt-3 max-w-3xl text-sm text-comun-paper/82 sm:text-base">
                    Voce pode relatar sem se identificar publicamente. Se autorizar publicacao, a equipe pode remover
                    dados pessoais antes de qualquer divulgacao.
                  </p>
                </div>
                <div className="border-2 border-comun-black bg-white p-4 text-sm text-comun-asphalt/80">
                  Esta pauta organiza memoria coletiva e acompanhamento publico. Nao substitui denuncia juridica formal
                  e nao promete solucao individual.
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-sm text-comun-paper/60">
              Comunidade relacionada:{" "}
              {community ? (
                <Link href={`/comun/c/${community.slug}`} className="font-bold text-comun-yellow">
                  {community.name}
                </Link>
              ) : (
                "-"
              )}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href={`/comun/relatar?comunidade=${issue.communitySlug}&pauta=${issue.slug}`}>
                {isWorkCampaign ? "Relatar situacao de trabalho" : "Enviar relato parecido"}
              </PrimaryLink>
              <Link
                href="/comun/seguranca"
                className="inline-flex min-h-12 items-center justify-center border-2 border-comun-yellow px-5 py-3 text-center text-sm font-black uppercase text-comun-yellow"
              >
                Acompanhar pauta
              </Link>
            </div>
          </div>
          <aside className="paper-panel border-2 border-comun-black p-4">
            <h2 className="text-lg font-black uppercase">O que acontece depois?</h2>
            <ul className="mt-3 grid gap-2 text-sm text-comun-asphalt/80">
              <li className="border-l-4 border-comun-yellow pl-3">O relato entra em revisao interna.</li>
              <li className="border-l-4 border-comun-yellow pl-3">A equipe cruza sinais parecidos e organiza padroes.</li>
              <li className="border-l-4 border-comun-yellow pl-3">So a versao sanitizada pode aparecer publicamente.</li>
            </ul>
          </aside>
        </div>
      </Section>
      {isWorkCampaign ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">Situacoes que queremos mapear</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {workCampaignCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/comun/relatar?comunidade=trabalho&pauta=${issue.slug}&categoria=${category.slug}`}
                className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase text-comun-black"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
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
          <EmptyState text="Ainda nao ha relatos publicados nesta pauta." />
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
          {items.map((item) => <li key={item} className="comun-prose border-l-4 border-comun-yellow pl-3">{item}</li>)}
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

const workCampaignCategories = [
  { slug: "pressao-psicologica", label: "Pressao psicologica" },
  { slug: "assedio-moral", label: "Assedio moral" },
  { slug: "burnout", label: "Burnout" },
  { slug: "atraso-salarial", label: "Atraso salarial" },
  { slug: "fgts-atrasado", label: "FGTS atrasado" },
  { slug: "terceirizacao", label: "Terceirizacao" },
  { slug: "jornada-abusiva", label: "Jornada abusiva" },
  { slug: "ferias-impostas", label: "Ferias impostas" },
  { slug: "risco-de-acidente", label: "Risco de acidente" },
  { slug: "insalubridade-periculosidade", label: "Insalubridade/periculosidade" },
  { slug: "medo-de-denunciar", label: "Medo de denunciar" },
  { slug: "retaliacao", label: "Retaliacao" },
];
