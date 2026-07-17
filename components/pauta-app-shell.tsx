import Link from "next/link";
import { CalendarDays, CircleDot, FileText, ListTodo, Map, Radio, Sparkles } from "lucide-react";
import type { PublicPautaModule } from "@/lib/pauta-miniapps";
import type { PublicPautaSpace } from "@/lib/pauta-spaces";
import { submitCircleContributionAction } from "@/app/actions";
import { ArtworkModule } from "@/components/artwork-module";
import { RadioModule } from "@/components/radio-module";
import { ComunContinuityTimeline } from "@/components/comun-continuity-timeline";
import { SidewalkMapModule } from "@/components/sidewalk-map-module";

const icons = { overview: Sparkles, construction_circle: CircleDot, reports: FileText, evidence: FileText, map: Map, observatory: Radio, metrics: Sparkles, documents: FileText, timeline: CalendarDays, proposals: FileText, actions: ListTodo, tasks: ListTodo, calendar: CalendarDays, results: Sparkles, archive: FileText, participation: CircleDot, art_gallery: Sparkles, community_radio: Radio } as const;
const publicTitles = { overview: "Entenda", construction_circle: "Converse", reports: "Relatos", evidence: "Evidências", map: "Mapa", observatory: "Dados", metrics: "Dados", documents: "Documentos", timeline: "Continuidade", proposals: "Propostas", actions: "Ações", tasks: "Tarefas", calendar: "Agenda", results: "Resultados", archive: "Memória", participation: "Participar", art_gallery: "Arte", community_radio: "Rádio" } as const;

export function PautaAppShell({ space, modules, circles, sidewalks }: { space: PublicPautaSpace; modules: PublicPautaModule[]; circles: any[]; sidewalks?: any }) {
  return <main className="bg-comun-paper text-comun-black"><section className="border-b-2 border-comun-black bg-comun-yellow"><div className="mx-auto max-w-6xl px-4 py-9 sm:py-14"><Link className="text-sm font-bold underline" href="/comun/pautas">Pautas</Link><h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl">{space.title}</h1><p className="mt-5 max-w-3xl text-lg font-medium">{space.summary}</p><dl className="mt-6 grid gap-3 sm:grid-cols-3"><div><dt className="text-xs font-black uppercase">Etapa atual</dt><dd>{space.public_status || space.status}</dd></div><div><dt className="text-xs font-black uppercase">Pergunta central</dt><dd>{space.problem_public || space.demand_public || space.summary}</dd></div><div><dt className="text-xs font-black uppercase">Próxima ação</dt><dd>{space.next_step || "Acompanhar a próxima atualização"}</dd></div></dl><div className="mt-6 flex flex-wrap gap-3 text-sm font-bold"><Link href="#participar" className="border-2 border-comun-black bg-comun-black px-3 py-2 text-comun-yellow">Participar da construção</Link><Link href="#continuidade" className="border-2 border-comun-black px-3 py-2">Ver continuidade</Link></div></div></section><nav aria-label="Módulos da pauta" className="sticky top-[58px] z-20 border-b border-comun-black bg-comun-paper"><div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 py-3 text-sm font-black uppercase">{modules.map(module => <a key={module.id} href={`#${module.module_type}`} className="whitespace-nowrap underline decoration-2 underline-offset-4">{module.title_override || publicTitles[module.module_type]}</a>)}</div></nav><div className="mx-auto max-w-6xl px-4">{modules.map(module => <PautaModuleSurface key={module.id} module={module} space={space} circles={circles} sidewalks={sidewalks} />)}<section id="continuidade" className="py-10"><h2 className="text-2xl font-black uppercase">Continuidade da pauta</h2><p className="mt-2">O que mudou, a consequência e como o processo segue.</p><div className="mt-4"><ComunContinuityTimeline pautaId={space.id} /></div></section></div></main>;
}

