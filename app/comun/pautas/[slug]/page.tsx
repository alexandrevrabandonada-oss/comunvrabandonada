import Link from "next/link";
import { notFound } from "next/navigation";
import { submitPautaContribution } from "@/app/actions";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { getCommunity, getIssue } from "@/lib/comun-data";
import {
  getPublicPautaSpaceBySlug,
  listApprovedPautaContributions,
  listPublicPautaEvidence,
  listPublicPautaTasks,
  listSafePautaOfficialProtocols,
  listSafePautaReports,
} from "@/lib/pauta-spaces";
import {
  listPublicDossierFeatures,
  listPublishedPautaDossiersByPauta,
  type PublishedPautaDossierSnapshot,
} from "@/lib/pauta-dossiers";
import { listPublicReports } from "@/lib/reports";
import {
  getPublicCanonicalCommunity,
  getPublicPautaHub,
  getPublicTerritoryById,
} from "@/lib/central-hub";
import { PautaAppShell } from "@/components/pauta-app-shell";
import {
  listPublicCircleSurface,
  listPublicPautaModules,
} from "@/lib/pauta-miniapps";
import {
  listPublicSidewalkSurface,
  listPublicSidewalkMemories,
} from "@/lib/sidewalk-pauta";
import { SidewalkMemorySection } from "@/components/sidewalk-memory-section";
import { ComunContextTrail } from "@/components/comun-context-trail";
import { PautaPoliticalCycle } from "@/components/pauta-political-cycle";
import { getCollectiveActionsRelease } from "@/lib/collective-actions-release";
import { getPublicPautaActionCycle } from "@/lib/pauta-action-cycle-data";
import { ComunExperiencePilot } from "@/components/comun-experience-pilot";
import { isExperienceCoherencePilot } from "@/lib/experience-coherence";
import { PautaMemoryRelations } from "@/components/civic-intelligence/pauta-memory-relations";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { isComunPautasVivasCoreEnabled } from "@/lib/comun-pautas-vivas-feature";
import { PautaVivaDetail } from "@/components/comun-pautas-vivas";
import { isComunRodasVivasEnabled } from "@/lib/comun-rodas-vivas-feature";
import { listPublicRodasForPauta } from "@/lib/comun-rodas-vivas";
import { isComunCollectiveActionsCanonicalExperienceEnabled } from "@/lib/comun-collective-actions-canonical-feature";
import {
  listPublicCollectiveActionMemoryDetailsByPauta,
  listPublicCollectiveActionsByPauta,
} from "@/lib/comun-collective-actions-canonical";
import { isComunPautaCycleMemoryEnabled } from "@/lib/comun-pauta-cycle-memory-feature";
import { derivePublicPautaCycleMemoryV1 } from "@/lib/comun-pauta-cycle-memory";

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

