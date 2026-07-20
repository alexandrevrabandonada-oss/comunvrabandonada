import Link from "next/link";
import { SidewalkMapView } from "./sidewalk-map-view";

export function SidewalkMapModule({ pautaSlug, surface }: { pautaSlug: string; surface: any }) {
  const { records, count, coverage, warning } = surface;
  return (
    <div className="mt-6">
      <p className="text-sm font-bold">Camada: Calçadas e acessibilidade</p>
      <SidewalkMapView records={records} pautaSlug={pautaSlug}/>
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
