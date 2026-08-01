import { notFound } from "next/navigation";
import { ComunShell, PrimaryLink } from "@/components/comun-shell";
import {
  ComunEmptyState,
  ComunSection,
  ComunSectionHeader,
} from "@/components/comun-ui";
import { ComunContextTrail } from "@/components/comun-context-trail";
import { HubCard } from "@/components/hub-card";
import { MiniAppContextCard } from "@/components/miniapp-context-card";
import { getPublicTerritory } from "@/lib/central-hub";
import { getTerritoryExperience } from "@/lib/central-experience";
import { getSidewalkMiniapp } from "@/lib/sidewalk-miniapp";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import {
  ComunActionCard,
  ComunMemoryCard,
  ComunPautaCard,
  ComunResultCard,
} from "@/components/comun-cards";
export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const { slug } = await params,
    t: any = await getPublicTerritory(slug);
  if (!t) notFound();
  const appV2 = isComunAppV2((await searchParams).experiencia);
  const [e, sidewalk] = await Promise.all([
    getTerritoryExperience(t.id),
    appV2 ? getSidewalkMiniapp() : Promise.resolve(null),
  ]);
  if (appV2)
    return <TerritoryAppV2 territory={t} experience={e} sidewalk={sidewalk} />;
  return (
    <ComunShell>
      <ComunSection>
        <ComunContextTrail items={[{ kind: "território", label: t.name }]} />
        <h1 className="text-4xl font-black uppercase text-comun-yellow sm:text-6xl">
          {t.name}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-comun-paper/80">
          {t.public_summary}
        </p>
        <div className="mt-6">
          <PrimaryLink href="/comun/participar">
            Participar neste território
          </PrimaryLink>
        </div>
      </ComunSection>
      {slug === "volta-redonda" ? (
        <Band
          title="O que você pode fazer aqui"
          intro="Ferramentas e contribuições ligadas a este território."
        >
          <MiniAppContextCard />
          <div className="mt-3 flex flex-wrap gap-3">
            <PrimaryLink href="/comun/calcadas/prioridades">
              Acompanhar prioridades
            </PrimaryLink>
            <PrimaryLink href="/comun/acervo/identificar">
              Contribuir com o acervo
            </PrimaryLink>
          </div>
        </Band>
      ) : null}
      <Band
        title="Pautas ativas"
        intro="Processos coletivos vinculados a este território."
      >
        <Grid
          rows={t.pautas}
          render={(x: any) => (
            <HubCard
              key={x.id}
              href={`/comun/pautas/${x.slug}`}
              label={x.public_status || "Pauta"}
              title={x.title}
              summary={x.summary}
            />
          )}
          empty="Ainda não há pauta vinculada. Explore outras pautas e acompanhe uma para participar."
        />
      </Band>
      <Band
        title="Próximas ações"
        intro="Mobilizações e atividades públicas no território."
      >
        <Grid
          rows={t.actions}
          render={(x: any) => (
            <HubCard
              key={x.slug}
              href={`/comun/acoes/${x.slug}`}
              label={x.status}
              title={x.title}
            />
          )}
          empty="Nenhuma ação pública está programada neste território."
        />
      </Band>
      <Band
        title="Observatórios e mapa"
        intro="Dados e leituras territoriais com metodologia pública."
      >
        <Grid
          rows={e.observatories}
          render={(x: any) => (
            <HubCard
              key={x.slug}
              href={`/comun/observatorios/${x.slug}`}
              label={x.status}
              title={x.title}
              summary={x.public_summary}
            />
          )}
          empty="Ainda não há observatório público vinculado."
        />
      </Band>
      <Band
        title="Arte e Rádio"
        intro="Expressões e memória sonora contextualizadas pelo território."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {e.artworks.map((x: any) => (
            <HubCard
              key={x.archive.slug}
              href={`/comun/acervo/arte/${x.archive.slug}`}
              label="Arte"
              title={x.title_public}
              summary={x.description_public}
            />
          ))}
          {e.episodes.map((x: any) => (
            <HubCard
              key={x.slug_public}
              href={`/comun/radio/episodios/${x.slug_public}`}
              label="Rádio"
              title={x.title_public}
              summary={x.summary_public}
            />
          ))}
        </div>
        {!e.artworks.length && !e.episodes.length ? (
          <ComunEmptyState href="/comun/participar">
            Arte e Rádio aparecerão aqui quando forem publicadas com contexto
            territorial.
          </ComunEmptyState>
        ) : null}
      </Band>
      <Band
        title="Resultados e memória"
        intro="O que mudou e como este processo permanece documentado."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {e.results.map((x: any) => (
            <HubCard
              key={x.slug}
              href={`/comun/resultados?resultado=${encodeURIComponent(x.slug)}`}
              label={x.result_type}
              title={x.title}
              summary={x.public_summary}
            />
          ))}
          {e.memory.map((x: any) => (
            <HubCard
              key={x.archive.slug}
              href={`/comun/acervo/${x.archive.slug}`}
              label={x.relation_type}
              title={x.archive.title}
              summary={x.public_note || x.archive.summary}
            />
          ))}
        </div>
      </Band>
    </ComunShell>
  );
}

