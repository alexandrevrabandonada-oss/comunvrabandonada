import Link from "next/link";
import {
  CalendarDays,
  CircleDot,
  FileText,
  ListTodo,
  Map,
  Radio,
  Sparkles,
} from "lucide-react";
import type { PublicPautaModule } from "@/lib/pauta-miniapps";
import type { PublicPautaSpace } from "@/lib/pauta-spaces";
import { submitCircleContributionAction } from "@/app/actions";
import { ArtworkModule } from "@/components/artwork-module";
import { RadioModule } from "@/components/radio-module";
import { ComunContinuityTimeline } from "@/components/comun-continuity-timeline";
import { SidewalkMapModule } from "@/components/sidewalk-map-module";
import { MiniAppContextCard } from "@/components/miniapp-context-card";
import { ComunContextTrail } from "@/components/comun-context-trail";
import { ComunJourneyEvent } from "@/components/comun-journey-event";
import { ComunActionCard } from "@/components/comun-cards";
import { withComunAppV2 } from "@/lib/comun-shell-contract";
import { withComunJourneyContext } from "@/lib/comun-journey-context";
import type { ComunEntityContext } from "@/lib/comun-entity-context";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";

const icons = {
  overview: Sparkles,
  construction_circle: CircleDot,
  reports: FileText,
  evidence: FileText,
  map: Map,
  observatory: Radio,
  metrics: Sparkles,
  documents: FileText,
  timeline: CalendarDays,
  proposals: FileText,
  actions: ListTodo,
  tasks: ListTodo,
  calendar: CalendarDays,
  results: Sparkles,
  archive: FileText,
  participation: CircleDot,
  art_gallery: Sparkles,
  community_radio: Radio,
} as const;
const publicTitles = {
  overview: "Entenda",
  construction_circle: "Converse",
  reports: "Relatos",
  evidence: "Evidências",
  map: "Mapa",
  observatory: "Dados",
  metrics: "Dados",
  documents: "Documentos",
  timeline: "Continuidade",
  proposals: "Propostas",
  actions: "Ações",
  tasks: "Tarefas",
  calendar: "Agenda",
  results: "Resultados",
  archive: "Memória",
  participation: "Participar",
  art_gallery: "Arte",
  community_radio: "Rádio",
} as const;

const phases = [
  {
    id: "entenda",
    label: "Entenda",
    types: [
      "overview",
      "reports",
      "evidence",
      "map",
      "observatory",
      "metrics",
      "documents",
    ],
  },
  { id: "converse", label: "Converse", types: ["construction_circle"] },
  { id: "contribua", label: "Contribua", types: ["participation"] },
  {
    id: "construa",
    label: "Construa",
    types: ["proposals", "actions", "tasks", "calendar"],
  },
  { id: "acompanhe", label: "Acompanhe", types: ["timeline", "results"] },
  {
    id: "memoria",
    label: "Memória",
    types: ["archive", "art_gallery", "community_radio"],
  },
] as const;

