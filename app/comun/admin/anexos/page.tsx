import Link from "next/link";
import {
  markAttachmentNeedsRedaction,
  rejectAttachment,
  updateAttachmentReviewStatus,
  uploadPublicSafeAttachment,
} from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { listAdminAttachmentQueue } from "@/lib/reports";

const statusOptions = [
  ["pending", "Pendentes"],
  ["needs_redaction", "Precisam de blur/redacao"],
  ["rejected", "Reprovados"],
  ["public_ready", "Prontos para uso publico seguro"],
  ["approved_private", "Aprovados apenas interno"],
  ["todos", "Todos"],
] as const;

export default async function AdminAttachmentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const session = await requireComunAdmin();
  const status = searchParams.status ?? "pending";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [communities, issues, queue] = await Promise.all([
    listCommunities(),
    listIssues(),
    listAdminAttachmentQueue({
      status: status === "todos" ? undefined : status,
      communitySlug: searchParams.comunidade,
      publicSafe: searchParams.versao_segura === "com" ? "with" : searchParams.versao_segura === "sem" ? "without" : undefined,
      createdFrom: searchParams.data_de,
      createdTo: searchParams.data_ate,
      page,
      limit: 25,
    }),
  ]);
  const issueBySlug = new Map(issues.map((issue) => [issue.slug, issue.title]));
  const returnTo = buildReturnTo(searchParams);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Curadoria de anexos</h1>
          <p className="mt-2 max-w-3xl text-sm text-comun-asphalt/75">
            Revise fotos enviadas em relatos rapidos. O arquivo original e privado e nunca deve ser publicado sem versao segura.
          </p>
        </div>
        <Link href="/comun/admin" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">
          Voltar aos relatos
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pendentes" value={queue.stats.pending} />
        <StatCard label="Precisam de blur/redacao" value={queue.stats.needs_redaction} />
        <StatCard label="Reprovados" value={queue.stats.rejected} />
        <StatCard label="Prontos para uso publico seguro" value={queue.stats.public_ready} />
        <StatCard label="Total com foto" value={queue.stats.total_with_photo} />
      </div>

      <form className="mt-6 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-6">
        <label className="grid gap-1 text-sm font-black uppercase">
          Status
          <select name="status" defaultValue={status} className="min-h-11 border-2 border-comun-black px-2">
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black uppercase">
          Comunidade
          <select name="comunidade" defaultValue={searchParams.comunidade ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todas</option>
            {communities.map((community) => <option key={community.slug} value={community.slug}>{community.name}</option>)}
          </select>
        </label>
        <Select name="versao_segura" label="Versao segura" values={[["", "Todas"], ["com", "Com versao"], ["sem", "Sem versao"]]} defaultValue={searchParams.versao_segura} />
        <DateInput name="data_de" label="Data de" defaultValue={searchParams.data_de} />
        <DateInput name="data_ate" label="Data ate" defaultValue={searchParams.data_ate} />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase">Filtrar</button>
      </form>

      <div className="mt-6 grid gap-4">
        {queue.items.map((attachment) => {
          const report = attachment.report;
          return (
            <article key={attachment.id} className="border-2 border-comun-black bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-[160px_1fr_280px]">
                <div className="flex min-h-[150px] items-center justify-center border-2 border-comun-black bg-comun-paper">
                  {attachment.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachment.signed_url} alt="" className="max-h-36 max-w-full object-contain" />
                  ) : (
                    <span className="p-3 text-center text-xs font-black uppercase text-comun-red">Sem miniatura</span>
                  )}
                </div>

                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <MetaRow label="Protocolo" value={report?.protocol ?? "-"} />
                  <MetaRow label="Comunidade" value={report?.community_slug ?? "-"} />
                  <MetaRow label="Pauta" value={report?.issue_slug ? issueBySlug.get(report.issue_slug) ?? report.issue_slug : "Sem pauta"} />
                  <MetaRow label="Data de envio" value={formatDateTime(attachment.created_at)} />
                  <MetaRow label="Status do anexo" value={reviewStatusLabel(attachment.review_status)} />
                  <MetaRow label="Precisa redacao" value={attachment.needs_redaction ? "Sim" : "Nao"} />
                  <MetaRow label="Notas de redacao" value={attachment.redaction_notes ?? "-"} />
                  <MetaRow label="Versao publica segura" value={attachment.public_storage_path ? "Sim, em bucket privado" : "Nao"} />
                </dl>

                <div className="grid gap-3">
                  {report ? (
                    <Link
                      href={`/comun/admin/relatos/${report.id}`}
                      className="min-h-10 border-2 border-comun-black bg-comun-black px-3 py-2 text-center text-sm font-black uppercase text-comun-yellow"
                    >
                      Abrir relato
                    </Link>
                  ) : null}
                  <AttachmentActions attachmentId={attachment.id} reportId={attachment.report_id} returnTo={returnTo} notes={attachment.redaction_notes} />
                </div>
              </div>
            </article>
          );
        })}
        {!queue.items.length ? (
          <p className="border-2 border-comun-black bg-white p-4">Nenhum anexo encontrado para os filtros atuais.</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-2 border-comun-black bg-white p-4 text-sm font-bold">
        <span>
          Pagina {queue.page} de {Math.max(1, Math.ceil(queue.total / queue.limit))} - {queue.total} anexos
        </span>
        <div className="flex gap-2">
          {queue.page > 1 ? <PageLink searchParams={searchParams} page={queue.page - 1}>Anterior</PageLink> : null}
          {queue.hasNextPage ? <PageLink searchParams={searchParams} page={queue.page + 1}>Proxima</PageLink> : null}
        </div>
      </div>
    </AdminShell>
  );
}

