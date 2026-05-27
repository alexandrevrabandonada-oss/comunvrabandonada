import Link from "next/link";

export default function ConfirmationPage({ searchParams }: { searchParams: { protocolo?: string } }) {
  return (
    <main className="min-h-screen bg-comun-paper px-4 py-10 text-comun-black">
      <div className="industrial-border mx-auto max-w-xl bg-white p-6">
        <h1 className="text-3xl font-black uppercase">Seu relato foi recebido.</h1>
        <p className="mt-4 text-sm text-comun-asphalt/75">A equipe vai revisar o conteudo antes de qualquer publicacao.</p>
        <div className="mt-5 border-2 border-comun-black bg-comun-yellow p-4">
          <span className="text-xs font-black uppercase">Protocolo</span>
          <p className="text-2xl font-black">{searchParams.protocolo ?? "COMUN-LOCAL"}</p>
        </div>
        <div className="mt-5 border-2 border-comun-black bg-comun-paper p-4 text-sm">
          <p className="font-black uppercase">Guarde este protocolo</p>
          <p className="mt-2 text-comun-asphalt/75">
            Ele ajuda a localizar o relato em atendimentos internos futuros, mesmo que o acompanhamento publico ainda seja parcial neste MVP.
          </p>
        </div>
        <div className="mt-6 grid gap-3">
          <Link
            href="/comun/comunidades"
            className="min-h-12 border-2 border-comun-black bg-comun-black px-4 py-3 text-center font-black uppercase text-comun-yellow"
          >
            Acompanhar este relato
          </Link>
          <Link
            href="/comun/comunidades"
            className="min-h-12 border-2 border-comun-black bg-white px-4 py-3 text-center font-black uppercase"
          >
            Ver relatos parecidos
          </Link>
          <Link
            href="/comun/relatar"
            className="min-h-12 border-2 border-comun-black bg-white px-4 py-3 text-center font-black uppercase"
          >
            Enviar outro relato
          </Link>
        </div>
      </div>
    </main>
  );
}
