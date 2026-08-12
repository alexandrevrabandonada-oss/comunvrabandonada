import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { ComunTerritorialContext } from "@/components/comun-territorial-context";
import { isComunObservatoryTerritorialContextEnabled } from "@/lib/comun-observatory-feature";
import { getTerritorialContextPublicDto } from "@/lib/comun-observatory-territorial-context";
import { resolveSidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";

export const dynamic = "force-dynamic";
export default function TerritorialContextPage() {
  if (!isComunObservatoryTerritorialContextEnabled()) notFound();
  return <ComunShell><ComunTerritorialContext dto={getTerritorialContextPublicDto()} provider={resolveSidewalkBasemapProvider()} /></ComunShell>;
}