function AttachmentActions({ attachmentId, reportId, returnTo, notes }: { attachmentId: string; reportId: string; returnTo: string; notes: string | null }) {
  return (
    <div className="grid gap-3">
      <form action={updateAttachmentReviewStatus}>
        <HiddenFields attachmentId={attachmentId} reportId={reportId} returnTo={returnTo} />
        <input type="hidden" name="review_status" value="approved_private" />
        <button className="w-full min-h-10 border-2 border-comun-black bg-white px-3 text-sm font-black uppercase">
          Aprovar apenas para uso interno
        </button>
      </form>
      <form action={markAttachmentNeedsRedaction} className="grid gap-2">
        <HiddenFields attachmentId={attachmentId} reportId={reportId} returnTo={returnTo} />
        <textarea
          name="redaction_notes"
          defaultValue={notes ?? ""}
          rows={2}
          placeholder="Nota de blur/redacao"
          className="border-2 border-comun-black bg-comun-paper p-2 text-sm"
        />
        <button className="min-h-10 border-2 border-comun-black bg-white px-3 text-sm font-black uppercase">
          Marcar precisa de blur/redacao
        </button>
      </form>
      <form action={rejectAttachment}>
        <HiddenFields attachmentId={attachmentId} reportId={reportId} returnTo={returnTo} />
        <button className="w-full min-h-10 border-2 border-comun-black bg-white px-3 text-sm font-black uppercase text-comun-red">
          Reprovar
        </button>
      </form>
      <form action={uploadPublicSafeAttachment} encType="multipart/form-data" className="grid gap-2 border-2 border-comun-black bg-comun-paper p-3">
        <HiddenFields attachmentId={attachmentId} reportId={reportId} returnTo={returnTo} />
        <input type="hidden" name="redaction_notes" value={notes ?? ""} />
        <input name="public_safe_file" type="file" accept="image/*" className="border-2 border-comun-black bg-white p-2 text-sm" />
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-sm font-black uppercase">
          Enviar versao publica segura
        </button>
      </form>
    </div>
  );
}

function HiddenFields({ attachmentId, reportId, returnTo }: { attachmentId: string; reportId: string; returnTo: string }) {
  return (
    <>
      <input type="hidden" name="attachment_id" value={attachmentId} />
      <input type="hidden" name="report_id" value={reportId} />
      <input type="hidden" name="return_to" value={returnTo} />
    </>
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

function Select({ name, label, values, defaultValue }: { name: string; label: string; values: Array<[string, string]>; defaultValue?: string }) {
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

function PageLink({ searchParams, page, children }: { searchParams: Record<string, string | undefined>; page: number; children: React.ReactNode }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return <Link href={`/comun/admin/anexos?${params.toString()}`} className="border-2 border-comun-black px-3 py-2 font-black uppercase">{children}</Link>;
}

function buildReturnTo(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/comun/admin/anexos?${query}` : "/comun/admin/anexos";
}

function reviewStatusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    approved_private: "Aprovado apenas interno",
    needs_redaction: "Precisa blur/redacao",
    public_ready: "Versao publica segura pronta",
    rejected: "Reprovado",
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
