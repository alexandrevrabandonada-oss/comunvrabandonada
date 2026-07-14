import Link from "next/link";
import { AlertTriangle, Archive, ArrowRight, Megaphone, Shield, ShieldCheck, type LucideIcon } from "lucide-react";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { listPublicDossierFeatures } from "@/lib/pauta-dossiers";
import { StatusLabel } from "@/components/status-label";
import { getArchiveHomeFeatures } from "@/lib/archive";

export const dynamic = "force-dynamic";

export default async function ComunHome() {
  const [communities, issues, featuredDossiers, archive] = await Promise.all([listCommunities(), listIssues(), listPublicDossierFeatures(), getArchiveHomeFeatures()]);
  const quickLinks = [
    ["Buraco ou calcada", "/comun/relatar?comunidade=cidade"],
    ["Lixo ou entulho", "/comun/relatar?comunidade=cidade"],
    ["Poluicao ou po preto", "/comun/relatar?comunidade=meio-ambiente"],
    ["Escola", "/comun/relatar?comunidade=escolas"],
    ["Saude", "/comun/relatar?comunidade=saude"],
    ["Trabalho", "/comun/relatar?comunidade=trabalho&pauta=trabalho-burnout-volta-redonda"],
  ] as const;

  return (
    <ComunShell>
      <Section className="pb-6 pt-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-end">
          <div>
            <p className="font-black uppercase tracking-[0.08em] text-comun-yellow">COMUN VR ABANDONADA</p>
            <p className="mt-3 text-sm font-bold uppercase text-comun-paper/78 sm:text-base">
              Relatos, debates e memoria coletiva da cidade.
            </p>
            <h1 className="comun-prose mt-4 max-w-3xl text-2xl font-black uppercase leading-[0.95] text-comun-paper min-[390px]:text-4xl sm:text-6xl">
              O problema que parece isolado pode ser coletivo.
            </h1>
            <p className="comun-prose mt-5 max-w-2xl text-base text-comun-paper/82 sm:text-lg">
              Relate com seguranca, acompanhe outras denuncias e ajude a organizar a memoria popular de Volta Redonda.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryLink href="/comun/relatar">Enviar relato agora</PrimaryLink>
              <p className="max-w-sm text-sm text-comun-paper/70">
                Voce pode relatar de forma anonima. Antes de publicar, removemos dados sensiveis.
              </p>
            </div>
          </div>
          <div className="industrial-border bg-comun-paper p-5 text-comun-black">
            <p className="text-sm font-black uppercase">Relatar. Confirmar. Organizar. Transformar em acao.</p>
            <div className="mt-5 grid gap-3">
              {["Relato bruto fica interno", "Publicacao so com curadoria", "Contato privado nunca e publico"].map((item) => (
                <div key={item} className="flex items-start gap-3 border-2 border-comun-black bg-white/50 p-3">
                  <ShieldCheck className="mt-0.5 text-comun-green" size={20} />
                  <span className="comun-prose text-sm font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="border-y-2 border-comun-yellow bg-comun-black px-4 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black uppercase text-comun-yellow sm:text-2xl">
                Relate um problema em poucos passos
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-comun-paper/72">
                Escolha um atalho para entrar no formulario com o tema mais proximo do seu caso.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {quickLinks.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="inline-flex min-h-11 items-center justify-center border border-comun-yellow px-3 py-2 text-center text-xs font-black uppercase text-comun-paper transition hover:bg-comun-yellow hover:text-comun-black"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div><p className="font-black uppercase text-comun-yellow">Acervo vivo</p><h2 className="mt-1 text-2xl font-black uppercase text-comun-paper">Memoria viva da cidade</h2><p className="mt-2 max-w-2xl text-sm text-comun-paper/72">Fotografias, colecoes e trajetorias locais publicadas com revisao de fonte e direitos.</p></div>
          <PrimaryLink href="/comun/acervo">Explorar o Acervo</PrimaryLink>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {archive.photo ? <Link href={`/comun/acervo/${archive.photo.slug}`} className="paper-panel border-2 border-comun-black p-4"><p className="text-xs font-black uppercase text-comun-rust">Fotografia em destaque</p><h3 className="mt-2 font-black uppercase">{archive.photo.title}</h3></Link> : null}
          {archive.collection ? <Link href={`/comun/acervo/colecoes/${archive.collection.slug}`} className="paper-panel border-2 border-comun-black p-4"><p className="text-xs font-black uppercase text-comun-rust">Colecao</p><h3 className="mt-2 font-black uppercase">{archive.collection.title}</h3></Link> : null}
          {archive.artist ? <Link href={`/comun/acervo/${archive.artist.slug}`} className="paper-panel border-2 border-comun-black p-4"><p className="text-xs font-black uppercase text-comun-rust">Artista local</p><h3 className="mt-2 font-black uppercase">{archive.artist.title}</h3></Link> : null}
          {!archive.photo && !archive.collection && !archive.artist ? <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/72 md:col-span-3">O primeiro recorte do acervo esta em preparacao.</p> : null}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black uppercase text-comun-yellow">Dossies em destaque</h2>
            <p className="mt-2 max-w-2xl text-sm text-comun-paper/72">Leituras publicas selecionadas a partir de snapshots ativos.</p>
          </div>
          <Link href="/comun/dossies" className="inline-flex min-h-11 items-center justify-center border-2 border-comun-yellow px-4 py-2 text-sm font-black uppercase text-comun-yellow">Ver todos</Link>
        </div>
        {featuredDossiers.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {featuredDossiers.slice(0, 3).map((feature) => (
              <Link key={feature.id} href={`/comun/dossies/${feature.snapshot.public_slug}`} className="paper-panel border-2 border-comun-black p-4">
                <p className="text-xs font-black uppercase text-comun-rust">{feature.public_label || "Destaque publico"}</p>
                <h3 className="comun-prose mt-2 font-black uppercase">{feature.snapshot.public_title}</h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{feature.public_note || feature.snapshot.public_summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/72">Ainda nao ha dossies em destaque.</p>
        )}
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Comunidades iniciais</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {communities.map((community) => (
            <Link
              key={community.slug}
              href={`/comun/c/${community.slug}`}
              className="industrial-border paper-panel flex min-h-[14rem] flex-col p-4"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center bg-comun-black text-sm font-black text-comun-yellow">
                {community.icon}
              </div>
              <h3 className="comun-prose font-black uppercase leading-tight">{community.name}</h3>
              <p className="comun-prose mt-3 text-sm text-comun-asphalt/75">{community.shortDescription}</p>
              <span className="mt-auto pt-5 text-sm font-black uppercase text-comun-rust">Relatar neste tema</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Pautas em acompanhamento</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {issues.map((issue) => (
            <Link key={issue.slug} href={`/comun/pautas/${issue.slug}`} className="paper-panel block border-2 border-comun-black p-4">
              <StatusLabel value={issue.status} />
              <h3 className="comun-prose mt-3 text-xl font-black uppercase">{issue.title}</h3>
              <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{issue.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-black uppercase text-comun-yellow">Como funciona</h2>
          <PrimaryLink href="/comun/relatar">Enviar relato agora</PrimaryLink>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {([
            ["Voce relata", "Conte do seu jeito, sem cadastro obrigatorio.", Megaphone],
            ["A comunidade confirma", "Relatos parecidos ajudam a revelar padroes.", AlertTriangle],
            ["O caso vira pauta, post, dossie ou acao", "A equipe organiza o caso com curadoria antes de qualquer publicacao.", Archive],
          ] satisfies Array<[string, string, LucideIcon]>).map(([title, text, Icon]) => (
            <div key={String(title)} className="border-2 border-comun-yellow bg-comun-black p-5">
              <Icon className="text-comun-yellow" size={28} />
              <h3 className="mt-4 text-xl font-black uppercase">{title}</h3>
              <p className="mt-2 text-sm text-comun-paper/75">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="industrial-border bg-comun-paper p-5 text-comun-black">
            <div className="flex items-start gap-3">
              <Shield className="mt-1 text-comun-rust" size={24} />
              <div>
                <h2 className="text-2xl font-black uppercase">Seguranca e anonimato primeiro</h2>
                <p className="comun-prose mt-3 max-w-2xl text-sm font-medium text-comun-asphalt/80">
                  O COMUN nao e um mural aberto. Relatos entram primeiro em fluxo interno, passam por revisao e
                  so podem aparecer publicamente em versao sanitizada.
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/comun/seguranca"
            className="inline-flex min-h-12 items-center justify-center gap-2 border-2 border-comun-yellow bg-comun-black px-5 py-3 text-sm font-black uppercase text-comun-yellow"
          >
            Como protegemos relatos
            <ArrowRight size={18} />
          </Link>
        </div>
      </Section>

      <Section className="pt-2">
        <div className="border-t-2 border-comun-yellow py-6">
          <p className="text-center text-xl font-black uppercase text-comun-yellow sm:text-2xl">
            Escutar. Cuidar. Organizar.
          </p>
        </div>
      </Section>
    </ComunShell>
  );
}
