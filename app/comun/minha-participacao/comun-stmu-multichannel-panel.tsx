"use client";

import { ComunStmuEmailPanel } from "./comun-stmu-email-panel";
import { ComunStmuWhatsappPanel } from "./comun-stmu-whatsapp-panel";

export function ComunStmuMultichannelPanel({
  relataCaseId,
}: {
  relataCaseId: string;
}) {
  return (
    <>
      <ComunStmuWhatsappPanel relataCaseId={relataCaseId} />
      <ComunStmuEmailPanel relataCaseId={relataCaseId} />
    </>
  );
}
