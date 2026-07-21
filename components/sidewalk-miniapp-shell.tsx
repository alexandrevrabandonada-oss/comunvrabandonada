import Link from "next/link";
import type {ReactNode} from "react";
import {ArrowLeft, MapPinned} from "lucide-react";

const localNavigation = [
  {href:"/comun/calcadas",label:"Mapa"},
  {href:"/comun/calcadas/prioridades",label:"Prioridades"},
  {href:"/comun/calcadas/mobilizacao",label:"Mobilização"},
  {href:"/comun/calcadas/resultados",label:"Resultados"},
] as const;

export function MiniAppExperienceShell({children,active="mapa",count=0,community="Comunidade vinculada",coverage="Cobertura comunitária",status="Em demonstração local"}:{children:ReactNode;active?:"mapa"|"prioridades"|"mobilizacao"|"resultados";count?:number;community?:string|null;coverage?:string|null;status?:string|null}) {
  return <div className="min-h-screen bg-[#f4f1e8] text-comun-black">
    <header className="border-b-2 border-comun-black bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center border-2 border-comun-black bg-comun-yellow"><MapPinned size={23}/></span>
          <div className="min-w-0">
            <Link href="/comun/pautas/calcadas-em-circulacao" className="inline-flex items-center gap-1 text-xs font-bold underline"><ArrowLeft size={14}/> Pauta Calçadas em circulação</Link>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">Calçadas de Volta Redonda</h1>
            <p className="mt-1 text-sm text-comun-black/70">{count} registros publicados · {coverage}</p>
          </div>
        </div>
        <Link href="/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao" className="inline-flex min-h-11 items-center justify-center border-2 border-comun-black bg-comun-yellow px-5 font-black shadow-[3px_3px_0_#0b0b0a]">Registrar calçada</Link>
      </div>
      <div className="border-t border-comun-black/20 bg-[#f4f1e8]">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-1 px-4 py-2 text-xs">
          <span><strong>Território:</strong> Volta Redonda</span><span><strong>Comunidade:</strong> {community}</span><span><strong>Status:</strong> {status}</span><Link href="/comun/minha-participacao" className="ml-auto font-bold underline">Acompanhar em Minha área</Link>
        </div>
      </div>
    </header>
    <nav aria-label="Navegação do Mapa das Calçadas" className="sticky top-[58px] z-20 border-b-2 border-comun-black bg-comun-black text-white md:top-[61px]">
      <div className="mx-auto flex max-w-7xl overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">{localNavigation.map(item=><Link key={item.href} href={item.href} aria-current={item.href.endsWith(active==="mapa"?"/calcadas":`/${active}`)?"page":undefined} className={`min-h-12 whitespace-nowrap border-b-4 px-4 py-3 text-sm font-bold ${item.href.endsWith(active==="mapa"?"/calcadas":`/${active}`)?"border-comun-yellow text-comun-yellow":"border-transparent text-white/80 hover:text-white"}`}>{item.label}</Link>)}</div>
    </nav>
    {children}
  </div>;
}

export function MiniAppPage({title,intro,children}:{title:string;intro:string;children:ReactNode}) {return <section className="mx-auto max-w-7xl px-4 py-7"><div className="max-w-3xl"><h2 className="text-3xl font-black leading-tight sm:text-4xl">{title}</h2><p className="mt-2 text-comun-black/70">{intro}</p></div><div className="mt-6">{children}</div></section>}

export function CoverageNotice({children}:{children:ReactNode}) {return <p className="border-l-4 border-comun-yellow bg-comun-black p-4 text-sm text-white">{children}</p>}
export function SidewalkTimeline({events}:{events:{label:string;date?:string|null;active?:boolean}[]}){return <ol className="grid gap-3">{events.map((event,index)=><li key={`${event.label}-${index}`} className="grid grid-cols-[1.5rem_1fr] gap-3"><span aria-hidden="true" className={`mt-1 size-4 rounded-full border-2 border-comun-black ${event.active?"bg-comun-yellow":"bg-white"}`}/><div><strong>{event.label}</strong>{event.date?<time className="ml-2 text-sm" dateTime={event.date}>{new Date(event.date).toLocaleDateString("pt-BR")}</time>:null}</div></li>)}</ol>}

// Compatibilidade temporária para fichas já publicadas.
export const MiniAppShell=({children}:{children:ReactNode})=><main className="min-h-screen bg-[#f4f1e8] text-comun-black">{children}</main>;
export const MiniAppPrimaryAction=({href,children}:{href:string;children:ReactNode})=><Link href={href} className="inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black">{children}</Link>;
export const MiniAppHeader=({title,summary}:{title:string;summary:string})=><header className="border-b-2 bg-white px-4 py-5"><div className="mx-auto max-w-7xl"><h1 className="text-3xl font-black">{title}</h1><p className="mt-2">{summary}</p></div></header>;
export const MiniAppNavigation=()=>null;
