import Link from "next/link";
import {
  claimCollectiveActionTask,
  releaseCollectiveActionTask,
  updateCollectiveActionParticipation,
} from "@/app/comun/acoes/actions";
import { ComunShell, Section } from "@/components/comun-shell";
import {
  collectiveActionStatusLabels,
  collectiveActionTypeLabels,
  collectiveParticipationModeLabels,
  collectiveTaskEffortLabels,
} from "@/lib/collective-actions";
import type {
  PublicCollectiveActionDetailV1,
  PublicCollectiveActionSummaryV1,
  PublicCollectiveActionTaskV1,
} from "@/lib/comun-collective-actions-canonical";

const groupLabels = {
  open: "Abertas para participação",
  active: "Em andamento",
  awaiting_result: "Aguardando resultado",
  completed: "Concluídas e memória",
} as const;

export function CollectiveActionsCanonicalIndex({
  actions,
  territory,
  type,
}: {
  actions: readonly PublicCollectiveActionSummaryV1[];
  territory?: string;
  type?: string;
}) {
  const territories = [
    ...new Set(actions.map((item) => item.territoryLabel).filter(Boolean)),
  ] as string[];
  const types = [...new Set(actions.map((item) => item.actionType))];
  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/70">
          Organização coletiva
        </p>
        <h1
          data-comun-app-v2-page="collective-actions-canonical"
          className="mt-2 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl"
        >
          Ações coletivas
        </h1>
        <p className="comun-prose mt-3 max-w-3xl text-comun-paper/80">
          Mobilizações concretas com objetivo, participação, trabalho e
          consequência acompanhável.
        </p>
        <form className="mt-6 grid gap-3 border-y-2 border-comun-paper/25 py-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-black uppercase">
            Território
            <select
              name="territorio"
              defaultValue={territory ?? ""}
              className="min-h-11 border-2 border-comun-paper bg-comun-black px-2"
            >
              <option value="">Todos</option>
              {territories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-black uppercase">
            Tipo
            <select
              name="tipo"
              defaultValue={type ?? ""}
              className="min-h-11 border-2 border-comun-paper bg-comun-black px-2"
            >
              <option value="">Todos</option>
              {types.map((item) => (
                <option key={item} value={item}>
                  {collectiveActionTypeLabels[
                    item as keyof typeof collectiveActionTypeLabels
                  ] ?? item}
                </option>
              ))}
            </select>
          </label>
          <button className="self-end min-h-11 border-2 border-comun-yellow bg-comun-yellow px-4 font-black uppercase text-comun-black">
            Aplicar filtros
          </button>
        </form>
      </Section>
      {Object.entries(groupLabels).map(([status, label]) => {
        const rows = actions.filter((action) => action.status === status);
        return (
          <Section key={status}>
            <h2 className="text-2xl font-black uppercase text-comun-yellow">
              {label}
            </h2>
            {rows.length ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {rows.map((action) => (
                  <CanonicalActionCard action={action} key={action.id} />
                ))}
              </div>
            ) : (
              <p className="mt-4 border-2 border-comun-paper/30 p-4 text-comun-paper/78">
                Nenhuma ação pública nesta etapa agora.
              </p>
            )}
          </Section>
        );
      })}
      <Section>
        <p className="max-w-3xl text-sm text-comun-paper/75">
          A ordem acompanha as etapas da ação e suas datas. Não há ranking de
          popularidade ou participantes.
        </p>
      </Section>
    </ComunShell>
  );
}

export function PautaCollectiveActions({
  pautaSlug,
  actions,
}: {
  pautaSlug: string;
  actions: readonly PublicCollectiveActionSummaryV1[];
}) {
  return (
    <Section>
      <div id="acoes-desta-pauta" />
      <h2 className="text-2xl font-black uppercase text-comun-yellow">
        O que estamos fazendo
      </h2>
      <p className="comun-prose mt-2 max-w-3xl text-comun-paper/78">
        Ações concretas vinculadas a esta pauta por seu registro canônico.
      </p>
      {actions.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {actions.map((action) => (
            <CanonicalActionCard action={action} key={action.id} />
          ))}
        </div>
      ) : (
        <p className="mt-4 border-2 border-comun-yellow bg-comun-black p-4 text-comun-paper/78">
          Esta pauta ainda não possui uma ação coletiva pública neste momento.
        </p>
      )}
      <Link
        href={`/comun/acoes?origem=${encodeURIComponent(pautaSlug)}`}
        className="mt-5 inline-flex min-h-11 items-center font-black uppercase underline decoration-2 underline-offset-4"
      >
        Ver todas as ações
      </Link>
    </Section>
  );
}

