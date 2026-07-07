import Link from "next/link";
import { createPautaFromSignalAction, updateOfficialProtocolQueueAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { officialChannels } from "@/lib/official-channels";
import { listAdminOfficialProtocols } from "@/lib/official-protocols";

const statusOptions = [
  ["", "Todos"],
  ["draft", "Rascunho"],
  ["text_generated", "Texto gerado"],
  ["sent_by_user", "Enviado pelo usuario"],
  ["official_protocol_informed", "Protocolo oficial informado"],
  ["waiting_response", "Aguardando resposta"],
  ["response_received", "Resposta recebida"],
  ["satisfactory_response", "Resposta satisfatoria"],
  ["unsatisfactory_response", "Resposta insatisfatoria"],
  ["overdue", "Prazo vencido"],
  ["resolved", "Resolvido"],
  ["unresolved", "Nao resolvido"],
  ["archived", "Arquivado"],
] as const;

export default async function AdminOfficialProtocolsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const session = await requireComunAdmin();
  const [communities, issues, queue] = await Promise.all([
    listCommunities(),
    listIssues(),
    listAdminOfficialProtocols({
      status: searchParams.status,
      communitySlug: searchParams.comunidade,
      issueSlug: searchParams.pauta,
      channel: searchParams.canal,
      numberState: searchParams.numero === "com" ? "with" : searchParams.numero === "sem" ? "without" : undefined,
      responseState: searchParams.resposta === "com" ? "with" : searchParams.resposta === "sem" ? "without" : undefined,
      overdueOnly: searchParams.vencidos === "sim",
      createdFrom: searchParams.data_de,
      createdTo: searchParams.data_ate,
    }),
  ]);
  const issueBySlug = new Map(issues.map((issue) => [issue.slug, issue.title]));
  const returnTo = buildReturnTo(searchParams);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Protocolos oficiais</h1>
          <p className="mt-2 max-w-3xl text-sm text-comun-asphalt/75">
            Acompanhe prazos, respostas e resolucao de demandas registradas em canais oficiais. Respostas completas e notas internas continuam privadas.
          </p>
        </div>
        <Link href="/comun/admin" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">
          Voltar aos relatos
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
        <StatCard label="Total" value={queue.stats.total} />
        <StatCard label="Rascunhos" value={queue.stats.drafts} />
        <StatCard label="Enviados pelo usuario" value={queue.stats.sent_by_user} />
        <StatCard label="Aguardando resposta" value={queue.stats.waiting_response} />
        <StatCard label="Vencidos/atrasados" value={queue.stats.overdue} />
        <StatCard label="Resposta recebida" value={queue.stats.response_received} />
        <StatCard label="Resolvidos" value={queue.stats.resolved} />
        <StatCard label="Nao resolvidos" value={queue.stats.unresolved} />
      </div>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Inteligencia operacional</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tempo medio de resposta" value={formatDaysMetric(queue.metrics.averageDaysToResponse)} />
          <StatCard label="Tempo medio de resolucao" value={formatDaysMetric(queue.metrics.averageDaysToResolution)} />
          <MetricLink href={filterHref(searchParams, { vencidos: "sim" })} label="Protocolos vencidos" value={queue.metrics.overdueCount} />
          <MetricLink href={filterHref(searchParams, { status: "waiting_response" })} label="Aguardando resposta" value={queue.metrics.waitingResponse} />
          <MetricLink href={filterHref(searchParams, { resposta: "com" })} label="Resposta sem resumo publico" value={queue.metrics.responseWithoutPublicSummary} />
          <MetricLink href={filterHref(searchParams, { pauta: queue.metrics.topIssue?.key })} label="Pauta mais recorrente" value={labelForIssue(queue.metrics.topIssue?.key, issueBySlug)} detail={queue.metrics.topIssue ? `${queue.metrics.topIssue.total} protocolos` : undefined} />
          <MetricLink href={filterHref(searchParams, { comunidade: queue.metrics.topCommunity?.key })} label="Comunidade mais recorrente" value={queue.metrics.topCommunity?.key ?? "-"} detail={queue.metrics.topCommunity ? `${queue.metrics.topCommunity.total} protocolos` : undefined} />
          <MetricLink href={filterHref(searchParams, { canal: queue.metrics.topPendingChannel?.key })} label="Canal/agencia com mais pendencias" value={queue.metrics.topPendingChannel?.key ?? "-"} detail={queue.metrics.topPendingChannel ? `${queue.metrics.topPendingChannel.waitingResponse + queue.metrics.topPendingChannel.overdue} pendencias` : undefined} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <MetricTable title="Top pautas por volume" rows={queue.metrics.byIssue.slice(0, 6)} labelFor={(key) => labelForIssue(key, issueBySlug)} filterKey="pauta" searchParams={searchParams} />
          <MetricTable title="Top comunidades por volume" rows={queue.metrics.byCommunity.slice(0, 6)} filterKey="comunidade" searchParams={searchParams} />
          <IssueStatusTable rows={queue.metrics.byIssueAndStatus.slice(0, 6)} issueBySlug={issueBySlug} searchParams={searchParams} />
          <MetricTable title="Vencidos por pauta" rows={queue.metrics.byIssue.filter((row) => row.overdue > 0).slice(0, 6)} labelFor={(key) => labelForIssue(key, issueBySlug)} filterKey="pauta" searchParams={searchParams} primaryField="overdue" />
          <MetricTable title="Respostas por canal/agencia" rows={queue.metrics.byChannel.slice(0, 6)} filterKey="canal" searchParams={searchParams} primaryField="responseReceived" />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Possiveis dossies</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {queue.metrics.dossierSignals.map((signal, index) => (
            <div key={`${signal.type}-${signal.issue}-${signal.community ?? "geral"}-${index}`} className="border-2 border-comun-black bg-white p-4">
              <p className="text-xs font-black uppercase text-comun-asphalt/60">{dossierReasonLabel(signal.reason)}</p>
              <h3 className="mt-1 text-lg font-black uppercase">{labelForIssue(signal.issue, issueBySlug)}</h3>
              <p className="mt-1 text-sm text-comun-asphalt/75">Comunidade: {signal.community ?? "todas"}</p>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-sm">
                <MetaRow label="Protocolos" value={String(signal.total)} />
                <MetaRow label="Vencidos" value={String(signal.overdue)} />
                <MetaRow label="Resolvidos" value={String(signal.resolved)} />
                <MetaRow label="Nao resolvidos" value={String(signal.unresolved)} />
              </dl>
              <Link href={filterHref(searchParams, { pauta: signal.issue, comunidade: signal.community ?? undefined })} className="mt-3 inline-flex min-h-10 items-center border-2 border-comun-black bg-comun-yellow px-3 text-sm font-black uppercase">
                Ver protocolos filtrados
              </Link>
              <form action={createPautaFromSignalAction} className="mt-2">
                <input type="hidden" name="title" value={labelForIssue(signal.issue, issueBySlug)} />
                <input type="hidden" name="category" value={signal.issue === "sem-pauta" ? "" : signal.issue} />
                <input type="hidden" name="community" value={signal.community ?? ""} />
                <input type="hidden" name="created_from_signal" value={`protocolos-oficiais:${signal.reason}`} />
                <button className="min-h-10 border-2 border-comun-black bg-white px-3 text-sm font-black uppercase">
                  Criar pauta social
                </button>
              </form>
            </div>
          ))}
          {!queue.metrics.dossierSignals.length ? <p className="border-2 border-comun-black bg-white p-4">Ainda nao ha sinais suficientes para preparar dossies.</p> : null}
        </div>
      </section>

      <form className="mt-6 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-5">
        <Select name="status" label="Status" values={statusOptions} defaultValue={searchParams.status} />
        <label className="grid gap-1 text-sm font-black uppercase">
          Comunidade
          <select name="comunidade" defaultValue={searchParams.comunidade ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todas</option>
            {communities.map((community) => <option key={community.slug} value={community.slug}>{community.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black uppercase">
          Pauta
          <select name="pauta" defaultValue={searchParams.pauta ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todas</option>
            {issues.map((issue) => <option key={issue.slug} value={issue.slug}>{issue.title}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black uppercase">
          Canal
          <select name="canal" defaultValue={searchParams.canal ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todos</option>
            {officialChannels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
          </select>
        </label>
        <Select name="numero" label="Numero oficial" values={[["", "Todos"], ["com", "Com numero"], ["sem", "Sem numero"]]} defaultValue={searchParams.numero} />
        <Select name="resposta" label="Resposta" values={[["", "Todas"], ["com", "Com resposta"], ["sem", "Sem resposta"]]} defaultValue={searchParams.resposta} />
        <Select name="vencidos" label="Vencidos" values={[["", "Todos"], ["sim", "Somente vencidos"]]} defaultValue={searchParams.vencidos} />
        <DateInput name="data_de" label="Data de" defaultValue={searchParams.data_de} />
        <DateInput name="data_ate" label="Data ate" defaultValue={searchParams.data_ate} />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase">Filtrar</button>
      </form>

      <div className="mt-6 grid gap-4">
        {queue.items.map((item) => (
          <article key={item.id} className="border-2 border-comun-black bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {item.timing.isOverdue ? <Badge tone="urgent">Atrasado</Badge> : null}
              {item.timing.isNearDue ? <Badge tone="attention">Perto do prazo</Badge> : null}
              {item.has_response_text ? <Badge tone="safe">Resposta registrada</Badge> : null}
              {item.public_summary ? <Badge tone="safe">Resumo publico</Badge> : null}
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_280px]">
              <dl className="grid gap-3 text-sm md:grid-cols-3">
                <MetaRow label="Protocolo COMUN" value={item.comun_protocol} />
                <MetaRow label="Numero oficial" value={item.official_protocol_number ?? "-"} />
                <MetaRow label="Comunidade" value={item.report?.community_slug ?? "-"} />
                <MetaRow label="Pauta" value={item.report?.issue_slug ? issueBySlug.get(item.report.issue_slug) ?? item.report.issue_slug : "Sem pauta"} />
                <MetaRow label="Canal/agencia" value={`${item.channel}${item.agency ? ` / ${item.agency}` : ""}`} />
                <MetaRow label="Status" value={officialStatusLabel(item.status)} />
                <MetaRow label="Data de envio" value={formatDate(item.submitted_at)} />
                <MetaRow label="Previsao de resposta" value={formatDate(item.expected_response_at)} />
                <MetaRow label="Dias em aberto" value={item.timing.daysOpen == null ? "-" : String(item.timing.daysOpen)} />
                <MetaRow label="Resposta recebida" value={item.response_received_at ? "Sim" : "Nao"} />
                <MetaRow label="Resumo publico" value={item.public_summary ? "Sim" : "Nao"} />
              </dl>
              <div className="grid gap-3">
                <Link
                  href={`/comun/admin/relatos/${item.report_id}`}
                  className="min-h-10 border-2 border-comun-black bg-comun-black px-3 py-2 text-center text-sm font-black uppercase text-comun-yellow"
                >
                  Abrir relato
                </Link>
                <QuickActions itemId={item.id} returnTo={returnTo} publicSummary={item.public_summary} />
              </div>
            </div>
          </article>
        ))}
        {!queue.items.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhum protocolo oficial encontrado.</p> : null}
      </div>
    </AdminShell>
  );
}

function QuickActions({ itemId, returnTo, publicSummary }: { itemId: string; returnTo: string; publicSummary: string | null }) {
  return (
    <form action={updateOfficialProtocolQueueAction} className="grid gap-2 border-2 border-comun-black bg-comun-paper p-3">
      <input type="hidden" name="official_protocol_id" value={itemId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <select name="status" defaultValue="waiting_response" className="min-h-10 border-2 border-comun-black px-2 text-sm">
        {statusOptions.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <textarea name="response_text" rows={2} className="border-2 border-comun-black p-2 text-sm" placeholder="Resposta recebida (privada)" />
      <textarea name="public_summary" defaultValue={publicSummary ?? ""} rows={2} className="border-2 border-comun-black p-2 text-sm" placeholder="Resumo publico seguro" />
      <div className="grid gap-2">
        <button name="intent" value="status" className="min-h-10 border-2 border-comun-black bg-white px-2 text-xs font-black uppercase">Atualizar status</button>
        <button name="intent" value="response" className="min-h-10 border-2 border-comun-black bg-white px-2 text-xs font-black uppercase">Registrar resposta</button>
        <button name="intent" value="summary" className="min-h-10 border-2 border-comun-black bg-white px-2 text-xs font-black uppercase">Salvar resumo</button>
        <button name="intent" value="resolved" className="min-h-10 border-2 border-comun-black bg-comun-yellow px-2 text-xs font-black uppercase">Marcar resolvido</button>
        <button name="intent" value="unresolved" className="min-h-10 border-2 border-comun-black bg-white px-2 text-xs font-black uppercase">Marcar nao resolvido</button>
        <button name="intent" value="archived" className="min-h-10 border-2 border-comun-black bg-comun-black px-2 text-xs font-black uppercase text-comun-yellow">Arquivar</button>
      </div>
    </form>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function MetricLink({ href, label, value, detail }: { href: string; label: string; value: number | string; detail?: string }) {
  return (
    <Link href={href} className="border-2 border-comun-black bg-white p-4 hover:bg-comun-yellow">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p>
      <p className="mt-2 break-words text-2xl font-black">{value}</p>
      {detail ? <p className="mt-1 text-xs font-bold text-comun-asphalt/70">{detail}</p> : null}
    </Link>
  );
}

type MetricRow = {
  key: string;
  total: number;
  overdue: number;
  waitingResponse: number;
  responseReceived: number;
  responseWithoutPublicSummary: number;
};

function MetricTable({
  title,
  rows,
  labelFor = (key) => key,
  filterKey,
  searchParams,
  primaryField = "total",
}: {
  title: string;
  rows: MetricRow[];
  labelFor?: (key: string) => string;
  filterKey: "pauta" | "comunidade" | "canal";
  searchParams: Record<string, string | undefined>;
  primaryField?: keyof Pick<MetricRow, "total" | "overdue" | "responseReceived">;
}) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <h3 className="font-black uppercase">{title}</h3>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <Link key={row.key} href={filterHref(searchParams, { [filterKey]: row.key })} className="grid grid-cols-[1fr_auto] gap-3 border border-comun-black p-2 text-sm hover:bg-comun-paper">
            <span className="font-bold">{labelFor(row.key)}</span>
            <span className="font-black">{row[primaryField]}</span>
          </Link>
        ))}
        {!rows.length ? <p className="text-sm text-comun-asphalt/70">Sem dados para este recorte.</p> : null}
      </div>
    </div>
  );
}

function IssueStatusTable({ rows, issueBySlug, searchParams }: { rows: Array<MetricRow & { statuses: Record<string, number> }>; issueBySlug: Map<string, string>; searchParams: Record<string, string | undefined> }) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <h3 className="font-black uppercase">Status por pauta</h3>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <Link key={row.key} href={filterHref(searchParams, { pauta: row.key })} className="border border-comun-black p-2 text-sm hover:bg-comun-paper">
            <p className="font-black">{labelForIssue(row.key, issueBySlug)}</p>
            <p className="mt-1 text-xs text-comun-asphalt/70">
              Aguardando: {row.statuses.waiting_response ?? 0} | Resposta: {row.statuses.response_received ?? 0} | Resolvidos: {(row.statuses.resolved ?? 0) + (row.statuses.satisfactory_response ?? 0)}
            </p>
          </Link>
        ))}
        {!rows.length ? <p className="text-sm text-comun-asphalt/70">Sem dados para este recorte.</p> : null}
      </div>
    </div>
  );
}

function Select({ name, label, values, defaultValue }: { name: string; label: string; values: ReadonlyArray<readonly [string, string]>; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} className="min-h-11 border-2 border-comun-black px-2">
        {values.map(([value, text]) => <option key={value || "all"} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function DateInput({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <input type="date" name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-2" />
    </label>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black uppercase text-comun-asphalt/60">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "urgent" | "attention" | "safe" }) {
  const classes = {
    urgent: "border-comun-red text-comun-red bg-white",
    attention: "border-comun-black text-comun-black bg-comun-yellow",
    safe: "border-comun-black text-comun-black bg-comun-paper",
  };
  return <span className={`border-2 px-2 py-1 text-xs font-black uppercase ${classes[tone]}`}>{children}</span>;
}

function buildReturnTo(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/comun/admin/protocolos-oficiais?${query}` : "/comun/admin/protocolos-oficiais";
}

function filterHref(searchParams: Record<string, string | undefined>, updates: Record<string, string | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value && !value.startsWith("sem-")) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/comun/admin/protocolos-oficiais?${query}` : "/comun/admin/protocolos-oficiais";
}

function labelForIssue(value: string | undefined, issueBySlug: Map<string, string>) {
  if (!value) return "-";
  if (value === "sem-pauta") return "Sem pauta";
  return issueBySlug.get(value) ?? value;
}

function formatDaysMetric(value: number | null) {
  if (value == null) return "-";
  return `${value} dias`;
}

function dossierReasonLabel(value: string) {
  const labels: Record<string, string> = {
    volume: "Pauta com acumulo",
    prazo: "Pauta com vencidos",
    nao_resolvidos: "Nao resolvidos acumulados",
    volume_local: "Acumulo por comunidade",
    resposta_insatisfatoria: "Resposta insatisfatoria",
  };
  return labels[value] ?? value;
}

function officialStatusLabel(value: string) {
  const found = statusOptions.find(([key]) => key === value);
  return found?.[1] ?? value;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}
