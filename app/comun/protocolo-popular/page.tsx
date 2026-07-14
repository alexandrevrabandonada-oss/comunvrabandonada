import Link from "next/link";
import { ArrowRight, ClipboardList, ShieldCheck } from "lucide-react";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { officialChannels } from "@/lib/official-channels";

export default function PopularProtocolPage() {
  return (
    <ComunShell>
      <Section className="pt-10">
        <div className="industrial-border bg-comun-paper p-5 text-comun-black sm:p-6">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-1 text-comun-rust" size={24} />
            <div>
              <h1 className="text-3xl font-black uppercase leading-tight sm:text-4xl">Protocolo Popular</h1>
              <p className="mt-3 max-w-3xl text-sm text-comun-asphalt/80 sm:text-base">
                O COMUN ajuda voce a transformar um relato comunitario em texto pronto para a Ouvidoria oficial. O envio
                continua sendo decisao sua e acontece no canal oficial.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <InfoBlock title="Registro COMUN">
              Organiza memoria comunitaria, curadoria e acompanhamento publico seguro pelo protocolo COMUN.
            </InfoBlock>
            <InfoBlock title="Texto assistido">
              Gera uma redacao objetiva usando apenas dados seguros do relato, sem contato privado nem texto bruto.
            </InfoBlock>
            <InfoBlock title="Protocolo oficial">
              Nasce somente quando voce registra a demanda no canal oficial da Prefeitura ou orgao responsavel.
            </InfoBlock>
          </div>

          <div className="mt-6 border-2 border-comun-black bg-white p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-comun-green" size={20} />
              <div>
                <h2 className="font-black uppercase">Limite importante</h2>
                <p className="mt-2 text-sm text-comun-asphalt/80">
                  O COMUN nao e canal oficial da Prefeitura, nao envia automaticamente sua demanda e nao promete resposta
                  oficial. Ele ajuda a escrever, organizar e acompanhar.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {officialChannels.map((channel) => (
              <a
                key={channel.id}
                href={channel.url}
                target="_blank"
                rel="noreferrer"
                className="border-2 border-comun-black bg-white p-4"
              >
                <p className="text-xs font-black uppercase text-comun-asphalt/60">Canal oficial</p>
                <h2 className="mt-2 font-black uppercase">{channel.name}</h2>
                <p className="mt-2 text-sm text-comun-asphalt/80">{channel.instruction}</p>
              </a>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryLink href="/comun/acompanhar">Acompanhar relato/protocolo</PrimaryLink>
            <Link
              href="/comun/relatar"
              className="inline-flex min-h-12 items-center justify-between border-2 border-comun-black bg-white px-4 py-3 text-sm font-black uppercase"
            >
              Enviar relato
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </Section>
    </ComunShell>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="border-2 border-comun-black bg-white p-4">
      <h2 className="font-black uppercase">{title}</h2>
      <p className="mt-2 text-sm text-comun-asphalt/80">{children}</p>
    </article>
  );
}
