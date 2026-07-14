import Link from "next/link";
import { ArrowRight, ClipboardList, ShieldAlert } from "lucide-react";
import {
  createOrUpdateOfficialProtocolDraft,
  saveOfficialProtocolNumber,
  saveOfficialProtocolResponse,
} from "@/app/actions";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { officialChannels } from "@/lib/official-channels";
import {
  generateOfficialComplaintText,
  getOfficialProtocolReportSurface,
  getPublicOfficialProtocol,
} from "@/lib/official-protocols";
import { isValidProtocol, normalizeProtocol } from "@/lib/reports";
import { CopyOfficialTextButton } from "@/app/comun/acompanhar/[protocol]/ouvidoria/copy-official-text-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OfficialProtocolPage(props: { params: Promise<{ protocol: string }> }) {
  const params = await props.params;
  const comunProtocol = normalizeProtocol(decodeURIComponent(params.protocol));
  const report = isValidProtocol(comunProtocol) ? await getOfficialProtocolReportSurface(comunProtocol) : null;
  const officialProtocol = report ? await getPublicOfficialProtocol(comunProtocol) : null;
  const generatedText = report ? officialProtocol?.generated_text ?? generateOfficialComplaintText(report) : "";

  return (
    <ComunShell>
      <Section className="pt-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="industrial-border bg-comun-paper p-5 text-comun-black sm:p-6">
            <div className="flex items-start gap-3">
              <ClipboardList className="mt-1 text-comun-rust" size={22} />
              <div>
                <h1 className="text-3xl font-black uppercase leading-tight sm:text-4xl">Texto para Ouvidoria</h1>
                <p className="mt-2 text-sm text-comun-asphalt/80">
                  Use o relato COMUN para preparar uma demanda objetiva ao canal oficial.
                </p>
              </div>
            </div>

            <div className="mt-6 border-2 border-comun-black bg-comun-yellow p-4">
              <p className="text-xs font-black uppercase text-comun-black/70">Protocolo COMUN</p>
              <p className="comun-prose mt-2 text-2xl font-black uppercase">{comunProtocol}</p>
            </div>

            {!report ? (
              <article className="mt-6 border-2 border-comun-black bg-white p-4 text-sm text-comun-asphalt/80">
                Nao foi possivel localizar esse protocolo COMUN. Confira o numero e tente novamente.
              </article>
            ) : (
              <div className="mt-6 grid gap-4">
                <article className="border-2 border-comun-red bg-white p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 text-comun-red" size={20} />
                    <p className="text-sm font-bold text-comun-red">
                      O COMUN nao e canal oficial da Prefeitura. O protocolo oficial so nasce quando voce registra a demanda no canal oficial.
                    </p>
                  </div>
                </article>

                <article className="border-2 border-comun-black bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-black uppercase">Texto pronto para copiar</h2>
                    <div className="flex flex-wrap gap-2">
                      <CopyOfficialTextButton text={generatedText} />
                      <form action={createOrUpdateOfficialProtocolDraft}>
                        <input type="hidden" name="comun_protocol" value={comunProtocol} />
                        <button className="min-h-11 border-2 border-comun-black bg-white px-4 text-sm font-black uppercase">
                          Gerar/atualizar texto
                        </button>
                      </form>
                    </div>
                  </div>
                  <pre className="mt-4 whitespace-pre-wrap border-2 border-comun-black bg-comun-paper p-4 text-sm font-medium leading-relaxed">
                    {generatedText}
                  </pre>
                </article>

                <article className="border-2 border-comun-black bg-white p-4">
                  <h2 className="font-black uppercase">Informar protocolo oficial</h2>
                  <p className="mt-2 text-sm text-comun-asphalt/80">
                    Depois de registrar no canal oficial, guarde o numero e informe aqui para acompanhar junto do protocolo COMUN.
                  </p>
                  <form action={saveOfficialProtocolNumber} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="comun_protocol" value={comunProtocol} />
                    <label className="grid gap-1 text-sm font-black uppercase">
                      Numero oficial
                      <input
                        name="official_protocol_number"
                        defaultValue={officialProtocol?.official_protocol_number ?? ""}
                        className="min-h-11 border-2 border-comun-black px-3 font-medium normal-case"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-black uppercase">
                      Data de envio
                      <input
                        name="submitted_at"
                        type="date"
                        defaultValue={formatDateInput(officialProtocol?.submitted_at)}
                        className="min-h-11 border-2 border-comun-black px-3 font-medium normal-case"
                      />
                    </label>
                    <button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase sm:col-span-2">
                      Salvar protocolo oficial
                    </button>
                  </form>
                </article>

                <article className="border-2 border-comun-black bg-white p-4">
                  <h2 className="font-black uppercase">Registrar resposta recebida</h2>
                  <p className="mt-2 text-sm text-comun-asphalt/80">
                    A resposta completa pode conter dados pessoais e nao aparece publicamente por padrao.
                  </p>
                  <form action={saveOfficialProtocolResponse} className="mt-4 grid gap-3">
                    <input type="hidden" name="comun_protocol" value={comunProtocol} />
                    <textarea name="response_text" rows={4} className="border-2 border-comun-black p-3" placeholder="Cole aqui a resposta oficial recebida." />
                    <select name="satisfaction" defaultValue="unknown" className="min-h-11 border-2 border-comun-black px-3">
                      <option value="unknown">Ainda nao avaliado</option>
                      <option value="satisfactory">Resposta satisfatoria</option>
                      <option value="partial">Resposta parcial</option>
                      <option value="unsatisfactory">Resposta insatisfatoria</option>
                    </select>
                    <button className="min-h-11 border-2 border-comun-black bg-white px-4 text-sm font-black uppercase">
                      Salvar resposta
                    </button>
                  </form>
                </article>
              </div>
            )}
          </div>

          <aside className="paper-panel border-2 border-comun-black p-4">
            <h2 className="text-lg font-black uppercase">Canal oficial</h2>
            <div className="mt-4 grid gap-3">
              {officialChannels.map((channel) => (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="border-2 border-comun-black bg-white p-3"
                >
                  <p className="font-black uppercase">{channel.name}</p>
                  <p className="mt-2 text-xs font-bold text-comun-asphalt/75">{channel.instruction}</p>
                </a>
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              <StatusBlock officialProtocol={officialProtocol} />
              <PrimaryLink href={`/comun/acompanhar/${encodeURIComponent(comunProtocol)}`}>Voltar ao acompanhamento</PrimaryLink>
              <Link
                href="/comun/protocolo-popular"
                className="inline-flex min-h-12 items-center justify-between border-2 border-comun-black bg-white px-4 py-3 text-sm font-black uppercase"
              >
                Entender Protocolo Popular
                <ArrowRight size={18} />
              </Link>
            </div>
          </aside>
        </div>
      </Section>
    </ComunShell>
  );
}

function StatusBlock({ officialProtocol }: { officialProtocol: Awaited<ReturnType<typeof getPublicOfficialProtocol>> }) {
  return (
    <div className="border-2 border-comun-black bg-white p-3 text-sm">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">Status</p>
      <p className="mt-1 font-black uppercase">{officialProtocol ? officialStatusLabel(officialProtocol.status) : "Texto ainda nao salvo"}</p>
      {officialProtocol?.official_protocol_number ? (
        <p className="mt-2 font-bold">Oficial: {officialProtocol.official_protocol_number}</p>
      ) : null}
      {officialProtocol?.public_summary ? (
        <p className="mt-2 text-comun-asphalt/80">{officialProtocol.public_summary}</p>
      ) : null}
    </div>
  );
}

function officialStatusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    text_generated: "Texto gerado",
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
  return labels[value] ?? value;
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
