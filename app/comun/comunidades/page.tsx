import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { listCommunities } from "@/lib/comun-data";
import { filterCommunityExperiences, listCommunityExperiences } from "@/lib/community-experience";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage({searchParams}:{searchParams:Promise<{q?:string;tipo?:string;tema?:string;acao?:string}>}) {
  const p=await searchParams;
  const [communities,experiences]=await Promise.all([listCommunities(),Promise.resolve(listCommunityExperiences())]);
  const filtered=filterCommunityExperiences(experiences,p.q??"",p.tipo??"",p.tema??"",p.acao==="aberta");
  const bySlug=new Map(communities.map(x=>[x.slug,x]));
  return <ComunShell><Section>
    <p className="text-xs font-black uppercase text-comun-yellow">Comunidades vivas · descobrir sem cadastro</p><h1 className="mt-2 text-4xl font-black uppercase text-comun-yellow sm:text-6xl">Comunidades</h1>
    <p className="mt-3 max-w-3xl text-comun-paper/75">Comunidades são casas organizativas persistentes. Encontre uma pelo território, tema ou ação que precisa acontecer agora.</p>
    <form className="mt-6 grid gap-3 border-y-2 border-comun-paper/25 py-5 md:grid-cols-[2fr_1fr_1fr_auto]">
      <label className="grid gap-1 text-xs font-black uppercase">Buscar comunidade<input name="q" defaultValue={p.q} placeholder="Nome, propósito ou território" className="min-h-12 border-2 bg-white px-3 text-base font-normal normal-case text-comun-black"/></label>
      <label className="grid gap-1 text-xs font-black uppercase">Tipo<select name="tipo" defaultValue={p.tipo??""} className="min-h-12 border-2 bg-white px-3 text-base font-normal normal-case text-comun-black"><option value="">Todos</option><option value="territorial">Territorial</option><option value="thematic">Temática</option></select></label>
      <label className="grid gap-1 text-xs font-black uppercase">Tema<select name="tema" defaultValue={p.tema??""} className="min-h-12 border-2 bg-white px-3 text-base font-normal normal-case text-comun-black"><option value="">Todos</option><option value="trabalho">Trabalho</option><option value="educação">Educação</option><option value="saúde">Saúde</option><option value="meio ambiente">Meio ambiente</option><option value="mobilidade">Mobilidade</option></select></label>
      <div className="flex flex-wrap items-end gap-2"><button className="min-h-12 bg-comun-yellow px-4 font-black uppercase text-comun-black">Filtrar</button><Link href="/comun/comunidades" className="inline-flex min-h-12 items-center px-2 font-black underline">Limpar</Link></div>
      <label className="flex min-h-11 items-center gap-2 md:col-span-4"><input type="checkbox" name="acao" value="aberta" defaultChecked={p.acao==="aberta"}/> Somente comunidades com ação aberta</label>
    </form>
    <p role="status" className="mt-4 text-sm">{filtered.length} comunidades encontradas. A ordem é editorial, sem ranking ou popularidade.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{filtered.map(experience=>{const community=bySlug.get(experience.slug);if(!community)return null;return <Link key={community.slug} href={`/comun/c/${community.slug}`} className="industrial-border paper-panel flex min-h-[18rem] flex-col p-5">
      <div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center bg-comun-black text-sm font-black text-comun-yellow">{community.icon}</span><span className="border-2 border-comun-black px-2 py-1 text-xs font-black uppercase">{experience.kind==="territorial"?"Territorial":"Temática"} · {experience.state}</span></div>
      <h2 className="mt-4 text-2xl font-black uppercase">{community.name}</h2><p className="mt-2 text-sm text-comun-asphalt/75">{experience.purpose}</p>
      <dl className="mt-4 grid gap-2 text-sm"><div><dt className="font-black uppercase">Território ou tema</dt><dd>{experience.territory} · {experience.themes.join(" · ")}</dd></div><div><dt className="font-black uppercase">Próxima ação</dt><dd>{experience.nextAction}</dd></div>{experience.nextActivity?<div><dt className="font-black uppercase">Atividade próxima</dt><dd>{experience.nextActivity.title} · {experience.nextActivity.dateLabel}</dd></div>:null}</dl>
      <span className="mt-auto pt-5 font-black uppercase text-comun-rust">Abrir comunidade →</span>
    </Link>})}</div>
    {!filtered.length?<div className="mt-6 border-2 border-comun-yellow p-5"><h2 className="font-black uppercase text-comun-yellow">Nenhuma comunidade com esses filtros</h2><p className="mt-2">Limpe um filtro, explore pautas ou conheça formas de participação.</p><div className="mt-4 flex gap-4"><Link href="/comun/comunidades" className="font-black underline">Limpar filtros</Link><Link href="/comun/participar" className="font-black underline">Como participar</Link></div></div>:null}
  </Section></ComunShell>;
}
