import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ComunShell, PrimaryLink } from "@/components/comun-shell";
import {
  ComunBreadcrumbs,
  ComunSection,
  ComunSectionHeader,
  ComunStatus,
} from "@/components/comun-ui";
import { MyCommunitySummary } from "@/components/my-community-summary";
import { requireCommunitySession } from "@/lib/community-auth";
import {
  communityStatusLabel,
  communityStatusPriority,
} from "@/lib/community-status";
import { getPersonalCenter } from "@/lib/personal-center";
import { listMyParticipation } from "@/lib/pauta-miniapps";
import { listMyIdentificationContributions } from "@/lib/archive-identification";
import { withdrawIdentificationComment } from "@/app/comun/acervo/identificar/actions";
import { listMemberCollectiveActions } from "@/lib/collective-actions";
import {
  releaseCollectiveActionTask,
  updateCollectiveActionParticipation,
} from "@/app/comun/acoes/actions";
import { isCollectiveActionsPreviewFixturesEnabled } from "@/lib/collective-actions-release-contract";
import { collectiveActionsPreviewFixtures } from "@/lib/collective-actions-preview-fixtures";
import { getCollectiveActionsRelease } from "@/lib/collective-actions-release";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { ComunPautaCard, ComunResultCard } from "@/components/comun-cards";
import { ComunStatePanel } from "@/components/comun-state-panel";

export const dynamic = "force-dynamic";

