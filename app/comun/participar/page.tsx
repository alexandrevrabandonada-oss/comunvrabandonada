import Link from "next/link";
import {
  Accessibility,
  Archive,
  BellRing,
  Binoculars,
  FileImage,
  HandHeart,
  ListChecks,
  MessageSquareWarning,
  Palette,
  Radio,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { ComunBreadcrumbs, ComunSectionHeader } from "@/components/comun-ui";
import { safeCommunityReturn } from "@/lib/community-return";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  parseComunJourneyContext,
  withComunJourneyContext,
} from "@/lib/comun-journey-context";

const ways = [
  {
    group: "report",
    icon: MessageSquareWarning,
    title: "Vi um problema",
    href: "/comun/relatar",
    goal: "Conte o que aconteceu sem precisar saber quem é o responsável.",
    time: "Rápido",
    account: "Conta não obrigatória",
    moderation: "Triagem privada",
    result: "Relato guardado para completar e acompanhar depois.",
  },
  {
    group: "report",
    icon: Accessibility,
    title: "Registrar uma calçada",
    href: "/comun/calcadas/contribuir",
    goal: "Situar uma barreira no mapa e fortalecer a pauta Mobilidade e Acessibilidade.",
    time: "Pode completar depois",
    account: "Sem conta para iniciar",
    moderation: "Local e imagem passam por revisão",
    result:
      "Registro acompanhável, que pode formar prioridade, ação e memória.",
  },
  {
    group: "organize",
    icon: UsersRound,
    title: "Entrar numa roda",
    href: "/comun/pautas",
    goal: "Responder a uma pergunta concreta e ajudar na síntese.",
    time: "10–20 min",
    account: "Conta recomendada",
    moderation: "Contribuição moderada",
    result: "Síntese com acordos e divergências.",
  },
  {
    group: "organize",
    icon: HandHeart,
    title: "Ajudar numa ação",
    href: "/comun/acoes",
    goal: "Contribuir com uma mobilização ou atividade confirmada.",
    time: "Varia por ação",
    account: "Conforme a ação",
    moderation: "Orientação da equipe",
    result: "Entrega ou resultado público registrado.",
  },
  {
    group: "organize",
    icon: ListChecks,
    title: "Assumir uma tarefa",
    href: "/comun/pautas",
    goal: "Realizar uma atividade pequena com prazo e resultado esperado.",
    time: "Informado na tarefa",
    account: "Conta necessária",
    moderation: "Acompanhamento por pauta",
    result: "Tarefa concluída e incorporada ao processo.",
  },
  {
    group: "report",
    icon: Binoculars,
    title: "Observar o território",
    href: "/comun/observatorios",
    goal: "Coletar observação segundo método público.",
    time: "15–60 min",
    account: "Acesso de campanha",
    moderation: "Revisão de qualidade",
    result: "Dado agregado ou evidência revisada.",
  },
  {
    group: "culture",
    icon: Palette,
    title: "Contribuir com Arte",
    href: "/comun/acervo/arte/contribuir",
    goal: "Preservar uma obra com autoria, contexto e direitos.",
    time: "10–20 min",
    account: "Conta opcional",
    moderation: "Curadoria e direitos",
    result: "Obra relacionada a território ou pauta.",
  },
  {
    group: "culture",
    icon: Radio,
    title: "Contribuir com a Rádio",
    href: "/comun/radio/contribuir",
    goal: "Propor programa, pauta, áudio ou correção.",
    time: "10–20 min",
    account: "Conta opcional",
    moderation: "Consentimento e direitos",
    result: "Proposta acompanhável ou episódio revisado.",
  },
  {
    group: "culture",
    icon: Archive,
    title: "Colaborar com documentos",
    href: "/comun/acervo/contribuir",
    goal: "Adicionar contexto e fontes à memória coletiva.",
    time: "10–30 min",
    account: "Conta opcional",
    moderation: "Verificação editorial",
    result: "Documento ou memória relacionados.",
  },
  {
    group: "culture",
    icon: FileImage,
    title: "Identificar fotografias antigas",
    href: "/comun/acervo/identificar",
    goal: "Reconhecer lugares, pessoas, datas e acontecimentos em fotografias históricas.",
    time: "5–20 min",
    account: "Conta necessária para contribuir",
    moderation: "Aprovação antes da exibição",
    result: "Comentário comunitário e possível síntese editorial.",
  },
  {
    group: "follow",
    icon: BellRing,
    title: "Acompanhar uma pauta",
    href: "/comun/pautas",
    goal: "Receber próximas ações e acompanhar resultados.",
    time: "2 min",
    account: "Conta necessária",
    moderation: "Sem publicação automática",
    result: "Resumo pessoal e caixa de entrada.",
  },
];

const intentionGroups = [
  {
    id: "report",
    title: "Relatar e mapear",
    description: "Registre um sinal concreto do território.",
  },
  {
    id: "organize",
    title: "Organizar e agir",
    description: "Encontre uma roda, ação ou tarefa possível.",
  },
  {
    id: "follow",
    title: "Acompanhar",
    description: "Siga uma pauta e receba as próximas etapas.",
  },
  {
    id: "culture",
    title: "Memória e cultura",
    description: "Contribua com Arte, Rádio, documentos e fotografias.",
  },
] as const;

