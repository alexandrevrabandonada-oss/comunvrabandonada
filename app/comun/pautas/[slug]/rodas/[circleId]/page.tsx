import { notFound } from "next/navigation";
import { ComunRodaViva } from "@/components/comun-roda-viva";
import { isComunPautasVivasCoreEnabled } from "@/lib/comun-pautas-vivas-feature";
import { isComunRodasVivasEnabled } from "@/lib/comun-rodas-vivas-feature";
import { getPublicRodaForPauta } from "@/lib/comun-rodas-vivas";
import { getPublicPautaSpaceBySlug } from "@/lib/pauta-spaces";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RodaVivaPage(props: {
  params: Promise<{ slug: string; circleId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!isComunPautasVivasCoreEnabled() || !isComunRodasVivasEnabled()) notFound();
  const [{ slug, circleId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const pauta = await getPublicPautaSpaceBySlug(slug);
  if (!pauta) notFound();
  const roda = await getPublicRodaForPauta(pauta.id, circleId);
  if (!roda || roda.pautaId !== pauta.id) notFound();
  return <ComunRodaViva pauta={pauta} roda={roda} contributionReceived={searchParams.contribuicao === "recebida"} />;
}
