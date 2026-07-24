import Link from "next/link";
import { ArrowRight, Check, MapPin, Route } from "lucide-react";
import { ComunShell, PrimaryLink } from "@/components/comun-shell";
import {
  ComunEmptyState,
  ComunSection,
  ComunStatus,
} from "@/components/comun-ui";
import { HubCard } from "@/components/hub-card";
import { ResumeJourneySection } from "@/components/community-journey-memory";
import { MyCommunitySummary } from "@/components/my-community-summary";
import {
  ContinueMiniappCard,
  MiniAppContextCard,
} from "@/components/miniapp-context-card";
import { getCentralExperience } from "@/lib/central-experience";
import {
  listPublicActions,
  listPublicResults,
  listPublicTerritories,
} from "@/lib/central-hub";
import { listPublicPautaSpaces } from "@/lib/pauta-spaces";
import { getOptionalCommunitySession } from "@/lib/community-auth";
import { getPersonalCenter } from "@/lib/personal-center";
import { ComunJourneyEvent } from "@/components/comun-journey-event";

export const dynamic = "force-dynamic";

export default async function ComunHomePage() {
  const [pautas, actions, results, territories, experience, session] =
    await Promise.all([
      listPublicPautaSpaces(),
      listPublicActions(6),
      listPublicResults(4),
      listPublicTerritories(),
      getCentralExperience(),
      getOptionalCommunitySession(),
    ]);
  const activeActions = actions
    .filter((action: any) => action.status !== "completed")
    .slice(0, 3);
  const featuredTerritory = territories[0];
  const featuredPauta = pautas[0];

  if (session?.user) {
    const center = await getPersonalCenter(session.user.id);
    return (
      <AuthenticatedHome
        center={center}
        experience={experience}
        profile={session.profile}
      />
    );
  }

  return (
    <ComunShell>
      <ComunJourneyEvent event="home_viewed" surface="home:publica" />
      <ComunSection className="pb-7 pt-8 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex border-2 border-comun-yellow px-2 py-1 text-xs font-black uppercase text-comun-yellow">
              Plataforma comunitária de Volta Redonda
            </p>
            <h1 className="max-w-5xl text-4xl font-black uppercase leading-[.92] tracking-[-.04em] text-comun-paper sm:text-6xl lg:text-7xl">
              Agora no território.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-comun-paper/80">
              Veja as pautas em construção, escolha uma contribuição concreta
              e acompanhe o que a comunidade fez com ela.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PrimaryLink href="/comun/territorios">
                Explorar o território
              </PrimaryLink>
              <Link
                href="/comun/participar"
                className="inline-flex min-h-12 items-center justify-center border-2 border-comun-yellow px-5 py-3 text-center text-sm font-black uppercase text-comun-yellow"
              >
                Participar de uma ação
              </Link>
              <Link
                href="/comun/entrar"
                className="inline-flex min-h-12 items-center justify-center px-2 text-sm font-black uppercase text-comun-paper underline decoration-2 underline-offset-4"
              >
                Entrar ou criar conta
              </Link>
            </div>
          </div>
          <aside className="border-2 border-comun-yellow bg-comun-paper p-5 text-comun-black">
            <p className="text-xs font-black uppercase text-comun-concrete">
              Como o COMUN se organiza
            </p>
            <ol className="mt-4 grid gap-3 text-sm font-black uppercase">
              {[
                ["1", "Território", "onde o assunto acontece"],
                ["2", "Comunidade", "quem constrói junto"],
                ["3", "Pauta", "o processo acompanhado"],
                ["4", "Ação", "o próximo passo possível"],
                ["5", "Memória", "o que fica público"],
              ].map(([number, title, description]) => (
                <li
                  className="grid grid-cols-[2rem_1fr] gap-3 border-t-2 border-comun-black pt-3 first:border-t-0 first:pt-0"
                  key={number}
                >
                  <span className="grid size-7 place-items-center bg-comun-yellow text-comun-black">
                    {number}
                  </span>
                  <span>
                    {title}
                    <small className="ml-2 font-normal normal-case text-comun-concrete">
                      {description}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </ComunSection>

      <ComunSection className="pt-0">
        <div className="grid border-y-2 border-comun-paper/30 lg:grid-cols-[.9fr_1.1fr]">
          <section className="border-b-2 border-comun-paper/30 p-5 lg:border-b-0 lg:border-r-2">
            <p className="text-xs font-black uppercase text-comun-yellow">
              Seu contexto de partida
            </p>
            <div className="mt-4 flex gap-3">
              <MapPin
                className="mt-1 shrink-0 text-comun-yellow"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-2xl font-black uppercase">
                  {featuredTerritory?.name ?? "Conheça os territórios"}
                </h2>
                <p className="mt-2 text-comun-paper/75">
                  {featuredTerritory?.public_summary ??
                    "Escolha um lugar para ver pautas, ações, resultados e memórias conectadas."}
                </p>
              </div>
            </div>
            <Link
              className="mt-5 inline-flex items-center gap-2 font-black uppercase text-comun-yellow underline decoration-2 underline-offset-4"
              href={
                featuredTerritory
                  ? `/comun/territorios/${featuredTerritory.slug}`
                  : "/comun/territorios"
              }
            >
              Abrir território <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
          <section className="bg-comun-yellow p-5 text-comun-black">
            <p className="text-xs font-black uppercase">
              Próximo passo coletivo
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight">
              {featuredPauta?.next_step ??
                "Encontre uma pauta e escolha como participar"}
            </h2>
            <p className="mt-2 max-w-2xl">
              {featuredPauta?.public_synthesis ??
                featuredPauta?.summary ??
                "Você pode acompanhar uma pauta, contribuir numa roda ou ajudar numa ação. Não é preciso criar conta para começar a explorar."}
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center bg-comun-black px-4 font-black uppercase text-comun-paper"
              href={
                featuredPauta
                  ? `/comun/pautas/${featuredPauta.slug}`
                  : "/comun/pautas"
              }
            >
              {featuredPauta
                ? "Ver pauta e próximos passos"
                : "Explorar pautas"}
            </Link>
          </section>
        </div>
      </ComunSection>

      <HomeSection
        title="Sua próxima participação"
        intro="Comece pelo Mapa das Calçadas, ligado à pauta Mobilidade e Acessibilidade. Você pode registrar, conversar ou acompanhar."
      >
        <MiniAppContextCard />
      </HomeSection>

      <HomeSection
        title="Encontre seu caminho"
        intro="Cinco entradas principais. Os outros módulos permanecem disponíveis como ferramentas do processo."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PathCard
            href="/comun/comunidades"
            title="Comunidades"
            text="Conheça coletivos, grupos e vínculos por território."
          />
          <PathCard
            href="/comun/pautas"
            title="Pautas"
            text="Acompanhe um problema do debate ao encaminhamento."
          />
          <PathCard
            href="/comun/participar"
            title="Participar"
            text="Escolha uma contribuição pelo tempo e consequência."
          />
          <PathCard
            href="/comun/territorios"
            title="Territórios"
            text="Veja o que está em movimento em cada lugar."
          />
          <PathCard
            href="/comun/minha-participacao"
            title="Minha área"
            text="Retome ações, tarefas, contribuições e resultados."
          />
          <PathCard
            href="/comun/buscar"
            title="Buscar"
            text="Localize processos e memórias públicas sem ranking de popularidade."
          />
        </div>
      </HomeSection>

      <HomeSection
        title="Pautas em construção"
        intro="Até três processos em curso, com etapa atual, próxima ação e participação explícita."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            {pautas.slice(0, 3).map((pauta: any) => (
              <HubCard
                key={pauta.slug}
                href={`/comun/pautas/${pauta.slug}`}
                label={`Pauta · ${pauta.public_status ?? pauta.status}`}
                title={pauta.title}
                summary={pauta.public_synthesis ?? pauta.summary}
                meta={
                  pauta.next_step ? `Próxima etapa: ${pauta.next_step}` : null
                }
              />
            ))}
          </div>
          <div className="border-2 border-comun-paper/35 p-5">
            <p className="text-xs font-black uppercase text-comun-yellow">
              Ações confirmadas
            </p>
            <ul className="mt-4 divide-y-2 divide-comun-paper/20">
              {activeActions.map((action: any) => (
                <li className="py-4 first:pt-0" key={action.id}>
                  <Link
                    className="font-black uppercase underline decoration-2 underline-offset-4"
                    href={`/comun/acoes/${action.slug}`}
                  >
                    {action.title}
                  </Link>
                  <p className="mt-1 text-sm text-comun-paper/70">
                    {action.participation_public ?? action.objective_public}
                  </p>
                  {action.starts_at ? (
                    <p className="mt-2 text-xs font-bold uppercase text-comun-yellow">
                      {new Date(action.starts_at).toLocaleString("pt-BR")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            {!activeActions.length ? (
              <ComunEmptyState href="/comun/participar">
                Não há ações públicas confirmadas agora. Conheça outras formas
                de contribuir.
              </ComunEmptyState>
            ) : null}
          </div>
        </div>
      </HomeSection>

      <HomeSection
        title="Do território ao resultado"
        intro="A continuidade torna visível como uma contribuição se conecta a uma mudança e à memória pública."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ProcessStep
            title="Território"
            text="Sinais, lugares e necessidades situadas."
            href="/comun/territorios"
          />
          <ProcessStep
            title="Comunidade e pauta"
            text="Pessoas se organizam e definem a próxima etapa."
            href="/comun/pautas"
          />
          <ProcessStep
            title="Ferramenta e ação"
            text="Roda, mapa, observatório, protocolo ou mutirão."
            href="/comun/participar"
          />
          <ProcessStep
            title="Resultado e memória"
            text="O que foi feito, respondido e aprendido permanece acessível."
            href="/comun/resultados"
          />
        </div>
      </HomeSection>

      <HomeSection
        title="O que a comunidade construiu"
        intro="Resultados verificados, memória do território e produções culturais ligadas aos processos."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            {results.slice(0, 2).map((result: any) => (
              <HubCard
                key={result.id}
                href={
                  result.pauta
                    ? `/comun/pautas/${result.pauta.slug}`
                    : "/comun/resultados"
                }
                label={result.result_type}
                title={result.title}
                summary={result.public_summary}
              />
            ))}
            {!results.length ? (
              <ComunEmptyState href="/comun/resultados">
                Resultados verificados aparecem aqui quando uma pauta avança.
              </ComunEmptyState>
            ) : null}
          </div>
          <div className="border-2 border-comun-paper/35 p-5">
            <p className="text-xs font-black uppercase text-comun-yellow">
              Memória ligada ao processo
            </p>
            <ul className="mt-4 divide-y-2 divide-comun-paper/20">
              {experience.memory.slice(0, 3).map((item: any) => (
                <li className="py-4 first:pt-0" key={item.id}>
                  <Link
                    className="font-black underline decoration-2 underline-offset-4"
                    href={`/comun/acervo/${item.slug}`}
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-comun-paper/70">
                    {item.summary}
                  </p>
                </li>
              ))}
            </ul>
            {!experience.memory.length ? (
              <ComunEmptyState href="/comun/acervo">
                O acervo público receberá memórias revisadas e relacionadas a
                processos.
              </ComunEmptyState>
            ) : null}
          </div>
        </div>
      </HomeSection>

      <ComunSection className="pt-0">
        <div className="border-2 border-comun-yellow bg-comun-yellow p-6 text-comun-black sm:p-8">
          <Route aria-hidden="true" className="mb-5" />
          <h2 className="max-w-3xl text-3xl font-black uppercase leading-none sm:text-5xl">
            Comece pelo que você já sabe: um lugar, uma questão ou uma vontade
            de ajudar.
          </h2>
          <p className="mt-4 max-w-2xl">
            Você consegue explorar o COMUN sem cadastro. A conta só é pedida
            quando ela protege uma contribuição, uma participação ou o seu
            acompanhamento pessoal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/comun/participar"
              className="inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-black px-5 font-black uppercase text-comun-paper"
            >
              Ver formas de participar
            </Link>
            <Link
              href="/comun/entrar"
              className="inline-flex min-h-12 items-center border-2 border-comun-black px-5 font-black uppercase"
            >
              Entrar na minha área
            </Link>
          </div>
        </div>
      </ComunSection>
    </ComunShell>
  );
}

function AuthenticatedHome({
  center,
  experience,
  profile,
}: {
  center: any;
  experience: any;
  profile: any;
}) {
  const attention = center.inbox
    .filter((item: any) => !item.read_at)
    .sort((a: any, b: any) => priority(b.priority) - priority(a.priority));
  const hasPersonalContent =
    attention.length ||
    center.communities.length ||
    center.memberships.length ||
    center.actions.length ||
    center.results.length;
  return (
    <ComunShell>
      <ComunSection className="pb-4 pt-8">
        <h1 className="text-4xl font-black uppercase leading-none text-comun-paper sm:text-6xl">
          Bom te ver de volta
          {profile?.display_name ? `, ${profile.display_name}` : ""}.
        </h1>
        <p className="mt-3 max-w-2xl text-comun-paper/70">
          Sua área começa pelo que precisa de ação. O restante aparece somente
          quando ajuda a continuar.
        </p>
      </ComunSection>
      {attention.length ? (
        <ComunSection className="py-4">
          <div className="bg-comun-yellow p-5 text-comun-black sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-xs font-black uppercase">
                Precisa da sua atenção
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase leading-tight">
                {attention[0].title}
              </h2>
              <p className="mt-2">{attention[0].summary}</p>
            </div>
            <Link
              href={attention[0].action_url}
              className="mt-4 inline-flex min-h-12 shrink-0 items-center bg-comun-black px-5 font-black uppercase text-comun-paper sm:mt-0"
            >
              Abrir próxima ação
            </Link>
          </div>
        </ComunSection>
      ) : null}
      <ResumeJourneySection />
      <ComunSection className="py-4">
        <h2 className="mb-3 text-xl font-black text-comun-yellow">
          Continue de onde parou
        </h2>
        <ContinueMiniappCard />
      </ComunSection>
      <ComunSection className="py-4">
        <h2 className="mb-3 text-xl font-black text-comun-yellow">
          Ferramentas em atividade
        </h2>
        <MiniAppContextCard compact />
      </ComunSection>
      <div className="hidden md:block">
        <MyCommunitySummary compact memberships={center.communities} />
      </div>
      {center.memberships.length ? (
        <PriorityRail
          mobileHidden
          title="Pautas que acompanha"
          href="/comun/minha-participacao"
          action="Ver Minha área"
          rows={center.memberships.slice(0, 3).map((item: any) => ({
            id: item.id,
            title: item.pauta?.title,
            text: item.pauta?.next_step ?? item.pauta?.public_synthesis,
            href: `/comun/pautas/${item.pauta?.slug}`,
          }))}
        />
      ) : null}
      {center.actions.length ? (
        <PriorityRail
          title="Participe agora"
          href="/comun/participar"
          action="Ver oportunidades"
          rows={center.actions.slice(0, 3).map((item: any) => ({
            id: item.id,
            title: item.title,
            text: item.participation_public,
            href: `/comun/acoes/${item.slug}`,
          }))}
        />
      ) : null}
      {center.results.length ? (
        <PriorityRail
          title="Resultados"
          href="/comun/minha-participacao"
          action="Ver resultados"
          rows={center.results.slice(0, 3).map((item: any) => ({
            id: item.id,
            title: item.title,
            text: item.public_summary,
            href: `/comun/resultados`,
          }))}
        />
      ) : null}
      {experience.memory.length ? (
        <PriorityRail
          mobileHidden
          title="Memórias"
          href="/comun/acervo"
          action="Acessar memórias"
          rows={experience.memory.slice(0, 3).map((item: any) => ({
            id: item.id,
            title: item.title,
            text: item.summary,
            href: `/comun/acervo/${item.slug}`,
          }))}
        />
      ) : null}
      {!hasPersonalContent ? (
        <ComunSection>
          <div className="border-2 border-comun-yellow p-6">
            <h2 className="text-2xl font-black uppercase text-comun-yellow">
              Comece pelo seu território
            </h2>
            <p className="mt-3 max-w-2xl text-comun-paper/75">
              Sua área ainda está vazia. Explore um território, conheça uma
              comunidade ou acompanhe uma pauta; as próximas ações aparecerão
              aqui.
            </p>
            <div className="mt-5">
              <PrimaryLink href="/comun/explorar">Explorar</PrimaryLink>
            </div>
          </div>
        </ComunSection>
      ) : null}
    </ComunShell>
  );
}

function PriorityRail({
  title,
  rows,
  href,
  action,
  mobileHidden = false,
}: {
  title: string;
  rows: { id: string; title: string; text?: string; href: string }[];
  href: string;
  action: string;
  mobileHidden?: boolean;
}) {
  return (
    <ComunSection className={`py-5 ${mobileHidden ? "hidden md:block" : ""}`}>
      <header className="mb-3 flex items-end justify-between gap-4 border-b-2 border-comun-yellow pb-3">
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          {title}
        </h2>
        <Link className="text-sm font-black uppercase underline" href={href}>
          {action}
        </Link>
      </header>
      <div className="divide-y-2 divide-comun-black border-2 border-comun-black bg-comun-paper text-comun-black">
        {rows.map((row) => (
          <Link
            href={row.href}
            className="grid gap-2 p-4 hover:bg-comun-yellow sm:grid-cols-[1fr_2fr_auto] sm:items-center"
            key={row.id}
          >
            <strong className="uppercase">{row.title}</strong>
            <span className="text-sm text-comun-asphalt/75">{row.text}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </ComunSection>
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

function HomeSection({
  title,
  intro,
  children,
  className,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ComunSection className={className}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-comun-yellow pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase text-comun-yellow sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-comun-paper/75">{intro}</p>
        </div>
        <Check aria-hidden="true" className="text-comun-yellow" />
      </header>
      {children}
    </ComunSection>
  );
}

function PathCard({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col justify-between border-2 border-comun-paper/40 p-4 hover:border-comun-yellow hover:bg-comun-paper hover:text-comun-black"
    >
      <span className="text-xl font-black uppercase">{title}</span>
      <span className="flex items-end justify-between gap-4 text-sm">
        <span>{text}</span>
        <ArrowRight
          className="shrink-0 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function ProcessStep({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <article className="border-t-4 border-comun-yellow bg-comun-paper p-5 text-comun-black">
      <ComunStatus>{title}</ComunStatus>
      <p className="mt-4 min-h-16 text-lg font-bold leading-tight">{text}</p>
      <Link
        href={href}
        className="mt-5 inline-block font-black uppercase underline decoration-2 underline-offset-4"
      >
        Abrir
      </Link>
    </article>
  );
}
