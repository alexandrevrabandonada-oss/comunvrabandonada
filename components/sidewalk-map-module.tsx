import Link from "next/link";

export function SidewalkMapModule({ pautaSlug, surface }: { pautaSlug: string; surface: any }) {
  const { records, count, coverage, warning } = surface;
  return (
    <div className="mt-6">
      <p className="text-sm font-bold">Camada: Calçadas e acessibilidade</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      <ul className="mt-4 grid gap-2">
        {records.slice(0, 6).map((record: any) => (
          <li key={record.id} className="border-2 border-comun-black p-3">
            <Link href={`/comun/pautas/${pautaSlug}/registros/${record.slug}`} className="font-black underline">
              {record.name}
            </Link>
            <p className="text-sm text-comun-black/75">{record.categories.join(" · ")} · Impacto {record.impact_level}</p>
          </li>
        ))}
        {!records.length ? <li className="text-sm text-comun-black/70">Nenhum registro público revisado ainda.</li> : null}
      </ul>
    </div>
  );
}
