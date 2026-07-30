import { SidewalkRealMap } from "@/components/sidewalk-real-map";
import {
  CoverageNotice,
  MiniAppExperienceShell,
} from "@/components/sidewalk-miniapp-shell";
import { resolveSidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import { getSidewalkMiniapp } from "@/lib/sidewalk-miniapp";

export const dynamic = "force-dynamic";
export default async function Page() {
  const provider = resolveSidewalkBasemapProvider(),
    data = await getSidewalkMiniapp();
  if (!data)
    return (
      <MiniAppExperienceShell
        active="mapa"
        count={0}
        community="Comunidade em configuração"
        coverage="aguardando publicação"
        status="Preparação editorial"
      >
        <section className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-3">
            <h2 className="text-xl font-black">Mapa comunitário</h2>
            <p className="mt-1 max-w-3xl text-sm text-comun-black/70">
              A ferramenta está disponível, mas este ambiente ainda não recebeu
              a pauta e os registros públicos necessários. Você pode conhecer o
              funcionamento do mapa e voltar quando a publicação editorial for
              concluída.
            </p>
          </div>
          <SidewalkRealMap records={[]} provider={provider} />
          <div className="mt-4">
            <CoverageNotice>
              Nenhum registro público foi carregado neste ambiente. Isso não
              significa ausência de problemas nas calçadas.
            </CoverageNotice>
          </div>
        </section>
      </MiniAppExperienceShell>
    );
  return (
    <MiniAppExperienceShell
      active="mapa"
      count={data.records.length}
      community={data.pauta.community}
      coverage={data.config?.coverage_status ?? "cobertura comunitária"}
      status={data.pauta.public_status}
    >
      <section className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-black">Mapa comunitário</h2>
            <p className="text-sm text-comun-black/65">
              {data.records.length
                ? "Encontre registros, aplique filtros ou use a lista equivalente."
                : "Nenhum registro público foi carregado neste ambiente. A ferramenta permanece disponível enquanto a publicação editorial é preparada."}
            </p>
          </div>
          <p className="text-xs font-bold">
            Base cartográfica real · contribuições revisadas
          </p>
        </div>
        <SidewalkRealMap records={data.records} provider={provider} />
        <div className="mt-4">
          <CoverageNotice>
            Esta cobertura reúne contribuições recebidas e revisadas. Não
            representa um levantamento completo de todas as calçadas da cidade.
          </CoverageNotice>
        </div>
      </section>
    </MiniAppExperienceShell>
  );
}