export default async function MinhaAreaPage({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string; experiencia?: string }>;
}) {
  if (isCollectiveActionsPreviewFixturesEnabled())
    return <CollectiveActionsPreviewParticipation />;
  const rawSearchParams = await searchParams;
  const requested = rawSearchParams.secao;
  const appV2 = isComunAppV2(rawSearchParams.experiencia);
  const selected = [
    "contribuicoes",
    "acompanhando",
    "tarefas",
    "resultados",
  ].includes(requested ?? "")
    ? requested!
    : "contribuicoes";
  const { user, profile } = await requireCommunitySession(
    "/comun/minha-participacao",
  );
  const collectiveActionsRelease = await getCollectiveActionsRelease();
  const [center, submissions, archiveContributions, collectiveActions] =
    await Promise.all([
      getPersonalCenter(user.id),
      listMyParticipation(user.id),
      listMyIdentificationContributions(user.id),
      collectiveActionsRelease.enabled
        ? listMemberCollectiveActions(user.id)
        : Promise.resolve([]),
    ]);
  const contributions = [
    ...submissions.contributions,
    ...submissions.artworkSubmissions,
    ...submissions.radioContributions,
  ].sort(
    (a: any, b: any) =>
      communityStatusPriority(b.status) - communityStatusPriority(a.status),
  );
  const collectiveTaskAssignments = collectiveActions.flatMap(
    (participation: any) =>
      (participation.taskAssignments ?? []).map((assignment: any) => ({
        ...assignment,
        participation,
      })),
  );
  const attention = center.inbox
    .filter((x: any) => !x.read_at)
    .sort(
      (a: any, b: any) =>
        communityStatusPriority(b.priority) -
        communityStatusPriority(a.priority),
    );
  if (appV2)
    return (
      <MinhaAreaAppV2
        profile={profile}
        center={center}
        selected={selected}
        contributions={contributions}
        archiveContributions={archiveContributions}
        collectiveTaskAssignments={collectiveTaskAssignments}
        attention={attention}
      />
    );
  return (
    <ComunShell>
      <ComunSection>
        <ComunBreadcrumbs
          items={[{ label: "Início", href: "/comun" }, { label: "Minha área" }]}
        />
        <h1 className="text-4xl font-black uppercase text-comun-yellow sm:text-6xl">
          Minha área
        </h1>
        <div className="mt-5 flex items-center gap-4 border-y-2 border-comun-paper/20 py-4">
          <span className="grid size-12 place-items-center rounded-lg bg-comun-yellow font-black text-comun-black">
            {String(profile?.display_name ?? "Pessoa")
              .split(/\s+/)
              .map((x: string) => x[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div>
            <p className="font-black">
              {profile?.display_name ?? "Identidade comunitária"}
            </p>
            <p className="text-sm text-comun-paper/60">
              Área privada · sem perfil público de popularidade
            </p>
          </div>
          <Link
            href="/comun/conta"
            className="ml-auto text-sm font-bold underline"
          >
            Configurações
          </Link>
        </div>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Organizada pelo que precisa de resposta e pela próxima ação — não por
          linha do tempo infinita.
        </p>
        <div className="mt-5 border-l-4 border-comun-yellow bg-comun-paper/5 p-4 text-sm">
          <p className="font-black uppercase text-comun-yellow">
            Seu ciclo de participação
          </p>
          <p className="mt-1 text-comun-paper/75">
            Contribuição recebida → revisão → proposta ou prioridade → ação ou
            encaminhamento → resultado e memória.
          </p>
          <Link
            href="/comun/caixa-de-entrada"
            className="mt-2 inline-flex font-black underline"
          >
            Ver retornos na Caixa de entrada
          </Link>
        </div>
      </ComunSection>
      <nav
        aria-label="Seções de Minha área"
        className="mx-auto flex max-w-7xl overflow-x-auto px-4 [scrollbar-width:none]"
      >
        <AreaTab
          value="contribuicoes"
          label="Contribuições"
          selected={selected}
        />
        <AreaTab
          value="acompanhando"
          label="Acompanhando"
          selected={selected}
        />
        <AreaTab value="tarefas" label="Tarefas" selected={selected} />
        <AreaTab value="resultados" label="Resultados" selected={selected} />
      </nav>
      {selected === "acompanhando" ? (
        <MyCommunitySummary memberships={center.communities} />
      ) : null}
      {selected === "tarefas" && attention.length ? (
        <Area title="Precisa da sua atenção">
          <div className="grid gap-3">
            {attention.slice(0, 5).map((x: any) => (
              <Link
                href={x.action_url}
                key={x.id}
                className="grid gap-3 bg-comun-yellow p-5 text-comun-black sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <ComunStatus>{communityStatusLabel(x.priority)}</ComunStatus>
                <span>
                  <strong className="block uppercase">{x.title}</strong>
                  <small>{x.summary}</small>
                </span>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </Area>
      ) : null}
      {selected === "tarefas" && center.circles.length ? (
        <Area title="Próximas rodas">
          <Rows
            rows={center.circles}
            title={(x: any) => x.title}
            status={(x: any) => x.status}
            text={(x: any) => x.public_question}
          />
        </Area>
      ) : null}
      {selected === "tarefas" && center.tasks.length ? (
        <Area title="Minhas tarefas">
          <Rows
            rows={center.tasks}
            title={(x: any) => x.title}
            status={(x: any) => x.status}
            text={(x: any) =>
              x.result_public || "Resultado esperado em definição"
            }
          />
        </Area>
      ) : null}
      {selected === "tarefas" && collectiveTaskAssignments.length ? (
        <Area title="Tarefas em ações coletivas">
          <div className="grid gap-4 md:grid-cols-2">
            {collectiveTaskAssignments.map((assignment: any) => (
              <article
                className="border-2 border-comun-yellow p-5"
                key={assignment.id}
              >
                <p className="text-xs font-black uppercase text-comun-yellow">
                  Tarefa assumida · {assignment.task?.state}
                </p>
                <h3 className="mt-2 text-xl font-black">
                  {assignment.task?.title}
                </h3>
                <p className="mt-2 text-comun-paper/75">
                  {assignment.task?.description}
                </p>
                <p className="mt-3 text-sm font-bold">
                  Ação: {assignment.participation.action?.title}
                  {assignment.task?.due_at
                    ? ` · até ${new Date(assignment.task.due_at).toLocaleDateString("pt-BR")}`
                    : ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={assignment.participation.action_url}
                    className="inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline"
                  >
                    Ver ação
                  </Link>
                  <form action={releaseCollectiveActionTask}>
                    <input
                      type="hidden"
                      name="slug"
                      value={assignment.participation.action?.slug}
                    />
                    <input
                      type="hidden"
                      name="task_id"
                      value={assignment.task?.id}
                    />
                    <button className="min-h-11 border-2 border-comun-paper px-3 font-black uppercase">
                      Liberar tarefa
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </Area>
      ) : null}
      {selected === "acompanhando" && center.memberships.length ? (
        <Area title="Acompanhando">
          <div className="grid gap-4 md:grid-cols-2">
            {center.memberships.map((x: any) => (
              <article className="border-2 border-comun-yellow p-5" key={x.id}>
                <ComunStatus>
                  {communityStatusLabel(x.pauta?.public_status || x.status)}
                </ComunStatus>
                <h3 className="mt-3 text-xl font-black">{x.pauta?.title}</h3>
                <p className="mt-2 text-comun-paper/70">
                  {x.pauta?.next_step || x.pauta?.public_synthesis}
                </p>
                <Link
                  href={`/comun/pautas/${x.pauta?.slug}`}
                  className="mt-4 inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline"
                >
                  Voltar à pauta
                </Link>
              </article>
            ))}
          </div>
        </Area>
      ) : null}
      {selected === "acompanhando" && collectiveActions.length ? (
        <Area title="Ações coletivas que você acompanha">
          <div className="grid gap-4 md:grid-cols-2">
            {collectiveActions.map((participation: any) => (
              <article
                className="border-2 border-comun-yellow p-5"
                key={participation.id}
              >
                <p className="text-xs font-black uppercase text-comun-yellow">
                  {participation.status} · {participation.action?.status}
                </p>
                <h3 className="mt-2 text-xl font-black">
                  {participation.action?.title}
                </h3>
                <p className="mt-2 text-comun-paper/75">
                  {participation.action?.summary}
                </p>
                <p className="mt-3 text-sm">
                  {participation.taskAssignments?.length ?? 0} tarefa(s)
                  assumida(s)
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={participation.action_url}
                    className="inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline"
                  >
                    Ver ação
                  </Link>
                  <form action={updateCollectiveActionParticipation}>
                    <input
                      type="hidden"
                      name="slug"
                      value={participation.action?.slug}
                    />
                    <input type="hidden" name="status" value="withdrew" />
                    <button
                      className="min-h-11 px-2 font-black underline disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={Boolean(participation.taskAssignments?.length)}
                      title={
                        participation.taskAssignments?.length
                          ? "Libere suas tarefas antes de sair."
                          : undefined
                      }
                    >
                      Sair da ação
                    </button>
                  </form>
                </div>
                {participation.taskAssignments?.length ? (
                  <p role="status" className="mt-3 text-sm text-comun-paper/70">
                    Libere suas tarefas antes de sair da ação.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </Area>
      ) : null}
      {selected === "contribuicoes" && contributions.length ? (
        <Area title="Minhas contribuições">
          <Rows
            rows={contributions}
            title={(x: any) =>
              x.title_suggestion || x.circle?.title || "Contribuição"
            }
            status={(x: any) => x.status}
            text={(x: any) => x.next_action_public || "Aguardar revisão"}
          />
        </Area>
      ) : null}
      {selected === "contribuicoes" && archiveContributions.length ? (
        <Area title="Memórias em identificação">
          <div className="grid gap-3">
            {archiveContributions.map((x: any) => (
              <article className="border-2 border-comun-yellow p-4" key={x.id}>
                <p className="text-xs font-black uppercase text-comun-yellow">
                  {x.suggestion_type} · {x.status}
                </p>
                <h3 className="mt-2 font-black">
                  {x.archive_item?.title ?? "Fotografia histórica"}
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {x.public_slug ? (
                    <Link
                      className="font-black underline"
                      href={`/comun/acervo/identificar/${x.public_slug}`}
                    >
                      Ver memória
                    </Link>
                  ) : null}
                  {!["withdrawn", "archived"].includes(x.status) &&
                  x.public_slug ? (
                    <form action={withdrawIdentificationComment}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="slug" value={x.public_slug} />
                      <button className="font-black text-red-300 underline">
                        Retirar contribuição
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Area>
      ) : null}
      {selected === "resultados" && center.results.length ? (
        <Area title="Resultados relacionados">
          <Rows
            rows={center.results}
            title={(x: any) => x.title}
            status={() => "result_recorded"}
            text={(x: any) => x.public_summary}
          />
        </Area>
      ) : null}
      {selected === "contribuicoes" &&
      !contributions.length &&
      !archiveContributions.length ? (
        <SingleEmpty href="/comun/participar" title="Sem contribuições">
          Registrar primeira contribuição
        </SingleEmpty>
      ) : null}
      {selected === "acompanhando" &&
      !center.memberships.length &&
      !collectiveActions.length ? (
        <SingleEmpty href="/comun/explorar" title="Nada acompanhado">
          Explorar comunidades
        </SingleEmpty>
      ) : null}
      {selected === "tarefas" &&
      !center.tasks.length &&
      !center.circles.length &&
      !collectiveTaskAssignments.length ? (
        <SingleEmpty href="/comun/participar" title="Sem tarefas">
          Encontrar formas de participar
        </SingleEmpty>
      ) : null}
      {selected === "resultados" && !center.results.length ? (
        <SingleEmpty href="/comun" title="Sem resultados relacionados">
          Voltar ao Início
        </SingleEmpty>
      ) : null}
    </ComunShell>
  );
}

function MinhaAreaAppV2({
  profile,
  center,
  selected,
  contributions,
  archiveContributions,
  collectiveTaskAssignments,
  attention,
}: {
  profile: any;
  center: any;
  selected: string;
  contributions: any[];
  archiveContributions: any[];
  collectiveTaskAssignments: any[];
  attention: any[];
}) {
  const tabs = [
    ["contribuicoes", "Contribuições"],
    ["acompanhando", "Acompanhando"],
    ["tarefas", "Tarefas"],
    ["resultados", "Resultados"],
  ] as const;
  return (
    <ComunShell
      inboxBadge={attention.length}
      appBar={{
        title: "Minha área",
        contextLabel: "Sua relação com os processos",
      }}
    >
      <div className="comun-v2-page" data-comun-app-v2-page="my-area">
        <header className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-[var(--comun-radius-community)] bg-comun-yellow font-black">
            {String(profile?.display_name ?? "Pessoa")
              .split(/\s+/)
              .map((part: string) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div>
            <h1 className="comun-v2-title normal-case">Minha área</h1>
            <p className="mt-1 text-sm text-comun-black/60">
              {profile?.display_name ?? "Identidade comunitária"} · área privada
            </p>
          </div>
        </header>
        <p className="mt-5 max-w-2xl text-comun-black/70">
          Organizada pela próxima ação e pelo retorno — nunca por popularidade
          ou linha do tempo infinita.
        </p>
        <div className="surface-community mt-5 rounded-[var(--comun-radius-card)] border-l-4 border-comun-yellow p-4 text-sm">
          <p className="comun-v2-eyebrow">Seu ciclo de participação</p>
          <p className="mt-2">
            Contribuição → revisão → prioridade → ação → resultado e memória.
          </p>
        </div>
        <nav
          aria-label="Seções de Minha área"
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map(([value, label]) => (
            <Link
              key={value}
              href={withComunAppV2(`/comun/minha-participacao?secao=${value}`)}
              className="comun-v2-chip"
              aria-current={selected === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <section className="mt-5" aria-live="polite">
          {selected === "contribuicoes" ? (
            <div className="grid gap-3">
              {[...contributions, ...archiveContributions]
                .slice(0, 6)
                .map((item: any, index) => (
                  <article
                    key={item.id ?? index}
                    className="surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4"
                  >
                    <p className="comun-v2-status text-comun-rust">
                      {communityStatusLabel(item.status ?? "pending")}
                    </p>
                    <h2 className="mt-2 font-black normal-case">
                      {item.title ??
                        item.public_title ??
                        item.contribution_type ??
                        "Contribuição recebida"}
                    </h2>
                    <p className="mt-2 text-sm text-comun-black/65">
                      A próxima mudança aparecerá na Caixa quando houver decisão
                      ou pedido de complemento.
                    </p>
                  </article>
                ))}
              {!contributions.length && !archiveContributions.length ? (
                <ComunStatePanel
                  state="empty"
                  actionHref={withComunAppV2("/comun/participar")}
                  actionLabel="Escolher participação"
                >
                  Você ainda não enviou contribuições nesta área.
                </ComunStatePanel>
              ) : null}
            </div>
          ) : null}
          {selected === "acompanhando" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {(center.memberships ?? []).slice(0, 6).map((item: any) => (
                <ComunPautaCard
                  key={item.id}
                  href={withComunAppV2(`/comun/pautas/${item.pauta?.slug}`)}
                  title={item.pauta?.title ?? "Pauta acompanhada"}
                  summary={
                    item.pauta?.public_synthesis ??
                    "Processo em acompanhamento."
                  }
                  status={item.status ?? "Acompanhando"}
                  nextAction={item.pauta?.next_step ?? "Ver atualização"}
                />
              ))}
            </div>
          ) : null}
          {selected === "tarefas" ? (
            <div className="grid gap-3">
              {[...attention, ...collectiveTaskAssignments]
                .slice(0, 6)
                .map((item: any, index) => (
                  <article
                    key={item.id ?? index}
                    className="surface-alert rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4"
                  >
                    <p className="comun-v2-status">
                      {item.status ?? item.priority ?? "Aguardando pessoa"}
                    </p>
                    <h2 className="mt-2 font-black normal-case">
                      {item.title ?? item.task?.title ?? "Tarefa comunitária"}
                    </h2>
                    <p className="mt-2 text-sm">
                      {item.summary ??
                        item.description ??
                        "Abra a tarefa para conferir responsabilidade e prazo."}
                    </p>
                  </article>
                ))}
            </div>
          ) : null}
          {selected === "resultados" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {(center.results ?? []).slice(0, 6).map((item: any) => (
                <ComunResultCard
                  key={item.id}
                  href={withComunAppV2("/comun/resultados")}
                  title={item.title}
                  summary={
                    item.public_summary ??
                    "Resultado publicado com fonte e contexto."
                  }
                />
              ))}
            </div>
          ) : null}
        </section>
        <Link
          href="/comun/minha-participacao"
          className="mt-8 inline-flex min-h-11 items-center text-sm font-black underline"
        >
          Abrir versão atual completa
        </Link>
      </div>
    </ComunShell>
  );
}
function CollectiveActionsPreviewParticipation() {
  return (
    <ComunShell>
      <ComunSection>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Minha área
        </h1>
        <p className="mt-3 text-comun-paper/75">
          Demonstração de Preview com participação sintética e sem dados
          pessoais.
        </p>
        <div className="mt-6 grid gap-4">
          {collectiveActionsPreviewFixtures.map((action) => (
            <article
              key={action.id}
              className="border-2 border-comun-yellow p-5"
            >
              <p className="text-xs font-black uppercase text-comun-yellow">
                Participando · {action.status}
              </p>
              <h2 className="mt-2 text-xl font-black">{action.title}</h2>
              <p className="mt-2 text-comun-paper/75">{action.summary}</p>
              {action.tasks.slice(0, 1).map((task) => (
                <div
                  className="mt-4 border-l-4 border-comun-yellow bg-comun-paper/5 p-4"
                  key={task.id}
                >
                  <p className="text-xs font-black uppercase text-comun-yellow">
                    Tarefa assumida
                  </p>
                  <p className="mt-1 font-black">{task.title}</p>
                  <button
                    disabled
                    className="mt-3 min-h-11 border-2 border-comun-paper px-3 font-black uppercase opacity-60"
                  >
                    Liberar no modo autenticado
                  </button>
                </div>
              ))}
            </article>
          ))}
        </div>
      </ComunSection>
    </ComunShell>
  );
}
function AreaTab({
  value,
  label,
  selected,
}: {
  value: string;
  label: string;
  selected: string;
}) {
  return (
    <Link
      aria-current={selected === value ? "page" : undefined}
      href={`/comun/minha-participacao?secao=${value}`}
      className={`min-h-11 whitespace-nowrap border-b-4 px-4 py-3 text-sm font-black ${selected === value ? "border-comun-yellow text-comun-yellow" : "border-transparent text-comun-paper/70"}`}
    >
      {label}
    </Link>
  );
}
function SingleEmpty({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: string;
}) {
  return (
    <ComunSection>
      <div className="border-2 border-comun-yellow p-5">
        <h2 className="text-xl font-black text-comun-yellow">{title}</h2>
        <PrimaryLink href={href}>{children}</PrimaryLink>
      </div>
    </ComunSection>
  );
}
function Area({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <ComunSection>
      <ComunSectionHeader title={title} />
      {children}
    </ComunSection>
  );
}
function Rows({
  rows,
  title,
  status,
  text,
}: {
  rows: any[];
  title: (x: any) => string;
  status: (x: any) => string;
  text: (x: any) => string;
}) {
  return (
    <div className="divide-y-2 divide-comun-black border-2 border-comun-black bg-comun-paper text-comun-black">
      {rows.map((x) => (
        <article className="grid gap-3 p-4 sm:grid-cols-[auto_1fr]" key={x.id}>
          <ComunStatus>{communityStatusLabel(status(x))}</ComunStatus>
          <div>
            <h3 className="font-black uppercase">{title(x)}</h3>
            <p className="mt-1 text-sm text-comun-asphalt/75">{text(x)}</p>
            {x.last_changed_at ? (
              <p className="mt-1 text-xs text-comun-asphalt/75">
                Última mudança:{" "}
                {new Date(x.last_changed_at).toLocaleDateString("pt-BR")}
              </p>
            ) : null}
            {x.action_url ? (
              <Link
                href={x.action_url}
                className="mt-2 inline-flex min-h-10 items-center font-black underline"
              >
                Abrir acompanhamento
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
