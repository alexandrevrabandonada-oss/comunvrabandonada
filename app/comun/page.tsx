import Link from "next/link";
import { ArrowRight, Check, MapPin, Route } from "lucide-react";
import { ComunShell, PrimaryLink } from "@/components/comun-shell";
import { ComunEmptyState, ComunSection, ComunStatus } from "@/components/comun-ui";
import { HubCard } from "@/components/hub-card";
import { getCentralExperience } from "@/lib/central-experience";
import { listPublicActions, listPublicResults, listPublicTerritories } from "@/lib/central-hub";
import { listPublicPautaSpaces } from "@/lib/pauta-spaces";

export const dynamic = "force-dynamic";

export default async function ComunHomePage() {
  const [pautas, actions, results, territories, experience] = await Promise.all([
    listPublicPautaSpaces(),
    listPublicActions(6),
    listPublicResults(4),
    listPublicTerritories(),
    getCentralExperience(),
  ]);
  const activeActions = actions.filter((action: any) => action.status !== "completed").slice(0, 3);
  const featuredTerritory = territories[0];
  const featuredPauta = pautas[0];

  return <ComunShell>
    <ComunSection className="pb-7 pt-8 sm:pt-12">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
        <div>
          <p className="mb-4 inline-flex border-2 border-comun-yellow px-2 py-1 text-xs font-black uppercase text-comun-yellow">Plataforma comunitária de Volta Redonda</p>
          <h1 className="max-w-5xl text-4xl font-black uppercase leading-[.92] tracking-[-.04em] text-comun-paper sm:text-6xl lg:text-7xl">Organize seu território. Construa soluções coletivamente.</h1>
          <p className="mt-5 max-w-2xl text-lg text-comun-paper/80">Do que acontece na rua à memória que permanece: encontre uma comunidade, acompanhe uma pauta e escolha uma contribuição concreta.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <PrimaryLink href="/comun/territorios">Explorar o território</PrimaryLink>
            <Link href="/comun/participar" className="inline-flex min-h-12 items-center justify-center border-2 border-comun-yellow px-5 py-3 text-center text-sm font-black uppercase text-comun-yellow">Participar de uma ação</Link>
            <Link href="/comun/entrar" className="inline-flex min-h-12 items-center justify-center px-2 text-sm font-black uppercase text-comun-paper underline decoration-2 underline-offset-4">Entrar ou criar conta</Link>
          </div>
        </div>
        <aside className="border-2 border-comun-yellow bg-comun-paper p-5 text-comun-black">
          <p className="text-xs font-black uppercase text-comun-concrete">Como o COMUN se organiza</p>
          <ol className="mt-4 grid gap-3 text-sm font-black uppercase">
            {[["1", "Território", "onde o assunto acontece"], ["2", "Comunidade", "quem constrói junto"], ["3", "Pauta", "o processo acompanhado"], ["4", "Ação", "o próximo passo possível"], ["5", "Memória", "o que fica público"]].map(([number, title, description]) => <li className="grid grid-cols-[2rem_1fr] gap-3 border-t-2 border-comun-black pt-3 first:border-t-0 first:pt-0" key={number}><span className="grid size-7 place-items-center bg-comun-yellow text-comun-black">{number}</span><span>{title}<small className="ml-2 font-normal normal-case text-comun-concrete">{description}</small></span></li>)}
          </ol>
        </aside>
      </div>
    </ComunSection>

    <ComunSection className="pt-0">
      <div className="grid border-y-2 border-comun-paper/30 lg:grid-cols-[.9fr_1.1fr]">
        <section className="border-b-2 border-comun-paper/30 p-5 lg:border-b-0 lg:border-r-2">
          <p className="text-xs font-black uppercase text-comun-yellow">Seu contexto de partida</p>
          <div className="mt-4 flex gap-3"><MapPin className="mt-1 shrink-0 text-comun-yellow" aria-hidden="true"/><div><h2 className="text-2xl font-black uppercase">{featuredTerritory?.name ?? "Conheça os territórios"}</h2><p className="mt-2 text-comun-paper/75">{featuredTerritory?.public_summary ?? "Escolha um lugar para ver pautas, ações, resultados e memórias conectadas."}</p></div></div>
          <Link className="mt-5 inline-flex items-center gap-2 font-black uppercase text-comun-yellow underline decoration-2 underline-offset-4" href={featuredTerritory ? `/comun/territorios/${featuredTerritory.slug}` : "/comun/territorios"}>Abrir território <ArrowRight size={17} aria-hidden="true"/></Link>
        </section>
        <section className="bg-comun-yellow p-5 text-comun-black">
          <p className="text-xs font-black uppercase">Próximo passo coletivo</p>
          <h2 className="mt-3 text-2xl font-black leading-tight">{featuredPauta?.next_step ?? "Encontre uma pauta e escolha como participar"}</h2>
          <p className="mt-2 max-w-2xl">{featuredPauta?.public_synthesis ?? featuredPauta?.summary ?? "Você pode acompanhar uma pauta, contribuir numa roda ou ajudar numa ação. Não é preciso criar conta para começar a explorar."}</p>
          <Link className="mt-5 inline-flex min-h-11 items-center bg-comun-black px-4 font-black uppercase text-comun-paper" href={featuredPauta ? `/comun/pautas/${featuredPauta.slug}` : "/comun/pautas"}>{featuredPauta ? "Ver pauta e próximos passos" : "Explorar pautas"}</Link>
        </section>
      </div>
    </ComunSection>

    <HomeSection title="Encontre seu caminho" intro="Cinco entradas principais. Os outros módulos permanecem disponíveis como ferramentas do processo.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PathCard href="/comun/comunidades" title="Comunidades" text="Conheça coletivos, grupos e vínculos por território." />
        <PathCard href="/comun/pautas" title="Pautas" text="Acompanhe um problema do debate ao encaminhamento." />
        <PathCard href="/comun/participar" title="Participar" text="Escolha uma contribuição pelo tempo e consequência." />
        <PathCard href="/comun/territorios" title="Territórios" text="Veja o que está em movimento em cada lugar." />
        <PathCard href="/comun/minha-participacao" title="Minha área" text="Retome ações, tarefas, contribuições e resultados." />
        <PathCard href="/comun/buscar" title="Buscar" text="Localize processos e memórias públicas sem ranking de popularidade." />
      </div>
    </HomeSection>

    <HomeSection title="O que está em movimento" intro="Pautas em curso e ações com participação explícita.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4">{pautas.slice(0, 2).map((pauta: any) => <HubCard key={pauta.id} href={`/comun/pautas/${pauta.slug}`} label={`Pauta · ${pauta.public_status ?? pauta.status}`} title={pauta.title} summary={pauta.public_synthesis ?? pauta.summary} meta={pauta.next_step ? `Próxima etapa: ${pauta.next_step}` : null} />)}</div>
        <div className="border-2 border-comun-paper/35 p-5"><p className="text-xs font-black uppercase text-comun-yellow">Ações confirmadas</p><ul className="mt-4 divide-y-2 divide-comun-paper/20">{activeActions.map((action: any) => <li className="py-4 first:pt-0" key={action.id}><Link className="font-black uppercase underline decoration-2 underline-offset-4" href={`/comun/acoes/${action.slug}`}>{action.title}</Link><p className="mt-1 text-sm text-comun-paper/70">{action.participation_public ?? action.objective_public}</p>{action.starts_at ? <p className="mt-2 text-xs font-bold uppercase text-comun-yellow">{new Date(action.starts_at).toLocaleString("pt-BR")}</p> : null}</li>)}</ul>{!activeActions.length ? <ComunEmptyState href="/comun/participar">Não há ações públicas confirmadas agora. Conheça outras formas de contribuir.</ComunEmptyState> : null}</div>
      </div>
    </HomeSection>

    <HomeSection title="Do território ao resultado" intro="A continuidade torna visível como uma contribuição se conecta a uma mudança e à memória pública.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProcessStep title="Território" text="Sinais, lugares e necessidades situadas." href="/comun/territorios" />
        <ProcessStep title="Comunidade e pauta" text="Pessoas se organizam e definem a próxima etapa." href="/comun/pautas" />
        <ProcessStep title="Ferramenta e ação" text="Roda, mapa, observatório, protocolo ou mutirão." href="/comun/participar" />
        <ProcessStep title="Resultado e memória" text="O que foi feito, respondido e aprendido permanece acessível." href="/comun/resultados" />
      </div>
    </HomeSection>

    <HomeSection title="Resultados e memória recente" intro="Mudanças verificadas e registros que ajudam a comunidade a continuar.">
      <div className="grid gap-4 lg:grid-cols-2"><div className="grid gap-4">{results.slice(0, 2).map((result: any) => <HubCard key={result.id} href={result.pauta ? `/comun/pautas/${result.pauta.slug}` : "/comun/resultados"} label={result.result_type} title={result.title} summary={result.public_summary} />)}{!results.length ? <ComunEmptyState href="/comun/resultados">Resultados verificados aparecem aqui quando uma pauta avança.</ComunEmptyState> : null}</div><div className="border-2 border-comun-paper/35 p-5"><p className="text-xs font-black uppercase text-comun-yellow">Memória ligada ao processo</p><ul className="mt-4 divide-y-2 divide-comun-paper/20">{experience.memory.slice(0, 3).map((item: any) => <li className="py-4 first:pt-0" key={item.id}><Link className="font-black underline decoration-2 underline-offset-4" href={`/comun/acervo/${item.slug}`}>{item.title}</Link><p className="mt-1 text-sm text-comun-paper/70">{item.summary}</p></li>)}</ul>{!experience.memory.length ? <ComunEmptyState href="/comun/acervo">O acervo público receberá memórias revisadas e relacionadas a processos.</ComunEmptyState> : null}</div></div>
    </HomeSection>

    <ComunSection className="pt-0"><div className="border-2 border-comun-yellow bg-comun-yellow p-6 text-comun-black sm:p-8"><Route aria-hidden="true" className="mb-5"/><h2 className="max-w-3xl text-3xl font-black uppercase leading-none sm:text-5xl">Comece pelo que você já sabe: um lugar, uma questão ou uma vontade de ajudar.</h2><p className="mt-4 max-w-2xl">Você consegue explorar o COMUN sem cadastro. A conta só é pedida quando ela protege uma contribuição, uma participação ou o seu acompanhamento pessoal.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/comun/participar" className="inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-black px-5 font-black uppercase text-comun-paper">Ver formas de participar</Link><Link href="/comun/entrar" className="inline-flex min-h-12 items-center border-2 border-comun-black px-5 font-black uppercase">Entrar na minha área</Link></div></div></ComunSection>
  </ComunShell>;
}

function HomeSection({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <ComunSection><header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-comun-yellow pb-4"><div><h2 className="text-2xl font-black uppercase text-comun-yellow sm:text-3xl">{title}</h2><p className="mt-2 max-w-3xl text-comun-paper/75">{intro}</p></div><Check aria-hidden="true" className="text-comun-yellow" /></header>{children}</ComunSection>;
}

function PathCard({ href, title, text }: { href: string; title: string; text: string }) {
  return <Link href={href} className="group flex min-h-40 flex-col justify-between border-2 border-comun-paper/40 p-4 hover:border-comun-yellow hover:bg-comun-paper hover:text-comun-black"><span className="text-xl font-black uppercase">{title}</span><span className="flex items-end justify-between gap-4 text-sm"><span>{text}</span><ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></Link>;
}

function ProcessStep({ title, text, href }: { title: string; text: string; href: string }) {
  return <article className="border-t-4 border-comun-yellow bg-comun-paper p-5 text-comun-black"><ComunStatus>{title}</ComunStatus><p className="mt-4 min-h-16 text-lg font-bold leading-tight">{text}</p><Link href={href} className="mt-5 inline-block font-black uppercase underline decoration-2 underline-offset-4">Abrir</Link></article>;
}