export function PautaAppShell({
  space,
  modules,
  circles,
  sidewalks,
  appV2 = false,
  entityContext,
}: {
  space: PublicPautaSpace;
  modules: PublicPautaModule[];
  circles: any[];
  sidewalks?: any;
  appV2?: boolean;
  entityContext?: ComunEntityContext;
}) {
  if (appV2)
    return (
      <PautaAppShellV2
        space={space}
        modules={modules}
        circles={circles}
        sidewalks={sidewalks}
        entityContext={entityContext}
      />
    );
  return (
    <main className="bg-comun-paper text-comun-black">
      <ComunJourneyEvent event="pauta_opened" surface={`pauta:${space.slug}`} />
      <section className="border-b-2 border-comun-black bg-comun-yellow">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:py-14">
          <ComunContextTrail
            tone="light"
            items={[
              ...(space.slug === "calcadas-em-circulacao"
                ? [
                    {
                      kind: "território" as const,
                      label: "Volta Redonda",
                      href: "/comun/territorios/volta-redonda",
                    },
                  ]
                : []),
              ...(space.community
                ? [
                    {
                      kind: "comunidade" as const,
                      label: space.community,
                      href: `/comun/c/${space.community}`,
                    },
                  ]
                : []),
              ...(!space.community && space.slug === "calcadas-em-circulacao"
                ? [
                    {
                      kind: "comunidade" as const,
                      label: "Mobilidade e Acessibilidade",
                      href: "/comun/comunidades?tema=mobilidade",
                    },
                  ]
                : []),
              { kind: "pauta", label: space.title },
            ]}
          />
          <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl">
            {space.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-medium">{space.summary}</p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-black uppercase">Etapa atual</dt>
              <dd>{space.public_status || space.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase">Pergunta central</dt>
              <dd>
                {space.problem_public || space.demand_public || space.summary}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase">Próxima ação</dt>
              <dd>{space.next_step || "Acompanhar a próxima atualização"}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <Link
              href="#participar"
              className="border-2 border-comun-black bg-comun-black px-3 py-2 text-comun-yellow"
            >
              Participar da construção
            </Link>
            <Link
              href="#continuidade"
              className="border-2 border-comun-black px-3 py-2"
            >
              Ver continuidade
            </Link>
          </div>
          {space.source === "editorial_fallback" ? (
            <p className="mt-6 max-w-3xl border-2 border-comun-black bg-comun-paper p-3 text-sm font-bold">
              Pauta-piloto editorial em construção. Os registros e resultados
              aparecem conforme são verificados e publicados.
            </p>
          ) : null}
        </div>
      </section>
      {sidewalks ? (
        <section className="mx-auto max-w-6xl px-4 py-7">
          <h2 className="mb-3 text-xl font-black">Ferramenta desta pauta</h2>
          <MiniAppContextCard compact />
        </section>
      ) : null}
      <nav
        aria-label="Ciclo da pauta"
        className="sticky top-[58px] z-20 border-b border-comun-black bg-comun-paper"
      >
        <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 py-3 text-sm font-black uppercase">
          {phases.map((phase) => (
            <a
              key={phase.id}
              href={`#${phase.id}`}
              className="whitespace-nowrap underline decoration-2 underline-offset-4"
            >
              {phase.label}
            </a>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4">
        {phases.map((phase) => {
          const phaseModules = modules.filter((module) =>
            (phase.types as readonly string[]).includes(module.module_type),
          );
          return (
            <section
              id={phase.id}
              key={phase.id}
              className="scroll-mt-32 border-b-2 border-comun-black py-10 sm:py-14"
            >
              <p className="text-xs font-black uppercase text-comun-black/60">
                Ciclo da pauta
              </p>
              <h2 className="text-3xl font-black uppercase">{phase.label}</h2>
              {phaseModules.length ? (
                phaseModules.map((module) => (
                  <PautaModuleSurface
                    key={module.id}
                    module={module}
                    space={space}
                    circles={circles}
                    sidewalks={sidewalks}
                  />
                ))
              ) : (
                <PhaseGuidance phase={phase.id} pautaSlug={space.slug} />
              )}
            </section>
          );
        })}
        <section id="continuidade" className="py-10">
          <h2 className="text-2xl font-black uppercase">
            Continuidade da pauta
          </h2>
          <p className="mt-2">
            O que mudou, a consequência e como o processo segue.
          </p>
          <div className="mt-4">
            {space.source === "editorial_fallback" ? (
              <p className="border-l-4 border-comun-yellow p-4">
                A continuidade pública será registrada conforme a pauta avançar.
              </p>
            ) : (
              <ComunContinuityTimeline pautaId={space.id} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PautaAppShellV2({
  space,
  modules,
  circles,
  sidewalks,
  entityContext,
}: {
  space: PublicPautaSpace;
  modules: PublicPautaModule[];
  circles: any[];
  sidewalks?: any;
  entityContext?: ComunEntityContext;
}) {
  const currentCircle = circles[0];
  const primaryHref = sidewalks
    ? "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao"
    : currentCircle
      ? "#participar"
      : "/comun/participar";
  const pautaRoute = withComunAppV2(`/comun/pautas/${space.slug}`);
  const streamlinedPrimaryHref = primaryHref.startsWith("#")
    ? primaryHref
    : withComunAppV2(
        withComunJourneyContext(primaryHref, {
          intent: sidewalks ? "register_sidewalk" : "contribute_pauta",
          sourceRoute: pautaRoute,
          returnTo: pautaRoute,
          pautaSlug: space.slug,
          currentStage: "participate",
          trackingRoute: "/comun/minha-participacao?secao=contribuicoes",
        }),
      );
  return (
    <main
      className="surface-base comun-relational-page"
      data-comun-app-v2-page="pauta-detail"
    >
      <ComunJourneyEvent
        event="pauta_opened"
        surface={`pauta:${space.slug}:app-v2`}
      />
      <div className="comun-v2-page comun-v2-page--reading">
        {entityContext ? (
          <>
            <ComunContextTrail
              items={[
                ...(entityContext.territory
                  ? [
                      {
                        kind: "território" as const,
                        label: entityContext.territory.title,
                        href: withComunAppV2(entityContext.territory.href),
                      },
                    ]
                  : []),
                ...(entityContext.community
                  ? [
                      {
                        kind: "comunidade" as const,
                        label: entityContext.community.title,
                        href: withComunAppV2(entityContext.community.href),
                      },
                    ]
                  : []),
                { kind: "pauta", label: entityContext.title },
              ]}
            />
            <ComunEntityHeader context={entityContext} />
            <ComunRelationRail relations={entityContext.relations} />
          </>
        ) : (
          <header className="comun-entity-header">
            <p className="comun-v2-eyebrow text-comun-yellow">Pauta</p>
            <h1 className="comun-v2-title mt-2 normal-case">{space.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-comun-paper/75">
              {space.summary}
            </p>
          </header>
        )}

        <section
          className="mt-7 border-l-4 border-comun-yellow pl-4"
          aria-labelledby="pauta-now"
        >
          <h2 id="pauta-now" className="comun-v2-section-title">
            Agora
          </h2>
          <p className="mt-2 text-comun-paper/72">
            {space.public_synthesis ||
              space.problem_public ||
              space.demand_public ||
              "A comunidade está reunindo contexto revisado para orientar a próxima etapa."}
          </p>
        </section>

        {!entityContext?.primaryAction ? (
          <section className="mt-7" aria-labelledby="pauta-next">
            <h2 id="pauta-next" className="comun-v2-section-title mb-3">
              Próxima ação
            </h2>
            <ComunActionCard
              href={streamlinedPrimaryHref}
              title={
                space.next_step ||
                (sidewalks
                  ? "Registrar uma calçada"
                  : "Participar da construção")
              }
              description="Você verá o que será público, o que passa por revisão e como acompanhar a consequência."
              action={sidewalks ? "Registrar calçada" : "Abrir participação"}
            />
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="pauta-known">
          <h2 id="pauta-known" className="comun-v2-section-title">
            O que sabemos
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-2 rounded-[var(--comun-radius-card)] border border-comun-paper/20 bg-comun-paper/5 p-4">
            <ScopedMetric
              label="Contribuições públicas"
              value={space.stats.reportCount}
            />
            <ScopedMetric
              label="Protocolos públicos"
              value={space.stats.officialProtocolCount}
            />
            <ScopedMetric
              label="Tarefas abertas"
              value={space.stats.openTaskCount}
            />
          </dl>
          {sidewalks ? (
            <p className="mt-3 text-xs text-comun-paper/65">
              Nesta pauta. Registros publicados no miniapp são contados
              separadamente: {sidewalks.records?.length ?? 0}.
            </p>
          ) : (
            <p className="mt-3 text-xs text-comun-paper/65">
              Nesta pauta · somente conteúdo público no estado atual.
            </p>
          )}
        </section>

        <section
          id="participar"
          className="mt-8 scroll-mt-28"
          aria-labelledby="pauta-participate"
        >
          <h2 id="pauta-participate" className="comun-v2-section-title">
            Participar
          </h2>
          <p className="mt-2 text-comun-paper/70">
            Escolha uma contribuição concreta. Nenhum estado muda
            automaticamente.
          </p>
          {currentCircle ? (
            <CirclePanel circle={currentCircle} pautaSlug={space.slug} appV2 />
          ) : (
            <Link
              href={withComunAppV2("/comun/participar")}
              className="comun-v2-action mt-4"
            >
              Ver formas de participar
            </Link>
          )}
        </section>

        {sidewalks ? (
          <ComunRelatedSection
            title="Ferramenta desta pauta"
            summary="Registros do miniapp possuem escopo próprio e não são somados às contribuições da pauta."
          >
            <MiniAppContextCard compact appV2 />
          </ComunRelatedSection>
        ) : null}

        {!circles.length &&
        !entityContext?.relations.some((relation) =>
          ["action", "protocol", "result", "memory"].includes(relation.kind),
        ) ? (
          <ComunRelatedSection title="Atividade e decisões">
            <ComunEmptyStateV2
              title="Atividade pública ainda não registrada"
              explanation="Contribuições, decisões e encaminhamentos feitos pela comunidade aparecerão aqui depois de revisão e publicação."
              related="A próxima ação acima continua disponível enquanto o processo é construído."
              action={{
                href: "/comun/participar",
                label: "Ver formas de participar",
              }}
              secondaryActions={[
                {
                  href: "/comun/resultados",
                  label: "Entender critérios de resultado",
                },
              ]}
            />
          </ComunRelatedSection>
        ) : null}

        <details className="mt-9 border-t-2 border-comun-black pt-5">
          <summary className="min-h-11 cursor-pointer text-xl font-black">
            Percurso completo da pauta
          </summary>
          <div className="mt-5">
            {phases.map((phase) => {
              const phaseModules = modules.filter((module) =>
                (phase.types as readonly string[]).includes(module.module_type),
              );
              return (
                <section
                  id={phase.id}
                  key={phase.id}
                  className="border-b border-comun-black/20 py-6"
                >
                  <h2 className="text-xl font-black normal-case">
                    {phase.label}
                  </h2>
                  {phaseModules.length ? (
                    phaseModules.map((module) => (
                      <PautaModuleSurface
                        key={module.id}
                        module={module}
                        space={space}
                        circles={circles}
                        sidewalks={sidewalks}
                      />
                    ))
                  ) : (
                    <PhaseGuidance phase={phase.id} pautaSlug={space.slug} />
                  )}
                </section>
              );
            })}
          </div>
        </details>
      </div>
    </main>
  );
}

function ScopedMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase leading-tight text-comun-paper/60">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-black text-comun-paper">{value}</dd>
    </div>
  );
}

function PautaModuleSurface({
  module,
  space,
  circles,
  sidewalks,
}: {
  module: PublicPautaModule;
  space: PublicPautaSpace;
  circles: any[];
  sidewalks?: any;
}) {
  const Icon = icons[module.module_type];
  const title = module.title_override || publicTitles[module.module_type];
  const circle =
    module.module_type === "construction_circle" ? circles[0] : null;
  const isSidewalkMap =
    module.module_type === "map" &&
    (sidewalks?.records?.length ||
      (module.config as any)?.layerIds?.includes("sidewalk_accessibility"));
  return (
    <section data-module={module.module_type} className="py-7">
      <div className="flex gap-4">
        <Icon className="mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-2xl font-black uppercase">{title}</h2>
          <p className="mt-2 max-w-3xl text-comun-black/75">
            {module.public_description || module.module_type === "overview"
              ? module.public_description ||
                space.public_synthesis ||
                space.next_step ||
                "Acompanhe as informações revisadas e as próximas ações desta pauta."
              : "Este módulo será alimentado com conteúdo revisado pela curadoria."}
          </p>
          {circle ? (
            <CirclePanel circle={circle} pautaSlug={space.slug} />
          ) : isSidewalkMap ? (
            <SidewalkMapModule pautaSlug={space.slug} surface={sidewalks} />
          ) : module.module_type === "art_gallery" ? (
            <ArtworkModule pautaId={space.id} config={module.config} />
          ) : module.module_type === "community_radio" ? (
            <RadioModule pautaId={space.id} config={module.config} />
          ) : (
            <ModuleEmptyState type={module.module_type} />
          )}
        </div>
      </div>
    </section>
  );
}

function CirclePanel({
  circle,
  pautaSlug,
  appV2 = false,
}: {
  circle: any;
  pautaSlug: string;
  appV2?: boolean;
}) {
  const rounds = Array.isArray(circle.comun_construction_circle_rounds)
    ? circle.comun_construction_circle_rounds
    : [];
  const synthesis = Array.isArray(circle.comun_circle_syntheses)
    ? circle.comun_circle_syntheses.find(
        (item: any) => item.status === "published",
      )
    : null;
  const current =
    rounds.find((round: any) => round.id === circle.current_round_id) ||
    rounds.find((round: any) => round.status === "open");
  return (
    <div className="mt-6 border-2 border-comun-black bg-comun-asphalt p-5 text-comun-paper">
      <p className="text-xs font-black uppercase text-comun-yellow">
        Roda de construção
      </p>
      <h3 className="mt-2 text-xl font-black">{circle.title}</h3>
      <p className="mt-2">{circle.public_question}</p>
      {current && (
        <div className="mt-4 border-l-4 border-comun-yellow pl-3">
          <p className="font-black uppercase">Rodada aberta: {current.title}</p>
          <p className="mt-1 text-sm">{current.public_prompt}</p>
        </div>
      )}
      {synthesis && (
        <div className="mt-4 bg-comun-paper p-4 text-comun-black">
          <p className="font-black uppercase">Síntese publicada</p>
          <p className="mt-1">{synthesis.public_summary}</p>
          {synthesis.agreements?.length ? (
            <p className="mt-2 text-sm">
              <strong>Acordos:</strong> {synthesis.agreements.join(" · ")}
            </p>
          ) : null}
          {synthesis.disagreements?.length ? (
            <p className="mt-2 text-sm">
              <strong>Divergências preservadas:</strong>{" "}
              {synthesis.disagreements.join(" · ")}
            </p>
          ) : null}
          {synthesis.open_questions?.length ? (
            <p className="mt-2 text-sm">
              <strong>Perguntas abertas:</strong>{" "}
              {synthesis.open_questions.join(" · ")}
            </p>
          ) : null}
        </div>
      )}
      {current && (
        <form
          id="participar"
          action={submitCircleContributionAction}
          className="mt-5 grid gap-2"
        >
          <input type="hidden" name="circle_id" value={circle.id} />
          <input type="hidden" name="round_id" value={current.id} />
          <input type="hidden" name="pauta_slug" value={pautaSlug} />
          {appV2 ? (
            <>
              <input
                type="hidden"
                name="journey_return"
                value={withComunAppV2(`/comun/pautas/${pautaSlug}`)}
              />
            </>
          ) : (
            <input type="hidden" name="experiencia" value="legacy" />
          )}
          <label className="text-sm font-bold">
            Que tipo de contribuição é esta?
            <select
              name="contribution_type"
              defaultValue="testimony"
              className="mt-1 w-full border-2 border-comun-yellow bg-comun-paper p-2 text-comun-black"
            >
              <option value="testimony">Experiência vivida</option>
              <option value="evidence">Evidência</option>
              <option value="proposal">Proposta</option>
              <option value="question">Pergunta</option>
              <option value="counterpoint">Contraponto</option>
              <option value="task_offer">Oferta de ajuda</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Como quer assinar?
            <input
              name="author_alias"
              className="mt-1 w-full border-2 border-comun-yellow bg-comun-paper p-2 text-comun-black"
            />
          </label>
          <label className="text-sm font-bold">
            Contribuição
            <textarea
              name="body"
              required
              minLength={24}
              className="mt-1 min-h-28 w-full border-2 border-comun-yellow bg-comun-paper p-2 text-comun-black"
            />
          </label>
          <label className="text-sm font-bold">
            Confirmação humana: quanto é 2 + 3?
            <input
              name="human_check"
              required
              inputMode="numeric"
              className="mt-1 w-full border-2 border-comun-yellow bg-comun-paper p-2 text-comun-black"
            />
          </label>
          <input
            name="company_website"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />
          <button
            type="submit"
            className="border-2 border-comun-yellow bg-comun-yellow px-4 py-2 font-black uppercase text-comun-black"
          >
            Enviar para revisão
          </button>
          <p className="text-xs text-comun-paper/75">
            A equipe revisa antes da publicação. Depois, você acompanha a
            decisão em Minha Participação e na Caixa de entrada.
          </p>
        </form>
      )}
    </div>
  );
}

function PhaseGuidance({
  phase,
  pautaSlug,
}: {
  phase: string;
  pautaSlug: string;
}) {
  const content: Record<
    string,
    { text: string; href: string; action: string }
  > = {
    contribua: {
      text: "Escolha uma contribuição concreta. Você verá o que será público, o que passa por revisão e como acompanhar.",
      href: `/comun/mapa/contribuir?origem=calcadas&pauta=${encodeURIComponent(pautaSlug)}&returnTo=${encodeURIComponent(`/comun/pautas/${pautaSlug}`)}`,
      action: "Registrar uma calçada",
    },
    construa: {
      text: "Contribuições revisadas podem formar propostas, prioridades e ações coletivas. Nada muda de estado sem decisão editorial registrada.",
      href: "/comun/calcadas/mobilizacao",
      action: "Ver mobilização",
    },
    acompanhe: {
      text: "Acompanhe revisão, prioridades e encaminhamentos sem precisar reencontrar a ferramenta.",
      href: "/comun/minha-participacao",
      action: "Abrir Minha Participação",
    },
    memoria: {
      text: "Resultados confirmados permanecem ligados à pauta como memória pública do território.",
      href: "/comun/calcadas/resultados",
      action: "Ver resultados e memória",
    },
  };
  const item = content[phase];
  if (!item) return <ModuleEmptyState type={phase} />;
  return (
    <div className="mt-5 max-w-3xl border-l-4 border-comun-yellow bg-comun-black p-5 text-comun-paper">
      <p>{item.text}</p>
      <Link
        href={item.href}
        className="mt-3 inline-flex font-black text-comun-yellow underline"
      >
        {item.action}
      </Link>
    </div>
  );
}

function ModuleEmptyState({ type }: { type: string }) {
  return (
    <p className="mt-5 border-l-4 border-comun-yellow bg-comun-black px-4 py-3 text-sm font-bold text-comun-paper">
      {type.includes("future")
        ? "Integração em preparação: não há publicação pública nesta etapa."
        : "Sem itens públicos revisados neste momento."}
    </p>
  );
}