function TerritoryAppV2({
  territory,
  experience,
  sidewalk,
}: {
  territory: any;
  experience: Awaited<ReturnType<typeof getTerritoryExperience>>;
  sidewalk: Awaited<ReturnType<typeof getSidewalkMiniapp>>;
}) {
  const relations: EntityRelation[] = [
    ...territory.pautas.slice(0, 4).map((pauta: any) => ({
      ...entityReference("pauta", pauta.slug, pauta.title, pauta.public_status),
      source: "foreign_key" as const,
    })),
    ...(sidewalk && sidewalk.pauta.territory_id === territory.id
      ? [
          {
            ...entityReference(
              "miniapp",
              "calcadas",
              "Calçadas",
              sidewalk.pauta.public_status,
            ),
            source: "foreign_key" as const,
          },
        ]
      : []),
    ...territory.actions.slice(0, 3).map((action: any) => ({
      ...entityReference("action", action.slug, action.title, action.status),
      source: "foreign_key" as const,
    })),
    ...experience.results.slice(0, 3).map((result: any) => ({
      ...entityReference(
        "result",
        result.slug,
        result.title,
        result.result_type,
      ),
      source: "foreign_key" as const,
    })),
    ...experience.memory.slice(0, 3).map((item: any) => ({
      ...entityReference("memory", item.archive.slug, item.archive.title),
      source: "junction" as const,
    })),
  ];
  const context = createComunEntityContext({
    kind: "territory",
    id: territory.id,
    slug: territory.slug,
    title: territory.name,
    state: territory.status,
    summary: territory.public_summary,
    primaryAction: {
      href: "/comun/participar",
      label: "Participar neste território",
      description:
        "Escolha uma forma segura de contribuir com os processos deste território.",
    },
    relations,
  });
  return (
    <ComunShell
      appBar={{
        title: territory.name,
        contextLabel: `${territory.territory_type} · onde as pautas acontecem`,
        backDestination: "/comun/territorios",
      }}
    >
      <main
        className="comun-v2-page comun-relational-page"
        data-comun-app-v2-page="territory-detail"
      >
        <ComunContextTrail
          items={[{ kind: "território", label: territory.name }]}
        />
        <ComunEntityHeader context={context} />
        <ComunRelationRail relations={relations} />

        <ComunRelatedSection
          title="Pautas"
          summary="Processos públicos ligados pelo território canônico desta página."
        >
          {territory.pautas.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {territory.pautas.slice(0, 6).map((pauta: any) => (
                <ComunPautaCard
                  key={pauta.id}
                  href={withComunAppV2(`/comun/pautas/${pauta.slug}`)}
                  title={pauta.title}
                  summary={pauta.summary ?? "Pauta em organização coletiva."}
                  status={pauta.public_status ?? "em andamento"}
                  nextAction="Abrir o processo e consultar a próxima ação"
                />
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma pauta ligada a este cadastro"
              explanation="O vínculo territorial formal ainda não aparece em pautas públicas deste território."
              related="Você ainda pode explorar pautas por cidade ou contribuir com um relato."
              action={{ href: "/comun/pautas", label: "Explorar pautas" }}
              secondaryActions={[
                { href: "/comun/participar", label: "Como contribuir" },
              ]}
            />
          )}
        </ComunRelatedSection>

        {sidewalk?.pauta.territory_id === territory.id ? (
          <ComunRelatedSection
            title="Ferramentas"
            summary="Ferramentas vinculadas por uma pauta com o mesmo território canônico."
          >
            <MiniAppContextCard />
          </ComunRelatedSection>
        ) : null}

        <ComunRelatedSection title="Ações e resultados">
          <div className="grid gap-4 lg:grid-cols-2">
            {territory.actions.slice(0, 4).map((action: any) => (
              <ComunActionCard
                key={action.slug}
                href={withComunAppV2(`/comun/acoes/${action.slug}`)}
                title={action.title}
                description="Ação pública vinculada a este território."
                action="Abrir ação"
              />
            ))}
            {experience.results.slice(0, 4).map((result: any) => (
              <ComunResultCard
                key={result.slug}
                href={withComunAppV2(
                  `/comun/resultados?resultado=${encodeURIComponent(result.slug)}`,
                )}
                title={result.title}
                summary={result.public_summary}
                verification={result.result_type}
              />
            ))}
          </div>
          {!territory.actions.length && !experience.results.length ? (
            <ComunEmptyStateV2
              title="Ainda não há ação ou resultado público ligado"
              explanation="Ações e resultados aparecem somente depois de publicação e vínculo territorial explícito."
              action={{
                href: "/comun/pautas",
                label: "Ver processos em andamento",
              }}
              secondaryActions={[
                { href: "/comun/resultados", label: "Entender resultados" },
              ]}
            />
          ) : null}
        </ComunRelatedSection>

        <ComunRelatedSection title="Memória relacionada">
          {experience.memory.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {experience.memory.slice(0, 6).map((item: any) => (
                <ComunMemoryCard
                  key={item.archive.slug}
                  href={withComunAppV2(`/comun/acervo/${item.archive.slug}`)}
                  title={item.archive.title}
                  summary={
                    item.public_note ??
                    item.archive.summary ??
                    "Memória pública relacionada."
                  }
                />
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Memória territorial ainda não publicada"
              explanation="Itens só aparecem aqui depois de revisão editorial, direitos e vínculo territorial público."
              action={{ href: "/comun/acervo", label: "Explorar o Acervo" }}
              secondaryActions={[
                { href: "/comun/acervo/contribuir", label: "Enviar memória" },
              ]}
            />
          )}
        </ComunRelatedSection>
      </main>
    </ComunShell>
  );
}
function Band({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <ComunSection>
      <ComunSectionHeader title={title} intro={intro} />
      <div className="mt-5">{children}</div>
    </ComunSection>
  );
}
function Grid({
  rows,
  render,
  empty,
}: {
  rows: any[];
  render: (row: any) => React.ReactNode;
  empty: string;
}) {
  return rows.length ? (
    <div className="grid gap-4 md:grid-cols-2">{rows.map(render)}</div>
  ) : (
    <ComunEmptyState href="/comun/participar">{empty}</ComunEmptyState>
  );
}
