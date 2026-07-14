"use client";

import { useState } from "react";

export function CopyOfficialTextButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copyText}
      className="min-h-11 border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase"
    >
      {copied ? "Texto copiado" : "Copiar texto"}
    </button>
  );
}
