import {notFound} from "next/navigation";
import {SidewalkRealMap} from "@/components/sidewalk-real-map";
import {CoverageNotice,MiniAppExperienceShell} from "@/components/sidewalk-miniapp-shell";
import {getSidewalkMiniapp} from "@/lib/sidewalk-miniapp";

export const dynamic="force-dynamic";
export default async function Page(){
  const data=await getSidewalkMiniapp(); if(!data)notFound();
  return <MiniAppExperienceShell active="mapa" count={data.records.length} community={data.pauta.community} coverage={data.config?.coverage_status??"cobertura comunitária"} status={data.pauta.public_status}>
    <section className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black">Mapa comunitário</h2><p className="text-sm text-comun-black/65">Encontre registros, aplique filtros ou use a lista equivalente.</p></div><p className="text-xs font-bold">DEMONSTRAÇÃO LOCAL · dados sintéticos</p></div>
      <SidewalkRealMap records={data.records}/>
      <div className="mt-4"><CoverageNotice>Esta cobertura reúne contribuições recebidas e revisadas. Não representa um levantamento completo de todas as calçadas da cidade.</CoverageNotice></div>
    </section>
  </MiniAppExperienceShell>;
}
