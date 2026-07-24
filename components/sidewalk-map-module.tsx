import Link from "next/link";

export function SidewalkMapModule({ pautaSlug, surface }: { pautaSlug: string; surface: any }) {
  const { records, count, coverage, warning } = surface;
  return (
    <div className="mt-6">
      <p className="text-sm font-bold">Camada: Calçadas e acessibilidade</p>
      <div className="mt-4 border-2 border-comun-black bg-comun-yellow p-5">
        <p className="text-xs font-black uppercase">Mapa coletivo desta pauta</p>
        <h3 className="mt-1 text-2xl font-black uppercase">Calçadas de Volta Redonda</h3>
        <p className="mt-2 max-w-2xl">Registre uma barreira, ajude a verificar o que foi relatado e acompanhe como as prioridades viram mobilização, encaminhamento, resultado e memória.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-black px-4 font-black uppercase text-comun-yellow" href="/comun/calcadas">Ver mapa coletivo</Link>
          <Link className="inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-paper px-4 font-black uppercase" href={`/comun/mapa/contribuir?origem=calcadas&pauta=${encodeURIComponent(pautaSlug)}&returnTo=${encodeURIComponent(`/comun/pautas/${pautaSlug}`)}`}>Registrar uma calçada</Link>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-2 border-comun-black bg-comun-paper p-3"><p className="text-xs font-black uppercase">Publicados</p><p className="text-2xl font-black">{count}</p></div>
        <div className="border-2 border-comun-black bg-comun-paper p-3"><p className="text-xs font-black uppercase">Verificados</p><p className="text-2xl font-black">{coverage.verified}</p></div>
        <div className="border-2 border-comun-black bg-comun-paper p-3"><p className="text-xs font-black uppercase">Alto impacto</p><p className="text-2xl font-black">{coverage.highImpact}</p></div>
        <div className="border-2 border-comun-black bg-comun-paper p-3"><p className="text-xs font-black uppercase">Resolvidos</p><p className="text-2xl font-black">{coverage.resolved}</p></div>
      </div>
      {warning ? <p className="mt-3 border-l-4 border-comun-yellow bg-comun-black px-4 py-3 text-sm font-bold text-comun-paper">{warning}</p> : null}
      <p className="mt-3 text-xs text-comun-black/70">
        Os dados representam contribuições recebidas e verificadas pelo projeto e não constituem levantamento completo do território.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Link className="border-2 border-comun-black p-3 font-black underline" href="#converse">Contar uma experiência</Link>
        <Link className="border-2 border-comun-black p-3 font-black underline" href="/comun/calcadas?estado=em_revisao">Ajudar a verificar</Link>
        <Link className="border-2 border-comun-black p-3 font-black underline" href="#construa">Construir uma proposta</Link>
        <Link className="border-2 border-comun-black p-3 font-black underline" href="/comun/calcadas/mobilizacao">Participar de uma ação</Link>
        <Link className="border-2 border-comun-black p-3 font-black underline" href="/comun/calcadas/prioridades">Acompanhar encaminhamentos</Link>
        <Link className="border-2 border-comun-black p-3 font-black underline" href="/comun/calcadas/resultados">Ver resultados e memória</Link>
      </div>
    </div>
  );
}
