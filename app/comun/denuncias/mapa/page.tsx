import { notFound } from "next/navigation";
import { ComunDenunciasPublicMap } from "@/components/comun-denuncias-public-map";
import { isComunDenunciasPublicMapEnabled } from "@/lib/comun-denuncias-public-map-feature";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function DenunciasPublicMapPage() {
  if (!isComunDenunciasPublicMapEnabled()) notFound();
  return <ComunDenunciasPublicMap />;
}
