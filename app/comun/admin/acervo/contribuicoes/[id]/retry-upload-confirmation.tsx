"use client";

import { useState } from "react";

export function RetryUploadConfirmation({
  submissionId,
  assetId,
}: {
  submissionId: string;
  assetId: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/comun/archive/submissions/${submissionId}/confirm`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assetId }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível confirmar o original.");
      setMessage("Original privado confirmado. Recarregando a curadoria…");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o original.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 grid gap-2">
      <p className="text-sm">
        O arquivo privado foi recebido, mas sua confirmação técnica ficou pendente.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={confirm}
        className="w-fit border-2 border-comun-black bg-white px-3 py-2 font-black uppercase disabled:opacity-60"
      >
        {busy ? "Confirmando original…" : "Confirmar original privado"}
      </button>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
    </div>
  );
}
