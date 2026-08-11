import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { ObservatoryHub } from "@/components/comun-observatory-hub";
import { getPublicObservatoryRegistry } from "@/lib/comun-observatory";
import {
  isComunObservatoriesFoundationEnabled,
  isComunObservatorySidewalkAdapterEnabled,
} from "@/lib/comun-observatory-feature";
import { getSidewalkReviewedProjectionForObservatory } from "@/lib/comun-observatory-sidewalk-adapter";

export const dynamic = "force-dynamic";

export default async function ObservatoryPage() {
  if (!isComunObservatoriesFoundationEnabled()) notFound();
  const sidewalkAdapterEnabled = isComunObservatorySidewalkAdapterEnabled();
  const projection = sidewalkAdapterEnabled
    ? await getSidewalkReviewedProjectionForObservatory()
    : null;
  const sidewalkAvailable = Boolean(projection?.available);
  return (
    <ComunShell>
      <ObservatoryHub
        observatories={getPublicObservatoryRegistry(sidewalkAvailable)}
        sidewalkSource={projection?.source ?? null}
        sidewalkCount={projection?.observations.length ?? null}
      />
    </ComunShell>
  );
}
