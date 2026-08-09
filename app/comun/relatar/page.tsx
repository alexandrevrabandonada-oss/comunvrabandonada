import { notFound } from "next/navigation";
import { QuickCaptureV2 } from "@/app/comun/relatar/quick-capture-v2";
import { isComunQuickCaptureEnabled } from "@/lib/comun-capture-feature";
import {
  isComunRelataAttachmentsEnabled,
  isComunRelataLocationEnabled,
} from "@/lib/comun-relata-evidence-feature";
import { isComunRelataPhotoOnlyEnabled } from "@/lib/comun-relata-photo-first";
import {
  isComunEssentialForwardingAssistedEnabled,
  isComunEssentialServicesEnabled,
} from "@/lib/comun-essential-services-feature";

export default function ReportPage() {
  // The canonical intake is never allowed to fall back to the legacy writer.
  // Query strings such as ?modo=detalhado are intentionally ignored.
  if (!isComunQuickCaptureEnabled()) notFound();

  return (
    <QuickCaptureV2
      attachmentsEnabled={isComunRelataAttachmentsEnabled()}
      locationEnabled={isComunRelataLocationEnabled()}
      photoOnlyEnabled={isComunRelataPhotoOnlyEnabled()}
      essentialServicesEnabled={isComunEssentialServicesEnabled()}
      essentialForwardingEnabled={isComunEssentialForwardingAssistedEnabled()}
    />
  );
}
