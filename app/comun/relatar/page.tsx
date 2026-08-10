import { Suspense } from "react";
import { QuickCaptureV2 } from "@/app/comun/relatar/quick-capture-v2";
import {
  isComunRelataAttachmentsEnabled,
  isComunRelataLocationEnabled,
} from "@/lib/comun-relata-evidence-feature";
import { isComunRelataPhotoOnlyEnabled } from "@/lib/comun-relata-photo-first";
import {
  isComunEssentialForwardingAssistedEnabled,
  isComunEssentialServicesEnabled,
} from "@/lib/comun-essential-services-feature";
import { isComunEnvironmentalIncidentsEnabled } from "@/lib/comun-environmental-incidents-feature";
import { isComunUrbanIncidentsEnabled } from "@/lib/comun-urban-incidents-feature";
import { isComunPublicHealthSensitiveRoutingEnabled } from "@/lib/comun-public-health-sensitive-feature";
import { isComunPublicEducationSensitiveRoutingEnabled } from "@/lib/comun-public-education-sensitive-feature";
import { isComunChildProtectionPrivateRoutingEnabled } from "@/lib/comun-child-protection-feature";

export default function ReportPage() {
  // The canonical intake is never allowed to fall back to the legacy writer.
  // Query strings such as ?modo=detalhado are intentionally ignored.
  return (
    <Suspense
      fallback={
        <main className="mx-auto grid w-full max-w-2xl gap-5 px-4 py-6">
          <h1 className="text-3xl font-black">Vi um problema</h1>
          <section className="grid gap-3 border-2 border-comun-black bg-white p-4">
            <h2 className="text-xl font-black">O que aconteceu?</h2>
            <p>Carregando o Relata...</p>
          </section>
        </main>
      }
    >
      <QuickCaptureV2
        attachmentsEnabled={isComunRelataAttachmentsEnabled()}
        locationEnabled={isComunRelataLocationEnabled()}
        photoOnlyEnabled={isComunRelataPhotoOnlyEnabled()}
        essentialServicesEnabled={isComunEssentialServicesEnabled()}
        essentialForwardingEnabled={isComunEssentialForwardingAssistedEnabled()}
        environmentalIncidentsEnabled={isComunEnvironmentalIncidentsEnabled()}
        urbanIncidentsEnabled={isComunUrbanIncidentsEnabled()}
        publicHealthSensitiveRoutingEnabled={isComunPublicHealthSensitiveRoutingEnabled()}
        publicEducationSensitiveRoutingEnabled={isComunPublicEducationSensitiveRoutingEnabled()}
        childProtectionPrivateRoutingEnabled={isComunChildProtectionPrivateRoutingEnabled()}
      />
    </Suspense>
  );
}
