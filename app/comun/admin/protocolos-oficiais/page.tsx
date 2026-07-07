import Link from "next/link";
import { updateOfficialProtocolQueueAction } from "@/app/actions";
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
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

function officialStatusLabel(value: string) {
  const found = statusOptions.find(([key]) => key === value);
  return found?.[1] ?? value;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}
