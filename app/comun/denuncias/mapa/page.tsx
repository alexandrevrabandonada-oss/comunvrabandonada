import { notFound } from "next/navigation";
import { ComunDenunciasPublicMap } from "@/components/comun-denuncias-public-map";
import { isComunDenunciasPublicMapEnabled } from "@/lib/comun-denuncias-public-map-feature";
import { getComunDenunciasPublicMapReadiness } from "@/lib/server/comun-denuncias-public-map-runtime";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DenunciasPublicMapPage() {
  if (!isComunDenunciasPublicMapEnabled()) notFound();
  const readiness = await getComunDenunciasPublicMapReadiness();
  if (!readiness.mapDataReady) notFound();
  return <ComunDenunciasPublicMap />;
}
