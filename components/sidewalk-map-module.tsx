import Link from "next/link";

export function SidewalkMapModule({ pautaSlug, surface }: { pautaSlug: string; surface: any }) {
  const { records, count, coverage, warning } = surface;
  return (
    <div className="mt-6">
      <p className="text-sm font-bold">Camada: Calçadas e acessibilidade</p>
      <div className="mt-4 border-2 border-comun-black bg-comun-yellow p-5">
        <h3 className="text-2xl font-black uppercase">A ferramenta agora tem uma área própria</h3>
        <p className="mt-2 max-w-2xl">Abra o mapa cartográfico, filtre registros e acompanhe prioridades, mobilização e resultados sem duplicar o processo desta pauta.</p>
        <Link className="mt-4 inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-black px-4 font-black uppercase text-comun-yellow" href="/comun/calcadas">Abrir Mapa das Calçadas</Link>
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
      <Link className="mt-4 inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase" href={`/comun/mapa/contribuir?origem=calcadas&pauta=${encodeURIComponent(pautaSlug)}&returnTo=${encodeURIComponent(`/comun/pautas/${pautaSlug}`)}`}>Registrar problema</Link>
    </div>
  );
}