function PautaModuleSurface({ module, space, circles, sidewalks }: { module: PublicPautaModule; space: PublicPautaSpace; circles: any[]; sidewalks?: any }) {
  const Icon = icons[module.module_type]; const title = module.title_override || publicTitles[module.module_type];
  const circle = module.module_type === "construction_circle" ? circles[0] : null;
  const isSidewalkMap = module.module_type === "map" && (sidewalks?.records?.length || (module.config as any)?.layerIds?.includes("sidewalk_accessibility"));
  return <section id={module.module_type} className="scroll-mt-32 border-b-2 border-comun-black py-10 sm:py-14"><div className="flex gap-4"><Icon className="mt-1 shrink-0" aria-hidden="true" /><div className="min-w-0"><h2 className="text-2xl font-black uppercase">{title}</h2><p className="mt-2 max-w-3xl text-comun-black/75">{module.public_description || module.module_type === "overview" ? (module.public_description || space.public_synthesis || space.next_step || "Acompanhe as informações revisadas e as próximas ações desta pauta.") : "Este módulo será alimentado com conteúdo revisado pela curadoria."}</p>{circle ? <CirclePanel circle={circle} pautaSlug={space.slug} /> : isSidewalkMap ? <SidewalkMapModule pautaSlug={space.slug} surface={sidewalks} /> : module.module_type === "art_gallery" ? <ArtworkModule pautaId={space.id} config={module.config} /> : module.module_type === "community_radio" ? <RadioModule pautaId={space.id} config={module.config} /> : <ModuleEmptyState type={module.module_type} />}</div></div></section>;
}

function CirclePanel({ circle, pautaSlug }: { circle: any; pautaSlug: string }) {
  const rounds = Array.isArray(circle.comun_construction_circle_rounds) ? circle.comun_construction_circle_rounds : [];
  const synthesis = Array.isArray(circle.comun_circle_syntheses) ? circle.comun_circle_syntheses.find((item: any) => item.status === "published") : null;
  const current = rounds.find((round: any) => round.id === circle.current_round_id) || rounds.find((round: any) => round.status === "open");
  return (
    <div className="mt-6 border-2 border-comun-black bg-comun-asphalt p-5 text-comun-paper">
      <p className="text-xs font-black uppercase text-comun-yellow">Roda de construção</p>
      <h3 className="mt-2 text-xl font-black">{circle.title}</h3>
      <p className="mt-2">{circle.public_question}</p>
      {current && <div className="mt-4 border-l-4 border-comun-yellow pl-3"><p className="font-black uppercase">Rodada aberta: {current.title}</p><p className="mt-1 text-sm">{current.public_prompt}</p></div>}
      {synthesis && <div className="mt-4 bg-comun-paper p-4 text-comun-black"><p className="font-black uppercase">Síntese publicada</p><p className="mt-1">{synthesis.public_summary}</p>{synthesis.disagreements?.length ? <p className="mt-2 text-sm"><strong>Divergências preservadas:</strong> {synthesis.disagreements.join(" · ")}</p> : null}</div>}
      {current && (
        <form id="participar" action={submitCircleContributionAction} className="mt-5 grid gap-2">
          <input type="hidden" name="circle_id" value={circle.id} />
          <input type="hidden" name="round_id" value={current.id} />
          <input type="hidden" name="pauta_slug" value={pautaSlug} />
          <label className="text-sm font-bold">Como quer assinar?<input name="author_alias" className="mt-1 w-full border-2 border-comun-yellow bg-comun-paper p-2 text-comun-black" /></label>
          <label className="text-sm font-bold">Contribuição<textarea name="body" required minLength={24} className="mt-1 min-h-28 w-full border-2 border-comun-yellow bg-comun-paper p-2 text-comun-black" /></label>
          <label className="text-sm font-bold">Confirmação humana: quanto é 2 + 3?<input name="human_check" required inputMode="numeric" className="mt-1 w-full border-2 border-comun-yellow bg-comun-paper p-2 text-comun-black" /></label>
          <input name="company_website" className="hidden" tabIndex={-1} autoComplete="off" />
          <button type="submit" className="border-2 border-comun-yellow bg-comun-yellow px-4 py-2 font-black uppercase text-comun-black">Enviar</button>
        </form>
      )}
    </div>
  );
}

function ModuleEmptyState({ type }: { type: string }) { return <p className="mt-5 border-l-4 border-comun-yellow bg-comun-black px-4 py-3 text-sm font-bold text-comun-paper">{type.includes("future") ? "Integração em preparação: não há publicação pública nesta etapa." : "Sem itens públicos revisados neste momento."}</p>; }
