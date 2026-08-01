import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";
import { RememberJourney } from "@/components/community-journey-memory";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { StatusLabel } from "@/components/status-label";
import { getCommunity, listIssues } from "@/lib/comun-data";
import { getCommunityExperience } from "@/lib/community-experience";
import { listPublishedPautaDossiersByCommunity } from "@/lib/pauta-dossiers";
import { listPublicReports } from "@/lib/reports";
import { listCommunityWorkGroups } from "@/lib/community-work-groups";
import { MiniAppContextCard } from "@/components/miniapp-context-card";
import { ComunContextTrail } from "@/components/comun-context-trail";
import { ComunActionCard, ComunPautaCard } from "@/components/comun-cards";
import { ComunStatePanel } from "@/components/comun-state-panel";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { withComunJourneyContext } from "@/lib/comun-journey-context";
import { communityLoginHref } from "@/lib/community-return";
import { ComunRelationRail } from "@/components/comun-relational";
import {
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";

export const dynamic = "force-dynamic";
export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const { slug } = await params,
    community = await getCommunity(slug),
    experience = getCommunityExperience(slug);
  if (!community || !experience) notFound();
  const [issues, reports, dossiers, persistentGroups] = await Promise.all([
      listIssues({ communitySlug: slug }),
      listPublicReports({ communitySlug: slug }),
      listPublishedPautaDossiersByCommunity(slug),
      listCommunityWorkGroups(slug),
    ]),
    principal = issues[0],
    groups = persistentGroups.length
      ? persistentGroups.map((group: any) => ({
          name: group.name,
          state: group.state,
          cycle: group.cycle_label,
          objective: group.objective,
          result: group.result_expected,
          nextAction: group.next_action,
        }))
      : experience.workingGroups;
  const appV2 = isComunAppV2((await searchParams).experiencia);
  if (appV2)
    return (
      <CommunityAppV2
        slug={slug}
        community={community}
        experience={experience}
        issues={issues}
        principal={principal}
        groups={groups}
      />
    );
  return (
    <ComunShell>
      <RememberJourney
        href={`/comun/c/${slug}`}
        label={`Voltar à comunidade ${community.name}`}
        context="Comunidade visitada"
      />
      <Section>
        <ComunContextTrail
          items={[
            {
              kind: "território",
              label: experience.territory,
              href: experience.territory
                .toLocaleLowerCase("pt-BR")
                .includes("volta redonda")
                ? "/comun/territorios/volta-redonda"
                : "/comun/territorios",
            },
            { kind: "comunidade", label: community.name },
          ]}
        />
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <p className="text-xs font-black uppercase text-comun-yellow">
              Comunidade{" "}
              {experience.kind === "territorial" ? "territorial" : "temática"} ·{" "}
              {experience.territory}
            </p>
            <h1 className="mt-2 text-[clamp(2.25rem,7vw,4.5rem)] font-black uppercase leading-[.95] tracking-[-.04em]">
              {community.name}
            </h1>
            <h2 className="mt-6 text-sm font-black uppercase text-comun-yellow">
              Por que existimos
            </h2>
            <p className="mt-2 max-w-3xl text-lg text-comun-paper/80">
              {experience.purpose}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryLink
                href={
                  principal
                    ? `/comun/pautas/${principal.slug}`
                    : `/comun/relatar?comunidade=${slug}`
                }
              >
                {principal ? "Abrir pauta prioritária" : community.mainCta}
              </PrimaryLink>
              <Link
                href={`/comun/entrar?returnTo=${encodeURIComponent(`/comun/c/${slug}/participar`)}`}
                className="inline-flex min-h-12 items-center border-2 border-comun-yellow px-4 font-black uppercase text-comun-yellow"
              >
                Acompanhar ou colaborar
              </Link>
            </div>
          </div>
          <aside className="border-2 border-comun-yellow bg-comun-yellow p-5 text-comun-black">
            <p className="text-xs font-black uppercase">Próxima ação</p>
            <h2 className="mt-2 text-2xl font-black uppercase leading-tight">
              {experience.nextAction}
            </h2>
            <p className="mt-3 text-sm">
              Você pode apenas acompanhar. Escolher uma colaboração é opcional e
              não concede papel operacional.
            </p>
          </aside>
        </div>
      </Section>
      <nav
        aria-label="Seções da comunidade"
        className="mx-auto flex max-w-7xl gap-6 overflow-x-auto border-y-2 border-comun-paper/25 px-4 text-sm font-black"
      >
        <a href="#visao-geral" className="border-b-4 border-comun-yellow py-4">
          Visão geral
        </a>
        <a href="#pautas" className="py-4">
          Pautas
        </a>
        <a href="#agenda" className="py-4">
          Agenda
        </a>
        <a href="#resultados" className="py-4">
          Resultados
        </a>
        <a href="#memoria" className="py-4">
          Memória
        </a>
      </nav>
      {slug === "cidade" ||
      issues.some((issue: any) => issue.slug === "calcadas-em-circulacao") ? (
        <Section>
          <Header
            title="Ferramentas que estamos usando"
            intro="A ferramenta pertence à pauta e mantém o caminho de volta à comunidade."
          >
            <MiniAppContextCard compact />
          </Header>
        </Section>
      ) : null}
      {principal ? (
        <Section>
          <span id="pautas" className="scroll-mt-28" />
          <Header
            title="Pauta prioritária"
            intro="A pauta mantém seu próprio objetivo, etapa e histórico."
          >
            <Link
              href={`/comun/pautas/${principal.slug}`}
              className="grid gap-3 bg-comun-paper p-5 text-comun-black md:grid-cols-[auto_1fr_auto] md:items-center"
            >
              <StatusLabel value={principal.status} />
              <div>
                <h3 className="font-black uppercase">{principal.title}</h3>
                <p className="mt-1 text-sm">{principal.summary}</p>
                <p className="mt-2 font-bold">
                  Próxima etapa: {principal.nextSteps}
                </p>
              </div>
              <ArrowRight aria-hidden="true" />
            </Link>
          </Header>
        </Section>
      ) : null}
      {experience.nextActivity || experience.circle ? (
        <Section>
          <span id="agenda" className="scroll-mt-28" />
          <Header
            title="Roda e atividade"
            intro="Discussão com pergunta, etapa e consequência — não comentários infinitos."
          >
            {experience.nextActivity ? (
              <article className="mb-4 border-l-8 border-comun-yellow bg-comun-paper p-5 text-comun-black">
                <p className="text-xs font-black uppercase">
                  Atividade próxima · {experience.nextActivity.dateLabel}
                </p>
                <h3 className="mt-2 text-xl font-black uppercase">
                  {experience.nextActivity.title}
                </h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={
                      principal
                        ? `/comun/pautas/${principal.slug}#construction_circle`
                        : `/comun/c/${slug}`
                    }
                    className="inline-flex min-h-11 items-center bg-comun-black px-4 font-black uppercase text-white"
                  >
                    Abrir contexto
                  </Link>
                  <a
                    download
                    href={`/comun/c/${slug}/agenda`}
                    className="inline-flex min-h-11 items-center gap-2 border-2 border-comun-black px-4 font-black uppercase"
                  >
                    <CalendarDays size={18} /> Adicionar ao calendário
                  </a>
                </div>
              </article>
            ) : null}
            {experience.circle ? (
              <dl className="grid gap-3 border-2 border-comun-paper/30 p-5 md:grid-cols-2">
                <Info label="Pergunta" value={experience.circle.question} />
                <Info
                  label="Etapa e prazo"
                  value={`${experience.circle.stage} · ${experience.circle.deadline}`}
                />
                <Info label="Síntese" value={experience.circle.synthesis} />
                <Info
                  label="Divergências"
                  value={experience.circle.divergences}
                />
                <Info
                  label="Decisão e encaminhamento"
                  value={experience.circle.decision}
                />
              </dl>
            ) : null}
          </Header>
        </Section>
      ) : null}
      <Section>
        <Header
          title="Como participar"
          intro="Comece pelo que consegue fazer; interesses e atualizações são opcionais."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {experience.collaboration.map((x) => (
              <article
                key={x}
                className="border-t-4 border-comun-yellow bg-comun-paper p-4 text-comun-black"
              >
                <h3 className="font-black uppercase">{x}</h3>
                <p className="mt-2 text-sm">
                  Responsabilidade concreta, sem pontuação ou prestígio.
                </p>
              </article>
            ))}
          </div>
        </Header>
      </Section>
      <Section>
        <Header
          title="Processos ativos"
          intro="Pautas com ciclo próprio, sem duplicar seu conteúdo integral."
        >
          <div className="divide-y-2 divide-comun-black border-2 border-comun-black bg-comun-paper text-comun-black">
            {issues.map((issue) => (
              <Link
                key={issue.slug}
                href={`/comun/pautas/${issue.slug}`}
                className="grid gap-2 p-4 hover:bg-comun-yellow sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <StatusLabel value={issue.status} />
                <span>
                  <strong className="block uppercase">{issue.title}</strong>
                  <small>{issue.nextSteps}</small>
                </span>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        </Header>
      </Section>
      {groups.length ? (
        <Section>
          <span id="resultados" className="scroll-mt-28" />
          <Header
            title="Grupos de trabalho"
            intro="Cada grupo existe por um objetivo e encerra com resultado e memória."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <article
                  key={group.name}
                  className="border-2 border-comun-yellow p-5"
                >
                  <p className="text-xs font-black uppercase text-comun-yellow">
                    {group.state} · {group.cycle}
                  </p>
                  <h3 className="mt-2 text-xl font-black">{group.name}</h3>
                  <p className="mt-3">{group.objective}</p>
                  <p className="mt-3 text-sm">
                    <strong>Resultado esperado:</strong> {group.result}
                  </p>
                </article>
              ))}
            </div>
          </Header>
        </Section>
      ) : null}
      <Section>
        <span id="memoria" className="scroll-mt-28" />
        <Header
          title="Resultados, cultura e memória"
          intro="Atividade não é resultado. Conteúdos culturais apontam para suas fontes originais."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Tool href="/comun/acervo/arte" title="Arte" />
            <Tool href="/comun/radio" title="Rádio" />
            <Tool href="/comun/acervo" title="Acervo e memória" />
          </div>
          {dossiers.length ? (
            <div className="mt-5 grid gap-3">
              {dossiers.map((x) => (
                <Link
                  key={x.id}
                  href={`/comun/dossies/${x.public_slug}`}
                  className="bg-comun-paper p-5 text-comun-black"
                >
                  <p className="text-xs font-black uppercase">
                    Resultado revisado · {x.public_version_label}
                  </p>
                  <h3 className="mt-2 font-black uppercase">
                    {x.public_title}
                  </h3>
                  <p className="mt-2 text-sm">{x.public_summary}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 border-2 border-comun-paper/30 p-4">
              Ainda não há resultado comprovado publicado. Atividades realizadas
              não serão apresentadas como resultado.
            </p>
          )}
          {reports.length ? (
            <p className="mt-4 text-sm">
              {reports.length} registros públicos sanitizados relacionados à
              memória desta comunidade.
            </p>
          ) : null}
        </Header>
      </Section>
      <Section>
        <Header
          title="Memória e governança"
          intro="Como decidimos, assumimos responsabilidade e corrigimos o registro público."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="bg-comun-paper p-5 text-comun-black">
              <h3 className="font-black uppercase">Como decidimos</h3>
              <p className="mt-3">{experience.governance.decision}</p>
              <ul className="mt-4 list-disc pl-5">
                {experience.governance.principles.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>
            <article className="border-2 border-comun-yellow p-5">
              <h3 className="font-black uppercase text-comun-yellow">
                Papéis são responsabilidades
              </h3>
              <ul className="mt-3 grid gap-2">
                {experience.governance.roles.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <Link
                href={experience.governance.correctionHref}
                className="mt-5 inline-block font-black uppercase text-comun-yellow underline"
              >
                Contestar decisão, corrigir ou retirar
              </Link>
            </article>
          </div>
        </Header>
      </Section>
    </ComunShell>
  );
}

function CommunityAppV2({
  slug,
  community,
  experience,
  issues,
  principal,
  groups,
}: {
  slug: string;
  community: any;
  experience: any;
  issues: any[];
  principal: any;
  groups: any[];
}) {
  const communityRoute = withComunAppV2(`/comun/c/${slug}`);
  const relations: EntityRelation[] = [
    ...issues.slice(0, 4).map((issue) => ({
      ...entityReference("pauta", issue.slug, issue.title, issue.status),
      source: "foreign_key" as const,
    })),
    {
      kind: "result" as const,
      slug: "resultados",
      title: "Resultados",
      href: "/comun/resultados",
      source: "canonical_route" as const,
      scope: "resultados públicos; filtro comunitário ainda não canônico",
    },
    {
      kind: "memory" as const,
      slug: "acervo",
      title: "Memória coletiva",
      href: "/comun/acervo",
      source: "canonical_route" as const,
      scope: "acervo público; filtro comunitário ainda não canônico",
    },
  ];
  const membershipRoute = withComunAppV2(
    withComunJourneyContext(`/comun/c/${slug}/participar`, {
      intent: "join_community",
      sourceRoute: communityRoute,
      returnTo: communityRoute,
      communitySlug: slug,
      currentStage: "participate",
      trackingRoute: "/comun/minha-participacao?secao=comunidades",
    }),
  );
  return (
    <ComunShell
      appBar={{
        title: community.name,
        contextLabel: `${experience.territory} · comunidade`,
      }}
    >
      <div className="comun-v2-page" data-comun-app-v2-page="community-home">
        <header className="surface-community rounded-[var(--comun-radius-community)] border border-comun-black/20 p-5">
          <div className="flex items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-comun-black bg-[#7d8254] text-2xl font-black">
              {String(community.name)
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div>
              <p className="comun-v2-eyebrow">
                {experience.kind === "territorial" ? "Territorial" : "Temática"}{" "}
                · {experience.territory}
              </p>
              <h1 className="comun-v2-title mt-2 normal-case">
                {community.name}
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-comun-black/70">
            {experience.purpose}
          </p>
          <p className="mt-4 inline-flex rounded-[var(--comun-radius-pill)] border border-comun-black/25 px-3 py-2 text-xs font-black">
            Vínculo atual: visita pública
          </p>
        </header>

        <ComunRelationRail relations={relations} />

        <section className="mt-7" aria-labelledby="community-next">
          <h2 id="community-next" className="comun-v2-section-title mb-3">
            Próxima ação
          </h2>
          <ComunActionCard
            href={communityLoginHref(membershipRoute)}
            title={experience.nextAction ?? "Acompanhar esta comunidade"}
            description="A conta protege seu vínculo e devolve você a esta comunidade depois do acesso."
            action="Acompanhar ou solicitar entrada"
          />
        </section>

        {experience.nextActivity ? (
          <section className="surface-action mt-6 rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4">
            <p className="comun-v2-eyebrow">
              Próxima atividade · {experience.nextActivity.dateLabel}
            </p>
            <h2 className="mt-2 text-xl font-black normal-case">
              {experience.nextActivity.title}
            </h2>
            <Link
              className="mt-3 inline-flex min-h-11 items-center font-black underline"
              href={
                principal
                  ? withComunAppV2(`/comun/pautas/${principal.slug}`)
                  : communityRoute
              }
            >
              Abrir contexto
            </Link>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="community-processes">
          <h2 id="community-processes" className="comun-v2-section-title mb-3">
            Pautas e ações ativas
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {issues.slice(0, 4).map((issue) => (
              <ComunPautaCard
                key={issue.slug}
                href={withComunAppV2(`/comun/pautas/${issue.slug}`)}
                title={issue.title}
                summary={issue.summary}
                status={issue.status}
                nextAction={issue.nextSteps}
              />
            ))}
            {!issues.length ? (
              <ComunStatePanel
                state="empty"
                actionHref={withComunAppV2(`/comun/relatar?comunidade=${slug}`)}
                actionLabel="Enviar relato"
              >
                Nenhuma pauta pública está ativa nesta comunidade.
              </ComunStatePanel>
            ) : null}
          </div>
        </section>

        <details className="mt-8 border-t-2 border-comun-black pt-4">
          <summary className="min-h-11 cursor-pointer py-2 text-xl font-black">
            Organização e grupos de trabalho
          </summary>
          <div className="mt-3 grid gap-3">
            {groups.map((group) => (
              <article
                key={group.name}
                className="surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4"
              >
                <p className="comun-v2-status">
                  {group.state} · {group.cycle}
                </p>
                <h2 className="mt-2 font-black normal-case">{group.name}</h2>
                <p className="mt-2 text-sm text-comun-black/65">
                  {group.objective}
                </p>
              </article>
            ))}
          </div>
        </details>

        <section className="surface-memory mt-8 rounded-[var(--comun-radius-cultural)] border border-comun-black/20 p-5">
          <p className="comun-v2-eyebrow">Memória recente relacionada</p>
          <h2 className="mt-2 text-xl font-black normal-case">
            Resultados, cultura e memória
          </h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href={withComunAppV2("/comun/resultados")}
              className="inline-flex min-h-11 items-center font-black underline"
            >
              Ver resultados
            </Link>
            <Link
              href={withComunAppV2("/comun/acervo")}
              className="inline-flex min-h-11 items-center font-black underline"
            >
              Abrir memória
            </Link>
          </div>
        </section>
      </div>
    </ComunShell>
  );
}
function Header({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <header className="mb-5 border-b-2 border-comun-yellow pb-4">
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-comun-paper/70">{intro}</p>
      </header>
      {children}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase text-comun-yellow">
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
function Tool({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-28 items-end justify-between border-2 border-comun-paper/30 p-4 font-black uppercase hover:border-comun-yellow"
    >
      {title}
      <ArrowRight size={18} />
    </Link>
  );
}
