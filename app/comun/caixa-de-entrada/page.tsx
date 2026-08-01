import Link from "next/link";
import { ComunShell } from "@/components/comun-shell";
import {
  ComunBreadcrumbs,
  ComunEmptyState,
  ComunSection,
  ComunStatus,
} from "@/components/comun-ui";
import { ComunStatePanel } from "@/components/comun-state-panel";
import { requireCommunitySession } from "@/lib/community-auth";
import { listMemberInbox } from "@/lib/community-inbox";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { withComunJourneyContext } from "@/lib/comun-journey-context";
import { groupComunInbox } from "@/lib/comun-inbox-presentation";
import { archiveInboxItem, markInboxRead, markInboxUnread } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { experiencia?: string; visao?: string };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const appV2 = isComunAppV2(params.experiencia);
  const history = appV2 && params.visao === "historico";
  const returnRoute = withComunAppV2(
    `/comun/caixa-de-entrada${history ? "?visao=historico" : ""}`,
    appV2,
  );
  const { user } = await requireCommunitySession(returnRoute);
  const rows: any[] = await listMemberInbox(user.id, { history });
  if (appV2) return <InboxAppV2 rows={rows} history={history} />;
  return <LegacyInbox rows={rows} />;
}

function InboxAppV2({ rows, history }: { rows: any[]; history: boolean }) {
  const sourceRoute = withComunAppV2(
    `/comun/caixa-de-entrada${history ? "?visao=historico" : ""}`,
  );
  const sections = groupComunInbox(rows);
  return (
    <ComunShell
      inboxBadge={history ? 0 : rows.filter((row) => !row.read_at).length}
      appBar={{ title: "Caixa", contextLabel: "Mensagens com significado" }}
    >
      <div className="comun-v2-page" data-comun-app-v2-page="inbox">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="comun-v2-title normal-case">Caixa</h1>
            <p className="mt-2 max-w-xl text-sm text-comun-black/65">
              Pedidos, decisões e resultados ligados a processos que você
              acompanha. Eventos técnicos não aparecem aqui.
            </p>
          </div>
        </header>
        <nav aria-label="Visões da Caixa" className="mt-5 flex gap-2">
          <Link
            href={withComunAppV2("/comun/caixa-de-entrada")}
            className="comun-v2-chip"
            aria-current={!history ? "page" : undefined}
          >
            Prioridade
          </Link>
          <Link
            href={withComunAppV2("/comun/caixa-de-entrada?visao=historico")}
            className="comun-v2-chip"
            aria-current={history ? "page" : undefined}
          >
            Histórico
          </Link>
        </nav>

        <div className="mt-7 grid gap-8">
          {sections.map((section) => (
            <section
              key={section.group}
              aria-labelledby={`inbox-${section.group}`}
            >
              <h2
                id={`inbox-${section.group}`}
                className="comun-v2-section-title"
              >
                {section.label}
              </h2>
              <div className="mt-3 grid gap-3">
                {section.rows.map((item: any) => {
                  const sourceHref = withComunAppV2(
                    withComunJourneyContext(item.action_url, {
                      sourceRoute,
                      returnTo: sourceRoute,
                      currentStage:
                        section.group === "result" ? "result" : "response",
                    }),
                  );
                  return (
                    <article
                      key={item.id}
                      className={`${item.read_at ? "surface-paper" : "surface-alert"} rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {!item.read_at ? (
                          <span className="comun-v2-status text-comun-rust">
                            Não lida
                          </span>
                        ) : (
                          <span className="comun-v2-status text-comun-black/55">
                            Lida
                          </span>
                        )}
                        <span className="text-xs font-bold text-comun-black/55">
                          {item.context.sourceLabel} · {item.context.entityType}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-black normal-case">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm text-comun-black/70">
                        {item.summary}
                      </p>
                      {item.created_at ? (
                        <time
                          className="mt-2 block text-xs text-comun-black/55"
                          dateTime={item.created_at}
                        >
                          {new Date(item.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </time>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Link className="comun-v2-action" href={sourceHref}>
                          {item.action_label || "Abrir origem"}
                        </Link>
                        {!history ? (
                          item.read_at ? (
                            <InboxForm
                              action={markInboxUnread}
                              id={item.id}
                              label="Marcar como não lida"
                            />
                          ) : (
                            <InboxForm
                              action={markInboxRead}
                              id={item.id}
                              label="Marcar como lida"
                            />
                          )
                        ) : null}
                        {!history ? (
                          <InboxForm
                            action={archiveInboxItem}
                            id={item.id}
                            label="Arquivar"
                          />
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        {!rows.length ? (
          <div className="mt-7">
            <ComunStatePanel
              state="empty"
              actionHref={withComunAppV2(
                history ? "/comun/caixa-de-entrada" : "/comun",
              )}
              actionLabel={history ? "Voltar à prioridade" : "Voltar ao Início"}
            >
              {history
                ? "Nenhuma comunicação foi arquivada ainda."
                : "Nenhuma mensagem precisa da sua compreensão ou ação agora."}
            </ComunStatePanel>
          </div>
        ) : null}
      </div>
    </ComunShell>
  );
}

function InboxForm({
  action,
  id,
  label,
}: {
  action: (data: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="inline-flex min-h-11 items-center text-sm font-black underline">
        {label}
      </button>
    </form>
  );
}

function LegacyInbox({ rows }: { rows: any[] }) {
  return (
    <ComunShell>
      <ComunSection>
        <ComunBreadcrumbs
          items={[
            { label: "Início", href: "/comun" },
            { label: "Caixa de Entrada" },
          ]}
        />
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Caixa de Entrada
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Atualizações operacionais e ações necessárias. Não é chat e não contém
          notificações de popularidade.
        </p>
        <div className="mt-7 grid gap-4">
          {rows.map((item) => (
            <article
              className={`relative border-b-2 p-5 first:border-t-2 ${item.read_at ? "border-comun-paper/25" : "border-comun-yellow bg-comun-paper/[.04]"}`}
              key={item.id}
            >
              <div className="flex flex-wrap items-center gap-3">
                <ComunStatus>{item.priority}</ComunStatus>
                {!item.read_at ? (
                  <>
                    <span
                      className="size-2 rounded-full bg-comun-yellow"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Não lida</span>
                  </>
                ) : null}
                <span className="text-xs font-bold text-comun-paper/60">
                  {item.context.sourceLabel} · {item.context.entityType}
                  {item.context.entityRef ? ` · ${item.context.entityRef}` : ""}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-black">{item.title}</h2>
              <p className="mt-3 text-xs font-black uppercase text-comun-yellow">
                O que aconteceu
              </p>
              <p className="mt-2 text-comun-paper/75">{item.summary}</p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  className="font-black uppercase text-comun-yellow underline"
                  href={item.action_url}
                >
                  {item.action_label}
                </Link>
                {!item.read_at ? (
                  <InboxForm
                    action={markInboxRead}
                    id={item.id}
                    label="Marcar como lida"
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {!rows.length ? (
          <div className="mt-7">
            <ComunEmptyState href="/comun" label="Voltar ao Início">
              Nenhuma ação precisa da sua atenção agora.
            </ComunEmptyState>
          </div>
        ) : null}
      </ComunSection>
    </ComunShell>
  );
}
