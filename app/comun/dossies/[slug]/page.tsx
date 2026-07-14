import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { StatusLabel } from "@/components/status-label";
import { getCommunity, getDossier, getIssue } from "@/lib/comun-data";
import { getPublishedPautaDossierBySlug, listRelatedPublishedPautaDossiers, type PublishedPautaDossierSnapshot } from "@/lib/pauta-dossiers";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const pautaDossier = await getPublishedPautaDossierBySlug(params.slug);
  if (!pautaDossier) {
    return {
      title: "Dossie nao encontrado | COMUN",
      robots: { index: false, follow: false },
    };
  }
  const title = `${pautaDossier.public_title} | COMUN`;
  const description = pautaDossier.public_summary;
  const canonical = `${getSiteUrl()}/comun/dossies/${pautaDossier.public_slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "COMUN VR Abandonada",
      type: "article",
      publishedTime: pautaDossier.published_at,
      modifiedTime: pautaDossier.public_updated_at ?? pautaDossier.published_at,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function DossierPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const pautaDossier = await getPublishedPautaDossierBySlug(params.slug);
  if (pautaDossier) {
    const related = await listRelatedPublishedPautaDossiers(pautaDossier, 4);
    const community = pautaDossier.pauta?.community ? await getCommunity(pautaDossier.pauta.community) : null;
    return <PublishedPautaDossier dossier={pautaDossier} related={related} communityName={community?.name ?? pautaDossier.pauta?.community ?? null} />;
  }

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

function PublishedPautaDossier({ dossier, related, communityName }: { dossier: NonNullable<Awaited<ReturnType<typeof getPublishedPautaDossierBySlug>>>; related: PublishedPautaDossierSnapshot[]; communityName: string | null }) {
  const sections = parsePublicDossierSections(dossier.public_body);
  const updatedAt = dossier.public_updated_at ?? dossier.published_at;
  return (
    <ComunShell>
      <Section>
        <nav className="mb-5 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-paper/65">
          <Link href="/comun" className="text-comun-yellow">COMUN</Link>
          <span>/</span>
          <Link href="/comun/dossies" className="text-comun-yellow">Dossies</Link>
          {dossier.pauta ? (
            <>
              <span>/</span>
              <Link href={`/comun/pautas/${dossier.pauta.slug}`} className="text-comun-yellow">{dossier.pauta.title}</Link>
            </>
          ) : null}
          <span>/</span>
          <span>{dossier.public_title}</span>
        </nav>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <StatusLabel value="published" />
            <h1 className="comun-prose text-2xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">{dossier.public_title}</h1>
            <p className="comun-prose mt-4 max-w-3xl text-base text-comun-paper/80 sm:text-lg">{dossier.public_summary}</p>
            <p className="mt-4 border-2 border-comun-yellow bg-comun-black p-3 text-sm font-bold text-comun-paper/78">Este dossie e uma sintese comunitaria baseada em evidencias publicas revisadas.</p>
            <div className="mt-4 grid gap-2 text-sm text-comun-paper/70">
              {dossier.pauta ? (
                <p>
                  Pauta relacionada:{" "}
                  <Link href={`/comun/pautas/${dossier.pauta.slug}`} className="font-bold text-comun-yellow">
                    {dossier.pauta.title}
                  </Link>
                </p>
              ) : null}
              {dossier.published_at ? <p>Publicado em {new Date(dossier.published_at).toLocaleDateString("pt-BR")}</p> : null}
              {updatedAt ? <p>Ultima atualizacao publica em {new Date(updatedAt).toLocaleDateString("pt-BR")}</p> : null}
            </div>
          </div>
          <aside className="paper-panel border-2 border-comun-black p-4">
            <h2 className="text-lg font-black uppercase">Changelog publico</h2>
            <div className="mt-3 grid gap-2 text-sm text-comun-asphalt/80">
              <p>Publicado em {new Date(dossier.published_at).toLocaleDateString("pt-BR")}</p>
              <p>Atualizado em {new Date(updatedAt).toLocaleDateString("pt-BR")}</p>
              <p>{dossier.public_version_label || "Versao revisada"}</p>
              {dossier.public_change_note ? <p className="border-l-4 border-comun-yellow pl-3">{dossier.public_change_note}</p> : null}
            </div>
          </aside>
        </div>
      </Section>
      <Section>
        <div className="grid gap-4 lg:grid-cols-3">
          <PublicBlock title="O que este dossie mostra" text={sections.shows || dossier.public_summary} />
          <PublicBlock title="Demandas publicas" text={sections.demands || "As demandas publicas estao descritas no corpo revisado do dossie."} />
          <PublicBlock title="Proximos passos" text={sections.nextSteps || "Os proximos passos serao atualizados conforme a pauta avance publicamente."} />
        </div>
      </Section>
      <Section>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="paper-panel border-2 border-comun-black p-4">
            <h2 className="font-black uppercase">Pauta relacionada</h2>
            {dossier.pauta ? (
              <>
                <Link href={`/comun/pautas/${dossier.pauta.slug}`} className="comun-prose mt-3 block font-black uppercase text-comun-rust">{dossier.pauta.title}</Link>
                {dossier.pauta.category ? <p className="mt-2 text-sm font-bold uppercase text-comun-asphalt/65">Categoria: {dossier.pauta.category}</p> : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-comun-asphalt/70">Este dossie ainda nao tem uma pauta publica relacionada.</p>
            )}
          </article>
          <article className="paper-panel border-2 border-comun-black p-4">
            <h2 className="font-black uppercase">Comunidade relacionada</h2>
            {dossier.pauta?.community ? (
              <>
                <Link href={`/comun/c/${dossier.pauta.community}`} className="comun-prose mt-3 block font-black uppercase text-comun-rust">{communityName}</Link>
                <Link href={`/comun/dossies?comunidade=${encodeURIComponent(dossier.pauta.community)}`} className="mt-3 inline-flex border-2 border-comun-black px-3 py-2 text-xs font-black uppercase">Ver dossies desta comunidade</Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-comun-asphalt/70">Este dossie e de uma pauta aberta, sem comunidade unica relacionada.</p>
            )}
          </article>
        </div>
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Dossies relacionados</h2>
        {related.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {related.map((item) => <RelatedDossierCard key={item.id} dossier={item} />)}
          </div>
        ) : (
          <EmptyState text="Ainda nao ha outros dossies publicados relacionados a esta pauta, comunidade ou categoria." />
        )}
      </Section>
      <Section>
        <article className="paper-panel border-2 border-comun-black p-5">
          <h2 className="font-black uppercase">Corpo publico</h2>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-comun-asphalt">{dossier.public_body}</pre>
        </article>
      </Section>
    </ComunShell>
  );
}

function RelatedDossierCard({ dossier }: { dossier: PublishedPautaDossierSnapshot }) {
  return (
    <Link href={`/comun/dossies/${dossier.public_slug}`} className="paper-panel border-2 border-comun-black p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{dossier.public_version_label || "Versao revisada"}</p>
      <h3 className="comun-prose mt-2 font-black uppercase">{dossier.public_title}</h3>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{dossier.public_summary}</p>
    </Link>
  );
}

function PublicBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="paper-panel border-2 border-comun-black p-4">
      <h2 className="font-black uppercase">{title}</h2>
      <p className="comun-prose mt-3 whitespace-pre-wrap text-sm text-comun-asphalt/80">{text}</p>
    </article>
  );
}

function parsePublicDossierSections(body: string) {
  return {
    shows: pickSection(body, ["o que este dossie mostra", "sintese executiva", "problema"]),
    demands: pickSection(body, ["demandas", "demandas publicas"]),
    nextSteps: pickSection(body, ["proximos passos", "proximo passo"]),
  };
}

function pickSection(body: string, headings: string[]) {
  const lines = body.split(/\r?\n/);
  let collecting = false;
  const collected: string[] = [];
  for (const line of lines) {
    const normalized = normalizeHeading(line);
    if (normalized && headings.includes(normalized)) {
      collecting = true;
      continue;
    }
    if (collecting && normalized) break;
    if (collecting) collected.push(line);
  }
  return collected.join("\n").trim();
}

function normalizeHeading(value: string) {
  const trimmed = value.replace(/^#+\s*/, "").trim();
  if (!trimmed) return "";
  if (!/^#{1,3}\s/.test(value.trim())) return "";
  return trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
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
