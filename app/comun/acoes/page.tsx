import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { collectiveActionStatusLabels, collectiveActionTypeLabels, collectiveActionTypes, listPublicCollectiveActionFilters, listPublicCollectiveActions } from "@/lib/collective-actions";
import { CollectiveActionsPaused } from "@/components/collective-actions-paused";
import { collectiveActionsPreviewFixtures } from "@/lib/collective-actions-preview-fixtures";
import { getCollectiveActionsRelease } from "@/lib/collective-actions-release";
import { isCollectiveActionsPreviewFixturesEnabled } from "@/lib/collective-actions-release-contract";

export const dynamic = "force-dynamic";

const labels = collectiveActionTypeLabels;

export default async function CollectiveActionsPage({ searchParams }: { searchParams: Promise<{ territorio?: string; tipo?: string }> }) {
  const filters = await searchParams;
  const previewFixtures = isCollectiveActionsPreviewFixturesEnabled();
  const release = previewFixtures ? { enabled: false } : await getCollectiveActionsRelease();
  if (!previewFixtures && !release.enabled) return <CollectiveActionsPaused />;
  const [actions, options] = previewFixtures
    ? [collectiveActionsPreviewFixtures.filter((action) => (!filters.territorio || action.territory_label === filters.territorio) && (!filters.tipo || action.action_type === filters.tipo)), { territories: ["Território demonstração"], types: ["community_inspection", "mutual_aid"] }]
    : await Promise.all([listPublicCollectiveActions({ territory: filters.territorio, type: filters.tipo }), listPublicCollectiveActionFilters()]);
  const groups = [
    ["Ações abertas", actions.filter((action: any) => action.status === "open")],
    ["Em andamento", actions.filter((action: any) => ["active", "awaiting_result"].includes(action.status))],
    ["Próximas atividades", actions.filter((action: any) => action.starts_at && new Date(action.starts_at) > new Date())],
    ["Memórias concluídas", actions.filter((action: any) => action.status === "completed")],
  ] as const;
  return <ComunShell>
    <Section>
      <p className="text-xs font-black uppercase text-comun-yellow">Caderno coletivo em andamento</p>
      <h1 className="mt-2 text-4xl font-black uppercase text-comun-yellow">Ações coletivas</h1>
      <p className="mt-3 max-w-3xl text-comun-paper/75">Processos organizados para transformar relatos e pautas em passos reais: participar, dividir tarefas, acompanhar atualizações e preservar a memória.</p>
      <form className="mt-5 grid gap-3 border-y-2 border-comun-paper/20 py-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-black uppercase">Território<select name="territorio" defaultValue={filters.territorio ?? ""} className="min-h-11 border-2 border-comun-paper bg-comun-black px-2"><option value="">Todos</option>{options.territories.map((territory: string) => <option key={territory} value={territory}>{territory}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-black uppercase">Tipo<select name="tipo" defaultValue={filters.tipo ?? ""} className="min-h-11 border-2 border-comun-paper bg-comun-black px-2"><option value="">Todos</option>{collectiveActionTypes.filter((type) => options.types.includes(type)).map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select></label>
        <button className="self-end min-h-11 border-2 border-comun-yellow bg-comun-yellow px-4 font-black uppercase text-comun-black">Filtrar</button>
      </form>
    </Section>
    {groups.map(([title, rows]) => <Section key={title}>
      <h2 className="text-2xl font-black uppercase text-comun-yellow">{title}</h2>
      {rows.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{rows.map((action: any) => <ActionCard key={action.id} action={action} />)}</div> : <p className="mt-4 border-2 border-comun-paper/30 p-4 text-comun-paper/75">Nenhuma ação nesta parte do caderno por enquanto.</p>}
    </Section>)}
    <Section><Link href="/comun/participar" className="font-black uppercase text-comun-yellow underline">Encontrar outras formas de participar</Link></Section>
  </ComunShell>;
}

function ActionCard({ action }: { action: any }) {
  return <Link href={`/comun/acoes/${action.slug}`} className="border-2 border-comun-paper/35 p-5 transition hover:border-comun-yellow hover:bg-comun-paper/5">
    <p className="text-xs font-black uppercase text-comun-yellow">{(labels as Record<string, string>)[action.action_type] ?? action.action_type} · {(collectiveActionStatusLabels as Record<string, string>)[action.status] ?? action.status}</p>
    <h3 className="mt-2 text-xl font-black uppercase">{action.title}</h3>
    <p className="mt-2 text-sm text-comun-paper/75">{action.summary}</p>
    <p className="mt-4 text-xs font-bold text-comun-paper/60">{[action.territory_label, action.starts_at ? new Date(action.starts_at).toLocaleDateString("pt-BR") : null].filter(Boolean).join(" · ") || "Próximos passos em organização"}</p>
  </Link>;
}
