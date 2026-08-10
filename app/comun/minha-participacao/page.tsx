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
import {
  getCommunitySession,
  requireCommunitySession,
} from "@/lib/community-auth";
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
import {
  COMUN_JOURNEY_STATE_COPY,
  normalizeComunJourneyStatus,
} from "@/lib/comun-journey-status";
import { isComunParticipationWalletEnabled } from "@/lib/comun-participation-wallet-feature";
import { ParticipationWalletPanel } from "./participation-wallet-panel";
import { isComunStmuAssistedEnabled } from "@/lib/comun-stmu-assisted-feature";
import { isComunStmuMultichannelEnabled } from "@/lib/comun-stmu-multichannel-feature";
import {
  isComunEssentialForwardingAssistedEnabled,
  isComunEssentialServicesEnabled,
} from "@/lib/comun-essential-services-feature";

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
  const v2Sections = [
    "contribuicoes",
    "comunidades",
    "tarefas",
    "acompanhando",
    "resultados",
    "cultura",
    "configuracoes",
  ];
  const legacySections = [
    "contribuicoes",
    "acompanhando",
    "tarefas",
    "resultados",
  ];
  const selected = (appV2 ? v2Sections : legacySections).includes(
    requested ?? "",
  )
    ? requested!
    : "contribuicoes";
  const walletEnabled = isComunParticipationWalletEnabled();
  const stmuAssistedEnabled = isComunStmuAssistedEnabled();
  const stmuMultichannelEnabled = isComunStmuMultichannelEnabled();
  const essentialServicesEnabled = isComunEssentialServicesEnabled();
  const essentialForwardingEnabled =
    isComunEssentialForwardingAssistedEnabled();
  const optionalCommunitySession = walletEnabled
    ? await getCommunitySession()
    : null;
  if (walletEnabled) {
    if (!optionalCommunitySession?.user)
      return (
        <WalletOnlyPage
          stmuAssistedEnabled={stmuAssistedEnabled}
          stmuMultichannelEnabled={stmuMultichannelEnabled}
          essentialServicesEnabled={essentialServicesEnabled}
          essentialForwardingEnabled={essentialForwardingEnabled}
        />
      );
  }
  const { user, profile } = await requireCommunitySession(
    withComunAppV2(`/comun/minha-participacao?secao=${selected}`, appV2),
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
        walletEnabled={walletEnabled}
        accountAvailable={Boolean(optionalCommunitySession?.user)}
        stmuAssistedEnabled={stmuAssistedEnabled}
        stmuMultichannelEnabled={stmuMultichannelEnabled}
        essentialServicesEnabled={essentialServicesEnabled}
        essentialForwardingEnabled={essentialForwardingEnabled}
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
      {walletEnabled ? (
        <ComunSection>
          <ParticipationWalletPanel
            accountAvailable={Boolean(optionalCommunitySession?.user)}
            stmuAssistedEnabled={stmuAssistedEnabled}
            stmuMultichannelEnabled={stmuMultichannelEnabled}
            essentialServicesEnabled={essentialServicesEnabled}
            essentialForwardingEnabled={essentialForwardingEnabled}
          />
        </ComunSection>
      ) : null}
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
  walletEnabled,
  accountAvailable,
  stmuAssistedEnabled,
  stmuMultichannelEnabled,
  essentialServicesEnabled,
  essentialForwardingEnabled,
}: {
  profile: any;
  center: any;
  selected: string;
  contributions: any[];
  archiveContributions: any[];
  collectiveTaskAssignments: any[];
  attention: any[];
  walletEnabled: boolean;
  accountAvailable: boolean;
  stmuAssistedEnabled: boolean;
  stmuMultichannelEnabled: boolean;
  essentialServicesEnabled: boolean;
  essentialForwardingEnabled: boolean;
}) {
  const tabs = [
    ["contribuicoes", "Participações"],
    ["comunidades", "Comunidades"],
    ["tarefas", "Tarefas"],
    ["acompanhando", "Acompanhamentos"],
    ["resultados", "Resultados"],
    ["cultura", "Cultura"],
    ["configuracoes", "Configurações"],
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
          Histórico, vínculos e continuidade. Mensagens que pedem ação ficam
          somente na Caixa.
        </p>
        {walletEnabled ? (
          <ParticipationWalletPanel
            accountAvailable={accountAvailable}
            stmuAssistedEnabled={stmuAssistedEnabled}
            stmuMultichannelEnabled={stmuMultichannelEnabled}
            essentialServicesEnabled={essentialServicesEnabled}
            essentialForwardingEnabled={essentialForwardingEnabled}
          />
        ) : null}
        <div
          className="mt-5 grid grid-cols-3 gap-2"
          aria-label="Resumo da sua área"
        >
          <AreaMetric
            label="Ativas"
            value={
              contributions.filter(
                (item) =>
                  !["completed", "withdrawn", "archived"].includes(item.status),
              ).length
            }
          />
          <AreaMetric
            label="Vínculos"
            value={(center.communities ?? []).length}
          />
          <AreaMetric
            label="Resultados"
            value={(center.results ?? []).length}
          />
        </div>
        {attention.length ? (
          <Link
            href={withComunAppV2("/comun/caixa-de-entrada")}
            className="surface-alert mt-4 flex min-h-12 items-center justify-between rounded-[var(--comun-radius-card)] border border-comun-black/20 px-4 font-black"
          >
            <span>
              {attention.length} mensagem(ns) pedem compreensão ou ação
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
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
                      {
                        COMUN_JOURNEY_STATE_COPY[
                          normalizeComunJourneyStatus(item.status)
                        ].label
                      }
                    </p>
                    <h2 className="mt-2 font-black normal-case">
                      {item.title ??
                        item.public_title ??
                        item.contribution_type ??
                        "Contribuição recebida"}
                    </h2>
                    <p className="mt-2 text-sm text-comun-black/65">
                      {item.next_action_public ??
                        "A próxima mudança aparecerá aqui; pedidos de ação chegam pela Caixa."}
                    </p>
                    {item.action_url ? (
                      <Link
                        className="mt-3 inline-flex min-h-11 items-center font-black underline"
                        href={withComunAppV2(item.action_url)}
                      >
                        Abrir acompanhamento
                      </Link>
                    ) : null}
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
          {selected === "comunidades" ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {(center.communities ?? []).slice(0, 6).map((item: any) => (
                <article
                  key={item.id}
                  className="surface-community rounded-[var(--comun-radius-community)] border border-comun-black/20 p-4"
                >
                  <p className="comun-v2-status">
                    {communityStatusLabel(item.status ?? "member")}
                  </p>
                  <h2 className="mt-2 text-lg font-black normal-case">
                    {item.community?.name ?? item.name ?? "Comunidade"}
                  </h2>
                  <p className="mt-2 text-sm text-comun-black/65">
                    {item.community?.purpose ??
                      item.purpose ??
                      "Vínculo comunitário ativo."}
                  </p>
                  <Link
                    className="mt-3 inline-flex min-h-11 items-center font-black underline"
                    href={withComunAppV2(
                      `/comun/c/${item.community?.slug ?? item.slug ?? "cidade"}`,
                    )}
                  >
                    Abrir comunidade
                  </Link>
                </article>
              ))}
              {!(center.communities ?? []).length ? (
                <ComunStatePanel
                  state="empty"
                  actionHref={withComunAppV2("/comun/comunidades")}
                  actionLabel="Explorar comunidades"
                >
                  Você ainda não possui vínculo comunitário.
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
              {[...(center.tasks ?? []), ...collectiveTaskAssignments]
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
              {!(center.tasks ?? []).length &&
              !collectiveTaskAssignments.length ? (
                <ComunStatePanel
                  state="empty"
                  actionHref={withComunAppV2("/comun/acoes")}
                  actionLabel="Encontrar uma ação"
                >
                  Nenhuma tarefa está sob sua responsabilidade.
                </ComunStatePanel>
              ) : null}
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
          {selected === "cultura" ? (
            <div className="grid gap-3">
              {archiveContributions.slice(0, 6).map((item: any) => (
                <article
                  key={item.id}
                  className="surface-memory rounded-[var(--comun-radius-cultural)] border border-comun-black/20 p-4"
                >
                  <p className="comun-v2-status">
                    {
                      COMUN_JOURNEY_STATE_COPY[
                        normalizeComunJourneyStatus(item.status)
                      ].label
                    }
                  </p>
                  <h2 className="mt-2 font-black normal-case">
                    {item.archive_item?.title ?? "Contribuição cultural"}
                  </h2>
                  {item.public_slug ? (
                    <Link
                      className="mt-3 inline-flex min-h-11 items-center font-black underline"
                      href={withComunAppV2(
                        `/comun/acervo/identificar/${item.public_slug}`,
                      )}
                    >
                      Abrir acompanhamento
                    </Link>
                  ) : null}
                </article>
              ))}
              {!archiveContributions.length ? (
                <ComunStatePanel
                  state="empty"
                  actionHref={withComunAppV2("/comun/participar")}
                  actionLabel="Contribuir com cultura"
                >
                  Nenhuma contribuição cultural vinculada à sua área.
                </ComunStatePanel>
              ) : null}
            </div>
          ) : null}
          {selected === "configuracoes" ? (
            <div className="grid gap-3">
              <AreaSettingsLink href="/comun/conta">
                Conta e preferências
              </AreaSettingsLink>
              <AreaSettingsLink href="/comun/seguranca">
                Privacidade e segurança
              </AreaSettingsLink>
              <AreaSettingsLink href="/comun/ajuda">Ajuda</AreaSettingsLink>
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
function AreaMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-3">
      <strong className="block text-2xl font-black">{value}</strong>
      <span className="text-xs font-bold text-comun-black/60">{label}</span>
    </div>
  );
}

function AreaSettingsLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="surface-paper flex min-h-14 items-center justify-between rounded-[var(--comun-radius-card)] border border-comun-black/20 px-4 font-black"
      href={withComunAppV2(href)}
    >
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </Link>
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

function WalletOnlyPage({
  stmuAssistedEnabled,
  stmuMultichannelEnabled,
  essentialServicesEnabled,
  essentialForwardingEnabled,
}: {
  stmuAssistedEnabled: boolean;
  stmuMultichannelEnabled: boolean;
  essentialServicesEnabled: boolean;
  essentialForwardingEnabled: boolean;
}) {
  return (
    <ComunShell
      appBar={{ title: "Minha Participação", contextLabel: "Carteira" }}
    >
      <div className="comun-v2-page" data-comun-app-v2-page="wallet-only">
        <ParticipationWalletPanel
          standalone
          stmuAssistedEnabled={stmuAssistedEnabled}
          stmuMultichannelEnabled={stmuMultichannelEnabled}
          essentialServicesEnabled={essentialServicesEnabled}
          essentialForwardingEnabled={essentialForwardingEnabled}
        />
      </div>
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
