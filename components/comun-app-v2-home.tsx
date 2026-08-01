import Link from "next/link";
import {
  Archive,
  ArrowRight,
  MapPinned,
  Radio,
  Search,
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

export function ComunAppV2Home({
  center,
  profile,
  pautas = [],
  actions = [],
  results = [],
  memory = [],
}: {
  center?: any;
  profile?: any;
  pautas?: any[];
  actions?: any[];
  results?: any[];
  memory?: any[];
}) {
  const attention = (center?.inbox ?? [])
    .filter((item: any) => !item.read_at)
    .sort((a: any, b: any) => priority(b.priority) - priority(a.priority));
  const firstPauta = center?.memberships?.[0]?.pauta ?? pautas[0];
  const firstAction = center?.actions?.[0] ?? actions[0];
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
        <ComunActionCard
          href={withComunAppV2(
            "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
          )}
          title="Registrar uma calçada"
          description="Ajude a mapear barreiras e melhorar caminhos da cidade. O registro passa por revisão."
          action="Começar registro"
        />
      </section>

      <section aria-labelledby="home-shortcuts" className="mt-8">
        <h2 id="home-shortcuts" className="comun-v2-section-title mb-3">
          Atalhos
        </h2>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Shortcut href="/comun/explorar" label="Explorar" icon={<Search />} />
          <Shortcut
            href="/comun/comunidades"
            label="Comunidades"
            icon={<Users />}
          />
          <Shortcut
            href="/comun/calcadas"
            label="Calçadas"
            icon={<MapPinned />}
          />
          <Shortcut href="/comun/radio" label="Rádio" icon={<Radio />} />
          <Shortcut href="/comun/acervo" label="Acervo" icon={<Archive />} />
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
            "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
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
