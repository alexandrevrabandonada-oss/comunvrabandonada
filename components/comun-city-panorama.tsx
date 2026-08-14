import Link from "next/link";
import type { CityPanoramaPublicDto, PanoramaLayer } from "@/lib/comun-city-panorama";

const sourceKindLabel = {
  official_public_data: "Dados oficiais",
  reviewed_community_projection: "Observações comunitárias revisadas",
} as const;

function LayerCard({ layer }: { layer: PanoramaLayer }) {
  const available = layer.availability === "available";
  return (
    <article className="border-2 border-comun-black/25 bg-comun-paper p-5">
      <p className="text-xs font-black uppercase text-comun-rust">
        {sourceKindLabel[layer.sourceKind]}
      </p>
      <h3 className="mt-2 text-2xl font-black uppercase">{layer.label}</h3>
      <p className="mt-2 text-sm font-bold">Período: {layer.referencePeriod}</p>
      <p className="mt-1 text-sm">Escala: {layer.geographicGranularity}</p>
      {available ? (
        <>
          <dl className="mt-5 grid gap-3">
            {layer.facts.map((fact) => (
              <div key={fact.label} className="border-t border-comun-black/15 pt-3">
                <dt className="font-black">{fact.label}</dt>
                <dd className="mt-1 text-xl font-black">{fact.value}</dd>
                <dd className="mt-1 text-sm text-comun-black/75">{fact.description}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-l-4 border-comun-yellow pl-3 text-sm">{layer.coverageStatement}</p>
          <Link href={layer.publicPath} className="mt-5 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4">
            Ver observatório
          </Link>
        </>
      ) : (
        <p className="mt-5 border-l-4 border-comun-yellow pl-3 text-sm">
          Camada temporariamente indisponível.
        </p>
      )}
    </article>
  );
}

export function ComunCityPanorama({ dto }: { dto: CityPanoramaPublicDto }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-comun-black sm:py-12">
      <header className="max-w-4xl">
        <p className="text-xs font-black uppercase text-comun-yellow">COMUN · Observatórios</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">Panorama de Volta Redonda</h1>
        <p className="mt-4 text-lg">O que conseguimos enxergar hoje sobre Volta Redonda usando as fontes públicas já organizadas pelo COMUN.</p>
        <p className="mt-4 border-l-4 border-comun-yellow pl-4 text-sm font-bold">Cada camada preserva seu próprio período, geografia, proveniência e limitações. O Panorama não cria uma nota única da cidade.</p>
        <Link
          href="#panorama-visible-title"
          data-comun-primary-action="true"
          className="mt-6 inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-yellow px-5 font-black uppercase shadow-[4px_4px_0_#0b0b0a]"
        >
          Explorar o que sabemos
        </Link>
      </header>

      <section className="mt-10" aria-labelledby="panorama-visible-title">
        <h2 id="panorama-visible-title" className="text-3xl font-black uppercase">O que já conseguimos enxergar</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {dto.layers.map((layer) => <LayerCard key={layer.id} layer={layer} />)}
        </div>
      </section>

      <section className="mt-12 max-w-4xl" aria-labelledby="panorama-comparability-title">
        <h2 id="panorama-comparability-title" className="text-3xl font-black uppercase">Cada dado olha a cidade de um jeito</h2>
        <ul className="mt-4 grid gap-3">
          {dto.comparability.map((item) => <li key={item.statement} className="border-l-4 border-comun-yellow pl-4">{item.statement}</li>)}
        </ul>
      </section>

      <section className="mt-12 max-w-4xl" aria-labelledby="panorama-gaps-title">
        <h2 id="panorama-gaps-title" className="text-3xl font-black uppercase">O que ainda não conseguimos afirmar</h2>
        <p className="mt-3">Estas lacunas não significam ausência absoluta de dados: significam que o contrato atual do COMUN ainda não permite uma leitura pública segura.</p>
        <ul className="mt-5 grid gap-3">
          {dto.knownGaps.map((gap) => <li key={gap.reasonCode} className="border-2 border-comun-black/20 bg-comun-paper p-4"><h3 className="font-black">{gap.domain}</h3><p className="mt-1 text-sm">{gap.humanDescription}</p></li>)}
        </ul>
      </section>

      <section className="mt-12 max-w-4xl border-t-2 border-comun-black/20 pt-7" aria-labelledby="panorama-method-title">
        <h2 id="panorama-method-title" className="text-3xl font-black uppercase">Como ler este Panorama</h2>
        <p className="mt-3">O Panorama reúne apenas resumos públicos dos observatórios especializados. Não inclui Relata, Carteira, dados de conta, localização privada, anexos, encaminhamentos ou qualquer agregado de relato privado.</p>
        <p className="mt-3">Ver cada observatório é a forma de conferir sua fonte, período, cobertura e limitações específicas.</p>
      </section>
    </main>
  );
}
