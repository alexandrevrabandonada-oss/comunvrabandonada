import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { isComunDenunciasPublicMapEnabled } from "@/lib/comun-denuncias-public-map-feature";
import { getComunDenunciasPublicMapProblem } from "@/lib/server/comun-denuncias-public-map-runtime";
import { resolvePublicOrganizationBridgeFilter } from "@/lib/comun-organization-bridges";
import { listPublicCollectiveActionsByPauta } from "@/lib/comun-collective-actions-canonical";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

export default async function DenunciasProblemPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  if (!isComunDenunciasPublicMapEnabled()) notFound();
  const { publicId } = await params;
  const problem = await getComunDenunciasPublicMapProblem(publicId);
  if (!problem) notFound();

  const bridge = await resolvePublicOrganizationBridgeFilter(`denuncias:${problem.publicId}`);
  const relatedActions = bridge
    ? (await Promise.all(
        bridge.bridge.pautas.map(async (pauta) => ({
          pauta,
          actions: await listPublicCollectiveActionsByPauta(pauta.pautaId),
        })),
      )).flatMap(({ pauta, actions }) =>
        actions.map((action) => ({ action, pautaTitle: pauta.title })),
      )
    : [];

  return (
    <ComunShell appBar={{ title: "Denúncias e serviços públicos", contextLabel: "Problemas no território", backDestination: "/comun/denuncias" }}>
      <Section>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/65">Leitura territorial sanitizada</p>
        <h1 className="comun-prose mt-2 max-w-3xl text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">{problem.title}</h1>
        <p className="comun-prose mt-4 max-w-3xl text-lg text-comun-paper/80">{problem.summary}</p>
        <div className="mt-6 grid gap-3 border-2 border-comun-yellow bg-comun-black p-5 text-comun-paper sm:grid-cols-3">
          <p><strong className="block text-xs uppercase text-comun-paper/60">Relatos públicos elegíveis</strong><span className="text-2xl font-black">{problem.reportCount}</span></p>
          <p><strong className="block text-xs uppercase text-comun-paper/60">Primeira observação</strong><span>{problem.firstSeenDate}</span></p>
          <p><strong className="block text-xs uppercase text-comun-paper/60">Área</strong><span>aproximada · incerteza de {Math.round(problem.location.uncertaintyRadiusMeters)} m</span></p>
        </div>
        <p className="mt-5 max-w-3xl border-l-4 border-comun-yellow pl-4 text-sm text-comun-paper/75">Os pontos representam áreas aproximadas. Não mostramos endereço, texto original, fotos, protocolos ou quem relatou.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href={`/comun/relatar?categoria=${encodeURIComponent(problem.category)}`} className="border-2 border-comun-black bg-comun-yellow p-4 font-black uppercase">Também estou com esse problema</Link>
          <Link href={`/comun/pautas/nova?evidencia=denuncias%3A${encodeURIComponent(problem.publicId)}`} className="border-2 border-comun-yellow p-4 font-black uppercase text-comun-yellow">Organizar este problema</Link>
        </div>

        <div className="mt-10 grid gap-8">
          <section aria-labelledby="related-pautas-title">
            <h2 id="related-pautas-title" className="text-2xl font-black uppercase text-comun-yellow">Já estão organizando este problema</h2>
            <div className="mt-4 grid gap-4">
              {bridge?.bridge.pautas.map((pauta) => (
                <article key={pauta.pautaId} className="border-2 border-comun-paper/25 p-4">
                  <p className="text-xs font-black uppercase text-comun-paper/60">{pauta.publicStatus}</p>
                  <h3 className="mt-1 text-xl font-black">{pauta.title}</h3>
                  {pauta.summary ? <p className="mt-2 text-comun-paper/75">{pauta.summary}</p> : null}
                  <Link href={`/comun/pautas/${pauta.slug}`} className="mt-4 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4">Abrir pauta</Link>
                </article>
              ))}
              {!bridge?.bridge.pautas.length ? <p className="text-comun-paper/75">Ainda não há uma pauta pública ligada a esta leitura.</p> : null}
            </div>
          </section>

          {relatedActions.length ? (
            <section aria-labelledby="related-actions-title">
              <h2 id="related-actions-title" className="text-2xl font-black uppercase text-comun-yellow">Ações públicas relacionadas</h2>
              <div className="mt-4 grid gap-4">
                {relatedActions.map(({ action, pautaTitle }) => (
                  <article key={action.id} className="border-2 border-comun-paper/25 p-4">
                    <p className="text-xs font-black uppercase text-comun-paper/60">Ação ligada à pauta: {pautaTitle}</p>
                    <h3 className="mt-1 text-xl font-black">{action.title}</h3>
                    <p className="mt-2 text-comun-paper/75">{action.summary}</p>
                    <Link href={`/comun/acoes/${action.slug}`} className="mt-4 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4">Ver ação</Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </Section>
    </ComunShell>
  );
}
