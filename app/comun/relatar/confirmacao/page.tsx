import Link from "next/link";
import { ArrowRight, Files, Newspaper, ShieldCheck } from "lucide-react";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { CopyProtocolButton } from "@/app/comun/relatar/confirmacao/copy-protocol-button";

export default function ConfirmationPage({ searchParams }: { searchParams: { protocolo?: string; modo?: string } }) {
  const protocol = searchParams.protocolo ?? "COMUN-LOCAL";
  const isQuickReport = searchParams.modo === "rapido";

  return (
    <ComunShell>
      <Section className="pt-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="industrial-border bg-comun-paper p-5 text-comun-black sm:p-6">
            <h1 className="text-3xl font-black uppercase leading-tight sm:text-4xl">Seu relato foi recebido.</h1>
            <p className="mt-4 max-w-2xl text-sm text-comun-asphalt/80 sm:text-base">
              O envio entrou no fluxo interno do COMUN. Nada e publicado automaticamente.
            </p>

            <div className="mt-6 border-2 border-comun-black bg-comun-yellow p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-comun-black/70">Protocolo COMUN</p>
                  <p className="comun-prose mt-2 text-2xl font-black uppercase leading-tight sm:text-3xl">{protocol}</p>
                </div>
                <CopyProtocolButton protocol={protocol} />
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <article className="border-2 border-comun-black bg-white p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 text-comun-green" size={20} />
                  <div>
                    <h2 className="text-lg font-black uppercase">O que acontece agora?</h2>
                    <ul className="mt-3 grid gap-2 text-sm text-comun-asphalt/80">
                      <li className="border-l-4 border-comun-yellow pl-3">A equipe revisa o relato.</li>
                      <li className="border-l-4 border-comun-yellow pl-3">
                        Se voce autorizou, uma versao sanitizada pode ser publicada.
                      </li>
                      <li className="border-l-4 border-comun-yellow pl-3">
                        Dados pessoais e contato privado nao sao publicados.
                      </li>
                      <li className="border-l-4 border-comun-yellow pl-3">
                        O relato pode virar pauta, dossie, post ou encaminhamento.
                      </li>
                      {isQuickReport ? (
                        <li className="border-l-4 border-comun-yellow pl-3">
                          Se voce enviou foto ou localizacao, isso fica interno para curadoria.
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </article>

              <article className="border-2 border-comun-black bg-white p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 text-comun-rust" size={20} />
                  <div>
                    <h2 className="text-lg font-black uppercase">Acompanhamento por protocolo</h2>
                    <p className="mt-3 text-sm text-comun-asphalt/80">
                      Use o numero do protocolo COMUN para consultar o andamento publico e seguro deste relato.
                    </p>
                    <div className="mt-4">
                      <PrimaryLink href={`/comun/acompanhar/${encodeURIComponent(protocol)}`}>Acompanhar este relato</PrimaryLink>
                    </div>
                  </div>
                </div>
              </article>

              <article className="border-2 border-comun-black bg-white p-4">
                <div className="flex items-start gap-3">
                  <Files className="mt-0.5 text-comun-rust" size={20} />
                  <div>
                    <h2 className="text-lg font-black uppercase">Protocolo Popular</h2>
                    <p className="mt-3 text-sm text-comun-asphalt/80">
                      O COMUN pode ajudar a gerar um texto para a Ouvidoria oficial. O envio oficial continua sendo feito por voce no canal da Prefeitura.
                    </p>
                    <div className="mt-4">
                      <PrimaryLink href={`/comun/acompanhar/${encodeURIComponent(protocol)}/ouvidoria`}>
                        Gerar texto para Ouvidoria
                      </PrimaryLink>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside className="paper-panel border-2 border-comun-black p-4">
            <h2 className="text-lg font-black uppercase">Proximas acoes</h2>
            <div className="mt-4 grid gap-3">
              <PrimaryLink href="/comun/relatar">Enviar outro relato</PrimaryLink>
              <Link
                href="/comun/comunidades"
                className="inline-flex min-h-12 items-center justify-between border-2 border-comun-black bg-white px-4 py-3 text-sm font-black uppercase"
              >
                Ver comunidades
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/comun"
                className="inline-flex min-h-12 items-center justify-between border-2 border-comun-black bg-white px-4 py-3 text-sm font-black uppercase"
              >
                Ver pautas em acompanhamento
                <Newspaper size={18} />
              </Link>
              <Link
                href="/comun/seguranca"
                className="inline-flex min-h-12 items-center justify-between border-2 border-comun-black bg-white px-4 py-3 text-sm font-black uppercase"
              >
                Entender seguranca
                <Files size={18} />
              </Link>
            </div>
          </aside>
        </div>
      </Section>
    </ComunShell>
  );
}