function CanonicalActionCard({
  action,
}: {
  action: PublicCollectiveActionSummaryV1;
}) {
  const participable = action.status === "open" || action.status === "active";
  return (
    <article className="paper-panel flex flex-col border-2 border-comun-black p-5">
      <p className="text-xs font-black uppercase text-comun-asphalt/70">
        {collectiveActionTypeLabels[
          action.actionType as keyof typeof collectiveActionTypeLabels
        ] ?? action.actionType}{" "}
        · {collectiveActionStatusLabels[action.status]}
      </p>
      <h3 className="comun-prose mt-2 text-xl font-black uppercase">
        {action.title}
      </h3>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/80">
        {action.objective}
      </p>
      <dl className="mt-4 grid gap-2 text-sm text-comun-asphalt/75">
        <Fact
          label="Quando"
          value={formatPeriod(action.startsAt, action.endsAt)}
        />
        {action.territoryLabel ? (
          <Fact label="Território" value={action.territoryLabel} />
        ) : null}
      </dl>
      <Link
        href={`/comun/acoes/${action.slug}`}
        className="mt-5 inline-flex min-h-11 w-fit items-center border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase text-comun-black"
      >
        {participable ? "Participar" : "Ver ação"}
      </Link>
    </article>
  );
}

export function CollectiveActionCanonicalDetail({
  action,
  acknowledgement,
  previewFixtures,
}: {
  action: PublicCollectiveActionDetailV1;
  acknowledgement?: string;
  previewFixtures: boolean;
}) {
  const participable = action.status === "open" || action.status === "active";
  const completed = action.status === "completed";
  return (
    <ComunShell>
      <Section>
        {action.pauta ? (
          <Link
            href={`/comun/pautas/${action.pauta.slug}`}
            className="text-sm font-black uppercase underline"
          >
            Esta ação faz parte da pauta {action.pauta.title}
          </Link>
        ) : null}
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-comun-paper/70">
          {collectiveActionTypeLabels[
            action.actionType as keyof typeof collectiveActionTypeLabels
          ] ?? action.actionType}{" "}
          · {collectiveActionStatusLabels[action.status]}
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
          {completed ? "O que aconteceu" : "O que vamos fazer"}
        </h1>
        <h2 className="comun-prose mt-4 text-2xl font-black">{action.title}</h2>
        <p className="comun-prose mt-3 max-w-3xl text-lg text-comun-paper/82">
          {action.objective}
        </p>
        <dl className="mt-5 grid gap-3 border-l-4 border-comun-yellow bg-comun-paper/5 p-4 sm:grid-cols-3">
          <Fact
            label="Quando"
            value={formatPeriod(action.startsAt, action.endsAt)}
          />
          <Fact label="Onde" value={action.meetingPlace ?? "A confirmar"} />
          <Fact
            label="Como"
            value={
              collectiveParticipationModeLabels[action.participationMode] ??
              action.participationMode
            }
          />
        </dl>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Por quê
        </h2>
        <p className="comun-prose mt-3 max-w-3xl text-comun-paper/80">
          {action.summary}
        </p>
      </Section>

      {acknowledgement ? (
        <Section>
          <p
            role="status"
            tabIndex={-1}
            autoFocus
            className="border-l-4 border-comun-yellow bg-comun-paper/10 p-4 font-bold"
          >
            {acknowledgement}
          </p>
        </Section>
      ) : null}

      {!completed ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Participar
          </h2>
          <p className="comun-prose mt-2 max-w-3xl text-comun-paper/78">
            Sua participação não cria membership de Pauta ou Comunidade e não
            aparece como contagem de popularidade.
          </p>
          {previewFixtures ? (
            <p role="status" className="mt-4 border-2 border-comun-yellow p-4">
              Demonstração: nenhuma participação é registrada.
            </p>
          ) : participable ? (
            <>
              <form
                action={updateCollectiveActionParticipation}
                className="mt-5"
              >
                <input type="hidden" name="slug" value={action.slug} />
                <input type="hidden" name="status" value="participating" />
                <input type="hidden" name="canonical_experience" value="1" />
                <button className="min-h-12 border-2 border-comun-black bg-comun-yellow px-5 font-black uppercase text-comun-black focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2">
                  Participar desta ação
                </button>
              </form>
              <details className="mt-5 border-t border-comun-paper/25 pt-4">
                <summary className="min-h-11 cursor-pointer font-black uppercase">
                  Outras formas de participar
                </summary>
                <div className="mt-4 grid gap-4">
                  <form action={updateCollectiveActionParticipation}>
                    <input type="hidden" name="slug" value={action.slug} />
                    <input type="hidden" name="status" value="interested" />
                    <input
                      type="hidden"
                      name="canonical_experience"
                      value="1"
                    />
                    <button className="min-h-11 font-black underline">
                      Acompanhar esta ação
                    </button>
                  </form>
                  <form
                    action={updateCollectiveActionParticipation}
                    className="grid max-w-2xl gap-2"
                  >
                    <input type="hidden" name="slug" value={action.slug} />
                    <input type="hidden" name="status" value="contributed" />
                    <input
                      type="hidden"
                      name="canonical_experience"
                      value="1"
                    />
                    <label className="grid gap-1 font-black">
                      Nota privada para revisão
                      <textarea
                        name="contribution_note_private"
                        maxLength={600}
                        rows={3}
                        className="border-2 border-comun-paper bg-comun-black p-3 text-comun-paper"
                      />
                    </label>
                    <p className="text-sm text-comun-paper/75">
                      Esta nota não será publicada automaticamente.
                    </p>
                    <button className="min-h-11 w-fit border-2 border-comun-paper px-4 font-black uppercase">
                      Enviar nota
                    </button>
                  </form>
                  <form action={updateCollectiveActionParticipation}>
                    <input type="hidden" name="slug" value={action.slug} />
                    <input type="hidden" name="status" value="withdrew" />
                    <input
                      type="hidden"
                      name="canonical_experience"
                      value="1"
                    />
                    <button className="min-h-11 font-black underline">
                      Sair da ação
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <p className="mt-4 border-2 border-comun-paper/30 p-4">
              Esta ação não recebe novas participações agora.
            </p>
          )}
        </Section>
      ) : null}

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Tarefas que precisam de gente
        </h2>
        <div className="mt-4 grid gap-4">
          {action.tasks.map((task) => (
            <CanonicalTask
              action={action}
              task={task}
              previewFixtures={previewFixtures}
              key={task.id}
            />
          ))}
          {!action.tasks.length ? (
            <p className="border-2 border-comun-paper/30 p-4 text-comun-paper/78">
              Nenhuma tarefa pública nesta ação agora.
            </p>
          ) : null}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Atualizações
        </h2>
        {action.publicUpdates.length ? (
          <ol className="mt-4 grid gap-4 border-l-2 border-comun-yellow pl-5">
            {action.publicUpdates.map((update) => (
              <li key={update.id}>
                <p className="text-xs font-black uppercase text-comun-yellow">
                  {update.updateType} ·{" "}
                  {new Date(update.occurredAt).toLocaleDateString("pt-BR")}
                </p>
                <h3 className="mt-1 font-black">{update.title}</h3>
                <p className="comun-prose mt-1 text-comun-paper/78">
                  {update.publicSummary}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 border-2 border-comun-paper/30 p-4 text-comun-paper/78">
            Ainda não há atualização pública.
          </p>
        )}
      </Section>

      {action.publicForwarding ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Encaminhamento público
          </h2>
          <p className="comun-prose mt-3 text-comun-paper/80">
            {action.publicForwarding.publicSummary ??
              "Encaminhamento público registrado."}
          </p>
        </Section>
      ) : null}

      {completed ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Resultado e memória
          </h2>
          <p className="comun-prose mt-3 text-lg">
            {action.publicMemory.resultSummary ?? "Resultado em consolidação."}
          </p>
          {action.publicMemory.memorySummary ? (
            <p className="comun-prose mt-4 text-comun-paper/80">
              {action.publicMemory.memorySummary}
            </p>
          ) : null}
          {action.publicMemory.learnedSummary ? (
            <p className="mt-4">
              <strong>O que aprendemos:</strong>{" "}
              {action.publicMemory.learnedSummary}
            </p>
          ) : null}
          {action.publicMemory.nextStepsSummary ? (
            <p className="mt-4">
              <strong>Próximos passos:</strong>{" "}
              {action.publicMemory.nextStepsSummary}
            </p>
          ) : null}
          {action.publicMemory.assets.map((asset) => (
            <a
              key={asset.id}
              href={asset.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block font-black underline"
            >
              {asset.title}
            </a>
          ))}
        </Section>
      ) : null}
    </ComunShell>
  );
}

function CanonicalTask({
  action,
  task,
  previewFixtures,
}: {
  action: PublicCollectiveActionDetailV1;
  task: PublicCollectiveActionTaskV1;
  previewFixtures: boolean;
}) {
  const available =
    task.availability === "available" &&
    (action.status === "open" || action.status === "active");
  const stateLabel = {
    available: "Disponível",
    full: "Vagas preenchidas",
    expired: "Prazo encerrado",
    closed: "Concluída",
  }[task.availability];
  return (
    <article className="border-2 border-comun-paper/30 p-4">
      <p className="text-xs font-black uppercase text-comun-yellow">
        {stateLabel}
      </p>
      <h3 className="mt-2 font-black uppercase">{task.title}</h3>
      <p className="comun-prose mt-2 text-comun-paper/78">{task.description}</p>
      <p className="mt-3 text-sm text-comun-paper/75">
        {task.assumedCount}/{task.desiredCount} partes assumidas ·{" "}
        {collectiveTaskEffortLabels[task.effortLevel] ?? task.effortLevel}
      </p>
      {available && !previewFixtures ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={claimCollectiveActionTask}>
            <input type="hidden" name="slug" value={action.slug} />
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="canonical_experience" value="1" />
            <button className="min-h-11 border-2 border-comun-yellow px-4 font-black uppercase">
              Assumir tarefa
            </button>
          </form>
          <form action={releaseCollectiveActionTask}>
            <input type="hidden" name="slug" value={action.slug} />
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="canonical_experience" value="1" />
            <button className="min-h-11 font-black underline">
              Liberar tarefa
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase text-comun-yellow">
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
function formatPeriod(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return "Em organização";
  const start = new Date(startsAt).toLocaleString("pt-BR");
  return endsAt
    ? `${start} até ${new Date(endsAt).toLocaleString("pt-BR")}`
    : start;
}
