import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { resolveArchiveSubmissionReadiness, resolveArtworkSubmissionReadiness, resolveOralHistorySuggestionReadiness, resolveRadioContributionReadiness } from "@/lib/archive/cultural-curation-readiness";
import { culturalWorkStageLabels, formatCulturalWorkAge, projectCulturalCurationWorkItem, sortCulturalCurationWorklist, type CulturalCurationWorkItem } from "@/lib/archive/cultural-curation-worklist";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type DeskFilters = { tipo?: string; situacao?: string; busca?: string };
const typeLabels = { photo_or_document: "Foto/documento", art: "Arte", oral_history: "História Oral", radio: "Rádio" } as const;

export default async function CulturalCurationDesk({ searchParams }: { searchParams: Promise<DeskFilters> }) {
  const [session, filters] = await Promise.all([requireComunAdmin({ roles: ["admin", "editor"] }), searchParams]);
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const [photos, artworks, oralHistories, radio] = await Promise.all([
    db.from("comun_archive_submissions").select("id,submission_type,status,title_suggestion,description_suggestion,city,neighborhood,source_name,source_story,relationship_to_material,rights_state,publication_scope,reuse_permission,license_code,risk_level,archive_item_id,created_at,comun_archive_submission_assets(upload_status,comun_archive_assets(integrity_status,review_status))").order("created_at", { ascending: true }).limit(75),
    db.from("comun_archive_artwork_submissions" as never).select("id,public_protocol,submission_kind,title_suggestion,context_suggestion,territory_id,authorship_source,status,archive_item_id,rights_state,publication_scope,reuse_permission,license_code,created_at" as never).order("created_at" as never, { ascending: true }).limit(75),
    db.from("comun_archive_oral_history_suggestions").select("id,suggested_person_or_theme,story_summary,city,neighborhood,period_public,relationship_public,status,private_root_archive_item_id,created_at").order("created_at", { ascending: true }).limit(75),
    db.from("comun_radio_contributions").select("id,public_protocol,contribution_type,title_suggestion,context_suggestion,status,rights_state,publication_scope,reuse_permission,license_code,voice_source,material_source,private_root_kind,private_root_archive_item_id,created_at").order("created_at", { ascending: true }).limit(75),
  ]);
  if ([photos, artworks, oralHistories, radio].some((result) => result.error)) throw new Error("Não foi possível montar a mesa de curadoria.");
  const projected: Array<CulturalCurationWorkItem | null> = [];
  for (const row of photos.data ?? []) {
    const x = row as any;
    const confirmedOriginal = (x.comun_archive_submission_assets ?? []).some((link: any) => { const asset = Array.isArray(link.comun_archive_assets) ? link.comun_archive_assets[0] : link.comun_archive_assets; return link.upload_status === "confirmed" && asset?.integrity_status === "verified" && asset?.review_status === "approved"; });
    const readiness = resolveArchiveSubmissionReadiness(x, { confirmedOriginal, derivativesReady: !x.archive_item_id });
    projected.push(projectCulturalCurationWorkItem({ sourceType: "archive_submission", sourceId: x.id, specialization: "photo_or_document", title: x.title_suggestion || "Contribuição sem título", protocolOrLabel: `ACERVO-${x.id.slice(0, 8)}`, createdAt: x.created_at, territoryLabel: [x.city, x.neighborhood].filter(Boolean).join(" · ") || null, sourceStatus: x.status, attention: x.risk_level === "high" ? "high" : x.risk_level === "attention" ? "attention" : "normal", detailHref: `/comun/admin/acervo/contribuicoes/${x.id}`, rootHref: x.archive_item_id ? `/comun/admin/acervo/${x.archive_item_id}` : null, rootExists: Boolean(x.archive_item_id), readiness }));
  }
  for (const row of artworks.data ?? []) {
    const x = row as any; const readiness = resolveArtworkSubmissionReadiness(x, { explicitEditorialDecision: true, rootExists: Boolean(x.archive_item_id) });
    projected.push(projectCulturalCurationWorkItem({ sourceType: "artwork_submission", sourceId: x.id, specialization: "art", title: x.title_suggestion || "Contribuição de arte sem título", protocolOrLabel: x.public_protocol || `ARTE-${x.id.slice(0, 8)}`, createdAt: x.created_at, territoryLabel: null, sourceStatus: x.status, attention: "normal", detailHref: `/comun/admin/acervo/arte/contribuicoes/${x.id}`, rootHref: x.archive_item_id ? `/comun/admin/acervo/arte/${x.archive_item_id}` : null, rootExists: Boolean(x.archive_item_id), readiness }));
  }
  for (const row of oralHistories.data ?? []) {
    const x = row as any; const readiness = resolveOralHistorySuggestionReadiness(x, { explicitEditorialDecision: true, rootExists: Boolean(x.private_root_archive_item_id) });
    projected.push(projectCulturalCurationWorkItem({ sourceType: "oral_history_suggestion", sourceId: x.id, specialization: "oral_history", title: x.suggested_person_or_theme || "Sugestão sem título", protocolOrLabel: `HISTÓRIA-${x.id.slice(0, 8)}`, createdAt: x.created_at, territoryLabel: [x.city, x.neighborhood].filter(Boolean).join(" · ") || x.period_public || null, sourceStatus: x.status, attention: "normal", detailHref: `/comun/admin/acervo/historias-orais/sugestoes/${x.id}`, rootHref: x.private_root_archive_item_id ? `/comun/admin/acervo/historias-orais/${x.private_root_archive_item_id}` : null, rootExists: Boolean(x.private_root_archive_item_id), readiness }));
  }
  for (const row of radio.data ?? []) {
    const x = row as any; const readiness = resolveRadioContributionReadiness(x, { explicitEditorialDecision: true, rootExists: Boolean(x.private_root_archive_item_id) });
    const rootHref = x.private_root_archive_item_id && x.private_root_kind ? `/comun/admin/radio/${x.private_root_kind === "program" ? "programas" : "episodios"}/${x.private_root_archive_item_id}` : null;
    projected.push(projectCulturalCurationWorkItem({ sourceType: "radio_contribution", sourceId: x.id, specialization: "radio", title: x.title_suggestion || "Contribuição de Rádio sem título", protocolOrLabel: x.public_protocol || `RÁDIO-${x.id.slice(0, 8)}`, createdAt: x.created_at, territoryLabel: null, sourceStatus: x.status, attention: "normal", detailHref: x.contribution_type === "own_music" ? "/comun/admin/acervo/musica/observabilidade" : `/comun/admin/radio/contribuicoes/${x.id}`, rootHref, rootExists: Boolean(x.private_root_archive_item_id), readiness }));
  }
  const allItems = sortCulturalCurationWorklist(projected.filter((item): item is CulturalCurationWorkItem => Boolean(item)));
  const search = filters.busca?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const items = allItems.filter((item) => (!filters.tipo || item.specialization === filters.tipo) && (!filters.situacao || item.stage === filters.situacao) && (!search || `${item.title} ${item.protocolOrLabel}`.toLocaleLowerCase("pt-BR").includes(search)));
  const summary = { received: allItems.filter((x) => x.stage === "arrived").length, attention: allItems.filter((x) => ["needs_information", "needs_routing", "in_preparation"].includes(x.stage)).length, advance: allItems.filter((x) => x.stage === "can_become_draft").length, review: allItems.filter((x) => x.stage === "ready_for_review").length };
  return <AdminShell adminEmail={session.admin.email}>
    <header className="max-w-3xl"><p className="font-black uppercase tracking-wide text-comun-rust">Curadoria cultural</p><h1 className="mt-1 text-3xl font-black uppercase sm:text-4xl">Mesa de curadoria</h1><p className="mt-2 text-lg">O que chegou e qual é o próximo passo.</p><p className="mt-2 text-sm font-bold">Revisão editorial não significa publicação.</p></header>
    <section aria-label="Resumo do trabalho" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><Summary label="Recebidos" value={summary.received}/><Summary label="Precisam de atenção" value={summary.attention}/><Summary label="Podem avançar" value={summary.advance}/><Summary label="Prontos para revisão" value={summary.review}/></section>
    <form aria-label="Filtros da mesa" className="mt-6 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-[1fr_1fr_2fr_auto]">
      <label className="grid gap-1 text-sm font-bold">Tipo<select name="tipo" defaultValue={filters.tipo || ""}><option value="">Todos</option>{Object.entries(typeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-bold">Situação<select name="situacao" defaultValue={filters.situacao || ""}><option value="">Todas</option>{Object.entries(culturalWorkStageLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-bold">Buscar<input name="busca" defaultValue={filters.busca || ""} placeholder="Título ou protocolo"/></label><button className="self-end border-2 border-comun-black bg-comun-yellow px-4 py-2 font-black uppercase">Filtrar</button>
    </form>
    <p className="mt-5 text-sm font-bold" aria-live="polite">{items.length} {items.length === 1 ? "item encontrado" : "itens encontrados"}</p>
    <div className="mt-3 grid gap-4 xl:grid-cols-2">{items.map((item)=><article className="flex min-h-64 flex-col border-2 border-comun-black bg-white p-5" key={`${item.sourceType}-${item.sourceId}`}><div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase tracking-wide"><span>{typeLabels[item.specialization]} · {formatCulturalWorkAge(item.createdAt)}</span>{item.attention !== "normal" ? <span className="border border-comun-rust px-2 py-1 text-comun-rust">Precisa de atenção</span> : null}</div><h2 className="mt-3 text-xl font-black">{item.title}</h2><p className="mt-1 text-sm">{[item.protocolOrLabel,item.territoryLabel].filter(Boolean).join(" · ")}</p><p className="mt-4 font-black">{item.situationLabel}</p><p className="mt-1 text-sm">{item.situationDetail}</p><p className="mt-3 text-sm"><strong>Próximo passo:</strong> {item.nextActionLabel}</p><div className="mt-auto flex flex-wrap gap-2 pt-5"><Link className="border-2 border-comun-black bg-comun-yellow px-3 py-2 font-black" href={item.detailHref}>Abrir contribuição</Link>{item.rootHref?<Link className="border-2 border-comun-black px-3 py-2 font-black" href={item.rootHref}>Abrir rascunho privado</Link>:null}</div></article>)}</div>
    {!items.length?<section className="mt-6 border-2 border-comun-black bg-white p-6"><h2 className="text-xl font-black">Não encontramos itens com esses filtros.</h2><p className="mt-1">Ajuste os filtros ou volte à visão completa da mesa.</p><Link href="/comun/admin/curadoria" className="mt-4 inline-block font-black underline">Limpar filtros</Link></section>:null}
  </AdminShell>;
}
function Summary({label,value}:{label:string;value:number}){return <div className="border-2 border-comun-black bg-white p-4"><p className="text-3xl font-black">{value}</p><p className="text-sm font-black uppercase">{label}</p></div>}
