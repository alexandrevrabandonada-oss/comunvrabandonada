import { redirect } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { isValidProtocol, normalizeProtocol } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function FollowReportPage({
  searchParams,
}: {
  searchParams: { protocolo?: string };
}) {
  const maybeProtocol = searchParams.protocolo ? normalizeProtocol(searchParams.protocolo) : "";

  if (maybeProtocol && isValidProtocol(maybeProtocol)) {
    redirect(`/comun/acompanhar/${encodeURIComponent(maybeProtocol)}`);
  }

  return (
    <ComunShell>
      <Section className="pt-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="industrial-border bg-comun-paper p-5 text-comun-black sm:p-6">
            <h1 className="text-3xl font-black uppercase leading-tight sm:text-4xl">Acompanhar relato</h1>
            <p className="mt-4 max-w-2xl text-sm text-comun-asphalt/80 sm:text-base">
              Use o numero do protocolo COMUN para consultar o andamento publico do seu relato.
            </p>

            <form action="/comun/acompanhar" method="get" className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase">Protocolo COMUN</span>
                <input
                  type="text"
                  name="protocolo"
                  placeholder="COMUN-20260525-123456"
                  autoCapitalize="characters"
                  className="min-h-12 border-2 border-comun-black bg-white px-4 text-base font-bold uppercase tracking-wide"
                />
              </label>
              {searchParams.protocolo && !isValidProtocol(searchParams.protocolo) ? (
                <p className="border-2 border-comun-rust bg-white px-4 py-3 text-sm font-bold text-comun-rust">
                  Digite um protocolo COMUN valido.
                </p>
              ) : null}
              <button className="inline-flex min-h-12 items-center justify-center gap-2 border-2 border-comun-black bg-comun-yellow px-5 py-3 text-sm font-black uppercase text-comun-black shadow-[4px_4px_0_#0b0b0a]">
                <Search size={18} />
                Consultar
              </button>
            </form>
          </div>

          <aside className="paper-panel border-2 border-comun-black p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-comun-green" size={20} />
              <div>
                <h2 className="text-lg font-black uppercase">Consulta segura</h2>
                <p className="mt-3 text-sm text-comun-asphalt/80">
                  Por seguranca, esta pagina nao mostra relato bruto, contato privado nem observacoes internas.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <PrimaryLink href="/comun/seguranca">Entender seguranca</PrimaryLink>
            </div>
          </aside>
        </div>
      </Section>
    </ComunShell>
  );
}
