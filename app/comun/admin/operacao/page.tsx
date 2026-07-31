import Link from "next/link";
import { redirect } from "next/navigation";
import { requireComunAdminProfile } from "@/lib/admin-auth";
import { canAccessOperationalSurface } from "@/lib/operational-authorization";
import { OPERATION_QUEUES, QUEUE_LABELS } from "@/lib/editorial-operation";
import {
  activeOperationalFilters,
  listOperationalFilterOptions,
  listOperationalItems,
  normalizeOperationalQuery,
  operationalQueryHref,
  SOURCE_TYPES,
  STATES,
  type OperationalFilterOptions,
} from "@/lib/operational-queue";
import { ComunExperiencePilot } from "@/components/comun-experience-pilot";
import { isExperienceCoherencePilot } from "@/lib/experience-coherence";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const label = (value: string) => value.replaceAll("_", " ");
const formatDue = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Sem prazo indicativo";

export default async function OperationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireComunAdminProfile();
  if (!canAccessOperationalSurface(session.profile, "central"))
    redirect("/comun/admin");
  const rawSearchParams = await searchParams;
  const experiencePilot = isExperienceCoherencePilot(rawSearchParams.experiencia);
  const query = normalizeOperationalQuery(rawSearchParams);
  const [result, options] = await Promise.all([
    listOperationalItems(query),
    listOperationalFilterOptions(),
  ]);
  const current = { ...query, page: result.pageInfo.page };
  const returnTo = operationalQueryHref(current);
  const active = activeOperationalFilters(query);
  const noResults = result.pageInfo.totalItems === 0;
  return (
    <ComunExperiencePilot
      active={experiencePilot}
      level={0}
      currentHref={operationalQueryHref(query)}
    >
    <main
      className="mx-auto max-w-6xl p-4 text-slate-50 sm:p-6"
      data-operational-surface="central"
    >
      <nav aria-label="Retorno da Central" className="mb-5">
        <Link className="inline-flex min-h-11 items-center font-semibold underline" href="/comun/admin">
          ← Voltar à administração
        </Link>
      </nav>
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase">Cuidado coletivo</p>
        <h1 className="text-3xl font-bold">Central operacional</h1>
        <p className="mt-2">
          O que precisa de cuidado agora, qual papel pode agir e o que está
          bloqueando. Decisões políticas e editoriais permanecem nas fontes
          responsáveis. Mostrando {result.items.length} de{" "}
          {result.pageInfo.totalItems} itens no recorte atual.
        </p>
      </header>
      <section
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Recortes de cuidado agora"
      >
        {[
          [
            "Agora · P1",
            result.summary.p1,
            operationalQueryHref(query, { page: 1, priority: 1 }),
          ],
          [
            "Sem responsável",
            result.summary.unassigned,
            operationalQueryHref(query, { page: 1, unassigned: true }),
          ],
          [
            "Vencidos",
            result.summary.overdue,
            operationalQueryHref(query, { page: 1, dueState: "overdue" }),
          ],
          [
            "Bloqueados",
            result.summary.blocked,
            operationalQueryHref(query, { page: 1, status: "blocked" }),
          ],
          [
            "Aguardando terceiro",
            result.summary.waitingThirdParty,
            "/comun/admin/operacao?dueState=blocked_by_third_party",
          ],
          [
            "Retiradas",
            result.summary.withdrawals,
            operationalQueryHref(query, { page: 1, queue: "withdrawals" }),
          ],
          [
            "Incidentes",
            result.summary.incidents,
            "/comun/admin/operacao?type=incident",
          ],
        ].map(([title, count, href]) => (
          <Link
            className="rounded-xl border p-3 hover:bg-white/10"
            href={String(href)}
            key={String(title)}
          >
            <span className="block text-sm font-medium">{title}</span>
            <strong className="text-2xl">{count}</strong>
          </Link>
        ))}
      </section>
      <section
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Resumo agregado das filas"
      >
        {OPERATION_QUEUES.map((queue) => (
          <div key={queue} className="rounded-xl border p-3">
            <p className="text-sm font-medium">{QUEUE_LABELS[queue]}</p>
            <p className="text-2xl font-bold">
              {result.queueCounts[queue] ?? 0}
            </p>
          </div>
        ))}
      </section>
      <details className="mt-6 min-w-0 max-w-full rounded-2xl border p-4 md:hidden">
        <summary className="cursor-pointer font-semibold">
          Abrir filtros e ordenação
        </summary>
        <FilterForm query={query} options={options} />
      </details>
      <section
        className="mt-6 hidden rounded-2xl border p-4 md:block"
        aria-label="Filtros server-side"
      >
        <h2 className="font-semibold">Filtros e ordenação</h2>
        <FilterForm query={query} options={options} />
      </section>
      <section
        className="mt-4 flex flex-wrap items-center gap-2"
        aria-label="Filtros ativos"
      >
        <strong>Recorte:</strong>
        {active.length ? (
          active.map(([name, value]) => (
            <Link
              key={name}
              className="rounded-full border px-3 py-1 text-sm"
              href={operationalQueryHref(query, {
                page: 1,
                [name === "prioridade"
                  ? "priority"
                  : name === "responsável"
                    ? "assignedTo"
                    : name === "sem_responsável"
                      ? "unassigned"
                      : name === "prazo"
                        ? "dueState"
                        : name === "tipo"
                          ? "sourceType"
                          : name === "busca"
                            ? "search"
                            : name]: undefined,
              })}
            >
              × {name}: {String(value)}
            </Link>
          ))
        ) : (
          <span className="text-sm">Sem filtros ativos.</span>
        )}{" "}
        {active.length > 0 && (
          <Link className="underline" href="/comun/admin/operacao">
            Limpar filtros
          </Link>
        )}
      </section>
      <section className="mt-6" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">
            Página {result.pageInfo.page} de {result.pageInfo.totalPages}
          </h2>
          <p className="text-sm">
            {result.pageInfo.totalItems} itens filtrados · {result.totalGeneral}{" "}
            no total geral
          </p>
        </div>
        {noResults ? (
          <div className="mt-4 rounded-2xl border border-dashed p-6">
            <h3 className="font-semibold">
              {active.length ? "Nenhum item neste recorte" : "Fila vazia"}
            </h3>
            <p className="mt-1 text-sm">
              {active.length
                ? "Remova filtros ou escolha outro recorte para continuar."
                : "Não há ação pendente nesta central no momento."}
            </p>
            {active.length > 0 && (
              <Link
                className="mt-3 inline-block underline"
                href="/comun/admin/operacao"
              >
                Limpar filtros
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-4 grid gap-3" aria-label="Itens da página atual">
            {result.items.map((item) => (
              <li
                key={item.id}
                id={`item-${item.id}`}
                className={`rounded-2xl border p-4 ${item.queue === "withdrawals" ? "border-red-500 bg-red-950 text-white" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {QUEUE_LABELS[item.queue]} · {label(item.state)} · P
                      {item.priority}
                    </p>
                    <Link
                      className="mt-1 block text-lg font-bold underline"
                      href={`/comun/admin/operacao/${item.id}?returnTo=${encodeURIComponent(returnTo)}#item-${item.id}`}
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm">
                      {item.publicReason || "Motivo sanitizado indisponível."}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-sm">
                    {label(item.sourceDomain || "legado")} ·{" "}
                    {label(item.sourceType)}
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="font-medium">Responsável</dt>
                    <dd>
                      {item.assignees.length
                        ? item.assignees
                            .map(({ displayName }) => displayName)
                            .join(", ")
                        : "Sem responsável"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Prazo indicativo</dt>
                    <dd>
                      {formatDue(item.indicativeDueAt)} ·{" "}
                      {label(item.slaState || "sem SLA aplicável")}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Próxima ação</dt>
                    <dd>{item.nextAction || "Definir em revisão humana"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Papel necessário</dt>
                    <dd>
                      {item.requiredRole
                        ? label(item.requiredRole)
                        : "Revisão da equipe"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Contexto permitido</dt>
                    <dd>
                      {item.pautaTitle ||
                        item.territoryName ||
                        "Sem pauta ou território"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
      <nav
        className="mt-8 flex flex-wrap items-center justify-between gap-3"
        aria-label="Paginação"
      >
        <Link
          aria-disabled={!result.pageInfo.hasPrevious}
          className={
            !result.pageInfo.hasPrevious
              ? "pointer-events-none text-muted-foreground"
              : "underline"
          }
          href={operationalQueryHref(current, {
            page: Math.max(1, result.pageInfo.page - 1),
          })}
        >
          Página anterior
        </Link>
        <span className="text-sm">
          {result.pageInfo.totalItems
            ? `${(result.pageInfo.page - 1) * result.pageInfo.pageSize + 1}–${Math.min(result.pageInfo.page * result.pageInfo.pageSize, result.pageInfo.totalItems)}`
            : "0"}{" "}
          de {result.pageInfo.totalItems}
        </span>
        <Link
          aria-disabled={!result.pageInfo.hasNext}
          className={
            !result.pageInfo.hasNext
              ? "pointer-events-none text-muted-foreground"
              : "underline"
          }
          href={operationalQueryHref(current, {
            page: result.pageInfo.page + 1,
          })}
        >
          Próxima página
        </Link>
      </nav>
    </main>
    </ComunExperiencePilot>
  );
}

function FilterForm({
  query,
  options,
}: {
  query: ReturnType<typeof normalizeOperationalQuery>;
  options: OperationalFilterOptions;
}) {
  const control =
    "w-full min-w-0 rounded border bg-white p-2 text-slate-950 dark:bg-slate-950 dark:text-slate-50";
  return (
    <form
      action="/comun/admin/operacao"
      className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" name="page" value="1" />
      <label className="grid gap-1 text-sm">
        Busca segura
        <input
          className={control}
          name="search"
          defaultValue={query.search}
          maxLength={120}
          placeholder="Título, motivo ou ação"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Fila
        <select
          className={control}
          name="queue"
          defaultValue={query.queue ?? ""}
        >
          <option value="">Todas</option>
          {OPERATION_QUEUES.map((queue) => (
            <option key={queue} value={queue}>
              {QUEUE_LABELS[queue]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Status
        <select
          className={control}
          name="status"
          defaultValue={query.status ?? ""}
        >
          <option value="">Todos</option>
          {STATES.map((state) => (
            <option key={state} value={state}>
              {label(state)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Prioridade
        <select
          className={control}
          name="priority"
          defaultValue={query.priority ?? ""}
        >
          <option value="">Todas</option>
          {[1, 2, 3, 4].map((priority) => (
            <option key={priority} value={priority}>
              P{priority}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Responsável
        <select
          className={control}
          name="assignedTo"
          defaultValue={query.assignedTo ?? ""}
        >
          <option value="">Qualquer pessoa</option>
          {options.assignees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Pauta
        <select
          className={control}
          name="pautaId"
          defaultValue={query.pautaId ?? ""}
        >
          <option value="">Todas</option>
          {options.pautas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Território
        <select
          className={control}
          name="territoryId"
          defaultValue={query.territoryId ?? ""}
        >
          <option value="">Todos</option>
          {options.territories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Prazo
        <select
          className={control}
          name="dueState"
          defaultValue={query.dueState ?? ""}
        >
          <option value="">Todos</option>
          <option value="overdue">Vencido</option>
          <option value="soon">Vence em breve</option>
          <option value="blocked_by_third_party">Aguardando terceiro</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Tipo
        <select
          className={control}
          name="type"
          defaultValue={query.sourceType ?? ""}
        >
          <option value="">Todos</option>
          {SOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Ordenação
        <select className={control} name="sort" defaultValue={query.sort}>
          <option value="urgent">Mais urgente</option>
          <option value="deadline">Prazo mais próximo</option>
          <option value="oldest">Mais antigo</option>
          <option value="newest">Mais recente</option>
          <option value="priority">Prioridade</option>
          <option value="next_action">Próxima ação</option>
        </select>
      </label>
      <label className="flex items-end gap-2 text-sm">
        <input
          name="unassigned"
          type="checkbox"
          value="1"
          defaultChecked={query.unassigned}
        />{" "}
        Sem responsável
      </label>
      <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-3">
        <button
          className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          type="submit"
        >
          Aplicar filtros
        </button>
        <Link className="rounded border px-4 py-2" href="/comun/admin/operacao">
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
