import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck } from "lucide-react";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { getCommunity, getIssue } from "@/lib/comun-data";
import { getPublicOfficialProtocol } from "@/lib/official-protocols";
import { getPublicReportByProtocol, normalizeProtocol } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FollowReportResultPage({ params }: { params: { protocol: string } }) {
  const protocol = normalizeProtocol(decodeURIComponent(params.protocol));
  const report = await getPublicReportByProtocol(protocol);
  const officialProtocol = report.found ? await getPublicOfficialProtocol(protocol) : null;
  const community = report.community_slug ? await getCommunity(report.community_slug) : null;
  const issue = report.issue_slug ? await getIssue(report.issue_slug) : null;

  return (
    <ComunShell>
      <Section className="pt-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="industrial-border bg-comun-paper p-5 text-comun-black sm:p-6">
            <div className="flex items-start gap-3">
              <FileSearch className="mt-1 text-comun-rust" size={22} />
              <div>
                <h1 className="text-3xl font-black uppercase leading-tight sm:text-4xl">Acompanhar relato</h1>
                <p className="mt-2 text-sm text-comun-asphalt/80">
                  Consulta publica e segura por protocolo COMUN.
                </p>
              </div>
            </div>

            <div className="mt-6 border-2 border-comun-black bg-comun-yellow p-4 sm:p-5">
              <p className="text-xs font-black uppercase text-comun-black/70">Protocolo COMUN</p>
              <p className="comun-prose mt-2 text-2xl font-black uppercase leading-tight sm:text-3xl">{report.protocol}</p>
            </div>

            <div className="mt-6 grid gap-4">
              <article className="border-2 border-comun-black bg-white p-4">
                <p className="text-xs font-black uppercase text-comun-asphalt/70">Status publico</p>
                <h2 className="mt-2 text-xl font-black uppercase">{report.state_label}</h2>
                <p className="mt-3 text-sm text-comun-asphalt/80">{report.public_message}</p>
              </article>

              {report.found ? (
                <article className="border-2 border-comun-black bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetaRow label="Comunidade" value={community?.name ?? "-"} />
                    <MetaRow label="Pauta relacionada" value={issue?.title ?? "-"} />
                    <MetaRow label="Data de envio" value={formatDate(report.created_at)} />
                    <MetaRow label="Data de publicacao" value={formatDate(report.published_at)} />
                    <MetaRow label="Periodo informado" value={report.period_text ?? "-"} />
                    <MetaRow
                      label="Local aproximado"
                      value={[report.neighborhood, report.approximate_location].filter(Boolean).join(" - ") || "-"}
                    />
                  </div>
                </article>
              ) : (
                <article className="border-2 border-comun-black bg-white p-4 text-sm text-comun-asphalt/80">
                  {report.status === "rate_limited"
                    ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
                    : "Nao foi possivel localizar um relato publico com esse protocolo. Confira o numero e tente novamente."}
                </article>
              )}

              {report.is_publicly_available && report.public_text ? (
                <article className="border-2 border-comun-black bg-white p-4">
                  <p className="text-xs font-black uppercase text-comun-asphalt/70">Versao publica sanitizada</p>
                  {report.title ? <h2 className="comun-prose mt-2 text-lg font-black uppercase">{report.title}</h2> : null}
                  <p className="comun-prose mt-3 text-sm text-comun-asphalt/80">{report.public_text}</p>
                </article>
              ) : null}

              {report.found ? (
                <article className="border-2 border-comun-black bg-white p-4">
                  <p className="text-xs font-black uppercase text-comun-asphalt/70">Protocolo oficial</p>
                  <h2 className="mt-2 text-xl font-black uppercase">{officialStatusLabel(officialProtocol?.status)}</h2>
                  <p className="mt-3 text-sm text-comun-asphalt/80">
                    {officialProtocol?.official_protocol_number
                      ? `Numero oficial informado: ${officialProtocol.official_protocol_number}.`
                      : "Voce pode gerar um texto para registrar esta demanda na Ouvidoria oficial."}
                  </p>
                  {officialProtocol?.public_summary ? (
                    <p className="comun-prose mt-3 text-sm text-comun-asphalt/80">{officialProtocol.public_summary}</p>
                  ) : null}
                  <div className="mt-4">
                    <PrimaryLink href={`/comun/acompanhar/${encodeURIComponent(report.protocol)}/ouvidoria`}>
                      Gerar texto para Ouvidoria
                    </PrimaryLink>
                  </div>
                </article>
              ) : null}
            </div>
          </div>

          <aside className="paper-panel border-2 border-comun-black p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-comun-green" size={20} />
              <div>
                <h2 className="text-lg font-black uppercase">Seguranca primeiro</h2>
                <p className="mt-3 text-sm text-comun-asphalt/80">
                  Esta consulta nunca mostra texto bruto, contato privado nem observacoes internas.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {issue ? (
                <Link
                  href={`/comun/pautas/${issue.slug}`}
                  className="inline-flex min-h-12 items-center justify-between border-2 border-comun-black bg-white px-4 py-3 text-sm font-black uppercase"
                >
                  Ver pauta relacionada
                  <ArrowRight size={18} />
                </Link>
              ) : null}
              <PrimaryLink href="/comun/relatar">Enviar outro relato</PrimaryLink>
              <Link
                href="/comun/seguranca"
                className="inline-flex min-h-12 items-center justify-between border-2 border-comun-black bg-white px-4 py-3 text-sm font-black uppercase"
              >
                Entender seguranca
                <ArrowRight size={18} />
              </Link>
            </div>
          </aside>
        </div>
      </Section>
    </ComunShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-comun-asphalt/70">{label}</p>
      <p className="comun-prose mt-1 text-sm font-medium text-comun-asphalt/85">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function officialStatusLabel(value?: string) {
  const labels: Record<string, string> = {
    draft: "Ainda nao gerado",
    text_generated: "Texto para Ouvidoria disponivel",
    sent_by_user: "Enviado pelo usuario",
    official_protocol_informed: "Protocolo oficial informado",
    waiting_response: "Aguardando resposta",
    response_received: "Resposta recebida",
    satisfactory_response: "Resposta satisfatoria",
    unsatisfactory_response: "Resposta insatisfatoria",
    overdue: "Prazo vencido",
    resolved: "Resolvido",
    unresolved: "Nao resolvido",
    archived: "Arquivado",
  };
  return value ? labels[value] ?? value : "Ainda nao gerado";
}
