import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import {
  collectiveActionStatusLabels,
  collectiveActionTypeLabels,
  collectiveActionTypes,
  listPublicCollectiveActionFilters,
  listPublicCollectiveActions,
} from "@/lib/collective-actions";
import { CollectiveActionsPaused } from "@/components/collective-actions-paused";
import { collectiveActionsPreviewFixtures } from "@/lib/collective-actions-preview-fixtures";
import { getCollectiveActionsRelease } from "@/lib/collective-actions-release";
import { isCollectiveActionsPreviewFixturesEnabled } from "@/lib/collective-actions-release-contract";
import { ComunActionCard } from "@/components/comun-cards";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { isComunCollectiveActionsCanonicalExperienceEnabled } from "@/lib/comun-collective-actions-canonical-feature";
import {
  listPublicCollectiveActionsCanonical,
  projectPublicCollectiveActionSummary,
} from "@/lib/comun-collective-actions-canonical";
import { CollectiveActionsCanonicalIndex } from "@/components/comun-collective-actions-canonical";

export const dynamic = "force-dynamic";

const labels = collectiveActionTypeLabels;

export default async function CollectiveActionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    territorio?: string;
    tipo?: string;
    experiencia?: string;
  }>;
}) {
  const filters = await searchParams;
  const appV2 = isComunAppV2(filters.experiencia);
  const previewFixtures = isCollectiveActionsPreviewFixturesEnabled();
  const release = previewFixtures
    ? { enabled: false }
    : await getCollectiveActionsRelease();
  if (!previewFixtures && !release.enabled)
    return appV2 ? (
      <ComunShell
        appBar={{
          title: "Ações",
          contextLabel: "Organização coletiva",
          backDestination: "/comun/explorar",
        }}
      >
        <ComunCollectionPage
          kind="action"
          title="Ações"
          summary="Passos coletivos publicados com responsabilidade, prazo e resultado esperado."
        >
          <ComunEmptyStateV2
            title="Caderno público de ações em preparação"
            explanation="A operação de ações coletivas ainda não foi liberada neste ambiente. Nenhuma participação ou tarefa é registrada por esta tela."
            related="As pautas públicas continuam disponíveis para acompanhamento."
            action={{ href: "/comun/pautas", label: "Ver pautas em andamento" }}
            secondaryActions={[
              {
                href: "/comun/participar",
                label: "Outras formas de participar",
              },
            ]}
          />
        </ComunCollectionPage>
      </ComunShell>
    ) : (
      <CollectiveActionsPaused />
    );
  if (isComunCollectiveActionsCanonicalExperienceEnabled()) {
    const canonicalActions = previewFixtures
      ? collectiveActionsPreviewFixtures
          .map(projectPublicCollectiveActionSummary)
          .filter((action) =>
            Boolean(
              action &&
                (!filters.territorio ||
                  action.territoryLabel === filters.territorio) &&
                (!filters.tipo || action.actionType === filters.tipo),
            ),
          )
          .filter((action) => action !== null)
      : await listPublicCollectiveActionsCanonical({
          territory: filters.territorio,
          type: filters.tipo,
        });
    return (
      <CollectiveActionsCanonicalIndex
        actions={canonicalActions}
        territory={filters.territorio}
        type={filters.tipo}
      />
    );
  }
  const [actions, options] = previewFixtures
    ? [
        collectiveActionsPreviewFixtures.filter(
          (action) =>
            (!filters.territorio ||
              action.territory_label === filters.territorio) &&
            (!filters.tipo || action.action_type === filters.tipo),
        ),
        {
          territories: ["Território demonstração"],
          types: ["community_inspection", "mutual_aid"],
        },
      ]
    : await Promise.all([
        listPublicCollectiveActions({
          territory: filters.territorio,
          type: filters.tipo,
        }),
        listPublicCollectiveActionFilters(),
      ]);
  const groups = [
    [
      "Ações abertas",
      actions.filter((action: any) => action.status === "open"),
    ],
    [
      "Em andamento",
      actions.filter((action: any) =>
        ["active", "awaiting_result"].includes(action.status),
      ),
    ],
    [
      "Próximas atividades",
      actions.filter(
        (action: any) =>
          action.starts_at && new Date(action.starts_at) > new Date(),
      ),
    ],
    [
      "Memórias concluídas",
      actions.filter((action: any) => action.status === "completed"),
    ],
  ] as const;
  if (appV2)
    return (
      <ComunShell
        appBar={{
          title: "Ações",
          contextLabel: "Organização coletiva",
          backDestination: "/comun/explorar",
        }}
      >
        <ComunCollectionPage
          kind="action"
          title="Ações"
          summary="Passos coletivos com responsabilidade, prazo, participação e consequência acompanhável."
          rail={[
            {
              kind: "pauta",
              slug: "pautas",
              title: "Pautas",
              href: "/comun/pautas",
              source: "canonical_route",
            },
            {
              kind: "result",
              slug: "resultados",
              title: "Resultados",
              href: "/comun/resultados",
              source: "canonical_route",
            },
          ]}
        >
          <form className="mb-6 grid gap-3 rounded-[var(--comun-radius-card)] border border-comun-paper/20 p-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-black">
              Território
              <select
                name="territorio"
                defaultValue={filters.territorio ?? ""}
                className="min-h-11 bg-comun-paper px-2 text-comun-black"
              >
                <option value="">Todos</option>
                {options.territories.map((territory: string) => (
                  <option key={territory} value={territory}>
                    {territory}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black">
              Tipo
              <select
                name="tipo"
                defaultValue={filters.tipo ?? ""}
                className="min-h-11 bg-comun-paper px-2 text-comun-black"
              >
                <option value="">Todos</option>
                {collectiveActionTypes
                  .filter((type) => options.types.includes(type))
                  .map((type) => (
                    <option key={type} value={type}>
                      {labels[type]}
                    </option>
                  ))}
              </select>
            </label>
            <button className="comun-v2-action self-end">
              Aplicar filtros
            </button>
          </form>
          {actions.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {actions.map((action: any) => (
                <ComunActionCard
                  key={action.id}
                  href={withComunAppV2(`/comun/acoes/${action.slug}`)}
                  title={action.title}
                  description={action.summary}
                  action="Abrir ação"
                />
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma ação pública neste recorte"
              explanation="Ações aparecem depois de decisão, publicação e definição de responsabilidade."
              action={{
                href: "/comun/pautas",
                label: "Ver pautas em andamento",
              }}
              secondaryActions={[
                { href: "/comun/acoes", label: "Limpar filtros" },
              ]}
            />
          )}
        </ComunCollectionPage>
      </ComunShell>
    );
  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase text-comun-yellow">
          Caderno coletivo em andamento
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-yellow">
          Ações coletivas
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Processos organizados para transformar relatos e pautas em passos
          reais: participar, dividir tarefas, acompanhar atualizações e
          preservar a memória.
        </p>
        <form className="mt-5 grid gap-3 border-y-2 border-comun-paper/20 py-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-black uppercase">
            Território
            <select
              name="territorio"
              defaultValue={filters.territorio ?? ""}
              className="min-h-11 border-2 border-comun-paper bg-comun-black px-2"
            >
              <option value="">Todos</option>
              {options.territories.map((territory: string) => (
                <option key={territory} value={territory}>
                  {territory}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-black uppercase">
            Tipo
            <select
              name="tipo"
              defaultValue={filters.tipo ?? ""}
              className="min-h-11 border-2 border-comun-paper bg-comun-black px-2"
            >
              <option value="">Todos</option>
              {collectiveActionTypes
                .filter((type) => options.types.includes(type))
                .map((type) => (
                  <option key={type} value={type}>
                    {labels[type]}
                  </option>
                ))}
            </select>
          </label>
          <button className="self-end min-h-11 border-2 border-comun-yellow bg-comun-yellow px-4 font-black uppercase text-comun-black">
            Filtrar
          </button>
        </form>
      </Section>
      {groups.map(([title, rows]) => (
        <Section key={title}>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            {title}
          </h2>
          {rows.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {rows.map((action: any) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          ) : (
            <p className="mt-4 border-2 border-comun-paper/30 p-4 text-comun-paper/75">
              Nenhuma ação nesta parte do caderno por enquanto.
            </p>
          )}
        </Section>
      ))}
      <Section>
        <Link
          href="/comun/participar"
          className="font-black uppercase text-comun-yellow underline"
        >
          Encontrar outras formas de participar
        </Link>
      </Section>
    </ComunShell>
  );
}

function ActionCard({ action }: { action: any }) {
  return (
    <Link
      href={`/comun/acoes/${action.slug}`}
      className="border-2 border-comun-paper/35 p-5 transition hover:border-comun-yellow hover:bg-comun-paper/5"
    >
      <p className="text-xs font-black uppercase text-comun-yellow">
        {(labels as Record<string, string>)[action.action_type] ??
          action.action_type}{" "}
        ·{" "}
        {(collectiveActionStatusLabels as Record<string, string>)[
          action.status
        ] ?? action.status}
      </p>
      <h3 className="mt-2 text-xl font-black uppercase">{action.title}</h3>
      <p className="mt-2 text-sm text-comun-paper/75">{action.summary}</p>
      <p className="mt-4 text-xs font-bold text-comun-paper/60">
        {[
          action.territory_label,
          action.starts_at
            ? new Date(action.starts_at).toLocaleDateString("pt-BR")
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Próximos passos em organização"}
      </p>
    </Link>
  );
}
