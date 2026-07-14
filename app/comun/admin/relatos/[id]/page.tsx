import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  markAttachmentNeedsRedaction,
  createOrUpdateOfficialProtocolDraft,
  rejectAttachment,
  updateAttachmentReviewStatus,
  updateOfficialProtocolAdmin,
  updateReportReview,
  uploadPublicSafeAttachment,
} from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { StatusLabel } from "@/components/status-label";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { getOfficialProtocolByComunProtocol } from "@/lib/official-protocols";
import { getAdminReport, listAdminReportAttachments } from "@/lib/reports";

export default async function ReviewReportPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requireComunAdmin();
  const [report, communities, issues, attachments, officialProtocol] = await Promise.all([
    getAdminReport(params.id),
    listCommunities(),
    listIssues(),
    listAdminReportAttachments(params.id),
    getOfficialProtocolByComunProtocol(params.id),
  ]);
  if (!report) notFound();
  const official = officialProtocol?.comun_protocol === report.protocol ? officialProtocol : await getOfficialProtocolByComunProtocol(report.protocol);
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
              <MetaRow label="Tipo de envio" value={report.quick_report ? "Relato rapido" : "Relato detalhado"} />
              <MetaRow label="Canal de origem" value={report.source_channel ?? "-"} />
              <MetaRow label="Tem anexos" value={report.has_attachments ? `Sim (${report.photo_count})` : "Nao"} />
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
          <Block title="Localizacao interna">
            <div className="grid gap-3 text-sm">
              <MetaRow label="Latitude" value={report.latitude != null ? String(report.latitude) : "-"} />
              <MetaRow label="Longitude" value={report.longitude != null ? String(report.longitude) : "-"} />
              <MetaRow
                label="Precisao aproximada"
                value={report.location_accuracy != null ? `${Math.round(report.location_accuracy)} m` : "-"}
              />
              <MetaRow label="Fonte" value={report.location_source ?? "-"} />
              <MetaRow label="Nivel publico permitido" value={report.public_location_level} />
              <p className="border-2 border-comun-black bg-comun-yellow/20 p-3 text-sm font-bold">
                Localizacao precisa e interna. Publicar apenas local aproximado ou sanitizado.
              </p>
            </div>
          </Block>
          <Block title="Anexos privados">
            <div className="grid gap-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="border-2 border-comun-black bg-comun-paper p-3">
                  <p className="text-xs font-black uppercase text-comun-red">
                    Arquivo original privado. Nao publicar sem versao publica segura.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr]">
                    <div className="flex min-h-[120px] items-center justify-center border-2 border-comun-black bg-white">
                      {attachment.signed_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        (<img src={attachment.signed_url} alt="" className="max-h-28 max-w-full object-contain" />)
                      ) : (
                        <span className="p-2 text-center text-xs font-bold text-comun-red">Sem miniatura</span>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm">
                      <MetaRow label="Arquivo" value={attachment.original_filename ?? "Arquivo sem nome"} />
                      <MetaRow label="Tipo/tamanho" value={`${attachment.mime_type ?? "tipo desconhecido"} / ${attachment.size_bytes ?? 0} bytes`} />
                      <MetaRow label="Status de revisao" value={reviewStatusLabel(attachment.review_status)} />
                      <MetaRow label="Public approved" value={attachment.public_approved ? "Sim" : "Nao"} />
                      <MetaRow label="Precisa blur/redacao" value={attachment.needs_redaction ? "Sim" : "Nao"} />
                      <MetaRow label="Notas de redacao" value={attachment.redaction_notes ?? "-"} />
                      <MetaRow label="Versao publica segura" value={attachment.public_storage_path ? "Enviada em bucket privado" : "Nao enviada"} />
                    </div>
                  </div>
                  {attachment.signed_url ? (
                    <a
                      href={attachment.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex min-h-10 items-center border-2 border-comun-black bg-white px-3 text-sm font-black uppercase"
                    >
                      Abrir imagem privada
                    </a>
                  ) : (
                    <p className="mt-3 text-sm font-bold text-comun-red">Nao foi possivel gerar link temporario.</p>
                  )}
                  {attachment.public_signed_url ? (
                    <a
                      href={attachment.public_signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-0 mt-3 inline-flex min-h-10 items-center border-2 border-comun-black bg-comun-yellow px-3 text-sm font-black uppercase md:ml-2"
                    >
                      Abrir versao segura
                    </a>
                  ) : null}
                  <div className="mt-4 grid gap-3">
                    <form action={updateAttachmentReviewStatus}>
                      <input type="hidden" name="attachment_id" value={attachment.id} />
                      <input type="hidden" name="report_id" value={report.id} />
                      <input type="hidden" name="review_status" value="approved_private" />
                      <button className="min-h-10 border-2 border-comun-black bg-white px-3 text-sm font-black uppercase">
                        Aprovar apenas para uso interno
                      </button>
                    </form>
                    <form action={markAttachmentNeedsRedaction} className="grid gap-2">
                      <input type="hidden" name="attachment_id" value={attachment.id} />
                      <input type="hidden" name="report_id" value={report.id} />
                      <label className="grid gap-1 text-xs font-black uppercase">
                        Nota de blur/redacao
                        <textarea
                          name="redaction_notes"
                          defaultValue={attachment.redaction_notes ?? ""}
                          rows={2}
                          className="border-2 border-comun-black bg-white p-2 text-sm font-medium normal-case"
                        />
                      </label>
                      <button className="min-h-10 border-2 border-comun-black bg-white px-3 text-sm font-black uppercase">
                        Marcar precisa de blur/redacao
                      </button>
                    </form>
                    <form action={rejectAttachment}>
                      <input type="hidden" name="attachment_id" value={attachment.id} />
                      <input type="hidden" name="report_id" value={report.id} />
                      <button className="min-h-10 border-2 border-comun-black bg-white px-3 text-sm font-black uppercase text-comun-red">
                        Reprovar anexo
                      </button>
                    </form>
                    <form action={uploadPublicSafeAttachment} encType="multipart/form-data" className="grid gap-2 border-2 border-comun-black bg-white p-3">
                      <input type="hidden" name="attachment_id" value={attachment.id} />
                      <input type="hidden" name="report_id" value={report.id} />
                      <label className="grid gap-1 text-xs font-black uppercase">
                        Enviar imagem ja redigida/blurada
                        <input name="public_safe_file" type="file" accept="image/*" className="border-2 border-comun-black bg-comun-paper p-2 text-sm" />
                      </label>
                      <input type="hidden" name="redaction_notes" value={attachment.redaction_notes ?? ""} />
                      <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-sm font-black uppercase">
                        Enviar versao publica segura
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {!attachments.length ? <p className="text-sm text-comun-asphalt/75">Nenhum anexo privado neste relato.</p> : null}
            </div>
          </Block>
          <Block title="Protocolo oficial">
            {official ? (
              <form action={updateOfficialProtocolAdmin} className="grid gap-3 text-sm">
                <input type="hidden" name="report_id" value={report.id} />
                <input type="hidden" name="official_protocol_id" value={official.id} />
                <MetaRow label="Canal" value={official.channel} />
                <label className="grid gap-1 font-black uppercase">
                  Agencia/orgao
                  <input name="agency" defaultValue={official.agency ?? ""} className="min-h-11 border-2 border-comun-black px-3 font-medium normal-case" />
                </label>
                <label className="grid gap-1 font-black uppercase">
                  Numero oficial
                  <input name="official_protocol_number" defaultValue={official.official_protocol_number ?? ""} className="min-h-11 border-2 border-comun-black px-3 font-medium normal-case" />
                </label>
                <Select
                  name="channel"
                  label="Canal"
                  defaultValue={official.channel}
                  values={[
                    ["ouvidoria-municipal", "Ouvidoria municipal"],
                    ["fala-br", "Fala.BR"],
                  ]}
                />
                <Select
                  name="status"
                  label="Status"
                  defaultValue={official.status}
                  values={[
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
                  ]}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <DateInput name="submitted_at" label="Data de envio" defaultValue={formatDateInput(official.submitted_at)} />
                  <DateInput name="expected_response_at" label="Prazo esperado" defaultValue={formatDateInput(official.expected_response_at)} />
                  <DateInput name="response_received_at" label="Resposta recebida" defaultValue={formatDateInput(official.response_received_at)} />
                </div>
                <label className="grid gap-1 font-black uppercase">
                  Resposta recebida
                  <textarea name="response_text" defaultValue={official.response_text ?? ""} rows={4} className="border-2 border-comun-black p-3 font-medium normal-case" />
                </label>
                <Select
                  name="satisfaction"
                  label="Avaliacao"
                  defaultValue={official.satisfaction ?? "unknown"}
                  values={[
                    ["unknown", "Nao avaliado"],
                    ["satisfactory", "Satisfatoria"],
                    ["partial", "Parcial"],
                    ["unsatisfactory", "Insatisfatoria"],
                  ]}
                />
                <label className="grid gap-1 font-black uppercase">
                  Resumo publico da resposta
                  <textarea name="public_summary" defaultValue={official.public_summary ?? ""} rows={3} className="border-2 border-comun-black p-3 font-medium normal-case" />
                </label>
                <label className="grid gap-1 font-black uppercase">
                  Observacoes internas
                  <textarea name="internal_notes" defaultValue={official.internal_notes ?? ""} rows={3} className="border-2 border-comun-black p-3 font-medium normal-case" />
                </label>
                <p className="border-2 border-comun-black bg-comun-yellow/20 p-3 text-sm font-bold">
                  `response_text` e `internal_notes` nao aparecem publicamente por padrao. Use `public_summary` para resumo seguro.
                </p>
                <button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black uppercase">
                  Salvar protocolo oficial
                </button>
              </form>
            ) : (
              <div className="grid gap-3 text-sm">
                <p className="font-bold text-comun-asphalt/80">Ainda nao ha rascunho de protocolo oficial para este relato.</p>
                <form action={createOrUpdateOfficialProtocolDraft}>
                  <input type="hidden" name="comun_protocol" value={report.protocol} />
                  <button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black uppercase">
                    Gerar texto para Ouvidoria
                  </button>
                </form>
              </div>
            )}
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

function DateInput({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <input type="date" name={name} defaultValue={defaultValue ?? ""} className="min-h-11 border-2 border-comun-black px-3" />
    </label>
  );
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

function formatDateInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
