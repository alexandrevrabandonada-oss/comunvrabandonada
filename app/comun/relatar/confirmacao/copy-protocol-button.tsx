"use client";

import { ComunCopyTextButton } from "@/components/comun-copy-text-button";

export function CopyProtocolButton({ protocol }: { protocol: string }) {
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <ComunCopyTextButton
        key={protocol}
        text={protocol}
        label="Copiar protocolo"
        copiedLabel="Protocolo copiado"
        manualLabel="Protocolo para copiar manualmente"
        idleHint="Guarde este numero para acompanhar depois."
        className="inline-flex min-h-11 items-center justify-center border-2 border-comun-black bg-white px-4 py-2 text-sm font-black uppercase"
      />
    </div>
  );
}
