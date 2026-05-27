"use client";

import { useState } from "react";

export function CopyProtocolButton({ protocol }: { protocol: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(protocol);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-11 items-center justify-center border-2 border-comun-black bg-white px-4 py-2 text-sm font-black uppercase"
      >
        Copiar protocolo
      </button>
      <p className="text-xs font-bold uppercase text-comun-asphalt/70">
        {status === "copied" ? "Protocolo copiado." : status === "error" ? "Copie manualmente se precisar." : "Guarde este numero para acompanhar depois."}
      </p>
    </div>
  );
}