export default async function PautaPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const experiencePilot = isExperienceCoherencePilot(searchParams.experiencia);
  const appV2 = isComunAppV2(searchParams.experiencia);
  const space = await getPublicPautaSpaceBySlug(params.slug);
  if (!space)
    return (
      <LegacyIssuePage slug={params.slug} experiencePilot={experiencePilot} />
    );

  if (isComunPautasVivasCoreEnabled()) {
    const canonicalActionsEnabled =
      isComunCollectiveActionsCanonicalExperienceEnabled() &&
      (await getCollectiveActionsRelease()).enabled;
    const cycleMemoryEnabled = isComunPautaCycleMemoryEnabled();
    const [evidence, tasks, contributions, dossiers, rodas, collectiveActions] =
      await Promise.all([
        listPublicPautaEvidence(space.id, 8),
        listPublicPautaTasks(space.id, 6),
        listApprovedPautaContributions(space.id, 6),
        listPublishedPautaDossiersByPauta(space.id),
        isComunRodasVivasEnabled()
          ? listPublicRodasForPauta(space.id)
          : Promise.resolve([]),
        canonicalActionsEnabled
          ? listPublicCollectiveActionsByPauta(space.id)
          : Promise.resolve([]),
      ]);
    const [collectiveActionDetails, publicActionCycle] = cycleMemoryEnabled
      ? await Promise.all([
          canonicalActionsEnabled
            ? listPublicCollectiveActionMemoryDetailsByPauta(space.id, 8)
            : Promise.resolve([]),
          canonicalActionsEnabled
            ? getPublicPautaActionCycle(space.id)
            : Promise.resolve(null),
        ])
      : [[], null];
    const cycleMemory = cycleMemoryEnabled
      ? derivePublicPautaCycleMemoryV1({
          pauta: space,
          evidence,
          rodas,
          actions: collectiveActionDetails,
          actionCycle: publicActionCycle,
          dossiers: dossiers.flatMap((dossier) =>
            dossier.public_slug &&
            dossier.public_title &&
            dossier.public_summary
              ? [
                  {
                    id: dossier.id,
                    public_slug: dossier.public_slug,
                    public_title: dossier.public_title,
                    public_summary: dossier.public_summary,
                    public_version_label: dossier.public_version_label,
                  },
                ]
              : [],
          ),
        })
      : null;
    return (
      <PautaVivaDetail
        space={space}
        evidence={evidence}
        tasks={tasks}
        contributions={contributions}
        dossiers={dossiers.slice(0, 4)}
        rodas={rodas}
        rodasEnabled={isComunRodasVivasEnabled()}
        collectiveActions={collectiveActions}
        collectiveActionsEnabled={canonicalActionsEnabled}
        cycleMemory={cycleMemory}
        cycleMemoryEnabled={cycleMemoryEnabled}
      />
    );
  }

  const isEditorialFallback = space.source === "editorial_fallback";
  const modules = isEditorialFallback
    ? []
    : await listPublicPautaModules(space.id);
  if (modules.length || isEditorialFallback) {
    const [circles, sidewalks, memories, community, territory, hub] =
      isEditorialFallback
        ? [
            [],
            {
              records: [],
              count: 0,
              coverage: {
                total: 0,
                verified: 0,
                highImpact: 0,
                resolved: 0,
                territories: 0,
              },
              warning: null,
            },
            [],
            null,
            null,
            {
              timeline: [],
              actions: [],
              results: [],
              projects: [],
              archive: [],
            },
          ]
        : await Promise.all([
            listPublicCircleSurface(space.id),
            listPublicSidewalkSurface(space.id),
            listPublicSidewalkMemories(space.id),
            space.community
              ? getPublicCanonicalCommunity(space.community)
              : Promise.resolve(null),
            space.territory_id
              ? getPublicTerritoryById(space.territory_id)
              : Promise.resolve(null),
            getPublicPautaHub(space.id),
          ]);
    const relations: EntityRelation[] = [
      ...(territory
        ? [
            {
              ...entityReference("territory", territory.slug, territory.name),
              source: "foreign_key" as const,
            },
          ]
        : []),
      ...(community && space.community
        ? [
            {
              ...entityReference("community", community.slug, community.name),
              source: "published_projection" as const,
              scope: "slug público confirmado; vínculo sem FK",
            },
          ]
        : []),
      ...(sidewalks
        ? [
            {
              ...entityReference("miniapp", "calcadas", "Calçadas"),
              source: "published_projection" as const,
            },
          ]
        : []),
      ...hub.actions.slice(0, 3).map((action: any) => ({
        ...entityReference("action", action.slug, action.title, action.status),
        source: "foreign_key" as const,
      })),
      ...hub.results.slice(0, 3).map((result: any) => ({
        ...entityReference(
          "result",
          result.slug,
          result.title,
          result.result_type,
        ),
        source: "foreign_key" as const,
        count: hub.results.length,
        scope: "resultados públicos nesta pauta",
      })),
      ...hub.archive.slice(0, 3).map((item: any) => ({
        ...entityReference("memory", item.archive.slug, item.archive.title),
        source: "junction" as const,
      })),
    ];
    const entityContext = createComunEntityContext({
      kind: "pauta",
      id: space.id,
      slug: space.slug,
      title: space.title,
      shortTitle: space.title,
      state: space.public_status ?? space.status,
      summary: space.summary ?? "Pauta em organização coletiva.",
      territory: territory
        ? entityReference("territory", territory.slug, territory.name)
        : undefined,
      community:
        community && space.community
          ? entityReference("community", community.slug, community.name)
          : undefined,
      primaryAction: {
        href: sidewalks ? "/comun/calcadas" : "/comun/participar",
        label: sidewalks ? "Abrir Calçadas" : "Abrir participação",
        description:
          space.next_step ??
          (sidewalks ? "Registrar uma calçada" : "Participar da construção"),
      },
      relations,
    });
    const contributionAck =
      searchParams.contribuicao === "pendente" ||
      searchParams.contribuicao === "recebida";
    return (
      <ComunShell
        appBar={
          appV2
            ? {
                title: space.title,
                contextLabel: `Pauta · ${entityContext.community?.title ?? entityContext.territory?.title ?? "processo coletivo"}`,
                backDestination: "/comun/pautas",
              }
            : undefined
        }
      >
        <ComunExperiencePilot
          active={experiencePilot}
          level={1}
          currentHref={`/comun/pautas/${space.slug}`}
        >
          {appV2 ? null : <PautaReturn />}
          {contributionAck ? (
            <section className="bg-comun-black py-3">
              <div className="mx-auto max-w-6xl px-4">
                <p className="border-2 border-comun-yellow bg-comun-black p-3 text-sm font-bold text-comun-paper">
                  Contribuicao recebida. Ela entra em moderacao antes de
                  aparecer publicamente.
                </p>
              </div>
            </section>
          ) : null}
          <PautaAppShell
            space={space}
            modules={modules}
            circles={circles}
            sidewalks={sidewalks}
            appV2={appV2}
            entityContext={entityContext}
          />
          <SidewalkMemorySection pautaSlug={space.slug} memories={memories} />
        </ComunExperiencePilot>
      </ComunShell>
    );
  }

  const [
    reports,
    protocols,
    contributions,
    tasks,
    evidence,
    community,
    publishedDossiers,
    territory,
  ] = await Promise.all([
    listSafePautaReports(space),
    listSafePautaOfficialProtocols(space),
    listApprovedPautaContributions(space.id),
    listPublicPautaTasks(space.id),
    listPublicPautaEvidence(space.id),
    space.community ? getPublicCanonicalCommunity(space.community) : null,
    listPublishedPautaDossiersByPauta(space.id),
    space.territory_id ? getPublicTerritoryById(space.territory_id) : null,
  ]);
  const grouped = groupContributions(contributions);
  const [allFeatures, hub] = await Promise.all([
    listPublicDossierFeatures(),
    getPublicPautaHub(space.id),
  ]);
  const politicalRelease = await getCollectiveActionsRelease();
  const politicalCycle = politicalRelease.enabled
    ? await getPublicPautaActionCycle(space.id)
    : null;
  const featuredDossiers = allFeatures.filter(
    (feature) => feature.snapshot.pauta?.id === space.id,
  );
  const details = space as any;

  if (appV2) {
    const relations: EntityRelation[] = [
      ...(territory
        ? [
            {
              ...entityReference("territory", territory.slug, territory.name),
              source: "foreign_key" as const,
            },
          ]
        : []),
      ...(community && space.community
        ? [
            {
              ...entityReference("community", community.slug, community.name),
              source: "published_projection" as const,
              scope: "slug público confirmado; vínculo sem FK",
            },
          ]
        : []),
      ...hub.actions.slice(0, 4).map((action: any) => ({
        ...entityReference("action", action.slug, action.title, action.status),
        source: "foreign_key" as const,
      })),
      ...protocols.slice(0, 3).map((protocol: any) => ({
        ...entityReference(
          "protocol",
          protocol.protocol,
          protocol.title ?? protocol.protocol,
        ),
        source: "foreign_key" as const,
      })),
      ...hub.results.slice(0, 4).map((result: any) => ({
        ...entityReference(
          "result",
          result.slug,
          result.title,
          result.result_type,
        ),
        source: "foreign_key" as const,
      })),
      ...hub.archive.slice(0, 4).map((item: any) => ({
        ...entityReference("memory", item.archive.slug, item.archive.title),
        source: "junction" as const,
      })),
    ];
    const entityContext = createComunEntityContext({
      kind: "pauta",
      id: space.id,
      slug: space.slug,
      title: space.title,
      state: details.public_status ?? statusLabel(space.status),
      summary: space.summary ?? "Pauta em organização coletiva.",
      territory: territory
        ? entityReference("territory", territory.slug, territory.name)
        : undefined,
      community: community
        ? entityReference("community", community.slug, community.name)
        : undefined,
      primaryAction: {
        href: "/comun/participar",
        label: "Contribuir com esta pauta",
        description: space.next_step ?? "Conhecer a próxima etapa do processo.",
      },
      relations,
    });
    return (
      <ComunShell
        appBar={{
          title: space.title,
          contextLabel: `Pauta · ${community?.name ?? territory?.name ?? "processo coletivo"}`,
          backDestination: "/comun/pautas",
        }}
      >
        <main
          className="comun-v2-page comun-v2-page--reading comun-relational-page"
          data-comun-app-v2-page="pauta-detail"
        >
          <ComunContextTrail
            items={[
              ...(territory
                ? [
                    {
                      kind: "território" as const,
                      label: territory.name,
                      href: withComunAppV2(
                        `/comun/territorios/${territory.slug}`,
                      ),
                    },
                  ]
                : []),
              ...(community
                ? [
                    {
                      kind: "comunidade" as const,
                      label: community.name,
                      href: withComunAppV2(`/comun/c/${community.slug}`),
                    },
                  ]
                : []),
              { kind: "pauta", label: space.title },
            ]}
          />
          <ComunEntityHeader context={entityContext} />
          <ComunRelationRail relations={relations} />
          <section className="mt-8" aria-labelledby="pauta-v2-counts">
            <h2 id="pauta-v2-counts" className="comun-v2-section-title">
              Nesta pauta
            </h2>
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-[var(--comun-radius-card)] border border-comun-paper/20 bg-comun-paper/5 p-4">
              <ScopedPautaMetric
                label="Contribuições públicas"
                value={contributions.length}
              />
              <ScopedPautaMetric
                label="Protocolos públicos"
                value={protocols.length}
              />
              <ScopedPautaMetric
                label="Tarefas abertas"
                value={
                  tasks.filter((task: any) => task.status !== "done").length
                }
              />
            </dl>
            <p className="mt-2 text-xs text-comun-paper/60">
              Escopo: apenas esta pauta, conteúdo público e estados publicáveis
              no momento da consulta.
            </p>
          </section>
          <ComunRelatedSection title="Atividade, decisão e resposta">
            {hub.timeline.length ? (
              <div className="grid gap-3">
                {hub.timeline.slice(0, 6).map((event: any) => (
                  <article
                    key={event.id}
                    className="border-l-4 border-comun-yellow py-2 pl-4"
                  >
                    <p className="comun-v2-status text-comun-yellow">
                      {event.event_type} ·{" "}
                      {new Date(event.occurred_at).toLocaleDateString("pt-BR")}
                    </p>
                    <h3 className="mt-1 font-black normal-case">
                      {event.title}
                    </h3>
                    {event.public_summary ? (
                      <p className="mt-1 text-sm text-comun-paper/70">
                        {event.public_summary}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <ComunEmptyStateV2
                title="Atividade pública ainda não registrada"
                explanation="Contribuições, decisões, protocolos e respostas aparecem aqui somente depois de revisão e publicação."
                related="A pauta permanece aberta para a próxima ação indicada acima."
                action={{
                  href: "/comun/participar",
                  label: "Ver formas de participar",
                }}
                secondaryActions={[
                  { href: "/comun/resultados", label: "Entender resultados" },
                ]}
              />
            )}
          </ComunRelatedSection>
          <details className="mt-8 border-t border-comun-paper/25 pt-4">
            <summary className="min-h-11 cursor-pointer text-xl font-black">
              Evidências, tarefas e memória
            </summary>
            <div className="mt-4 grid gap-4">
              <p>
                {evidence.length} evidências públicas · {tasks.length} tarefas
                publicáveis · {hub.archive.length} memórias relacionadas.
              </p>
              {hub.archive.map((item: any) => (
                <Link
                  key={item.archive.slug}
                  href={withComunAppV2(`/comun/acervo/${item.archive.slug}`)}
                  className="min-h-11 font-black underline"
                >
                  {item.archive.title}
                </Link>
              ))}
            </div>
          </details>
        </main>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <ComunExperiencePilot
        active={experiencePilot}
        level={1}
        currentHref={`/comun/pautas/${space.slug}`}
      >
        <PautaReturn />
        <Section>
          <ComunContextTrail
            items={[
              ...(community
                ? [
                    {
                      kind: "comunidade" as const,
                      label: community.name,
                      href: `/comun/c/${community.slug}`,
                    },
                  ]
                : []),
              { kind: "pauta", label: space.title },
            ]}
          />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-comun-yellow">
                {details.public_status ?? statusLabel(space.status)} /{" "}
                {community?.name ?? space.community ?? "comunidade aberta"}
              </p>
              <h1 className="comun-prose mt-3 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
                {space.title}
              </h1>
              <p className="comun-prose mt-4 max-w-3xl text-comun-paper/78">
                {space.summary ?? "Pauta em organizacao coletiva."}
              </p>
              {space.next_step ? (
                <p className="mt-4 border-2 border-comun-yellow bg-comun-black p-4 text-sm font-bold text-comun-paper">
                  Proximo passo: {space.next_step}
                </p>
              ) : null}
            </div>
            <aside className="paper-panel border-2 border-comun-black p-4">
              <h2 className="font-black uppercase">Numeros principais</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Relatos" value={space.stats.reportCount} />
                <Metric
                  label="Protocolos"
                  value={space.stats.officialProtocolCount}
                />
                <Metric
                  label="Vencidos"
                  value={space.stats.overdueProtocolCount}
                />
                <Metric
                  label="Tarefas abertas"
                  value={space.stats.openTaskCount}
                />
              </dl>
            </aside>
          </div>
        </Section>

        <PautaPoliticalCycle cycle={politicalCycle} />

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            O problema e quem é afetado
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="paper-panel border-2 p-4">
              <h3 className="font-black uppercase">O problema</h3>
              <p className="mt-2">
                {details.problem_public ??
                  space.public_synthesis ??
                  space.summary}
              </p>
            </div>
            <div className="paper-panel border-2 p-4">
              <h3 className="font-black uppercase">Quem é afetado</h3>
              <p className="mt-2">
                {details.affected_people_public ??
                  "O recorte público ainda está em apuração."}
              </p>
            </div>
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            O que está sendo reivindicado
          </h2>
          <p className="mt-3 text-comun-paper/80">
            {details.demand_public ??
              "A reivindicação pública está em construção."}
          </p>
          <h3 className="mt-5 text-xl font-black uppercase text-comun-yellow">
            Propostas
          </h3>
          <p className="mt-2 text-comun-paper/80">
            {details.proposals_public ??
              "Propostas ainda em elaboração coletiva."}
          </p>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Linha do tempo
          </h2>
          <div className="mt-4 grid gap-3">
            {hub.timeline.map((x: any) => (
              <article
                className="border-l-4 border-comun-yellow bg-comun-black p-4"
                key={x.id}
              >
                <p className="text-xs font-black uppercase text-comun-yellow">
                  {new Date(x.occurred_at).toLocaleDateString("pt-BR")} ·{" "}
                  {x.event_type}
                </p>
                <h3 className="mt-1 font-black">{x.title}</h3>
                {x.public_summary ? (
                  <p className="mt-2 text-sm text-comun-paper/75">
                    {x.public_summary}
                  </p>
                ) : null}
              </article>
            ))}
            {!hub.timeline.length ? (
              <EmptyState text="A linha do tempo pública começa com o próximo evento verificado." />
            ) : null}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Ações realizadas e próximas ações
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {hub.actions.map((x: any) => (
              <Link
                className="paper-panel border-2 p-4"
                href={`/comun/acoes/${x.slug}`}
                key={x.id}
              >
                <p className="text-xs font-black uppercase">
                  {x.action_type} · {x.status}
                </p>
                <h3 className="mt-2 font-black uppercase">{x.title}</h3>
                <p className="mt-2 text-sm">{x.objective_public}</p>
              </Link>
            ))}
          </div>
          {!hub.actions.length ? (
            <EmptyState text="Nenhuma ação pública vinculada ainda." />
          ) : null}
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Resultados
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {hub.results.map((x: any) => (
              <article className="paper-panel border-2 p-4" key={x.id}>
                <p className="text-xs font-black uppercase">
                  {x.result_type} · {x.verification_status}
                </p>
                <h3 className="mt-2 font-black uppercase">{x.title}</h3>
                <p className="mt-2 text-sm">{x.public_summary}</p>
              </article>
            ))}
          </div>
          {!hub.results.length ? (
            <EmptyState text="Ainda não há resultado público registrado. Promessas não são contadas como conquista." />
          ) : null}
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Memória relacionada
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {hub.archive.map((x: any) => (
              <Link
                className="paper-panel border-2 p-4"
                href={`/comun/acervo/${x.archive.slug}`}
                key={`${x.relation_type}-${x.archive.slug}`}
              >
                <p className="text-xs font-black uppercase">
                  {x.relation_type}
                </p>
                <h3 className="mt-2 font-black uppercase">{x.archive.title}</h3>
                <p className="mt-2 text-sm">{x.public_note}</p>
              </Link>
            ))}
          </div>
          {!hub.archive.length ? (
            <EmptyState text="Nenhum item do Acervo relacionado a esta pauta." />
          ) : null}
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Projetos relacionados
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {hub.projects.map((x: any) => (
              <Link
                className="border-2 border-comun-yellow px-4 py-3 font-black uppercase text-comun-yellow"
                href={`/comun/projetos/${x.project.slug}`}
                key={x.project.slug}
              >
                {x.project.name}
              </Link>
            ))}
          </div>
          {!hub.projects.length ? (
            <EmptyState text="Nenhum projeto relacionado ainda." />
          ) : null}
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Dossies publicados desta pauta
          </h2>
          {featuredDossiers.length ? (
            <div className="mb-5 mt-4 border-2 border-comun-yellow bg-comun-black p-4">
              <h3 className="text-xl font-black uppercase text-comun-yellow">
                Dossies em destaque
              </h3>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {featuredDossiers.slice(0, 2).map((feature) => (
                  <Link
                    key={feature.id}
                    href={`/comun/dossies/${feature.snapshot.public_slug}`}
                    className="border border-comun-yellow p-3 text-comun-paper"
                  >
                    <p className="text-xs font-black uppercase text-comun-yellow">
                      {feature.public_label || "Destaque publico"}
                    </p>
                    <h4 className="comun-prose mt-1 font-black uppercase">
                      {feature.snapshot.public_title}
                    </h4>
                    <p className="comun-prose mt-2 text-sm text-comun-paper/75">
                      {feature.public_note || feature.snapshot.public_summary}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {publishedDossiers.length ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {publishedDossiers.map((dossier) => (
                <PublicDossierCard key={dossier.id} dossier={dossier} />
              ))}
            </div>
          ) : (
            <EmptyState text="Ainda nao ha dossies publicados nesta pauta." />
          )}
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            O que sabemos
          </h2>
          <p className="comun-prose mt-3 max-w-4xl text-comun-paper/78">
            {space.public_synthesis ??
              "A sintese publica ainda esta em construcao pela curadoria."}
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {reports.slice(0, 4).map((report: any) => (
              <article
                key={report.id}
                className="paper-panel border-2 border-comun-black p-4"
              >
                <p className="text-xs font-black uppercase">
                  {report.protocol}
                </p>
                <h3 className="comun-prose mt-2 font-black uppercase">
                  {report.title ?? "Relato sanitizado"}
                </h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                  {report.public_text}
                </p>
              </article>
            ))}
            {!reports.length ? (
              <EmptyState text="Ainda nao ha relatos sanitizados publicados neste recorte." />
            ) : null}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Discussao estruturada
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {contributionTypes.slice(0, 6).map(([type, label]) => (
              <div
                key={type}
                className="paper-panel border-2 border-comun-black p-4"
              >
                <h3 className="font-black uppercase">{label}</h3>
                <div className="mt-3 grid gap-2">
                  {(grouped[type] ?? []).map((item) => (
                    <article
                      key={item.id}
                      className="border-l-4 border-comun-yellow bg-white p-3 text-sm"
                    >
                      <p className="comun-prose text-comun-asphalt/80">
                        {item.body}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase text-comun-asphalt/55">
                        {item.author_alias || "Contribuicao anonima"}
                      </p>
                    </article>
                  ))}
                  {!(grouped[type] ?? []).length ? (
                    <p className="text-sm text-comun-asphalt/65">
                      Sem contribuicoes aprovadas ainda.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Evidencias publicas
          </h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {evidence.map((item) => (
              <article
                key={item.id}
                className="paper-panel border-2 border-comun-black p-4"
              >
                <p className="text-xs font-black uppercase text-comun-asphalt/60">
                  {item.evidence_type}
                </p>
                <h3 className="mt-1 font-black uppercase">{item.title}</h3>
                {item.summary ? (
                  <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                    {item.summary}
                  </p>
                ) : null}
                {item.public_note ? (
                  <p className="comun-prose mt-2 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">
                    {item.public_note}
                  </p>
                ) : null}
              </article>
            ))}
            {!evidence.length ? (
              <EmptyState text="Ainda nao ha evidencias publicas aprovadas para esta pauta." />
            ) : null}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Contribuir
          </h2>
          {searchParams.contribuicao === "pendente" ||
          searchParams.contribuicao === "recebida" ? (
            <p className="mt-3 border-2 border-comun-yellow bg-comun-black p-3 text-sm font-bold text-comun-paper">
              Contribuicao recebida. Ela entra em moderacao antes de aparecer
              publicamente.
            </p>
          ) : null}
          <form
            action={submitPautaContribution}
            className="paper-panel mt-4 grid gap-3 border-2 border-comun-black p-4"
          >
            <input type="hidden" name="pauta_id" value={space.id} />
            <input type="hidden" name="slug" value={space.slug} />
            <label className="hidden">
              Site da empresa
              <input name="company_website" tabIndex={-1} autoComplete="off" />
            </label>
            <label className="grid gap-1 text-sm font-black uppercase">
              Nome/apelido opcional
              <input
                name="author_alias"
                className="min-h-11 border-2 border-comun-black px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-black uppercase">
              Tipo
              <select
                name="contribution_type"
                className="min-h-11 border-2 border-comun-black px-3"
              >
                {contributionTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black uppercase">
              Texto
              <textarea
                name="body"
                rows={5}
                required
                className="border-2 border-comun-black p-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-black uppercase">
              Contato privado opcional
              <input
                name="contact_private"
                className="min-h-11 border-2 border-comun-black px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-black uppercase">
              Confirmacao humana: quanto e 2 + 3?
              <input
                name="human_check"
                required
                inputMode="numeric"
                className="min-h-11 border-2 border-comun-black px-3"
              />
            </label>
            <p className="text-xs font-bold text-comun-asphalt/70">
              A contribuicao passa por moderacao. Nao envie CPF, telefone,
              endereco completo ou dados sensiveis de terceiros.
            </p>
            <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase">
              Enviar para moderacao
            </button>
          </form>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Tarefas
          </h2>
          <div className="mt-4 grid gap-3">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="paper-panel border-2 border-comun-black p-4"
              >
                <p className="text-xs font-black uppercase text-comun-asphalt/60">
                  {task.status}
                  {task.help_needed ? " / precisa de ajuda" : ""}
                </p>
                <h3 className="mt-1 font-black uppercase">{task.title}</h3>
                {task.description ? (
                  <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                    {task.description}
                  </p>
                ) : null}
              </article>
            ))}
            {!tasks.length ? (
              <EmptyState text="Ainda nao ha tarefas publicas nesta pauta." />
            ) : null}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Protocolos e cobranca
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <MetricCard
              label="Protocolos"
              value={space.stats.officialProtocolCount}
            />
            <MetricCard
              label="Vencidos"
              value={space.stats.overdueProtocolCount}
            />
            <MetricCard
              label="Aguardando"
              value={space.stats.waitingResponseCount}
            />
            <MetricCard
              label="Nao resolvidos"
              value={space.stats.unresolvedCount}
            />
          </div>
          <div className="mt-4 grid gap-3">
            {protocols
              .filter((x: any) => x.public_summary)
              .map((x: any) => (
                <article className="paper-panel border-2 p-4" key={x.id}>
                  <p className="text-xs font-black uppercase">
                    {x.agency ?? x.channel} · {x.status}
                  </p>
                  <p className="mt-2">{x.public_summary}</p>
                </article>
              ))}
          </div>
          {protocols.length ? (
            <PrimaryLink href="/comun/protocolo-popular">
              Usar Protocolo Popular
            </PrimaryLink>
          ) : null}
        </Section>
      </ComunExperiencePilot>
      {searchParams.inteligencia === "busca-viva" ? (
        <PautaMemoryRelations
          pautaId={space.id}
          title={space.title}
          route={`/comun/pautas/${space.slug}`}
        />
      ) : null}
    </ComunShell>
  );
}

async function LegacyIssuePage({
  slug,
  experiencePilot,
}: {
  slug: string;
  experiencePilot: boolean;
}) {
  const issue = await getIssue(slug);
  if (!issue) notFound();
  const [community, communityReports] = await Promise.all([
    getCommunity(issue.communitySlug),
    listPublicReports({ communitySlug: issue.communitySlug }),
  ]);
  const reports = communityReports.filter(
    (report) => report.issue_slug === issue.slug,
  );
  const isWorkCampaign = issue.slug === "trabalho-burnout-volta-redonda";
  return (
    <ComunShell>
      <ComunExperiencePilot
        active={experiencePilot}
        level={1}
        currentHref={`/comun/pautas/${slug}`}
      >
        <PautaReturn />
        <Section>
          <ComunContextTrail items={[{ kind: "pauta", label: issue.title }]} />
          <h1 className="comun-prose text-3xl font-black uppercase text-comun-yellow">
            {issue.title}
          </h1>
          <p className="comun-prose mt-4 max-w-3xl text-comun-paper/80">
            {issue.summary}
          </p>
          <p className="mt-3 text-sm text-comun-paper/60">
            Comunidade relacionada: {community?.name ?? "-"}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <PrimaryLink
              href={`/comun/relatar?comunidade=${issue.communitySlug}&pauta=${issue.slug}`}
            >
              {isWorkCampaign
                ? "Relatar situacao de trabalho"
                : "Enviar relato parecido"}
            </PrimaryLink>
            <Link
              href="/comun/pautas"
              className="inline-flex min-h-12 items-center justify-center border-2 border-comun-yellow px-5 py-3 text-sm font-black uppercase text-comun-yellow"
            >
              Acompanhar pauta
            </Link>
          </div>
        </Section>
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Relatos associados
          </h2>
          <div className="mt-4 grid gap-4">
            {reports.map((report) => (
              <article
                key={report.id}
                className="paper-panel border-2 border-comun-black p-4"
              >
                <p className="text-xs font-black uppercase">
                  {report.protocol}
                </p>
                <h3 className="comun-prose mt-2 font-black uppercase">
                  {report.title ?? "Relato sanitizado"}
                </h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                  {report.public_text}
                </p>
              </article>
            ))}
            {!reports.length ? (
              <EmptyState text="Ainda nao ha relatos publicados nesta pauta." />
            ) : null}
          </div>
        </Section>
      </ComunExperiencePilot>
    </ComunShell>
  );
}

function PautaReturn() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5">
      <Link
        href="/comun/pautas"
        className="inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline decoration-2 underline-offset-4"
      >
        ← Voltar às pautas
      </Link>
    </div>
  );
}

function groupContributions(
  items: Awaited<ReturnType<typeof listApprovedPautaContributions>>,
) {
  return items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.contribution_type] = [
      ...(acc[item.contribution_type] ?? []),
      item,
    ];
    return acc;
  }, {});
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase text-comun-asphalt/60">
        {label}
      </dt>
      <dd className="text-2xl font-black">{value}</dd>
    </div>
  );
}

function ScopedPautaMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase leading-tight text-comun-paper/60">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-black text-comun-paper">{value}</dd>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="paper-panel border-2 border-comun-black p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function PublicDossierCard({
  dossier,
}: {
  dossier: PublishedPautaDossierSnapshot;
}) {
  return (
    <Link
      href={`/comun/dossies/${dossier.public_slug}`}
      className="paper-panel border-2 border-comun-black p-4"
    >
      <p className="text-xs font-black uppercase text-comun-asphalt/60">
        {dossier.public_version_label || "Versao revisada"} /{" "}
        {new Date(
          dossier.public_updated_at ?? dossier.published_at,
        ).toLocaleDateString("pt-BR")}
      </p>
      <h3 className="comun-prose mt-2 font-black uppercase">
        {dossier.public_title}
      </h3>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
        {dossier.public_summary}
      </p>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">
      {text}
    </p>
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
