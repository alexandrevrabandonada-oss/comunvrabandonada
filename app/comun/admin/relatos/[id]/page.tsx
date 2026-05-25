import { notFound } from "next/navigation";
import { updateReportReview } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { getAdminReport } from "@/lib/reports";

export default async function ReviewReportPage({ params }: { params: { id: string } }) {
  const session = await requireComunAdmin();
  const [report, communities, issues] = await Promise.all([
    getAdminReport(params.id),
    listCommunities(),
    listIssues(),
  ]);
  if (!report) notFound();
  await logComunAdminAction({
    session,
    action: "report_review_opened",
    targetType: "report",
    targetId: report.id,
    metadata: { protocol: report.protocol, status: report.status },
  });

  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Revisar relato {report.protocol}</h1>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="grid gap-4">
          <Block title="Relato bruto">
            <p className="whitespace-pre-wrap text-sm">{report.raw_text}</p>
          </Block>
          <Block title="Metadados">
            <dl className="grid gap-2 text-sm">
              <div><dt className="font-black uppercase">Local</dt><dd>{report.neighborhood ?? "-"} / {report.approximate_location ?? "-"}</dd></div>
              <div><dt className="font-black uppercase">Periodo</dt><dd>{report.period_text ?? "-"}</dd></div>
              <div><dt className="font-black uppercase">Envolvido</dt><dd>{report.involved_entity ?? "-"}</dd></div>
              <div><dt className="font-black uppercase">Autorizou publicacao</dt><dd>{report.can_publish_sanitized ? "Sim" : "Nao"}</dd></div>
            </dl>
          </Block>
          <Block title="Contato privado interno">
            <p className="text-sm">{report.accepts_contact ? report.private_contact ?? "Contato nao informado" : "Nao autorizou contato"}</p>
          </Block>
        </section>

        <form action={updateReportReview} className="grid gap-4">
          <input type="hidden" name="id" value={report.id} />
          <input type="hidden" name="can_publish_sanitized" value={String(report.can_publish_sanitized)} />
          {!report.can_publish_sanitized ? (
            <div className="border-2 border-comun-red bg-white p-4 text-sm font-bold text-comun-red">
              Este relato nao autorizou publicacao sanitizada. O botao publicar sera bloqueado pela action.
            </div>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-black uppercase">Versao publica sanitizada</span>
            <textarea name="public_text" defaultValue={report.public_text ?? ""} rows={9} className="border-2 border-comun-black bg-white p-3" />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <Select name="status" label="Status" defaultValue={report.status} values={["received", "under_review", "needs_more_info", "sanitized", "published", "linked_to_issue", "archived"]} />
            <Select name="risk_level" label="Risco" defaultValue={report.risk_level} values={["unknown", "low", "medium", "high", "critical"]} />
            <label className="grid gap-2 text-sm font-black uppercase">
              Comunidade
              <select name="community_slug" defaultValue={report.community_slug} className="min-h-12 border-2 border-comun-black bg-white px-3">
                {communities.map((community) => <option key={community.slug} value={community.slug}>{community.name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black uppercase">
              Pauta
              <select name="issue_slug" defaultValue={report.issue_slug ?? ""} className="min-h-12 border-2 border-comun-black bg-white px-3">
                <option value="">Sem pauta</option>
                {issues.map((issue) => <option key={issue.slug} value={issue.slug}>{issue.title}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-black uppercase">Observacoes internas</span>
            <textarea name="internal_notes" defaultValue={report.internal_notes ?? ""} rows={5} className="border-2 border-comun-black bg-white p-3" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button name="intent" value="save" className="min-h-12 border-2 border-comun-black bg-white font-black uppercase">Salvar revisao</button>
            <button name="intent" value="publish" className="min-h-12 border-2 border-comun-black bg-comun-yellow font-black uppercase">Publicar sanitizada</button>
            <button name="intent" value="unpublish" className="min-h-12 border-2 border-comun-black bg-white font-black uppercase">Despublicar</button>
            <button name="intent" value="needs_more_info" className="min-h-12 border-2 border-comun-black bg-white font-black uppercase">Precisa de info</button>
            <button name="intent" value="archive" className="min-h-12 border-2 border-comun-black bg-comun-black font-black uppercase text-comun-yellow sm:col-span-2">Arquivar</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border-2 border-comun-black bg-white p-4"><h2 className="mb-3 font-black uppercase">{title}</h2>{children}</div>;
}

function Select({ name, label, values, defaultValue }: { name: string; label: string; values: string[]; defaultValue: string }) {
  return (
    <label className="grid gap-2 text-sm font-black uppercase">
      {label}
      <select name={name} defaultValue={defaultValue} className="min-h-12 border-2 border-comun-black bg-white px-3">
        {values.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
  );
}
