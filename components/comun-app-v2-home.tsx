import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BusFront,
  MapPinned,
  Radio,
  Users,
} from "lucide-react";
import {
  ComunActionCard,
  ComunMemoryCard,
  ComunMiniappCard,
  ComunPautaCard,
  ComunResultCard,
} from "@/components/comun-cards";
import { withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  COMUN_MOTOROLA_PRIMARY_ACTION,
  COMUN_MOTOROLA_SIDEWALK_CONTRIBUTION_HREF,
} from "@/lib/comun-motorola-contract";

export function ComunAppV2Home({
  center,
  profile,
  pautas = [],
  actions = [],
  results = [],
  memory = [],
  civicIntelligencePilot = false,
}: {
  center?: any;
  profile?: any;
  pautas?: any[];
  actions?: any[];
  results?: any[];
  memory?: any[];
  civicIntelligencePilot?: boolean;
}) {
  const attention = (center?.inbox ?? [])
    .filter((item: any) => !item.read_at)
    .sort((a: any, b: any) => priority(b.priority) - priority(a.priority));
  const firstPauta = center?.memberships?.[0]?.pauta ?? pautas[0];
  const firstAction = center?.actions?.[0] ?? actions[0];
  const firstTask = center?.tasks?.[0];
  const firstResult = center?.results?.[0] ?? results[0];
  const firstMemory = memory[0];
  const displayName = String(profile?.display_name ?? "")
    .trim()
    .split(/\s+/)[0];

  return (
    <div className="comun-v2-page" data-comun-app-v2-page="home">
      <header className="pb-5 pt-1">
        <p className="text-sm font-bold text-comun-black/60">
          {center ? "Sua área começa pelo que pede ação" : "Exploração pública"}
        </p>
        <h1 className="comun-v2-title mt-2 normal-case">
          {displayName
            ? `Bom te ver, ${displayName}`
            : "O que precisa de atenção?"}
        </h1>
      </header>

      <Link
        href={withComunAppV2(COMUN_MOTOROLA_PRIMARY_ACTION.href)}
        prefetch={false}
        data-comun-motorola-primary-action="true"
        className="flex min-h-14 items-center justify-between gap-4 rounded-[var(--comun-radius-card)] border-2 border-comun-black bg-comun-yellow px-4 py-3 text-comun-black shadow-[4px_4px_0_#0b0b0a]"
      >
        <span>
          <strong className="block text-xl leading-tight">
            {COMUN_MOTOROLA_PRIMARY_ACTION.label}
          </strong>
          <small className="mt-1 block text-sm font-bold">
            Conte o que aconteceu. Você não precisa saber quem é o responsável.
          </small>
        </span>
        <ArrowRight className="shrink-0" aria-hidden="true" />
      </Link>

      {civicIntelligencePilot ? (
        <section
          aria-labelledby="home-civic-search-v2"
          className="surface-tool rounded-[var(--comun-radius-card)] border-2 border-comun-black p-4"
        >
          <h2 id="home-civic-search-v2" className="comun-v2-section-title">
            O que você precisa encontrar?
          </h2>
          <p className="mt-2 text-sm text-comun-black/70">
            Descreva uma necessidade comum. A busca leva a processos e rotas
            públicas; não cria feed nem perfil de interesses.
          </p>
          <form
            action="/comun/buscar"
            className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
          >
            <label className="sr-only" htmlFor="home-civic-search-v2-input">
              Necessidade ou assunto
            </label>
            <input
              id="home-civic-search-v2-input"
              name="q"
              className="min-h-12 rounded-[var(--comun-radius-control)] border-2 border-comun-black bg-comun-paper px-3 text-comun-black"
              placeholder="Ex.: não consigo passar com cadeira de rodas"
            />
            <button className="comun-v2-action">Buscar</button>
          </form>
        </section>
      ) : null}

      <section aria-labelledby="home-attention" className="mt-2">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 id="home-attention" className="comun-v2-section-title">
            Pede atenção
          </h2>
          <Link
            href={withComunAppV2("/comun/caixa-de-entrada")}
            className="inline-flex min-h-11 items-center text-sm font-black underline"
          >
            Ver Caixa
          </Link>
        </div>
        {attention[0] ? (
          <Link
            href={withComunAppV2(attention[0].action_url)}
            className="surface-alert flex min-h-24 items-center gap-4 rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-comun-yellow text-xl font-black">
              !
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-lg leading-tight">
                {attention[0].title}
              </strong>
              <small className="mt-1 block text-comun-black/70">
                {attention[0].summary}
              </small>
            </span>
            <ArrowRight className="shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          <div className="surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4">
            <p className="font-black">Nenhum retorno urgente agora.</p>
            <p className="mt-1 text-sm text-comun-black/65">
              Você pode explorar processos públicos sem criar um feed pessoal.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="home-next" className="mt-7">
        <h2 id="home-next" className="comun-v2-section-title mb-3">
          Próxima ação
        </h2>
        {attention[0] ? (
          <ComunActionCard
            href={withComunAppV2(attention[0].action_url)}
            title={attention[0].title}
            description={attention[0].summary}
            action={attention[0].action_label ?? "Abrir pedido"}
          />
        ) : firstTask ? (
          <ComunActionCard
            href={withComunAppV2(
              firstTask.action_url ?? "/comun/minha-participacao?secao=tarefas",
            )}
            title={firstTask.title}
            description={
              firstTask.result_public ??
              "Confira responsabilidade, prazo e resultado esperado."
            }
            action="Abrir tarefa"
          />
        ) : firstAction ? (
          <ComunActionCard
            href={withComunAppV2(
              firstAction.action_url ?? `/comun/acoes/${firstAction.slug}`,
            )}
            title={firstAction.title}
            description={
              firstAction.participation_public ??
              firstAction.objective_public ??
              "Confira o compromisso antes de participar."
            }
            action="Ver ação"
          />
        ) : (
          <ComunActionCard
            href={withComunAppV2("/comun/participar")}
            title="Escolha como começar"
            description="Não há pendência agora. Explore um processo público ou abra uma intenção concreta."
            action="Ver formas de participar"
          />
        )}
      </section>

      <section aria-labelledby="home-shortcuts" className="mt-8">
        <h2 id="home-shortcuts" className="comun-v2-section-title mb-3">
          Atalhos
        </h2>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Shortcut
            href="/comun/calcadas"
            label="Calçadas"
            icon={<MapPinned />}
          />
          <Shortcut href="/comun/onibus" label="Ônibus" icon={<BusFront />} />
          <Shortcut
            href="/comun/comunidades"
            label="Comunidades"
            icon={<Users />}
          />
          <Shortcut href="/comun/acervo" label="Acervo" icon={<Archive />} />
          <Shortcut href="/comun/radio" label="Rádio" icon={<Radio />} />
        </div>
      </section>

      <section aria-labelledby="home-tracking" className="mt-8">
        <h2 id="home-tracking" className="comun-v2-section-title mb-4">
          Acompanhamentos
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {firstPauta ? (
            <ComunPautaCard
              href={withComunAppV2(`/comun/pautas/${firstPauta.slug}`)}
              title={firstPauta.title}
              summary={
                firstPauta.public_synthesis ??
                firstPauta.summary ??
                "Processo em acompanhamento."
              }
              status={
                firstPauta.public_status ?? firstPauta.status ?? "Em andamento"
              }
              nextAction={firstPauta.next_step ?? "Acompanhar atualização"}
            />
          ) : null}
          {firstAction ? (
            <ComunActionCard
              href={withComunAppV2(`/comun/acoes/${firstAction.slug}`)}
              title={firstAction.title}
              description={
                firstAction.participation_public ??
                firstAction.objective_public ??
                "Ação comunitária aberta."
              }
              action="Ver compromisso"
            />
          ) : null}
          {firstResult ? (
            <ComunResultCard
              href={withComunAppV2("/comun/resultados")}
              title={firstResult.title}
              summary={
                firstResult.public_summary ??
                "Resultado publicado com contexto e verificação."
              }
            />
          ) : null}
          {firstMemory ? (
            <ComunMemoryCard
              href={withComunAppV2(`/comun/acervo/${firstMemory.slug}`)}
              title={firstMemory.title}
              summary={
                firstMemory.summary ?? "Memória ligada a um processo coletivo."
              }
            />
          ) : null}
        </div>
      </section>

      <section aria-labelledby="home-tool" className="mt-8">
        <h2 id="home-tool" className="comun-v2-section-title mb-4">
          Ferramenta em atividade
        </h2>
        <ComunMiniappCard
          href={withComunAppV2("/comun/calcadas")}
          contributionHref={withComunAppV2(
            COMUN_MOTOROLA_SIDEWALK_CONTRIBUTION_HREF,
          )}
          title="Mapa das Calçadas"
          objective="Registrar barreiras e acompanhar prioridades"
          territory="Volta Redonda"
          status="Registros publicados e revisados"
          impact="Prioridades em acompanhamento"
          action="Registrar um trecho"
        />
      </section>
    </div>
  );
}

function Shortcut({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={withComunAppV2(href)}
      prefetch={false}
      className="flex min-h-24 min-w-24 snap-start flex-col items-center justify-center gap-2 rounded-[var(--comun-radius-card)] border border-comun-black/20 bg-comun-paper p-3 text-center text-xs font-black"
    >
      <span className="grid size-10 place-items-center rounded-[var(--comun-radius-control)] bg-comun-black text-comun-paper [&>svg]:size-5">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function priority(value: string) {
  return value === "urgent"
    ? 4
    : value === "attention"
      ? 3
      : value === "normal"
        ? 2
        : 1;
}
