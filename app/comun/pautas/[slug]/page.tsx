import Link from "next/link";
import { notFound } from "next/navigation";
import { submitPautaContribution } from "@/app/actions";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { getCommunity, getIssue } from "@/lib/comun-data";
import { getPublicPautaSpaceBySlug, listApprovedPautaContributions, listPublicPautaEvidence, listPublicPautaTasks, listSafePautaOfficialProtocols, listSafePautaReports } from "@/lib/pauta-spaces";
import { listPublicDossierFeatures, listPublishedPautaDossiersByPauta, type PublishedPautaDossierSnapshot } from "@/lib/pauta-dossiers";
import { listPublicReports } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const contributionTypes = [
  ["relato", "Relato"],
  ["evidencia", "Evidencia"],
  ["proposta", "Proposta"],
  ["duvida", "Duvida"],
  ["contraponto", "Contraponto"],
  ["encaminhamento", "Encaminhamento"],
  ["tarefa_oferecida", "Tarefa oferecida"],
] as const;

export default async function PautaPage(
  props: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const space = await getPublicPautaSpaceBySlug(params.slug);
  if (!space) return <LegacyIssuePage slug={params.slug} />;

  const [reports, protocols, contributions, tasks, evidence, community, publishedDossiers] = await Promise.all([
    listSafePautaReports(space),
    listSafePautaOfficialProtocols(space),
    listApprovedPautaContributions(space.id),
    listPublicPautaTasks(space.id),
    listPublicPautaEvidence(space.id),
    space.community ? getCommunity(space.community) : null,
    listPublishedPautaDossiersByPauta(space.id),
  ]);
  const grouped = groupContributions(contributions);
  const featuredDossiers = (await listPublicDossierFeatures()).filter((feature) => feature.snapshot.pauta?.id === space.id);

  return (
    <ComunShell>
      <Section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase text-comun-yellow">{statusLabel(space.status)} / {community?.name ?? space.community ?? "comunidade aberta"}</p>
            <h1 className="comun-prose mt-3 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">{space.title}</h1>
            <p className="comun-prose mt-4 max-w-3xl text-comun-paper/78">{space.summary ?? "Pauta em organizacao coletiva."}</p>
            {space.next_step ? <p className="mt-4 border-2 border-comun-yellow bg-comun-black p-4 text-sm font-bold text-comun-paper">Proximo passo: {space.next_step}</p> : null}
          </div>
          <aside className="paper-panel border-2 border-comun-black p-4">
            <h2 className="font-black uppercase">Numeros principais</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Relatos" value={space.stats.reportCount} />
              <Metric label="Protocolos" value={space.stats.officialProtocolCount} />
              <Metric label="Vencidos" value={space.stats.overdueProtocolCount} />
              <Metric label="Tarefas abertas" value={space.stats.openTaskCount} />
            </dl>
          </aside>
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Dossies publicados desta pauta</h2>
        {featuredDossiers.length ? (
          <div className="mb-5 mt-4 border-2 border-comun-yellow bg-comun-black p-4">
            <h3 className="text-xl font-black uppercase text-comun-yellow">Dossies em destaque</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {featuredDossiers.slice(0, 2).map((feature) => (
                <Link key={feature.id} href={`/comun/dossies/${feature.snapshot.public_slug}`} className="border border-comun-yellow p-3 text-comun-paper">
                  <p className="text-xs font-black uppercase text-comun-yellow">{feature.public_label || "Destaque publico"}</p>
                  <h4 className="comun-prose mt-1 font-black uppercase">{feature.snapshot.public_title}</h4>
                  <p className="comun-prose mt-2 text-sm text-comun-paper/75">{feature.public_note || feature.snapshot.public_summary}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {publishedDossiers.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {publishedDossiers.map((dossier) => <PublicDossierCard key={dossier.id} dossier={dossier} />)}
          </div>
        ) : (
          <EmptyState text="Ainda nao ha dossies publicados nesta pauta." />
        )}
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">O que sabemos</h2>
        <p className="comun-prose mt-3 max-w-4xl text-comun-paper/78">{space.public_synthesis ?? "A sintese publica ainda esta em construcao pela curadoria."}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {reports.slice(0, 4).map((report: any) => (
            <article key={report.id} className="paper-panel border-2 border-comun-black p-4">
              <p className="text-xs font-black uppercase">{report.protocol}</p>
              <h3 className="comun-prose mt-2 font-black uppercase">{report.title ?? "Relato sanitizado"}</h3>
              <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{report.public_text}</p>
            </article>
          ))}
          {!reports.length ? <EmptyState text="Ainda nao ha relatos sanitizados publicados neste recorte." /> : null}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Discussao estruturada</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {contributionTypes.slice(0, 6).map(([type, label]) => (
            <div key={type} className="paper-panel border-2 border-comun-black p-4">
              <h3 className="font-black uppercase">{label}</h3>
              <div className="mt-3 grid gap-2">
                {(grouped[type] ?? []).map((item) => (
                  <article key={item.id} className="border-l-4 border-comun-yellow bg-white p-3 text-sm">
                    <p className="comun-prose text-comun-asphalt/80">{item.body}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-comun-asphalt/55">{item.author_alias || "Contribuicao anonima"}</p>
                  </article>
                ))}
                {!(grouped[type] ?? []).length ? <p className="text-sm text-comun-asphalt/65">Sem contribuicoes aprovadas ainda.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Evidencias publicas</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {evidence.map((item) => (
            <article key={item.id} className="paper-panel border-2 border-comun-black p-4">
              <p className="text-xs font-black uppercase text-comun-asphalt/60">{item.evidence_type}</p>
              <h3 className="mt-1 font-black uppercase">{item.title}</h3>
              {item.summary ? <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{item.summary}</p> : null}
              {item.public_note ? <p className="comun-prose mt-2 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">{item.public_note}</p> : null}
            </article>
          ))}
          {!evidence.length ? <EmptyState text="Ainda nao ha evidencias publicas aprovadas para esta pauta." /> : null}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Contribuir</h2>
        {searchParams.contribuicao === "pendente" || searchParams.contribuicao === "recebida" ? <p className="mt-3 border-2 border-comun-yellow bg-comun-black p-3 text-sm font-bold text-comun-paper">Contribuicao recebida. Ela entra em moderacao antes de aparecer publicamente.</p> : null}
        <form action={submitPautaContribution} className="paper-panel mt-4 grid gap-3 border-2 border-comun-black p-4">
          <input type="hidden" name="pauta_id" value={space.id} />
          <input type="hidden" name="slug" value={space.slug} />
          <label className="hidden">Site da empresa<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
          <label className="grid gap-1 text-sm font-black uppercase">Nome/apelido opcional<input name="author_alias" className="min-h-11 border-2 border-comun-black px-3" /></label>
          <label className="grid gap-1 text-sm font-black uppercase">Tipo<select name="contribution_type" className="min-h-11 border-2 border-comun-black px-3">{contributionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-black uppercase">Texto<textarea name="body" rows={5} required className="border-2 border-comun-black p-3" /></label>
          <label className="grid gap-1 text-sm font-black uppercase">Contato privado opcional<input name="contact_private" className="min-h-11 border-2 border-comun-black px-3" /></label>
          <label className="grid gap-1 text-sm font-black uppercase">Confirmacao humana: quanto e 2 + 3?<input name="human_check" required inputMode="numeric" className="min-h-11 border-2 border-comun-black px-3" /></label>
          <p className="text-xs font-bold text-comun-asphalt/70">A contribuicao passa por moderacao. Nao envie CPF, telefone, endereco completo ou dados sensiveis de terceiros.</p>
          <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase">Enviar para moderacao</button>
        </form>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Tarefas</h2>
        <div className="mt-4 grid gap-3">
          {tasks.map((task) => (
            <article key={task.id} className="paper-panel border-2 border-comun-black p-4">
              <p className="text-xs font-black uppercase text-comun-asphalt/60">{task.status}{task.help_needed ? " / precisa de ajuda" : ""}</p>
              <h3 className="mt-1 font-black uppercase">{task.title}</h3>
              {task.description ? <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{task.description}</p> : null}
            </article>
          ))}
          {!tasks.length ? <EmptyState text="Ainda nao ha tarefas publicas nesta pauta." /> : null}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Protocolos e cobranca</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricCard label="Protocolos" value={space.stats.officialProtocolCount} />
          <MetricCard label="Vencidos" value={space.stats.overdueProtocolCount} />
          <MetricCard label="Aguardando" value={space.stats.waitingResponseCount} />
          <MetricCard label="Nao resolvidos" value={space.stats.unresolvedCount} />
        </div>
        {protocols.length ? <PrimaryLink href="/comun/protocolo-popular">Usar Protocolo Popular</PrimaryLink> : null}
      </Section>
    </ComunShell>
  );
}

async function LegacyIssuePage({ slug }: { slug: string }) {
  const issue = await getIssue(slug);
  if (!issue) notFound();
  const [community, communityReports] = await Promise.all([getCommunity(issue.communitySlug), listPublicReports({ communitySlug: issue.communitySlug })]);
  const reports = communityReports.filter((report) => report.issue_slug === issue.slug);
  const isWorkCampaign = issue.slug === "trabalho-burnout-volta-redonda";
  return (
    <ComunShell>
      <Section>
        <h1 className="comun-prose text-3xl font-black uppercase text-comun-yellow">{issue.title}</h1>
        <p className="comun-prose mt-4 max-w-3xl text-comun-paper/80">{issue.summary}</p>
        <p className="mt-3 text-sm text-comun-paper/60">Comunidade relacionada: {community?.name ?? "-"}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <PrimaryLink href={`/comun/relatar?comunidade=${issue.communitySlug}&pauta=${issue.slug}`}>{isWorkCampaign ? "Relatar situacao de trabalho" : "Enviar relato parecido"}</PrimaryLink>
          <Link href="/comun/pautas" className="inline-flex min-h-12 items-center justify-center border-2 border-comun-yellow px-5 py-3 text-sm font-black uppercase text-comun-yellow">Acompanhar pauta</Link>
        </div>
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Relatos associados</h2>
        <div className="mt-4 grid gap-4">
          {reports.map((report) => (
            <article key={report.id} className="paper-panel border-2 border-comun-black p-4">
              <p className="text-xs font-black uppercase">{report.protocol}</p>
              <h3 className="comun-prose mt-2 font-black uppercase">{report.title ?? "Relato sanitizado"}</h3>
              <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{report.public_text}</p>
            </article>
          ))}
          {!reports.length ? <EmptyState text="Ainda nao ha relatos publicados nesta pauta." /> : null}
        </div>
      </Section>
    </ComunShell>
  );
}

function groupContributions(items: Awaited<ReturnType<typeof listApprovedPautaContributions>>) {
  return items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.contribution_type] = [...(acc[item.contribution_type] ?? []), item];
    return acc;
  }, {});
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><dt className="text-xs font-black uppercase text-comun-asphalt/60">{label}</dt><dd className="text-2xl font-black">{value}</dd></div>;
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <div className="paper-panel border-2 border-comun-black p-4"><p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function PublicDossierCard({ dossier }: { dossier: PublishedPautaDossierSnapshot }) {
  return (
    <Link href={`/comun/dossies/${dossier.public_slug}`} className="paper-panel border-2 border-comun-black p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{dossier.public_version_label || "Versao revisada"} / {new Date(dossier.public_updated_at ?? dossier.published_at).toLocaleDateString("pt-BR")}</p>
      <h3 className="comun-prose mt-2 font-black uppercase">{dossier.public_title}</h3>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{dossier.public_summary}</p>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">{text}</p>;
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
