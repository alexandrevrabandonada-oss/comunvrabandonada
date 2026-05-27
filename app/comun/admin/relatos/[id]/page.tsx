import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { updateReportReview } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { StatusLabel } from "@/components/status-label";
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
  const selectedCommunity = communities.find((community) => community.slug === report.community_slug);
  const selectedIssue = issues.find((issue) => issue.slug === report.issue_slug);
  await logComunAdminAction({
    session,
    action: "report_review_opened",
    targetType: "report",
    targetId: report.id,
    metadata: { protocol: report.protocol, status: report.status },
  });
  const isHighRisk = ["high", "critical"].includes(report.risk_level);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Revisar relato {report.protocol}</h1>
          <p className="mt-2 text-sm text-comun-asphalt/75">
            Texto bruto e contato privado sao internos. Publicacao responsavel usa apenas a versao sanitizada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusLabel value={report.status} />
          <RiskBadge value={report.risk_level} />
        </div>
      </div>

      {isHighRisk ? (
        <div className="mt-5 border-2 border-comun-red bg-white p-4 text-comun-red">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5" size={20} />
            <div>
              <p className="font-black uppercase">Alto risco</p>
              <p className="mt-1 text-sm font-bold">
                Este relato pede cuidado redobrado na revisao, no contato e em qualquer decisao de publicacao.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="grid gap-4">
          <Block title="Relato bruto">
            <p className="whitespace-pre-wrap text-sm">{report.raw_text}</p>
          </Block>
          <Block title="Metadados">
            <dl className="grid gap-3 text-sm">
              <MetaRow label="Protocolo" value={report.protocol} />
              <MetaRow label="Tema/comunidade" value={selectedCommunity?.name ?? report.community_slug} />
              <MetaRow label="Periodo" value={report.period_text ?? "-"} />
              <MetaRow label="Local aproximado" value={[report.neighborhood, report.approximate_location].filter(Boolean).join(" / ") || "-"} />
              <MetaRow label="Empresa/orgao/servico" value={report.involved_entity ?? "-"} />
              <MetaRow label="Data de envio" value={formatDateTime(report.created_at)} />
              <MetaRow label="Autorizacao de publicacao" value={report.can_publish_sanitized ? "Sim" : "Nao"} />
              <MetaRow label="Anonimato" value={report.is_anonymous ? "Anonimo" : "Identificado internamente"} />
              <MetaRow label="Aceita contato" value={report.accepts_contact ? "Sim" : "Nao"} />
              <MetaRow label="Pauta associada" value={selectedIssue?.title ?? "Sem pauta"} />
            </dl>
          </Block>
          <Block title="Contato privado interno">
            <div className="border-2 border-comun-red bg-comun-paper p-3">
              <p className="text-xs font-black uppercase text-comun-red">Uso interno. Nunca publicar.</p>
              <p className="mt-2 text-sm">
                {report.accepts_contact ? report.private_contact ?? "Contato nao informado" : "Nao autorizou contato"}
              </p>
            </div>
          </Block>
        </section>

        <form action={updateReportReview} className="grid gap-4">
          <input type="hidden" name="id" value={report.id} />
          <input type="hidden" name="can_publish_sanitized" value={String(report.can_publish_sanitized)} />
          {!report.can_publish_sanitized ? (
            <div className="border-2 border-comun-red bg-white p-4 text-sm font-bold text-comun-red">
              Este relato nao autorizou publicacao sanitizada. A publicacao fica bloqueada ate haver autorizacao valida.
            </div>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-black uppercase">Versao publica sanitizada</span>
            <textarea name="public_text" defaultValue={report.public_text ?? ""} rows={9} className="border-2 border-comun-black bg-white p-3" />
            <span className="text-xs font-bold text-comun-asphalt/70">
              Nunca copie contato privado, nomes sensiveis, CPF, telefone, endereco completo ou o texto bruto integral.
            </span>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              name="status"
              label="Status do relato"
              defaultValue={report.status}
              values={[
                ["received", "Recebido"],
                ["under_review", "Em analise"],
                ["needs_more_info", "Precisa de mais informacoes"],
                ["sanitized", "Sanitizado"],
                ["published", "Publicado"],
                ["linked_to_issue", "Relacionado a pauta"],
                ["archived", "Arquivado"],
              ]}
            />
            <Select
              name="risk_level"
              label="Nivel de risco"
              defaultValue={report.risk_level}
              values={[
                ["unknown", "Nao classificado"],
                ["low", "Baixo"],
                ["medium", "Medio"],
                ["high", "Alto"],
                ["critical", "Critico"],
              ]}
            />
            <label className="grid gap-2 text-sm font-black uppercase">
              Comunidade associada
              <select name="community_slug" defaultValue={report.community_slug} className="min-h-12 border-2 border-comun-black bg-white px-3">
                {communities.map((community) => <option key={community.slug} value={community.slug}>{community.name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black uppercase">
              Pauta associada
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
            <button name="intent" value="publish" className="min-h-12 border-2 border-comun-black bg-comun-yellow font-black uppercase">Publicar versao sanitizada</button>
            <button name="intent" value="unpublish" className="min-h-12 border-2 border-comun-black bg-white font-black uppercase">Despublicar</button>
            <button name="intent" value="needs_more_info" className="min-h-12 border-2 border-comun-black bg-white font-black uppercase">Marcar: precisa de mais informacoes</button>
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

function Select({
  name,
  label,
  values,
  defaultValue,
}: {
  name: string;
  label: string;
  values: Array<[string, string]>;
  defaultValue: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black uppercase">
      {label}
      <select name={name} defaultValue={defaultValue} className="min-h-12 border-2 border-comun-black bg-white px-3">
        {values.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black uppercase">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function RiskBadge({ value }: { value: string }) {
  const isHighRisk = ["high", "critical"].includes(value);
  return (
    <span
      className={`inline-flex w-fit border px-2 py-1 text-xs font-black uppercase ${
        isHighRisk
          ? "border-comun-red bg-comun-red text-white"
          : "border-comun-black bg-white text-comun-black"
      }`}
    >
      {riskLabel(value)}
    </span>
  );
}

function riskLabel(value: string) {
  const labels: Record<string, string> = {
    unknown: "Risco nao classificado",
    low: "Risco baixo",
    medium: "Risco medio",
    high: "Risco alto",
    critical: "Risco critico",
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