export default async function ParticiparPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const appV2 = isComunAppV2(params.experiencia);
  const journey = parseComunJourneyContext(params);
  const returnTo = safeCommunityReturn(params.returnTo, "/comun/pautas");
  if (appV2 && params.status === "recebido") {
    redirect(
      withComunAppV2(
        withComunJourneyContext("/comun/participar/confirmacao", {
          ...journey,
          returnTo,
          currentStage: "confirm",
        }),
      ),
    );
  }
  if (appV2) {
    return (
      <ComunShell>
        <div
          className="comun-v2-participate-page comun-surface-page"
          data-comun-layout-page="participar"
        >
          <header className="comun-v2-participate-page__header">
            <p className="comun-text-action text-xs font-black uppercase">
              Escolha uma intenção
            </p>
            <h1 className="comun-v2-participate-page__title comun-text-primary mt-1">
              Como você quer contribuir?
            </h1>
            <p className="comun-text-secondary mt-2 max-w-xl text-sm">
              Comece pelo objetivo. Tempo, acesso e revisão aparecem quando você
              pedir os detalhes.
            </p>
          </header>

          {intentionGroups.map((group) => (
            <section className="comun-intention-group" key={group.id}>
              <header>
                <h2 className="comun-text-primary text-base font-black">
                  {group.title}
                </h2>
                <p className="comun-text-muted text-xs">{group.description}</p>
              </header>
              <div className="comun-intention-list">
                {ways
                  .filter((way) => way.group === group.id)
                  .map((way) => (
                    <CompactIntentionCard key={way.title} way={way} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </ComunShell>
    );
  }
  return (
    <ComunShell>
      {params.status === "recebido" ? (
        <Section>
          <div
            role="status"
            className="border-2 border-comun-yellow bg-comun-paper p-6 text-comun-black"
          >
            <p className="text-xs font-black uppercase text-comun-concrete">
              Recebido
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase">
              Recebemos sua contribuição.
            </h1>
            <p className="mt-3 max-w-2xl">
              Ela está em revisão antes de aparecer publicamente. A equipe
              responsável verifica o contexto e pode pedir complemento antes de
              publicar ou relacionar a uma pauta.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-12 items-center bg-comun-black px-4 font-black uppercase text-comun-paper"
                href="/comun/minha-participacao"
              >
                Ver em Minha participação
              </Link>
              <Link
                className="inline-flex min-h-12 items-center border-2 border-comun-black px-4 font-black uppercase"
                href={returnTo}
              >
                Voltar às pautas
              </Link>
            </div>
          </div>
        </Section>
      ) : null}
      <Section>
        <ComunBreadcrumbs
          items={[{ label: "Início", href: "/comun" }, { label: "Participar" }]}
        />
        <h1 className="text-4xl font-black uppercase text-comun-yellow sm:text-6xl">
          Como você quer contribuir?
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-comun-paper/80">
          Escolha pelo objetivo. Cada caminho explica tempo, privacidade,
          moderação e o que acontece depois.
        </p>
      </Section>
      <Section>
        <ComunSectionHeader
          title="Formas de participação"
          intro="Não é um mural genérico: cada contribuição entra em um processo definido."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {ways.map((way) => (
            <article
              className="border-2 border-comun-yellow p-5"
              key={way.title}
            >
              <h2 className="text-xl font-black uppercase text-comun-yellow">
                {way.title}
              </h2>
              <p className="mt-3 text-comun-paper/80">{way.goal}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="font-black">Tempo</dt>
                <dd>{way.time}</dd>
                <dt className="font-black">Acesso</dt>
                <dd>{way.account}</dd>
                <dt className="font-black">Revisão</dt>
                <dd>{way.moderation}</dd>
                <dt className="font-black">O que acontece</dt>
                <dd>{way.result}</dd>
              </dl>
              <Link
                className="mt-5 inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline"
                href={way.href}
              >
                Começar esta contribuição
              </Link>
            </article>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}

function CompactIntentionCard({
  way,
}: {
  way: (typeof ways)[number] & { icon: LucideIcon };
}) {
  const Icon = way.icon;
  return (
    <article className="comun-intention-card">
      <Link
        className="comun-intention-card__action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-comun-black"
        href={withComunAppV2(way.href)}
        aria-label={`${way.title}. ${way.goal}`}
      >
        <span
          className="grid size-10 place-items-center rounded-[var(--comun-radius-control)] bg-comun-yellow text-comun-black"
          aria-hidden="true"
        >
          <Icon size={21} strokeWidth={2.3} />
        </span>
        <span className="min-w-0">
          <strong className="comun-text-primary block text-sm leading-tight">
            {way.title}
          </strong>
          <span className="comun-text-secondary mt-1 block truncate text-xs">
            {way.goal}
          </span>
        </span>
        <span className="comun-text-muted text-right text-[10px] font-bold">
          {way.time}
          <br />
          {way.account.includes("Conta") ? "Conta" : "Acesso simples"}
        </span>
      </Link>
    </article>
  );
}
