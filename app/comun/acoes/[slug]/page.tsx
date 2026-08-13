import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import {
  claimCollectiveActionTask,
  releaseCollectiveActionTask,
  updateCollectiveActionParticipation,
} from "@/app/comun/acoes/actions";
import { getPublicCollectiveAction } from "@/lib/collective-actions";
import {
  collectiveActionStatusLabels,
  collectiveActionTypeLabels,
  collectiveParticipationModeLabels,
  collectiveTaskEffortLabels,
} from "@/lib/collective-actions";
import { CollectiveActionsPaused } from "@/components/collective-actions-paused";
import { getCollectiveActionsPreviewFixture } from "@/lib/collective-actions-preview-fixtures";
import { getCollectiveActionsRelease } from "@/lib/collective-actions-release";
import { isCollectiveActionsPreviewFixturesEnabled } from "@/lib/collective-actions-release-contract";
import { collectiveForwardingStateLabels } from "@/lib/collective-actions-admin";
import { ComunContextTrail } from "@/components/comun-context-trail";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { isComunCollectiveActionsCanonicalExperienceEnabled } from "@/lib/comun-collective-actions-canonical-feature";
import { projectPublicCollectiveActionDetail } from "@/lib/comun-collective-actions-canonical";
import { CollectiveActionCanonicalDetail } from "@/components/comun-collective-actions-canonical";

export const dynamic = "force-dynamic";

