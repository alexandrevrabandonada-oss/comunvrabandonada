"use client";

import { ComunCopyTextButton } from "@/components/comun-copy-text-button";

export function CopyOfficialTextButton({ text }: { text: string }) {
  return (
    <ComunCopyTextButton
      key={text}
      text={text}
      label="Copiar texto"
      copiedLabel="Texto copiado"
      manualLabel="Texto para copiar manualmente"
      className="min-h-11 border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase"
    />
  );
}