export default async function CollectiveActionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    experiencia?: string;
    confirmacao?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const appV2 = isComunAppV2(query.experiencia);
  const previewFixtures = isCollectiveActionsPreviewFixturesEnabled();
  const release = previewFixtures
    ? { enabled: false }
    : await getCollectiveActionsRelease();
  if (!previewFixtures && !release.enabled) return <CollectiveActionsPaused />;
  const action: any = previewFixtures
    ? getCollectiveActionsPreviewFixture(slug)
    : await getPublicCollectiveAction(slug);
  if (!action) notFound();
  if (isComunCollectiveActionsCanonicalExperienceEnabled()) {
    const canonicalAction = projectPublicCollectiveActionDetail(action);
    if (!canonicalAction) notFound();
    return (
      <CollectiveActionCanonicalDetail
        action={canonicalAction}
        acknowledgement={canonicalAcknowledgement(query.confirmacao)}
        previewFixtures={previewFixtures}
      />
    );
  }
  if (appV2)
    return (
      <ActionDetailV2
        action={action}
        slug={slug}
        previewFixtures={previewFixtures}
      />
    );
  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase text-comun-yellow">
          {(collectiveActionTypeLabels as Record<string, string>)[
            action.action_type
          ] ?? action.action_type}{" "}
          ·{" "}
          {(collectiveActionStatusLabels as Record<string, string>)[
            action.status
          ] ?? action.status}
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-yellow">
          {action.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-comun-paper/80">
          {action.objective}
        </p>
        <div className="mt-5 grid gap-3 border-l-4 border-comun-yellow bg-comun-paper/5 p-4 sm:grid-cols-3">
          <Cell
            label="Território"
            value={action.territory_label ?? "a definir"}
          />
          <Cell
            label="Quando"
            value={
              action.starts_at
                ? new Date(action.starts_at).toLocaleString("pt-BR")
                : "em construção"
            }
          />
          <Cell label="Onde" value={action.meeting_place ?? "a confirmar"} />
        </div>
        <p className="mt-4 max-w-3xl">{action.summary}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm font-black">
          <span>{action.counts.interested} interessadas</span>
          <span>{action.counts.participating} participando</span>
          <span>{action.counts.tasksAssumed} tarefas assumidas</span>
          <span>{action.counts.updates} atualizações</span>
        </div>
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Entrar na ação
        </h2>
        <p className="mt-2 max-w-3xl text-comun-paper/75">
          Sua participação não cria perfil público nem expõe contato,
          localização ou observações privadas.
        </p>
        {previewFixtures ? (
          <p
            role="status"
            className="mt-4 border-l-4 border-comun-yellow bg-comun-paper/5 p-4"
          >
            Demonstração de Preview: os botões estão visíveis, mas não registram
            participação.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              {["interested", "participating", "available_for_task"].map(
                (status) => (
                  <form
                    action={updateCollectiveActionParticipation}
                    key={status}
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="status" value={status} />
                    <button className="min-h-11 border-2 border-comun-yellow px-4 font-black uppercase text-comun-yellow">
                      {status === "interested"
                        ? "Tenho interesse"
                        : status === "participating"
                          ? "Quero participar"
                          : "Posso ajudar numa tarefa"}
                    </button>
                  </form>
                ),
              )}
              <form action={updateCollectiveActionParticipation}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="status" value="withdrew" />
                <button className="min-h-11 px-2 font-bold underline">
                  Sair da ação
                </button>
              </form>
            </div>
            <form
              action={updateCollectiveActionParticipation}
              className="mt-4 grid gap-2 border-t border-comun-paper/30 pt-4"
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="status" value="contributed" />
              <label className="grid gap-1 text-sm font-black">
                Contribuição curta para revisão
                <textarea
                  name="contribution_note_private"
                  rows={2}
                  maxLength={600}
                  className="border-2 border-comun-paper bg-comun-black p-2 text-comun-paper"
                  placeholder="Não será publicada automaticamente."
                />
              </label>
              <button className="min-h-11 w-fit border-2 border-comun-paper px-3 text-sm font-black">
                Enviar para revisão
              </button>
            </form>
          </>
        )}
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Pequenas tarefas
        </h2>
        <div className="mt-4 grid gap-3">
          {action.tasks.map((task: any) => (
            <article
              key={task.id}
              className="border-2 border-comun-paper/30 p-4"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-black uppercase">{task.title}</h3>
                  <p className="mt-2 max-w-2xl text-comun-paper/75">
                    {task.description}
                  </p>
                  <p className="mt-2 text-sm">
                    {task.assumed_count}/{task.desired_count} assumidas ·{" "}
                    {collectiveTaskEffortLabels[task.effort_level] ??
                      task.effort_level}{" "}
                    ·{" "}
                    {collectiveParticipationModeLabels[
                      task.participation_mode
                    ] ?? task.participation_mode}
                    {task.due_at
                      ? ` · até ${new Date(task.due_at).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                </div>
                {previewFixtures ? (
                  <span className="border-2 border-comun-paper px-3 py-2 text-sm font-black">
                    Demonstração
                  </span>
                ) : (
                  <div className="flex flex-wrap items-start gap-2">
                    <form action={claimCollectiveActionTask}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="task_id" value={task.id} />
                      <button className="min-h-11 border-2 border-comun-yellow bg-comun-yellow px-3 font-black uppercase text-comun-black">
                        Assumir
                      </button>
                    </form>
                    <form action={releaseCollectiveActionTask}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="task_id" value={task.id} />
                      <button className="min-h-11 px-2 font-bold underline">
                        Liberar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </Section>
      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Linha do tempo
        </h2>
        <ol className="mt-4 grid gap-3 border-l-2 border-comun-yellow pl-5">
          {action.updates.map((update: any) => (
            <li key={update.id}>
              <p className="text-xs font-black uppercase text-comun-yellow">
                {(update.event_key ?? update.update_type).replaceAll("_", " ")}{" "}
                · {new Date(update.occurred_at).toLocaleDateString("pt-BR")}
              </p>
              <h3 className="mt-1 font-black">{update.title}</h3>
              <p className="mt-1 text-comun-paper/75">
                {update.public_summary}
              </p>
            </li>
          ))}
        </ol>
      </Section>
      {action.forwarding ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Encaminhamento coletivo
          </h2>
          <div className="mt-4 grid gap-3 border-l-4 border-comun-yellow bg-comun-paper/5 p-4 sm:grid-cols-2">
            <Cell
              label="Estado"
              value={
                collectiveForwardingStateLabels[
                  action.forwarding
                    .state as keyof typeof collectiveForwardingStateLabels
                ] ?? action.forwarding.state
              }
            />
            <Cell
              label="Destinatário"
              value={action.forwarding.recipient_name ?? "em revisão"}
            />
            {action.forwarding.sent_at ? (
              <Cell
                label="Enviado em"
                value={new Date(action.forwarding.sent_at).toLocaleDateString(
                  "pt-BR",
                )}
              />
            ) : null}
            {action.forwarding.protocol_code ? (
              <Cell label="Protocolo" value={action.forwarding.protocol_code} />
            ) : null}
          </div>
          <p className="mt-4 text-comun-paper/75">
            {action.forwarding.public_summary}
          </p>
          {action.forwarding.response_public ? (
            <p className="mt-3 border-l-2 border-comun-paper/40 pl-3">
              <strong>Resposta recebida:</strong>{" "}
              {action.forwarding.response_public}
            </p>
          ) : null}
          {action.forwarding.public_document_url ? (
            <a
              className="mt-4 inline-block font-black text-comun-yellow underline"
              href={action.forwarding.public_document_url}
              target="_blank"
              rel="noreferrer"
            >
              {action.forwarding.public_document_label}
            </a>
          ) : null}
        </Section>
      ) : null}
      {action.pauta || action.community || action.sidewalkRecords.length ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Vínculos
          </h2>
          {action.pauta ? (
            <Link
              className="mt-3 block font-black underline"
              href={`/comun/pautas/${action.pauta.slug}`}
            >
              Pauta: {action.pauta.title}
            </Link>
          ) : null}
          {action.community ? (
            <p className="mt-3 font-black">
              Comunidade: {action.community.name}
            </p>
          ) : null}
          {action.sidewalkRecords.map((record: any) => (
            <p className="mt-2 text-sm" key={record.slug}>
              Registro relacionado:{" "}
              {record.name ?? record.public_summary ?? "registro revisado"}
            </p>
          ))}
        </Section>
      ) : null}
      {action.status === "completed" ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Resultado e memória
          </h2>
          <p className="mt-3">
            {action.result_summary ?? "Resultado em consolidação."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-black">
            <span>
              {action.participant_count_aggregate ??
                action.counts.participating}{" "}
              participantes agregadas
            </span>
            <span>
              {action.tasks_completed_aggregate ?? 0} tarefas realizadas
            </span>
            {action.counts.updates ? (
              <span>{action.counts.updates} atualizações</span>
            ) : null}
          </div>
          <p className="mt-4 text-comun-paper/75">
            {action.memory_summary ??
              "A memória desta ação permanece disponível como aprendizado coletivo."}
          </p>
          {action.learned_summary ? (
            <p className="mt-3">
              <strong>Aprendizados:</strong> {action.learned_summary}
            </p>
          ) : null}
          {action.next_steps_summary ? (
            <p className="mt-3">
              <strong>Próximos desdobramentos:</strong>{" "}
              {action.next_steps_summary}
            </p>
          ) : null}
          {action.memoryAssets?.length ? (
            <div className="mt-5 grid gap-2">
              <h3 className="font-black uppercase text-comun-yellow">
                Materiais públicos revisados
              </h3>
              {action.memoryAssets.map((asset: any) => (
                <a
                  key={asset.id}
                  href={asset.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline"
                >
                  {asset.asset_kind === "photograph"
                    ? "Fotografia"
                    : "Documento"}
                  : {asset.title}
                </a>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}
    </ComunShell>
  );
}

function canonicalAcknowledgement(value: string | undefined) {
  const messages: Record<string, string> = {
    participating: "Participação registrada.",
    interested: "Ação adicionada ao seu acompanhamento.",
    note: "Nota recebida. Ela fica privada e não será publicada automaticamente.",
    withdrew: "Saída registrada. Você pode participar novamente depois.",
    task_claimed: "Tarefa assumida.",
    task_released: "Tarefa liberada para outra pessoa.",
  };
  return value ? messages[value] : undefined;
}

function ActionDetailV2({
  action,
  slug,
  previewFixtures,
}: {
  action: any;
  slug: string;
  previewFixtures: boolean;
}) {
  const relations: EntityRelation[] = [
    ...(action.pauta
      ? [
          {
            ...entityReference("pauta", action.pauta.slug, action.pauta.title),
            source: "foreign_key" as const,
          },
        ]
      : []),
    ...(action.community
      ? [
          {
            ...entityReference(
              "community",
              action.community.slug,
              action.community.name,
            ),
            source: "foreign_key" as const,
          },
        ]
      : []),
  ];
  const context = createComunEntityContext({
    kind: "action",
    id: action.id,
    slug: action.slug,
    title: action.title,
    state:
      collectiveActionStatusLabels[
        action.status as keyof typeof collectiveActionStatusLabels
      ] ?? action.status,
    summary: action.objective,
    community: action.community
      ? entityReference(
          "community",
          action.community.slug,
          action.community.name,
        )
      : undefined,
    pauta: action.pauta
      ? entityReference("pauta", action.pauta.slug, action.pauta.title)
      : undefined,
    primaryAction: {
      href: action.pauta
        ? `/comun/pautas/${action.pauta.slug}`
        : "/comun/pautas",
      label: action.pauta ? "Ver pauta de origem" : "Ver pautas",
      description: action.summary,
    },
    relations,
  });
  return (
    <ComunShell
      appBar={{
        title: action.title,
        contextLabel: "Ação · organização coletiva",
        backDestination: "/comun/acoes",
      }}
    >
      <main
        className="comun-v2-page comun-v2-page--reading comun-relational-page"
        data-comun-app-v2-page="action-detail"
      >
        <ComunContextTrail
          items={[
            ...(action.community
              ? [
                  {
                    kind: "comunidade" as const,
                    label: action.community.name,
                    href: withComunAppV2(`/comun/c/${action.community.slug}`),
                  },
                ]
              : []),
            ...(action.pauta
              ? [
                  {
                    kind: "pauta" as const,
                    label: action.pauta.title,
                    href: withComunAppV2(`/comun/pautas/${action.pauta.slug}`),
                  },
                ]
              : []),
            { kind: "entidade", label: action.title },
          ]}
        />
        <ComunEntityHeader context={context} />
        <ComunRelationRail relations={relations} />
        <ComunRelatedSection
          title="Participar desta ação"
          summary="Sua participação não cria perfil público nem expõe contato, localização ou observações privadas."
        >
          {previewFixtures ? (
            <p
              role="status"
              className="surface-alert rounded-[var(--comun-radius-card)] p-4 text-comun-black"
            >
              Demonstração de Preview: os botões não registram participação.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {["interested", "participating", "available_for_task"].map(
                (status) => (
                  <form
                    action={updateCollectiveActionParticipation}
                    key={status}
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="status" value={status} />
                    <button className="comun-v2-action">
                      {status === "interested"
                        ? "Tenho interesse"
                        : status === "participating"
                          ? "Quero participar"
                          : "Posso assumir tarefa"}
                    </button>
                  </form>
                ),
              )}
            </div>
          )}
        </ComunRelatedSection>
        <ComunRelatedSection
          title="Pequenas tarefas"
          summary="Tarefas abertas nesta ação; contagem não inclui tarefas arquivadas."
        >
          {action.tasks.length ? (
            <div className="grid gap-3">
              {action.tasks.map((task: any) => (
                <article
                  key={task.id}
                  className="rounded-[var(--comun-radius-card)] border border-comun-paper/25 p-4"
                >
                  <p className="comun-v2-status text-comun-yellow">
                    {task.state} · {task.assumed_count}/{task.desired_count}{" "}
                    assumidas
                  </p>
                  <h3 className="mt-2 text-xl font-black normal-case">
                    {task.title}
                  </h3>
                  <p className="mt-2 text-comun-paper/70">{task.description}</p>
                  {!previewFixtures && task.state !== "done" ? (
                    <form action={claimCollectiveActionTask} className="mt-4">
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="task_id" value={task.id} />
                      <button className="comun-v2-action">
                        Assumir tarefa
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma tarefa pública aberta"
              explanation="Tarefas só aparecem depois de definição de objetivo, responsabilidade e estado publicável."
              action={{
                href: action.pauta
                  ? `/comun/pautas/${action.pauta.slug}`
                  : "/comun/pautas",
                label: "Voltar ao processo",
              }}
            />
          )}
        </ComunRelatedSection>
        <ComunRelatedSection title="Continuidade e resultado">
          {action.updates.length ? (
            <ol className="grid gap-3 border-l-2 border-comun-yellow pl-5">
              {action.updates.map((update: any) => (
                <li key={update.id}>
                  <p className="comun-v2-status text-comun-yellow">
                    {(update.event_key ?? update.update_type).replaceAll(
                      "_",
                      " ",
                    )}{" "}
                    · {new Date(update.occurred_at).toLocaleDateString("pt-BR")}
                  </p>
                  <h3 className="mt-1 font-black normal-case">
                    {update.title}
                  </h3>
                  <p className="mt-1 text-comun-paper/70">
                    {update.public_summary}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <ComunEmptyStateV2
              title="Ainda não há atualização pública"
              explanation="Mudanças de estado, encaminhamentos e resultados aparecerão após revisão."
              action={{
                href: "/comun/resultados",
                label: "Entender resultados",
              }}
            />
          )}
          {action.result_summary ? (
            <div className="surface-result mt-4 rounded-[var(--comun-radius-card)] p-5 text-comun-black">
              <p className="comun-v2-eyebrow">Resultado declarado</p>
              <p className="mt-2">{action.result_summary}</p>
              <p className="mt-3 text-sm font-bold">
                Estado: {action.result_status ?? "em consolidação"}
              </p>
            </div>
          ) : null}
        </ComunRelatedSection>
      </main>
    </ComunShell>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-comun-yellow">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
